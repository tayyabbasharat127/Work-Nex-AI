# QA CODEX FIX ROADMAP — WorkNex AI
**Generated:** 2026-05-23
**Purpose:** Precise implementation instructions for each open fix

---

## Priority 1 (CRITICAL) — Verify Backend Auth Register Does Not Accept Client-Supplied Role

**Bug:** BUG-SEC-003  
**Status:** RESOLVED - `/auth/register` is protected, `SUPER_ADMIN` is rejected by validator/service caps, and public `/billing/register` rejects `role` fields while creating tenant `ADMIN` owners.  
**Files Likely Affected:** `worknex-backend/src/modules/auth/auth.routes.js`, `worknex-backend/src/modules/auth/auth.service.js`, `worknex-backend/src/modules/auth/auth.controller.js`

**Verification Command (run with backend live):**
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"qa-check@test.com","password":"Test@1234","firstName":"QA","lastName":"Check","employeeId":"QA-001","role":"SUPER_ADMIN"}'
```

**Expected Result:** Either 400 (role field rejected) or role is forced to EMPLOYEE regardless of input.

**If FAIL (role accepted as SUPER_ADMIN):**
In `auth.routes.js` validator, add:
```javascript
body('role').optional().custom((val) => {
  // Only EMPLOYEE allowed on public registration; SUPER_ADMIN only via billing flow
  if (val && val !== 'EMPLOYEE') throw new Error('Role cannot be set directly');
  return true;
})
```
In `auth.service.js` or controller, force `role = 'EMPLOYEE'` unless calling context explicitly passes a trusted role flag (not from client body).

**For org registration:** The `/billing/register` unified endpoint (see Priority 3) creates a tenant `ADMIN` owner in a server-side transaction, not by calling `/auth/register` from the client.

**Acceptance Criteria:**  
- POST `/auth/register` with `role: 'SUPER_ADMIN'` from any unauthenticated client must return 400 or create an EMPLOYEE
- Only server-side internal calls (or superadmin-authenticated callers) can create SUPER_ADMIN/ADMIN users

---

## Priority 2 (HIGH) — Move JWT Tokens from localStorage to HttpOnly Cookies

**Bug:** BUG-SEC-002  
**Status:** PARTIALLY RESOLVED - refresh tokens use httpOnly cookies and are no longer stored in frontend localStorage; access tokens still remain in localStorage and need a later memory-only session pass.  
**Files Likely Affected:** `frontend/lib/api.js`, `worknex-backend/src/modules/auth/auth.controller.js`, `worknex-backend/src/modules/auth/auth.routes.js`, `worknex-backend/src/app.js` (CORS)

**Implementation Plan:**

**Backend changes:**
1. In auth login response, set `Set-Cookie: refreshToken=<value>; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth/refresh-token; MaxAge=2592000`
2. In `/auth/refresh-token`, read `refreshToken` from `req.cookies` (not body)
3. In `/auth/logout`, clear the cookie
4. Add `cookie-parser` middleware: `npm install cookie-parser`
5. Update CORS: `credentials: true` (already set) and ensure `origin` is explicit (no wildcard)

**Frontend changes:**
1. In `lib/api.js`: Remove `localStorage.setItem('refreshToken', ...)` — cookie is set by server
2. Remove `localStorage.getItem('refreshToken')` — send no `refreshToken` in body to refresh endpoint (cookie sent automatically)
3. Keep access token in memory (React Context/state), not localStorage
4. On page refresh, call `/users/me` with the cookie-based refresh flow to restore session

**Verify Command:** After login, run in browser console:
```javascript
localStorage.getItem('token') // Must return null after fix
document.cookie.includes('refreshToken') // Must return false (HttpOnly not visible)
```

**Acceptance Criteria:**
- No tokens in localStorage after login
- Refresh token only in HttpOnly cookie
- Access token only in memory
- Refresh flow works transparently on 401

---

## Priority 3 (HIGH) — Make Registration Atomic (Unified Backend Endpoint)

**Bug:** BUG-REG-001  
**Status:** RESOLVED - frontend signup uses one `/billing/register` request, and backend creates organization, owner `ADMIN`, and trial subscription in one Prisma transaction.  
**Files Likely Affected:** `worknex-backend/src/modules/billing/billing.service.js`, `worknex-backend/src/modules/billing/billing.routes.js`, `worknex-backend/src/modules/billing/billing.controller.js`, `frontend/lib/api.js`

**Implementation Plan:**

**Backend:** Extend `registerOrganization` service to also create the owner user atomically:
```javascript
// In billing.service.js registerOrganization:
const registerOrganization = async (data) => {
  const { orgName, industry, country, ownerEmail, ownerFirstName, ownerLastName, ownerPassword, phone, website } = data;
  // ...existing slug/duplicate check...

  const org = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({ ... });
    await tx.subscription.create({ ... });

    // Create owner user in same transaction
    const passwordHash = await bcrypt.hash(ownerPassword, 12);
    const owner = await tx.user.create({
      data: {
        email: ownerEmail,
        passwordHash,
        firstName: ownerFirstName,
        lastName: ownerLastName || 'User',
        employeeId: `ADMIN-${Date.now().toString().slice(-8)}`,
        role: 'ADMIN',
        organizationId: organization.id,
        isActive: true,
      },
    });

    return { organization, owner };
  });

  // Email + return ...
};
```

**Backend route validation update:**
- Add `body('ownerPassword').isLength({ min: 8 })` to `/register` validator
- Keep `ownerLastName` optional (default to 'User')

**Frontend update (`lib/api.js`):**
- Remove the two-step flow in `authAPI.signup`
- Send a single request to `/billing/register` with `ownerPassword` included
- Remove the second call to `/auth/register`

**Acceptance Criteria:**
- POST `/billing/register` returns 201 with `organization.id`, `licenseKey`, and `user.id`
- If any part fails, entire transaction rolls back — no orphaned orgs
- Owner can log in immediately after registration
- No second client-side call to `/auth/register`

---

## Priority 4 (HIGH) — Create frontend/.env.local

**Bug:** BUG-ENV-001  
**Files Affected:** `frontend/.env.local` (create new)

**Implementation:**
Create `frontend/.env.local` from `frontend/.env.example`:
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_AI_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=WorkNex AI
```

**Also update `health-check.ps1`:**
Change `frontend/.env.local` check from `WARN` to `FAIL` — a missing env file is not a warning in a team project.

**Note:** Do NOT commit `.env.local` to git. Verify `.gitignore` excludes it.

**Verify Command:**
```powershell
Test-Path frontend/.env.local  # Must return True
```

**Acceptance Criteria:**
- `frontend/.env.local` exists with correct variables
- `NEXT_PUBLIC_API_URL` resolves to backend URL
- Health check reports FAIL (not WARN) if file is missing

---

## Priority 5 (MEDIUM) — Add Dedicated Rate Limiter for /billing/register

**Bug:** BUG-RATE-001  
**Files Affected:** `worknex-backend/src/app.js`

**Implementation:**
```javascript
// In app.js, before app.use('/api/v1', routes):
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 org registrations per hour per IP
  message: { success: false, message: 'Too many registration attempts. Please try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/v1/billing/register', registrationLimiter);
```

**Verify Command:** POST to `/api/v1/billing/register` 6 times from same IP — 6th must return 429.

**Acceptance Criteria:**
- 429 returned after 5 attempts from same IP within 1 hour
- Rate limit headers present in response

---

## Priority 6 (MEDIUM) — Remove console.log with User Data

**Bug:** BUG-API-001  
**Files Affected:** `frontend/lib/api.js` line 631

**Implementation:**
Delete line 631:
```javascript
console.log('Creating user with data:', backendData);  // DELETE THIS LINE
```

**Verify Command:** Open browser devtools → Create a user → Console must show no log containing user email or password.

**Acceptance Criteria:** No sensitive data logged to browser console in production or dev.

---

## Priority 7 (MEDIUM) — Add /billing/register to Smoke Test

**Bug:** BUG-TEST-001  
**Files Affected:** `scripts/smoke-test.ps1`

**Implementation:**
Add to `smoke-test.ps1` after the health checks and before auth tests:
```powershell
# Public Registration Smoke
$regBody = @{
  orgName = "SmokeOrg-$([DateTime]::UtcNow.ToString('yyyyMMddHHmmss'))"
  industry = "Technology"
  country = "Pakistan"
  ownerEmail = "smoke-$([DateTime]::UtcNow.ToString('yyyyMMddHHmmss'))@smoke.test"
  ownerFirstName = "Smoke"
  ownerLastName = "Test"
  # Include ownerPassword after Priority 3 fix
} | ConvertTo-Json

$regResult = Invoke-WebRequest -Uri "$BACKEND_URL/api/v1/billing/register" `
  -Method POST -Body $regBody -ContentType "application/json" -UseBasicParsing -TimeoutSec 10
# Assert 201
```

**Acceptance Criteria:** Smoke test includes registration check and fails if it returns non-201 (or non-503 when DB intentionally unmigrated).

---

## Priority 8 (MEDIUM) — Verify and Add 2FA Tests to full-module-test.js

**Bug:** Coverage gap — 2FA 0% automated  
**Files Affected:** `scripts/full-module-test.js`

**Implementation Plan:**
Add `twoFaTests()` function:
```javascript
async function twoFaTests() {
  // Setup
  const setup = await checkJson('2FA', 'employee setup 2FA', 'POST', `${API}/auth/2fa/setup`, 200, { role: 'testEmployee' });
  const secret = dataOf(setup)?.secret;
  add('2FA', 'setup returns secret', secret ? 'PASS' : 'FAIL', snippet(setup.data));

  // Cannot verify without real TOTP — skip if secret missing
  if (!secret) {
    add('2FA', 'verify 2FA', 'SKIPPED', 'no TOTP library available');
    return;
  }

  // Disable (requires verification — test cancel path)
  await checkJson('2FA', 'disable 2FA with invalid token rejected', 'POST', `${API}/auth/2fa/disable`,
    [400, 401], { role: 'testEmployee', body: { token: '000000' } });
}
```

**Note:** Full 2FA automated testing requires a TOTP library (e.g., `otpauth`) to generate valid tokens. Add as dev dependency.

**Acceptance Criteria:** 2FA setup, invalid token rejection, and 2FA status check are automated.

---

## Priority 9 (LOW) — Align DATABASE_URL Database Name with .env.example

**Bug:** BUG-DB-002  
**Files Affected:** `worknex-backend/.env.example`, team docs

**Implementation:**
Either:
1. Update `.env.example` database name from `worknex_ai` to `TESTING` if team uses `TESTING`
2. OR rename actual DB to `worknex_ai` and update `.env` accordingly (preferred for production clarity)

**Also add to MIGRATION_AND_RUNBOOK.md:**
> Note: The database name in `.env.example` must match what your team uses. If you create a new database, update `.env` before running `npm run db:setup`.

---

## Priority 10 (LOW) — Add city Field to Organization Model or Remove from Form

**Bug:** BUG-REG-002  
**Option A — Add to schema:**
```prisma
model Organization {
  // ...existing fields...
  city    String?
}
```
Then: `npx prisma migrate dev --name add_city_to_organization`

**Option B — Remove from form:**
Delete `city` input from `frontend/app/register/page.jsx` and related state.

**Acceptance Criteria:** Either `city` is persisted on registration, or the form does not collect it.

---

## Priority 11 (LOW) — Remove _archive_src_duplicate from Git

**Bug:** BUG-ARCH-001  
**Commands:**
```bash
git rm -r --cached frontend/_archive_src_duplicate/
echo "frontend/_archive_src_duplicate/" >> .gitignore
git add .gitignore
git commit -m "Remove archived source duplicate from tracking"
```

**Acceptance Criteria:** `_archive_src_duplicate/` not tracked by git. Old archived code preserved locally only.

---

## Priority 12 (LOW) — Validate Terms of Service Checkbox

**Bug:** BUG-UX-001  
**File:** `frontend/app/register/page.jsx`

**Implementation:**
```javascript
const [termsAccepted, setTermsAccepted] = useState(false);

// In handleSubmit:
if (!termsAccepted) {
  setError('Please accept the Terms of Service to continue');
  return;
}

// Checkbox:
<input
  type="checkbox"
  checked={termsAccepted}
  onChange={(e) => setTermsAccepted(e.target.checked)}
/>
```

---

## Verification Commands After All Fixes

```powershell
# DB readiness
cd worknex-backend
npm.cmd run db:validate
npm.cmd run db:status
node scripts/db-preflight.js

# Registration flow
curl -X POST http://localhost:5000/api/v1/billing/register `
  -H "Content-Type: application/json" `
  -d '{"orgName":"TestOrg","industry":"Tech","country":"Pakistan","ownerEmail":"test@test.com","ownerFirstName":"Test","ownerLastName":"User","ownerPassword":"Test@12345"}'
# Expected: 201

# Security check — role escalation attempt
curl -X POST http://localhost:5000/api/v1/auth/register `
  -H "Content-Type: application/json" `
  -d '{"email":"escalate@test.com","password":"Test@1234","firstName":"Hack","lastName":"User","employeeId":"H-001","role":"SUPER_ADMIN"}'
# Expected: 400 or role forced to EMPLOYEE

# Rate limiting
# Call /billing/register 6 times — 6th must return 429

# Token storage
# After login, check browser console: localStorage.getItem('token') must be null

# Full test suite (requires all services running)
cd ..
npm.cmd run health
npm.cmd run smoke
npm.cmd run test:full
```

---

## Summary Table

| Priority | Bug | Effort | Risk if Skipped |
|---|---|---|---|
| 1 | BUG-SEC-003: Verify role not client-settable | LOW (verify only) | CRITICAL — privilege escalation |
| 2 | BUG-SEC-002: JWT to HttpOnly cookies | HIGH | HIGH — XSS token theft |
| 3 | BUG-REG-001: Atomic registration | MEDIUM | HIGH — orphaned orgs |
| 4 | BUG-ENV-001: Create frontend/.env.local | LOW | HIGH — silent API failure in deployment |
| 5 | BUG-RATE-001: Rate limit registration | LOW | MEDIUM — org spam |
| 6 | BUG-API-001: Remove console.log | LOW | MEDIUM — password logged to console |
| 7 | BUG-TEST-001: Smoke covers /register | LOW | MEDIUM — regression blind spot |
| 8 | 2FA test coverage | MEDIUM | MEDIUM — auth quality gap |
| 9 | BUG-DB-002: DB name alignment | LOW | MEDIUM — dev confusion |
| 10 | BUG-REG-002: city field | LOW | LOW — silent data loss |
| 11 | BUG-ARCH-001: Remove archive | LOW | LOW — repo clutter |
| 12 | BUG-UX-001: TOS checkbox | LOW | LOW — UX/legal |

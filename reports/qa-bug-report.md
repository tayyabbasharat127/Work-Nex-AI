# QA BUG REPORT — WorkNex AI
**Generated:** 2026-05-23
**Auditor:** Principal QA Engineer

---

## BUG-DB-001 — Database Not Migrated on New Database Setup
**Severity:** CRITICAL  
**Module:** Database / DevOps  
**Status:** RESOLVED (in audit session)

**Steps to Reproduce:**
1. Create a new PostgreSQL database (e.g. `TESTING`)
2. Set `DATABASE_URL` in `.env` to point at the new DB
3. Start the backend without running migrations
4. Navigate to `/register` in the browser

**Expected:** Registration form submits successfully with organizationId in response

**Actual:**
```
Invalid prisma.organization.findUnique invocation.
The table public.Organization does not exist in the current database.
```
Raw Prisma error exposed in HTTP response reaching the frontend.

**Root Cause:**  
No migration was applied to the new database. The backend connected successfully but all Prisma model operations fail because no tables exist. The startup code only called `prisma.$connect()` (which only verifies connectivity) — it did not verify schema readiness.

**Evidence:**
- `db:status` output: `4 migrations found, none applied`
- `src/app.js` startServer: only `prisma.$connect()`, no schema check
- `billing.controller.js` `registerOrganization`: no migration error guard

**Fixes Applied:**
- `db:setup` script runs `prisma validate && prisma generate && prisma migrate deploy`
- `src/app.js` now calls `verifyMigrations()` on startup; exits with clear message if tables missing
- `error.middleware.js` catches Prisma P2021 code → returns clean 503
- `billing.controller.js` catches migration errors → returns clean 503

**Regression Test:** `node scripts/db-preflight.js` must exit 0; startup must fail with clear message if tables missing.

---

## BUG-SEC-001 — Raw Prisma Stack Trace Exposed to Frontend
**Severity:** HIGH  
**Module:** Error Handling / Security  
**Status:** RESOLVED (in audit session)

**Steps to Reproduce:**
1. Connect backend to an unmigrated database
2. POST `/api/v1/billing/register` with a valid payload

**Expected:** HTTP 503 with `{ success: false, message: "Database is not migrated. Run database setup." }`

**Actual (before fix):**
```json
{
  "error": "Invalid prisma.organization.findUnique invocation.\nThe table `public.Organization` does not exist in the current database.\n    at C:\\Users\\TECHXCESS\\Desktop\\Work-Nex-AI\\worknex-backend\\src\\..."
}
```
Full local file path and Prisma internals exposed in HTTP response.

**Root Cause:**  
The global error handler (`error.middleware.js`) did not handle Prisma P2021 ("table does not exist"). The raw error message — including Windows file paths and internal module traces — was passed through to the response.

**Evidence:**
- `error.middleware.js` (before fix): no P2021 handler
- `billing.controller.js` (before fix): no try-catch

**Fixes Applied:**
- `error.middleware.js`: P2021 code + message regex → 503 with clean message
- `billing.controller.js`: specific try-catch for `registerOrganization` → 503 with clean message

**Regression Test:** POST `/api/v1/billing/register` against unmigrated DB must return 503 with no file paths, no stack traces.

---

## BUG-REG-001 — Two-Step Registration Is Not Atomic (Orphaned Organizations)
**Severity:** HIGH  
**Module:** Registration / Billing  
**Status:** RESOLVED

**Steps to Reproduce:**
1. POST `/api/v1/billing/register` — succeeds (Organization created)
2. POST `/api/v1/auth/register` — fails (duplicate email, validation error, DB error, etc.)

**Expected:** Either both succeed or neither persists. User can always log in after registration.

**Actual:**  
Organization record exists in DB with no owner user. The user sees: `"Organization created but admin account creation failed: <error>"`. They cannot log in. The org slug is permanently reserved. Re-registering with the same org name fails with 409 (slug taken).

**Root Cause:**  
`lib/api.js` `authAPI.signup()` is a two-step client-side flow:
1. Calls `/billing/register` → creates Organization + Subscription (server-side transaction)
2. Calls `/auth/register` → creates SUPER_ADMIN user

Steps run in sequence client-side with no server-side saga or compensation. If Step 2 fails, Step 1 cannot be rolled back (separate HTTP requests, separate DB transactions).

**Evidence:**
- `lib/api.js:182-228` — two sequential `apiFetch` calls
- `billing.service.js:51-64` — org created in tx, no compensation hook

**Suggested Fix:**
- Backend: Create a unified `POST /api/v1/billing/register` endpoint that creates both Organization and SUPER_ADMIN user in a single DB transaction
- Or: Backend returns a one-time registration token from step 1; step 2 requires this token

**Regression Test:** Simulate step 2 failure after step 1 succeeds. Verify no orphaned org remains in DB.

**Resolution:**  
`POST /api/v1/billing/register` now creates the organization, trial subscription, and tenant owner in one Prisma transaction. The frontend signup flow uses that single endpoint, and the owner is created as tenant `ADMIN`, not platform `SUPER_ADMIN`.

---

## BUG-SEC-002 — JWT Tokens Stored in localStorage (XSS Risk)
**Severity:** HIGH  
**Module:** Auth / Security  
**Status:** PARTIALLY RESOLVED

**Description:**  
`lib/api.js` stores `token`, `refreshToken`, `user`, and `pending2FAUserId` in `localStorage`. Any XSS vulnerability (in a dependency, in user-generated content, or in misconfigured CORS) allows an attacker to steal all tokens and impersonate the user indefinitely.

**Evidence:**
- `lib/api.js:7` — `localStorage.getItem('token')`
- `lib/api.js:22-28` — `setTokens` writes to localStorage
- `lib/api.js:50-57` — `clearTokens` removes all items

**Impact:** Full account takeover. Access and refresh tokens exposed. Even after logout, if tokens were stolen, they remain valid until expiry.

**Suggested Fix:**
- Store access tokens in memory (React state or context)
- Store refresh tokens in HttpOnly cookies (`Set-Cookie: refreshToken=...; HttpOnly; SameSite=Strict`)
- Backend must expose a `/auth/refresh-token` endpoint that reads from the cookie

**Regression Test:** After login, verify `localStorage` does not contain `token` or `refreshToken`.

**Resolution Note:**  
Refresh tokens are now issued and rotated through an httpOnly `refreshToken` cookie. The refresh token is no longer exposed in the login JSON body or stored by the frontend in localStorage. Access tokens still remain in localStorage, so XSS exposure is reduced but not fully eliminated.

---

## BUG-SEC-003 — Client Supplies `role: 'SUPER_ADMIN'` to /auth/register
**Severity:** HIGH  
**Module:** Auth / RBAC / Security  
**Status:** RESOLVED

**Description:**  
`lib/api.js:200` sends `role: 'SUPER_ADMIN'` as part of the user creation payload for organization registration. If the `/auth/register` backend endpoint accepts and uses the `role` field from the request body without server-side restriction, any caller who knows the API can self-register as SUPER_ADMIN.

**Evidence:**
- `lib/api.js:200`: `role: 'SUPER_ADMIN'`
- Backend auth route not inspected in this audit — requires verification

**Required Verification:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"hack@evil.com","password":"Test@1234","firstName":"Hack","lastName":"User","employeeId":"HACK-001","role":"SUPER_ADMIN"}'
```
If this creates a SUPER_ADMIN user, the bug is confirmed critical.

**Suggested Fix:**  
Backend `/auth/register` should not accept `role` from client. If registration is public, force role to `EMPLOYEE`. For org registration, use a separate endpoint or a signed token from billing registration.

**Resolution:**  
`POST /api/v1/auth/register` is authenticated and limited to `ADMIN`/`SUPER_ADMIN` callers, and its validator/service reject `SUPER_ADMIN` creation from request payloads. Public organization signup no longer calls `/auth/register`; `/billing/register` creates a tenant `ADMIN` owner atomically and rejects public `role` fields.

---

## BUG-ENV-001 — frontend/.env.local Missing
**Severity:** HIGH  
**Module:** Frontend / Environment  
**Status:** OPEN

**Description:**  
`frontend/.env.local` does not exist. `lib/api.js` falls back to `http://localhost:5000/api/v1`. This works in local dev but fails silently in:
- Docker deployments
- Remote dev environments
- Staging/production

**Evidence:**
- File not present (confirmed by directory inspection)
- `lib/api.js:2`: `const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'`

**Suggested Fix:** Create `frontend/.env.local` from `frontend/.env.example`. Add to developer onboarding and `health-check.ps1` as a FAIL (not just WARN).

---

## BUG-DB-002 — DATABASE_URL Database Name Inconsistency
**Severity:** MEDIUM  
**Module:** Database / DevOps  
**Status:** OPEN

**Description:**  
The actual `.env` uses `DATABASE_URL` pointing to a database named `TESTING`. The `.env.example` uses `worknex_ai`. Any developer who creates a fresh environment from the example will connect to a different database than existing team members.

**Evidence:**
- Actual: `postgresql://postgres:[REDACTED]@localhost:5432/TESTING`
- Example: `postgresql://postgres:[REDACTED]@localhost:5432/worknex_ai`

**Suggested Fix:** Align `.env.example` database name with the team's current standard, or document that the database name is intentionally environment-specific.

---

## BUG-API-001 — console.log Logs User Data Including Passwords to Browser Console
**Severity:** MEDIUM  
**Module:** Frontend / Security  
**Status:** OPEN

**Description:**  
`lib/api.js:631` contains `console.log('Creating user with data:', backendData)`. The `backendData` object may include `password` field (line 628: `if (password) backendData.password = password`). This logs user passwords to the browser developer console in production.

**Evidence:**
- `lib/api.js:628-631`

**Suggested Fix:** Remove the `console.log` statement entirely. Never log objects that may contain passwords.

---

## BUG-REG-002 — Registration Flow Does Not Handle `city` Field
**Severity:** LOW  
**Module:** Registration / UX  
**Status:** OPEN

**Description:**  
The `register/page.jsx` collects `city` from the user and displays it as a required field. The `authAPI.signup()` in `lib/api.js` does not forward `city` to either `/billing/register` (which has no city column) or `/auth/register`. The field is silently discarded. Users expect city to be saved; it is not.

**Evidence:**
- `register/page.jsx` — city input field present
- `lib/api.js:171-180` — city not forwarded
- `billing.service.js` — no city in Organization model
- Prisma schema — Organization has no `city` column

**Suggested Fix:** Either add `city` to the Organization model and schema, or remove the field from the registration form if not needed.

---

## BUG-RATE-001 — No Dedicated Rate Limit on /billing/register
**Severity:** MEDIUM  
**Module:** Billing / Security  
**Status:** OPEN

**Description:**  
`/api/v1/billing/register` is covered only by the global rate limiter (200 requests / 15 minutes). There is no dedicated, stricter rate limit for this endpoint. An automated attacker can create up to 200 organizations per 15 minutes from a single IP, polluting the database with orphaned trial organizations.

**Evidence:**
- `src/app.js:55-57` — `app.use('/api', globalLimiter)` only
- Auth limiter (20/15min) applied only to `/api/v1/auth/login` and `/api/v1/auth/register`

**Suggested Fix:**
```javascript
app.use('/api/v1/billing/register', rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { success: false, message: 'Too many registration attempts, please try again later' },
}));
```

---

## BUG-ARCH-001 — _archive_src_duplicate Directory Committed to Repository
**Severity:** LOW  
**Module:** Repository / Architecture  
**Status:** OPEN

**Description:**  
`frontend/_archive_src_duplicate/` is committed to the repository with ~20+ files including old TypeScript pages, archived API files, and old authentication flows. This creates confusion about which code is authoritative, may expose old endpoints or credentials in archived code, and bloats the repository.

**Evidence:**
- `git status` shows: `A frontend/_archive_src_duplicate/api/api.js` and multiple renamed `.tsx` files

**Suggested Fix:** Remove `_archive_src_duplicate/` from git tracking, add to `.gitignore`, and preserve locally if needed for reference.

---

## BUG-UX-001 — Terms of Service Checkbox Not Validated
**Severity:** LOW  
**Module:** Registration / UX  
**Status:** OPEN

**Description:**  
`register/page.jsx` renders a Terms of Service checkbox but does not validate that it is checked before form submission. Users can register without agreeing to the terms.

**Evidence:**
- `register/page.jsx` — no validation for checkbox state in `handleSubmit`

**Suggested Fix:** Add checkbox state and validate in `handleSubmit`.

---

## BUG-TEST-001 — Smoke Test Does Not Cover Public Registration
**Severity:** LOW  
**Module:** Testing / CI  
**Status:** OPEN

**Description:**  
`scripts/smoke-test.ps1` tests auth, attendance, leave, reports, settings, and AI — but does not test `POST /api/v1/billing/register`. The regression for REG-001 (table missing) would not be caught by smoke.

**Evidence:**
- `scripts/smoke-test.ps1` — no `/billing/register` call

**Suggested Fix:** Add a registration smoke test with a unique org name and verify HTTP 201 response.

---

## Bug Count Summary

| Severity | Count |
|---|---|
| CRITICAL | 1 (RESOLVED) |
| HIGH | 4 (1 RESOLVED, 3 OPEN) |
| MEDIUM | 3 OPEN |
| LOW | 4 OPEN |
| **TOTAL** | **12** |

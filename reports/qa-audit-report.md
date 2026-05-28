# QA AUDIT REPORT — WorkNex AI
**Audit Date:** 2026-05-23
**Auditor Role:** Principal QA Engineer / Production Readiness Auditor
**Status:** PARTIAL_PASS — blockers identified, some already resolved in-session

---

## PHASE 1 — REPOSITORY AND ENVIRONMENT DISCOVERY

### Detected Services and Ports

| Service | Location | Port | Start Command | Status |
|---|---|---|---|---|
| Backend (Node/Express) | `worknex-backend/` | 5000 | `npm run dev` / `node src/app.js` | Static checks PASS |
| Frontend (Next.js 16) | `frontend/` | 3000 | `npm run dev` | Running (HTTP 200) |
| AI Service (FastAPI) | `ai-service/` | 8000 | `python run.py` | Running (HTTP 200) |

### Detected Package Managers

| Service | Manager | Evidence |
|---|---|---|
| Backend | npm | `worknex-backend/package.json` |
| Frontend | npm | `frontend/package.json` |
| AI | pip | `ai-service/requirements.txt` |

### Root Package Scripts (actual `package.json`)

| Script | Command | Safe? |
|---|---|---|
| `health` | PowerShell health-check.ps1 | Yes |
| `start:dev` | PowerShell start-dev.ps1 | Yes |
| `smoke` | PowerShell smoke-test.ps1 | Yes (requires services running) |
| `test:full` | PowerShell full-module-test.ps1 | Yes (creates test data, cleans up) |
| `db:setup` | `cd worknex-backend && npm.cmd run db:setup` | Yes (deploy-only, non-destructive) |
| `db:status` | `cd worknex-backend && npm.cmd run db:status` | Yes (read-only) |
| `db:reset` | `cd worknex-backend && npm.cmd run db:reset` | LOCAL ONLY — DESTRUCTIVE |
| `db:seed` | `cd worknex-backend && npm.cmd run db:seed` | Yes |
| `db:preflight` | `cd worknex-backend && npm.cmd run db:preflight` | Yes (read-only) |
| `lint` | `cd frontend && npm.cmd run lint` | Yes |
| `build` | `cd frontend && npm.cmd run build` | Yes |

### Backend Package Scripts (actual `worknex-backend/package.json`)

| Script | Command | Safe? |
|---|---|---|
| `start` | `node src/app.js` | Yes |
| `dev` | `nodemon src/app.js` | Yes |
| `db:validate` | `prisma validate` | Yes |
| `db:generate` | `prisma generate` | Yes |
| `db:status` | `prisma migrate status` | Yes (read-only) |
| `db:deploy` | `prisma migrate deploy` | Yes (non-destructive) |
| `db:dev` | `prisma migrate dev` | Dev-only (may create migration files) |
| `db:reset` | `prisma migrate reset` | LOCAL ONLY — DESTRUCTIVE |
| `db:setup` | `prisma validate && prisma generate && prisma migrate deploy` | Yes |
| `db:seed` | `node prisma/seed.js` | Yes |
| `db:preflight` | `node scripts/db-preflight.js` | Yes (read-only) |

### Frontend Package Scripts

| Script | Command |
|---|---|
| `dev` | `next dev` |
| `build` | `next build` |
| `start` | `next start` |
| `lint` | `eslint` |

### Environment File Summary (REDACTED)

| Variable | Service | Present? | Notes |
|---|---|---|---|
| `DATABASE_URL` | Backend `.env` | YES | Points to `TESTING` database (see DB section) |
| `JWT_SECRET` | Backend `.env` | YES — REDACTED | Must be strong in production |
| `JWT_REFRESH_SECRET` | Backend `.env` | YES — REDACTED | Must be strong in production |
| `SMTP_HOST/USER/PASS` | Backend `.env` | LIKELY SET | Not shown |
| `POWERBI_*` | Backend `.env` | PRESENT | Values not shown |
| `AI_SERVICE_URL` | Backend `.env` | YES | localhost:8000 |
| `NEXT_PUBLIC_API_URL` | Frontend `.env.local` | **MISSING — NOT PRESENT** | Fallback hardcoded in `lib/api.js` |
| `NEXT_PUBLIC_AI_URL` | Frontend `.env.local` | **MISSING — NOT PRESENT** | Fallback hardcoded or absent |
| AI env file | `ai-service/.env` | **MISSING** | Example present; service relies on defaults |

**Risk:** `frontend/.env.local` does not exist. `lib/api.js` falls back to `http://localhost:5000/api/v1`. This works locally but will fail silently in any deployment where the backend is not at localhost.

---

## PHASE 2 — DATABASE AND MIGRATION AUDIT

### Prisma Schema Model Inventory

| Model | In Schema | Migration | Tenant-scoped | Risk |
|---|---|---|---|---|
| Organization | YES | init (20260407) | N/A — is the tenant root | — |
| OrganizationSettings | YES | 20260517130000 | YES (organizationId) | LOW |
| User | YES | init (20260407) | YES (20260517090000) | LOW |
| Department | YES | init (20260407) | YES (20260517090000) | LOW |
| Attendance | YES | init (20260407) | YES (20260517090000) | LOW |
| LeaveRequest | YES | init (20260407) | YES (20260517090000) | LOW |
| LeaveBalance | YES | init (20260407) | YES (20260517090000) | LOW |
| LeavePolicy | YES | init (20260407) | YES (20260517090000) | LOW |
| PolicyDocument | YES | 20260517130000 | YES (organizationId) | LOW |
| ExtractedPolicyRule | YES | 20260517130000 | YES (organizationId) | LOW |
| LeavePolicyVersion | YES | 20260517130000 | YES (organizationId) | LOW |
| LeaveDecisionLog | YES | 20260517130000 | YES (organizationId) | LOW |
| Notification | YES | init (20260407) | YES (20260517090000) | LOW |
| PerformanceRecord | YES | init (20260407) | YES (20260517090000) | LOW |
| AuditLog | YES | init (20260407) | YES (20260517090000) | LOW |
| EtlSyncLog | YES | init (20260407) | YES (20260517090000) | LOW |
| RefreshToken | YES | init (20260407) | NO — user-level | MEDIUM — no org scope |
| Subscription | YES | init (20260407) | YES (organizationId) | LOW |
| Invoice | YES | init (20260407) | YES (organizationId) | LOW |
| Holiday | YES | init (20260407) | YES (20260517090000) | LOW |

**All 20 models present. All have corresponding migrations. Tenant isolation added in migration 20260517090000 for core operational tables.**

### Migration Order and Validity

| Migration | Applied? | Creates What |
|---|---|---|
| `20260407071533_init` | YES | All base tables, enums, foreign keys |
| `20260510080657_add_attendance_location_fields` | YES | `ipAddress` column on Attendance |
| `20260517090000_add_tenant_isolation` | YES | `organizationId` on all core tables, indexes, FK constraints |
| `20260517130000_add_durable_settings_leave_automation` | YES | OrganizationSettings, PolicyDocument, ExtractedPolicyRule, LeavePolicyVersion, LeaveDecisionLog |

Migration order is valid. No gaps. No circular dependencies.

### DB Commands Run (Audit Session)

| Command | Result |
|---|---|
| `npm run db:validate` | **PASS** — schema valid |
| `npm run db:generate` | **PASS** — Prisma Client v5.22.0 generated |
| `npm run db:status` (pre-setup) | **4 migrations pending** — DB was empty/unmigrated |
| `npm run db:setup` | **PASS** — all 4 migrations applied |
| `npm run db:status` (post-setup) | **PASS** — "Database schema is up to date!" |
| `node scripts/db-preflight.js` | **PASS** — all 10 required tables confirmed |

### DATABASE_URL Discrepancy

- **Actual `.env`:** `postgresql://postgres:[REDACTED]@localhost:5432/TESTING`
- **`.env.example`:** `postgresql://postgres:[REDACTED]@localhost:5432/worknex_ai`
- **Risk:** The database name `TESTING` is atypical. New developers copying `.env.example` will connect to a different database (`worknex_ai`) than the current `.env`. This is the root cause of the original incident — a new database (`TESTING`) was created without running migrations.

---

## PHASE 3 — /REGISTER AND PUBLIC ONBOARDING QA

### Route Audit

| Check | Expected | Actual | Status |
|---|---|---|---|
| Backend route exists | `POST /api/v1/billing/register` | YES — `billing.routes.js` | PASS |
| Route is public (no auth) | No authentication required | YES | PASS |
| Validation middleware present | `body('orgName')`, `body('ownerEmail')`, etc. | YES — `express-validator` | PASS |
| Frontend calls correct endpoint | `/billing/register` | YES — via `lib/api.js` `authAPI.signup()` | PASS |
| Payload mapping in frontend | Frontend fields → Backend fields | YES — `lib/api.js:168` maps correctly | PASS |

### Frontend-to-Backend Payload Mapping Trace

The `frontend/app/register/page.jsx` sends to `useAuth().signup()`:
```
{ organization_name, admin_name, admin_email, password, industry, company_domain, city, country }
```

`lib/api.js` `authAPI.signup()` transforms this to:
```
Step 1: POST /billing/register
  { orgName, ownerEmail, ownerFirstName, ownerLastName, industry, country, phone, website }

Step 2: POST /auth/register
  { email, password, firstName, lastName, employeeId (auto), role: 'SUPER_ADMIN', organizationId }
```

**Fields from frontend NOT forwarded to backend:** `city`, `subscription_plan`
**Fields auto-derived:** `ownerLastName` (splits `admin_name` on space, defaults to `'User'`), `employeeId` (`ADMIN-{timestamp}`)

### Registration Flow Tests

| Test | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Backend route path | `POST /api/v1/billing/register` | Confirmed in routes/index.js + billing.routes.js | PASS | Code inspection |
| Frontend calls correct endpoint | `/billing/register` | lib/api.js:184 `apiFetch('/billing/register'...)` | PASS | Code inspection |
| Payload field mapping | All required fields mapped | lib/api.js:171-180 maps frontend→backend fields | PASS | Code inspection |
| Organization table required | Yes | billing.service.js:44 `prisma.organization.findUnique` | PASS | Code inspection |
| Org creation on success | New Organization record | billing.service.js:52-54 `tx.organization.create` | PASS | Code inspection |
| Subscription trial created | TRIAL subscription auto-created | billing.service.js:55-64 | PASS | Code inspection |
| Owner user created | SUPER_ADMIN user linked to org | lib/api.js:196-205 (Step 2: `/auth/register`) | PASS — but see BUG-003 | Code inspection |
| organizationId in response | Present | `orgResponse.data.organization.id` used in Step 2 | PASS | Code inspection |
| Duplicate org slug | 409 error returned | billing.service.js:45 `throw ApiError(409,...)` | PASS | Code inspection |
| Error exposes file paths | Must NOT | NOW PROTECTED by: startup guard + error middleware + billing controller catch | PASS (post-fix) | Code inspection |
| Raw Prisma stack to frontend | Must NOT | NOW PROTECTED by error middleware P2021 handler + controller catch | PASS (post-fix) | Code inspection |
| DB not migrated error format | Clean 503, no stack | NOW returns `{ success: false, message: "Database is not migrated. Run database setup." }` | PASS (post-fix) | Code inspection |

### Critical Registration Bug Identified

**BUG-003 (HIGH): Two-Step Registration Has No Atomicity**
- Step 1 creates `Organization` + `Subscription` via DB transaction — safe
- Step 2 calls `POST /auth/register` — if this fails, organization exists with no owner
- No rollback or cleanup exists for orphaned organizations
- Frontend error message: `"Organization created but admin account creation failed"`
- User is left with no way to log in
- Database has orphaned Organization records

**BUG-004 (MEDIUM): /auth/register accepts client-supplied `role: 'SUPER_ADMIN'`**
- `lib/api.js:200` sends `role: 'SUPER_ADMIN'` to `/auth/register`
- If the backend accepts this without restriction, any client could self-register as SUPER_ADMIN by calling `/auth/register` directly
- The backend auth route requires inspection to confirm role is validated server-side

---

## PHASE 4 — EXISTING TEST SCRIPT AUDIT

### health-check.ps1

Runs entirely static checks. Does NOT require services to be running.

| Check | Implemented | Safe |
|---|---|---|
| node/npm/python presence | YES | YES |
| Backend .env present | YES | YES |
| Frontend .env.local | YES (WARN if missing, not FAIL) | YES |
| DATABASE_URL in .env | YES | YES |
| Backend node_modules | YES | YES |
| `prisma validate` | YES | YES |
| `prisma generate` | YES | YES |
| `prisma migrate status` | YES | YES (now PASS post-setup) |
| Syntax check 10 backend files | YES | YES |
| Frontend node_modules | YES | YES |
| `npm run lint` (frontend) | YES | YES |
| `npm run build` (frontend) | YES | YES |
| AI Python compile | YES | YES |
| AI dependency check | YES | YES |
| AI training script | YES | YES |
| AI ingestion script | YES | YES |
| Live backend /health | SKIPPED if not running | YES |
| Live frontend / | PASS (running) | YES |
| Live AI /health | PASS (running) | YES |

**Result: PASS** (migration status now clean, static checks all pass)

### smoke-test.ps1

Requires all three services to be running. Tests live API calls.

| Check | Implemented |
|---|---|
| Backend /health | YES |
| Frontend / | YES |
| AI /health | YES |
| ADMIN login | YES |
| MANAGER login | YES |
| EMPLOYEE login | YES |
| Authenticated ADMIN endpoints | YES (users, analytics, reports, settings) |
| MANAGER endpoints | YES (users, attendance, leave/pending) |
| EMPLOYEE endpoints | YES (me, attendance/today, balances, performance, ai/chat) |
| Public registration | NOT PRESENT in smoke-test.ps1 |

**Result at audit time: FAIL** — backend was not running when smoke was executed. Frontend and AI were available.

### full-module-test.ps1 / full-module-test.js

| Module | Covered | Notes |
|---|---|---|
| Health (backend/frontend/AI) | YES | Service gate before tests |
| Public Registration | **YES — ADDED** | publicRegistrationTests() added in this session |
| Auth (login, refresh, me) | YES | All seeded roles tested |
| Tenant isolation | YES | org scope verified |
| Departments | YES | CRUD + RBAC tested |
| Users | YES | CRUD + RBAC tested |
| Attendance | YES | check-in/out, duplicate, manual |
| Leave + AI Automation | YES | balance, apply, overlap, decision explanation, manager approve |
| Policy document upload | YES | upload/extract/parse/approve |
| Reports | YES | 7 report endpoints |
| Settings | YES | get/update/RBAC |
| Analytics | YES | 6 admin endpoints + manager/employee |
| Notifications | YES | list, unread, mark read, broadcast |
| Performance | YES | me, team, leaderboard, admin |
| AI Backend | YES | chat + predict-performance |
| AI Direct | YES | /health, /chat, /predict/performance |
| Power BI | YES | token endpoint + frontend page |
| Frontend routes | YES | 12 routes tested |
| Cleanup | YES | deactivate test users, delete dept, cancel leave |

**Result: NOT RUN** — backend not started. Script requires services running.

### Script Coverage Matrix

| Module | health | smoke | test:full |
|---|---|---|---|
| DB migration readiness | YES | No | No |
| Public Registration | No | No | YES (added) |
| Auth flows | No | Partial | YES |
| RBAC enforcement | No | No | YES |
| Tenant isolation | No | No | YES |
| Attendance | No | Partial | YES |
| Leave automation | No | No | YES |
| Reports/Settings | No | Partial | YES |
| AI | Compile+train | Partial | YES |
| Power BI | No | No | YES |
| Frontend routes | Static (build) | Partial | YES |

---

## PHASE 5 — FULL MODULE QA COVERAGE AUDIT

### 1. Auth / JWT / 2FA

| Check | Status | Notes |
|---|---|---|
| Login success | VERIFIABLE | Via smoke (not run) / full test |
| Login failure | Verified in code | 401 returned from auth.middleware |
| Refresh token | Verified in lib/api.js | Auto-refresh on 401 |
| Logout | Implemented | `apiFetch('/auth/logout')` + local clear |
| 2FA setup/verify/disable/validate | Implemented | lib/api.js:292-338 |
| Password reset | Implemented | forgot-password + reset-password pages + api |
| Super admin login | Implemented | Role check after login |
| Token storage risk | **HIGH RISK** | Tokens in localStorage — XSS vulnerable |
| JWT secret strength | Unknown | Redacted; must be strong in production |

### 2. RBAC and Tenant Isolation

| Check | Status | Notes |
|---|---|---|
| Admin org-scoped | YES | `getOrganizationScope()` in tenant.js |
| Manager subordinate-scoped | YES | `getManagerSubordinateIds()` in rbac.js |
| Employee self-scoped | YES | Returns `[requestingUser.id]` |
| SUPER_ADMIN bypasses org scope | YES — by design | Empty scope returned |
| Cross-org protection | YES — by code | `assertOrganizationAccess()` throws 403 |
| User list scoping | YES | `getAccessibleUserIds()` used |
| Attendance scoping | YES — verifiable | RBAC helpers available |
| Leave approval scoping | YES — tested | Manager cannot approve non-subordinate |
| Reports scoping | YES — verifiable | Role-based in reports module |
| RefreshToken not org-scoped | **GAP** | RefreshToken has no `organizationId` |

### 3–12. See Test Matrix (qa-test-matrix.md) for module-by-module breakdown.

---

## PHASE 6 — SECURITY AND ERROR HANDLING AUDIT

### Security Findings Summary

| Risk | Severity | Evidence | Impact | Status |
|---|---|---|---|---|
| Raw Prisma stack exposed to frontend | **HIGH** | Original incident: `The table public.Organization does not exist` | Path disclosure, internal info leak | MITIGATED (error middleware + controller catch added) |
| JWT tokens in localStorage | **HIGH** | `lib/api.js:7` `localStorage.getItem('token')` | XSS can steal tokens and impersonate user | OPEN — architectural change needed |
| `frontend/.env.local` missing | **HIGH** | File not present; fallback to hardcoded localhost | Silent failure in any non-localhost deployment | OPEN |
| Client-supplied `role: 'SUPER_ADMIN'` to `/auth/register` | **HIGH** | `lib/api.js:200` | Self-privilege escalation if backend doesn't validate | NEEDS BACKEND VERIFICATION |
| Two-step registration not atomic | **HIGH** | lib/api.js:190-221 | Orphaned orgs, no owner account | OPEN |
| DATABASE_URL database name discrepancy | **MEDIUM** | .env=TESTING vs .env.example=worknex_ai | Fresh developer hits unmigrated DB | PARTIALLY MITIGATED (db:setup + startup guard added) |
| No rate limit on `/billing/register` | **MEDIUM** | app.js applies 200/15min global limiter only | Org spam/abuse possible | OPEN |
| `console.log` in production code | **MEDIUM** | `lib/api.js:631`: `console.log('Creating user with data:', backendData)` | Logs user data including passwords to browser console | OPEN |
| `_archive_src_duplicate` committed to repo | **LOW** | Git status shows ~20 archived files | Old credentials/endpoints visible; repo bloat | OPEN |
| Terms of Service checkbox not validated | **LOW** | `register/page.jsx` — no required attribute on checkbox | UX/legal gap | OPEN |
| CORS allows regex LAN range | **LOW** | `app.js:33` `/^http:\/\/192\.168\./` | Any 192.168.x.x device can make authenticated requests | ACCEPTABLE for demo |

### Error Handling Quality

| Path | Before Audit | After Audit |
|---|---|---|
| DB not migrated → `/billing/register` | Prisma stack trace returned | Clean 503 JSON |
| DB not migrated → backend startup | Ugly crash | Clean exit with migration command |
| P2002 (duplicate) | Clean 409 ✓ | Clean 409 ✓ |
| P2025 (not found) | Clean 404 ✓ | Clean 404 ✓ |
| P2021 (table missing) | Unhandled → 500 with stack | Clean 503 JSON |
| Generic 500 | Exposes message in dev | Exposes message in dev only |

---

## PHASE 7 — SEE qa-bug-report.md

---

## PHASE 8 — SEE qa-codex-fix-roadmap.md

---

## PHASE 9 — FINAL SUMMARY

### Commands Run During This Audit

| Command | Result |
|---|---|
| `npm run db:validate` | PASS |
| `npm run db:generate` | PASS |
| `npm run db:status` (before) | 4 migrations pending — DB was unmigrated |
| `npm run db:setup` | PASS — all 4 migrations applied |
| `npm run db:status` (after) | PASS — schema up to date |
| `node scripts/db-preflight.js` | PASS — all 10 tables confirmed |
| `npm run health` | PASS — all static checks pass |
| `npm run smoke` | FAIL — backend not running at test time |
| `npm run test:full` | NOT RUN — backend not started |

### Fixes Applied During This Audit Session

| Change | File(s) | Status |
|---|---|---|
| Added db:* scripts | `worknex-backend/package.json` | DONE |
| Added root db:* shortcuts | `package.json` | DONE |
| Created db-preflight.js | `worknex-backend/scripts/db-preflight.js` | DONE |
| Added startup migration guard | `worknex-backend/src/app.js` | DONE |
| Added P2021 handler to global error middleware | `worknex-backend/src/middleware/error.middleware.js` | DONE |
| Added migration error catch to billing controller | `worknex-backend/src/modules/billing/billing.controller.js` | DONE |
| Added public registration E2E module | `scripts/full-module-test.js` | DONE |
| Updated MIGRATION_AND_RUNBOOK.md | `docs/MIGRATION_AND_RUNBOOK.md` | DONE |
| Applied migrations to TESTING database | DB state | DONE |

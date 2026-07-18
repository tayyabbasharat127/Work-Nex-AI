# Security Notes

## RBAC Ownership Rules

Priority 6 adds backend ownership checks for manager-accessible routes. Frontend button hiding is not treated as a security boundary.

Rules enforced by `backend/src/utils/rbac.js` and the tenant scope helpers:

- `SUPER_ADMIN` is the platform-level exception and can access platform-wide data only on routes that explicitly allow `SUPER_ADMIN`.
- `ADMIN` can access organization-wide data only where `organizationId === req.user.organizationId`.
- `MANAGER` can access only same-organization users where `user.managerId === req.user.id`.
- `EMPLOYEE` can access only self inside their own organization on routes that allow employee access.
- Unauthorized ownership access must return `403`.

## Tenant Isolation Rules

Priority 7 adds explicit `organizationId` tenant keys to tenant-owned data:

- Tenant isolation migrations are now applied in the Prisma migration chain and were verified with a fresh local reset for the Priority 13A run.
- Production or otherwise important databases need an explicit tenant backfill plan before enforcing required `organizationId` fields.
- Manager ownership remains subordinate-scoped inside the organization boundary.
- Required tenant models: `User`, `Department`, `Attendance`, `LeaveRequest`, `LeaveBalance`, `LeavePolicy`, `Notification`, `PerformanceRecord`, and `Holiday`.
- Optional tenant context models: `AuditLog` and `EtlSyncLog`, because platform/system events may be global.
- Authenticated `req.user` includes `organizationId`.
- Access tokens and refresh tokens include `organizationId`.
- Normal org users must have an `organizationId`; public auth registration rejects missing `organizationId`.
- Admin create/update/manual actions must use the requester's organization unless the requester is an explicitly allowed `SUPER_ADMIN`.
- Manager ownership checks are evaluated inside the organization boundary.
- Manager subordinate lookup filters by the authenticated manager's `organizationId`; the previous invalid nullable filter was removed so manager-scoped routes fail closed through normal RBAC instead of throwing a Prisma validation error.

## Registration And Session Rules

- `POST /api/v1/auth/register` is not public. It requires an authenticated `ADMIN` or `SUPER_ADMIN`.
- `/auth/register` cannot create `SUPER_ADMIN`; accepted roles are capped to `ADMIN`, `MANAGER`, and `EMPLOYEE`, and the service defaults unknown roles to `EMPLOYEE`.
- Public organization signup goes through `POST /api/v1/billing/register`.
- Billing registration creates the organization, trial subscription, and tenant owner `ADMIN` user in a single Prisma transaction.
- Billing registration rejects public `role` fields; public signup cannot create `SUPER_ADMIN`.
- Billing registration must not rely on the frontend calling `/auth/register` as a second step.
- Login and 2FA validation set the refresh token in an httpOnly `refreshToken` cookie scoped to `/api/v1/auth`.
- Refresh token rotation reads from the httpOnly cookie first and rotates the cookie on refresh.
- Logout clears the refresh cookie and invalidates the matching stored refresh token where present.
- Access tokens remain short-lived bearer tokens for API authorization, but the frontend keeps new access tokens in module memory instead of `localStorage`. Legacy `localStorage.token` values are removed on login/logout, and page reloads use the httpOnly refresh cookie to rehydrate access after a 401 retry.

Backfill strategy:

- If an existing database has one organization, legacy tenant rows can be assigned to that organization.
- Rows that can derive organization from `User.organizationId` are backfilled from that relation.
- If multiple organizations exist and legacy users/departments/policies/holidays cannot be derived safely, migration fails loudly and requires manual assignment before retrying.

## Tenant Model Audit

| Model | Has `organizationId` After Priority 7 | Current Leakage Risk Before Fix | Fix Applied |
|---|---:|---|---|
| `User` | Yes | Users were globally visible by role checks. | Required tenant key, auth payload, org-scoped services. |
| `Department` | Yes | Department names and lists were global. | Required tenant key, per-org unique name. |
| `Attendance` | Yes | Admin/manager attendance and summaries could cross orgs. | Required tenant key on writes and reads. |
| `LeaveRequest` | Yes | Leave lists/approval could cross orgs. | Required tenant key, org + RBAC approval checks. |
| `LeaveBalance` | Yes | Balances could be viewed across orgs. | Required tenant key and org-scoped balances. |
| `LeavePolicy` | Yes | Policies were global. | Required tenant key, per-org leave type uniqueness. |
| `Notification` | Yes | Broadcasts and reads could cross orgs. | Required tenant key and org-scoped broadcast/read operations. |
| `PerformanceRecord` | Yes | Leaderboards/performance could cross orgs. | Required tenant key and org/team-scoped queries. |
| `Holiday` | Yes | Holidays were global. | Required tenant key and org-scoped holiday APIs. |
| `AuditLog` | Optional | Audit context did not record tenant. | Optional tenant key from `req.user.organizationId`. |
| `EtlSyncLog` | Optional | ETL logs were global. | Optional tenant key for org-scoped ETL runs/logs. |

## Manager Route Audit

| Route | Current Access Before Priority 6 | Risk | Required Ownership Rule |
|---|---|---|---|
| `GET /api/v1/users` | Role-only manager access | Manager could list all users or filter arbitrary departments | Managers receive only direct subordinates. |
| `GET /api/v1/users/:id` | Role-only manager access | Manager could fetch random user profile | Managers can fetch only direct subordinates. |
| `GET /api/v1/users/department/:deptId` | Role-only manager access | Manager could list employees in any department | Managers receive only direct subordinates in the department. |
| `GET /api/v1/attendance` | Role-only manager access plus arbitrary `userId` query | Manager could read any employee attendance | Managers can query only subordinate attendance. |
| `GET /api/v1/attendance/user/:userId` | Role-only manager access | Manager could read any employee attendance history | Managers can read only subordinate attendance. |
| `GET /api/v1/attendance/summary` | Role-only manager access | Manager summary could include all employees | Manager summary is limited to direct subordinates. |
| `GET /api/v1/leave` | Manager filter could be widened by `employeeId` query | Manager could fetch non-subordinate leave | Managers can list only subordinate leave. |
| `GET /api/v1/leave/pending` | Manager filter used approver assignment only | Manager could miss owned team requests or rely on mutable approver state | Managers see pending leave for direct subordinates. |
| `GET /api/v1/leave/:id` | Authenticated broad fetch | Employee/manager could read unrelated leave | Employees self-only; managers direct subordinates only. |
| `PUT /api/v1/leave/:id/approve` | Role-only manager approval | Manager could approve non-subordinate leave | Managers can approve only direct subordinate leave. |
| `PUT /api/v1/leave/:id/reject` | Role-only manager rejection | Manager could reject non-subordinate leave | Managers can reject only direct subordinate leave. |
| `GET /api/v1/leave/balances/:userId` | Role-only manager access | Manager could view arbitrary balances | Managers can view only subordinate balances. |
| `GET /api/v1/performance/user/:userId` | Role-only manager access | Manager could view arbitrary performance | Managers can view only subordinate performance. |
| `GET /api/v1/performance/team` | Manager ID was used, admin behavior was narrow | Manager route was okay, but admin behavior was inconsistent | Managers see own team; admins keep broad access. |
| `GET /api/v1/performance/leaderboard` | Global leaderboard for managers | Manager could view all employees | Manager leaderboard is team-scoped. |
| `GET /api/v1/analytics/*` | Manager analytics were global | Manager could view organization-wide KPIs and trends | Manager analytics are scoped to direct subordinates. |

## Attendance Rules

- Attendance dates are normalized with `ATTENDANCE_TIMEZONE`, then `ORGANIZATION_TIMEZONE`, then `TZ`, falling back to `Asia/Karachi`.
- Check-in, check-out, today, history, summary, TMS sync, and absence generation use the same attendance-date normalization.
- Duplicate check-in/check-out attempts return `409`; checkout calculates `workingHours` and marks `HALF_DAY` when hours are below `HALF_DAY_HOURS`.
- Late check-in uses `LATE_THRESHOLD_HOUR` and `LATE_THRESHOLD_MIN` in the configured attendance timezone.
- Absence generation is organization-scoped: for each active employee, if no attendance exists for the date, no approved leave overlaps the date, and the date is not a holiday, an `ABSENT` record is created.
- Managers can read only direct subordinate attendance and summaries inside their own organization. Arbitrary non-subordinate `userId` access returns `403`.
- Admin manual entries and attendance updates are organization-scoped and create `AuditLog` records for correction history.
- Wi-Fi/IP verification checks `OFFICE_IP_RANGES` only when `WIFI_VERIFICATION_ENABLED=true`. `X-Forwarded-For` is trusted only when Express `trust proxy` is configured; local/demo mode allows check-in and records the observed IP for context.
- TMS sync uses an external `TMS_API_URL`/`TMS_API_KEY` when configured and otherwise uses a local demo fallback scoped to the requester's organization.

## Leave Automation Rules

- AI is limited to policy text extraction and explanation. The deterministic rule engine makes final leave decisions.
- Uploaded policy documents are stored as inactive drafts until an admin approves parsed rules.
- No AI-parsed policy becomes active automatically.
- Decision types are `AUTO_APPROVED`, `AUTO_REJECTED`, `PENDING_MANAGER`, `PENDING_ADMIN`, `REQUIRES_DOCUMENT`, and `NEEDS_HUMAN_REVIEW`.
- Leave evaluation checks organization scope, role eligibility, leave type, balance existence, sufficient balance, overlap, max consecutive days, min notice days, document requirement, and manager/admin approval requirement.
- Missing balance, insufficient balance, and overlapping leave are blocked before a new request is accepted.
- Major leave actions and automated decisions write `AuditLog` records and notify affected users where applicable.
- Without an external LLM key, policy parsing uses the deterministic keyword fallback and reports lower confidence.
- Policy documents, extracted rules, approved policy versions, and leave decision logs are stored in durable tenant-scoped Prisma tables after the migration step. Uploaded file bytes may remain on local/object storage, but metadata and extracted text are in the database.

## Reports, Settings, and Departments

- Reports are generated from real database records. Admin report data is scoped to the requester's organization, managers are limited to direct subordinates inside that organization, and employees are limited to self-scoped reports.
- `SUPER_ADMIN` report access is explicit and may be platform-wide unless an `organizationId` filter is supplied.
- Organization settings reads are available to authenticated same-organization users for safe settings. Updates require `ADMIN` or `SUPER_ADMIN`.
- Organization policy settings are stored in the tenant-scoped `OrganizationSettings` table and updates create `AuditLog` records.
- Organization settings updates create `AuditLog` records.
- Department update/delete routes require `ADMIN` or `SUPER_ADMIN`, are organization-scoped, and reject manager access.
- Department deletion is blocked when active users are still assigned to the department.
- Department changes create `AuditLog` records.

## Manual Verification Cases

1. Manager can access own subordinate attendance.
2. Manager receives `403` for non-subordinate attendance.
3. Manager can approve own subordinate leave.
4. Manager receives `403` when approving non-subordinate leave.
5. Manager can see own team performance and leaderboard.
6. Manager receives `403` when fetching a random user profile.
7. Employee cannot fetch another employee's leave or balances on authenticated employee routes.
8. Admin and `SUPER_ADMIN` still receive broad results on the protected admin/manager routes.
9. Admin from Org A cannot list Org B users.
10. Manager from Org A cannot access Org B employee attendance.
11. Employee from Org A cannot access Org B profile or leave.
12. Admin cannot create a user into another organization.
13. Attendance manual entry rejects users outside the admin's organization.
14. Leave approval rejects leave outside the manager/admin organization.
15. Analytics for Org A exclude Org B.
16. Notifications do not cross organizations.
17. `SUPER_ADMIN` billing access still works.
18. Existing manager ownership tests from Priority 6 still pass inside tenant boundaries.
19. Manager reports include only direct subordinate data.
20. Admin settings updates are organization-scoped and audited.
21. Department update/delete rejects managers and cross-organization access.

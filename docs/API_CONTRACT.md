# WorkNex Frontend-Backend API Contract

Generated during Priority 3 discovery. Active frontend scan excludes `frontend/_archive_src_duplicate/**`.

Base backend mount: `/api/v1` from `worknex-backend/src/app.js`.

Backend response wrapper: `{ success: boolean, message: string, data?: any, meta?: any }`.

## 1. Backend Registered Endpoints

| Method | Path | Auth Required | Roles | Source File | Notes |
|---|---|---:|---|---|---|
| GET | `/api/v1/billing/plans` | No | Public | `src/modules/billing/billing.routes.js` | Returns plan list in `data`. |
| POST | `/api/v1/billing/register` | No | Public | `src/modules/billing/billing.routes.js` | Body: `orgName`, `ownerEmail`, `ownerFirstName`, `ownerLastName`, `industry`, `country`; returns organization/license/trial. |
| POST | `/api/v1/billing/subscribe` | Yes | `SUPER_ADMIN` | `src/modules/billing/billing.routes.js` | Body: `organizationId`, `planType`, `billingCycle`, `paymentMethod`, `paymentReference`. |
| POST | `/api/v1/billing/upgrade` | Yes | `SUPER_ADMIN` | `src/modules/billing/billing.routes.js` | Body: `organizationId`, `newPlan`, `billingCycle`; controller also accepts payment fields. |
| GET | `/api/v1/billing/:orgId/subscription` | Yes | `SUPER_ADMIN` | `src/modules/billing/billing.routes.js` | Returns subscription plus plan details. |
| GET | `/api/v1/billing/:orgId/invoices` | Yes | `SUPER_ADMIN` | `src/modules/billing/billing.routes.js` | Returns invoice array. |
| GET | `/api/v1/billing/:orgId/employee-limit` | Yes | `SUPER_ADMIN` | `src/modules/billing/billing.routes.js` | Returns `{ allowed, current, max, remaining, reason }`. |
| POST | `/api/v1/billing/:orgId/cancel` | Yes | `SUPER_ADMIN` | `src/modules/billing/billing.routes.js` | Optional body `reason`; service ignores reason. |
| POST | `/api/v1/auth/register` | No | Public | `src/modules/auth/auth.routes.js` | Body: `email`, `password`, `firstName`, `lastName`, `employeeId`, `role`; optional department/manager/designation/phone. |
| POST | `/api/v1/auth/login` | No | Public | `src/modules/auth/auth.routes.js` | Body: `email`, `password`; returns `{ accessToken, refreshToken, user }` or `{ requires2FA, userId }` in `data`. |
| POST | `/api/v1/auth/refresh-token` | No | Public | `src/modules/auth/auth.routes.js` | Body: `refreshToken`; returns `{ accessToken, refreshToken }` in `data`. |
| POST | `/api/v1/auth/logout` | Yes | Authenticated | `src/modules/auth/auth.routes.js` | Body optional `refreshToken`; clears refresh token(s). |
| POST | `/api/v1/auth/2fa/setup` | Yes | Authenticated | `src/modules/auth/auth.routes.js` | Returns `{ secret, qrCode }` in `data`. |
| POST | `/api/v1/auth/2fa/verify` | Yes | Authenticated | `src/modules/auth/auth.routes.js` | Body: `token`; enables 2FA. |
| POST | `/api/v1/auth/2fa/disable` | Yes | Authenticated | `src/modules/auth/auth.routes.js` | Body: `token`; disables 2FA. |
| POST | `/api/v1/auth/2fa/validate` | No | Public | `src/modules/auth/auth.routes.js` | Body: `userId`, `token`; returns tokens in `data`. |
| POST | `/api/v1/auth/forgot-password` | No | Public | `src/modules/auth/auth.routes.js` | Body: `email`; returns success message. |
| POST | `/api/v1/auth/reset-password` | No | Public | `src/modules/auth/auth.routes.js` | Body: `token`, `newPassword`. |
| POST | `/api/v1/auth/change-password` | Yes | Authenticated | `src/modules/auth/auth.routes.js` | Body: `oldPassword`, `newPassword`. |
| GET | `/api/v1/users/me` | Yes | Authenticated | `src/modules/users/users.routes.js` | Returns current user profile. |
| PUT | `/api/v1/users/me` | Yes | Authenticated | `src/modules/users/users.routes.js` | Body allowed: `firstName`, `lastName`, `phone`, `profilePicture`. |
| GET | `/api/v1/users/departments/all` | Yes | Authenticated | `src/modules/users/users.routes.js` | Returns department array. |
| POST | `/api/v1/users/departments` | Yes | `SUPER_ADMIN`, `ADMIN` | `src/modules/users/users.routes.js` | Body passed to Prisma Department create, likely `name` plus optional fields. |
| PUT | `/api/v1/users/departments/:id` | Yes | `SUPER_ADMIN`, `ADMIN` | `src/modules/users/users.routes.js` | Updates same-organization department fields and writes an audit log. |
| DELETE | `/api/v1/users/departments/:id` | Yes | `SUPER_ADMIN`, `ADMIN` | `src/modules/users/users.routes.js` | Deletes same-organization department only when no active users remain; writes an audit log. |
| GET | `/api/v1/users/department/:deptId` | Yes | `SUPER_ADMIN`, `ADMIN`, `MANAGER` | `src/modules/users/users.routes.js` | Returns active users for department. |
| GET | `/api/v1/users` | Yes | `SUPER_ADMIN`, `ADMIN`, `MANAGER` | `src/modules/users/users.routes.js` | Query: `role`, `departmentId`, `isActive`, `search`, pagination; returns user array in `data`, pagination in `meta`. |
| GET | `/api/v1/users/:id` | Yes | `SUPER_ADMIN`, `ADMIN`, `MANAGER` | `src/modules/users/users.routes.js` | Returns user. |
| POST | `/api/v1/users` | Yes | `SUPER_ADMIN`, `ADMIN` | `src/modules/users/users.routes.js` | Body: user fields; validates email/employee/name/role. |
| PUT | `/api/v1/users/:id` | Yes | `SUPER_ADMIN`, `ADMIN` | `src/modules/users/users.routes.js` | Body: partial user update. |
| DELETE | `/api/v1/users/:id` | Yes | `SUPER_ADMIN`, `ADMIN` | `src/modules/users/users.routes.js` | Deactivates user; no `data` payload. |
| POST | `/api/v1/attendance/check-in` | Yes | Authenticated | `src/modules/attendance/attendance.routes.js` | Body: `latitude`, `longitude`; office network required. |
| POST | `/api/v1/attendance/check-out` | Yes | Authenticated | `src/modules/attendance/attendance.routes.js` | Uses authenticated user. |
| POST | `/api/v1/attendance/ping` | Yes | Authenticated | `src/modules/attendance/attendance.routes.js` | Auto-check-in if on office network; returns action result. |
| GET | `/api/v1/attendance/today` | Yes | Authenticated | `src/modules/attendance/attendance.routes.js` | Returns current user's current-day attendance or null. |
| GET | `/api/v1/attendance/my` | Yes | Authenticated | `src/modules/attendance/attendance.routes.js` | Query: `month`, `year`, pagination; returns records in `data`, `meta`. |
| GET | `/api/v1/attendance/holidays` | Yes | Authenticated | `src/modules/attendance/attendance.routes.js` | Returns current-year holidays. |
| POST | `/api/v1/attendance/holidays` | Yes | `SUPER_ADMIN`, `ADMIN` | `src/modules/attendance/attendance.routes.js` | Body passed to Holiday create; date converted. |
| POST | `/api/v1/attendance/sync/tms` | Yes | `SUPER_ADMIN`, `ADMIN` | `src/modules/attendance/attendance.routes.js` | Body optional `date`; requires TMS env config. |
| GET | `/api/v1/attendance` | Yes | `SUPER_ADMIN`, `ADMIN`, `MANAGER` | `src/modules/attendance/attendance.routes.js` | Query: `userId`, `status`, `date`, `month`, `year`, pagination; returns records/meta. |
| GET | `/api/v1/attendance/summary` | Yes | `SUPER_ADMIN`, `ADMIN`, `MANAGER` | `src/modules/attendance/attendance.routes.js` | Query: `month`, `year`; returns status grouped counts. |
| GET | `/api/v1/attendance/user/:userId` | Yes | `SUPER_ADMIN`, `ADMIN`, `MANAGER` | `src/modules/attendance/attendance.routes.js` | Query same as `/my`; returns records/meta. |
| POST | `/api/v1/attendance/manual` | Yes | `SUPER_ADMIN`, `ADMIN` | `src/modules/attendance/attendance.routes.js` | Body: `userId`, `date`, `status`; optional `checkIn`, `checkOut`, `notes`. |
| PUT | `/api/v1/attendance/:id` | Yes | `SUPER_ADMIN`, `ADMIN` | `src/modules/attendance/attendance.routes.js` | Body: partial attendance update. |
| GET | `/api/v1/leave/my` | Yes | Authenticated | `src/modules/leave/leave.routes.js` | Query filters/pagination; returns leaves in `data`, `meta`. |
| GET | `/api/v1/leave/pending` | Yes | `SUPER_ADMIN`, `ADMIN`, `MANAGER` | `src/modules/leave/leave.routes.js` | Returns pending leaves; manager scoped. |
| GET | `/api/v1/leave` | Yes | Authenticated | `src/modules/leave/leave.routes.js` | Query: `status`, `leaveType`, `employeeId`, pagination; role scoped. |
| GET | `/api/v1/leave/:id` | Yes | Authenticated | `src/modules/leave/leave.routes.js` | Returns leave by id. |
| POST | `/api/v1/leave` | Yes | Authenticated | `src/modules/leave/leave.routes.js` | Body: `leaveType`, `startDate`, `endDate`, `reason`. |
| PUT | `/api/v1/leave/:id/approve` | Yes | `SUPER_ADMIN`, `ADMIN`, `MANAGER` | `src/modules/leave/leave.routes.js` | Body expected by controller: `note`. |
| PUT | `/api/v1/leave/:id/reject` | Yes | `SUPER_ADMIN`, `ADMIN`, `MANAGER` | `src/modules/leave/leave.routes.js` | Body expected by controller: `note`. |
| PUT | `/api/v1/leave/:id/cancel` | Yes | Authenticated | `src/modules/leave/leave.routes.js` | Employee can cancel own pending/approved leave. |
| GET | `/api/v1/leave/balances/me` | Yes | Authenticated | `src/modules/leave/leave.routes.js` | Returns balances with policy. |
| GET | `/api/v1/leave/balances/:userId` | Yes | `SUPER_ADMIN`, `ADMIN`, `MANAGER` | `src/modules/leave/leave.routes.js` | Returns balances with policy. |
| GET | `/api/v1/leave/policies/all` | Yes | Authenticated | `src/modules/leave/leave.routes.js` | Returns leave policy array. |
| POST | `/api/v1/leave/policies` | Yes | `SUPER_ADMIN`, `ADMIN` | `src/modules/leave/leave.routes.js` | Body passed to LeavePolicy create. |
| PUT | `/api/v1/leave/policies/:id` | Yes | `SUPER_ADMIN`, `ADMIN` | `src/modules/leave/leave.routes.js` | Body passed to LeavePolicy update. |
| GET | `/api/v1/notifications` | Yes | Authenticated | `src/modules/notifications/notification.routes.js` | Query: `isRead`, pagination; returns notifications/meta. |
| GET | `/api/v1/notifications/unread-count` | Yes | Authenticated | `src/modules/notifications/notification.routes.js` | Returns `{ count }` in `data`. |
| PUT | `/api/v1/notifications/read-all` | Yes | Authenticated | `src/modules/notifications/notification.routes.js` | No data payload. |
| PUT | `/api/v1/notifications/:id/read` | Yes | Authenticated | `src/modules/notifications/notification.routes.js` | No data payload. |
| DELETE | `/api/v1/notifications/:id` | Yes | Authenticated | `src/modules/notifications/notification.routes.js` | No data payload. |
| POST | `/api/v1/notifications/broadcast` | Yes | `SUPER_ADMIN`, `ADMIN` | `src/modules/notifications/notification.routes.js` | Body: `type`, `title`, `message`, optional `role`; returns `{ count }`. |
| GET | `/api/v1/analytics/dashboard` | Yes | `SUPER_ADMIN`, `ADMIN`, `MANAGER` | `src/modules/analytics/analytics.routes.js` | Returns KPI object. |
| GET | `/api/v1/analytics/attendance/trends` | Yes | `SUPER_ADMIN`, `ADMIN`, `MANAGER` | `src/modules/analytics/analytics.routes.js` | Query: `year`, `month`; returns date/status pivot array. |
| GET | `/api/v1/analytics/attendance/heatmap` | Yes | `SUPER_ADMIN`, `ADMIN`, `MANAGER` | `src/modules/analytics/analytics.routes.js` | Query: `userId`, `year`; returns attendance heatmap rows. |
| GET | `/api/v1/analytics/attendance/department` | Yes | `SUPER_ADMIN`, `ADMIN`, `MANAGER` | `src/modules/analytics/analytics.routes.js` | Query: `month`, `year`; returns department attendance rows. |
| GET | `/api/v1/analytics/leave/summary` | Yes | `SUPER_ADMIN`, `ADMIN`, `MANAGER` | `src/modules/analytics/analytics.routes.js` | Query: `year`; returns grouped status counts/sums. |
| GET | `/api/v1/analytics/leave/trends` | Yes | `SUPER_ADMIN`, `ADMIN`, `MANAGER` | `src/modules/analytics/analytics.routes.js` | Query: `year`; returns monthly approved leave totals. |
| GET | `/api/v1/analytics/leave/by-type` | Yes | `SUPER_ADMIN`, `ADMIN`, `MANAGER` | `src/modules/analytics/analytics.routes.js` | Query: `year`; returns grouped leave types. |
| GET | `/api/v1/analytics/workforce/headcount` | Yes | `SUPER_ADMIN`, `ADMIN`, `MANAGER` | `src/modules/analytics/analytics.routes.js` | Returns flattened role/isActive counts. |
| GET | `/api/v1/analytics/workforce/turnover` | Yes | `SUPER_ADMIN`, `ADMIN`, `MANAGER` | `src/modules/analytics/analytics.routes.js` | Query: `year`; returns turnover object. |
| GET | `/api/v1/analytics/powerbi/token` | Yes | `SUPER_ADMIN`, `ADMIN` | `src/modules/analytics/analytics.routes.js` | Requires Power BI env; returns embed token/workspace. |
| POST | `/api/v1/analytics/etl/run` | Yes | `SUPER_ADMIN`, `ADMIN` | `src/modules/analytics/analytics.routes.js` | Body: `month`, `year`; runs ETL orchestrator. |
| GET | `/api/v1/analytics/etl/logs` | Yes | `SUPER_ADMIN`, `ADMIN` | `src/modules/analytics/analytics.routes.js` | Returns latest 50 ETL sync logs. |
| GET | `/api/v1/analytics/audit/logs` | Yes | `SUPER_ADMIN`, `ADMIN` | `src/modules/analytics/analytics.routes.js` | Query: `limit`; returns organization-scoped audit logs with actor metadata. |
| GET | `/api/v1/reports` | Yes | Authenticated | `src/modules/reports/reports.routes.js` | Query: `type`, `month`, `year`, optional `organizationId` for `SUPER_ADMIN`; returns generated DB-derived reports. |
| POST | `/api/v1/reports/generate` | Yes | Authenticated | `src/modules/reports/reports.routes.js` | Body/query report type and filters; returns one DB-derived report. |
| GET | `/api/v1/reports/attendance` | Yes | Authenticated | `src/modules/reports/reports.routes.js` | Attendance report; admin org-scoped, manager team-scoped, employee self-scoped. |
| GET | `/api/v1/reports/leave` | Yes | Authenticated | `src/modules/reports/reports.routes.js` | Leave report; admin org-scoped, manager team-scoped, employee self-scoped. |
| GET | `/api/v1/reports/performance` | Yes | Authenticated | `src/modules/reports/reports.routes.js` | Performance report; admin org-scoped, manager team-scoped, employee self-scoped. |
| GET | `/api/v1/reports/department` | Yes | `SUPER_ADMIN`, `ADMIN`, `MANAGER` | `src/modules/reports/reports.routes.js` | Department/user count report; manager limited to own team. |
| GET | `/api/v1/reports/export/csv` | Yes | Authenticated | `src/modules/reports/reports.routes.js` | CSV export for attendance, leave, performance, and department reports. |
| GET | `/api/v1/settings/organization` | Yes | Authenticated | `src/modules/settings/settings.routes.js` | Returns safe organization settings from Organization plus durable `OrganizationSettings` data. |
| PUT | `/api/v1/settings/organization` | Yes | `SUPER_ADMIN`, `ADMIN` | `src/modules/settings/settings.routes.js` | Updates same-organization settings and writes an audit log. |
| GET | `/api/v1/performance/me` | Yes | Authenticated | `src/modules/performance/performance.routes.js` | Query: `year`; returns performance records. |
| GET | `/api/v1/performance/user/:userId` | Yes | `SUPER_ADMIN`, `ADMIN`, `MANAGER` | `src/modules/performance/performance.routes.js` | Query: `year`; returns performance records. |
| GET | `/api/v1/performance/team` | Yes | `SUPER_ADMIN`, `ADMIN`, `MANAGER` | `src/modules/performance/performance.routes.js` | Query: `month`, `year`; returns subordinate records. |
| GET | `/api/v1/performance/leaderboard` | Yes | `SUPER_ADMIN`, `ADMIN`, `MANAGER` | `src/modules/performance/performance.routes.js` | Query: `month`, `year`; returns top 20 records. |
| POST | `/api/v1/ai/chat` | Yes | Authenticated | `src/modules/ai/ai.routes.js` | Body: `message`; returns AI response object in `data`. |
| GET | `/api/v1/ai/predict/leave-forecast` | Yes | Authenticated | `src/modules/ai/ai.routes.js` | Query: `departmentId`; returns forecast object. |
| GET | `/api/v1/ai/predict/attendance-anomaly` | Yes | Authenticated | `src/modules/ai/ai.routes.js` | Query: `userId`; defaults to current user. |
| GET | `/api/v1/ai/predict/attrition-risk` | Yes | Authenticated | `src/modules/ai/ai.routes.js` | Returns attrition risk object. |
| POST | `/api/v1/ai/predict-performance` | Yes | Authenticated | `src/modules/ai/ai.routes.js` | Body optional `employeeId`; returns predicted score, risk, reasons, features, model version, and fallback flag. |

## 2. Frontend API Calls

| Method | Path Called | Source File | Caller Function/Page | Expected Response | Notes |
|---|---|---|---|---|---|
| POST | `/auth/refresh-token` | `frontend/lib/api.js` | `apiFetch` 401 retry | Backend wrapper with `data.accessToken`, `data.refreshToken` | Matched; retry is skipped for refresh calls to avoid loops. |
| POST | `/auth/register` | `frontend/lib/api.js` | `authAPI.register` | Wrapper with created user in `data` | Matched. |
| POST | `/billing/register` | `frontend/lib/api.js` | `authAPI.signup` org branch | Wrapper with `data.organization`, `data.licenseKey` | Matched. |
| POST | `/auth/register` | `frontend/lib/api.js` | `authAPI.signup` org owner creation | Wrapper with created user in `data` | Matched. |
| POST | `/auth/verify-otp` | `frontend/lib/api.js` | `authAPI.verifyOTP` | OTP verification response | No backend route. |
| POST | `/auth/login` | `frontend/lib/api.js`; `frontend/hooks/useAuth.js`; `frontend/contexts/AuthContext.jsx` | `authAPI.login`, `useAuth.login`, `AuthProvider.login` | Wrapper with `data.accessToken`, `data.refreshToken`, `data.user` | Matched; AuthProvider now extracts `response.data?.user`. |
| POST | `/auth/login` | `frontend/lib/api.js`; `frontend/hooks/useAuth.js`; `frontend/contexts/AuthContext.jsx` | `authAPI.superAdminLogin` | Wrapper with `data.user.role === "SUPER_ADMIN"` | Matched; uses normal login and clears tokens if role is not `SUPER_ADMIN`. |
| POST | `/auth/forgot-password` | `frontend/lib/api.js` | `authAPI.forgotPassword` | Success wrapper | Matched. |
| POST | `/auth/reset-password` | `frontend/lib/api.js`; `frontend/app/reset-password/page.jsx` | `authAPI.resetPassword` | Success wrapper | Matched; sends `{ token, newPassword }`. |
| POST | `/auth/change-password` | `frontend/lib/api.js`; settings pages | `authAPI.changePassword` | Success wrapper | Matched. |
| POST | `/auth/2fa/setup` | `frontend/lib/api.js`; settings pages | `authAPI.setup2FA` | Wrapper with `data.secret`, `data.qrCode` | Matched; secret is shown only during setup. |
| POST | `/auth/2fa/verify` | `frontend/lib/api.js`; settings pages | `authAPI.verify2FA` | Success wrapper | Matched; sends `{ token }` to enable 2FA. |
| POST | `/auth/2fa/disable` | `frontend/lib/api.js`; settings pages | `authAPI.disable2FA` | Success wrapper | Matched; sends `{ token }`. |
| POST | `/auth/2fa/validate` | `frontend/lib/api.js`; `frontend/app/verify-otp/page.jsx` | `authAPI.validate2FA` | Backend tokens plus fetched user profile | Matched; stores tokens only after validation, fetches `/users/me`, clears pending 2FA state. |
| POST | `/auth/logout` | `frontend/lib/api.js`; `frontend/hooks/useAuth.js`; `frontend/contexts/AuthContext.jsx` | `authAPI.logout` | Success wrapper, ignored on failure | Matched; sends refresh token when an auth token exists, then always clears local session. |
| POST | `/attendance/check-in` | `frontend/lib/api.js`; `frontend/hooks/useAttendance.js` | `attendanceAPI.checkIn`, `useAttendance.checkIn` | Attendance record | Matched; may 403 off office network. |
| POST | `/attendance/check-out` | `frontend/lib/api.js`; `frontend/hooks/useAttendance.js` | `attendanceAPI.checkOut`, `useAttendance.checkOut` | Attendance record | Matched. |
| POST | `/attendance/ping` | `frontend/lib/api.js`; `frontend/services/attendancePing.js` | `attendanceAPI.ping`, `attendancePing.ping` | `{ action, status?, ip? }` | Matched. |
| GET | `/attendance/today` | `frontend/lib/api.js`; `frontend/hooks/useAttendance.js` | `attendanceAPI.getToday`, `useAttendance.fetchTodayStatus` | Current attendance record/null | Matched. |
| GET | `/attendance/my?...` | `frontend/lib/api.js`; `frontend/hooks/useAttendance.js` | `attendanceAPI.getMy`, `useAttendance.fetchHistory` | Array of attendance records | Matched; backend sends pagination in `meta`, helper discards it. |
| GET | `/attendance?...` | `frontend/lib/api.js`; admin/manager attendance pages | `attendanceAPI.getAll` | Array of attendance records | Matched; backend `meta` discarded. |
| GET | `/attendance/summary?...` | `frontend/lib/api.js` | `attendanceAPI.getSummary` | Status summary array | Matched. |
| POST | `/attendance/manual` | `frontend/lib/api.js` | `attendanceAPI.manualEntry` | Attendance record | Matched. |
| PUT | `/attendance/:attendanceId` | `frontend/lib/api.js` | `attendanceAPI.update` | Attendance record | Matched. |
| POST | `/attendance/sync/tms` | `frontend/lib/api.js` | `attendanceAPI.syncFromTMS` | `{ processed, errors, total }` | Matched; requires TMS env. |
| GET | `/attendance/holidays` | `frontend/lib/api.js` | `attendanceAPI.getHolidays` | Holiday array | Matched. |
| POST | `/attendance/holidays` | `frontend/lib/api.js` | `attendanceAPI.createHoliday` | Holiday object | Matched. |
| POST | `/leave` | `frontend/lib/api.js`; `frontend/hooks/useLeaves.js` | `leaveAPI.apply`, `useLeaves.createLeave` | Leave object | Matched. |
| GET | `/leave/my?...` | `frontend/lib/api.js`; `frontend/hooks/useLeaves.js` | `leaveAPI.getMy`, `useLeaves.fetchMyLeaves` | Leave array | Matched; `meta` discarded. |
| GET | `/leave/pending` | `frontend/lib/api.js`; admin leave page/hooks | `leaveAPI.getPending` | Pending leave array | Matched. |
| GET | `/leave?...` | `frontend/lib/api.js`; admin leave page/hooks | `leaveAPI.getAll` | Leave array | Matched; `meta` discarded. |
| GET | `/leave/:leaveId` | `frontend/lib/api.js` | `leaveAPI.getById` | Leave object | Matched. |
| PUT | `/leave/:leaveId/approve` | `frontend/lib/api.js`; admin leave page/hooks | `leaveAPI.approve` | Updated leave | Matched; sends body `{ note }`. |
| PUT | `/leave/:leaveId/reject` | `frontend/lib/api.js`; admin leave page/hooks | `leaveAPI.reject` | Updated leave | Matched; sends body `{ note }`. |
| PUT | `/leave/:leaveId/cancel` | `frontend/lib/api.js`; `frontend/hooks/useLeaves.js` | `leaveAPI.cancel` | Updated leave wrapper | Matched. |
| GET | `/leave/balances/me` | `frontend/lib/api.js` | `leaveAPI.getMyBalances` | Balance array | Matched. |
| GET | `/leave/balances/:userId` | `frontend/lib/api.js` | `leaveAPI.getUserBalances` | Balance array | Matched. |
| GET | `/leave/policies/all` | `frontend/lib/api.js` | `leaveAPI.getPolicies` | Policy array | Matched. |
| GET | `/users/me` | `frontend/lib/api.js`; manager/employee settings/team pages | `userAPI.getMe` | User object | Matched. |
| PUT | `/users/me` | `frontend/lib/api.js`; manager/employee settings pages | `userAPI.updateMe` | User object | Matched. |
| GET | `/users?...` | `frontend/lib/api.js`; users/departments/team/attendance pages/hooks | `userAPI.getAll` | User array | Matched; `meta` discarded. |
| GET | `/users/:userId` | `frontend/lib/api.js` | `userAPI.getById` | User object | Matched. |
| POST | `/users` | `frontend/lib/api.js`; `frontend/hooks/useUsers.js` | `userAPI.create`, `useUsers.createUser` | User object | Matched. |
| PUT | `/users/:userId` | `frontend/lib/api.js`; `frontend/hooks/useUsers.js` | `userAPI.update`, `useUsers.updateUser` | User object | Matched. |
| DELETE | `/users/:userId` | `frontend/lib/api.js`; `frontend/hooks/useUsers.js` | `userAPI.deactivate`, `useUsers.deleteUser` | Success wrapper | Matched; hook calls `userAPI.deactivate`. |
| GET | `/users/department/:deptId` | `frontend/lib/api.js` | `userAPI.getByDepartment` | User array | Matched. |
| GET | `/users/departments/all` | `frontend/lib/api.js`; admin users/departments pages | `departmentAPI.getAll` | Department array | Matched. |
| POST | `/users/departments` | `frontend/lib/api.js`; admin departments page | `departmentAPI.create` | Department object | Matched. |
| PUT | `/users/departments/:id` | `frontend/lib/api.js`; admin departments page | `departmentAPI.update` | Department object | Matched; same-org admin route. |
| DELETE | `/users/departments/:id` | `frontend/lib/api.js`; admin departments page | `departmentAPI.delete` | Success | Matched; blocked when active users are assigned. |
| GET | `/analytics/dashboard` | `frontend/lib/api.js`; admin analytics page | `analyticsAPI.getDashboard` | KPI object | Matched. |
| GET | `/analytics/attendance/trends?...` | `frontend/lib/api.js`; admin analytics/reports pages | `analyticsAPI.getAttendanceTrends` | Trend array | Matched. |
| GET | `/analytics/attendance/heatmap?...` | `frontend/lib/api.js` | `analyticsAPI.getAttendanceHeatmap` | Heatmap row array | Matched. |
| GET | `/analytics/attendance/department?...` | `frontend/lib/api.js`; admin analytics page | `analyticsAPI.getDepartmentAttendance` | Department row array | Matched. |
| GET | `/analytics/leave/summary?...` | `frontend/lib/api.js`; admin analytics page | `analyticsAPI.getLeaveSummary` | Grouped summary array | Matched. |
| GET | `/analytics/leave/trends?...` | `frontend/lib/api.js`; admin reports page | `analyticsAPI.getLeaveTrends` | Trend array | Matched. |
| GET | `/analytics/leave/by-type?...` | `frontend/lib/api.js`; admin analytics page | `analyticsAPI.getLeaveByType` | Grouped type array | Matched. |
| GET | `/analytics/workforce/headcount` | `frontend/lib/api.js`; admin analytics/reports pages | `analyticsAPI.getHeadcount` | Headcount object | Matched. |
| GET | `/analytics/workforce/turnover?...` | `frontend/lib/api.js`; admin reports page | `analyticsAPI.getTurnover` | Turnover object | Matched. |
| GET | `/analytics/audit/logs?...` | `frontend/lib/api.js`; admin logs page | `analyticsAPI.getAuditLogs` | Audit log array | Matched. |
| GET | `/analytics/powerbi/token` | `frontend/lib/api.js`; admin Power BI page | `analyticsAPI.getPowerBIToken` | Power BI embed config or setup error | Matched. |
| POST | `/reports/generate` | `frontend/lib/api.js`; admin reports page | `reportsAPI.generate` | Report object | Matched. |
| GET | `/reports?...` | `frontend/lib/api.js` | `reportsAPI.getAll` | Report array | Matched. |
| GET | `/reports/attendance?...` | `frontend/lib/api.js`; admin reports page | `reportsAPI.attendance` | Report object | Matched. |
| GET | `/reports/leave?...` | `frontend/lib/api.js`; admin reports page | `reportsAPI.leave` | Report object | Matched. |
| GET | `/reports/performance?...` | `frontend/lib/api.js`; admin reports page | `reportsAPI.performance` | Report object | Matched. |
| GET | `/reports/department?...` | `frontend/lib/api.js`; admin reports page | `reportsAPI.department` | Report object | Matched. |
| GET | `/billing/plans` | `frontend/lib/api.js` | `billingAPI.getPlans` | Plan array | Matched. |
| POST | `/billing/register` | `frontend/lib/api.js` | `billingAPI.registerOrganization` | Organization/license/trial | Matched. |
| POST | `/billing/subscribe` | `frontend/lib/api.js` | `billingAPI.subscribe` | Subscription/invoice | Matched. |
| POST | `/billing/upgrade` | `frontend/lib/api.js` | `billingAPI.upgrade` | Subscription/invoice | Matched. |
| GET | `/billing/:orgId/subscription` | `frontend/lib/api.js` | `billingAPI.getSubscription` | Subscription object | Matched. |
| GET | `/billing/:orgId/invoices` | `frontend/lib/api.js` | `billingAPI.getInvoices` | Invoice array | Matched. |
| GET | `/billing/:orgId/employee-limit` | `frontend/lib/api.js` | `billingAPI.checkEmployeeLimit` | Limit object | Matched. |
| POST | `/billing/:orgId/cancel` | `frontend/lib/api.js` | `billingAPI.cancelSubscription` | Cancel result | Matched. |
| POST | `/ai/chat` | `frontend/lib/api.js`; AI chat/forecast pages | `aiAPI.chat` | `{ message, ... }` | Matched. |
| GET | `/ai/predict/leave-forecast?...` | `frontend/lib/api.js`; admin forecast page | `aiAPI.leaveForecast` | Forecast object | Matched. |
| GET | `/ai/predict/attendance-anomaly?...` | `frontend/lib/api.js`; admin forecast page | `aiAPI.attendanceAnomaly` | Anomaly object | Matched. |
| GET | `/ai/predict/attrition-risk` | `frontend/lib/api.js`; admin forecast page | `aiAPI.attritionRisk` | Attrition object | Matched. |
| POST | `/ai/predict-performance` | `frontend/lib/api.js`; admin forecast page | `aiAPI.predictPerformance` | Performance prediction object | Matched. |
| GET | `/settings/organization` | `frontend/lib/api.js`; admin settings page | `organizationSettingsAPI.get` | Settings object | Matched. |
| PUT | `/settings/organization` | `frontend/lib/api.js`; admin settings page | `organizationSettingsAPI.update` | Settings object | Matched. |
| GET | `/notifications?...` | `frontend/lib/api.js` | `notificationsAPI.getAll` | Notification array | Matched; `meta` discarded. |
| GET | `/notifications/unread-count` | `frontend/lib/api.js` | `notificationsAPI.getUnreadCount` | `{ count }` | Matched. |
| PUT | `/notifications/:notificationId/read` | `frontend/lib/api.js` | `notificationsAPI.markAsRead` | Success wrapper | Matched. |
| PUT | `/notifications/read-all` | `frontend/lib/api.js` | `notificationsAPI.markAllAsRead` | Success wrapper | Matched. |
| DELETE | `/notifications/:notificationId` | `frontend/lib/api.js` | `notificationsAPI.delete` | Success wrapper | Matched. |
| POST | `/notifications/broadcast` | `frontend/lib/api.js` | `notificationsAPI.broadcast` | `{ count }` | Matched. |
| GET | `/performance/me?...` | `frontend/lib/api.js`; employee performance page | `performanceAPI.getMy` | Performance record array | Matched. |
| GET | `/performance/user/:userId?...` | `frontend/lib/api.js` | `performanceAPI.getUser` | Performance record array | Matched. |
| GET | `/performance/team?...` | `frontend/lib/api.js`; manager performance page | `performanceAPI.getTeam` | Team performance array | Matched. |
| GET | `/performance/leaderboard?...` | `frontend/lib/api.js`; manager performance page | `performanceAPI.getLeaderboard` | Leaderboard array | Matched. |
| POST | `/analytics/etl/run` | `frontend/lib/api.js`; admin ETL page | `etlAPI.runETL` | ETL result object | Matched. |
| GET | `/analytics/etl/logs` | `frontend/lib/api.js`; admin ETL page | `etlAPI.getLogs` | Log array | Matched. |
| GET | `/analytics/etl/logs` | `frontend/lib/api.js` | `etlAPI.getStatus` | Latest log object | Matched endpoint; derives first array item. |

## 3. Contract Match Matrix

| Frontend Call | Backend Endpoint | Status | Problem | Recommended Fix |
|---|---|---|---|---|
| `authAPI.register` POST `/auth/register` | POST `/api/v1/auth/register` | MATCHED | None | Keep. |
| `authAPI.signup` POST `/billing/register` | POST `/api/v1/billing/register` | MATCHED | None | Keep. |
| `authAPI.signup` owner POST `/auth/register` | POST `/api/v1/auth/register` | MATCHED | None | Keep. |
| `authAPI.verifyOTP` POST `/auth/verify-otp` | None | FRONTEND_ONLY | Backend has no OTP verification route. | Remove call or implement OTP/verification route. |
| `authAPI.login` POST `/auth/login` | POST `/api/v1/auth/login` | MATCHED | Helper matches backend wrapper. | Keep. |
| `AuthProvider.login` response handling | POST `/api/v1/auth/login` | MATCHED | Reads `response.data?.user` from backend wrapper. | Keep. |
| `authAPI.superAdminLogin` POST `/auth/login` | POST `/api/v1/auth/login` | MATCHED | Uses normal login route and validates `SUPER_ADMIN` role client-side. | Keep; consider server-side role-specific audit later if needed. |
| `authAPI.forgotPassword` POST `/auth/forgot-password` | POST `/api/v1/auth/forgot-password` | MATCHED | None | Keep. |
| `authAPI.resetPassword` POST `/auth/reset-password` | POST `/api/v1/auth/reset-password` | MATCHED | Frontend sends `token`, `newPassword`. | Keep token-based reset flow. |
| `authAPI.changePassword` POST `/auth/change-password` | POST `/api/v1/auth/change-password` | MATCHED | None | Keep. |
| `authAPI.setup2FA` POST `/auth/2fa/setup` | POST `/api/v1/auth/2fa/setup` | MATCHED | Returns `secret` and `qrCode` for settings setup UI. | Keep. |
| `authAPI.verify2FA` POST `/auth/2fa/verify` | POST `/api/v1/auth/2fa/verify` | MATCHED | Sends `{ token }` to activate 2FA. | Keep. |
| `authAPI.disable2FA` POST `/auth/2fa/disable` | POST `/api/v1/auth/2fa/disable` | MATCHED | Sends `{ token }` to disable 2FA. | Keep. |
| `authAPI.validate2FA` POST `/auth/2fa/validate` | POST `/api/v1/auth/2fa/validate` | MATCHED | Backend returns tokens only; frontend stores them after validation and fetches `/users/me` for the user object. | Keep. |
| `apiFetch` refresh POST `/auth/refresh-token` | POST `/api/v1/auth/refresh-token` | MATCHED | Reads `data.accessToken`/`data.refreshToken` with defensive fallbacks and skips recursive refresh. | Keep. |
| `attendanceAPI.*` attendance calls | Matching `/api/v1/attendance*` routes | MATCHED | Core attendance endpoints exist. | Preserve; optionally retain `meta` where needed. |
| `leaveAPI.apply/get*` | Matching `/api/v1/leave*` routes | MATCHED | Core leave endpoints exist. | Preserve; optionally retain `meta`. |
| `leaveAPI.approve` PUT `/leave/:id/approve` | PUT `/api/v1/leave/:id/approve` | MATCHED | Frontend sends `{ note }`. | Keep. |
| `leaveAPI.reject` PUT `/leave/:id/reject` | PUT `/api/v1/leave/:id/reject` | MATCHED | Frontend sends `{ note }`. | Keep. |
| `userAPI.getMe/updateMe/getAll/getById/create/update/deactivate/getByDepartment` | Matching `/api/v1/users*` routes | MATCHED | Helpers match routes. | Keep. |
| `useUsers.deleteUser` calls `userAPI.deactivate` | DELETE `/api/v1/users/:id` | MATCHED | Hook now calls the existing helper. | Keep. |
| `departmentAPI.getAll/create` | GET/POST `/api/v1/users/departments*` | MATCHED | None | Keep. |
| `departmentAPI.update` PUT `/users/departments/:id` | PUT `/api/v1/users/departments/:id` | MATCHED | Same-organization admin route with audit logging. | Keep. |
| `departmentAPI.delete` DELETE `/users/departments/:id` | DELETE `/api/v1/users/departments/:id` | MATCHED | Same-organization admin route blocks deletion with active users. | Keep. |
| `analyticsAPI.*` analytics calls except PowerBI | Matching `/api/v1/analytics*` routes | MATCHED | Frontend has no helper for PowerBI token. | Keep. |
| `reportsAPI.generate` POST `/reports/generate` | POST `/api/v1/reports/generate` | MATCHED | DB-derived report generation. | Keep. |
| `reportsAPI.getAll` GET `/reports` | GET `/api/v1/reports` | MATCHED | DB-derived report listing/generation endpoint. | Keep. |
| `billingAPI.*` billing calls | Matching `/api/v1/billing*` routes | MATCHED | Protected billing requires `SUPER_ADMIN`. | Keep. |
| `aiAPI.*` AI calls | Matching `/api/v1/ai*` routes | MATCHED | AI service has backend fallback. | Keep. |
| `organizationSettingsAPI.get` GET `/settings/organization` | GET `/api/v1/settings/organization` | MATCHED | Reads Organization plus durable `OrganizationSettings`. | Keep. |
| `organizationSettingsAPI.update` PUT `/settings/organization` | PUT `/api/v1/settings/organization` | MATCHED | Admin/SUPER_ADMIN update with audit logging. | Keep. |
| `notificationsAPI.*` notification calls | Matching `/api/v1/notifications*` routes | MATCHED | Core endpoints exist. | Keep. |
| `performanceAPI.*` performance calls | Matching `/api/v1/performance*` routes | MATCHED | Core endpoints exist. | Keep. |
| `etlAPI.runETL/getLogs/getStatus` | POST/GET `/api/v1/analytics/etl*` | MATCHED | `getStatus` reuses logs and takes first item. | Keep or add explicit status route later. |
| `authAPI.logout` POST `/auth/logout` | POST `/api/v1/auth/logout` | MATCHED | Attempts backend logout with refresh token and always clears local session. | Keep. |
| None | GET `/api/v1/attendance/user/:userId` | BACKEND_ONLY | Helper lacks user-specific attendance route. | Add helper if admin/manager detail pages need it. |
| None | POST `/api/v1/leave/policies` | BACKEND_ONLY | Policy creation backend exists, no active frontend helper. | Add leave policy admin UI/helper if required. |
| None | PUT `/api/v1/leave/policies/:id` | BACKEND_ONLY | Policy update backend exists, no active frontend helper. | Add leave policy admin UI/helper if required. |

## 4. Critical Runtime Risks

1. `authAPI.verifyOTP` calls `/auth/verify-otp`, which has no backend route and should remain unused unless an OTP backend is added.
2. Power BI frontend exists, but embedding requires real Power BI env vars and a loaded Power BI client library.
3. Organization settings now use durable `OrganizationSettings` storage; production databases with legacy sidecar data need explicit import/backfill before retiring old files.
4. Pagination `meta` is commonly discarded by helpers, which can limit admin table pagination.
5. Attendance check-in can still fail at runtime off the configured office network.
6. TMS sync can still fail at runtime if TMS environment variables are not configured.
7. Frontend logout ignores backend logout failures by design so local logout always completes.
8. 2FA validation depends on the follow-up `/users/me` request after tokens are issued; frontend rolls back local tokens if that profile fetch fails.

## 5. Proposal Feature Coverage

| Proposal Module | Backend Coverage | Frontend Coverage | Contract Status |
|---|---|---|---|
| Authentication | Register/login/refresh/logout/password reset/change and 2FA exist. | Register/login/forgot/reset/change helpers, 2FA challenge, and 2FA settings UI exist. | Core auth and 2FA contracts matched after Priority 5. |
| RBAC | `authenticate` and `authorize(...)` are applied across protected modules. | Sidebar/pages infer roles from stored user. | Core login user shape matched; route/page guards still rely on stored user. |
| JWT refresh | Backend route exists. | `apiFetch` retry exists. | Matched after Priority 4. |
| 2FA | Setup/verify/disable/validate backend routes exist. | Login challenge page and settings enable/disable flow exist. | Matched after Priority 5. |
| Attendance | Check-in/out/ping/today/history/admin/manual/sync/holidays exist. | Hooks/pages/services use core attendance APIs. | Mostly matched. |
| Leave | Requests, approvals, balances, policies exist. | Hooks/pages use requests/approval/balances/policies read. | Core contract matched after Priority 4. |
| Notifications | CRUD/read/broadcast backend exists. | Helpers exist. | Matched, but active UI usage appears limited. |
| Analytics | Dashboard, attendance, leave, workforce, ETL, PowerBI token exist. | Analytics/report pages use most analytics; no PowerBI helper. | Mostly matched; PowerBI backend-only. |
| Performance | Self/user/team/leaderboard backend exists. | Employee/manager pages use self/team/leaderboard. | Matched. |
| ETL | Analytics ETL run/log routes exist. | Admin ETL page/helper exists. | Matched. |
| AI | Chat, RAG fallback, leave forecast, anomaly, attrition, and performance prediction routes exist with deterministic fallback. | AI chat and forecast page use grounded responses, sources, fallback/model metadata, and prediction output. | Matched. |
| Power BI | Token route exists and returns embed config when env vars are present. | Admin Power BI page/helper fetch real config and show setup guidance when credentials/client library are missing. | Matched with RLS limitation documented. |
| Reports | DB-derived report routes exist for list/generate/attendance/leave/performance/department/CSV export. | `reportsAPI` helper and admin reports page use real report endpoints. | Matched. |
| Admin users/departments | Users/departments list/create/update/delete and users update/deactivate exist. | Users/departments pages and hooks exist. | Matched; department delete is blocked while active users are assigned. |

## 6. Recommended Fix Order

1. Decide whether `/auth/verify-otp` should be removed from helpers or backed by a real OTP endpoint.
2. Preserve pagination `meta` in list helpers where admin tables need server-side pagination.
3. Add typed settings columns later if policy JSON needs stricter database-level validation.

## Summary Counts

| Metric | Count |
|---|---:|
| Backend registered endpoints | 94 |
| Frontend API calls/helpers | 96 |
| MATCHED | 95 |
| FRONTEND_ONLY | 1 |
| BACKEND_ONLY | 3 |
| CONTRACT_MISMATCH | 0 |
| RESPONSE_SHAPE_MISMATCH | 0 |
| METHOD_MISMATCH | 0 |

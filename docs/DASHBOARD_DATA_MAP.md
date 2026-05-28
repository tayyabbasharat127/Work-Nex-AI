# Dashboard Data Map

Priority 11 replaces dashboard mock/static data with scoped backend APIs. No migration is required.

| Dashboard | Widget | API Source | Role Scope | Loading/Error/Empty State |
|---|---|---|---|---|
| Admin overview | Total employees, present, absent, attendance rate | `GET /api/v1/analytics/dashboard` | Organization-scoped admin data; explicit platform scope for `SUPER_ADMIN`. | Cards show loading markers, error banner on failure. |
| Admin overview | Late today | `GET /api/v1/attendance?date=<today>&status=LATE` | Organization-scoped by attendance service. | Card falls back to `0` only when no records are returned. |
| Admin overview | Monthly attendance trend | `GET /api/v1/analytics/attendance/trends` | Organization-scoped admin data. | Empty chart panel when no records exist. |
| Admin overview | Department attendance | `GET /api/v1/analytics/attendance/department` | Organization-scoped admin data. | Empty chart panel when no records exist. |
| Admin overview | Leave utilization | `GET /api/v1/analytics/leave/by-type` | Organization-scoped admin data. | Empty chart panel when no approved leave exists. |
| Admin overview | Notifications | `GET /api/v1/notifications` | Organization-scoped notification reads. | Empty panel when no notifications exist. |
| Admin overview | ETL status | `GET /api/v1/analytics/etl/logs` | `ADMIN`/`SUPER_ADMIN`, organization-scoped logs. | Shows no recent ETL run when absent. |
| Admin notifications | Notification list and read action | `GET /api/v1/notifications`, `PUT /api/v1/notifications/:id/read` | Organization-scoped notifications. | Loading, error, and empty rows. |
| Admin logs | Audit activity | `GET /api/v1/analytics/audit/logs` | `ADMIN`/`SUPER_ADMIN`, organization-scoped audit logs. | Loading, error, and empty rows. |
| Manager overview | Team KPI cards | `GET /api/v1/analytics/dashboard` | Manager-subordinate scope from RBAC helpers. | Cards show loading markers, error banner on failure. |
| Manager overview | Team members | `GET /api/v1/users` | Direct subordinate list only. | Empty panel when no direct reports exist. |
| Manager overview | Today team attendance | `GET /api/v1/attendance?date=<today>` | Direct subordinate attendance only. | Empty panel when no attendance exists today. |
| Manager overview | Pending team leaves | `GET /api/v1/leave/pending` | Direct subordinate leave only. | Empty panel when no pending requests exist. |
| Manager overview | Approve/reject leave | `PUT /api/v1/leave/:id/approve`, `PUT /api/v1/leave/:id/reject` | Direct subordinate approval only. | Reloads dashboard after action; backend returns `403` for non-subordinates. |
| Manager overview | Team attendance trend | `GET /api/v1/analytics/attendance/trends` | Direct subordinate attendance only. | Empty chart panel when no records exist. |
| Manager overview | Team performance | `GET /api/v1/performance/team` | Direct subordinate performance only. | Empty chart panel when no records exist. |
| Manager overview | Notifications | `GET /api/v1/notifications` | Same-organization user notifications. | Empty panel when no notifications exist. |
| Employee overview | Profile | `GET /api/v1/users/me` | Authenticated self. | Stored user is used only until the API response arrives. |
| Employee overview | Today attendance/check-in/check-out | `GET /api/v1/attendance/today`, `POST /api/v1/attendance/check-in`, `POST /api/v1/attendance/check-out` | Authenticated self. | Error banner for rejected actions; disabled controls for completed check-in. |
| Employee overview | Attendance history and work hours | `GET /api/v1/attendance/my` | Authenticated self. | Empty chart panel when no history exists. |
| Employee overview | Leave balance | `GET /api/v1/leave/balances/me` | Authenticated self. | Empty chart panel when no balances exist. |
| Employee overview | Recent leave requests | `GET /api/v1/leave/my` | Authenticated self. | Recent activity omits leave rows when none exist. |
| Employee overview | Performance snapshot | `GET /api/v1/performance/me` | Authenticated self. | Empty panel when no performance record exists. |
| Employee overview | Notifications | `GET /api/v1/notifications` | Authenticated user's notifications. | Empty panel when no notifications exist. |
| Employee analytics | Work hours, attendance trend, attendance rate | `GET /api/v1/attendance/my` | Authenticated self. | Empty chart panel when no attendance history exists. |
| Employee analytics | Leave distribution | `GET /api/v1/leave/balances/me` | Authenticated self. | Empty chart panel when no leave balances exist. |
| Employee analytics | Performance trend | `GET /api/v1/performance/me` | Authenticated self. | Empty chart panel when no performance records exist. |

Notes:

- Frontend charts render only when the corresponding data array is non-empty.
- Empty states are intentionally neutral and do not fabricate values.
- Manager dashboard data relies on existing backend RBAC helpers, so arbitrary `userId` expansion is not introduced.

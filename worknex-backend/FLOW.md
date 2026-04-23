# WorkNex AI — System Flow Documentation

---

## 1. Authentication & Identity (IAG)

### Registration Flow
```
Client POST /api/v1/auth/register
  → validate input (email, password, employeeId, role)
  → check duplicate email + employeeId in DB
  → bcrypt hash password (salt rounds: 12)
  → prisma.user.create()
  → return user object (no token yet — admin registers users)
```

### Login Flow
```
Client POST /api/v1/auth/login { email, password }
  → find user by email
  → check isActive flag
  → bcrypt.compare(password, passwordHash)
  → if twoFAEnabled === true
      → return { requires2FA: true, userId }   ← client redirects to 2FA screen
  → else
      → generate accessToken (JWT, 7d) + refreshToken (JWT, 30d)
      → store refreshToken in RefreshToken table with expiry
      → return { accessToken, refreshToken, user }
```

### 2FA Flow
```
Setup:
  POST /api/v1/auth/2fa/setup  (authenticated)
    → generate TOTP secret via otplib
    → store secret in user.twoFASecret
    → return { secret, qrCode (base64 PNG) }
    → user scans QR in Google Authenticator / Authy

Verify & Enable:
  POST /api/v1/auth/2fa/verify { token }
    → authenticator.verify(token, secret)
    → set user.twoFAEnabled = true

Login with 2FA:
  POST /api/v1/auth/2fa/validate { userId, token }
    → verify TOTP token
    → issue accessToken + refreshToken
    → return tokens (same as normal login)
```

### Token Refresh Flow
```
Client POST /api/v1/auth/refresh-token { refreshToken }
  → find token in RefreshToken table
  → check expiry
  → jwt.verify(token, REFRESH_SECRET)
  → generate new accessToken + refreshToken
  → update RefreshToken record in DB (rotation)
  → return new tokens
```

### Password Reset Flow
```
POST /api/v1/auth/forgot-password { email }
  → find user silently (no error if not found — security)
  → generate UUID reset token
  → store token + expiry in user.twoFASecret field (temp)
  → send email via Nodemailer with reset link
  → link: FRONTEND_URL/reset-password?token=<uuid>

POST /api/v1/auth/reset-password { token, newPassword }
  → scan users with twoFASecret starting with "reset:"
  → match token + check expiry timestamp
  → bcrypt hash new password
  → update passwordHash, clear twoFASecret
```

### RBAC (Role-Based Access Control)
```
Every protected route:
  → authenticate middleware
      → extract Bearer token from Authorization header
      → jwt.verify(token, JWT_SECRET)
      → prisma.user.findUnique() — attach to req.user
  → authorize(...roles) middleware
      → check req.user.role is in allowed roles array
      → 403 if not

Role hierarchy:
  SUPER_ADMIN → full access to everything
  ADMIN       → manage users, attendance, leave, analytics
  MANAGER     → view/approve team leaves, view team analytics
  EMPLOYEE    → own attendance, own leaves, own notifications
```

---

## 2. User Management

### Create User Flow (Admin)
```
POST /api/v1/users  (ADMIN/SUPER_ADMIN only)
  → validate fields
  → generate random temp password
  → bcrypt hash temp password
  → prisma.user.create() with departmentId, managerId, role
  → AuditLog entry created (via audit middleware)
  → return user + tempPassword
  → (TODO: send welcome email with temp password)
```

### Hierarchy Structure
```
SUPER_ADMIN
    └── ADMIN
         └── MANAGER (managerId → ADMIN or SUPER_ADMIN)
              └── EMPLOYEE (managerId → MANAGER)

Leave approvals route up the managerId chain.
Manager can only see their direct subordinates.
```

---

## 3. Attendance Intelligence & Sync Engine (AISE)

### Employee Check-In Flow
```
POST /api/v1/attendance/check-in { latitude?, longitude? }
  → authenticate
  → get today's date (midnight normalized)
  → check for existing attendance record
  → if already checked in → 409 error
  → determine status:
      checkIn time > 09:30 AM → status = LATE
      else                    → status = PRESENT
  → upsert Attendance record with checkIn timestamp
  → store GPS coordinates if provided
  → return attendance record
```

### Employee Check-Out Flow
```
POST /api/v1/attendance/check-out
  → find today's attendance record
  → if no checkIn → 400 error
  → if already checked out → 409 error
  → calculate workingHours = (checkOut - checkIn) / 3600000
  → if workingHours < 4 → status = HALF_DAY
  → update record with checkOut + workingHours
```

### TMS Sync Flow (External System Integration)
```
POST /api/v1/attendance/sync/tms { date? }  (ADMIN only)
  OR triggered automatically by cron every hour (7AM–8PM, Mon–Sat)

  → create EtlSyncLog record (status: RUNNING)
  → GET request to TMS_API_URL/attendance?date=YYYY-MM-DD
      headers: { x-api-key: TMS_API_KEY }
  → for each record in response:
      → find user by employeeId
      → upsert Attendance (userId + date as unique key)
      → source = "TMS_SYNC"
  → update EtlSyncLog (SUCCESS / PARTIAL / FAILED)
  → return { processed, errors, total }
```

### Auto Absent Marking (Cron — 11:59 PM daily)
```
  → get all active EMPLOYEE users
  → check if today is a holiday → skip if yes
  → for each employee with no attendance record today:
      → check if on approved leave (LeaveRequest overlap)
      → create Attendance { status: ON_LEAVE or ABSENT }
```

---

## 4. Leave Management Engine

### Apply Leave Flow
```
POST /api/v1/leave { leaveType, startDate, endDate, reason }
  → validate dates (endDate >= startDate)
  → countBusinessDays(start, end) — excludes weekends
  → if 0 business days → 400 error
  → check LeaveBalance for this leaveType + year
      → if remainingDays < totalDays → 400 insufficient balance
  → check for overlapping PENDING/APPROVED leaves
      → if overlap exists → 409 error
  → find approverId from employee.managerId
  → prisma.leaveRequest.create()
  → create Notification for approver: "New Leave Request"
  → return leave request
```

### Approve Leave Flow
```
PUT /api/v1/leave/:id/approve { note? }  (MANAGER/ADMIN)
  → find leave request, check status === PENDING
  → prisma.$transaction():
      → update LeaveRequest { status: APPROVED, approverId, reviewedAt }
      → find LeavePolicy for leaveType
      → LeaveBalance.update { usedDays += totalDays, remainingDays -= totalDays }
  → create Notification for employee: "Leave Approved"
  → AuditLog entry
```

### Reject Leave Flow
```
PUT /api/v1/leave/:id/reject { note }  (MANAGER/ADMIN)
  → find leave, check PENDING
  → update LeaveRequest { status: REJECTED, approverNote }
  → NO balance deduction
  → create Notification for employee: "Leave Rejected — reason"
```

### Cancel Leave Flow
```
PUT /api/v1/leave/:id/cancel  (Employee — own leaves only)
  → verify employeeId === req.user.id
  → check status is PENDING or APPROVED
  → prisma.$transaction():
      → update status → CANCELLED
      → if was APPROVED: restore balance
          LeaveBalance { usedDays -= totalDays, remainingDays += totalDays }
```

### Annual Balance Reset (Cron — Jan 1st midnight)
```
  → for each active user × each LeavePolicy:
      → fetch previous year's LeaveBalance
      → if policy.carryForward:
          carryDays = min(prevBalance.remainingDays, policy.maxCarryForward)
      → upsert LeaveBalance for new year:
          totalDays = policy.totalDays + carryDays
          usedDays = 0
          remainingDays = totalDays
```

---

## 5. Notification & Communication Module

### Notification Creation (Internal)
```
notificationService.create(userId, type, title, message, metadata?)
  → prisma.notification.create()
  → called internally by leave, attendance, and broadcast flows
  → types: LEAVE_APPLIED | LEAVE_APPROVED | LEAVE_REJECTED |
           ATTENDANCE_ALERT | SYSTEM | REMINDER
```

### Broadcast Flow (Admin)
```
POST /api/v1/notifications/broadcast { type, title, message, role? }
  → fetch all active users (filtered by role if provided)
  → prisma.notification.createMany() — bulk insert
  → return { count: N }
```

### Client Polling Flow
```
GET /api/v1/notifications?isRead=false
  → paginated list of user's notifications
  → ordered by createdAt DESC

GET /api/v1/notifications/unread-count
  → returns { count: N }  ← used for badge in UI

PUT /api/v1/notifications/:id/read
PUT /api/v1/notifications/read-all
```

---

## 6. Analytics & ETL Pipeline

### Dashboard KPIs Flow
```
GET /api/v1/analytics/dashboard
  → parallel queries (Promise.all):
      → count active employees
      → count today's PRESENT/LATE attendance
      → count PENDING leave requests
      → count today's ABSENT
  → compute attendanceRate = (activeToday / totalEmployees) * 100
  → return KPI object
```

### ETL Performance Computation Flow
```
POST /api/v1/analytics/etl/run { month?, year? }
  OR triggered by cron at 2:00 AM daily

  → for each active user:
      → fetch all Attendance records for month/year
      → compute:
          presentDays   = PRESENT + LATE count
          absentDays    = ABSENT count
          lateDays      = LATE count
          leaveDays     = ON_LEAVE count
          avgWorkingHours = sum(workingHours) / records.length
          attendanceScore = (presentDays / workingDays) * 100
          leaveScore      = 100 - (leaveDays / workingDays) * 100
          overallScore    = (attendanceScore + leaveScore) / 2
      → upsert PerformanceRecord (userId + month + year unique)
  → return { processed, month, year }
```

### Power BI Embed Token Flow
```
GET /api/v1/analytics/powerbi/token  (ADMIN only)
  → POST to Azure AD token endpoint:
      grant_type: client_credentials
      client_id: POWERBI_CLIENT_ID
      client_secret: POWERBI_CLIENT_SECRET
      scope: https://analysis.windows.net/powerbi/api/.default
  → return { accessToken, workspaceId }
  → frontend uses token to embed Power BI reports with RLS
```

### Attendance Heatmap Flow
```
GET /api/v1/analytics/attendance/heatmap?userId=&year=
  → fetch all Attendance records for user in that year
  → return [ { date, status, workingHours } ]
  → frontend renders calendar heatmap (e.g. GitHub-style)
```

---

## 7. Performance & Productivity Analytics

### Performance Score Flow
```
Scores are pre-computed by ETL (see above).
Reads come directly from PerformanceRecord table.

GET /api/v1/performance/me?year=
  → return 12 monthly records for logged-in user

GET /api/v1/performance/leaderboard?month=&year=
  → top 20 employees by overallScore DESC
  → includes user name, department, scores

GET /api/v1/performance/team?month=&year=  (MANAGER)
  → fetch all users where managerId = req.user.id
  → return their PerformanceRecords for that period
```

---

## 8. AI & Agentic Chatbot

### Chat Flow (LangChain Proxy)
```
POST /api/v1/ai/chat { message }
  → authenticate user
  → fetch user context (name, role, departmentId)
  → POST to Python FastAPI service (AI_SERVICE_URL/chat):
      { userId, userContext, message }
  → Python service:
      → LangChain agent with tools:
          - query_leave_balance(userId)
          - query_attendance(userId, date)
          - query_pending_approvals(managerId)
          - get_team_summary(managerId)
      → RAG over policy documents (Vector DB)
      → return natural language response
  → proxy response back to client
  → if AI service down → 503 with friendly message
```

### Predictive Analytics Flow
```
GET /api/v1/ai/predict/leave-forecast?departmentId=
  → forward to Python service
  → Python: Scikit-learn time-series model on historical LeaveRequest data
  → return { forecast: [ { date, expectedLeaves } ] }
  → fallback: return historical average from DB if service down

GET /api/v1/ai/predict/attendance-anomaly?userId=
  → Python: detect unusual patterns (e.g. sudden spike in absences)
  → return { anomalies: [ { date, reason, severity } ] }

GET /api/v1/ai/predict/attrition-risk
  → Python: score each employee based on attendance + leave patterns
  → return { risks: [ { userId, riskScore, factors } ] }
```

---

## 9. Audit Logging

### How Audit Logs Work
```
auditLog(entity, action) middleware is attached to mutating routes.

On response finish (status 2xx):
  → prisma.auditLog.create({
      userId:    req.user.id,
      action:    CREATE | UPDATE | DELETE | APPROVE | REJECT,
      entity:    "User" | "LeaveRequest" | etc.,
      entityId:  req.params.id or res.locals.entityId,
      newValues: res.locals.auditData (optional),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    })

Non-blocking — audit failure never breaks the main request.
All logs stored in AuditLog table, queryable by admin.
```

---

## 10. Request Lifecycle (Every API Call)

```
Incoming Request
    │
    ▼
helmet()          — security headers
cors()            — whitelist FRONTEND_URL
compression()     — gzip responses
morgan()          — HTTP request logging → winston
rateLimit()       — 200 req/15min global, 20 req/15min on auth routes
    │
    ▼
Router /api/v1/*
    │
    ▼
authenticate()    — verify JWT, attach req.user
    │
    ▼
authorize()       — check role (if route requires it)
    │
    ▼
validate()        — express-validator rules
    │
    ▼
auditLog()        — register post-response audit hook (if mutating)
    │
    ▼
Controller        — thin layer, calls service
    │
    ▼
Service           — all business logic, Prisma queries
    │
    ▼
apiResponse()     — standardized JSON: { success, message, data, meta }
    │
    ▼
errorHandler()    — catches all thrown ApiError or Prisma errors
                  — maps to correct HTTP status + message
```

---

## 11. Scheduled Jobs Summary

| Job | Schedule | What it does |
|-----|----------|--------------|
| Nightly ETL | 2:00 AM daily | Compute PerformanceRecords for all employees |
| TMS Sync | Every hour, 7AM–8PM Mon–Sat | Pull attendance from external TMS API |
| Absent Marking | 11:59 PM daily (Mon–Sat) | Auto-mark employees with no record as ABSENT/ON_LEAVE |
| Leave Balance Reset | Jan 1st midnight | Reset all balances for new year with carry-forward |

---

## 12. Database Unique Constraints & Key Relations

```
Attendance    → unique(userId, date)           — one record per employee per day
LeaveBalance  → unique(userId, policyId, year) — one balance per type per year
PerformanceRecord → unique(userId, month, year)
RefreshToken  → unique(token)                  — rotated on every refresh

User → Department (many-to-one)
User → User (self-referential: manager → subordinates)
LeaveRequest → User (employee) + User (approver)
LeaveBalance → User + LeavePolicy
Attendance   → User
Notification → User
AuditLog     → User (nullable — system actions have no user)
```

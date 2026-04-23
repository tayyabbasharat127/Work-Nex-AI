# WorkNex AI — QA Testing Checklist

## How to Start QA Environment

### Windows (Double-click)
```
START_QA.bat
```

### Manual Start
```bash
# Terminal 1 — Backend
cd worknex-backend
node src/app.js

# Terminal 2 — Frontend
cd frontend
npm start
```

## URLs
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api/v1
- AI Service: http://localhost:8000 (optional)

## Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@worknex.com | admin123 |
| Manager | manager1@worknex.com | manager123 |
| Employee | employee1@worknex.com | employee123 |

---

## QA Test Cases

### AUTH MODULE
- [ ] Login with valid credentials → redirects to correct dashboard
- [ ] Login with wrong password → shows error
- [ ] Forgot password → OTP sent to email
- [ ] Reset password with OTP → success
- [ ] Logout → clears session, redirects to login
- [ ] JWT token expiry → auto-refresh or redirect to login

### ADMIN DASHBOARD
- [ ] Dashboard loads with correct KPIs (total employees, present today, pending leaves)
- [ ] All sidebar links navigate correctly
- [ ] No broken pages or 404s

### USER MANAGEMENT
- [ ] List all users with pagination
- [ ] Create new user (all fields)
- [ ] Edit existing user
- [ ] Deactivate user
- [ ] Search/filter users by name, role, department

### DEPARTMENT MANAGEMENT
- [ ] List departments with employee count
- [ ] Create new department
- [ ] Edit department name/description
- [ ] Delete department

### ATTENDANCE (Admin)
- [ ] View all attendance records
- [ ] Filter by date range
- [ ] Manual attendance entry
- [ ] Export attendance data

### ATTENDANCE (Employee)
- [ ] Check In button works
- [ ] Check Out button appears after check-in
- [ ] Today's status shows correct time
- [ ] Attendance history shows last 30 days

### LEAVE MANAGEMENT (Admin)
- [ ] View all leave requests
- [ ] Filter by status (Pending/Approved/Rejected)
- [ ] Approve leave → status changes to APPROVED
- [ ] Reject leave → status changes to REJECTED
- [ ] Employee names show correctly (not "Unknown")
- [ ] Duration shows correctly (not "N/A")

### LEAVE MANAGEMENT (Employee)
- [ ] Apply for leave with all fields
- [ ] Leave appears in list after submission
- [ ] Cancel pending leave
- [ ] Leave balance shows correctly

### LEAVE MANAGEMENT (Manager)
- [ ] View team's pending leaves
- [ ] Approve/Reject with buttons visible
- [ ] Employee names show correctly

### ANALYTICS
- [ ] Dashboard KPIs load (Total Employees, Present Today, etc.)
- [ ] Attendance Trends chart shows data
- [ ] Department Attendance Rate chart shows data
- [ ] Leave Distribution pie chart shows data
- [ ] Leave Summary bar chart shows data

### REPORTS
- [ ] Attendance tab shows chart + table
- [ ] Leave tab shows chart + table with month names
- [ ] Workforce tab shows headcount and turnover
- [ ] Export CSV works for each tab

### FORECASTS / AI
- [ ] Leave forecast chart loads
- [ ] Attrition risk list shows
- [ ] AI chat responds to messages
- [ ] Chat handles: "hello", "leave balance", "attendance", "performance"

### ETL PIPELINE
- [ ] ETL page loads with execution history
- [ ] Run ETL for current month → success
- [ ] ETL logs show in table
- [ ] After ETL: Performance page shows data
- [ ] After ETL: Analytics charts populate

### PERFORMANCE
- [ ] Employee performance page shows monthly records
- [ ] Manager performance page shows team scores
- [ ] Leaderboard shows top performers
- [ ] Charts render correctly

### NOTIFICATIONS
- [ ] Notifications page loads
- [ ] Mark as read works
- [ ] Unread count updates

---

## Known Issues / Notes

1. AI Service (Python) is optional — all features work without it
2. ETL must be run manually after seeding test data
3. WiFi verification is disabled by default (WIFI_VERIFICATION_ENABLED=false)
4. Attendance check-in requires backend to be running

## Seed Test Data

```bash
cd worknex-backend
node scripts/seed-test-data.js
node -e "require('./src/modules/etl/etl.orchestrator').runAll(4, 2026).then(r => console.log('ETL:', r.status))"
```

## Build Info
- Frontend: Next.js 16 (Production build in frontend/.next/)
- Backend: Node.js + Express (No build needed)
- Database: PostgreSQL + Prisma ORM

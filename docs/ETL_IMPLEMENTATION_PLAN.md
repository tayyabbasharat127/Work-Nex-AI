# ETL Pipeline Implementation Plan
# WorkNex AI - Enterprise Data Pipeline & Analytics

## CURRENT STATE ANALYSIS

### ✅ What Already Exists in Backend
1. **ETL Infrastructure**
   - `EtlSyncLog` model in Prisma schema (tracks ETL runs)
   - `PerformanceRecord` model (stores computed monthly metrics)
   - ETL logger utility (`worknex-backend/src/modules/etl/etl.logger.js`)
   - ETL endpoints in analytics module:
     - `POST /api/v1/analytics/etl/run` - Manual ETL trigger
     - `GET /api/v1/analytics/etl/logs` - View ETL execution history

2. **ETL Logic in Analytics Service**
   - `runETL(month, year)` - Computes monthly performance records
   - Calculates: presentDays, absentDays, lateDays, leaveDays, avgWorkingHours
   - Computes scores: attendanceScore, leaveScore, overallScore
   - Stores in `PerformanceRecord` table

3. **TMS Sync in Attendance Service**
   - `syncFromTMS(date)` - Syncs attendance from external TMS
   - Logs sync operations in `EtlSyncLog`

### ❌ What's Missing

1. **Scheduled ETL Jobs** - No cron scheduler for nightly runs
2. **Separate ETL Job Files** - Empty `attendance.etl.js`, no leave/performance ETL jobs
3. **Historical Data Backfill** - No script to compute past months
4. **ETL Dashboard UI** - Frontend has no ETL management page
5. **Power BI Integration** - Token endpoint exists but no dashboard setup
6. **Data Quality Checks** - No validation/anomaly detection in ETL
7. **ETL Notifications** - No alerts on ETL failures

---

## EXECUTION PLAN (7 PHASES)

### PHASE 1: Complete ETL Job Structure ⏱️ 30 mins
**Goal:** Organize ETL jobs into modular, reusable components

**Tasks:**
1. Create `worknex-backend/src/modules/etl/jobs/attendance.etl.js`
   - Extract attendance data aggregation logic
   - Calculate daily/weekly/monthly attendance metrics
   - Store in intermediate analytics tables (if needed)

2. Create `worknex-backend/src/modules/etl/jobs/leave.etl.js`
   - Aggregate leave data by type, department, month
   - Calculate leave utilization rates
   - Update leave balance summaries

3. Create `worknex-backend/src/modules/etl/jobs/performance.etl.js`
   - Move performance calculation logic from analytics.service
   - Compute employee performance scores
   - Generate team/department rankings

4. Create `worknex-backend/src/modules/etl/etl.orchestrator.js`
   - Master ETL runner that calls all jobs in sequence
   - Handles job dependencies (attendance → performance)
   - Manages transaction rollback on failures

**Files to Create:**
- `worknex-backend/src/modules/etl/jobs/attendance.etl.js`
- `worknex-backend/src/modules/etl/jobs/leave.etl.js`
- `worknex-backend/src/modules/etl/jobs/performance.etl.js`
- `worknex-backend/src/modules/etl/etl.orchestrator.js`

---

### PHASE 2: Scheduled ETL Execution ⏱️ 20 mins
**Goal:** Automate nightly ETL runs using node-cron

**Tasks:**
1. Create `worknex-backend/src/modules/etl/etl.scheduler.js`
   - Schedule nightly ETL at 2:00 AM
   - Run monthly ETL on 1st of each month
   - Add manual trigger support

2. Update `worknex-backend/src/server.js`
   - Initialize ETL scheduler on server start
   - Add graceful shutdown for running ETL jobs

3. Add environment variables
   - `ETL_ENABLED=true` - Enable/disable scheduled ETL
   - `ETL_CRON_SCHEDULE=0 2 * * *` - Cron expression
   - `ETL_TIMEZONE=Asia/Karachi` - Timezone for scheduling

**Files to Create/Update:**
- `worknex-backend/src/modules/etl/etl.scheduler.js` (new)
- `worknex-backend/src/server.js` (update)
- `worknex-backend/.env` (update)

---

### PHASE 3: Historical Data Backfill ⏱️ 15 mins
**Goal:** Compute performance records for past months

**Tasks:**
1. Create `worknex-backend/scripts/backfill-etl.js`
   - Accept date range parameters (start month/year, end month/year)
   - Run ETL for each month in range
   - Show progress and summary

2. Add validation
   - Check if data already exists (skip or overwrite option)
   - Validate date ranges
   - Handle missing attendance/leave data gracefully

**Files to Create:**
- `worknex-backend/scripts/backfill-etl.js`

**Usage:**
```bash
node scripts/backfill-etl.js --start 2024-01 --end 2025-04
```

---

### PHASE 4: ETL Management UI (Frontend) ⏱️ 45 mins
**Goal:** Build admin dashboard for ETL monitoring and control

**Tasks:**
1. Create `frontend/app/dashboard/admin/etl/page.jsx`
   - View ETL execution logs (last 50 runs)
   - Trigger manual ETL run (with month/year selection)
   - View ETL job status (running/success/failed)
   - Display metrics: records processed, duration, errors

2. Update `frontend/lib/api.js`
   - Add `runETL(month, year)` function
   - Add `getETLLogs()` function

3. Add UI components
   - ETL log table with filters (status, date range)
   - Manual trigger button with confirmation dialog
   - Real-time status indicator (if ETL is running)
   - Error details modal

**Files to Create/Update:**
- `frontend/app/dashboard/admin/etl/page.jsx` (already exists, needs implementation)
- `frontend/lib/api.js` (update)

---

### PHASE 5: Power BI Dashboard Setup ⏱️ 60 mins
**Goal:** Connect Power BI to PostgreSQL and create dashboards

**Tasks:**
1. **Database Views for Power BI**
   - Create `worknex-backend/prisma/migrations/create_powerbi_views.sql`
   - Views: `vw_attendance_analytics`, `vw_leave_analytics`, `vw_performance_analytics`
   - Denormalized views with all necessary joins

2. **Power BI Desktop Setup**
   - Install Power BI Desktop (user's machine)
   - Connect to PostgreSQL database
   - Import views created above

3. **Create Dashboards**
   - **Attendance Dashboard**: Heatmap, trends, department comparison
   - **Leave Dashboard**: Leave types, utilization, pending requests
   - **Performance Dashboard**: Leaderboard, team scores, individual trends
   - **Executive Dashboard**: KPIs, headcount, turnover rate

4. **Publish to Power BI Service**
   - Publish dashboards to Power BI workspace
   - Configure scheduled refresh (daily at 3:00 AM after ETL)
   - Set up row-level security (RLS) for department filtering

5. **Embed in Frontend (Optional)**
   - Use Power BI Embedded API
   - Display dashboards in iframe with SSO token
   - Endpoint already exists: `GET /api/v1/analytics/powerbi/token`

**Files to Create:**
- `worknex-backend/prisma/migrations/create_powerbi_views.sql`
- `POWER_BI_SETUP_GUIDE.md` (documentation)

---

### PHASE 6: Data Quality & Monitoring ⏱️ 30 mins
**Goal:** Add validation and anomaly detection to ETL pipeline

**Tasks:**
1. Create `worknex-backend/src/modules/etl/etl.validator.js`
   - Check for missing attendance records (gaps in dates)
   - Validate working hours (not negative, not > 24)
   - Detect duplicate records
   - Flag anomalies (sudden spike in absences)

2. Update ETL jobs to use validator
   - Run validation before transformation
   - Log validation errors
   - Send notifications on critical issues

3. Add ETL failure notifications
   - Email admin on ETL failure
   - In-app notification for data quality issues
   - Slack/Teams webhook (optional)

**Files to Create/Update:**
- `worknex-backend/src/modules/etl/etl.validator.js` (new)
- `worknex-backend/src/modules/etl/jobs/*.etl.js` (update)

---

### PHASE 7: Testing & Documentation ⏱️ 30 mins
**Goal:** Ensure ETL pipeline is production-ready

**Tasks:**
1. **Manual Testing**
   - Run ETL for current month
   - Run backfill for past 3 months
   - Verify data in `PerformanceRecord` table
   - Check ETL logs in database
   - Test manual trigger from frontend

2. **Edge Case Testing**
   - Run ETL with no attendance data
   - Run ETL for future month
   - Run ETL twice for same month (idempotency)
   - Test with inactive users

3. **Documentation**
   - Update `COMPLETE_GUIDE.md` with ETL section
   - Create `ETL_TROUBLESHOOTING.md`
   - Add inline code comments
   - Document Power BI setup steps

**Files to Create/Update:**
- `ETL_TROUBLESHOOTING.md` (new)
- `worknex-backend/COMPLETE_GUIDE.md` (update)

---

## TIMELINE SUMMARY

| Phase | Duration | Status |
|-------|----------|--------|
| Phase 1: ETL Job Structure | 30 mins | ✅ COMPLETE |
| Phase 2: Scheduled Execution | 20 mins | ✅ COMPLETE |
| Phase 3: Historical Backfill | 15 mins | ✅ COMPLETE |
| Phase 4: ETL Management UI | 45 mins | ✅ COMPLETE |
| Phase 5: Power BI Setup | 60 mins | 🔴 Not Started |
| Phase 6: Data Quality | 30 mins | 🔴 Not Started |
| Phase 7: Testing & Docs | 30 mins | 🔴 Not Started |
| **COMPLETED** | **1.8 hours** | **4/7 phases** |
| **TOTAL** | **3.5 hours** | |

---

## DEPENDENCIES

### External Tools Required
- Power BI Desktop (free download from Microsoft)
- Power BI Pro license (for publishing to service)
- PostgreSQL client (for running SQL migrations)

### Backend Dependencies (Already Installed)
- `node-cron` - Job scheduling
- `@prisma/client` - Database ORM
- `winston` - Logging

### Frontend Dependencies (Already Installed)
- `recharts` or `chart.js` - For ETL metrics visualization
- `react-query` or `swr` - For API state management

---

## NEXT STEPS

**User Decision Required:**
1. Do you want to start with Phase 1 (ETL Job Structure)?
2. Do you have Power BI Desktop installed? (for Phase 5)
3. Do you want Power BI embedded in frontend or just standalone dashboards?
4. What timezone should ETL run in? (default: Asia/Karachi)

**Recommended Order:**
1. Phase 1 → Phase 2 → Phase 3 (Backend ETL complete)
2. Phase 4 (Frontend UI for monitoring)
3. Phase 5 (Power BI dashboards)
4. Phase 6 → Phase 7 (Quality & Testing)

---

## NOTES

- ✅ Backend already has core ETL logic in `analytics.service.js`
- ✅ Database schema supports ETL (`PerformanceRecord`, `EtlSyncLog`)
- ❌ No scheduled jobs yet (manual trigger only)
- ❌ Frontend ETL page is empty placeholder
- ❌ Power BI dashboards not created yet

**This plan follows the FYP proposal requirements for:**
- Enterprise Data Pipeline & ETL
- Power BI Dashboard Visualization & DAX Analytics
- Scheduled nightly data processing
- Historical data backfill
- Real-time monitoring and alerts

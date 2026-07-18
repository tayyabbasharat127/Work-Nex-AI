# WorkNexAI Functional and Business-Logic Audit

**Date:** 2026-07-12  
**Scope:** Sidebar modules traced from Next.js page → frontend API client → Express route/controller/service → Prisma/AI/Power BI data.  
**Purpose:** Product capability review, not a security assessment.

## Executive view

WorkNexAI is a functioning HR attendance/leave application with real database-backed dashboards, tenant-aware CRUD, configurable roles, biometric ingestion, leave approvals, reporting, and notifications. It is not yet comparable to a full HRIS such as Workday, BambooHR, or Zoho People: core HR records, employment lifecycle, shifts/rosters, attendance regularization, accruals, genuine performance management, and defensible workforce forecasting are missing or simplified. The largest demo risk is that “Performance,” “Forecast,” “Attrition Risk,” and parts of “ETL” sound more mature than the underlying business logic.

## 1. Dashboard

**How it currently works:** The admin dashboard calls live analytics, attendance, notification, and ETL-status endpoints on each page load/refresh. It shows total active employees, present/absent/late today, attendance trends, department attendance, leave utilization, recent notifications, and last ETL state. Manager dashboards separately fetch accessible team users, team attendance, pending leaves, trends, team performance, and notifications; employees get their own profile, today/month attendance, balances, recent leave, performance, notifications, plus working check-in/check-out actions (`frontend/app/dashboard/{admin,manager,employee}/page.jsx`; `analytics.service.js:18-42`). There is no cache/materialized dashboard layer; values are current database queries, except performance/attrition values depend on the last ETL run.

**Industry-standard comparison: Partially matches.** Role-aware operational dashboards are real and useful, but there are no configurable widgets, saved dashboard layouts, exception queues, approvals inbox, data-as-of labels, trend comparisons, or drill-through governance typical of mature HRIS dashboards. Manager KPI fallbacks can also display organization KPI values when team arrays are empty, which can blur team versus org meaning.

**Automation opportunity:** Push role-specific exception cards automatically—missing punches, pending regularizations, expiring contracts, leave conflicts, failed devices, and overdue reviews—rather than requiring users to visit each module.

## 2. Analytics

**How it currently works:** Analytics are computed directly from `User`, `Attendance`, `LeaveRequest`, `Department`, `PerformanceRecord`, and `AttritionRecord`. Available measures include dashboard KPIs, daily attendance status trends, attendance heatmap, department attendance rate, leave status/type/month trends, active/inactive headcount, “turnover,” attrition distributions, and performance leaderboards (`analytics.routes.js`; `analytics.service.js:18-307,624-704`). The admin page visualizes a subset: KPIs, attendance trends, leave breakdowns, and department rates.

**Industry-standard comparison: Partially matches.** It provides real operational charts but is closer to a fixed dashboard pack than an analytics product. “Turnover” is inferred from users changed to inactive during the year rather than termination events/reasons and average headcount; there is no demographic, tenure, position, cost, cohort, hiring, span-of-control, or custom metric analysis. It overlaps Reports heavily: both query the same transactional data, with Analytics adding charts/aggregates and Reports adding tabular export.

**Automation opportunity:** Build a governed metric layer shared by dashboards, reports, and Power BI so attendance rate, headcount, turnover, and leave utilization have one definition and an explicit “as of” time.

## 3. Users

**How it currently works:** Admins can list/search/filter, create, view, update, and deactivate users; delete is soft deactivation, with a separate confirmation-gated HR-record purge endpoint. The form captures name, email, employee ID, password, custom role, department, designation, phone, joining date, manager, and active state; manager relationships are stored as `User.managerId` and used for manager team scoping and leave approvals (`users.routes.js`; `users.service.js`; `schema.prisma` model `User`). Creation initializes fixed leave balances and may email credentials.

**Industry-standard comparison: Below standard.** There is no CSV/bulk import, employee-number sequencing, position/job model, grade, campus/location, cost center, employment type, contract dates, probation, compensation, bank/tax data, emergency contacts, documents, custom fields, effective-dated changes, onboarding/offboarding workflow, or rehire/termination record. Employment type (full-time/contract/intern) does not exist and therefore cannot affect leave, attendance, benefits, or reporting. Manager hierarchy exists but is a single direct-manager link rather than position-based/effective-dated organizational structure.

**Automation opportunity:** Add validated CSV import with preview/error rows, and trigger onboarding tasks, default role/department policies, leave eligibility, and welcome communications from a proper employment record.

## 4. Roles

**How it currently works:** Roles are organization-owned database records with a fixed scope tier (`SUPER_ADMIN`, `ADMIN`, `MANAGER`, `EMPLOYEE`) and a configurable permission array. Organizations can create, rename, edit permissions, and delete unassigned non-system roles; API mutations use `requirePermission`, while data scope still derives from the fixed tier (`roles.service.js`; `constants/permissions.js`; `auth.middleware.js`). System roles are seeded per organization and protected from rename/delete.

**Industry-standard comparison: Partially matches.** This is genuine granular RBAC, not merely a frontend role label, and custom role names such as Dean/HOD are possible. However, every custom role must inherit one of four hardcoded data-scope behaviors, permissions are a code-defined catalog rather than resource/action/scope policies, and the sidebar itself is selected from the broad tier rather than dynamically from permissions. There is no delegated administration, field-level access, approval authority limits, or temporary role assignment.

**Automation opportunity:** Generate navigation and action availability from the permission catalog and add role templates for university personas such as HR Officer, Department Chair, Registrar, and Attendance Operator.

## 5. Attendance

**How it currently works:** ZKTeco/middleware pushes reach `/attendance/tms-webhook`, are device/HMAC/replay validated, mapped to an employee ID, and passed through a common processor that creates the first punch as check-in and the second as check-out in `Attendance`. The processor blocks punches on holidays/approved leave, computes status and hours, and the admin/manager/employee pages read those rows through scoped APIs. Admins can directly change a stored attendance status/note and create manual records; there is no employee-submitted regularization request with evidence and approval (`attendance.routes.js`; `providers/webhook.provider.js`; `attendance.processor.js`; admin attendance page).

**Industry-standard comparison: Below standard.** Real ingestion and manual correction exist, but shifts, rosters, grace rules, multiple punch pairing, breaks, overnight shifts, flexible schedules, overtime approval, missing-punch workflow, regularization history, and payroll lock periods do not. Critically, organization settings for timezone, work start/end, late threshold, and half-day hours are not consistently used by the processor: it still reads environment variables/defaults (`attendance.processor.js:35-100`). Overtime, shift validation, and attendance-event notification functions are explicit no-ops (`attendance.processor.js:140-157`).

**Automation opportunity:** Detect missing/odd punches after each device sync, open a regularization task to the employee/manager, and recompute status/overtime from effective-dated organization/shift rules after approval.

## 6. Biometric Integration

**How it currently works:** Admins can configure database, API, or ADMS integration settings; test database/API connectivity; maintain devices with serial, IP, location and HMAC secret; map vendor fields; view status/last-seen metadata; and inspect organization-scoped TMS sync logs (`biometric-integration/page.jsx`; `biometric.service.js`; `BiometricIntegration`, `BiometricDevice`, `EtlSyncLog`). Each webhook creates a sync log with input/output counts and a newline-combined error string for rejected records.

**Industry-standard comparison: Partially matches.** Configuration, credentials, devices, field mapping, connection tests, last-seen, and logs are substantial. Device “ONLINE” means a successful recent push set the flag; there is no heartbeat/offline threshold job, firmware/model metadata, command queue, clock drift, enrollment/user mapping dashboard, or device health telemetry. Failed punches are only aggregated strings in a run log—there is no searchable punch-level rejection queue with raw source, reason, correction, and replay.

**Automation opportunity:** Persist every rejected punch as a structured exception, auto-match probable employees, allow correction/replay, and mark devices offline when `lastSeenAt` exceeds a configurable threshold.

## 7. Leaves

**How it currently works:** The simple policy builder creates a new active `LeavePolicyVersion` immediately from administrator-entered quotas, applicability, notice, approval, auto-approval, carry-forward, certificate, and staffing rules. The advanced path uploads a document, extracts text, runs deterministic/structured AI parsing, stores draft extracted rules, shows them for review, and only activates them through an explicit admin approval call (`leaves/page.jsx:155-258`; `leave.automation.js`; policy document/version models). Requests check policy applicability, balance, overlap, notice, staffing and approval rules; approvals deduct balance, rejections do not, cancellation restores approved balance, and approved leave suppresses absence generation/check-in because the attendance processor checks active approved leave.

**Industry-standard comparison: Partially matches.** Human approval exists for AI-extracted rules, and policy versions/audit explanations are stronger than a basic leave module. Leave types are a fixed enum—organizations can relabel and configure them but cannot create arbitrary types without a code/schema migration. Balances are fixed annual grants initialized on user creation/reset each January; there is no monthly accrual, proration by joining date/employment type, fiscal leave year, eligibility waiting period, encashment workflow, negative balance, half-day request, attachment lifecycle, or holiday/weekend calendar by employee location. The simple builder activates immediately without a draft/four-eyes review.

**Automation opportunity:** Add an accrual engine and event-driven recalculation for joining, policy changes, approval, cancellation, termination, carry-forward, and fiscal-year rollover, with preview before posting balances.

## 8. Departments

**How it currently works:** Departments are organization-scoped name/description records with CRUD and active-member counts. They group users and drive department attendance analytics/reports, department averages in performance, and the leave staffing-concurrency guard; manager access, however, is based primarily on direct `managerId` relationships (`Department`, `User`; department page; analytics/performance/leave services).

**Industry-standard comparison: Partially matches.** It is more than a display label, but not a true organizational-unit model. There is no hierarchy (faculty → department → school), department head/effective dates, campus/cost center, department-specific work calendar/leave policy, position ownership, budget, or automatic approval routing to a department head.

**Automation opportunity:** Assign department heads and approval chains to organizational units, then derive manager routing, reporting scope, and policy/calendar inheritance from the hierarchy.

## 9. Performance

**How it currently works:** Monthly ETL reads attendance and approved leave, then calculates `attendanceScore`, `leaveScore`, `punctualityScore`, and an `overallScore` weighted 50/30/20. It optionally calls the AI service for another predicted score; pages display personal history, team records, leaderboard, and prediction reasons (`performance.etl.js:1-180`; performance pages/API; `PerformanceRecord`). There are no manager ratings, employee self-review, goals, competencies, feedback, review cycles, calibration, or development plans.

**Industry-standard comparison: Below standard.** This is not performance management; it is an attendance and leave-compliance score. Penalizing approved leave (`leaveScore = 100 - leaveDays × 5`) and presenting it as employee performance is misleading and creates significant trust, discrimination, labor-relations, and legal risk—especially in a university where teaching/research/service outcomes are unrelated to punch behavior. The “AI prediction” compounds that framing rather than correcting it.

**Automation opportunity:** Rename the current module to “Attendance Reliability” immediately, then build real review cycles with role-specific goals, evidence, competencies, self/manager assessment, moderation, acknowledgements, and development actions.

## 10. Reports

**How it currently works:** Four live report types exist: attendance, leave, performance, and department. Attendance/leave accept date ranges and status/type query filters; performance accepts month/year; access follows self/team/org scope; rows are capped (normally 500). The admin UI offers month/year selection and client-side CSV download; the backend also exposes CSV generation (`reports.service.js`; reports page/API).

**Industry-standard comparison: Partially matches.** Reports are real, scoped, filterable, and exportable to CSV. There is no PDF/Excel export, report designer, column chooser, saved filters, scheduling/email delivery, period comparison, pagination beyond a hard cap, academic/fiscal periods, signature/approval formatting, or statutory reports. The UI exposes fewer filters than the backend supports (no department/status/type controls).

**Automation opportunity:** Add saved report definitions and scheduled delivery to HR/department heads, with background generation and an “as-of” snapshot rather than browser-side CSV assembly.

## 11. Forecast

**How it currently works:** Admin and employee forecast pages combine 30-day leave demand, attendance anomaly, attrition, and personal performance prediction endpoints. Leave forecast loads a committed gradient-boosting artifact when available, but inference starts with a fixed `rolling_avg = 2.5`; otherwise it applies fixed weekday/month/holiday/season multipliers. `departmentId` is returned but does not filter or train on department history (`forecast_service.py:65-150`). The backend fallback uses approximately three months of approved leaves, but the AI-service path normally supersedes it.

**Industry-standard comparison: Below standard.** The displayed daily/total/peak predictions are bare point estimates with HIGH/MEDIUM/LOW labels; there is no confidence interval, error history, forecast horizon validation, model accuracy, sample size, or prominent uncertainty statement. Fixed Eid/Ramadan date heuristics and a constant starting baseline make this unsuitable as an organization-specific workforce forecast. The employee page also shows organization leave-demand figures as “personal prediction signals,” which is conceptually confusing.

**Automation opportunity:** Train/recalculate per organization and department from rolling historical leave counts, holidays and academic calendars; publish prediction intervals, back-test error, data cutoff, and “insufficient history” behavior.

## 12. Attrition Risk

**How it currently works:** Attrition ETL reads performance records and calls classifier/regressor artifacts when available, otherwise uses deterministic scoring, then stores risk score/label, leave probability, factors, model version and source in `AttritionRecord`. Features include attendance, late/absence/leave, remaining balance, performance, overtime, half-days, prior score, tenure and placeholder-style fields such as manager changes/warnings where data is available/defaulted (`attrition_service.py`; `attrition.etl.js`). The admin page shows risk distribution, scores/probabilities, source, and up to three factor codes for at-risk employees.

**Industry-standard comparison: Below standard.** It is not entirely black-box because factors are stored and displayed, but the explanation is a rule-derived factor list rather than a defensible per-feature model attribution. The UI asserts “likely to leave within 3 months” and recommends immediate intervention without evidence of model calibration, representative university validation, accuracy, bias analysis, or a true labeled outcome pipeline. Much of the signal derives from the misleading performance score, amplifying its defects.

**Automation opportunity:** Restrict this to an HR-only advisory workflow with documented review, show exact data period/source/contributions, capture reviewer disposition/outcomes, and use those outcomes for monitored validation before making retention claims.

## 13. ETL Pipeline

**How it currently works:** Manual and scheduled orchestration runs Attendance → Leave → Performance → Attrition per organization. Attendance and Leave stages query and calculate per-user metrics but discard their `results`; only counts/logs survive. Performance and Attrition upsert durable monthly records, so reruns are broadly idempotent; performance supports an incremental-changes mode, but the normal manual/nightly flow uses full mode (`etl.orchestrator.js`; ETL job files). Each job logs success/partial/failure, and the ETL scheduler notifies admins on pipeline warning/failure.

**Industry-standard comparison: Below standard.** The UI describes Attendance and Leave ETL transformations as pipeline outputs, but those stages do not load an analytics destination. There is no checkpoint/resume from a failed stage, batch/run ID on output records, reconciliation, dead-letter queue, atomic publish, source watermark, lineage, or rollback. There are also two 2:00 AM scheduling paths (`src/jobs/scheduler.js` and `modules/etl/etl.scheduler.js`), risking duplicate nightly runs; upserts limit duplication but waste resources and complicate logs.

**Automation opportunity:** Remove the duplicate scheduler, persist stage checkpoints and source watermarks, skip already successful stages, retry failed users, and publish a reconciled run manifest with input/output/error counts.

## 14. Power BI

**How it currently works:** The page can render native fallback charts from live WorkNex analytics, request a Power BI embed token, and manually push the last 30 days of attendance/leaves plus performance/employees into a push dataset named `WorkNex_<orgId>`. Dataset creation and pushed rows are organization-filtered. Embed configuration, however, uses one environment-configured workspace/report/dataset; the RLS identity passes user email and a broad role name, not organization ID (`analytics.service.js:310-590`; Power BI page).

**Industry-standard comparison: Below standard for multi-client embedding.** Per-organization push dataset naming is a good isolation direction, but the embed token may target the single global `POWERBI_DATASET_ID`/report rather than the newly created org dataset. RLS is only effective if the external Power BI model has correctly implemented roles, and pushed table schemas contain no `OrganizationId` column. Therefore the code alone cannot guarantee that one organization will never see another organization’s embedded data. This is periodic/manual push, not a live connection.

**Automation opportunity:** Provision/bind a report or semantic model per tenant (or include `OrganizationId` and dynamic RLS), automate scheduled/incremental refresh, and display dataset/report/last-refresh identity in the UI.

## 15. Notifications

**How it currently works:** In-app notification records support list, unread count, mark one/all read, delete, and permission-controlled broadcast. Code creates notifications for new leave requests to managers; auto/manual approval and rejection to employees; auto-approved leave to managers; cancellation; sandwich-rule adjustments to employee/manager; and ETL scheduler failures/warnings to admins. Anomaly alerts use SSE plus `AuditLog`, not the notification inbox. Email is used for password reset, welcome credentials, and some automated leave outcomes, but manual approve/reject paths appear in-app only; there is no SMS (`notification.service.js`; leave/auth/user/ETL services).

**Industry-standard comparison: Partially matches.** Core in-app events and broadcast are real, but delivery is inconsistent by event and channel. Users cannot configure/mute categories, choose digest/immediate delivery, set quiet hours, delegate approvals, or see delivery failure/retry state. There are no templates/localization, mobile push, SMS, or notification preference models.

**Automation opportunity:** Introduce an event bus/outbox and per-user preferences so every business event reliably fans out to in-app/email/SMS/push with retries, deduplication, templates, and delivery audit.

## 16. Logs

**How it currently works:** The sidebar Logs page reads database `AuditLog` rows, not application log files. Audit entries capture actor/org, action, entity/entity ID, values when supplied, IP, user agent and timestamp; coverage includes user/department/role/biometric changes, organization settings, leave decisions, attendance corrections, selected sensitive reads, HR-data purge, and ETL events (`audit.middleware.js`; service-created audits; logs page). Application errors remain in Winston/process logs and are not shown here.

**Industry-standard comparison: Partially matches.** This is a genuine admin audit trail, but coverage and payload quality are inconsistent: some services write directly, some routes use middleware, some reads are logged, and others are not. There is no immutable/WORM storage, retention policy enforcement, before/after diff standard, correlation/request ID, export, advanced search, actor snapshot, tamper evidence, or explicit audit of every login/session/permission decision. ETL operational events mixed into the same table also dilute compliance semantics.

**Automation opportunity:** Centralize domain audit emission through a transaction/outbox, standardize before/after and reason fields, and archive immutable audit records to a compliance store with retention/export/search.

## 17. Settings

**How it currently works:** Organization-backed settings include name/profile fields, timezone, working hours start/end, late threshold minutes, office IP ranges, Wi-Fi verification, attendance policy JSON (including half-day/GPS fields), leave automation, and sandwich leave. The admin UI exposes organization name, a small timezone list, work hours, late hour/minute, IP ranges, Wi-Fi verification, leave automation, sandwich rule, and 2FA account security (`settings.service.js`; settings page; `OrganizationSettings`).

**Industry-standard comparison: Below standard.** Missing settings include working-week/weekends, academic/holiday calendars by campus, fiscal/leave year, shifts, grace/rounding, breaks, overtime, attendance regularization chain, payroll cutoff, employment types, accrual frequency, notification preferences, locale/date format, currency, data retention, approval matrices and delegated approvers. Several displayed settings do not control the core processor: timezone, late threshold and half-day status still rely on environment variables; working end is not used for overtime. Weekdays are hardcoded Monday–Friday/Saturday in ETL/schedulers, report years are hardcoded in UI, and forecast seasonal/religious dates are code constants.

**Automation opportunity:** Create a versioned effective-dated policy service and make attendance, leave, ETL, notifications, forecasts, and UI all resolve the same organization/campus/employee policy at the event date.

## Five highest-impact gaps for a university buyer

1. **Attendance lacks shifts, rosters, missed-punch regularization, multiple-punch/break handling, overtime and effective organization rules.** This is the daily operational core and will immediately fail real faculty/staff exceptions.
2. **“Performance” is actually an attendance/leave penalty score.** Showing it to management as performance is misleading and creates the greatest trust, employee-relations, and legal risk.
3. **The employee master record is too thin.** No employment type, position/grade, contract/probation, campus, effective-dated history, bulk import, onboarding/offboarding, or university organizational hierarchy means HR cannot treat it as a system of record.
4. **Leave is fixed-grant rather than accrual/eligibility driven.** No proration, fiscal leave year, employment-type rules, half-day workflow, encashment, location calendar, or effective policy changes will create manual reconciliation work.
5. **Forecast/attrition claims are not decision-grade, and Power BI tenant isolation is not proven.** Bare forecasts from fixed baselines and unvalidated retention claims should not be used operationally; the global embed/report configuration needs a verified tenant design before client deployment.

## UI-only or materially overstated features to avoid presenting as complete

- **Attendance shift validation:** `validateShift()` exists only as a no-op extension point; there is no Shift/Roster model.
- **Overtime:** `calculateOT()` is a no-op and no overtime result is stored or approved, despite working-hour/forecast references.
- **Attendance notifications:** `emitNotifications()` is a no-op; late/check-in/check-out events do not create normal inbox notifications.
- **Manager Team overflow action:** the ellipsis button on team cards has no handler.
- **Device health:** ONLINE is set by a successful push; there is no heartbeat/offline monitor, so the page should not be demoed as real-time device health monitoring.
- **Punch exception management:** sync logs show aggregate error strings, but there is no failed-punch inbox, correction, or replay workflow.
- **Attendance and Leave ETL outputs:** those two stages calculate metrics into local arrays and discard them; they do not populate an analytics warehouse/table.
- **Department leave forecast filtering:** `departmentId` is echoed in the result but does not alter forecast calculation.
- **Organization-specific leave forecast:** the primary AI path begins from a fixed 2.5 baseline and fixed multipliers, not the organization’s historical leave time series.
- **Power BI live data:** the implemented integration is manual push into Power BI, not live-connected; native page charts can make the page appear complete even when embed configuration is absent.
- **Settings-driven attendance:** the UI saves timezone/work hours/late/half-day values, but core attendance status calculation still reads environment defaults for several of them.
- **Full performance management:** no goals, reviews, ratings, feedback, competencies or appraisal workflow exists; only derived attendance/leave scores exist.
- **Attrition “within 3 months” claim:** the UI states this outcome window, but the repository does not establish a validated three-month labeled outcome/calibration pipeline.

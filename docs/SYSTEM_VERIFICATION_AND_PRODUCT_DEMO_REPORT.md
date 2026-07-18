# WorkNex AI — System Verification and Product Demo Report

Date: 14 July 2026

## 1. Verification outcome

The tested product journeys are operational. The final isolated HTTP E2E run
completed with **143 passed, 0 failed, and 2 intentionally skipped checks**.
The runner created a temporary organization, users, department, attendance
record, leave policy data and leave requests, then removed the temporary
organization during cleanup.

The repository currently defines 149 Express route declarations. The E2E suite
contains 145 scenario assertions across health, signup, authentication, RBAC,
tenant isolation, attendance, leave, reports, analytics, notifications,
performance, AI, Power BI and frontend routes. This is broad workflow coverage,
but it is not honest to claim that every physical/external operation can be
fully tested on a developer machine. Real biometric hardware callbacks, email
delivery/OTP ownership, destructive HR-data purge, payment-provider settlement
and long-lived alert SSE behaviour still require a controlled staging test.

### Test evidence

| Area | Result |
|---|---|
| Full HTTP/module E2E | PASS — 143 passed, 0 failed, 2 skipped |
| Backend Jest | PASS — 44 passed, 5 skipped |
| Backend ESLint | PASS — 0 warnings/errors |
| AI service Pytest | PASS — 37 passed |
| Multi-agent tests | PASS — 2 passed |
| Multi-agent ESLint | PASS |
| Leave forecast integration | PASS — 11 passed, 0 failed |
| ETL integration | PASS — 13 passed, 0 failed |
| Analytics, reports and Power BI | PASS — 21 passed, 0 failed, 1 fallback warning |
| Frontend production build | PASS — Next.js 16.2.10, 42 pages |
| Frontend dependency audit | PASS — 0 known npm vulnerabilities |
| Frontend ESLint | PASS with 30 non-blocking warnings |

The two E2E skips are: no safe non-subordinate leave existed in the isolated
organization for an additional negative test, and policy-document deletion is
not exposed as an API. Manager subordinate scoping was independently verified.

## 2. Attendance — how it works now

Browser-created attendance has been removed. Employees can no longer create a
punch through a web Check In, Check Out or background ping endpoint.

Current flow:

1. A registered biometric/iClock device, signed device webhook, or configured
   TMS integration sends punch data.
2. The attendance processor resolves the employee inside the organization,
   classifies the punch, applies late/working-hours rules and upserts the daily
   attendance record.
3. Employees see their own status/history, managers see only subordinates, and
   admins see organization attendance.
4. Admin manual attendance remains available as a controlled correction tool;
   it is not an employee self-check-in mechanism.
5. Holidays and weekends are treated as non-working dates for absence/leave and
   forecasting logic.

The removed endpoints are explicitly regression-tested and return HTTP 404:

- `POST /attendance/check-in`
- `POST /attendance/check-out`
- `POST /attendance/ping`

Product explanation: **“Attendance comes from trusted workforce devices, not
an employee clicking a browser button. Managers get live visibility while HR
retains an auditable correction path.”**

## 3. Leave management and hierarchy

### Normal leave

The enforced employee workflow is:

`Employee submits → PENDING_MANAGER → manager approves/forwards → PENDING_ADMIN → admin final approval → balance deduction`

An admin cannot bypass the manager while a normal employee request is still at
the manager stage. This was verified through HTTP: the bypass attempt returned
409, manager forwarding changed the status to `PENDING_ADMIN`, and admin final
approval completed successfully.

If the requester is a manager, or the employee has no manager configured, the
request starts at admin review because there is no valid manager stage.

### Leave types

The form/domain supports Annual, Sick, Casual, Emergency and Other. `Other`
requires a custom leave name. Additional policy leave types remain supported by
the backend for organizations that configure them.

### Emergency leave

Emergency leave deliberately bypasses the manager and goes directly to
`PENDING_ADMIN`. It maps to the Casual balance bucket, can be submitted even
when the current balance is insufficient, and may create a negative balance
only after admin final approval. Ordinary leave is rejected when its balance is
insufficient.

The system records an `emergencyRecoveryDate` in the next month. Important
limitation: that date is currently metadata; there is no dedicated monthly
accrual/recovery worker that executes a separate deduction on that date. The
negative balance will naturally be offset by the next entitlement grant, but
an exact scheduled “deduct next month” ledger workflow still needs to be added
if that is the required accounting rule.

### Automation engine

For each request the engine evaluates the active versioned policy, leave type,
role applicability, date validity, overlap, balance, notice period, department
staffing threshold, holidays and sandwich rules. It stores a decision log with
reasons and required approvals so the UI can explain why a request was routed,
rejected or escalated. Holidays cause a hard conflict, so leave cannot be
applied on them.

Product explanation: **“WorkNex does not hide approvals behind an AI black box.
Every request follows the company hierarchy and carries a human-readable policy
decision trail.”**

## 4. ETL and performance intelligence

The tenant-scoped ETL pipeline runs in strict order:

1. Attendance aggregation
2. Leave aggregation
3. Deterministic performance scoring plus optional ML prediction
4. Attrition inference and persistence

Performance combines attendance, leave and punctuality scores. The AI-predicted
score is stored separately, so deterministic business scoring remains available
if the AI service is down. Attrition similarly has an ML path and a deterministic
fallback; the source and model version are stored with every record.

Corrections made during verification:

- Attendance and leave N+1 queries were replaced with tenant-scoped bulk reads.
- Raw trend helpers now require an organization ID.
- ETL logger timers/counters reset correctly for every run.
- Incremental performance processing reads the correct organization pipeline log.
- Leave days are no longer double-counted when both attendance and an approved
  leave request represent the same absence.
- Performance/attrition use bounded concurrency of five workers instead of
  sequential per-user processing or an unlimited AI fan-out.

On the real 110-active-user demo organization, attendance aggregation dropped
from roughly 39.8 seconds to 0.09 seconds. Leave aggregation completed in about
0.03 seconds. The complete pipeline completed successfully in about 44.7
seconds, down from roughly 80 seconds, and a second run proved that upserts do
not create duplicate monthly records.

Product explanation: **“Raw HR events are converted into reproducible monthly
performance and retention signals. If ML is unavailable, core HR reporting
continues instead of failing.”**

## 5. Attrition risk

The performance ETL produces features such as absences, lateness, leave usage,
working hours and overall performance. The AI service scores each employee,
returns probability/risk factors and model version, and the attrition ETL stores
the result for dashboards and Power BI.

The current July demo data contains 110 stored records sourced from the ML model
`attrition-reg-v1`; all currently classify as LOW. That proves the pipeline but
is not an impressive risk-distribution demo. Seed a few anonymized, realistic
high-absence/low-performance scenarios before a sales presentation.

This must be presented as decision support, not a prediction of employee intent.
Recommended wording: **“WorkNex highlights patterns that deserve a manager’s
attention; it does not make termination or promotion decisions.”**

## 6. Leave forecast

The backend builds an organization-scoped history of approved leave demand,
excluding weekends and holidays. The AI service uses the stored
`leave_forecast_model.pkl` gradient-boosting model to generate a 30-day demand
forecast with lower/upper confidence bounds. The backend applies the working
calendar again before returning the result and has a statistical fallback if
the AI service is unavailable.

The live test confirmed:

- real organization history was used rather than the fixed default baseline;
- 30 forecast entries were returned;
- every prediction had numeric confidence bounds;
- `low <= predicted <= high` for every day;
- model algorithm was `ml-gradient-boosting-v1`;
- weekends/holidays were excluded from forecastable working dates.

Product explanation: **“HR can see upcoming leave pressure before approving
rosters, while the chart states its uncertainty instead of pretending the
forecast is guaranteed.”**

## 7. Analytics

Analytics are calculated from organization-scoped PostgreSQL data and include:

- dashboard KPIs;
- attendance trends, heatmap and department comparison;
- leave summary, trends and leave-type distribution;
- headcount and turnover;
- performance leaderboard/team performance;
- attrition records;
- ETL status and audit history.

Managers receive team/subordinate scope; employees receive self scope; admins
receive organization scope. The analytics/report integration suite passed 21
checks. One warning occurred because the bulk AI attrition endpoint returned its
database fallback, while the persisted per-employee attrition ETL records were
confirmed as real ML output. Do not describe every AI chat/aggregate call as a
live LLM call: the tested attendance chat response also reported
`fallback: true`, although it remained grounded and actionable.

Product explanation: **“One role-aware analytics layer replaces separate
attendance, leave and performance spreadsheets.”**

## 8. Power BI

The backend obtains an Azure/Power BI embed token and includes organization
identity for row-level security. The admin/manager frontend consumes the embed
configuration; raw credentials are not sent to the browser. Test reports now
redact embed/access tokens.

Both the real embed-token operation and the configured Power BI push-data
operation completed successfully. The push used the existing organization-
scoped WorkNex dataset.

Product explanation: **“Executives can use familiar Power BI reporting without
giving the browser service credentials, while tenant identity remains part of
the embed flow.”**

## 9. Recommended sales demo flow

1. Show device-derived attendance and explain trusted punch sources.
2. Submit a normal employee leave and show manager → admin separation of duty.
3. Open the decision explanation to show policy reasons and staffing impact.
4. Submit an Emergency request and show direct admin routing.
5. Add a holiday and demonstrate that leave and forecasting exclude that date.
6. Run/show ETL status, then open performance and attrition dashboards.
7. Show the 30-day leave forecast with confidence range.
8. Finish with the embedded Power BI executive view.

The strongest one-line pitch is:

> **WorkNex AI is a closed-loop workforce operations platform: trusted
> attendance feeds policy-controlled leave, which feeds explainable performance,
> retention and staffing intelligence for employees, managers and HR.**

## 10. Remaining work before claiming full enterprise readiness

1. Implement an explicit emergency-leave recovery/accrual ledger worker if the
   next-month deduction must happen on a precise date.
2. Exercise physical biometric devices, email OTP delivery, payments, SSE alerts
   and destructive HR purge in an isolated staging environment.
3. Add representative high/medium attrition demo data and document model
   evaluation metrics against a held-out dataset.
4. Resolve the remaining 30 frontend lint warnings and enable strict build-time
   type validation instead of skipping it.
5. Upgrade the multi-agent LangChain dependency family in a dedicated migration;
   its npm audit currently reports 11 transitive findings, including one high,
   and automatic remediation requires breaking major-version upgrades.
6. Increase frontend and route-level automated coverage; passing route rendering
   is not a substitute for component interaction tests.

No code or data was pushed to GitHub.

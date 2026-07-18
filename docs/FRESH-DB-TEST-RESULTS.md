# Fresh-Database Testing Guide — Execution Report (Playwright pass)

**Date:** 2026-07-13
**Branch:** `feature/dynamic-roles`
**Tested by:** real browser automation (Playwright/Chromium) driving the actual Next.js frontend against an isolated backend + database — this supersedes the earlier API-only pass with real UI clicks, form fills, and screenshots.

## How this was tested

Playwright wasn't installed in the project, so it was installed standalone (`npm install playwright` + `npx playwright install chromium`) in a scratch directory — nothing was added to the project's own `package.json`. A second, fully isolated instance of the stack was stood up so nothing here touched your live dev session:

- Fresh Postgres database `worknex_fresh_test` (dropped and recreated at the start of this pass for a truly clean run).
- Backend on port `5050` (`FRONTEND_URL=http://localhost:3001` so CORS allows the test frontend) — your existing backend on port `5000` was never touched.
- A second Next.js dev server on port `3001` (`NEXT_PUBLIC_API_URL` pointed at the test backend) — your existing frontend on port `3000` was never touched. This required a temporary `distDir` override to avoid a `.next` build-lock conflict with your running dev server; that scaffolding change was reverted afterward and is not part of the diff.
- Every step below was driven by an actual headless Chromium browser: typing into real form fields, clicking real buttons, reading real rendered text and screenshots — not API calls. Screenshots for every step are in the session scratchpad.

Two things still can't be done through browser clicks in one sitting and were **not** re-driven this pass (the first, API-level pass already proved these work correctly and is still valid — see that report's Parts 9 & 10 for the detailed trace): the sandwich-rule's real Friday→Monday gap and the staffing-guard's multi-day overlap, both of which need multiple real calendar days. This pass focused on everything that *is* UI-drivable, which is where all the new findings below came from — bugs that only show up when you actually go through the browser, not when you call the API directly.

---

## 🔴 Bugs found this pass (all fixed except where noted)

### 1. Office Window settings — save button silently drops the value

**Reproduced live, with before/after screenshots.** Set Office Window Start/End to 08:00/18:00 on the Settings page, clicked **Save Changes**, got the green "Settings saved" toast — and the fields snapped back to empty (`--:-- --`) immediately after. Confirmed via direct DB check: `attendancePolicyJson` still only held `{halfDayHours: 4}`, the office-window fields never persisted.

**Root cause:** `worknex-backend/src/modules/settings/settings.service.js`, `updateOrganizationSettings`:
```js
attendancePolicyJson: data.attendancePolicyJson || data.attendancePolicy,
```
The Settings page's `handleSave` spreads its *entire* fetched-then-locally-edited state back into the PUT payload. That state still carries the stale `attendancePolicyJson` key from the original `GET` (a duplicate of `attendancePolicy` that the form never touches), sitting alongside the correctly-updated `attendancePolicy` key. Since `attendancePolicyJson` is a non-null object, `||` picks it first — so the *stale* value always wins over whatever the admin just typed. This isn't a guide-testing edge case; it's the literal "click Save" path every admin uses.

**Fix applied:** flipped the precedence so the live `attendancePolicy` field wins:
```js
attendancePolicyJson: data.attendancePolicy || data.attendancePolicyJson,
```
Re-verified via the same browser flow (screenshot after a hard page reload): 08:00 AM / 06:00 PM now persist correctly.

### 2. Organization signup crashes on a truly fresh database

(Carried over from the first pass — still applies, still fixed.) `leave.defaults.js` was spreading a raw `applicableRoles` array into a Prisma `create` call that only accepts `applicableRoleIds`, crashing every `/register` on a clean DB. Fixed by destructuring it out before the spread. Re-verified this pass via the actual `/register` form in the browser — signup now completes and redirects to `/login` as expected.

### 3. Reports page dumps raw JSON and a raw UUID column to the screen

**Reproduced live, screenshot attached.** Opened Admin → Reports → Hours Shortfall and saw, verbatim, `{"belowTarget":1}` rendered as the report's subtitle, and a `userId` column full of raw UUIDs (`1b188cf7-8c2d-466b-...`) in the table.

**Root cause 1** — `frontend/app/dashboard/admin/reports/page.jsx`:
```jsx
<p>...{currentReport?.summary ? JSON.stringify(currentReport.summary) : 'No summary yet'}</p>
```
Every report tab's summary object gets dumped through `JSON.stringify` straight into the UI instead of being formatted.

**Root cause 2** — the generic report table already special-cases hiding the raw `id` column with a comment saying internal UUIDs "aren't useful to read on screen," but the Hours Shortfall endpoint's `userId` field slipped through that filter since it's a different key name than the one being excluded.

**Fix applied:** added a small `formatSummary()` helper that turns `{belowTarget: 1}` into `Below Target: 1`, and extended the existing header filter to also drop `userId`. Re-verified live: the subtitle now reads "Below Target: 1" and the UUID column is gone, with no change to any other report tab's behavior.

---

## Confirmed-working (screenshots taken, real browser clicks) — Parts 1–8, 11–15

| Part | What it tests | Result |
|---|---|---|
| 1 — Signup | `/register` form → org, 3 roles, Administration dept, owner, trial | ✅ Confirmed via the actual form. Redirects to `/login`, real login succeeds, lands on `/dashboard/admin`. |
| 2 — Baseline | Dashboard loads with live data | ⚠️ Loads correctly, but **"Total Employees" shows 0, not 1** — see finding below. |
| 3 — CL/EL policy | "Set Up Leave Policy" wizard, two rule blocks (CL, EL) | ✅ Confirmed via the actual modal — filled both rule blocks, clicked "Save & Activate", got "Policy rules activated" toast, and the Apply Leave dropdown started showing "CL"/"EL". |
| 4 — Sandwich rule ON | Settings checkbox | ✅ Confirmed — checkbox state persists correctly after save + reload. |
| 5 — Staff categories | NTS (08:40, 3→absence) + Faculty (8h/40h) via "Add Category" modal | ✅ Confirmed, both categories created and correctly configured. |
| 6 — Office Window | Settings → Attendance section | ❌ → ✅ **after the fix above.** See bug #1. |
| 7 — Users | Manager + 4 employees via "Add User" modal, department/category/manager links via "Edit User" | ✅ Confirmed — all links (department, staff category, manager) correctly wired after going through the real Add/Edit User modals. |
| 8 — CL/EL auto-approve | Apply Leave modal, CL 1-day vs EL any-length | ✅ Confirmed on-screen: CL request shows a green **APPROVED** badge with "Decision: AUTO_APPROVED — Within auto-approve window..."; EL request shows amber **PENDING** with "Decision: PENDING_MANAGER". |
| 9 — Sandwich rule | Friday leave + Monday absence → 4-day deduction | Not re-driven via UI this pass (needs real multi-day gap) — see the API-level report's Part 9 for the verified trace; logic unchanged since then. |
| 10 — Staffing guard | Overlapping leave beyond department % → routed to manager | Not re-driven via UI this pass for the same reason — see API-level report's Part 10. |
| 11 — NTS 3-lates→absence | Real "Check In" button click as the 3rd late this month | ✅ Confirmed on-screen: employee's own Attendance page shows `ABSENT` status even though they just clicked Check In, with the check-in time recorded (11:17 PM) alongside the ABSENT status. |
| 12 — Faculty hours shortfall | Real Check In → Check Out via the employee Attendance page | ✅ Confirmed: `HALF_DAY` status shown immediately; Admin → Reports → Hours Shortfall correctly lists the employee with category "Faculty" and the right shortfall math. |
| 13 — Work-window note | Real check-in outside 08:00–18:00 | ✅ Confirmed via auto-ping (the app itself auto-checked a logged-in user in) — attendance record correctly carries `"Outside configured work window"`. **Not visible to admins anywhere in the UI** — see finding below. |
| 14 — Goals & Reviews | Full loop: employee creates goal → manager starts/drafts/submits review → employee sees it | ✅ Confirmed end-to-end via three separate real logins: goal created with progress bar, manager's 4-star draft review, "Save as Draft" → "Submit" → toast "Review submitted", and the employee's "My Reviews" section showing the 4-star rating and comment only after submission. |
| 15 — Notification bell | Badge, dropdown, chime, mark-as-read | ✅ Confirmed, including the sound. See below — this closes out the one thing the first pass explicitly couldn't verify. |

### Part 15 detail: the chime actually fires

The bell doesn't use an audio file — it synthesizes a two-tone chime with the Web Audio API (`useNotificationBell.js`). To verify it fires (not just that the badge updates), the test instrumented `AudioContext.prototype.createOscillator` before the page loaded, then had a separate manager session approve a leave while the employee's tab sat open. After the bell's 20-second poll cycle: the oscillator-creation counter went from 0 to 2 (the chime is two tones) exactly when the unread count increased, and the badge visibly updated to reflect the new notification. Mark-as-read was also confirmed live via the dropdown's checkmark button.

---

## Other findings worth folding back into the guide (not bugs — documented behavior)

1. **"Total Employees: 1" in Part 2 doesn't match reality.** The dashboard KPI (`analytics.service.js`) only counts users whose role *tier* is `EMPLOYEE`. The organization owner's tier is `ADMIN`, so a freshly-registered org with only its owner shows **Total Employees: 0**, not 1, until the first real employee is added. Confirmed on-screen. Whether this is the intended definition of "employee" is a product call, not something fixed here — but the guide's expected number is wrong as written.

2. **[FIXED] The Admin Attendance page never showed the `notes` column.** The backend faithfully computes and stores rich context on every attendance record — `"Outside configured work window"`, `"Every 3 lates = 1 absence — threshold reached this month — auto-marked absent per NTS policy"` — but `frontend/app/dashboard/admin/attendance/page.jsx` never rendered a notes column; it only *wrote* a note when an admin manually corrected a status, never read one back. Added a Notes column between Status and Actions (no backend change needed — `notes` was already returned by `getAllAttendance`). Re-verified live: today's auto-checked-in record now correctly shows "Outside configured work window" in the table.

3. **Login form has a brief hydration race.** A submit clicked within roughly a second of the `/login` page's first paint can fall through to the browser's native (un-prevented) form submission instead of React's `onSubmit` handler, which navigates to `/login?email=...&password=...` — briefly putting the plain-text password in the URL (and, if it ever left the client, in server/proxy logs and browser history) instead of calling the API. This needed unnaturally fast automation to trigger and is very unlikely to happen to a real person clicking normally, but it's a real gap: nothing currently guards against the form submitting before hydration completes.

4. **Auto check-in-on-login is real and can surprise a tester.** Logging into the app fires a background "attendance ping" that can auto-check a user in (confirmed organically during this pass — the org owner and Ahmed both got auto-checked-in as `LATE` just from logging in, before any deliberate check-in test). Worth a one-line callout in the guide so a tester isn't confused by attendance records appearing before they've clicked anything.

## Cleanup

- `worknex_fresh_test` database is left in place for inspection; drop with `psql -d postgres -c "DROP DATABASE worknex_fresh_test;"` when done.
- Both isolated test processes (backend :5050, frontend :3001) were stopped; your dev backend (:5000) and frontend (:3000) were never touched.
- The temporary `next.config.mjs`/`tsconfig.json` scaffolding used to run a second frontend instance without a build-lock conflict was reverted — not part of the diff.
- Three real fixes remain in your working tree, unstaged: `worknex-backend/src/modules/leave/leave.defaults.js`, `worknex-backend/src/modules/settings/settings.service.js`, `frontend/app/dashboard/admin/reports/page.jsx`.

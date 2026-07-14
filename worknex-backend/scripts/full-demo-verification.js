/**
 * Full demo-readiness verification for DHA SUFFA UNIVERSITY.
 *
 * Phase 1 — Top up to 100+ active users (managers + employees) across new
 *           departments, on top of whatever already exists.
 * Phase 2 — Fill attendance + leave history for any user missing it.
 * Phase 3 — Re-run the ETL pipeline (current + previous month) for the org,
 *           so Performance/Attrition records exist for everyone.
 * Phase 4 — HARD fallback checks: leave forecast, attrition risk, and
 *           performance ETL must all show evidence the real AI service was
 *           used — the script FAILS (not warns) if a fallback path fired.
 * Phase 5 — Broad endpoint sweep: attendance, leave, analytics, reports,
 *           biometric, performance-goals — calls the real service layer as
 *           a real admin, same functions the HTTP routes call.
 *
 * Usage: node scripts/full-demo-verification.js
 * Requires: ai-service running on AI_SERVICE_URL (Phase 4 fails loudly if not).
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const jwt = require('jsonwebtoken');
const prisma = require('../src/config/db');
const usersService = require('../src/modules/users/users.service');
const etlOrchestrator = require('../src/modules/etl/etl.orchestrator');
const aiService = require('../src/modules/ai/ai.service');
const leaveService = require('../src/modules/leave/leave.service');
const analyticsService = require('../src/modules/analytics/analytics.service');
const reportsService = require('../src/modules/reports/reports.service');
const { toAttendanceDate } = require('../src/modules/attendance/attendance.processor');

const PASSWORD = process.env.SEED_USER_PASSWORD || 'Demo@12345';

let passCount = 0, failCount = 0, warnCount = 0;
function pass(msg) { passCount++; console.log(`  \x1b[32m✓\x1b[0m ${msg}`); }
function fail(msg) { failCount++; console.log(`  \x1b[31m✗ FAIL\x1b[0m ${msg}`); }
function warn(msg) { warnCount++; console.log(`  \x1b[33m!\x1b[0m ${msg}`); }
function section(t) { console.log(`\n${'='.repeat(70)}\n${t}\n${'='.repeat(70)}`); }

// ─── Name generator (same pool style as seed-large-org.js) ───────────────
const FIRST_MALE = ['Hassan','Bilawal','Farhan','Sohaib','Kashif','Owais','Zain','Umer','Adnan','Shahroz','Sami','Waleed','Hamid','Nauman','Aftab'];
const FIRST_FEMALE = ['Areeba','Zoya','Mahnoor','Rimsha','Kinza','Palwasha','Anosha','Duaa','Eman','Mishal','Sabahat','Wajiha','Ushna','Ayat','Noreen'];
const LAST = ['Nawaz','Iqbal','Butt','Sheikh','Chaudhry','Awan','Malik','Baig','Raza','Farooq','Zaidi','Warraich','Aslam','Bhutta','Javed'];
let nameIdx = 0;
function nextName() {
  const pool = nameIdx % 2 === 0 ? FIRST_MALE : FIRST_FEMALE;
  const firstName = pool[nameIdx % pool.length];
  const lastName = LAST[(nameIdx * 5 + 2) % LAST.length];
  nameIdx += 1;
  return { firstName, lastName };
}

const NEW_DEPARTMENTS = [
  { name: 'Research & Development', size: 10 },
  { name: 'Alumni Relations', size: 9 },
  { name: 'Sports & Facilities', size: 9 },
];

async function ensureDepartment(name, organizationId, requestingUser) {
  const existing = await prisma.department.findFirst({ where: { organizationId, name } });
  if (existing) return existing;
  return usersService.createDepartment({ name }, requestingUser);
}

async function ensureUser({ firstName, lastName }, emailSlug, role, organizationId, departmentId, managerId, requestingUser) {
  const email = `${emailSlug}.demo3@example.com`;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { user: existing, created: false };
  const employeeId = `${role === 'MANAGER' ? 'MGR' : 'EMP'}-${emailSlug.split('.')[0].toUpperCase()}-${Date.now().toString().slice(-5)}${Math.floor(Math.random() * 90 + 10)}`;
  const result = await usersService.createUser({
    firstName, lastName, email, employeeId, role, password: PASSWORD, departmentId,
    managerId: managerId || undefined,
    designation: role === 'MANAGER' ? 'Department Head' : 'Staff Member',
    isActive: true,
  }, requestingUser);
  return { user: result.user, created: true };
}

function mintToken(user) {
  return jwt.sign(
    { userId: user.id, role: user.customRole.tier, organizationId: user.organizationId },
    process.env.JWT_SECRET,
    { expiresIn: '30m' }
  );
}

const isWeekend = (d) => d.getUTCDay() === 0 || d.getUTCDay() === 6;
const addDays = (d, n) => { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x; };
const fmt = (d) => d.toISOString().slice(0, 10);
function pickStatus() {
  const r = Math.random();
  if (r < 0.85) return 'PRESENT';
  if (r < 0.93) return 'LATE';
  if (r < 0.97) return 'ABSENT';
  return 'HALF_DAY';
}
function attendanceFieldsFor(status, dateUTC) {
  const y = dateUTC.getUTCFullYear(), m = dateUTC.getUTCMonth(), d = dateUTC.getUTCDate();
  const at = (h, min) => new Date(y, m, d, h, min, 0, 0);
  switch (status) {
    case 'PRESENT': return { checkIn: at(9, Math.floor(Math.random() * 15)), checkOut: at(17, Math.floor(Math.random() * 30)), workingHours: 8 + Math.random() * 0.5 };
    case 'LATE': return { checkIn: at(10, Math.floor(Math.random() * 45)), checkOut: at(17, Math.floor(Math.random() * 30)), workingHours: 6.5 + Math.random() };
    case 'HALF_DAY': return { checkIn: at(9, Math.floor(Math.random() * 15)), checkOut: at(13, Math.floor(Math.random() * 30)), workingHours: 4 + Math.random() * 0.5 };
    default: return { checkIn: null, checkOut: null, workingHours: null };
  }
}

async function main() {
  const org = await prisma.organization.findFirst({ where: { name: 'DHA SUFFA UNIVERSITY' } });
  if (!org) throw new Error('Organization "DHA SUFFA UNIVERSITY" not found');
  const owner = await prisma.user.findFirst({ where: { organizationId: org.id }, include: { customRole: true }, orderBy: { createdAt: 'asc' } });
  const requestingUser = { id: owner.id, organizationId: org.id, role: owner.customRole.tier };
  const adminToken = mintToken(owner);
  const authorization = `Bearer ${adminToken}`;

  // ─── PHASE 1: top up to 100+ users ─────────────────────────────────────
  section('PHASE 1 — Topping up to 100+ users (managers + employees)');
  const before = await prisma.user.count({ where: { organizationId: org.id, isActive: true } });
  console.log(`  Current active users: ${before}`);

  const newUsers = [];
  for (const block of NEW_DEPARTMENTS) {
    const dept = await ensureDepartment(block.name, org.id, requestingUser);
    const mgrName = nextName();
    const mgrSlug = `${mgrName.firstName}.${mgrName.lastName}`.toLowerCase();
    const { user: manager, created: mgrCreated } = await ensureUser(mgrName, mgrSlug, 'MANAGER', org.id, dept.id, null, requestingUser);
    newUsers.push(manager);
    if (mgrCreated) pass(`Created manager ${mgrName.firstName} ${mgrName.lastName} (${block.name})`);

    for (let i = 0; i < block.size - 1; i += 1) {
      const empName = nextName();
      const empSlug = `${empName.firstName}.${empName.lastName}${i}`.toLowerCase();
      const { user, created } = await ensureUser(empName, empSlug, 'EMPLOYEE', org.id, dept.id, manager.id, requestingUser);
      newUsers.push(user);
      if (created) pass(`Created employee ${empName.firstName} ${empName.lastName} (${block.name})`);
    }
  }

  const after = await prisma.user.count({ where: { organizationId: org.id, isActive: true } });
  console.log(`\n  Total active users now: ${after}`);
  if (after >= 100) pass(`Org has ${after} users — requirement of 100+ satisfied`);
  else fail(`Org only has ${after} users — expected 100+`);

  // ─── PHASE 2: fill attendance + leave for anyone missing it ────────────
  section('PHASE 2 — Filling attendance + leave history');
  const DAYS_BACK = 45;
  const holidays = await prisma.holiday.findMany({ where: { organizationId: org.id } });
  const allUsers = await prisma.user.findMany({ where: { organizationId: org.id, isActive: true }, select: { id: true, managerId: true } });

  let attendanceCreated = 0, usersGivenLeaves = 0;
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);

  for (const user of allUsers) {
    const existingLeaves = await prisma.leaveRequest.findMany({
      where: { employeeId: user.id, organizationId: org.id, status: 'APPROVED' },
      select: { startDate: true, endDate: true },
    });
    const leaveDateSet = new Set();
    for (const l of existingLeaves) {
      let d = new Date(l.startDate);
      while (d <= l.endDate) { leaveDateSet.add(fmt(d)); d = addDays(d, 1); }
    }

    const totalLeaves = await prisma.leaveRequest.count({ where: { employeeId: user.id, organizationId: org.id } });
    if (totalLeaves < 2) {
      const approverId = user.managerId || owner.id;
      const clStart = addDays(today, -1 * (10 + Math.floor(Math.random() * 20)));
      const elStart = addDays(today, -1 * (25 + Math.floor(Math.random() * 15)));
      const elDays = 2 + Math.floor(Math.random() * 2);
      const elEnd = addDays(elStart, elDays - 1);
      await prisma.leaveRequest.createMany({
        data: [
          { organizationId: org.id, employeeId: user.id, approverId, leaveType: 'CASUAL', startDate: clStart, endDate: clStart, totalDays: 1, reason: 'Personal work', status: 'APPROVED', appliedAt: addDays(clStart, -2), reviewedAt: addDays(clStart, -1) },
          { organizationId: org.id, employeeId: user.id, approverId, leaveType: 'ANNUAL', startDate: elStart, endDate: elEnd, totalDays: elDays, reason: 'Family trip', status: 'APPROVED', appliedAt: addDays(elStart, -8), reviewedAt: addDays(elStart, -6) },
        ],
      });
      usersGivenLeaves += 1;
      [fmt(clStart), fmt(elStart), fmt(elEnd)].forEach((d) => leaveDateSet.add(d));
    }

    const existingAttendance = await prisma.attendance.findMany({
      where: { userId: user.id, date: { gte: toAttendanceDate(addDays(today, -DAYS_BACK)) } },
      select: { date: true },
    });
    const existingDates = new Set(existingAttendance.map((r) => fmt(r.date)));

    const rows = [];
    for (let i = DAYS_BACK; i >= 1; i -= 1) {
      const day = addDays(today, -i);
      if (isWeekend(day)) continue;
      if (holidays.some((h) => fmt(h.date) === fmt(day))) continue;
      const key = fmt(day);
      if (existingDates.has(key) || leaveDateSet.has(key)) continue;
      const status = pickStatus();
      rows.push({ organizationId: org.id, userId: user.id, date: toAttendanceDate(day), status, source: 'DEMO_SEED', ...attendanceFieldsFor(status, day) });
    }
    if (rows.length > 0) {
      await prisma.attendance.createMany({ data: rows, skipDuplicates: true });
      attendanceCreated += rows.length;
    }
  }
  pass(`Attendance: ${attendanceCreated} new day-records created across ${allUsers.length} users`);
  pass(`Leave history: ${usersGivenLeaves} users given fresh historical leaves`);

  // ─── PHASE 3: re-run ETL ────────────────────────────────────────────────
  section('PHASE 3 — Running ETL pipeline (current + previous month, whole org)');
  const now = new Date();
  const months = [[now.getMonth() + 1, now.getFullYear()]];
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  months.push([prevMonthDate.getMonth() + 1, prevMonthDate.getFullYear()]);

  for (const [month, year] of months) {
    const result = await etlOrchestrator.runAll(month, year, org.id, { incremental: false });
    if (result.success || result.status === 'PARTIAL') pass(`ETL ${year}-${String(month).padStart(2, '0')}: ${result.status} (${result.totalRecords ?? 0} records)`);
    else fail(`ETL ${year}-${String(month).padStart(2, '0')} failed: ${result.error}`);
  }

  // ─── PHASE 4: HARD fallback checks ─────────────────────────────────────
  section('PHASE 4 — Verifying NO FALLBACK is used (hard requirement for demo)');

  let forecastResult;
  try {
    forecastResult = await aiService.leaveForecast(requestingUser, null, authorization);
  } catch (err) {
    fail(`leaveForecast threw: ${err.message}`);
  }
  if (forecastResult) {
    if (forecastResult.fallback) fail('LEAVE FORECAST is using the statistical fallback — ai-service is not being reached. Start ai-service before the demo.');
    else if (forecastResult.algorithm !== 'ml-gradient-boosting-v1') fail(`LEAVE FORECAST algorithm is "${forecastResult.algorithm}", expected the real ML model`);
    else pass(`Leave forecast confirmed real ML model: algorithm="${forecastResult.algorithm}", baselineSource="${forecastResult.baselineSource}"`);
  }

  let attritionResult;
  try {
    attritionResult = await aiService.attritionRisk(requestingUser, authorization);
  } catch (err) {
    fail(`attritionRisk threw: ${err.message}`);
  }
  if (attritionResult) {
    if (attritionResult.fallback) fail('ATTRITION RISK is using a fallback (dept-aggregate or synthetic), not real per-employee data.');
    else if (attritionResult.dataSource !== 'performance_records') fail(`ATTRITION RISK dataSource is "${attritionResult.dataSource}", expected "performance_records"`);
    else if (!attritionResult.modelInfo?.mlActive) fail('ATTRITION RISK models are not active — ML classifier/regressor not loaded on ai-service');
    else pass(`Attrition risk confirmed real ML models active: algorithm="${attritionResult.algorithm}", analyzed=${attritionResult.totalAnalyzed}`);
    const sampleEmp = attritionResult.employees?.[0];
    if (sampleEmp && !sampleEmp.mlUsed) fail(`Sample employee (${sampleEmp.name}) attrition score used deterministic fallback, not ML`);
    else if (sampleEmp) pass(`Sample employee (${sampleEmp.name}) attrition score confirmed ML-generated (riskScore=${sampleEmp.riskScore})`);
  }

  const perfSample = await prisma.performanceRecord.findMany({
    where: { organizationId: org.id, month: now.getMonth() + 1, year: now.getFullYear() },
    take: 5,
  });
  const withMlScore = perfSample.filter((r) => r.mlPredictedScore !== null);
  if (perfSample.length === 0) warn('No PerformanceRecord rows found for current month to sample');
  else if (withMlScore.length === 0) fail('PERFORMANCE ETL: none of the sampled records have mlPredictedScore — ai-service performance model is not being reached');
  else pass(`Performance ETL confirmed ML scoring active: ${withMlScore.length}/${perfSample.length} sampled records have mlPredictedScore`);

  // ─── PHASE 5: broad endpoint sweep ──────────────────────────────────────
  section('PHASE 5 — Endpoint sweep (attendance, leave, analytics, reports, biometric)');

  async function check(label, fn) {
    try {
      const data = await fn();
      if (data === undefined || data === null) { fail(`${label}: returned null/undefined`); return null; }
      pass(`${label}: OK`);
      return data;
    } catch (err) {
      fail(`${label}: threw — ${err.message}`);
      return null;
    }
  }

  console.log('\n-- Attendance --');
  const attendanceService = require('../src/modules/attendance/attendance.service');
  await check('getAllAttendance', () => attendanceService.getAllAttendance({}, requestingUser));
  await check('getHolidays', () => attendanceService.getHolidays(requestingUser));
  await check('getAttendanceSummary', () => attendanceService.getAttendanceSummary({}, requestingUser));

  console.log('\n-- Leave --');
  await check('getAll leaves', () => leaveService.getLeaves({}, requestingUser));
  await check('getPending leaves', () => leaveService.getPendingLeaves(requestingUser));
  await check('getPolicies', () => leaveService.getPolicies(requestingUser));
  await check('getDailyLeaveCounts', () => leaveService.getDailyLeaveCounts(requestingUser, 14));
  const sampleEmployee = allUsers[0];
  await check('getUserBalances (sample)', () => leaveService.getUserBalances(sampleEmployee.id, requestingUser));

  console.log('\n-- Analytics --');
  await check('Dashboard KPIs', () => analyticsService.getDashboardKPIs(requestingUser));
  await check('Headcount', () => analyticsService.getHeadcount(requestingUser));
  await check('Turnover rate', () => analyticsService.getTurnoverRate(now.getFullYear(), requestingUser));
  await check('Attendance trends', () => analyticsService.getAttendanceTrends(now.getFullYear(), now.getMonth() + 1, requestingUser));
  await check('Attendance heatmap', () => analyticsService.getAttendanceHeatmap(owner.id, now.getFullYear(), requestingUser));
  await check('Department attendance', () => analyticsService.getDepartmentAttendance(now.getMonth() + 1, now.getFullYear(), requestingUser));
  await check('Leave summary', () => analyticsService.getLeaveSummary(now.getFullYear(), requestingUser));
  await check('Leave trends', () => analyticsService.getLeaveTrends(now.getFullYear(), requestingUser));
  await check('Leave by type', () => analyticsService.getLeaveByType(now.getFullYear(), requestingUser));
  await check('Performance leaderboard', () => analyticsService.getPerformanceLeaderboard(now.getMonth() + 1, now.getFullYear(), 10, requestingUser));
  await check('Attrition analytics', () => analyticsService.getAttritionAnalytics(now.getMonth() + 1, now.getFullYear(), requestingUser));
  await check('ETL logs', () => analyticsService.getEtlLogs(requestingUser));
  await check('Audit logs', () => analyticsService.getAuditLogs(requestingUser, 50));

  console.log('\n-- Reports --');
  await check('Attendance report', () => reportsService.getAttendanceReport({}, requestingUser));
  await check('Leave report', () => reportsService.getLeaveReport({}, requestingUser));
  await check('Performance report', () => reportsService.getPerformanceReport({}, requestingUser));
  await check('Department report', () => reportsService.getDepartmentReport({}, requestingUser));

  console.log('\n-- Biometric --');
  const biometricService = require('../src/modules/biometric/biometric.service');
  await check('getIntegration', () => biometricService.getIntegration(requestingUser.organizationId));
  await check('listDevices', () => biometricService.listDevices(requestingUser.organizationId));

  // ─── Summary ─────────────────────────────────────────────────────────
  section('SUMMARY');
  console.log(`  Passed:   ${passCount}`);
  console.log(`  Failed:   ${failCount}`);
  console.log(`  Warnings: ${warnCount}`);
  console.log(failCount === 0 ? '\n  ✅ DEMO READY — no fallback detected anywhere, all endpoints responded.' : '\n  ❌ NOT DEMO READY — see FAIL lines above.');

  await prisma.$disconnect();
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error('Script crashed:', err);
  await prisma.$disconnect();
  process.exit(1);
});

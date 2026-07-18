/**
 * Fills in realistic Attendance + Leave history for every active user in
 * the org, then re-runs the ETL pipeline so Performance/Attrition records
 * exist for everyone — so Analytics, Reports, Performance, Forecast and
 * Attrition dashboards all have real numbers to show instead of empty
 * charts, no matter which demo user you log in as.
 *
 * What it does, per active user:
 *   1. Attendance for the last ~45 calendar days (weekdays only, holidays
 *      and days already covered by an approved leave skipped): a realistic
 *      85% PRESENT / 8% LATE / 4% ABSENT / 3% HALF_DAY mix. Only fills in
 *      dates that don't already have a record — never overwrites existing
 *      attendance (so anything from earlier manual testing is untouched).
 *   2. If the user has fewer than 2 leave requests, adds 2 historical
 *      APPROVED ones (1 CASUAL, 1 ANNUAL) in the past, so Leave Analytics
 *      has real by-type/by-status data for everyone, not just a few users.
 *   3. Re-runs the ETL pipeline for June + July 2026 for the whole org, so
 *      PerformanceRecord/AttritionRecord exist for the newly-added
 *      Operations/Computer Science/etc. users too (previously only the
 *      original 15 users had these).
 *
 * Idempotent: attendance is create-only for missing dates (never
 * overwrites), leave-seeding only fires for users with <2 existing
 * requests, and ETL re-runs are plain upserts. Safe to re-run.
 *
 * Usage: node scripts/fill-demo-data.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const prisma = require('../src/config/db');
const etlOrchestrator = require('../src/modules/etl/etl.orchestrator');
const { toAttendanceDate } = require('../src/modules/attendance/attendance.processor');

const DAYS_BACK = 45;
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
    case 'PRESENT':
      return { checkIn: at(9, Math.floor(Math.random() * 15)), checkOut: at(17, Math.floor(Math.random() * 30)), workingHours: 8 + Math.random() * 0.5 };
    case 'LATE':
      return { checkIn: at(10, Math.floor(Math.random() * 45)), checkOut: at(17, Math.floor(Math.random() * 30)), workingHours: 6.5 + Math.random() };
    case 'HALF_DAY':
      return { checkIn: at(9, Math.floor(Math.random() * 15)), checkOut: at(13, Math.floor(Math.random() * 30)), workingHours: 4 + Math.random() * 0.5 };
    case 'ABSENT':
    default:
      return { checkIn: null, checkOut: null, workingHours: null };
  }
}

function isHoliday(dateUTC, holidays) {
  return holidays.some((h) => {
    if (h.isRecurring) return h.date.getUTCMonth() === dateUTC.getUTCMonth() && h.date.getUTCDate() === dateUTC.getUTCDate();
    return fmt(h.date) === fmt(dateUTC);
  });
}

async function seedAttendanceForUser(user, org, holidays, leaveDateSet) {
  const existing = await prisma.attendance.findMany({
    where: { userId: user.id, date: { gte: toAttendanceDate(addDays(new Date(), -DAYS_BACK)) } },
    select: { date: true },
  });
  const existingDates = new Set(existing.map((r) => fmt(r.date)));

  const rows = [];
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  for (let i = DAYS_BACK; i >= 1; i -= 1) {
    const day = addDays(today, -i);
    if (isWeekend(day)) continue;
    if (isHoliday(day, holidays)) continue;
    const key = fmt(day);
    if (existingDates.has(key)) continue;
    if (leaveDateSet.has(key)) continue;

    const status = pickStatus();
    const fields = attendanceFieldsFor(status, day);
    rows.push({
      organizationId: org.id,
      userId: user.id,
      date: toAttendanceDate(day),
      status,
      source: 'DEMO_SEED',
      ...fields,
    });
  }

  if (rows.length > 0) {
    await prisma.attendance.createMany({ data: rows, skipDuplicates: true });
  }
  return rows.length;
}

async function seedLeavesForUser(user, org, owner) {
  const count = await prisma.leaveRequest.count({ where: { employeeId: user.id, organizationId: org.id } });
  if (count >= 2) return 0;

  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const approverId = user.managerId || owner.id;

  const clStart = addDays(today, -1 * (10 + Math.floor(Math.random() * 20)));
  const elStart = addDays(today, -1 * (25 + Math.floor(Math.random() * 15)));
  const elDays = 2 + Math.floor(Math.random() * 2); // 2-3 days
  const elEnd = addDays(elStart, elDays - 1);

  await prisma.leaveRequest.createMany({
    data: [
      {
        organizationId: org.id,
        employeeId: user.id,
        approverId,
        leaveType: 'CASUAL',
        startDate: clStart,
        endDate: clStart,
        totalDays: 1,
        reason: 'Personal work',
        status: 'APPROVED',
        appliedAt: addDays(clStart, -2),
        reviewedAt: addDays(clStart, -1),
      },
      {
        organizationId: org.id,
        employeeId: user.id,
        approverId,
        leaveType: 'ANNUAL',
        startDate: elStart,
        endDate: elEnd,
        totalDays: elDays,
        reason: 'Family trip',
        status: 'APPROVED',
        appliedAt: addDays(elStart, -8),
        reviewedAt: addDays(elStart, -6),
      },
    ],
  });

  return [fmt(clStart), fmt(elStart), fmt(elEnd)];
}

function expandDateRange(start, end) {
  const dates = [];
  let d = new Date(start);
  while (d <= end) { dates.push(fmt(d)); d = addDays(d, 1); }
  return dates;
}

async function main() {
  const org = await prisma.organization.findFirst({ where: { name: 'DHA SUFFA UNIVERSITY' } });
  if (!org) throw new Error('Organization "DHA SUFFA UNIVERSITY" not found — run against the correct database');
  const owner = await prisma.user.findFirst({ where: { organizationId: org.id }, orderBy: { createdAt: 'asc' } });
  const holidays = await prisma.holiday.findMany({ where: { organizationId: org.id } });

  const users = await prisma.user.findMany({ where: { organizationId: org.id, isActive: true }, select: { id: true, firstName: true, lastName: true, managerId: true } });
  console.log(`\n=== Filling demo data for ${users.length} active users ===\n`);

  let attendanceCreated = 0;
  let usersGivenLeaves = 0;

  for (const user of users) {
    const existingLeaves = await prisma.leaveRequest.findMany({
      where: { employeeId: user.id, organizationId: org.id, status: 'APPROVED' },
      select: { startDate: true, endDate: true },
    });
    const leaveDateSet = new Set(existingLeaves.flatMap((l) => expandDateRange(l.startDate, l.endDate)));

    const newLeaveDates = await seedLeavesForUser(user, org, owner);
    if (newLeaveDates) {
      usersGivenLeaves += 1;
      newLeaveDates.forEach((d) => leaveDateSet.add(d));
    }

    const created = await seedAttendanceForUser(user, org, holidays, leaveDateSet);
    attendanceCreated += created;
  }

  console.log(`Attendance: ${attendanceCreated} new day-records created across ${users.length} users.`);
  console.log(`Leave history: ${usersGivenLeaves} users given 2 new historical APPROVED leaves (CL + EL) each.\n`);

  console.log('=== Re-running ETL for June + July 2026 (whole org) ===');
  for (const [month, year] of [[6, 2026], [7, 2026]]) {
    const result = await etlOrchestrator.runAll(month, year, org.id, { incremental: false });
    console.log(`  ${year}-${String(month).padStart(2, '0')}: ${result.status} (${result.totalRecords ?? 0} records, ${result.duration ?? '?'}s)`);
  }

  const perfCount = await prisma.performanceRecord.count({ where: { organizationId: org.id } });
  const attrCount = await prisma.attritionRecord.count({ where: { organizationId: org.id } });
  const attCount = await prisma.attendance.count({ where: { organizationId: org.id } });
  const leaveCount = await prisma.leaveRequest.count({ where: { organizationId: org.id } });

  console.log('\n' + '='.repeat(60));
  console.log('DONE — organization-wide totals now:');
  console.log(`  Attendance records:   ${attCount}`);
  console.log(`  Leave requests:       ${leaveCount}`);
  console.log(`  Performance records:  ${perfCount}`);
  console.log(`  Attrition records:    ${attrCount}`);
  console.log('='.repeat(60));

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Script crashed:', err);
  await prisma.$disconnect();
  process.exit(1);
});

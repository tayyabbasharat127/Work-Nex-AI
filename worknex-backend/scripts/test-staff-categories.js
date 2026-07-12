/**
 * Live verification for the Staff Category attendance rules:
 *  - category-scoped late threshold (falls back to env var when unset/no category)
 *  - "every N lates = 1 absence" conversion, running synchronously at check-in
 *  - non-blocking work-window flag
 *  - weekly hours-shortfall report
 *
 * Uses a throwaway department/category/users on the real org so it can run
 * against the live database safely. Cleans up everything in `finally`.
 *
 * Usage: node scripts/test-staff-categories.js
 */

const prisma = require('../src/config/db');
const { processCheckIn, processRecord } = require('../src/modules/attendance/attendance.processor');
const attendanceService = require('../src/modules/attendance/attendance.service');

const stamp = Date.now();
let pass = 0;
let fail = 0;

const check = (label, condition, detail = '') => {
  if (condition) {
    pass += 1;
    console.log(`  PASS  ${label}`);
  } else {
    fail += 1;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  }
};

const day = (y, m, d) => new Date(Date.UTC(y, m - 1, d));

async function main() {
  const org = await prisma.organization.findFirst();
  if (!org) throw new Error('No active organization found to test against');
  const organizationId = org.id;

  let category;
  let plainUser;
  let categoryUser;
  let originalSettings;

  try {
    console.log(`\nUsing organization: ${org.name} (${organizationId})\n`);

    const employeeRole = await prisma.role.findFirst({ where: { organizationId, tier: 'EMPLOYEE' } });
    if (!employeeRole) throw new Error('No EMPLOYEE role found for this organization');

    // ── Setup ────────────────────────────────────────────────────────────
    category = await prisma.staffCategory.create({
      data: {
        organizationId,
        name: `Test-NTS-${stamp}`,
        lateThresholdTime: '08:40',
        latesPerAbsence: 3,
        minHoursPerWeek: 40,
        minHoursPerDay: 8,
      },
    });

    categoryUser = await prisma.user.create({
      data: {
        organizationId,
        email: `test-nts-${stamp}@worknex.test`,
        passwordHash: 'x',
        firstName: 'Test',
        lastName: 'NTS',
        employeeId: `TNTS-${stamp}`,
        roleId: employeeRole.id,
        isActive: true,
        staffCategoryId: category.id,
      },
    });

    plainUser = await prisma.user.create({
      data: {
        organizationId,
        email: `test-plain-${stamp}@worknex.test`,
        passwordHash: 'x',
        firstName: 'Test',
        lastName: 'Plain',
        employeeId: `TPL-${stamp}`,
        roleId: employeeRole.id,
        isActive: true,
      },
    });

    originalSettings = await prisma.organizationSettings.findUnique({ where: { organizationId } });

    // ── Test 1: category threshold — 8:41 AM is LATE against "08:40" ──────
    const d1 = day(2026, 8, 3); // Monday
    const r1 = await processCheckIn({
      userId: categoryUser.id,
      organizationId,
      date: d1,
      checkInTime: new Date(Date.UTC(2026, 7, 3, 3, 41)), // 08:41 Asia/Karachi (UTC+5)
      source: 'WEB',
    });
    check('Category threshold: 08:41 check-in is LATE (threshold 08:40)', r1.status === 'LATE', r1.status);

    // ── Test 2: 2nd late this month — still LATE (not yet a multiple of 3) ─
    const d2 = day(2026, 8, 4);
    const r2 = await processCheckIn({
      userId: categoryUser.id,
      organizationId,
      date: d2,
      checkInTime: new Date(Date.UTC(2026, 7, 4, 3, 45)),
      source: 'WEB',
    });
    check('2nd late this month is still LATE', r2.status === 'LATE', r2.status);

    // ── Test 3: 3rd late this month — converts to ABSENT ───────────────────
    const d3 = day(2026, 8, 5);
    const r3 = await processCheckIn({
      userId: categoryUser.id,
      organizationId,
      date: d3,
      checkInTime: new Date(Date.UTC(2026, 7, 5, 3, 50)),
      source: 'WEB',
    });
    check('3rd late this month converts to ABSENT', r3.status === 'ABSENT', r3.status);
    check('ABSENT note references the category policy', (r3.notes || '').includes(category.name), r3.notes);

    // ── Test 4: no-category user still uses env-var fallback (9:30 default)
    const d4 = day(2026, 8, 3);
    const r4 = await processCheckIn({
      userId: plainUser.id,
      organizationId,
      date: d4,
      checkInTime: new Date(Date.UTC(2026, 7, 3, 3, 41)), // 08:41 — before default 09:30 threshold
      source: 'WEB',
    });
    check('No-category user at 08:41 is PRESENT (env-var default threshold 09:30 unaffected)', r4.status === 'PRESENT', r4.status);

    // ── Test 5: processRecord (TMS/biometric path) also applies 3-lates ───
    const catUser2 = await prisma.user.create({
      data: {
        organizationId,
        email: `test-nts2-${stamp}@worknex.test`,
        passwordHash: 'x',
        firstName: 'Test',
        lastName: 'NTS2',
        employeeId: `TNTS2-${stamp}`,
        roleId: employeeRole.id,
        isActive: true,
        staffCategoryId: category.id,
      },
    });
    for (const d of [day(2026, 9, 1), day(2026, 9, 2)]) {
      await processRecord({
        userId: catUser2.id,
        organizationId,
        date: d,
        checkIn: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 3, 50)),
        status: 'LATE',
        source: 'BIOMETRIC',
      });
    }
    const r5 = await processRecord({
      userId: catUser2.id,
      organizationId,
      date: day(2026, 9, 3),
      checkIn: new Date(Date.UTC(2026, 8, 3, 3, 50)),
      status: 'LATE',
      source: 'BIOMETRIC',
    });
    check('processRecord (biometric path) also converts 3rd late to ABSENT', r5.status === 'ABSENT', r5.status);

    // ── Test 6: work-window flag is non-blocking ───────────────────────────
    await prisma.organizationSettings.upsert({
      where: { organizationId },
      update: { attendancePolicyJson: { workWindowStart: '08:00', workWindowEnd: '18:00' } },
      create: { organizationId, attendancePolicyJson: { workWindowStart: '08:00', workWindowEnd: '18:00' } },
    });
    const outsideUser = await prisma.user.create({
      data: {
        organizationId,
        email: `test-outside-${stamp}@worknex.test`,
        passwordHash: 'x',
        firstName: 'Test',
        lastName: 'Outside',
        employeeId: `TOUT-${stamp}`,
        roleId: employeeRole.id,
        isActive: true,
      },
    });
    const r6 = await processCheckIn({
      userId: outsideUser.id,
      organizationId,
      date: day(2026, 8, 6),
      checkInTime: new Date(Date.UTC(2026, 7, 6, 14, 0)), // 19:00 Asia/Karachi — outside 8-6
      source: 'WEB',
    });
    check('Check-in outside work window still succeeds (never blocks)', r6.status === 'PRESENT' || r6.status === 'LATE');
    check('Check-in outside work window gets a non-blocking note', (r6.notes || '').includes('Outside configured work window'), r6.notes);

    // ── Test 7: weekly hours-shortfall report ──────────────────────────────
    const now = new Date();
    const utcDay = now.getUTCDay();
    const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - ((utcDay + 6) % 7)));
    const shortfallUser = await prisma.user.create({
      data: {
        organizationId,
        email: `test-shortfall-${stamp}@worknex.test`,
        passwordHash: 'x',
        firstName: 'Test',
        lastName: 'Shortfall',
        employeeId: `TSF-${stamp}`,
        roleId: employeeRole.id,
        isActive: true,
        staffCategoryId: category.id,
      },
    });
    await prisma.attendance.create({
      data: {
        organizationId,
        userId: shortfallUser.id,
        date: weekStart,
        checkIn: new Date(weekStart.getTime() + 3 * 3600 * 1000),
        checkOut: new Date(weekStart.getTime() + 8 * 3600 * 1000),
        workingHours: 5,
        status: 'PRESENT',
        source: 'WEB',
      },
    });
    const report = await attendanceService.getWeeklyHoursShortfall({ id: 'system', organizationId, role: 'ADMIN' });
    const row = report.find((r) => r.userId === shortfallUser.id);
    check('Hours-shortfall report includes under-target category user', Boolean(row), JSON.stringify(report.map((r) => r.userId)));
    check('Hours-shortfall shortfall math is correct (40 - 5 = 35)', row && row.shortfall === 35, row && row.shortfall);
    const plainInReport = report.find((r) => r.userId === plainUser.id);
    check('No-category user never appears in hours-shortfall report', !plainInReport);

    // ── Summary ─────────────────────────────────────────────────────────
    console.log(`\n${pass} passed, ${fail} failed\n`);
    if (fail > 0) process.exitCode = 1;
  } finally {
    // Cleanup — throwaway data only, restore org settings.
    const testUserIds = (await prisma.user.findMany({
      where: { organizationId, email: { contains: `-${stamp}@worknex.test` } },
      select: { id: true },
    })).map((u) => u.id);

    if (testUserIds.length) {
      await prisma.attendance.deleteMany({ where: { userId: { in: testUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: testUserIds } } });
    }
    if (category) {
      await prisma.staffCategory.deleteMany({ where: { id: category.id } });
    }
    if (originalSettings) {
      await prisma.organizationSettings.update({
        where: { organizationId },
        data: { attendancePolicyJson: originalSettings.attendancePolicyJson },
      });
    } else {
      await prisma.organizationSettings.deleteMany({ where: { organizationId } });
    }
    await prisma.$disconnect();
  }
}

main().catch(async (err) => {
  console.error('Test script crashed:', err);
  await prisma.$disconnect();
  process.exit(1);
});

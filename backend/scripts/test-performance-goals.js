/**
 * Live verification for the Goals + Performance Review system:
 *  - employee self-service goal CRUD
 *  - manager-created goals for direct reports (and access-control negative check)
 *  - non-creator edits are restricted to progress/status only
 *  - review lifecycle: draft -> update -> submit
 *  - team-status rollup and performance-summary math
 *
 * Uses throwaway manager/employee pairs on the real org so it can run safely
 * against the live database. Cleans up everything in `finally`.
 *
 * Usage: node scripts/test-performance-goals.js
 */

const prisma = require('../src/config/db');
const service = require('../src/modules/performance-goals/performance-goals.service');

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

async function main() {
  const org = await prisma.organization.findFirst();
  if (!org) throw new Error('No organization found to test against');
  const organizationId = org.id;

  let manager;
  let employee;
  let unrelatedEmployee;

  try {
    console.log(`\nUsing organization: ${org.name} (${organizationId})\n`);

    const managerRole = await prisma.role.findFirst({ where: { organizationId, tier: 'MANAGER' } });
    const employeeRole = await prisma.role.findFirst({ where: { organizationId, tier: 'EMPLOYEE' } });
    if (!managerRole || !employeeRole) throw new Error('MANAGER/EMPLOYEE roles not found for this organization');

    manager = await prisma.user.create({
      data: {
        organizationId, roleId: managerRole.id,
        email: `test-mgr-${stamp}@worknex.test`, passwordHash: 'x',
        firstName: 'Test', lastName: 'Manager', employeeId: `TMGR-${stamp}`, isActive: true,
      },
    });

    employee = await prisma.user.create({
      data: {
        organizationId, roleId: employeeRole.id, managerId: manager.id,
        email: `test-emp-${stamp}@worknex.test`, passwordHash: 'x',
        firstName: 'Test', lastName: 'Employee', employeeId: `TEMP-${stamp}`, isActive: true,
      },
    });

    unrelatedEmployee = await prisma.user.create({
      data: {
        organizationId, roleId: employeeRole.id,
        email: `test-unrelated-${stamp}@worknex.test`, passwordHash: 'x',
        firstName: 'Test', lastName: 'Unrelated', employeeId: `TUNR-${stamp}`, isActive: true,
      },
    });

    const managerReq = { id: manager.id, organizationId, role: 'MANAGER' };
    const employeeReq = { id: employee.id, organizationId, role: 'EMPLOYEE' };

    // ── Goals: employee self-service ───────────────────────────────────────
    const selfGoal = await service.createGoal({ title: 'Learn Prisma', metric: 'Ship a migration', progress: 10 }, employeeReq);
    check('Employee can create their own goal', selfGoal.userId === employee.id);

    const myGoals = await service.getMyGoals(employeeReq);
    check('getMyGoals returns the self-created goal', myGoals.some((g) => g.id === selfGoal.id));

    // ── Goals: manager creates for direct report ───────────────────────────
    const managerGoal = await service.createGoal(
      { title: 'Reduce bug backlog', metric: '< 5 open bugs', userId: employee.id },
      managerReq,
    );
    check('Manager can create a goal for a direct report', managerGoal.userId === employee.id && managerGoal.createdById === manager.id);

    // ── Access control: manager cannot touch an unrelated employee's goals ─
    let blocked = false;
    try {
      await service.createGoal({ title: 'Should fail', userId: unrelatedEmployee.id }, managerReq);
    } catch (err) {
      blocked = err.statusCode === 403 || /not authorized/i.test(err.message || '');
    }
    check('Manager is blocked from creating a goal for an unrelated employee', blocked);

    // ── Non-creator edit restriction ────────────────────────────────────────
    const editedByEmployee = await service.updateGoal(
      managerGoal.id,
      { title: 'Hijacked title', progress: 40, status: 'IN_PROGRESS' },
      employeeReq,
    );
    check('Non-creator (employee) progress update applies', editedByEmployee.progress === 40 && editedByEmployee.status === 'IN_PROGRESS');
    check('Non-creator (employee) cannot rewrite the title', editedByEmployee.title === 'Reduce bug backlog');

    // Manager (the creator) CAN edit the title
    const editedByManager = await service.updateGoal(managerGoal.id, { title: 'Reduce bug backlog to zero' }, managerReq);
    check('Creator (manager) can edit the title', editedByManager.title === 'Reduce bug backlog to zero');

    // Bring self-goal to 100% so the summary math below has two goals to average.
    await service.updateGoal(selfGoal.id, { progress: 100, status: 'COMPLETED' }, employeeReq);

    // ── Reviews: draft -> update -> submit ─────────────────────────────────
    const cycle = `Test-Cycle-${stamp}`;
    const review = await service.createReview({ userId: employee.id, cycle }, managerReq);
    check('Review created as DRAFT', review.status === 'DRAFT');

    const updatedReview = await service.updateReview(review.id, { managerRating: 4, managerComments: 'Solid quarter' }, managerReq);
    check('Review rating/comments update while DRAFT', updatedReview.managerRating === 4 && updatedReview.managerComments === 'Solid quarter');

    let cannotSubmitWithoutRating = false;
    try {
      const ratinglessReview = await service.createReview({ userId: employee.id, cycle: `${cycle}-B` }, managerReq);
      await service.submitReview(ratinglessReview.id, managerReq);
    } catch (err) {
      cannotSubmitWithoutRating = err.statusCode === 400;
    }
    check('Cannot submit a review with no rating set', cannotSubmitWithoutRating);

    const submitted = await service.submitReview(review.id, managerReq);
    check('Review submits successfully once rated', submitted.status === 'SUBMITTED' && submitted.submittedAt != null);

    let cannotEditAfterSubmit = false;
    try {
      await service.updateReview(review.id, { managerRating: 2 }, managerReq);
    } catch (err) {
      cannotEditAfterSubmit = err.statusCode === 409;
    }
    check('Cannot edit a review after it is submitted', cannotEditAfterSubmit);

    // ── Team status rollup ──────────────────────────────────────────────────
    const teamStatus = await service.getTeamStatus(managerReq);
    check('Team status includes at least 1 SUBMITTED review', teamStatus.SUBMITTED >= 1, JSON.stringify(teamStatus));

    // ── Performance summary math ────────────────────────────────────────────
    const summary = await service.getPerformanceSummary(employee.id, managerReq);
    // Two goals: selfGoal=100, managerGoal=40 (from the employee's own edit) -> avg = 70
    const expectedGoalAvg = Math.round((100 + 40) / 2);
    // One SUBMITTED review with rating 4 (the second review was never submitted)
    const expectedRatingAvg = 4;
    const expectedOverall = Math.round(expectedGoalAvg * 0.6 + (expectedRatingAvg / 5) * 100 * 0.4);
    check('avgGoalCompletion matches hand-computed value', summary.avgGoalCompletion === expectedGoalAvg, `got ${summary.avgGoalCompletion}, expected ${expectedGoalAvg}`);
    check('avgManagerRating matches hand-computed value', summary.avgManagerRating === expectedRatingAvg, `got ${summary.avgManagerRating}, expected ${expectedRatingAvg}`);
    check('overallPerformanceScore matches hand-computed formula', summary.overallPerformanceScore === expectedOverall, `got ${summary.overallPerformanceScore}, expected ${expectedOverall}`);

    // ── Summary/goal access control: unrelated manager path already covered above;
    // confirm self-access always works regardless of role quirks in canAccessUser.
    const selfSummary = await service.getPerformanceSummary(employee.id, employeeReq);
    check('Employee can fetch their own summary', selfSummary.avgGoalCompletion === expectedGoalAvg);

    console.log(`\n${pass} passed, ${fail} failed\n`);
    if (fail > 0) process.exitCode = 1;
  } finally {
    const testUserIds = [manager, employee, unrelatedEmployee].filter(Boolean).map((u) => u.id);
    if (testUserIds.length) {
      await prisma.performanceReview.deleteMany({ where: { OR: [{ userId: { in: testUserIds } }, { managerId: { in: testUserIds } }] } });
      await prisma.goal.deleteMany({ where: { userId: { in: testUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: testUserIds } } });
    }
    await prisma.$disconnect();
  }
}

main().catch(async (err) => {
  console.error('Test script crashed:', err);
  await prisma.$disconnect();
  process.exit(1);
});

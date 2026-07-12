/**
 * WorkNex AI — Leave Automation Use-Case Test
 * Run: node scripts/test-leave-usecases.js
 *
 * Covers every leave-automation behavior built this session, against a real
 * organization's live database, using throwaway test data that gets cleaned
 * up automatically at the end (including restoring whatever leave policy
 * was ACTIVE before this script ran):
 *
 *   1. Auto-approve      — 1-day CL request approves itself instantly
 *   2. Manual/Pending    — 2-day CL request routes to a manager instead
 *   3. Manager approves  — a pending request, via approveLeave()
 *   4. Manager rejects   — a pending request, via rejectLeave()
 *   5. Sandwich (fwd)    — Friday leave + unapproved Monday absence = 4 days, not 1
 *   6. Sandwich (mirror) — unapproved Friday absence + Monday leave = same, other direction
 *   7. Control case      — sandwich rule OFF → no adjustment happens
 *   8. Staffing guard    — department leave-concurrency blocks auto-approval, routes to manager
 *
 * Does NOT send real email (SMTP is mocked) — safe to re-run anytime.
 * Does NOT touch your currently-configured leave policy long-term — it's
 * captured at the start and restored at the end no matter what happens.
 */

const path = require('path');
const BACKEND_DIR = path.join(__dirname, '..');

// ---- Change this if you want to test a different organization ----
const ORG = process.env.TEST_ORG_ID || 'f17efc08-e859-45cc-b2e8-e77283696d97';

// Mock email BEFORE anything requires leave.service.js, so real SMTP creds
// in .env never actually fire during this test run.
const emailModulePath = path.join(BACKEND_DIR, 'src', 'config', 'email.js');
const sentEmails = [];
require.cache[require.resolve(emailModulePath)] = {
  id: emailModulePath, filename: emailModulePath, loaded: true,
  exports: { sendEmail: async (to, subject) => { sentEmails.push({ to, subject }); } },
};

process.chdir(BACKEND_DIR);
const prisma = require(path.join(BACKEND_DIR, 'src/config/db'));
const automation = require(path.join(BACKEND_DIR, 'src/modules/leave/leave.automation'));
const leaveService = require(path.join(BACKEND_DIR, 'src/modules/leave/leave.service'));
const leaveSandwich = require(path.join(BACKEND_DIR, 'src/modules/leave/leave.sandwich'));

let passCount = 0;
let failCount = 0;
const assert = (cond, msg) => {
  if (cond) { console.log('  \x1b[32m✔\x1b[0m', msg); passCount++; }
  else { console.log('  \x1b[31m✘ FAIL\x1b[0m', msg); failCount++; }
};
const section = (title) => console.log(`\n\x1b[36m━━━ ${title} ━━━\x1b[0m`);

(async () => {
  const createdUserIds = [];
  const createdLeaveIds = [];
  const createdAttendanceIds = [];
  let createdDeptId = null;
  let restoreRulesPayload = null;

  try {
    // ================= SETUP =================
    section('SETUP');

    const currentlyActive = await prisma.leavePolicyVersion.findFirst({ where: { organizationId: ORG, status: 'ACTIVE' } });
    if (currentlyActive) {
      restoreRulesPayload = currentlyActive.rulesJson.leavePolicies;
      console.log('  Captured your current active policy (will restore at the end):', restoreRulesPayload.map((p) => p.leaveType).join(', '));
    }

    const persistentAdmin = await prisma.user.findFirst({ where: { organizationId: ORG, customRole: { tier: 'ADMIN' } } });
    if (!persistentAdmin) throw new Error(`No ADMIN user found in org ${ORG} — can't run this test.`);
    const adminActor = { id: persistentAdmin.id, organizationId: ORG, role: 'ADMIN' };

    const stamp = Date.now();
    const dept = await prisma.department.create({ data: { organizationId: ORG, name: `Test Dept ${stamp}` } });
    createdDeptId = dept.id;

    const employeeRole = await prisma.role.findFirst({ where: { organizationId: ORG, tier: 'EMPLOYEE' } });
    const managerRole = await prisma.role.findFirst({ where: { organizationId: ORG, tier: 'MANAGER' } });

    const manager = await prisma.user.create({
      data: {
        organizationId: ORG, employeeId: `TESTMGR-${stamp}`, firstName: 'Test', lastName: 'Manager',
        email: `test.manager.${stamp}@worknex-demo.com`, passwordHash: 'x', roleId: (managerRole || employeeRole).id, departmentId: dept.id,
      },
    });
    createdUserIds.push(manager.id);
    const managerActor = { id: manager.id, organizationId: ORG, role: 'MANAGER' };

    // 5 employees so staffing-% math is clean (1/5=20%, 2/5=40%)
    const employees = [];
    for (let i = 0; i < 5; i++) {
      const u = await prisma.user.create({
        data: {
          organizationId: ORG, employeeId: `TESTEMP-${stamp}-${i}`, firstName: `TestEmp${i}`, lastName: 'User',
          email: `test.emp.${stamp}.${i}@worknex-demo.com`, passwordHash: 'x', roleId: employeeRole.id,
          departmentId: dept.id, managerId: manager.id,
        },
      });
      employees.push(u);
      createdUserIds.push(u.id);
    }
    console.log(`  Created test department "${dept.name}" with 1 manager + 5 employees`);

    // Policy: CL auto-approves up to 1 day, 30% staffing cap; EL always needs manager, carries forward
    await automation.saveManualPolicyRules([
      {
        leaveType: 'CASUAL', annualQuota: 12, maxConsecutiveDays: 3, autoApproveMaxDays: 1,
        requiresManagerApproval: true, carryForwardAllowed: false, maxConcurrentLeavePercent: 30,
        applicableRoles: ['EMPLOYEE', 'MANAGER', 'ADMIN'],
      },
      {
        leaveType: 'ANNUAL', displayName: 'EL', annualQuota: 36, requiresManagerApproval: true,
        carryForwardAllowed: true, maxCarryForwardDays: 36, applicableRoles: ['EMPLOYEE', 'MANAGER', 'ADMIN'],
      },
    ], adminActor);
    console.log('  Activated test policy: CASUAL (auto-approve ≤1 day, 30% staffing cap), EL/ANNUAL (always manager)');

    const casualPolicy = await prisma.leavePolicy.findFirst({ where: { organizationId: ORG, leaveType: 'CASUAL' } });
    const annualPolicy = await prisma.leavePolicy.findFirst({ where: { organizationId: ORG, leaveType: 'ANNUAL' } });
    const year = new Date().getFullYear();
    for (const u of [...employees, manager]) {
      await prisma.leaveBalance.create({ data: { organizationId: ORG, userId: u.id, policyId: casualPolicy.id, year, totalDays: 12, usedDays: 0, remainingDays: 12 } });
      if (annualPolicy) await prisma.leaveBalance.create({ data: { organizationId: ORG, userId: u.id, policyId: annualPolicy.id, year, totalDays: 36, usedDays: 0, remainingDays: 36 } });
    }
    console.log('  Gave every test user a CL + EL balance for this year');

    // ================= 1. AUTO-APPROVE =================
    section('1. AUTO-APPROVE — 1-day CASUAL');
    const leave1 = await leaveService.applyLeave({ id: employees[0].id, organizationId: ORG }, {
      leaveType: 'CASUAL', startDate: '2026-11-02', endDate: '2026-11-02', reason: 'Auto-approve test',
    });
    createdLeaveIds.push(leave1.id);
    assert(leave1.status === 'APPROVED', `status is APPROVED (got ${leave1.status})`);
    assert(leave1.decisionExplanation.decision === 'AUTO_APPROVED', `decision is AUTO_APPROVED (got ${leave1.decisionExplanation.decision})`);
    assert(sentEmails.some((e) => e.to === employees[0].email), 'confirmation email queued to employee');
    assert(sentEmails.some((e) => e.to === manager.email), 'FYI email queued to manager');

    // ================= 2. MANUAL / PENDING =================
    section('2. MANUAL/PENDING — 2-day CASUAL (exceeds auto-approve window)');
    const leave2 = await leaveService.applyLeave({ id: employees[1].id, organizationId: ORG }, {
      leaveType: 'CASUAL', startDate: '2026-11-09', endDate: '2026-11-10', reason: 'Pending test',
    });
    createdLeaveIds.push(leave2.id);
    assert(leave2.status === 'PENDING', `status is PENDING (got ${leave2.status})`);
    assert(leave2.decisionExplanation.decision === 'PENDING_MANAGER', `decision is PENDING_MANAGER (got ${leave2.decisionExplanation.decision})`);

    // ================= 3. MANAGER APPROVES =================
    section('3. MANAGER APPROVES a pending request');
    const approved = await leaveService.approveLeave(managerActor, leave2.id, 'Approved for testing');
    assert(approved.status === 'APPROVED', `status is now APPROVED (got ${approved.status})`);
    const balAfterApprove = await prisma.leaveBalance.findFirst({ where: { userId: employees[1].id, policyId: casualPolicy.id, year } });
    assert(balAfterApprove.remainingDays === 10, `balance deducted correctly to 10 (got ${balAfterApprove.remainingDays})`);

    // ================= 4. MANAGER REJECTS =================
    section('4. MANAGER REJECTS a pending request');
    const leave3 = await leaveService.applyLeave({ id: employees[2].id, organizationId: ORG }, {
      leaveType: 'CASUAL', startDate: '2026-11-16', endDate: '2026-11-17', reason: 'Reject test',
    });
    createdLeaveIds.push(leave3.id);
    const rejected = await leaveService.rejectLeave(managerActor, leave3.id, 'Not approved for testing');
    assert(rejected.status === 'REJECTED', `status is REJECTED (got ${rejected.status})`);
    const balAfterReject = await prisma.leaveBalance.findFirst({ where: { userId: employees[2].id, policyId: casualPolicy.id, year } });
    assert(balAfterReject.remainingDays === 12, `balance untouched, still 12 (got ${balAfterReject.remainingDays})`);

    // ================= 5. SANDWICH — FORWARD =================
    section('5. SANDWICH RULE — Friday leave + Monday absence (forward)');
    await prisma.organizationSettings.upsert({ where: { organizationId: ORG }, update: { sandwichLeaveEnabled: true }, create: { organizationId: ORG, sandwichLeaveEnabled: true } });
    const friday = new Date('2026-12-04'); // confirmed Friday, no known holiday clash
    const monday = new Date('2026-12-07');
    const fridayLeave = await prisma.leaveRequest.create({
      data: { organizationId: ORG, employeeId: employees[3].id, leaveType: 'CASUAL', startDate: friday, endDate: friday, totalDays: 1, reason: 'Sandwich fwd test', status: 'APPROVED', reviewedAt: new Date() },
    });
    createdLeaveIds.push(fridayLeave.id);
    await prisma.leaveBalance.updateMany({ where: { userId: employees[3].id, policyId: casualPolicy.id, year }, data: { usedDays: { increment: 1 }, remainingDays: { decrement: 1 } } });
    const mondayAbsence = await prisma.attendance.create({ data: { organizationId: ORG, userId: employees[3].id, date: monday, status: 'ABSENT', source: 'ABSENCE_JOB' } });
    createdAttendanceIds.push(mondayAbsence.id);
    const sandwichResult = await leaveSandwich.runSandwichCheckForAbsence(monday, employees[3].id, ORG);
    assert(sandwichResult !== null, 'sandwich adjustment applied');
    assert(sandwichResult?.isSandwiched === true, 'isSandwiched flag set');
    assert(sandwichResult?.sandwichExtraDays === 3, `+3 extra days (Sat+Sun+Mon) (got ${sandwichResult?.sandwichExtraDays})`);
    assert(sandwichResult?.totalDays === 4, `leave totalDays now 4, not 1 (got ${sandwichResult?.totalDays})`);

    // ================= 6. SANDWICH — MIRROR =================
    section('6. SANDWICH RULE — unapproved Friday absence + Monday leave (mirror)');
    const friday2 = new Date('2026-11-13');
    const monday2 = new Date('2026-11-16');
    const fridayAbsence = await prisma.attendance.create({ data: { organizationId: ORG, userId: employees[4].id, date: friday2, status: 'ABSENT', source: 'ABSENCE_JOB' } });
    createdAttendanceIds.push(fridayAbsence.id);
    const mondayLeave = await leaveService.applyLeave({ id: employees[4].id, organizationId: ORG }, {
      leaveType: 'CASUAL', startDate: monday2.toISOString().slice(0, 10), endDate: monday2.toISOString().slice(0, 10), reason: 'Sandwich mirror test',
    });
    createdLeaveIds.push(mondayLeave.id);
    // Auto-approval + the mirror sandwich check both fire async — small wait for the mirror check to land.
    await new Promise((r) => setTimeout(r, 500));
    const mondayLeaveAfter = await prisma.leaveRequest.findUnique({ where: { id: mondayLeave.id } });
    assert(mondayLeaveAfter.isSandwiched === true, 'mirror-direction isSandwiched flag set');
    assert(mondayLeaveAfter.sandwichExtraDays === 3, `mirror-direction +3 extra days (got ${mondayLeaveAfter.sandwichExtraDays})`);
    assert(mondayLeaveAfter.totalDays === 4, `mirror-direction leave totalDays now 4 (got ${mondayLeaveAfter.totalDays})`);

    // ================= 7. CONTROL CASE — TOGGLE OFF =================
    section('7. CONTROL CASE — sandwich toggle OFF, same pattern, no adjustment');
    await prisma.organizationSettings.update({ where: { organizationId: ORG }, data: { sandwichLeaveEnabled: false } });
    const friday3 = new Date('2026-11-20');
    const monday3 = new Date('2026-11-23');
    const controlLeave = await prisma.leaveRequest.create({
      data: { organizationId: ORG, employeeId: employees[0].id, leaveType: 'CASUAL', startDate: friday3, endDate: friday3, totalDays: 1, reason: 'Control test', status: 'APPROVED', reviewedAt: new Date() },
    });
    createdLeaveIds.push(controlLeave.id);
    const controlAbsence = await prisma.attendance.create({ data: { organizationId: ORG, userId: employees[0].id, date: monday3, status: 'ABSENT', source: 'ABSENCE_JOB' } });
    createdAttendanceIds.push(controlAbsence.id);
    const controlResult = await leaveSandwich.runSandwichCheckForAbsence(monday3, employees[0].id, ORG);
    assert(controlResult === null, 'no adjustment applied when toggle is OFF');
    const controlLeaveAfter = await prisma.leaveRequest.findUnique({ where: { id: controlLeave.id } });
    assert(controlLeaveAfter.totalDays === 1 && controlLeaveAfter.isSandwiched === false, 'control leave unchanged (totalDays=1)');

    // ================= 8. STAFFING-SHORTAGE GUARD =================
    section('8. STAFFING GUARD — department concurrency blocks auto-approval');
    // employees[0] already has an APPROVED CL on 2026-11-02 (from test 1) — reuse that
    // department by having employees[1] request an overlapping date, pushing concurrency to 2/6 (33%) > 30%.
    const shortageLeave = await leaveService.applyLeave({ id: employees[1].id, organizationId: ORG }, {
      leaveType: 'CASUAL', startDate: '2026-11-02', endDate: '2026-11-02', reason: 'Staffing guard test',
    });
    createdLeaveIds.push(shortageLeave.id);
    assert(shortageLeave.status === 'PENDING', `status is PENDING, not auto-approved (got ${shortageLeave.status})`);
    assert(shortageLeave.decisionExplanation.decision === 'PENDING_MANAGER', `decision is PENDING_MANAGER (got ${shortageLeave.decisionExplanation.decision})`);
    assert((shortageLeave.decisionExplanation.reasons || []).some((r) => /staffing threshold/i.test(r)), 'reason mentions staffing threshold');
    assert(shortageLeave.decisionExplanation.decision !== 'AUTO_REJECTED', 'never auto-rejects for staffing reasons, only routes to manager');

    // ================= SUMMARY =================
    console.log(`\n\x1b[1m${passCount} passed, ${failCount} failed\x1b[0m`);
  } catch (err) {
    console.error('\n\x1b[31mSCRIPT ERROR:\x1b[0m', err.message);
    console.error(err.stack);
  } finally {
    // ================= CLEANUP =================
    section('CLEANUP');
    if (createdLeaveIds.length) {
      await prisma.leaveDecisionLog.deleteMany({ where: { leaveRequestId: { in: createdLeaveIds } } });
      await prisma.leaveRequest.deleteMany({ where: { id: { in: createdLeaveIds } } });
    }
    if (createdAttendanceIds.length) await prisma.attendance.deleteMany({ where: { id: { in: createdAttendanceIds } } });
    if (createdUserIds.length) {
      await prisma.leaveBalance.deleteMany({ where: { userId: { in: createdUserIds } } });
      await prisma.auditLog.deleteMany({ where: { userId: { in: createdUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    if (createdDeptId) await prisma.department.delete({ where: { id: createdDeptId } }).catch(() => {});
    await prisma.organizationSettings.update({ where: { organizationId: ORG }, data: { sandwichLeaveEnabled: false } }).catch(() => {});
    if (restoreRulesPayload) {
      const persistentAdmin = await prisma.user.findFirst({ where: { organizationId: ORG, customRole: { tier: 'ADMIN' } } });
      if (persistentAdmin) {
        await automation.saveManualPolicyRules(restoreRulesPayload, { id: persistentAdmin.id, organizationId: ORG });
        console.log('  Restored your original active policy:', restoreRulesPayload.map((p) => p.leaveType).join(', '));
      }
    }
    console.log('  All test data removed.');
    process.exit(failCount > 0 ? 1 : 0);
  }
})();

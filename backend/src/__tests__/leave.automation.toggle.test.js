/**
 * Leave submission — OrganizationSettings.leaveAutomationEnabled toggle
 *
 * Verifies applyLeave() actually gates automatic evaluation on this flag
 * instead of always invoking automation.evaluateLeaveRequest(). Requires a
 * real database — run with RUN_DB_TESTS=true.
 */

const prisma = require('../config/db');
const leaveService = require('../modules/leave/leave.service');

const describeDatabase = process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip;

// Picks an ISO date string, starting `offsetDays` out, that
// leave.service.js's countBusinessDays (new Date(isoString).getDay(), in the
// server's local timezone) will treat as a Mon-Fri working day — avoids
// hardcoding a weekday that shifts under UTC/local date-parsing offsets.
const pickWeekdayIso = (offsetDays) => {
  const base = new Date();
  for (let i = offsetDays; i < offsetDays + 14; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    const str = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dow = new Date(str).getDay();
    if (dow >= 1 && dow <= 5) return str;
  }
  throw new Error('Could not find a weekday in range');
};

describeDatabase('leave automation toggle', () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  let organization;
  let employeeRole;
  let managerRole;
  let manager;
  let employeeWithManager;
  let employeeWithoutManager;
  let policy;

  const grantBalance = (userId) => prisma.leaveBalance.create({
    data: {
      organizationId: organization.id,
      userId,
      policyId: policy.id,
      year: new Date().getFullYear(),
      totalDays: 10,
      usedDays: 0,
      remainingDays: 10,
    },
  });

  beforeAll(async () => {
    organization = await prisma.organization.create({
      data: { name: `Leave Toggle Test ${suffix}`, slug: `leave-toggle-${suffix}` },
    });
    managerRole = await prisma.role.create({
      data: { organizationId: organization.id, name: `Manager ${suffix}`, tier: 'MANAGER', permissions: [], isSystem: true },
    });
    employeeRole = await prisma.role.create({
      data: { organizationId: organization.id, name: `Employee ${suffix}`, tier: 'EMPLOYEE', permissions: [], isSystem: true },
    });
    manager = await prisma.user.create({
      data: {
        organizationId: organization.id, employeeId: `MGR-${suffix}`, firstName: 'Mona', lastName: 'Manager',
        email: `mona-${suffix}@example.test`, passwordHash: 'x', roleId: managerRole.id,
      },
    });
    employeeWithManager = await prisma.user.create({
      data: {
        organizationId: organization.id, employeeId: `EMP-${suffix}`, firstName: 'Ed', lastName: 'Employee',
        email: `ed-${suffix}@example.test`, passwordHash: 'x', roleId: employeeRole.id, managerId: manager.id,
      },
    });
    employeeWithoutManager = await prisma.user.create({
      data: {
        organizationId: organization.id, employeeId: `EMP2-${suffix}`, firstName: 'Nia', lastName: 'NoManager',
        email: `nia-${suffix}@example.test`, passwordHash: 'x', roleId: employeeRole.id,
      },
    });
    policy = await prisma.leavePolicy.create({
      data: {
        organizationId: organization.id, leaveType: 'CASUAL', totalDays: 10,
        applicableRoleIds: [employeeRole.id, managerRole.id],
      },
    });
    await grantBalance(employeeWithManager.id);
    await grantBalance(employeeWithoutManager.id);
  });

  afterAll(async () => {
    await prisma.leaveDecisionLog.deleteMany({ where: { organizationId: organization.id } }).catch(() => {});
    await prisma.leaveRequest.deleteMany({ where: { organizationId: organization.id } }).catch(() => {});
    await prisma.leaveBalance.deleteMany({ where: { organizationId: organization.id } }).catch(() => {});
    await prisma.leavePolicy.deleteMany({ where: { organizationId: organization.id } }).catch(() => {});
    await prisma.organizationSettings.deleteMany({ where: { organizationId: organization.id } }).catch(() => {});
    await prisma.user.deleteMany({ where: { organizationId: organization.id } }).catch(() => {});
    await prisma.role.deleteMany({ where: { organizationId: organization.id } }).catch(() => {});
    await prisma.organization.delete({ where: { id: organization.id } }).catch(() => {});
    await prisma.$disconnect();
  });

  test('toggle ON (default): automation evaluates the request and logs a decision', async () => {
    await prisma.organizationSettings.upsert({
      where: { organizationId: organization.id },
      update: { leaveAutomationEnabled: true },
      create: { organizationId: organization.id, leaveAutomationEnabled: true },
    });

    const date = pickWeekdayIso(10);
    const leave = await leaveService.applyLeave(
      { id: employeeWithManager.id, organizationId: organization.id },
      { leaveType: 'CASUAL', startDate: date, endDate: date, reason: 'Automation on' },
    );

    expect(leave.status).toBe('PENDING_MANAGER');
    const decisionLog = await prisma.leaveDecisionLog.findFirst({ where: { leaveRequestId: leave.id } });
    expect(decisionLog).not.toBeNull();
  });

  test('toggle OFF: no automation evaluation runs, standard hierarchy applies (manager present)', async () => {
    await prisma.organizationSettings.upsert({
      where: { organizationId: organization.id },
      update: { leaveAutomationEnabled: false },
      create: { organizationId: organization.id, leaveAutomationEnabled: false },
    });

    const date = pickWeekdayIso(17);
    const leave = await leaveService.applyLeave(
      { id: employeeWithManager.id, organizationId: organization.id },
      { leaveType: 'CASUAL', startDate: date, endDate: date, reason: 'Automation off' },
    );

    expect(leave.status).toBe('PENDING_MANAGER');
    expect(leave.approverId).toBe(manager.id);
    const decisionLog = await prisma.leaveDecisionLog.findFirst({ where: { leaveRequestId: leave.id } });
    expect(decisionLog).toBeNull();

    const notification = await prisma.notification.findFirst({
      where: { userId: manager.id, type: 'LEAVE_APPLIED', title: 'New Leave Request' },
      orderBy: { createdAt: 'desc' },
    });
    expect(notification).not.toBeNull();
  });

  test('toggle OFF: employee with no manager routes straight to admin review, still no decision log', async () => {
    await prisma.organizationSettings.upsert({
      where: { organizationId: organization.id },
      update: { leaveAutomationEnabled: false },
      create: { organizationId: organization.id, leaveAutomationEnabled: false },
    });

    const date = pickWeekdayIso(24);
    const leave = await leaveService.applyLeave(
      { id: employeeWithoutManager.id, organizationId: organization.id },
      { leaveType: 'CASUAL', startDate: date, endDate: date, reason: 'Automation off, no manager' },
    );

    expect(leave.status).toBe('PENDING_ADMIN');
    expect(leave.approverId).toBeNull();
    const decisionLog = await prisma.leaveDecisionLog.findFirst({ where: { leaveRequestId: leave.id } });
    expect(decisionLog).toBeNull();
  });

  test('sandwich-leave setting is untouched by the automation toggle', async () => {
    const settings = await prisma.organizationSettings.findUnique({ where: { organizationId: organization.id } });
    expect(settings.leaveAutomationEnabled).toBe(false);
    expect(settings.sandwichLeaveEnabled).toBe(false);
  });
});

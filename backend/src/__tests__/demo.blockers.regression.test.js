const prisma = require('../config/db');
const analyticsService = require('../modules/analytics/analytics.service');
const leaveService = require('../modules/leave/leave.service');
const usersService = require('../modules/users/users.service');
const { navigationMetadata } = require('../modules/notifications/notification.service');

describe('notification navigation metadata', () => {
  test('uses safe role-aware internal targets', () => {
    expect(navigationMetadata('LEAVE_APPROVED', 'EMPLOYEE')).toMatchObject({
      action: 'VIEW',
      targetRoute: '/dashboard/employee/leaves',
      deepLink: '/dashboard/employee/leaves',
    });
    expect(navigationMetadata('SYSTEM', 'ADMIN', { targetRoute: 'https://unsafe.example' }).targetRoute)
      .toBe('/dashboard/admin');
  });
});

const describeDatabase = process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip;

describeDatabase('demo blocker database regressions', () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  let organization;
  let adminRole;
  let employeeRole;
  let department;
  let admin;
  let employee;

  beforeAll(async () => {
    organization = await prisma.organization.create({
      data: { name: `Blocker Regression ${suffix}`, slug: `blocker-regression-${suffix}` },
    });
    [adminRole, employeeRole] = await Promise.all([
      prisma.role.create({ data: { organizationId: organization.id, name: 'Admin', tier: 'ADMIN', permissions: ['users:manage'], isSystem: true } }),
      prisma.role.create({ data: { organizationId: organization.id, name: 'Employee', tier: 'EMPLOYEE', permissions: [], isSystem: true } }),
    ]);
    department = await prisma.department.create({ data: { organizationId: organization.id, name: 'Regression Department' } });
    admin = await prisma.user.create({
      data: {
        organizationId: organization.id,
        employeeId: `ADM-${suffix}`,
        firstName: 'Admin',
        lastName: 'Regression',
        email: `admin-${suffix}@example.test`,
        passwordHash: 'not-used',
        roleId: adminRole.id,
        departmentId: department.id,
      },
    });
    employee = await prisma.user.create({
      data: {
        organizationId: organization.id,
        employeeId: `EMP-${suffix}`,
        firstName: 'Employee',
        lastName: 'Regression',
        email: `employee-${suffix}@example.test`,
        passwordHash: 'not-used',
        roleId: employeeRole.id,
        departmentId: department.id,
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await prisma.attendance.createMany({ data: [
      { organizationId: organization.id, userId: admin.id, date: today, status: 'PRESENT', source: 'MANUAL' },
      { organizationId: organization.id, userId: employee.id, date: today, status: 'PRESENT', source: 'MANUAL' },
    ] });

    const policy = await prisma.leavePolicy.create({
      data: {
        organizationId: organization.id,
        leaveType: 'ANNUAL',
        totalDays: 5,
        carryForward: false,
        maxCarryForward: 0,
        applicableRoleIds: [employeeRole.id],
      },
    });
    await prisma.leaveBalance.create({
      data: {
        organizationId: organization.id,
        userId: employee.id,
        policyId: policy.id,
        year: new Date().getFullYear(),
        totalDays: 5,
        remainingDays: 5,
      },
    });
  });

  afterAll(async () => {
    if (organization) {
      await prisma.user.updateMany({ where: { organizationId: organization.id }, data: { departmentId: null, managerId: null } }).catch(() => {});
      await prisma.user.deleteMany({ where: { organizationId: organization.id } }).catch(() => {});
      await prisma.leaveBalance.deleteMany({ where: { organizationId: organization.id } }).catch(() => {});
      await prisma.leavePolicy.deleteMany({ where: { organizationId: organization.id } }).catch(() => {});
      await prisma.department.deleteMany({ where: { organizationId: organization.id } }).catch(() => {});
      await prisma.role.deleteMany({ where: { organizationId: organization.id } }).catch(() => {});
      await prisma.organization.delete({ where: { id: organization.id } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  test('employee-only KPI population cannot exceed 100 percent', async () => {
    const result = await analyticsService.getDashboardKPIs({ id: admin.id, organizationId: organization.id, role: 'ADMIN' });
    expect(result).toMatchObject({ totalEmployees: 1, activeToday: 1, attendanceRate: 100 });
  });

  test('department chart excludes non-employee attendance and zero-filled departments', async () => {
    const today = new Date();
    const rows = await analyticsService.getDepartmentAttendance(today.getMonth() + 1, today.getFullYear(), {
      id: admin.id,
      organizationId: organization.id,
      role: 'ADMIN',
    });
    expect(rows).toEqual([{ department: 'Regression Department', present: 1, absent: 0, total: 1, rate: 100 }]);
  });

  test('normal leave cannot exceed available allocation', async () => {
    const year = new Date().getFullYear();
    await expect(leaveService.applyLeave(
      { id: employee.id, organizationId: organization.id, role: 'EMPLOYEE' },
      { leaveType: 'ANNUAL', startDate: `${year}-11-02`, endDate: `${year}-11-30`, reason: 'Impossible oversized request' },
    )).rejects.toMatchObject({ statusCode: 400 });
  });

  test('department deletion returns 409 while inactive users still reference it', async () => {
    await prisma.user.updateMany({ where: { organizationId: organization.id }, data: { isActive: false } });
    await expect(usersService.deleteDepartment(department.id, {
      id: admin.id,
      organizationId: organization.id,
      role: 'ADMIN',
    })).rejects.toMatchObject({ statusCode: 409 });
  });
});

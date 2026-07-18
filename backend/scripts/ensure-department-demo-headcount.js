/**
 * Idempotently ensures that every department in the configured demo
 * organization has at least TARGET_EMPLOYEES active EMPLOYEE-tier users.
 * Existing users are preserved; only the shortfall is created.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../src/config/db');

const ORGANIZATION_NAME = process.env.DEMO_ORGANIZATION_NAME || 'DHA SUFFA UNIVERSITY';
const TARGET_EMPLOYEES = Number.parseInt(process.env.DEMO_EMPLOYEES_PER_DEPARTMENT || '30', 10);

const FIRST_NAMES = [
  'Adeel', 'Ahmed', 'Aiman', 'Ali', 'Alina', 'Amna', 'Anum', 'Arham', 'Ayesha', 'Bilal',
  'Danish', 'Eman', 'Fahad', 'Farah', 'Fatima', 'Haris', 'Hina', 'Hamza', 'Iqra', 'Junaid',
  'Komal', 'Laiba', 'Mariam', 'Mehak', 'Nida', 'Noor', 'Omer', 'Rabia', 'Rida', 'Saad',
  'Sana', 'Sara', 'Talha', 'Usman', 'Warda', 'Yasir', 'Zain', 'Zara', 'Zeeshan', 'Zoya',
];
const LAST_NAMES = [
  'Abbasi', 'Ahmed', 'Ali', 'Ansari', 'Aziz', 'Baig', 'Farooq', 'Ghani', 'Hameed', 'Hashmi',
  'Iqbal', 'Khan', 'Malik', 'Mehmood', 'Qureshi', 'Rashid', 'Raza', 'Shah', 'Sheikh', 'Siddiqui',
];

const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24);
const codeFor = (value) => value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'DEPT';

const main = async () => {
  if (!Number.isInteger(TARGET_EMPLOYEES) || TARGET_EMPLOYEES < 1 || TARGET_EMPLOYEES > 1000) {
    throw new Error('DEMO_EMPLOYEES_PER_DEPARTMENT must be an integer between 1 and 1000');
  }

  const organization = await prisma.organization.findFirst({
    where: { name: ORGANIZATION_NAME },
    select: { id: true, name: true },
  });
  if (!organization) throw new Error(`Organization not found: ${ORGANIZATION_NAME}`);

  const employeeRole = await prisma.role.findFirst({
    where: { organizationId: organization.id, tier: 'EMPLOYEE', name: 'Employee' },
    select: { id: true },
  }) || await prisma.role.findFirst({
    where: { organizationId: organization.id, tier: 'EMPLOYEE' },
    select: { id: true },
  });
  if (!employeeRole) throw new Error('No EMPLOYEE-tier role exists in the organization');

  const fallbackManager = await prisma.user.findFirst({
    where: { organizationId: organization.id, isActive: true, customRole: { tier: { in: ['ADMIN', 'MANAGER'] } } },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!fallbackManager) throw new Error('No active admin or manager exists for employee assignment');

  const [departments, policies, existingUsers] = await Promise.all([
    prisma.department.findMany({
      where: { organizationId: organization.id },
      select: {
        id: true,
        name: true,
        users: {
          where: { isActive: true, customRole: { tier: 'EMPLOYEE' } },
          select: { id: true },
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.leavePolicy.findMany({
      where: { organizationId: organization.id, applicableRoleIds: { has: employeeRole.id } },
      select: { id: true, totalDays: true },
    }),
    prisma.user.findMany({
      where: { organizationId: organization.id },
      select: { email: true, employeeId: true },
    }),
  ]);

  const usedEmails = new Set(existingUsers.map((user) => user.email.toLowerCase()));
  const usedEmployeeIds = new Set(existingUsers.map((user) => user.employeeId.toUpperCase()));
  const passwordHash = await bcrypt.hash(`${crypto.randomBytes(32).toString('base64url')}Aa1!`, 12);
  const year = new Date().getFullYear();
  let totalCreated = 0;
  const summary = [];

  for (const [departmentIndex, department] of departments.entries()) {
    const missing = Math.max(0, TARGET_EMPLOYEES - department.users.length);
    if (missing === 0) {
      summary.push({ department: department.name, before: department.users.length, created: 0, after: department.users.length });
      continue;
    }

    const departmentManager = await prisma.user.findFirst({
      where: { organizationId: organization.id, departmentId: department.id, isActive: true, customRole: { tier: 'MANAGER' } },
      select: { id: true },
    });
    const managerId = departmentManager?.id || fallbackManager.id;
    const departmentSlug = slugify(department.name);
    const departmentCode = codeFor(department.name);
    const newUsers = [];
    let sequence = 1;

    while (newUsers.length < missing) {
      const suffix = String(sequence).padStart(3, '0');
      sequence += 1;
      const email = `demo.${departmentSlug}.${suffix}@worknex.local`;
      const employeeId = `DSU-${departmentCode}-${suffix}`;
      if (usedEmails.has(email) || usedEmployeeIds.has(employeeId)) continue;

      const nameIndex = departmentIndex * TARGET_EMPLOYEES + sequence;
      newUsers.push({
        organizationId: organization.id,
        employeeId,
        firstName: FIRST_NAMES[nameIndex % FIRST_NAMES.length],
        lastName: LAST_NAMES[(nameIndex * 7) % LAST_NAMES.length],
        email,
        passwordHash,
        roleId: employeeRole.id,
        departmentId: department.id,
        managerId,
        designation: 'Staff Member',
        joiningDate: new Date(2022 + (nameIndex % 4), nameIndex % 12, 1 + (nameIndex % 27)),
        isActive: true,
        emailVerifiedAt: new Date(),
      });
      usedEmails.add(email);
      usedEmployeeIds.add(employeeId);
    }

    await prisma.user.createMany({ data: newUsers, skipDuplicates: true });
    const createdUsers = await prisma.user.findMany({
      where: { organizationId: organization.id, email: { in: newUsers.map((user) => user.email) } },
      select: { id: true },
    });

    if (policies.length > 0 && createdUsers.length > 0) {
      await prisma.leaveBalance.createMany({
        data: createdUsers.flatMap((user) => policies.map((policy) => ({
          organizationId: organization.id,
          userId: user.id,
          policyId: policy.id,
          year,
          totalDays: policy.totalDays,
          usedDays: 0,
          remainingDays: policy.totalDays,
        }))),
        skipDuplicates: true,
      });
    }

    totalCreated += createdUsers.length;
    summary.push({
      department: department.name,
      before: department.users.length,
      created: createdUsers.length,
      after: department.users.length + createdUsers.length,
    });
  }

  const belowTarget = await prisma.department.findMany({
    where: { organizationId: organization.id },
    select: {
      name: true,
      users: { where: { isActive: true, customRole: { tier: 'EMPLOYEE' } }, select: { id: true } },
    },
  });
  const failures = belowTarget.filter((department) => department.users.length < TARGET_EMPLOYEES);
  if (failures.length > 0) throw new Error(`Departments below target: ${failures.map((department) => department.name).join(', ')}`);

  console.table(summary);
  console.log(`Created ${totalCreated} employees. Every department now has at least ${TARGET_EMPLOYEES} active employees.`);
};

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());

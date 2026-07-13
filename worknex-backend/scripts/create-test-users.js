/**
 * Creates a spread of test users across a few different departments, each
 * with their own manager, so CL/EL/Sandwich-leave rules can be tested
 * manually through the UI against fresh, untouched accounts.
 *
 * Uses the real createUser()/createDepartment() service functions — not raw
 * Prisma inserts — so every side effect a normal "Add User" click would
 * trigger (leave-balance provisioning from the active policy, employee ID
 * generation, etc.) happens exactly the same way here.
 *
 * Safe to re-run: skips any user whose email already exists.
 *
 * Usage: node scripts/create-test-users.js
 */

const prisma = require('../src/config/db');
const usersService = require('../src/modules/users/users.service');

const PASSWORD = process.env.TEST_USER_PASSWORD;
if (!PASSWORD) throw new Error('TEST_USER_PASSWORD is required');

const PLAN = [
  {
    department: 'Human Resources',
    manager: { firstName: 'Sara', lastName: 'Malik', email: 'sara.malik.test@example.com' },
    employees: [
      { firstName: 'Bilal', lastName: 'Khan', email: 'bilal.khan.test@example.com' },
      { firstName: 'Hina', lastName: 'Aziz', email: 'hina.aziz.test@example.com' },
    ],
  },
  {
    department: 'Finance & Accounts',
    manager: { firstName: 'Kamran', lastName: 'Sheikh', email: 'kamran.sheikh.test@example.com' },
    employees: [
      { firstName: 'Zara', lastName: 'Iqbal', email: 'zara.iqbal.test@example.com' },
      { firstName: 'Omer', lastName: 'Farooq', email: 'omer.farooq.test@example.com' },
    ],
  },
  {
    department: 'Marketing',
    manager: { firstName: 'Ayesha', lastName: 'Noor', email: 'ayesha.noor.test@example.com' },
    employees: [
      { firstName: 'Danish', lastName: 'Raza', email: 'danish.raza.test@example.com' },
      { firstName: 'Mahnoor', lastName: 'Shah', email: 'mahnoor.shah.test@example.com' },
    ],
  },
];

async function ensureDepartment(name, organizationId, requestingUser) {
  const existing = await prisma.department.findFirst({ where: { organizationId, name } });
  if (existing) return existing;
  return usersService.createDepartment({ name }, requestingUser);
}

async function ensureUser({ firstName, lastName, email }, role, organizationId, departmentId, managerId, requestingUser) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { user: existing, created: false };

  const employeeId = `${role === 'MANAGER' ? 'MGR' : 'EMP'}-${email.split('.')[0].toUpperCase()}-${Date.now().toString().slice(-5)}`;
  const result = await usersService.createUser({
    firstName, lastName, email,
    employeeId,
    role,
    password: PASSWORD,
    departmentId,
    managerId: managerId || undefined,
    designation: role === 'MANAGER' ? 'Department Manager' : 'Staff Member',
    isActive: true,
  }, requestingUser);

  return { user: result.user, created: true };
}

async function main() {
  const org = await prisma.organization.findFirst({ where: { name: 'DHA SUFFA UNIVERSITY' } });
  if (!org) throw new Error('Organization not found');
  const owner = await prisma.user.findFirst({ where: { organizationId: org.id }, include: { customRole: true }, orderBy: { createdAt: 'asc' } });
  const requestingUser = { id: owner.id, organizationId: org.id, role: owner.customRole.tier };

  const rows = [];

  for (const block of PLAN) {
    const dept = await ensureDepartment(block.department, org.id, requestingUser);

    const { user: manager, created: mgrCreated } = await ensureUser(block.manager, 'MANAGER', org.id, dept.id, null, requestingUser);
    rows.push({ dept: block.department, role: 'MANAGER', name: `${block.manager.firstName} ${block.manager.lastName}`, email: block.manager.email, created: mgrCreated });

    for (const emp of block.employees) {
      const { created } = await ensureUser(emp, 'EMPLOYEE', org.id, dept.id, manager.id, requestingUser);
      rows.push({ dept: block.department, role: 'EMPLOYEE', name: `${emp.firstName} ${emp.lastName}`, email: emp.email, created });
    }
  }

  console.log('\n=== Test Users ===');
  console.log(`Password for all: ${PASSWORD}\n`);
  console.log('Department            Role      Name              Email                              Status');
  console.log('-'.repeat(110));
  for (const r of rows) {
    console.log(
      r.dept.padEnd(22) + r.role.padEnd(10) + r.name.padEnd(18) + r.email.padEnd(35) + (r.created ? 'created' : 'already existed')
    );
  }
  console.log('');

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Script crashed:', err);
  await prisma.$disconnect();
  process.exit(1);
});

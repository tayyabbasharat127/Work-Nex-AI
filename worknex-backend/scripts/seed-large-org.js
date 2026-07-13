/**
 * Scales up DHA SUFFA UNIVERSITY to a realistic university-sized org for
 * testing: 6 new departments, ~9-10 people each (~56 users total), each
 * with a manager + employees. Existing departments/users (Operations, HR,
 * Finance, Marketing, Software Engineering, Administration) are untouched.
 *
 * Why: analytics/reports/leaderboards/attendance heatmaps and department
 * comparisons look empty/meaningless with only a handful of users. This
 * gives every dashboard real numbers to show without touching anything
 * built for the earlier staffing-guard/sandwich-leave demo.
 *
 * Idempotent — safe to re-run, skips any email that already exists.
 *
 * Usage: node scripts/seed-large-org.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const prisma = require('../src/config/db');
const usersService = require('../src/modules/users/users.service');

const PASSWORD = 'Demo@1234';

const FIRST_MALE = [
  'Ali', 'Hamza', 'Bilal', 'Usman', 'Omer', 'Fahad', 'Ahmed', 'Zeeshan', 'Kamran', 'Danish',
  'Waqas', 'Adeel', 'Saad', 'Junaid', 'Faizan', 'Haris', 'Talha', 'Rayyan', 'Shahzaib', 'Moiz',
  'Asad', 'Nabeel', 'Rizwan', 'Imran', 'Salman', 'Yasir', 'Tariq', 'Sohail', 'Naveed', 'Arslan',
];
const FIRST_FEMALE = [
  'Sara', 'Hina', 'Zara', 'Ayesha', 'Mahnoor', 'Rida', 'Mariam', 'Sana', 'Amna', 'Nida',
  'Fatima', 'Iqra', 'Aiman', 'Laiba', 'Noor', 'Anum', 'Hira', 'Komal', 'Zoya', 'Alishba',
  'Warda', 'Sadia', 'Rabia', 'Maryam', 'Bushra', 'Farah', 'Sadaf', 'Uzma', 'Yusra', 'Mehak',
];
const LAST = [
  'Khan', 'Malik', 'Sheikh', 'Iqbal', 'Farooq', 'Raza', 'Shah', 'Aziz', 'Baig', 'Chaudhry',
  'Hameed', 'Anwar', 'Ghani', 'Tariq', 'Mehmood', 'Yousaf', 'Rashid', 'Latif', 'Siddiqui', 'Qureshi',
  'Abbasi', 'Ansari', 'Bhatti', 'Cheema', 'Dar', 'Effendi', 'Gill', 'Hashmi', 'Jamil', 'Karim',
];

let nameIdx = 0;
function nextName() {
  const pool = nameIdx % 2 === 0 ? FIRST_MALE : FIRST_FEMALE;
  const firstName = pool[nameIdx % pool.length];
  const lastName = LAST[(nameIdx * 7 + 3) % LAST.length];
  nameIdx += 1;
  return { firstName, lastName };
}

const DEPARTMENTS = [
  { name: 'Computer Science', size: 10 },
  { name: 'Business Administration', size: 10 },
  { name: 'Student Affairs', size: 9 },
  { name: 'Library & IT Support', size: 9 },
  { name: 'Examination & Records', size: 9 },
  { name: 'Admissions & Outreach', size: 9 },
];

async function ensureDepartment(name, organizationId, requestingUser) {
  const existing = await prisma.department.findFirst({ where: { organizationId, name } });
  if (existing) return existing;
  return usersService.createDepartment({ name }, requestingUser);
}

async function ensureUser({ firstName, lastName }, emailSlug, role, organizationId, departmentId, managerId, requestingUser) {
  const email = `${emailSlug}.demo2@example.com`;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { user: existing, created: false, email };

  const employeeId = `${role === 'MANAGER' ? 'MGR' : 'EMP'}-${emailSlug.split('.')[0].toUpperCase()}-${Date.now().toString().slice(-5)}${Math.floor(Math.random() * 90 + 10)}`;
  const result = await usersService.createUser({
    firstName, lastName, email,
    employeeId,
    role,
    password: PASSWORD,
    departmentId,
    managerId: managerId || undefined,
    designation: role === 'MANAGER' ? 'Department Head' : 'Staff Member',
    isActive: true,
  }, requestingUser);

  return { user: result.user, created: true, email };
}

async function main() {
  const org = await prisma.organization.findFirst({ where: { name: 'DHA SUFFA UNIVERSITY' } });
  if (!org) throw new Error('Organization "DHA SUFFA UNIVERSITY" not found — run against the correct database');
  const owner = await prisma.user.findFirst({ where: { organizationId: org.id }, include: { customRole: true }, orderBy: { createdAt: 'asc' } });
  const requestingUser = { id: owner.id, organizationId: org.id, role: owner.customRole.tier };

  console.log(`\n=== Scaling up DHA SUFFA UNIVERSITY: ${DEPARTMENTS.length} new departments ===\n`);

  let totalCreated = 0;
  let totalSkipped = 0;
  const summaryRows = [];

  for (const block of DEPARTMENTS) {
    const dept = await ensureDepartment(block.name, org.id, requestingUser);

    const mgrName = nextName();
    const mgrSlug = `${mgrName.firstName}.${mgrName.lastName}`.toLowerCase();
    const { user: manager, created: mgrCreated, email: mgrEmail } = await ensureUser(mgrName, mgrSlug, 'MANAGER', org.id, dept.id, null, requestingUser);
    if (mgrCreated) totalCreated += 1; else totalSkipped += 1;
    summaryRows.push({ dept: block.name, role: 'MANAGER', name: `${mgrName.firstName} ${mgrName.lastName}`, email: mgrEmail, created: mgrCreated });

    for (let i = 0; i < block.size - 1; i += 1) {
      const empName = nextName();
      const empSlug = `${empName.firstName}.${empName.lastName}${i}`.toLowerCase();
      const { created, email } = await ensureUser(empName, empSlug, 'EMPLOYEE', org.id, dept.id, manager.id, requestingUser);
      if (created) totalCreated += 1; else totalSkipped += 1;
      summaryRows.push({ dept: block.name, role: 'EMPLOYEE', name: `${empName.firstName} ${empName.lastName}`, email, created });
    }

    console.log(`  ${block.name}: ${block.size} people ready (manager: ${manager.firstName} ${manager.lastName})`);
  }

  console.log(`\n${'='.repeat(72)}`);
  console.log(`Done: ${totalCreated} new users created, ${totalSkipped} already existed (re-run is safe).`);
  console.log(`Password for every new user: ${PASSWORD}`);
  console.log('='.repeat(72));

  console.log('\nFull roster:\n');
  console.log('Department                  Role      Name                Email');
  console.log('-'.repeat(100));
  for (const r of summaryRows) {
    console.log(r.dept.padEnd(28) + r.role.padEnd(10) + r.name.padEnd(20) + r.email + (r.created ? '' : '  (already existed)'));
  }

  const orgHeadcount = await prisma.user.count({ where: { organizationId: org.id, isActive: true } });
  console.log(`\nOrganization now has ${orgHeadcount} active users total across all departments.\n`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Script crashed:', err);
  await prisma.$disconnect();
  process.exit(1);
});

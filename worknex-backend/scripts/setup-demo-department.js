/**
 * Builds a demo-ready department for manual testing, sized so ordinary
 * single-day leave requests DON'T accidentally trip the department
 * staffing-shortage guard (maxConcurrentLeavePercent: 29% for CL, 31% for
 * EL). The earlier create-test-users.js departments only have 3 people
 * each, so even ONE person on leave = 33% and always routes to the manager
 * — fine for demoing the staffing guard itself, useless for demoing the
 * plain auto-approve happy path.
 *
 * "Operations" department: 1 Manager + 7 Employees = 8 people.
 *   - 1 person on leave = 12.5% -> clears both 29% and 31% thresholds.
 *   - 3 people on leave = 37.5% -> deliberately breaches both, for testing
 *     the staffing guard on purpose.
 *
 * Also:
 *   - Turns on OrganizationSettings.sandwichLeaveEnabled (prints prior value).
 *   - Seeds an ABSENT attendance record for the first demo employee on the
 *     Friday immediately before the next "safe" Monday (>= 8 days out, so
 *     minNoticeDays for both CL and EL are comfortably satisfied), ready
 *     for a live sandwich-leave demo.
 *
 * Idempotent — safe to re-run. Existing departments/users are untouched.
 *
 * Usage: node scripts/setup-demo-department.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const prisma = require('../src/config/db');
const usersService = require('../src/modules/users/users.service');
const { toAttendanceDate } = require('../src/modules/attendance/attendance.processor');

const PASSWORD = 'Demo@1234';
const DEPT_NAME = 'Operations';

const MANAGER = { firstName: 'Imran', lastName: 'Chaudhry', email: 'imran.chaudhry.demo@example.com' };
const EMPLOYEES = [
  { firstName: 'Ahmed', lastName: 'Riaz', email: 'ahmed.riaz.demo@example.com' },
  { firstName: 'Sana', lastName: 'Tariq', email: 'sana.tariq.demo@example.com' },
  { firstName: 'Fahad', lastName: 'Mehmood', email: 'fahad.mehmood.demo@example.com' },
  { firstName: 'Mariam', lastName: 'Yousaf', email: 'mariam.yousaf.demo@example.com' },
  { firstName: 'Usman', lastName: 'Ghani', email: 'usman.ghani.demo@example.com' },
  { firstName: 'Rida', lastName: 'Anwar', email: 'rida.anwar.demo@example.com' },
  { firstName: 'Bilawal', lastName: 'Hameed', email: 'bilawal.hameed.demo@example.com' },
];

const addDays = (date, n) => { const d = new Date(date); d.setUTCDate(d.getUTCDate() + n); return d; };
const fmt = (date) => date.toISOString().slice(0, 10);
const dayName = (date) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getUTCDay()];

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
    designation: role === 'MANAGER' ? 'Operations Manager' : 'Operations Staff',
    isActive: true,
  }, requestingUser);

  return { user: result.user, created: true };
}

async function main() {
  const org = await prisma.organization.findFirst({ where: { name: 'DHA SUFFA UNIVERSITY' } });
  if (!org) throw new Error('Organization "DHA SUFFA UNIVERSITY" not found — run against the correct database');
  const owner = await prisma.user.findFirst({ where: { organizationId: org.id }, include: { customRole: true }, orderBy: { createdAt: 'asc' } });
  const requestingUser = { id: owner.id, organizationId: org.id, role: owner.customRole.tier };

  console.log(`\n=== Setting up "${DEPT_NAME}" demo department ===\n`);

  const dept = await ensureDepartment(DEPT_NAME, org.id, requestingUser);
  const rows = [];

  const { user: manager, created: mgrCreated } = await ensureUser(MANAGER, 'MANAGER', org.id, dept.id, null, requestingUser);
  rows.push({ role: 'MANAGER', name: `${MANAGER.firstName} ${MANAGER.lastName}`, email: MANAGER.email, created: mgrCreated });

  const employeeUsers = [];
  for (const emp of EMPLOYEES) {
    const { user, created } = await ensureUser(emp, 'EMPLOYEE', org.id, dept.id, manager.id, requestingUser);
    employeeUsers.push(user);
    rows.push({ role: 'EMPLOYEE', name: `${emp.firstName} ${emp.lastName}`, email: emp.email, created });
  }

  const headcount = 1 + EMPLOYEES.length;
  console.log(`Department "${DEPT_NAME}" now has ${headcount} people.`);
  console.log(`  -> 1 person on leave  = ${(100 / headcount).toFixed(1)}% (clears the 29%/31% staffing guard)`);
  console.log(`  -> 3 people on leave  = ${(300 / headcount).toFixed(1)}% (deliberately breaches it, for testing the guard on purpose)\n`);

  console.log('Department            Role      Name               Email                                 Status');
  console.log('-'.repeat(110));
  for (const r of rows) {
    console.log('Operations'.padEnd(22) + r.role.padEnd(10) + r.name.padEnd(19) + r.email.padEnd(38) + (r.created ? 'created' : 'already existed'));
  }
  console.log(`\nPassword for all Operations users: ${PASSWORD}\n`);

  // ── Sandwich leave: enable the setting ──────────────────────────────
  const settings = await prisma.organizationSettings.upsert({
    where: { organizationId: org.id },
    update: {},
    create: { organizationId: org.id },
  });
  if (!settings.sandwichLeaveEnabled) {
    await prisma.organizationSettings.update({ where: { organizationId: org.id }, data: { sandwichLeaveEnabled: true } });
    console.log('Sandwich Leave rule was OFF — turned it ON for this organization.');
  } else {
    console.log('Sandwich Leave rule was already ON.');
  }

  // ── Sandwich leave: seed a Friday absence for the demo ──────────────
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  let monday = addDays(today, 8); // comfortably past EL's 6-day notice requirement
  while (dayName(monday) !== 'Mon') monday = addDays(monday, 1);
  const friday = addDays(monday, -3);

  const sandwichEmployee = employeeUsers[0];
  await prisma.attendance.upsert({
    where: { userId_date: { userId: sandwichEmployee.id, date: toAttendanceDate(friday) } },
    update: { status: 'ABSENT', checkIn: null, checkOut: null },
    create: {
      organizationId: org.id,
      userId: sandwichEmployee.id,
      date: toAttendanceDate(friday),
      status: 'ABSENT',
      source: 'DEMO_SEED',
    },
  });
  console.log(`\nSeeded an ABSENT attendance record for ${sandwichEmployee.firstName} ${sandwichEmployee.lastName} on ${fmt(friday)} (${dayName(friday)}) — ready for the sandwich-leave demo below.\n`);

  console.log('='.repeat(72));
  console.log('DEMO SCRIPT — run these live, in this order');
  console.log('='.repeat(72));

  console.log(`
1) CL AUTO-APPROVE (happy path)
   Login: ${employeeUsers[1].email} / ${PASSWORD}
   Apply for CASUAL leave, 1 day, any date >= tomorrow, no overlap with others.
   Expected: instantly AUTO_APPROVED — no manager step, because Operations
   has 8 people so one absence (12.5%) stays under the 29% staffing limit.

2) EL — ALWAYS NEEDS MANAGER (by policy design, not a bug)
   Login: ${employeeUsers[2].email} / ${PASSWORD}
   Apply for ANNUAL leave, 2-3 days, start date >= 6 days from today
   (EL policy requires 6 days notice).
   Expected: PENDING_MANAGER (EL's autoApproveMaxDays is null — it never
   auto-approves by design, regardless of staffing).
   Then login as ${manager.email} / ${PASSWORD} and approve it from
   "Pending Approvals".

3) SANDWICH LEAVE (already seeded above)
   Login: ${sandwichEmployee.email} / ${PASSWORD}
   Apply for CASUAL leave, 1 day, starting ${fmt(monday)} (${dayName(monday)}).
   Expected: auto-approves immediately (same as scenario 1), then within a
   few seconds the system detects the ABSENT record on the prior Friday
   (${fmt(friday)}) and silently extends the leave to swallow the
   weekend gap — check "My Leaves": totalDays should jump from 1 to 4,
   with a note "Sandwich rule applied: ... between unapproved absence on
   ${fmt(friday)} and leave starting ${fmt(monday)}".

4) STAFFING GUARD (deliberate trigger)
   Get any 2 of these to already have an APPROVED leave on the SAME date D:
     ${employeeUsers[3].email}, ${employeeUsers[4].email}
   Then have a 3rd employee (${employeeUsers[5].email}) apply CASUAL
   leave for that same date D.
   Expected: 3 of 8 = 37.5% > 29% limit -> PENDING_MANAGER with reason
   "Department staffing threshold reached (38% would be on leave, limit
   29%) — routed to manager for staffing review". This is the same rule
   you saw on Bilal Khan's request — it just needed a bigger department
   to demo the "normally auto-approves" case separately from this one.

5) MANAGER'S OWN LEAVE -> ESCALATES TO ADMIN
   Login: ${manager.email} / ${PASSWORD}
   Apply for any leave type.
   Expected: PENDING_ADMIN (a manager's own request skips "manager"
   review and goes straight to admin — reviewing a peer manager doesn't
   fit the model).
   Then login as the org admin/owner and approve it.

6) ADMIN'S OWN LEAVE -> AUTO-APPROVED
   Login as the org admin/owner, apply for any leave type.
   Expected: AUTO_APPROVED immediately — nothing above an admin in the
   hierarchy, so it's never held for approval.
`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Script crashed:', err);
  await prisma.$disconnect();
  process.exit(1);
});

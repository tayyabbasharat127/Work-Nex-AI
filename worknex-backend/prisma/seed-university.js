/**
 * WorkNex AI — University Demo Seed
 * Institution: DSU University
 * Creates a realistic university org: Registrar, HODs (custom role),
 * Faculty (custom role), 2 months of attendance, a mix of leave history,
 * and — critically — an ACTIVE leave policy version with auto-approval
 * rules so a live "Apply Leave" in the UI during the demo will actually
 * get auto-approved by the AI evaluation engine in real time.
 *
 * Usage:
 *   node prisma/seed-university.js
 *
 * After this finishes, run ETL (Admin → ETL Pipeline, or POST
 * /api/v1/analytics/etl/run) so Performance/Attrition/Forecast models
 * have fresh data on top of what this script precomputes.
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { ensureSystemRoles, ensurePlatformSuperAdminRole } = require('../src/utils/systemRoles');

const prisma = new PrismaClient();
const SEED_PASSWORD = process.env.SEED_USER_PASSWORD;
if (!SEED_PASSWORD) throw new Error('SEED_USER_PASSWORD is required');

const d = (y, m, day) => new Date(y, m - 1, day);
const dt = (y, m, day, h, min) => new Date(y, m - 1, day, h, min, 0);
const isWeekend = (date) => [0, 6].includes(date.getDay());
const businessDays = (start, end) => {
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    if (!isWeekend(cur)) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
};
const hash = (pw) => bcrypt.hash(pw, 10);
const daysAgo = (n) => {
  const date = new Date();
  date.setDate(date.getDate() - n);
  date.setHours(0, 0, 0, 0);
  return date;
};

async function main() {
  console.log('\n🎓 Seeding WorkNex AI — DSU University\n');

  // ── 1. ORGANIZATION ─────────────────────────────────────────────────────────
  console.log('🏫 Creating organization...');
  const org = await prisma.organization.upsert({
    where: { slug: 'dsu-university' },
    update: {},
    create: {
      id: 'org-uuid-dsu-university',
      name: 'DSU University',
      slug: 'dsu-university',
      industry: 'Higher Education',
      country: 'Pakistan',
      phone: '+92-21-9921-0001',
      website: 'https://dsu.edu.pk',
    },
  });

  await prisma.subscription.upsert({
    where: { organizationId: org.id },
    update: {},
    create: {
      organizationId: org.id,
      plan: 'GROWTH',
      status: 'ACTIVE',
      billingCycle: 'MONTHLY',
      maxEmployees: 200,
      pricePerMonth: 99,
      discountPercent: 0,
      currentPeriodStart: new Date(),
      currentPeriodEnd: d(2027, 12, 31),
      licenseKey: 'WNX-DSU0-UNIV-DEMO',
    },
  });

  // ── 2. DEPARTMENTS (Faculties) ──────────────────────────────────────────────
  console.log('📁 Creating faculties...');
  const deptNames = ['Computer Science', 'Business Administration', 'Electrical Engineering', 'Social Sciences'];
  const depts = {};
  for (const name of deptNames) {
    const dept = await prisma.department.upsert({
      where: { organizationId_name: { organizationId: org.id, name } },
      update: {},
      create: { organizationId: org.id, name, description: `Faculty of ${name}` },
    });
    depts[name] = dept;
  }
  console.log(`   ✓ ${deptNames.length} faculties created`);

  // ── 3. ROLES — system roles + university-specific custom roles ─────────────
  console.log('🎭 Creating roles (custom: Registrar, HOD, Faculty)...');
  const systemRoles = await ensureSystemRoles(prisma, org.id);
  const superAdminRole = await ensurePlatformSuperAdminRole(prisma);

  const upsertCustomRole = (name, tier, permissions) =>
    prisma.role.upsert({
      where: { organizationId_name: { organizationId: org.id, name } },
      update: { permissions },
      create: { organizationId: org.id, name, tier, permissions, isSystem: false },
    });

  const registrarRole = await upsertCustomRole('Registrar', 'ADMIN', ['users:manage', 'settings:manage', 'notifications:broadcast']);
  const hodRole = await upsertCustomRole('HOD', 'MANAGER', ['attendance:manage']);
  const facultyRole = await upsertCustomRole('Faculty', 'EMPLOYEE', []);
  console.log('   ✓ Registrar (Admin scope), HOD (Manager scope), Faculty (Employee scope) created');

  // ── 4. LEAVE POLICIES ────────────────────────────────────────────────────────
  console.log('📋 Creating leave policies...');
  const allTierRoleIds = (tiers) => {
    const roles = [superAdminRole, systemRoles.ADMIN, systemRoles.MANAGER, systemRoles.EMPLOYEE, registrarRole, hodRole, facultyRole];
    return roles.filter((r) => tiers.includes(r.tier)).map((r) => r.id);
  };

  const policyData = [
    { leaveType: 'ANNUAL', totalDays: 18, carryForward: true, maxCarryForward: 5, tiers: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE'], description: 'Annual paid leave for faculty and staff' },
    { leaveType: 'SICK', totalDays: 12, carryForward: false, maxCarryForward: 0, tiers: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE'], description: 'Medical/sick leave' },
    { leaveType: 'CASUAL', totalDays: 8, carryForward: false, maxCarryForward: 0, tiers: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE'], description: 'Short-notice casual leave — auto-approved for 1-2 days' },
    { leaveType: 'UNPAID', totalDays: 20, carryForward: false, maxCarryForward: 0, tiers: ['ADMIN', 'MANAGER', 'EMPLOYEE'], description: 'Unpaid leave' },
  ];

  const policies = {};
  for (const p of policyData) {
    const applicableRoleIds = allTierRoleIds(p.tiers);
    const { tiers, ...rest } = p;
    const existing = await prisma.leavePolicy.findFirst({ where: { organizationId: org.id, leaveType: p.leaveType } });
    const policy = existing
      ? await prisma.leavePolicy.update({ where: { id: existing.id }, data: { ...rest, applicableRoleIds, organizationId: org.id } })
      : await prisma.leavePolicy.create({ data: { ...rest, applicableRoleIds, organizationId: org.id } });
    policies[p.leaveType] = policy;
  }

  // ACTIVE policy version with auto-approval rules — this is what makes a
  // live "Apply Leave" in the demo actually get AUTO_APPROVED by the AI
  // evaluation engine instead of sitting PENDING_MANAGER.
  const autoApprovalRules = {
    parser: 'seeded-demo-policy',
    confidence: 1,
    leavePolicies: [
      { leaveType: 'CASUAL', annualQuota: 8, maxConsecutiveDays: 2, minNoticeDays: 0, applicableRoles: ['EMPLOYEE', 'MANAGER', 'ADMIN'], carryForwardAllowed: false, maxCarryForwardDays: 0, requiresManagerApproval: false, requiresAdminApproval: false, requiresMedicalCertificateAfterDays: null, probationAllowed: true },
      { leaveType: 'SICK', annualQuota: 12, maxConsecutiveDays: 5, minNoticeDays: 0, applicableRoles: ['EMPLOYEE', 'MANAGER', 'ADMIN'], carryForwardAllowed: false, maxCarryForwardDays: 0, requiresManagerApproval: true, requiresAdminApproval: false, requiresMedicalCertificateAfterDays: 2, probationAllowed: true },
      { leaveType: 'ANNUAL', annualQuota: 18, maxConsecutiveDays: 10, minNoticeDays: 7, applicableRoles: ['EMPLOYEE', 'MANAGER', 'ADMIN'], carryForwardAllowed: true, maxCarryForwardDays: 5, requiresManagerApproval: true, requiresAdminApproval: false, requiresMedicalCertificateAfterDays: null, probationAllowed: true },
      { leaveType: 'UNPAID', annualQuota: 20, maxConsecutiveDays: 15, minNoticeDays: 14, applicableRoles: ['EMPLOYEE', 'MANAGER', 'ADMIN'], carryForwardAllowed: false, maxCarryForwardDays: 0, requiresManagerApproval: true, requiresAdminApproval: true, requiresMedicalCertificateAfterDays: null, probationAllowed: false },
    ],
  };
  await prisma.leavePolicyVersion.updateMany({ where: { organizationId: org.id, status: 'ACTIVE' }, data: { status: 'ARCHIVED', effectiveTo: new Date() } });
  await prisma.leavePolicyVersion.create({
    data: { organizationId: org.id, version: 1, status: 'ACTIVE', effectiveFrom: daysAgo(30), rulesJson: autoApprovalRules },
  });
  console.log(`   ✓ ${policyData.length} leave policies + active auto-approval rules created`);

  // ── 5. USERS ─────────────────────────────────────────────────────────────────
  console.log('👥 Creating users...');
  const pw = await hash(SEED_PASSWORD);

  const vc = await prisma.user.upsert({
    where: { email: 'vc@dsu.edu.pk' },
    update: {},
    create: {
      organizationId: org.id, employeeId: 'DSU-001', firstName: 'Anwar', lastName: 'Siddiqui',
      email: 'vc@dsu.edu.pk', passwordHash: pw, roleId: superAdminRole.id,
      departmentId: depts['Business Administration'].id, designation: 'Vice Chancellor', joiningDate: d(2019, 8, 1), phone: '+92-300-2220001',
    },
  });

  const registrar = await prisma.user.upsert({
    where: { email: 'registrar@dsu.edu.pk' },
    update: {},
    create: {
      organizationId: org.id, employeeId: 'DSU-002', firstName: 'Farida', lastName: 'Yousuf',
      email: 'registrar@dsu.edu.pk', passwordHash: pw, roleId: registrarRole.id,
      managerId: vc.id, departmentId: depts['Business Administration'].id, designation: 'Registrar', joiningDate: d(2020, 1, 15), phone: '+92-300-2220002',
    },
  });

  const hodData = [
    { dept: 'Computer Science', id: 'DSU-003', fn: 'Kashif', ln: 'Mahmood', email: 'kashif.mahmood@dsu.edu.pk', joined: d(2020, 8, 1) },
    { dept: 'Business Administration', id: 'DSU-004', fn: 'Nazia', ln: 'Rehman', email: 'nazia.rehman@dsu.edu.pk', joined: d(2021, 1, 10) },
    { dept: 'Electrical Engineering', id: 'DSU-005', fn: 'Salman', ln: 'Qureshi', email: 'salman.qureshi@dsu.edu.pk', joined: d(2019, 9, 1) },
    { dept: 'Social Sciences', id: 'DSU-006', fn: 'Rukhsana', ln: 'Aslam', email: 'rukhsana.aslam@dsu.edu.pk', joined: d(2021, 6, 15) },
  ];
  const hods = {};
  for (const h of hodData) {
    const user = await prisma.user.upsert({
      where: { email: h.email },
      update: {},
      create: {
        organizationId: org.id, employeeId: h.id, firstName: h.fn, lastName: h.ln,
        email: h.email, passwordHash: pw, roleId: hodRole.id,
        managerId: registrar.id, departmentId: depts[h.dept].id, designation: `Head of Department — ${h.dept}`,
        joiningDate: h.joined, phone: `+92-300-222${h.id.split('-')[1]}`,
      },
    });
    hods[h.dept] = user;
  }

  const facultyByDept = {
    'Computer Science': [
      { id: 'DSU-101', fn: 'Ahmed', ln: 'Raza', email: 'ahmed.raza@dsu.edu.pk', desig: 'Assistant Professor', joined: d(2022, 8, 1) },
      { id: 'DSU-102', fn: 'Sadia', ln: 'Khalid', email: 'sadia.khalid@dsu.edu.pk', desig: 'Lecturer', joined: d(2023, 1, 15) },
      { id: 'DSU-103', fn: 'Fahad', ln: 'Nawaz', email: 'fahad.nawaz@dsu.edu.pk', desig: 'Associate Professor', joined: d(2021, 8, 1) },
      { id: 'DSU-104', fn: 'Mahnoor', ln: 'Ejaz', email: 'mahnoor.ejaz@dsu.edu.pk', desig: 'Lecturer', joined: d(2023, 6, 1) },
      { id: 'DSU-105', fn: 'Bilal', ln: 'Anwar', email: 'bilal.anwar@dsu.edu.pk', desig: 'Lab Instructor', joined: d(2023, 9, 1) },
    ],
    'Business Administration': [
      { id: 'DSU-201', fn: 'Sana', ln: 'Farooqi', email: 'sana.farooqi@dsu.edu.pk', desig: 'Assistant Professor', joined: d(2022, 2, 1) },
      { id: 'DSU-202', fn: 'Waqas', ln: 'Ahmed', email: 'waqas.ahmed@dsu.edu.pk', desig: 'Lecturer', joined: d(2023, 3, 1) },
      { id: 'DSU-203', fn: 'Hira', ln: 'Batool', email: 'hira.batool@dsu.edu.pk', desig: 'Associate Professor', joined: d(2020, 9, 1) },
      { id: 'DSU-204', fn: 'Danish', ln: 'Iqbal', email: 'danish.iqbal@dsu.edu.pk', desig: 'Lecturer', joined: d(2023, 8, 15) },
      { id: 'DSU-205', fn: 'Areeba', ln: 'Sheikh', email: 'areeba.sheikh@dsu.edu.pk', desig: 'Assistant Professor', joined: d(2022, 6, 1) },
    ],
    'Electrical Engineering': [
      { id: 'DSU-301', fn: 'Junaid', ln: 'Malik', email: 'junaid.malik@dsu.edu.pk', desig: 'Associate Professor', joined: d(2019, 8, 1) },
      { id: 'DSU-302', fn: 'Iqra', ln: 'Naeem', email: 'iqra.naeem@dsu.edu.pk', desig: 'Lecturer', joined: d(2023, 2, 1) },
      { id: 'DSU-303', fn: 'Hamza', ln: 'Siddique', email: 'hamza.siddique@dsu.edu.pk', desig: 'Lab Instructor', joined: d(2023, 9, 1) },
      { id: 'DSU-304', fn: 'Neha', ln: 'Waseem', email: 'neha.waseem@dsu.edu.pk', desig: 'Assistant Professor', joined: d(2021, 9, 1) },
      { id: 'DSU-305', fn: 'Omer', ln: 'Farooq', email: 'omer.farooq@dsu.edu.pk', desig: 'Lecturer', joined: d(2023, 5, 1) },
    ],
    'Social Sciences': [
      { id: 'DSU-401', fn: 'Zoya', ln: 'Hameed', email: 'zoya.hameed@dsu.edu.pk', desig: 'Assistant Professor', joined: d(2022, 9, 1) },
      { id: 'DSU-402', fn: 'Talha', ln: 'Shafi', email: 'talha.shafi@dsu.edu.pk', desig: 'Lecturer', joined: d(2023, 4, 1) },
      { id: 'DSU-403', fn: 'Amber', ln: 'Riaz', email: 'amber.riaz@dsu.edu.pk', desig: 'Associate Professor', joined: d(2020, 8, 1) },
      { id: 'DSU-404', fn: 'Zeeshan', ln: 'Butt', email: 'zeeshan.butt@dsu.edu.pk', desig: 'Lecturer', joined: d(2023, 7, 1) },
      { id: 'DSU-405', fn: 'Laiba', ln: 'Amin', email: 'laiba.amin@dsu.edu.pk', desig: 'Assistant Professor', joined: d(2022, 3, 1) },
    ],
  };

  const allUsers = [vc, registrar, ...Object.values(hods)];
  const facultyUsers = [];
  for (const [dept, list] of Object.entries(facultyByDept)) {
    for (const f of list) {
      const user = await prisma.user.upsert({
        where: { email: f.email },
        update: {},
        create: {
          organizationId: org.id, employeeId: f.id, firstName: f.fn, lastName: f.ln,
          email: f.email, passwordHash: pw, roleId: facultyRole.id,
          managerId: hods[dept].id, departmentId: depts[dept].id, designation: f.desig,
          joiningDate: f.joined, phone: `+92-300-3${f.id.split('-')[1]}`,
        },
      });
      facultyUsers.push(user);
      allUsers.push(user);
    }
  }
  console.log(`   ✓ ${allUsers.length} users created (1 VC, 1 Registrar, 4 HODs, ${facultyUsers.length} Faculty)`);
  console.log('     → Demo user password supplied through SEED_USER_PASSWORD');
  console.log(`     → Live "auto-approve" demo user: ahmed.raza@dsu.edu.pk (Computer Science, clean balance)`);

  // ── 6. LEAVE BALANCES ───────────────────────────────────────────────────────
  console.log('💰 Initializing leave balances...');
  const year = new Date().getFullYear();
  const policyList = Object.values(policies);
  for (const user of allUsers) {
    for (const policy of policyList) {
      await prisma.leaveBalance.upsert({
        where: { userId_policyId_year: { userId: user.id, policyId: policy.id, year } },
        update: {},
        create: { organizationId: org.id, userId: user.id, policyId: policy.id, year, totalDays: policy.totalDays, usedDays: 0, remainingDays: policy.totalDays },
      });
    }
  }

  // ── 7. ATTENDANCE — last ~2 months ──────────────────────────────────────────
  console.log('📅 Generating 2 months of attendance data...');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const attendanceStart = new Date(today.getFullYear(), today.getMonth() - 2, 1);

  const patternFor = (employeeId) => {
    // A couple of intentionally "at-risk" profiles for the Attrition Risk demo
    if (employeeId === 'DSU-105') return { late: 0.18, absent: 0.10, half: 0.05 }; // struggling lab instructor
    if (employeeId === 'DSU-304') return { late: 0.15, absent: 0.08, half: 0.04 };
    if (employeeId === 'DSU-001' || employeeId === 'DSU-002') return { late: 0.0, absent: 0.0, half: 0.0 };
    return { late: 0.04, absent: 0.02, half: 0.02 };
  };

  let attendanceCount = 0;
  for (const user of allUsers) {
    const pat = patternFor(user.employeeId);
    const cur = new Date(attendanceStart);
    while (cur <= today) {
      const date = new Date(cur);
      cur.setDate(cur.getDate() + 1);
      if (isWeekend(date) || date >= today) continue;

      const rand = Math.random();
      let status = 'PRESENT';
      let checkInHour = 8, checkInMin = Math.floor(Math.random() * 20);
      let checkOutHour = 16, checkOutMin = Math.floor(Math.random() * 60);
      let workingHours = 8 + (Math.random() * 1 - 0.5);

      if (rand < pat.absent) {
        status = 'ABSENT'; checkInHour = null; checkInMin = null; checkOutHour = null; checkOutMin = null; workingHours = 0;
      } else if (rand < pat.absent + pat.half) {
        status = 'HALF_DAY'; checkInHour = 8; checkInMin = 10; checkOutHour = 12; checkOutMin = 0; workingHours = 4;
      } else if (rand < pat.absent + pat.half + pat.late) {
        status = 'LATE'; checkInHour = 8; checkInMin = 35 + Math.floor(Math.random() * 60);
        if (checkInMin >= 60) { checkInHour = 9; checkInMin -= 60; }
        workingHours = 7 + Math.random();
      }

      const y = date.getFullYear(), m = date.getMonth() + 1, day = date.getDate();
      const checkIn = status !== 'ABSENT' ? dt(y, m, day, checkInHour, checkInMin) : null;
      const checkOut = status !== 'ABSENT' ? dt(y, m, day, checkOutHour, checkOutMin) : null;

      try {
        await prisma.attendance.upsert({
          where: { userId_date: { userId: user.id, date } },
          update: {},
          create: {
            organizationId: org.id, userId: user.id, date, checkIn, checkOut, status,
            workingHours: status !== 'ABSENT' ? parseFloat(workingHours.toFixed(2)) : 0,
            source: Math.random() > 0.3 ? 'TMS_SYNC' : 'MANUAL',
          },
        });
        attendanceCount++;
      } catch {}
    }
  }
  console.log(`   ✓ ${attendanceCount} attendance records created`);

  // ── 8. LEAVE REQUESTS — mixed history + one clean slate for the live demo ──
  console.log('🏖  Creating leave request history...');
  const userMap = {};
  for (const u of allUsers) userMap[u.email] = u;

  const leaveScenarios = [
    { emp: 'sadia.khalid@dsu.edu.pk', approver: 'kashif.mahmood@dsu.edu.pk', type: 'ANNUAL', start: daysAgo(45), end: daysAgo(41), reason: 'Family wedding out of city', status: 'APPROVED', note: 'Approved. Enjoy!', appliedAt: daysAgo(50), autoApproved: false },
    { emp: 'waqas.ahmed@dsu.edu.pk', approver: 'nazia.rehman@dsu.edu.pk', type: 'SICK', start: daysAgo(30), end: daysAgo(29), reason: 'Flu, doctor advised rest', status: 'APPROVED', note: 'Get well soon.', appliedAt: daysAgo(30), autoApproved: false },
    { emp: 'iqra.naeem@dsu.edu.pk', approver: null, type: 'CASUAL', start: daysAgo(20), end: daysAgo(20), reason: 'Personal errand', status: 'APPROVED', note: 'Auto-approved — within policy, no manager review needed.', appliedAt: daysAgo(20), autoApproved: true },
    { emp: 'zeeshan.butt@dsu.edu.pk', approver: null, type: 'CASUAL', start: daysAgo(12), end: daysAgo(12), reason: 'Bank documentation', status: 'APPROVED', note: 'Auto-approved — within policy, no manager review needed.', appliedAt: daysAgo(12), autoApproved: true },
    { emp: 'omer.farooq@dsu.edu.pk', approver: 'salman.qureshi@dsu.edu.pk', type: 'ANNUAL', start: daysAgo(15), end: daysAgo(9), reason: 'Umrah trip', status: 'REJECTED', note: 'Mid-semester exams this week. Please reschedule after results.', appliedAt: daysAgo(18) },
    { emp: 'amber.riaz@dsu.edu.pk', approver: 'rukhsana.aslam@dsu.edu.pk', type: 'ANNUAL', start: daysAgo(3), end: daysAgo(-1), reason: 'Sibling\'s convocation', status: 'PENDING', note: null, appliedAt: daysAgo(3) },
    { emp: 'danish.iqbal@dsu.edu.pk', approver: 'nazia.rehman@dsu.edu.pk', type: 'SICK', start: daysAgo(2), end: daysAgo(-1), reason: 'Dental surgery recovery', status: 'PENDING', note: null, appliedAt: daysAgo(2) },
  ];

  const createdLeaves = [];
  for (const s of leaveScenarios) {
    const emp = userMap[s.emp];
    const approver = s.approver ? userMap[s.approver] : null;
    if (!emp) continue;

    const totalDays = businessDays(s.start, s.end);
    const leave = await prisma.leaveRequest.create({
      data: {
        organizationId: org.id, employeeId: emp.id, approverId: approver?.id || emp.managerId || null,
        leaveType: s.type, startDate: s.start, endDate: s.end, totalDays,
        reason: s.reason, status: s.status, approverNote: s.note, appliedAt: s.appliedAt,
        reviewedAt: s.status !== 'PENDING' ? new Date(s.appliedAt.getTime() + 3600000) : null,
      },
    });
    createdLeaves.push({ leave, scenario: s });

    if (s.status === 'APPROVED') {
      const policy = policies[s.type];
      await prisma.leaveBalance.updateMany({
        where: { organizationId: org.id, userId: emp.id, policyId: policy.id, year },
        data: { usedDays: { increment: totalDays }, remainingDays: { decrement: totalDays } },
      });
    }
  }
  for (const item of createdLeaves) {
    const decision = item.scenario.autoApproved
      ? 'AUTO_APPROVED'
      : item.scenario.status === 'APPROVED' ? 'APPROVED'
      : item.scenario.status === 'REJECTED' ? 'REJECTED'
      : 'PENDING_MANAGER';
    await prisma.leaveDecisionLog.create({
      data: {
        organizationId: org.id, leaveRequestId: item.leave.id, employeeId: item.leave.employeeId,
        decision, confidence: item.scenario.autoApproved ? 0.95 : 1,
        reasons: [item.scenario.note || `Seeded ${decision.toLowerCase()} leave scenario`],
        requiredApprovals: decision === 'PENDING_MANAGER' ? ['MANAGER'] : [],
        evaluatedBy: item.leave.approverId,
      },
    });
  }
  console.log(`   ✓ ${leaveScenarios.length} leave requests created (2 genuinely AUTO_APPROVED, 2 PENDING for live HOD approval demo)`);
  console.log('   ✓ ahmed.raza@dsu.edu.pk left untouched — apply a 1-day CASUAL leave live to trigger real-time auto-approval');

  // ── 9. PERFORMANCE RECORDS (precomputed; ETL will refine/extend) ───────────
  console.log('📊 Precomputing performance records...');
  let perfCount = 0;
  const months = new Set();
  {
    const cur = new Date(attendanceStart);
    while (cur <= today) { months.add(`${cur.getFullYear()}-${cur.getMonth() + 1}`); cur.setMonth(cur.getMonth() + 1); }
  }
  for (const user of allUsers) {
    for (const key of months) {
      const [y, m] = key.split('-').map(Number);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0, 23, 59, 59);
      const records = await prisma.attendance.findMany({ where: { userId: user.id, date: { gte: start, lte: end } } });
      if (records.length === 0) continue;

      const presentDays = records.filter(r => ['PRESENT', 'LATE'].includes(r.status)).length;
      const absentDays = records.filter(r => r.status === 'ABSENT').length;
      const lateDays = records.filter(r => r.status === 'LATE').length;
      const leaveDays = records.filter(r => r.status === 'ON_LEAVE').length;
      const totalHours = records.reduce((s, r) => s + (r.workingHours || 0), 0);
      const avgWorkingHours = records.length > 0 ? parseFloat((totalHours / records.length).toFixed(2)) : 0;
      const workingDays = Math.max(presentDays + absentDays + lateDays + leaveDays, 1);
      const attendanceScore = parseFloat(((presentDays / workingDays) * 100).toFixed(1));
      const leaveScore = parseFloat((100 - (leaveDays / workingDays) * 100).toFixed(1));
      const overallScore = parseFloat(((attendanceScore + leaveScore) / 2).toFixed(1));

      await prisma.performanceRecord.upsert({
        where: { userId_month_year: { userId: user.id, month: m, year: y } },
        update: { organizationId: org.id, presentDays, absentDays, lateDays, leaveDays, avgWorkingHours, attendanceScore, leaveScore, overallScore },
        create: { organizationId: org.id, userId: user.id, month: m, year: y, presentDays, absentDays, lateDays, leaveDays, avgWorkingHours, attendanceScore, leaveScore, overallScore },
      });
      perfCount++;
    }
  }
  console.log(`   ✓ ${perfCount} performance records computed (run ETL afterward to refine)`);

  console.log('\n✅ DSU University demo data seeded successfully.\n');
  console.log('Login users (password supplied through SEED_USER_PASSWORD):');
  console.log('  Vice Chancellor : vc@dsu.edu.pk');
  console.log('  Registrar       : registrar@dsu.edu.pk');
  console.log('  HOD (CS)        : kashif.mahmood@dsu.edu.pk');
  console.log('  Faculty (demo)  : ahmed.raza@dsu.edu.pk\n');
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());

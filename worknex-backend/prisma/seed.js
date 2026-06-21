/**
 * WorkNex AI — Full FinTech Demo Seed
 * Company: NovaPay Financial Services
 * Simulates 3 months of real activity across all modules
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const YEAR = 2025;
const HASH = '$2a$12$demo.hash.placeholder'; // replaced per user below

// ─── Helpers ─────────────────────────────────────────────────────────────────

const d = (y, m, day) => new Date(y, m - 1, day);

const dt = (y, m, day, h, min) => {
  const date = new Date(y, m - 1, day, h, min, 0);
  return date;
};

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

const hash = async (pw) => bcrypt.hash(pw, 10);

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🚀 Seeding WorkNex AI — NovaPay Financial Services\n');

  // ── 1. DEPARTMENTS ──────────────────────────────────────────────────────────
  console.log('📁 Creating organization & departments...');

  // Create the NovaPay organization with a known ID for demo
  const org = await prisma.organization.upsert({
    where: { slug: 'novapay-financial-services' },
    update: {},
    create: {
      id: 'org-uuid-novapay',
      name: 'NovaPay Financial Services',
      slug: 'novapay-financial-services',
      industry: 'FinTech',
      country: 'Pakistan',
      phone: '+92-300-1110001',
      website: 'https://novapay.pk',
    },
  });

  // Create an active GROWTH subscription for the org
  await prisma.subscription.upsert({
    where: { organizationId: org.id },
    update: {},
    create: {
      organizationId: org.id,
      plan: 'GROWTH',
      status: 'ACTIVE',
      billingCycle: 'MONTHLY',
      maxEmployees: 100,
      pricePerMonth: 79,
      discountPercent: 0,
      currentPeriodStart: new Date('2025-04-01'),
      currentPeriodEnd: new Date('2025-05-01'),
      licenseKey: 'WNX-NOVAPAY-DEMO-KEY',
    },
  });

  // Create a sample invoice
  await prisma.invoice.upsert({
    where: { invoiceNumber: 'INV-2025-00001' },
    update: {},
    create: {
      organizationId: org.id,
      invoiceNumber: 'INV-2025-00001',
      plan: 'GROWTH',
      billingCycle: 'MONTHLY',
      amount: 79,
      discount: 0,
      tax: 0,
      totalAmount: 79,
      status: 'PAID',
      paymentMethod: 'CARD',
      paymentReference: 'TXN-DEMO-001',
      paidAt: new Date('2025-04-01'),
      dueDate: new Date('2025-04-01'),
      periodStart: new Date('2025-04-01'),
      periodEnd: new Date('2025-05-01'),
    },
  });

  await prisma.organizationSettings.upsert({
    where: { organizationId: org.id },
    update: {
      timezone: 'Asia/Karachi',
      workingHoursStart: '09:00',
      workingHoursEnd: '17:00',
      lateThresholdMinutes: 30,
      officeIpRanges: ['127.0.0.1/32', '192.168.1.0/24'],
      wifiVerificationEnabled: false,
      leaveAutomationEnabled: true,
      attendancePolicyJson: { halfDayHours: 4, fullDayHours: 8 },
    },
    create: {
      organizationId: org.id,
      timezone: 'Asia/Karachi',
      workingHoursStart: '09:00',
      workingHoursEnd: '17:00',
      lateThresholdMinutes: 30,
      officeIpRanges: ['127.0.0.1/32', '192.168.1.0/24'],
      wifiVerificationEnabled: false,
      leaveAutomationEnabled: true,
      attendancePolicyJson: { halfDayHours: 4, fullDayHours: 8 },
    },
  });

  console.log('   ✓ Organization, subscription & invoice created');

  const deptData = [
    { name: 'Engineering',        description: 'Core product & platform development' },
    { name: 'Product',            description: 'Product management and design' },
    { name: 'Finance & Accounts', description: 'Financial operations and compliance' },
    { name: 'Human Resources',    description: 'People operations and talent' },
    { name: 'Risk & Compliance',  description: 'Regulatory and risk management' },
    { name: 'Customer Success',   description: 'Client onboarding and support' },
    { name: 'Sales',              description: 'Business development and partnerships' },
  ];

  const depts = {};
  for (const d of deptData) {
    const dept = await prisma.department.upsert({
      where: { organizationId_name: { organizationId: org.id, name: d.name } },
      update: {},
      create: { ...d, organizationId: org.id },
    });
    depts[d.name] = dept;
  }
  console.log(`   ✓ ${deptData.length} departments created`);

  // ── 2. LEAVE POLICIES ───────────────────────────────────────────────────────
  console.log('📋 Creating leave policies...');

  const policyData = [
    { leaveType: 'ANNUAL',    totalDays: 18, carryForward: true,  maxCarryForward: 5,  applicableRoles: ['EMPLOYEE','MANAGER','ADMIN','SUPER_ADMIN'], description: 'Annual paid leave' },
    { leaveType: 'SICK',      totalDays: 10, carryForward: false, maxCarryForward: 0,  applicableRoles: ['EMPLOYEE','MANAGER','ADMIN','SUPER_ADMIN'], description: 'Medical/sick leave' },
    { leaveType: 'CASUAL',    totalDays: 7,  carryForward: false, maxCarryForward: 0,  applicableRoles: ['EMPLOYEE','MANAGER','ADMIN','SUPER_ADMIN'], description: 'Short casual leave' },
    { leaveType: 'MATERNITY', totalDays: 90, carryForward: false, maxCarryForward: 0,  applicableRoles: ['EMPLOYEE','MANAGER'],                       description: 'Maternity leave' },
    { leaveType: 'PATERNITY', totalDays: 14, carryForward: false, maxCarryForward: 0,  applicableRoles: ['EMPLOYEE','MANAGER'],                       description: 'Paternity leave' },
    { leaveType: 'UNPAID',    totalDays: 30, carryForward: false, maxCarryForward: 0,  applicableRoles: ['EMPLOYEE','MANAGER','ADMIN'],                description: 'Unpaid leave' },
  ];

  const policies = {};
  for (const p of policyData) {
    const existing = await prisma.leavePolicy.findFirst({
      where: { organizationId: org.id, leaveType: p.leaveType },
    });
    const policy = existing
      ? await prisma.leavePolicy.update({ where: { id: existing.id }, data: { ...p, organizationId: org.id } })
      : await prisma.leavePolicy.create({ data: { ...p, organizationId: org.id } });
    policies[p.leaveType] = policy;
  }
  const demoPolicyRules = {
    parser: 'seeded-demo-policy',
    confidence: 1,
    leavePolicies: policyData.map((p) => ({
      leaveType: p.leaveType,
      annualQuota: p.totalDays,
      maxConsecutiveDays: p.leaveType === 'ANNUAL' ? 10 : null,
      minNoticeDays: p.leaveType === 'ANNUAL' ? 7 : 0,
      applicableRoles: p.applicableRoles,
      carryForwardAllowed: p.carryForward,
      maxCarryForwardDays: p.maxCarryForward,
      requiresManagerApproval: true,
      requiresAdminApproval: false,
      requiresMedicalCertificateAfterDays: p.leaveType === 'SICK' ? 2 : null,
      probationAllowed: true,
    })),
  };
  const demoPolicyVersion = await prisma.leavePolicyVersion.upsert({
    where: { organizationId_version: { organizationId: org.id, version: 1 } },
    update: { status: 'ACTIVE', effectiveFrom: d(YEAR, 1, 1), rulesJson: demoPolicyRules },
    create: {
      organizationId: org.id,
      version: 1,
      status: 'ACTIVE',
      effectiveFrom: d(YEAR, 1, 1),
      rulesJson: demoPolicyRules,
    },
  });
  console.log(`   ✓ ${policyData.length} leave policies created`);

  // ── 3. HOLIDAYS ─────────────────────────────────────────────────────────────
  console.log('🗓  Creating holidays...');

  const holidayData = [
    { name: 'New Year\'s Day',   date: d(YEAR, 1,  1),  isRecurring: true },
    { name: 'Kashmir Day',       date: d(YEAR, 2,  5),  isRecurring: true },
    { name: 'Pakistan Day',      date: d(YEAR, 3,  23), isRecurring: true },
    { name: 'Labour Day',        date: d(YEAR, 5,  1),  isRecurring: true },
    { name: 'Eid ul Fitr Day 1', date: d(YEAR, 3,  31), isRecurring: false },
    { name: 'Eid ul Fitr Day 2', date: d(YEAR, 4,  1),  isRecurring: false },
    { name: 'Eid ul Adha Day 1', date: d(YEAR, 6,  7),  isRecurring: false },
    { name: 'Eid ul Adha Day 2', date: d(YEAR, 6,  8),  isRecurring: false },
    { name: 'Independence Day',  date: d(YEAR, 8,  14), isRecurring: true },
    { name: 'Iqbal Day',         date: d(YEAR, 11, 9),  isRecurring: true },
    { name: 'Christmas',         date: d(YEAR, 12, 25), isRecurring: true },
    { name: 'Quaid Day',         date: d(YEAR, 12, 25), isRecurring: true },
  ];

  for (const h of holidayData) {
    const existing = await prisma.holiday.findFirst({ where: { organizationId: org.id, name: h.name } });
    if (!existing) await prisma.holiday.create({ data: { ...h, organizationId: org.id } });
  }
  console.log(`   ✓ ${holidayData.length} holidays created`);

  // ── 4. USERS ────────────────────────────────────────────────────────────────
  console.log('👥 Creating users...');

  const pw = await hash('NovaPay@2025');

  // Super Admin — CEO / Owner
  const owner = await prisma.user.upsert({
    where: { email: 'zaid.khan@novapay.pk' },
    update: {},
    create: {
      organizationId: org.id,
      employeeId: 'NP-001', firstName: 'Zaid',    lastName: 'Khan',
      email: 'zaid.khan@novapay.pk',       passwordHash: pw,
      role: 'SUPER_ADMIN', departmentId: depts['Finance & Accounts'].id,
      designation: 'Chief Executive Officer', joiningDate: d(2022, 1, 10),
      phone: '+92-300-1110001',
    },
  });

  // Admin — HR Director
  const hrAdmin = await prisma.user.upsert({
    where: { email: 'sara.malik@novapay.pk' },
    update: {},
    create: {
      organizationId: org.id,
      employeeId: 'NP-002', firstName: 'Sara',    lastName: 'Malik',
      email: 'sara.malik@novapay.pk',       passwordHash: pw,
      role: 'ADMIN', departmentId: depts['Human Resources'].id,
      managerId: owner.id, designation: 'HR Director', joiningDate: d(2022, 3, 1),
      phone: '+92-300-1110002',
    },
  });

  // Managers
  const engManager = await prisma.user.upsert({
    where: { email: 'ali.raza@novapay.pk' },
    update: {},
    create: {
      organizationId: org.id,
      employeeId: 'NP-003', firstName: 'Ali',     lastName: 'Raza',
      email: 'ali.raza@novapay.pk',         passwordHash: pw,
      role: 'MANAGER', departmentId: depts['Engineering'].id,
      managerId: owner.id, designation: 'Engineering Manager', joiningDate: d(2022, 4, 15),
      phone: '+92-300-1110003',
    },
  });

  const productManager = await prisma.user.upsert({
    where: { email: 'hina.shah@novapay.pk' },
    update: {},
    create: {
      organizationId: org.id,
      employeeId: 'NP-004', firstName: 'Hina',    lastName: 'Shah',
      email: 'hina.shah@novapay.pk',        passwordHash: pw,
      role: 'MANAGER', departmentId: depts['Product'].id,
      managerId: owner.id, designation: 'Product Manager', joiningDate: d(2022, 6, 1),
      phone: '+92-300-1110004',
    },
  });

  const riskManager = await prisma.user.upsert({
    where: { email: 'omar.farooq@novapay.pk' },
    update: {},
    create: {
      organizationId: org.id,
      employeeId: 'NP-005', firstName: 'Omar',    lastName: 'Farooq',
      email: 'omar.farooq@novapay.pk',      passwordHash: pw,
      role: 'MANAGER', departmentId: depts['Risk & Compliance'].id,
      managerId: owner.id, designation: 'Risk & Compliance Manager', joiningDate: d(2022, 7, 20),
      phone: '+92-300-1110005',
    },
  });

  const salesManager = await prisma.user.upsert({
    where: { email: 'nadia.hussain@novapay.pk' },
    update: {},
    create: {
      organizationId: org.id,
      employeeId: 'NP-006', firstName: 'Nadia',   lastName: 'Hussain',
      email: 'nadia.hussain@novapay.pk',    passwordHash: pw,
      role: 'MANAGER', departmentId: depts['Sales'].id,
      managerId: owner.id, designation: 'Sales Manager', joiningDate: d(2023, 1, 5),
      phone: '+92-300-1110006',
    },
  });

  // Engineering Employees
  const engEmployees = [
    { id: 'NP-007', fn: 'Bilal',   ln: 'Ahmed',    email: 'bilal.ahmed@novapay.pk',    desig: 'Senior Backend Engineer',   joined: d(2022, 8, 1) },
    { id: 'NP-008', fn: 'Ayesha',  ln: 'Siddiqui', email: 'ayesha.s@novapay.pk',       desig: 'Frontend Engineer',         joined: d(2023, 2, 1) },
    { id: 'NP-009', fn: 'Hamza',   ln: 'Tariq',    email: 'hamza.tariq@novapay.pk',    desig: 'DevOps Engineer',           joined: d(2023, 3, 15) },
    { id: 'NP-010', fn: 'Zara',    ln: 'Qureshi',  email: 'zara.q@novapay.pk',         desig: 'QA Engineer',               joined: d(2023, 5, 1) },
    { id: 'NP-011', fn: 'Faisal',  ln: 'Mehmood',  email: 'faisal.m@novapay.pk',       desig: 'Mobile Engineer',           joined: d(2023, 7, 10) },
  ];

  const productEmployees = [
    { id: 'NP-012', fn: 'Sana',    ln: 'Baig',     email: 'sana.baig@novapay.pk',      desig: 'UI/UX Designer',            joined: d(2023, 1, 20) },
    { id: 'NP-013', fn: 'Usman',   ln: 'Ghani',    email: 'usman.ghani@novapay.pk',    desig: 'Business Analyst',          joined: d(2023, 4, 1) },
  ];

  const financeEmployees = [
    { id: 'NP-014', fn: 'Rabia',   ln: 'Noor',     email: 'rabia.noor@novapay.pk',     desig: 'Financial Analyst',         joined: d(2022, 9, 1) },
    { id: 'NP-015', fn: 'Kamran',  ln: 'Iqbal',    email: 'kamran.iqbal@novapay.pk',   desig: 'Accounts Officer',          joined: d(2023, 2, 15) },
  ];

  const riskEmployees = [
    { id: 'NP-016', fn: 'Amna',    ln: 'Javed',    email: 'amna.javed@novapay.pk',     desig: 'Compliance Analyst',        joined: d(2023, 3, 1) },
    { id: 'NP-017', fn: 'Tariq',   ln: 'Bashir',   email: 'tariq.bashir@novapay.pk',   desig: 'Risk Analyst',              joined: d(2023, 6, 1) },
  ];

  const salesEmployees = [
    { id: 'NP-018', fn: 'Imran',   ln: 'Malik',    email: 'imran.malik@novapay.pk',    desig: 'Business Development Exec', joined: d(2023, 4, 15) },
    { id: 'NP-019', fn: 'Farah',   ln: 'Aziz',     email: 'farah.aziz@novapay.pk',     desig: 'Account Executive',         joined: d(2023, 8, 1) },
  ];

  const csEmployees = [
    { id: 'NP-020', fn: 'Hassan',  ln: 'Ali',      email: 'hassan.ali@novapay.pk',     desig: 'Customer Success Exec',     joined: d(2023, 5, 15) },
  ];

  const allEmployeeGroups = [
    { list: engEmployees,     deptKey: 'Engineering',        manager: engManager },
    { list: productEmployees, deptKey: 'Product',            manager: productManager },
    { list: financeEmployees, deptKey: 'Finance & Accounts', manager: owner },
    { list: riskEmployees,    deptKey: 'Risk & Compliance',  manager: riskManager },
    { list: salesEmployees,   deptKey: 'Sales',              manager: salesManager },
    { list: csEmployees,      deptKey: 'Customer Success',   manager: hrAdmin },
  ];

  const allUsers = [owner, hrAdmin, engManager, productManager, riskManager, salesManager];

  for (const group of allEmployeeGroups) {
    for (const e of group.list) {
      const user = await prisma.user.upsert({
        where: { email: e.email },
        update: {},
        create: {
          organizationId: org.id,
          employeeId: e.id, firstName: e.fn, lastName: e.ln,
          email: e.email, passwordHash: pw, role: 'EMPLOYEE',
          departmentId: depts[group.deptKey].id,
          managerId: group.manager.id,
          designation: e.desig, joiningDate: e.joined,
          phone: `+92-300-111${e.id.split('-')[1]}`,
        },
      });
      allUsers.push(user);
    }
  }

  console.log(`   ✓ ${allUsers.length} users created`);

  // ── 5. LEAVE BALANCES ───────────────────────────────────────────────────────
  console.log('💰 Creating leave balances...');

  const policyList = Object.values(policies);
  for (const user of allUsers) {
    for (const policy of policyList) {
      await prisma.leaveBalance.upsert({
        where: { userId_policyId_year: { userId: user.id, policyId: policy.id, year: YEAR } },
        update: {},
        create: {
          organizationId: org.id,
          userId: user.id, policyId: policy.id, year: YEAR,
          totalDays: policy.totalDays,
          usedDays: 0,
          remainingDays: policy.totalDays,
        },
      });
    }
  }
  console.log(`   ✓ Leave balances initialized for all users`);

  // ── 6. ATTENDANCE — 3 months (Jan, Feb, Mar 2025) ──────────────────────────
  console.log('📅 Generating 3 months of attendance data...');

  // Patterns per employee (realistic variation)
  // pattern: { lateChance, absentChance, halfDayChance }
  const patterns = {
    'NP-001': { late: 0.00, absent: 0.00, half: 0.00 }, // CEO — always present
    'NP-002': { late: 0.02, absent: 0.01, half: 0.01 },
    'NP-003': { late: 0.05, absent: 0.02, half: 0.02 },
    'NP-004': { late: 0.03, absent: 0.02, half: 0.03 },
    'NP-005': { late: 0.02, absent: 0.01, half: 0.01 },
    'NP-006': { late: 0.08, absent: 0.03, half: 0.02 },
    'NP-007': { late: 0.05, absent: 0.02, half: 0.02 },
    'NP-008': { late: 0.10, absent: 0.04, half: 0.03 }, // slightly problematic
    'NP-009': { late: 0.03, absent: 0.01, half: 0.01 },
    'NP-010': { late: 0.06, absent: 0.03, half: 0.02 },
    'NP-011': { late: 0.04, absent: 0.02, half: 0.02 },
    'NP-012': { late: 0.05, absent: 0.02, half: 0.03 },
    'NP-013': { late: 0.03, absent: 0.01, half: 0.01 },
    'NP-014': { late: 0.02, absent: 0.01, half: 0.01 },
    'NP-015': { late: 0.07, absent: 0.04, half: 0.03 },
    'NP-016': { late: 0.04, absent: 0.02, half: 0.02 },
    'NP-017': { late: 0.05, absent: 0.03, half: 0.02 },
    'NP-018': { late: 0.08, absent: 0.05, half: 0.03 }, // sales — often out
    'NP-019': { late: 0.06, absent: 0.03, half: 0.02 },
    'NP-020': { late: 0.04, absent: 0.02, half: 0.02 },
  };

  // Holidays to skip
  const holidayDates = new Set([
    '2025-01-01', '2025-02-05', '2025-03-23',
    '2025-03-31', '2025-04-01',
  ]);

  let attendanceCount = 0;

  for (const user of allUsers) {
    const pat = patterns[user.employeeId] || { late: 0.05, absent: 0.02, half: 0.02 };

    for (let month = 1; month <= 3; month++) {
      const daysInMonth = new Date(YEAR, month, 0).getDate();

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(YEAR, month - 1, day);
        date.setHours(0, 0, 0, 0);

        if (isWeekend(date)) continue;

        const dateStr = date.toISOString().split('T')[0];
        if (holidayDates.has(dateStr)) continue;

        // Skip future dates
        if (date > new Date()) continue;

        const rand = Math.random();
        let status = 'PRESENT';
        let checkInHour = 9, checkInMin = Math.floor(Math.random() * 20);
        let checkOutHour = 17, checkOutMin = Math.floor(Math.random() * 60);
        let workingHours = 8 + (Math.random() * 1 - 0.5);

        if (rand < pat.absent) {
          status = 'ABSENT';
          checkInHour = null; checkInMin = null;
          checkOutHour = null; checkOutMin = null;
          workingHours = 0;
        } else if (rand < pat.absent + pat.half) {
          status = 'HALF_DAY';
          checkInHour = 9; checkInMin = 10;
          checkOutHour = 13; checkOutMin = 0;
          workingHours = 4;
        } else if (rand < pat.absent + pat.half + pat.late) {
          status = 'LATE';
          checkInHour = 9; checkInMin = 35 + Math.floor(Math.random() * 60);
          if (checkInMin >= 60) { checkInHour = 10; checkInMin -= 60; }
          workingHours = 7 + Math.random();
        }

        const checkIn  = status !== 'ABSENT' ? dt(YEAR, month, day, checkInHour,  checkInMin)  : null;
        const checkOut = status !== 'ABSENT' ? dt(YEAR, month, day, checkOutHour, checkOutMin) : null;

        try {
          await prisma.attendance.upsert({
            where: { userId_date: { userId: user.id, date } },
            update: {},
            create: {
              organizationId: org.id,
              userId: user.id, date,
              checkIn, checkOut,
              status,
              workingHours: status !== 'ABSENT' ? parseFloat(workingHours.toFixed(2)) : 0,
              source: Math.random() > 0.3 ? 'TMS_SYNC' : 'MANUAL',
            },
          });
          attendanceCount++;
        } catch {}
      }
    }
  }
  console.log(`   ✓ ${attendanceCount} attendance records created`);

  // ── 7. LEAVE REQUESTS ───────────────────────────────────────────────────────
  console.log('🏖  Creating leave requests...');

  const leaveScenarios = [
    // APPROVED leaves
    {
      emp: 'bilal.ahmed@novapay.pk',    approver: 'ali.raza@novapay.pk',
      type: 'ANNUAL',   start: d(YEAR,1,13), end: d(YEAR,1,17),
      reason: 'Family vacation to northern areas', status: 'APPROVED',
      note: 'Approved. Enjoy your trip!', appliedAt: d(YEAR,1,8),
    },
    {
      emp: 'ayesha.s@novapay.pk',       approver: 'ali.raza@novapay.pk',
      type: 'SICK',     start: d(YEAR,1,20), end: d(YEAR,1,21),
      reason: 'Fever and flu, doctor advised rest', status: 'APPROVED',
      note: 'Get well soon.', appliedAt: d(YEAR,1,20),
    },
    {
      emp: 'hamza.tariq@novapay.pk',    approver: 'ali.raza@novapay.pk',
      type: 'CASUAL',   start: d(YEAR,2,3),  end: d(YEAR,2,3),
      reason: 'Personal errand — bank documentation', status: 'APPROVED',
      note: 'Approved.', appliedAt: d(YEAR,1,31),
    },
    {
      emp: 'sana.baig@novapay.pk',      approver: 'hina.shah@novapay.pk',
      type: 'ANNUAL',   start: d(YEAR,2,10), end: d(YEAR,2,14),
      reason: 'Wedding ceremony of sibling', status: 'APPROVED',
      note: 'Congratulations! Approved.', appliedAt: d(YEAR,2,5),
    },
    {
      emp: 'rabia.noor@novapay.pk',     approver: 'zaid.khan@novapay.pk',
      type: 'SICK',     start: d(YEAR,2,17), end: d(YEAR,2,18),
      reason: 'Migraine — unable to work', status: 'APPROVED',
      note: 'Approved. Please share medical certificate.', appliedAt: d(YEAR,2,17),
    },
    {
      emp: 'imran.malik@novapay.pk',    approver: 'nadia.hussain@novapay.pk',
      type: 'CASUAL',   start: d(YEAR,2,24), end: d(YEAR,2,24),
      reason: 'Child school admission process', status: 'APPROVED',
      note: 'Approved.', appliedAt: d(YEAR,2,21),
    },
    {
      emp: 'faisal.m@novapay.pk',       approver: 'ali.raza@novapay.pk',
      type: 'ANNUAL',   start: d(YEAR,3,3),  end: d(YEAR,3,7),
      reason: 'Umrah trip with family', status: 'APPROVED',
      note: 'Approved. Mabrook!', appliedAt: d(YEAR,2,25),
    },
    {
      emp: 'tariq.bashir@novapay.pk',   approver: 'omar.farooq@novapay.pk',
      type: 'SICK',     start: d(YEAR,3,10), end: d(YEAR,3,11),
      reason: 'Stomach infection', status: 'APPROVED',
      note: 'Approved.', appliedAt: d(YEAR,3,10),
    },
    {
      emp: 'usman.ghani@novapay.pk',    approver: 'hina.shah@novapay.pk',
      type: 'CASUAL',   start: d(YEAR,3,17), end: d(YEAR,3,17),
      reason: 'Passport renewal appointment', status: 'APPROVED',
      note: 'Approved.', appliedAt: d(YEAR,3,14),
    },
    // REJECTED leaves
    {
      emp: 'ayesha.s@novapay.pk',       approver: 'ali.raza@novapay.pk',
      type: 'ANNUAL',   start: d(YEAR,3,24), end: d(YEAR,3,28),
      reason: 'Planned trip to Dubai', status: 'REJECTED',
      note: 'Sprint deadline this week. Please reschedule.', appliedAt: d(YEAR,3,18),
    },
    {
      emp: 'kamran.iqbal@novapay.pk',   approver: 'zaid.khan@novapay.pk',
      type: 'CASUAL',   start: d(YEAR,2,12), end: d(YEAR,2,12),
      reason: 'Personal work', status: 'REJECTED',
      note: 'Quarter-end closing period. Cannot approve.', appliedAt: d(YEAR,2,11),
    },
    // PENDING leaves
    {
      emp: 'zara.q@novapay.pk',         approver: 'ali.raza@novapay.pk',
      type: 'ANNUAL',   start: d(YEAR,4,7),  end: d(YEAR,4,11),
      reason: 'Family trip to Murree', status: 'PENDING',
      note: null, appliedAt: d(YEAR,3,28),
    },
    {
      emp: 'farah.aziz@novapay.pk',     approver: 'nadia.hussain@novapay.pk',
      type: 'SICK',     start: d(YEAR,4,2),  end: d(YEAR,4,2),
      reason: 'Dental surgery recovery', status: 'PENDING',
      note: null, appliedAt: d(YEAR,3,30),
    },
    {
      emp: 'hassan.ali@novapay.pk',     approver: 'sara.malik@novapay.pk',
      type: 'CASUAL',   start: d(YEAR,4,4),  end: d(YEAR,4,4),
      reason: 'Home renovation — contractor visit', status: 'PENDING',
      note: null, appliedAt: d(YEAR,3,31),
    },
    // CANCELLED leave
    {
      emp: 'bilal.ahmed@novapay.pk',    approver: 'ali.raza@novapay.pk',
      type: 'CASUAL',   start: d(YEAR,3,20), end: d(YEAR,3,20),
      reason: 'Personal appointment', status: 'CANCELLED',
      note: null, appliedAt: d(YEAR,3,18),
    },
  ];

  const userMap = {};
  for (const u of allUsers) userMap[u.email] = u;

  const createdLeaves = [];
  for (const s of leaveScenarios) {
    const emp      = userMap[s.emp];
    const approver = userMap[s.approver];
    if (!emp || !approver) continue;

    const totalDays = businessDays(s.start, s.end);

    const leave = await prisma.leaveRequest.create({
      data: {
        organizationId: org.id,
        employeeId:   emp.id,
        approverId:   approver.id,
        leaveType:    s.type,
        startDate:    s.start,
        endDate:      s.end,
        totalDays,
        reason:       s.reason,
        status:       s.status,
        approverNote: s.note,
        appliedAt:    s.appliedAt,
        reviewedAt:   s.status !== 'PENDING' ? new Date(s.appliedAt.getTime() + 86400000) : null,
      },
    });
    createdLeaves.push({ leave, scenario: s });

    // Deduct balance for APPROVED leaves
    if (s.status === 'APPROVED') {
      const policy = policies[s.type];
      if (policy) {
        await prisma.leaveBalance.updateMany({
          where: { organizationId: org.id, userId: emp.id, policyId: policy.id, year: YEAR },
          data: { usedDays: { increment: totalDays }, remainingDays: { decrement: totalDays } },
        });
      }
    }
  }
  for (const item of createdLeaves) {
    const decision = item.scenario.status === 'APPROVED'
      ? 'APPROVED'
      : item.scenario.status === 'REJECTED'
        ? 'REJECTED'
        : item.scenario.status === 'CANCELLED'
          ? 'CANCELLED'
          : 'PENDING_MANAGER';
    await prisma.leaveDecisionLog.create({
      data: {
        organizationId: org.id,
        leaveRequestId: item.leave.id,
        employeeId: item.leave.employeeId,
        decision,
        confidence: 1,
        reasons: [item.scenario.note || `Seeded ${decision.toLowerCase()} leave scenario`],
        requiredApprovals: decision === 'PENDING_MANAGER' ? ['MANAGER'] : [],
        policyVersionId: demoPolicyVersion.id,
        evaluatedBy: item.leave.approverId,
      },
    });
  }
  console.log(`   ✓ ${leaveScenarios.length} leave requests created`);

  // ── 8. NOTIFICATIONS ────────────────────────────────────────────────────────
  console.log('🔔 Creating notifications...');

  const notifData = [
    // Leave notifications
    { email: 'ali.raza@novapay.pk',       type: 'LEAVE_APPLIED',   title: 'New Leave Request',       msg: 'Bilal Ahmed applied for ANNUAL leave (Jan 13–17)',          read: true  },
    { email: 'bilal.ahmed@novapay.pk',    type: 'LEAVE_APPROVED',  title: 'Leave Approved',          msg: 'Your ANNUAL leave (Jan 13–17) has been approved',           read: true  },
    { email: 'ali.raza@novapay.pk',       type: 'LEAVE_APPLIED',   title: 'New Leave Request',       msg: 'Ayesha Siddiqui applied for SICK leave (Jan 20–21)',        read: true  },
    { email: 'ayesha.s@novapay.pk',       type: 'LEAVE_APPROVED',  title: 'Leave Approved',          msg: 'Your SICK leave (Jan 20–21) has been approved',            read: true  },
    { email: 'ayesha.s@novapay.pk',       type: 'LEAVE_REJECTED',  title: 'Leave Rejected',          msg: 'Your ANNUAL leave (Mar 24–28) was rejected. Sprint deadline this week.', read: false },
    { email: 'ali.raza@novapay.pk',       type: 'LEAVE_APPLIED',   title: 'New Leave Request',       msg: 'Zara Qureshi applied for ANNUAL leave (Apr 7–11)',          read: false },
    { email: 'nadia.hussain@novapay.pk',  type: 'LEAVE_APPLIED',   title: 'New Leave Request',       msg: 'Farah Aziz applied for SICK leave (Apr 2)',                 read: false },
    { email: 'sara.malik@novapay.pk',     type: 'LEAVE_APPLIED',   title: 'New Leave Request',       msg: 'Hassan Ali applied for CASUAL leave (Apr 4)',               read: false },
    // Attendance alerts
    { email: 'ayesha.s@novapay.pk',       type: 'ATTENDANCE_ALERT', title: 'Late Check-In Alert',    msg: 'You were marked LATE on Feb 3. Check-in at 10:15 AM',       read: true  },
    { email: 'kamran.iqbal@novapay.pk',   type: 'ATTENDANCE_ALERT', title: 'Absent Alert',           msg: 'You were marked ABSENT on Feb 6. Please contact HR.',       read: false },
    { email: 'imran.malik@novapay.pk',    type: 'ATTENDANCE_ALERT', title: 'Late Check-In Alert',    msg: 'You were marked LATE on Mar 5. Check-in at 10:45 AM',       read: true  },
    // System notifications
    { email: 'zaid.khan@novapay.pk',      type: 'SYSTEM',           title: 'Monthly ETL Complete',   msg: 'Performance records for February 2025 have been computed',  read: true  },
    { email: 'sara.malik@novapay.pk',     type: 'SYSTEM',           title: 'New Employee Joined',    msg: 'Hassan Ali (NP-020) has been onboarded to Customer Success', read: true  },
    { email: 'zaid.khan@novapay.pk',      type: 'SYSTEM',           title: 'TMS Sync Completed',     msg: 'TMS sync for Mar 31: 20/20 records processed successfully', read: false },
    // Reminders
    { email: 'ali.raza@novapay.pk',       type: 'REMINDER',         title: 'Pending Approvals',      msg: 'You have 1 pending leave request awaiting your review',     read: false },
    { email: 'hina.shah@novapay.pk',      type: 'REMINDER',         title: 'Pending Approvals',      msg: 'You have 1 pending leave request awaiting your review',     read: false },
    { email: 'nadia.hussain@novapay.pk',  type: 'REMINDER',         title: 'Pending Approvals',      msg: 'You have 1 pending leave request awaiting your review',     read: false },
    { email: 'bilal.ahmed@novapay.pk',    type: 'REMINDER',         title: 'Leave Balance Reminder', msg: 'You have 13 Annual leave days remaining for 2025',          read: false },
    { email: 'faisal.m@novapay.pk',       type: 'LEAVE_APPROVED',   title: 'Leave Approved',         msg: 'Your ANNUAL leave (Mar 3–7) has been approved. Mabrook!',   read: true  },
  ];

  for (const n of notifData) {
    const user = userMap[n.email];
    if (!user) continue;
    await prisma.notification.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        type: n.type,
        title: n.title,
        message: n.msg,
        isRead: n.read,
      },
    });
  }
  console.log(`   ✓ ${notifData.length} notifications created`);

  // ── 9. PERFORMANCE RECORDS (ETL output) ─────────────────────────────────────
  console.log('📊 Computing performance records...');

  let perfCount = 0;
  for (const user of allUsers) {
    for (let month = 1; month <= 3; month++) {
      const { start, end } = { start: new Date(YEAR, month - 1, 1), end: new Date(YEAR, month, 0, 23, 59, 59) };

      const records = await prisma.attendance.findMany({
        where: { userId: user.id, date: { gte: start, lte: end } },
      });

      if (records.length === 0) continue;

      const presentDays     = records.filter(r => ['PRESENT','LATE'].includes(r.status)).length;
      const absentDays      = records.filter(r => r.status === 'ABSENT').length;
      const lateDays        = records.filter(r => r.status === 'LATE').length;
      const leaveDays       = records.filter(r => r.status === 'ON_LEAVE').length;
      const totalHours      = records.reduce((s, r) => s + (r.workingHours || 0), 0);
      const avgWorkingHours = records.length > 0 ? parseFloat((totalHours / records.length).toFixed(2)) : 0;
      const workingDays     = Math.max(presentDays + absentDays + lateDays + leaveDays, 1);
      const attendanceScore = parseFloat(((presentDays / workingDays) * 100).toFixed(1));
      const leaveScore      = parseFloat((100 - (leaveDays / workingDays) * 100).toFixed(1));
      const overallScore    = parseFloat(((attendanceScore + leaveScore) / 2).toFixed(1));

      await prisma.performanceRecord.upsert({
        where: { userId_month_year: { userId: user.id, month, year: YEAR } },
        update: { organizationId: org.id, presentDays, absentDays, lateDays, leaveDays, avgWorkingHours, attendanceScore, leaveScore, overallScore },
        create: { organizationId: org.id, userId: user.id, month, year: YEAR, presentDays, absentDays, lateDays, leaveDays, avgWorkingHours, attendanceScore, leaveScore, overallScore },
      });
      perfCount++;
    }
  }
  console.log(`   ✓ ${perfCount} performance records computed`);

  // ── 10. AUDIT LOGS ──────────────────────────────────────────────────────────
  console.log('📝 Creating audit logs...');

  const auditEntries = [
    { email: 'zaid.khan@novapay.pk',     action: 'CREATE', entity: 'Department',   note: 'Created Engineering department' },
    { email: 'zaid.khan@novapay.pk',     action: 'CREATE', entity: 'Department',   note: 'Created Product department' },
    { email: 'sara.malik@novapay.pk',    action: 'CREATE', entity: 'User',         note: 'Onboarded Bilal Ahmed (NP-007)' },
    { email: 'sara.malik@novapay.pk',    action: 'CREATE', entity: 'User',         note: 'Onboarded Ayesha Siddiqui (NP-008)' },
    { email: 'sara.malik@novapay.pk',    action: 'CREATE', entity: 'User',         note: 'Onboarded Hassan Ali (NP-020)' },
    { email: 'ali.raza@novapay.pk',      action: 'APPROVE', entity: 'LeaveRequest', note: 'Approved Bilal ANNUAL leave Jan 13-17' },
    { email: 'ali.raza@novapay.pk',      action: 'APPROVE', entity: 'LeaveRequest', note: 'Approved Ayesha SICK leave Jan 20-21' },
    { email: 'ali.raza@novapay.pk',      action: 'REJECT',  entity: 'LeaveRequest', note: 'Rejected Ayesha ANNUAL leave Mar 24-28' },
    { email: 'hina.shah@novapay.pk',     action: 'APPROVE', entity: 'LeaveRequest', note: 'Approved Sana ANNUAL leave Feb 10-14' },
    { email: 'zaid.khan@novapay.pk',     action: 'APPROVE', entity: 'LeaveRequest', note: 'Approved Rabia SICK leave Feb 17-18' },
    { email: 'zaid.khan@novapay.pk',     action: 'REJECT',  entity: 'LeaveRequest', note: 'Rejected Kamran CASUAL leave Feb 12' },
    { email: 'sara.malik@novapay.pk',    action: 'UPDATE',  entity: 'LeavePolicy',  note: 'Updated ANNUAL leave carry-forward to 5 days' },
    { email: 'zaid.khan@novapay.pk',     action: 'CREATE',  entity: 'Holiday',      note: 'Added Eid ul Fitr holidays' },
    { email: 'sara.malik@novapay.pk',    action: 'UPDATE',  entity: 'User',         note: 'Updated Kamran Iqbal designation' },
    { email: 'zaid.khan@novapay.pk',     action: 'LOGIN',   entity: 'Auth',         note: 'Owner login from 192.168.1.1' },
    { email: 'ali.raza@novapay.pk',      action: 'LOGIN',   entity: 'Auth',         note: 'Manager login from 192.168.1.5' },
  ];

  for (const a of auditEntries) {
    const user = userMap[a.email];
    if (!user) continue;
    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        action: a.action,
        entity: a.entity,
        newValues: { note: a.note },
        ipAddress: `192.168.1.${Math.floor(Math.random() * 20) + 1}`,
        userAgent: 'Mozilla/5.0 (WorkNex AI Seed)',
      },
    });
  }
  console.log(`   ✓ ${auditEntries.length} audit log entries created`);

  // ── 11. ETL SYNC LOGS ───────────────────────────────────────────────────────
  console.log('🔄 Creating ETL sync logs...');

  const etlLogs = [
    { source: 'TMS',       status: 'SUCCESS', recordsIn: 20, recordsOut: 20, startedAt: dt(YEAR,1,31,7,0),  completedAt: dt(YEAR,1,31,7,2) },
    { source: 'TMS',       status: 'SUCCESS', recordsIn: 20, recordsOut: 20, startedAt: dt(YEAR,2,28,7,0),  completedAt: dt(YEAR,2,28,7,2) },
    { source: 'TMS',       status: 'PARTIAL', recordsIn: 20, recordsOut: 18, errorLog: 'NP-018 not found in TMS. NP-019 duplicate skipped.', startedAt: dt(YEAR,3,15,8,0), completedAt: dt(YEAR,3,15,8,3) },
    { source: 'TMS',       status: 'SUCCESS', recordsIn: 20, recordsOut: 20, startedAt: dt(YEAR,3,31,7,0),  completedAt: dt(YEAR,3,31,7,2) },
    { source: 'SCHEDULED', status: 'SUCCESS', recordsIn: 20, recordsOut: 20, startedAt: dt(YEAR,2,1,2,0),   completedAt: dt(YEAR,2,1,2,5),  },
    { source: 'SCHEDULED', status: 'SUCCESS', recordsIn: 20, recordsOut: 20, startedAt: dt(YEAR,3,1,2,0),   completedAt: dt(YEAR,3,1,2,5),  },
    { source: 'SCHEDULED', status: 'SUCCESS', recordsIn: 20, recordsOut: 20, startedAt: dt(YEAR,4,1,2,0),   completedAt: dt(YEAR,4,1,2,5),  },
    { source: 'MANUAL',    status: 'SUCCESS', recordsIn: 5,  recordsOut: 5,  startedAt: dt(YEAR,2,10,11,0), completedAt: dt(YEAR,2,10,11,1) },
  ];

  for (const log of etlLogs) {
    await prisma.etlSyncLog.create({ data: { ...log, organizationId: org.id } });
  }

  // 12. EXTENDED CURRENT-YEAR DATA FOR MULTI-AGENT TESTING
  console.log('Creating extended current-year attendance data for agent testing...');

  const extendedYear = new Date().getFullYear();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentMonth = today.getFullYear() === extendedYear ? today.getMonth() + 1 : 12;

  const extendedHolidayData = [
    { name: `New Year's Day ${extendedYear}`, date: d(extendedYear, 1, 1), isRecurring: true },
    { name: `Pakistan Day ${extendedYear}`, date: d(extendedYear, 3, 23), isRecurring: true },
    { name: `Labour Day ${extendedYear}`, date: d(extendedYear, 5, 1), isRecurring: true },
    { name: `Independence Day ${extendedYear}`, date: d(extendedYear, 8, 14), isRecurring: true },
    { name: `Quaid Day ${extendedYear}`, date: d(extendedYear, 12, 25), isRecurring: true },
  ];

  for (const h of extendedHolidayData) {
    const existing = await prisma.holiday.findFirst({
      where: { organizationId: org.id, name: h.name, date: h.date },
    });
    if (!existing) await prisma.holiday.create({ data: { ...h, organizationId: org.id } });
  }

  for (const user of allUsers) {
    for (const policy of policyList) {
      await prisma.leaveBalance.upsert({
        where: { userId_policyId_year: { userId: user.id, policyId: policy.id, year: extendedYear } },
        update: {},
        create: {
          organizationId: org.id,
          userId: user.id,
          policyId: policy.id,
          year: extendedYear,
          totalDays: policy.totalDays,
          usedDays: 0,
          remainingDays: policy.totalDays,
        },
      });
    }
  }

  const deterministicPercent = (seedText) => {
    let hashValue = 0;
    for (const char of seedText) hashValue = (hashValue * 31 + char.charCodeAt(0)) % 10000;
    return hashValue / 10000;
  };

  const extendedHolidayDates = new Set(extendedHolidayData.map((h) => h.date.toISOString().split('T')[0]));
  let extendedAttendanceCount = 0;

  for (const user of allUsers) {
    const pat = patterns[user.employeeId] || { late: 0.05, absent: 0.02, half: 0.02 };

    for (let month = 1; month <= currentMonth; month++) {
      const daysInMonth = new Date(extendedYear, month, 0).getDate();

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(extendedYear, month - 1, day);
        date.setHours(0, 0, 0, 0);
        if (date > today) continue;

        const dateStr = date.toISOString().split('T')[0];
        if (isWeekend(date) || extendedHolidayDates.has(dateStr)) continue;

        const seed = `${user.employeeId}-${dateStr}`;
        const rand = deterministicPercent(seed);
        let status = 'PRESENT';
        let checkInHour = 9;
        let checkInMin = Math.floor(deterministicPercent(`${seed}-in`) * 25);
        let checkOutHour = 17;
        let checkOutMin = Math.floor(deterministicPercent(`${seed}-out`) * 55);
        let workingHours = 8 + deterministicPercent(`${seed}-hours`) * 0.8;

        if (rand < pat.absent) {
          status = 'ABSENT';
          checkInHour = null;
          checkInMin = null;
          checkOutHour = null;
          checkOutMin = null;
          workingHours = 0;
        } else if (rand < pat.absent + pat.half) {
          status = 'HALF_DAY';
          checkInHour = 9;
          checkInMin = 10;
          checkOutHour = 13;
          checkOutMin = 0;
          workingHours = 4;
        } else if (rand < pat.absent + pat.half + pat.late) {
          status = 'LATE';
          checkInHour = 9;
          checkInMin = 35 + Math.floor(deterministicPercent(`${seed}-late`) * 50);
          if (checkInMin >= 60) {
            checkInHour = 10;
            checkInMin -= 60;
          }
          workingHours = 7 + deterministicPercent(`${seed}-late-hours`) * 1.2;
        }

        const checkIn = status !== 'ABSENT' ? dt(extendedYear, month, day, checkInHour, checkInMin) : null;
        const checkOut = status !== 'ABSENT' ? dt(extendedYear, month, day, checkOutHour, checkOutMin) : null;

        await prisma.attendance.upsert({
          where: { userId_date: { userId: user.id, date } },
          update: {
            organizationId: org.id,
            checkIn,
            checkOut,
            status,
            workingHours: status !== 'ABSENT' ? parseFloat(workingHours.toFixed(2)) : 0,
            source: 'TMS_SYNC',
          },
          create: {
            organizationId: org.id,
            userId: user.id,
            date,
            checkIn,
            checkOut,
            status,
            workingHours: status !== 'ABSENT' ? parseFloat(workingHours.toFixed(2)) : 0,
            source: 'TMS_SYNC',
          },
        });
        extendedAttendanceCount++;
      }
    }
  }

  const todayScenarios = [
    { email: 'zaid.khan@novapay.pk', status: 'PRESENT', inHour: 8, inMin: 55, outHour: null, outMin: null, hours: 0 },
    { email: 'sara.malik@novapay.pk', status: 'PRESENT', inHour: 9, inMin: 2, outHour: null, outMin: null, hours: 0 },
    { email: 'ali.raza@novapay.pk', status: 'PRESENT', inHour: 9, inMin: 5, outHour: null, outMin: null, hours: 0 },
    { email: 'ayesha.s@novapay.pk', status: 'LATE', inHour: 10, inMin: 12, outHour: null, outMin: null, hours: 0 },
    { email: 'bilal.ahmed@novapay.pk', status: 'PRESENT', inHour: 9, inMin: 1, outHour: null, outMin: null, hours: 0 },
    { email: 'kamran.iqbal@novapay.pk', status: 'ABSENT', inHour: null, inMin: null, outHour: null, outMin: null, hours: 0 },
    { email: 'imran.malik@novapay.pk', status: 'HALF_DAY', inHour: 9, inMin: 20, outHour: 13, outMin: 15, hours: 3.9 },
    { email: 'farah.aziz@novapay.pk', status: 'PRESENT', inHour: 8, inMin: 58, outHour: null, outMin: null, hours: 0 },
  ];

  for (const row of todayScenarios) {
    const user = userMap[row.email];
    if (!user) continue;

    const checkIn = row.status !== 'ABSENT'
      ? dt(today.getFullYear(), today.getMonth() + 1, today.getDate(), row.inHour, row.inMin)
      : null;
    const checkOut = row.outHour !== null
      ? dt(today.getFullYear(), today.getMonth() + 1, today.getDate(), row.outHour, row.outMin)
      : null;

    await prisma.attendance.upsert({
      where: { userId_date: { userId: user.id, date: today } },
      update: {
        organizationId: org.id,
        checkIn,
        checkOut,
        status: row.status,
        workingHours: row.hours,
        source: 'MANUAL',
      },
      create: {
        organizationId: org.id,
        userId: user.id,
        date: today,
        checkIn,
        checkOut,
        status: row.status,
        workingHours: row.hours,
        source: 'MANUAL',
      },
    });
  }

  let extendedPerfCount = 0;
  for (const user of allUsers) {
    for (let month = 1; month <= currentMonth; month++) {
      const start = new Date(extendedYear, month - 1, 1);
      const end = new Date(extendedYear, month, 0, 23, 59, 59);
      const records = await prisma.attendance.findMany({
        where: { userId: user.id, date: { gte: start, lte: end } },
      });
      if (records.length === 0) continue;

      const presentDays = records.filter(r => ['PRESENT', 'LATE', 'HALF_DAY'].includes(r.status)).length;
      const absentDays = records.filter(r => r.status === 'ABSENT').length;
      const lateDays = records.filter(r => r.status === 'LATE').length;
      const leaveDays = records.filter(r => r.status === 'ON_LEAVE').length;
      const totalHours = records.reduce((s, r) => s + (r.workingHours || 0), 0);
      const avgWorkingHours = records.length > 0 ? parseFloat((totalHours / records.length).toFixed(2)) : 0;
      const workingDays = Math.max(records.length, 1);
      const attendanceScore = parseFloat(((presentDays / workingDays) * 100).toFixed(1));
      const leaveScore = parseFloat((100 - (leaveDays / workingDays) * 100).toFixed(1));
      const punctualityScore = parseFloat((100 - (lateDays / workingDays) * 100).toFixed(1));
      const overallScore = parseFloat(((attendanceScore * 0.45) + (leaveScore * 0.25) + (punctualityScore * 0.30)).toFixed(1));

      await prisma.performanceRecord.upsert({
        where: { userId_month_year: { userId: user.id, month, year: extendedYear } },
        update: { organizationId: org.id, presentDays, absentDays, lateDays, leaveDays, avgWorkingHours, attendanceScore, leaveScore, overallScore },
        create: { organizationId: org.id, userId: user.id, month, year: extendedYear, presentDays, absentDays, lateDays, leaveDays, avgWorkingHours, attendanceScore, leaveScore, overallScore },
      });
      extendedPerfCount++;
    }
  }

  await prisma.etlSyncLog.create({
    data: {
      organizationId: org.id,
      source: 'SCHEDULED',
      status: 'SUCCESS',
      recordsIn: extendedAttendanceCount,
      recordsOut: extendedAttendanceCount,
      startedAt: new Date(),
      completedAt: new Date(),
    },
  });

  console.log(`   ${extendedAttendanceCount} current-year attendance records upserted`);
  console.log(`   ${todayScenarios.length} today snapshot records upserted`);
  console.log(`   ${extendedPerfCount} current-year performance records upserted`);
  console.log(`   ✓ ${etlLogs.length} ETL sync logs created`);

  // ── SUMMARY ─────────────────────────────────────────────────────────────────
  console.log('\n✅ Seed complete! NovaPay Financial Services is ready.\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Company     : NovaPay Financial Services');
  console.log('  Employees   : 20 (1 CEO, 1 Admin, 4 Managers, 14 Employees)');
  console.log('  Departments : 7');
  console.log(`  Attendance  : Jan-Mar 2025 + Jan-${currentMonth}/${extendedYear} current-year data`);
  console.log('  Leave Reqs  : 15 (9 Approved, 2 Rejected, 3 Pending, 1 Cancelled)');
  console.log('  Notifications: 19');
  console.log(`  Perf Records: 2025 demo + ${extendedYear} current-year records`);
  console.log('  Audit Logs  : 16 entries');
  console.log('  ETL Logs    : 8 sync runs');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n  Login credentials (all users):');
  console.log('  Password: NovaPay@2025\n');
  console.log('  SUPER_ADMIN : zaid.khan@novapay.pk');
  console.log('  ADMIN       : sara.malik@novapay.pk');
  console.log('  MANAGER     : ali.raza@novapay.pk       (Engineering)');
  console.log('  MANAGER     : hina.shah@novapay.pk      (Product)');
  console.log('  MANAGER     : omar.farooq@novapay.pk    (Risk & Compliance)');
  console.log('  MANAGER     : nadia.hussain@novapay.pk  (Sales)');
  console.log('  EMPLOYEE    : bilal.ahmed@novapay.pk    (Engineering)');
  console.log('  EMPLOYEE    : ayesha.s@novapay.pk       (Engineering)');
  console.log('  EMPLOYEE    : imran.malik@novapay.pk    (Sales)');
  console.log('  ... and 11 more employees\n');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());

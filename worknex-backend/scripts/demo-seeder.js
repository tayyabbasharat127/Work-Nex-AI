/**
 * Deterministic enterprise demo tenant for sales, QA, and browser automation.
 *
 * Modes:
 *   node scripts/demo-seeder.js seed     # safely replace only the demo tenant
 *   node scripts/demo-seeder.js reset    # remove only the demo tenant
 *   node scripts/demo-seeder.js validate # read-only integrity validation
 *   node scripts/demo-seeder.js rebuild  # alias for seed (migration deploy is in npm script)
 */
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: false });

const bcrypt = require('bcryptjs');
const { v5: uuidv5 } = require('uuid');
const { PrismaClient } = require('@prisma/client');
const { DEFAULT_ADMIN_PERMISSIONS } = require('../src/constants/permissions');

const prisma = new PrismaClient();
const NAMESPACE = '82bc7b1b-1bd1-44f5-8bce-67398d966ae0';
const DEMO_SLUG = 'worknex-technologies-demo';
const DEMO_DOMAIN = 'demo.worknex.ai';
const ANCHOR_DATE = process.env.DEMO_ANCHOR_DATE || '2026-07-16';
const DEFAULT_DEMO_PASSWORD = 'WorkNexDemo!2026';

const id = (key) => uuidv5(`worknex-demo:${key}`, NAMESPACE);
const dateOnly = (value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid date: ${value}`);
  return parsed;
};
const anchor = dateOnly(ANCHOR_DATE);
const addUtcDays = (date, days) => new Date(Date.UTC(
  date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days,
));
const isoDay = (date) => date.toISOString().slice(0, 10);
const isWeekend = (date) => [0, 6].includes(date.getUTCDay());
const localInstant = (date, hour, minute) => new Date(Date.UTC(
  date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hour - 5, minute, 0,
));
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function productionGuard() {
  if (process.env.NODE_ENV !== 'production') return;
  if (process.env.ALLOW_DEMO_SEED_IN_PRODUCTION !== 'true') {
    throw new Error('Refusing demo seeding in production. Set ALLOW_DEMO_SEED_IN_PRODUCTION=true to authorize this exact demo tenant.');
  }
  if (!process.env.DEMO_USER_PASSWORD) {
    throw new Error('DEMO_USER_PASSWORD is required in production.');
  }
}

function demoPassword() {
  productionGuard();
  return process.env.DEMO_USER_PASSWORD || DEFAULT_DEMO_PASSWORD;
}

function workingDatesEndingAt(end, count) {
  const dates = [];
  let cursor = new Date(end);
  while (dates.length < count) {
    if (!isWeekend(cursor)) dates.unshift(new Date(cursor));
    cursor = addUtcDays(cursor, -1);
  }
  return dates;
}

function futureWorkingDates(start, count) {
  const dates = [];
  let cursor = addUtcDays(start, 1);
  while (dates.length < count) {
    if (!isWeekend(cursor)) dates.push(new Date(cursor));
    cursor = addUtcDays(cursor, 1);
  }
  return dates;
}

async function migrationHealth() {
  const failed = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*)::int AS count
    FROM "_prisma_migrations"
    WHERE finished_at IS NULL AND rolled_back_at IS NULL
  `);
  if (Number(failed[0]?.count || 0) > 0) {
    throw new Error('Database contains an incomplete or rolled-back Prisma migration.');
  }
}

async function findDemoOrganization() {
  return prisma.organization.findUnique({ where: { slug: DEMO_SLUG }, select: { id: true, slug: true } });
}

async function resetDemo({ quiet = false } = {}) {
  productionGuard();
  const organization = await findDemoOrganization();
  await prisma.organizationSignup.deleteMany({ where: { email: { endsWith: `@${DEMO_DOMAIN}` } } });
  if (!organization) {
    if (!quiet) console.log(`Demo reset: no organization found for ${DEMO_SLUG}.`);
    return;
  }

  const organizationId = organization.id;
  const users = await prisma.user.findMany({ where: { organizationId }, select: { id: true } });
  const userIds = users.map((user) => user.id);
  const devices = await prisma.biometricDevice.findMany({ where: { organizationId }, select: { id: true } });
  const deviceIds = devices.map((device) => device.id);

  await prisma.$transaction(async (tx) => {
    if (deviceIds.length) await tx.biometricWebhookNonce.deleteMany({ where: { deviceId: { in: deviceIds } } });
    await tx.leaveDecisionLog.deleteMany({ where: { organizationId } });
    await tx.extractedPolicyRule.deleteMany({ where: { organizationId } });
    await tx.attritionRecord.deleteMany({ where: { organizationId } });
    await tx.performanceReview.deleteMany({ where: { organizationId } });
    await tx.goal.deleteMany({ where: { organizationId } });
    await tx.performanceRecord.deleteMany({ where: { organizationId } });
    await tx.notification.deleteMany({ where: { organizationId } });
    await tx.leaveRequest.deleteMany({ where: { organizationId } });
    await tx.leaveBalance.deleteMany({ where: { organizationId } });
    await tx.leavePolicyVersion.deleteMany({ where: { organizationId } });
    await tx.policyDocument.deleteMany({ where: { organizationId } });
    await tx.leavePolicy.deleteMany({ where: { organizationId } });
    await tx.universityAttendancePunch.deleteMany({ where: { organizationId } });
    await tx.attendance.deleteMany({ where: { organizationId } });
    await tx.holiday.deleteMany({ where: { organizationId } });
    await tx.auditLog.deleteMany({ where: { organizationId } });
    await tx.etlSyncLog.deleteMany({ where: { organizationId } });
    await tx.invoice.deleteMany({ where: { organizationId } });
    await tx.subscription.deleteMany({ where: { organizationId } });
    await tx.biometricDevice.deleteMany({ where: { organizationId } });
    await tx.biometricIntegration.deleteMany({ where: { organizationId } });
    if (userIds.length) {
      await tx.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
      await tx.passwordResetToken.deleteMany({ where: { userId: { in: userIds } } });
      await tx.authenticationChallenge.deleteMany({ where: { userId: { in: userIds } } });
      await tx.user.updateMany({ where: { organizationId }, data: { managerId: null } });
    }
    await tx.user.deleteMany({ where: { organizationId } });
    await tx.staffCategory.deleteMany({ where: { organizationId } });
    await tx.department.deleteMany({ where: { organizationId } });
    await tx.role.deleteMany({ where: { organizationId } });
    await tx.organizationSettings.deleteMany({ where: { organizationId } });
    await tx.organization.delete({ where: { id: organizationId } });
  }, { timeout: 120000 });

  if (!quiet) console.log(`Demo reset: removed only ${DEMO_SLUG}.`);
}

const departments = [
  ['hr', 'Human Resources', 'People operations, workplace policy, and talent development'],
  ['engineering', 'Engineering', 'Product engineering, platform reliability, and quality'],
  ['sales', 'Sales', 'Enterprise sales, partnerships, and account growth'],
  ['marketing', 'Marketing', 'Brand, product marketing, and demand generation'],
  ['finance', 'Finance', 'Financial planning, accounting, and controls'],
  ['operations', 'Operations', 'Customer delivery, support, and business operations'],
];

const managerDefs = [
  { key: 'hr-manager', employeeId: 'WNT-002', firstName: 'Ayesha', lastName: 'Malik', email: `manager@${DEMO_DOMAIN}`, department: 'hr', designation: 'People Operations Manager', hireDate: '2021-08-16' },
  { key: 'engineering-manager', employeeId: 'WNT-003', firstName: 'Hamza', lastName: 'Khan', email: `manager.engineering@${DEMO_DOMAIN}`, department: 'engineering', designation: 'Engineering Manager', hireDate: '2020-11-02' },
  { key: 'sales-manager', employeeId: 'WNT-004', firstName: 'Sara', lastName: 'Ahmed', email: `manager.sales@${DEMO_DOMAIN}`, department: 'sales', designation: 'Commercial Manager', hireDate: '2021-04-05' },
  { key: 'operations-manager', employeeId: 'WNT-005', firstName: 'Bilal', lastName: 'Raza', email: `manager.operations@${DEMO_DOMAIN}`, department: 'operations', designation: 'Operations Manager', hireDate: '2022-01-10' },
];

const employeeDefs = [
  ['employee', 'WNT-006', 'Ali', 'Hassan', `employee@${DEMO_DOMAIN}`, 'engineering', 'engineering-manager', 'Senior Software Engineer', '2022-03-14'],
  ['fatima-noor', 'WNT-007', 'Fatima', 'Noor', `fatima.noor@${DEMO_DOMAIN}`, 'engineering', 'engineering-manager', 'Frontend Engineer', '2023-02-06'],
  ['usman-tariq', 'WNT-008', 'Usman', 'Tariq', `usman.tariq@${DEMO_DOMAIN}`, 'engineering', 'engineering-manager', 'DevOps Engineer', '2022-09-19'],
  ['zara-iqbal', 'WNT-009', 'Zara', 'Iqbal', `zara.iqbal@${DEMO_DOMAIN}`, 'engineering', 'engineering-manager', 'QA Automation Engineer', '2023-07-03'],
  ['hira-shah', 'WNT-010', 'Hira', 'Shah', `hira.shah@${DEMO_DOMAIN}`, 'hr', 'hr-manager', 'HR Business Partner', '2022-05-09'],
  ['farhan-ali', 'WNT-011', 'Farhan', 'Ali', `farhan.ali@${DEMO_DOMAIN}`, 'hr', 'hr-manager', 'Talent Acquisition Specialist', '2024-01-15'],
  ['maryam-saeed', 'WNT-012', 'Maryam', 'Saeed', `maryam.saeed@${DEMO_DOMAIN}`, 'hr', 'hr-manager', 'Learning Specialist', '2023-04-17'],
  ['imran-aslam', 'WNT-013', 'Imran', 'Aslam', `imran.aslam@${DEMO_DOMAIN}`, 'sales', 'sales-manager', 'Enterprise Account Executive', '2022-08-01'],
  ['sana-baig', 'WNT-014', 'Sana', 'Baig', `sana.baig@${DEMO_DOMAIN}`, 'sales', 'sales-manager', 'Sales Development Executive', '2023-06-12'],
  ['omar-farooq', 'WNT-015', 'Omar', 'Farooq', `omar.farooq@${DEMO_DOMAIN}`, 'sales', 'sales-manager', 'Partnerships Executive', '2024-02-05'],
  ['maham-javed', 'WNT-016', 'Maham', 'Javed', `maham.javed@${DEMO_DOMAIN}`, 'marketing', 'sales-manager', 'Product Marketing Specialist', '2022-10-10'],
  ['danish-rehman', 'WNT-017', 'Danish', 'Rehman', `danish.rehman@${DEMO_DOMAIN}`, 'marketing', 'sales-manager', 'Content Strategist', '2023-09-04'],
  ['rabia-khalid', 'WNT-018', 'Rabia', 'Khalid', `rabia.khalid@${DEMO_DOMAIN}`, 'marketing', 'sales-manager', 'Growth Marketing Analyst', '2024-03-11'],
  ['kamran-akram', 'WNT-019', 'Kamran', 'Akram', `kamran.akram@${DEMO_DOMAIN}`, 'finance', 'hr-manager', 'Senior Financial Analyst', '2021-12-06'],
  ['amna-yousaf', 'WNT-020', 'Amna', 'Yousaf', `amna.yousaf@${DEMO_DOMAIN}`, 'finance', 'hr-manager', 'Accounts Officer', '2023-01-09'],
  ['faisal-mehmood', 'WNT-021', 'Faisal', 'Mehmood', `faisal.mehmood@${DEMO_DOMAIN}`, 'finance', 'hr-manager', 'Compliance Analyst', '2022-06-20'],
  ['nadia-hussain', 'WNT-022', 'Nadia', 'Hussain', `nadia.hussain@${DEMO_DOMAIN}`, 'operations', 'operations-manager', 'Customer Success Lead', '2021-09-13'],
  ['taha-siddiqui', 'WNT-023', 'Taha', 'Siddiqui', `taha.siddiqui@${DEMO_DOMAIN}`, 'operations', 'operations-manager', 'Implementation Specialist', '2023-03-20'],
  ['laiba-qureshi', 'WNT-024', 'Laiba', 'Qureshi', `laiba.qureshi@${DEMO_DOMAIN}`, 'operations', 'operations-manager', 'Support Analyst', '2024-04-01'],
  ['waqas-mir', 'WNT-025', 'Waqas', 'Mir', `waqas.mir@${DEMO_DOMAIN}`, 'operations', 'operations-manager', 'Business Operations Analyst', '2022-11-07'],
].map(([key, employeeId, firstName, lastName, email, department, manager, designation, hireDate]) => ({
  key, employeeId, firstName, lastName, email, department, manager, designation, hireDate,
}));

async function createDemo() {
  productionGuard();
  await migrationHealth();
  await resetDemo({ quiet: true });
  const passwordHash = await bcrypt.hash(demoPassword(), 12);
  const organizationId = id('organization');
  const roleIds = {
    ADMIN: id('role:admin'), MANAGER: id('role:manager'), EMPLOYEE: id('role:employee'),
  };
  const departmentIds = Object.fromEntries(departments.map(([key]) => [key, id(`department:${key}`)]));

  await prisma.organization.create({
    data: {
      id: organizationId,
      name: 'WorkNex Technologies',
      slug: DEMO_SLUG,
      industry: 'Software Development',
      country: 'Pakistan',
      website: 'https://demo.worknex.ai',
      phone: '+92-21-111-963-963',
      address: 'Shahrah-e-Faisal, Karachi, Pakistan',
      termsAcceptedAt: anchor,
      termsVersion: 'demo-2026',
    },
  });

  await prisma.role.createMany({ data: [
    { id: roleIds.ADMIN, organizationId, name: 'Admin', tier: 'ADMIN', permissions: DEFAULT_ADMIN_PERMISSIONS, isSystem: true },
    { id: roleIds.MANAGER, organizationId, name: 'Manager', tier: 'MANAGER', permissions: ['performance:manage'], isSystem: true },
    { id: roleIds.EMPLOYEE, organizationId, name: 'Employee', tier: 'EMPLOYEE', permissions: [], isSystem: true },
  ] });

  await prisma.department.createMany({ data: departments.map(([key, name, description]) => ({
    id: departmentIds[key], organizationId, name, description,
  })) });

  const categoryIds = { office: id('category:office'), flexible: id('category:flexible') };
  await prisma.staffCategory.createMany({ data: [
    { id: categoryIds.office, organizationId, name: 'Office Based', lateThresholdTime: '09:20', latesPerAbsence: 3, minHoursPerDay: 8, minHoursPerWeek: 40 },
    { id: categoryIds.flexible, organizationId, name: 'Hybrid & Flexible', lateThresholdTime: '10:00', latesPerAbsence: 4, minHoursPerDay: 7.5, minHoursPerWeek: 37.5 },
  ] });

  await prisma.organizationSettings.create({ data: {
    id: id('settings'), organizationId, timezone: 'Asia/Karachi',
    workingHoursStart: '09:00', workingHoursEnd: '17:30', lateThresholdMinutes: 20,
    officeIpRanges: ['127.0.0.1/32', '10.20.0.0/16'], wifiVerificationEnabled: false,
    leaveAutomationEnabled: true, sandwichLeaveEnabled: true,
    attendancePolicyJson: { halfDayHours: 4, fullDayHours: 8, demoAnchorDate: ANCHOR_DATE },
    onboardingCompleted: true, onboardingStep: 'COMPLETED',
  } });

  await prisma.subscription.create({ data: {
    id: id('subscription'), organizationId, plan: 'BUSINESS', status: 'ACTIVE', billingCycle: 'ANNUAL',
    maxEmployees: 250, pricePerMonth: 149, discountPercent: 15,
    currentPeriodStart: dateOnly('2026-01-01'), currentPeriodEnd: dateOnly('2027-01-01'),
    licenseKey: 'WNX-DEMO-WORKNEX-2026',
  } });
  await prisma.invoice.create({ data: {
    id: id('invoice'), organizationId, subscriptionId: id('subscription'), invoiceNumber: 'INV-WNT-DEMO-2026-001',
    plan: 'BUSINESS', billingCycle: 'ANNUAL', amount: 1788, discount: 268.2, tax: 0, totalAmount: 1519.8,
    status: 'PAID', paymentMethod: 'DEMO', paymentReference: 'WNT-DEMO-PAID-001', paidAt: dateOnly('2026-01-01'),
    dueDate: dateOnly('2026-01-01'), periodStart: dateOnly('2026-01-01'), periodEnd: dateOnly('2027-01-01'),
  } });

  const adminId = id('user:admin');
  await prisma.user.create({ data: {
    id: adminId, organizationId, employeeId: 'WNT-001', firstName: 'Zainab', lastName: 'Khan',
    email: `admin@${DEMO_DOMAIN}`, passwordHash, roleId: roleIds.ADMIN,
    departmentId: departmentIds.hr, staffCategoryId: categoryIds.office,
    designation: 'Director of People & Administration', joiningDate: dateOnly('2020-01-06'),
    isActive: true, twoFAEnabled: false, profilePicture: '/placeholder-user.jpg', phone: '+92-300-7000001',
    emailVerifiedAt: anchor,
  } });

  const managerIds = {};
  for (let index = 0; index < managerDefs.length; index += 1) {
    const manager = managerDefs[index];
    managerIds[manager.key] = id(`user:${manager.key}`);
    await prisma.user.create({ data: {
      id: managerIds[manager.key], organizationId, employeeId: manager.employeeId,
      firstName: manager.firstName, lastName: manager.lastName, email: manager.email,
      passwordHash, roleId: roleIds.MANAGER, departmentId: departmentIds[manager.department],
      staffCategoryId: index % 2 ? categoryIds.flexible : categoryIds.office,
      managerId: adminId, designation: manager.designation, joiningDate: dateOnly(manager.hireDate),
      isActive: true, twoFAEnabled: false, profilePicture: '/placeholder-user.jpg',
      phone: `+92-300-700000${index + 2}`, emailVerifiedAt: anchor,
    } });
  }

  const employeeIds = {};
  for (let index = 0; index < employeeDefs.length; index += 1) {
    const employee = employeeDefs[index];
    employeeIds[employee.key] = id(`user:${employee.key}`);
    await prisma.user.create({ data: {
      id: employeeIds[employee.key], organizationId, employeeId: employee.employeeId,
      firstName: employee.firstName, lastName: employee.lastName, email: employee.email,
      passwordHash, roleId: roleIds.EMPLOYEE, departmentId: departmentIds[employee.department],
      staffCategoryId: index % 3 === 0 ? categoryIds.flexible : categoryIds.office,
      managerId: managerIds[employee.manager], designation: employee.designation,
      joiningDate: dateOnly(employee.hireDate), isActive: true, twoFAEnabled: false,
      profilePicture: '/placeholder-user.jpg', phone: `+92-301-7000${String(index + 6).padStart(3, '0')}`,
      emailVerifiedAt: anchor,
    } });
  }
  await prisma.organization.update({ where: { id: organizationId }, data: { ownerId: adminId } });

  const userDefs = [
    { key: 'admin', id: adminId, department: 'hr', hireDate: '2020-01-06', manager: null },
    ...managerDefs.map((row) => ({ ...row, id: managerIds[row.key], manager: 'admin' })),
    ...employeeDefs.map((row) => ({ ...row, id: employeeIds[row.key] })),
  ];

  const policyDefs = [
    ['ANNUAL', 20, true, 5, 'Annual paid leave'],
    ['SICK', 12, false, 0, 'Medical and recovery leave'],
    ['CASUAL', 8, false, 0, 'Short-notice personal leave'],
    ['MATERNITY', 90, false, 0, 'Maternity leave'],
    ['PATERNITY', 14, false, 0, 'Paternity leave'],
    ['UNPAID', 30, false, 0, 'Approved unpaid leave'],
  ];
  const policyIds = {};
  for (const [leaveType, totalDays, carryForward, maxCarryForward, description] of policyDefs) {
    policyIds[leaveType] = id(`policy:${leaveType}`);
    await prisma.leavePolicy.create({ data: {
      id: policyIds[leaveType], organizationId, leaveType, totalDays, carryForward, maxCarryForward,
      applicableRoleIds: [roleIds.ADMIN, roleIds.MANAGER, roleIds.EMPLOYEE], description,
    } });
  }

  const policyDocumentId = id('policy-document');
  await prisma.policyDocument.create({ data: {
    id: policyDocumentId, organizationId, uploadedById: adminId,
    fileName: 'worknex-technologies-leave-policy.txt', fileType: 'text/plain', filePath: null,
    extractedText: 'Annual, sick, casual, maternity, paternity, and unpaid leave policy approved for the demo organization.',
    status: 'APPROVED',
  } });
  await prisma.extractedPolicyRule.createMany({ data: policyDefs.slice(0, 3).map(([leaveType, totalDays]) => ({
    id: id(`extracted-rule:${leaveType}`), organizationId, policyDocumentId, leaveType,
    extractedJson: { leaveType, annualQuota: totalDays, requiresManagerApproval: true, requiresAdminApproval: true },
    confidenceScore: 0.96, status: 'APPROVED',
  })) });
  const policyVersionId = id('policy-version');
  const policyRules = policyDefs.map(([leaveType, totalDays, carryForward, maxCarryForward]) => ({
    leaveType, displayName: leaveType.charAt(0) + leaveType.slice(1).toLowerCase(), annualQuota: totalDays,
    carryForward, maxCarryForward, requiresManagerApproval: true, requiresAdminApproval: true,
    autoApproveMaxDays: null, minNoticeDays: leaveType === 'ANNUAL' ? 5 : 0,
  }));
  await prisma.leavePolicyVersion.create({ data: {
    id: policyVersionId, organizationId, policyDocumentId, version: 1, status: 'ACTIVE',
    effectiveFrom: dateOnly('2026-01-01'), rulesJson: { parser: 'demo-deterministic', confidence: 1, leavePolicies: policyRules },
    approvedById: adminId, approvedAt: dateOnly('2026-01-01'),
  } });

  const holidayRows = [
    ['pakistan-day', 'Pakistan Day', '2026-03-23'],
    ['labour-day', 'Labour Day', '2026-05-01'],
    ['wellness-day', 'Company Wellness Day', '2026-06-05'],
    ['independence-day', 'Independence Day', '2026-08-14'],
    ['defence-day', 'Defence Day Observance', '2026-09-07'],
    ['year-end', 'Year-end Company Holiday', '2026-12-31'],
  ];
  await prisma.holiday.createMany({ data: holidayRows.map(([key, name, date]) => ({
    id: id(`holiday:${key}`), organizationId, name, date: dateOnly(date), isRecurring: false,
  })) });
  const holidayDays = new Set(holidayRows.map(([, , date]) => date));

  const workingDates = workingDatesEndingAt(anchor, 90);
  const futureDates = futureWorkingDates(anchor, 45);
  const attendanceByKey = new Map();
  for (let userIndex = 0; userIndex < userDefs.length; userIndex += 1) {
    const user = userDefs[userIndex];
    for (let dayIndex = 0; dayIndex < workingDates.length; dayIndex += 1) {
      const day = workingDates[dayIndex];
      const dayKey = isoDay(day);
      const attendanceId = id(`attendance:${user.key}:${dayKey}`);
      if (holidayDays.has(dayKey)) {
        attendanceByKey.set(`${user.id}:${dayKey}`, {
          id: attendanceId, organizationId, userId: user.id, date: day, status: 'HOLIDAY',
          source: 'CALENDAR', notes: 'Organization holiday',
        });
        continue;
      }
      const signal = (userIndex * 37 + dayIndex * 19 + 11) % 100;
      let status = 'PRESENT';
      if (signal < 5) status = 'ABSENT';
      else if (signal < 10) status = 'HALF_DAY';
      else if (signal < 21) status = 'LATE';
      const remote = status === 'PRESENT' && ((userIndex * 13 + dayIndex * 7) % 11 === 0);
      let checkIn = null;
      let checkOut = null;
      let workingHours = null;
      if (status !== 'ABSENT') {
        const minuteVariance = (userIndex * 7 + dayIndex * 3) % 24;
        const startHour = status === 'LATE' ? 9 : 8;
        const startMinute = status === 'LATE' ? 35 + (minuteVariance % 20) : 42 + (minuteVariance % 18);
        const normalizedHour = startHour + Math.floor(startMinute / 60);
        const normalizedMinute = startMinute % 60;
        checkIn = localInstant(day, normalizedHour, normalizedMinute);
        workingHours = status === 'HALF_DAY' ? 4 + ((userIndex + dayIndex) % 4) / 10 : 8 + ((userIndex + dayIndex) % 6) / 10;
        checkOut = new Date(checkIn.getTime() + Math.round(workingHours * 60 * 60 * 1000));
      }
      attendanceByKey.set(`${user.id}:${dayKey}`, {
        id: attendanceId, organizationId, userId: user.id, date: day, checkIn, checkOut, status,
        workingHours, source: remote ? 'REMOTE_WEB' : 'WEB',
        ipAddress: remote ? '203.0.113.25' : '10.20.10.25',
        notes: remote ? 'Approved remote work day' : status === 'ABSENT' ? 'Unplanned absence' : null,
      });
    }
  }

  const statuses = [
    ...Array(12).fill('APPROVED'), ...Array(7).fill('REJECTED'), ...Array(5).fill('CANCELLED'),
    ...Array(6).fill('PENDING_MANAGER'), ...Array(4).fill('PENDING_ADMIN'), ...Array(2).fill('EMERGENCY_PENDING'),
  ];
  const leaveTypes = ['ANNUAL', 'SICK', 'CASUAL', 'ANNUAL', 'CASUAL', 'SICK'];
  const leaveRows = [];
  const decisionRows = [];
  const approvedUsage = new Map();
  for (let index = 0; index < statuses.length; index += 1) {
    const employee = employeeDefs[index % employeeDefs.length];
    const employeeId = employeeIds[employee.key];
    const managerId = managerIds[employee.manager];
    const scenario = statuses[index];
    const isEmergency = scenario === 'EMERGENCY_PENDING';
    const status = isEmergency ? 'PENDING_ADMIN' : scenario;
    const leaveType = isEmergency ? 'EMERGENCY' : leaveTypes[index % leaveTypes.length];
    const sourceDates = status.startsWith('PENDING') ? futureDates : workingDates;
    const startIndex = status.startsWith('PENDING') ? (index * 2) % 35 : 8 + ((index * 4) % 72);
    const startDate = sourceDates[startIndex];
    const duration = leaveType === 'ANNUAL' ? 2 + (index % 2) : 1;
    const selectedDates = [];
    let cursor = new Date(startDate);
    while (selectedDates.length < duration) {
      if (!isWeekend(cursor) && !holidayDays.has(isoDay(cursor))) selectedDates.push(new Date(cursor));
      cursor = addUtcDays(cursor, 1);
    }
    const endDate = selectedDates[selectedDates.length - 1];
    const leaveId = id(`leave:${index + 1}`);
    const reviewedAt = addUtcDays(startDate, status.startsWith('PENDING') ? 0 : 1);
    const managerReviewed = ['APPROVED', 'CANCELLED', 'PENDING_ADMIN', 'REJECTED'].includes(status) && !isEmergency;
    const adminReviewed = ['APPROVED', 'CANCELLED'].includes(status);
    const reasons = {
      ANNUAL: 'Planned family time with advance notice', SICK: 'Medical recovery and rest',
      CASUAL: 'Personal appointment requiring time away', EMERGENCY: 'Urgent family matter requiring immediate attention',
    };
    leaveRows.push({
      id: leaveId, organizationId, employeeId, leaveType,
      balanceLeaveType: isEmergency ? 'CASUAL' : null,
      emergencyRecoveryDate: isEmergency ? addUtcDays(anchor, 30) : null,
      startDate, endDate, totalDays: selectedDates.length, reason: reasons[leaveType], status,
      appliedAt: addUtcDays(startDate, leaveType === 'ANNUAL' ? -10 : -2), reviewedAt: adminReviewed || status === 'REJECTED' ? reviewedAt : null,
      approverId: adminReviewed ? adminId : managerReviewed ? managerId : null,
      approverNote: status === 'REJECTED' ? 'Coverage is not available for the requested date.' : adminReviewed ? 'Approved after manager and policy review.' : null,
      managerApproverId: managerReviewed ? managerId : null,
      managerReviewedAt: managerReviewed ? reviewedAt : null,
      managerNote: managerReviewed ? (status === 'REJECTED' ? 'Please reschedule due to planned release coverage.' : 'Team coverage confirmed.') : null,
      adminApproverId: adminReviewed ? adminId : null,
      adminReviewedAt: adminReviewed ? addUtcDays(reviewedAt, 1) : null,
      adminNote: adminReviewed ? 'Policy and balance validated.' : null,
    });

    const addDecision = (suffix, decision, evaluator, reasonsList, requiredApprovals, createdAt) => decisionRows.push({
      id: id(`leave-decision:${index + 1}:${suffix}`), organizationId, leaveRequestId: leaveId, employeeId,
      decision, confidence: 1, reasons: reasonsList, requiredApprovals, policyVersionId,
      evaluatedBy: evaluator, createdAt,
    });
    if (isEmergency) {
      addDecision('evaluate', 'PENDING_ADMIN', adminId, ['Emergency leave routes directly to administration.'], ['ADMIN'], anchor);
    } else if (status === 'PENDING_MANAGER') {
      addDecision('evaluate', 'PENDING_MANAGER', managerId, ['Policy checks passed; manager review required.'], ['MANAGER', 'ADMIN'], anchor);
    } else if (status === 'PENDING_ADMIN') {
      addDecision('manager', 'PENDING_ADMIN', managerId, ['Manager approved and confirmed coverage.'], ['ADMIN'], reviewedAt);
    } else if (status === 'REJECTED') {
      addDecision('manager', 'REJECTED', managerId, ['Required team coverage was unavailable.'], [], reviewedAt);
    } else {
      addDecision('manager', 'PENDING_ADMIN', managerId, ['Manager approved and confirmed coverage.'], ['ADMIN'], reviewedAt);
      addDecision('admin', 'APPROVED', adminId, ['Balance, policy, and staffing checks passed.'], [], addUtcDays(reviewedAt, 1));
      if (status === 'CANCELLED') addDecision('cancel', 'CANCELLED', employeeId, ['Employee cancelled the approved request.'], [], addUtcDays(reviewedAt, 2));
    }
    if (status === 'APPROVED') {
      const balanceType = isEmergency ? 'CASUAL' : leaveType;
      approvedUsage.set(`${employeeId}:${balanceType}`, (approvedUsage.get(`${employeeId}:${balanceType}`) || 0) + selectedDates.length);
      for (const day of selectedDates) {
        const key = `${employeeId}:${isoDay(day)}`;
        if (attendanceByKey.has(key)) attendanceByKey.set(key, {
          ...attendanceByKey.get(key), checkIn: null, checkOut: null, workingHours: null,
          status: 'ON_LEAVE', source: 'LEAVE', notes: `${leaveType} leave approved`,
        });
      }
    }
  }

  await prisma.attendance.createMany({ data: [...attendanceByKey.values()] });
  await prisma.leaveRequest.createMany({ data: leaveRows });
  await prisma.leaveDecisionLog.createMany({ data: decisionRows });

  const balanceRows = [];
  for (const user of userDefs) {
    for (const [leaveType, totalDays] of policyDefs) {
      const usedDays = approvedUsage.get(`${user.id}:${leaveType}`) || 0;
      balanceRows.push({
        id: id(`balance:${user.key}:${leaveType}:2026`), organizationId, userId: user.id,
        policyId: policyIds[leaveType], year: 2026, totalDays, usedDays, remainingDays: totalDays - usedDays,
      });
    }
  }
  await prisma.leaveBalance.createMany({ data: balanceRows });

  const performanceRows = [];
  const performanceIds = new Map();
  for (let userIndex = 0; userIndex < userDefs.length; userIndex += 1) {
    const user = userDefs[userIndex];
    for (let offset = 5; offset >= 0; offset -= 1) {
      const period = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - offset, 1));
      const month = period.getUTCMonth() + 1;
      const year = period.getUTCFullYear();
      const trend = 72 + ((userIndex * 7 + (5 - offset) * 3) % 22);
      const lateDays = 1 + ((userIndex + offset) % 3);
      const absentDays = (userIndex + offset) % 6 === 0 ? 2 : (userIndex + offset) % 4 === 0 ? 1 : 0;
      const presentDays = 21 - lateDays - absentDays;
      const attendanceScore = clamp(94 - absentDays * 5 - lateDays * 1.5, 60, 100);
      const leaveScore = clamp(98 - ((userIndex + offset) % 3) * 2, 80, 100);
      const punctualityScore = clamp(96 - lateDays * 4, 65, 100);
      const overallScore = Number((attendanceScore * 0.5 + leaveScore * 0.2 + punctualityScore * 0.3 + (trend - 82) * 0.15).toFixed(1));
      const performanceId = id(`performance:${user.key}:${year}:${month}`);
      performanceIds.set(`${user.id}:${year}:${month}`, performanceId);
      performanceRows.push({
        id: performanceId, organizationId, userId: user.id, month, year, presentDays, absentDays, lateDays,
        leaveDays: (userIndex + offset) % 3, avgWorkingHours: Number((7.7 + ((userIndex + offset) % 7) / 10).toFixed(1)),
        attendanceScore, leaveScore, punctualityScore, overallScore,
        mlPredictedScore: Number(clamp(overallScore + ((userIndex % 3) - 1) * 1.5, 55, 99).toFixed(1)),
      });
    }
  }
  await prisma.performanceRecord.createMany({ data: performanceRows });

  const goalRows = [];
  const reviewRows = [];
  for (let index = 0; index < employeeDefs.length; index += 1) {
    const employee = employeeDefs[index];
    const employeeId = employeeIds[employee.key];
    const managerId = managerIds[employee.manager];
    goalRows.push(
      { id: id(`goal:${employee.key}:delivery`), organizationId, userId: employeeId, createdById: managerId, title: 'Deliver quarterly role objective', description: `Complete the agreed ${employee.designation} quarterly outcome.`, metric: '100% of agreed milestone', dueDate: dateOnly('2026-09-30'), progress: 55 + (index % 5) * 10, status: 'IN_PROGRESS' },
      { id: id(`goal:${employee.key}:development`), organizationId, userId: employeeId, createdById: employeeId, title: 'Complete professional development plan', description: 'Complete one role-relevant learning milestone and share outcomes.', metric: 'One completed learning milestone', dueDate: dateOnly('2026-10-31'), progress: index % 4 === 0 ? 100 : 30 + (index % 6) * 10, status: index % 4 === 0 ? 'COMPLETED' : 'IN_PROGRESS' },
    );
    const rating = 3 + (index % 3);
    reviewRows.push({
      id: id(`review:${employee.key}:2026-h1`), organizationId, userId: employeeId, managerId,
      cycle: 'H1 2026', managerRating: rating,
      managerComments: rating === 5 ? 'Consistently exceeded delivery and collaboration expectations.' : rating === 4 ? 'Strong and reliable performance with clear progress against goals.' : 'Met core expectations; focus next cycle on prioritization and proactive communication.',
      status: 'SUBMITTED', submittedAt: dateOnly('2026-07-05'),
    });
  }
  await prisma.goal.createMany({ data: goalRows });
  await prisma.performanceReview.createMany({ data: reviewRows });

  const latestYear = anchor.getUTCFullYear();
  const latestMonth = anchor.getUTCMonth() + 1;
  const attritionRows = userDefs.map((user, index) => {
    let riskScore = 0.12 + (index % 5) * 0.025;
    let riskLabel = 'LOW';
    let factors = ['Stable attendance', 'Consistent performance trend', 'Established tenure'];
    if (index >= 19) {
      riskScore = 0.73 + (index - 19) * 0.045;
      riskLabel = 'HIGH';
      factors = ['Sustained decline across recent performance periods', 'Repeated late arrivals', 'Lower average working hours'];
    } else if (index >= 13) {
      riskScore = 0.42 + (index - 13) * 0.04;
      riskLabel = 'MEDIUM';
      factors = ['Recent performance volatility', 'Higher absence frequency than team baseline', 'Reduced punctuality trend'];
    }
    return {
      id: id(`attrition:${user.key}:${latestYear}:${latestMonth}`), organizationId, userId: user.id,
      month: latestMonth, year: latestYear, riskScore: Number(riskScore.toFixed(3)), riskLabel,
      willLeaveProb: Number(clamp(riskScore - 0.04, 0.05, 0.9).toFixed(3)), factors,
      modelVersion: 'demo-derived-v1', source: 'DEMO_DERIVED',
      performanceRecordId: performanceIds.get(`${user.id}:${latestYear}:${latestMonth}`),
    };
  });
  await prisma.attritionRecord.createMany({ data: attritionRows });

  const notificationTypes = ['SYSTEM', 'REMINDER', 'LEAVE_APPLIED', 'LEAVE_APPROVED', 'ATTENDANCE_ALERT'];
  const notificationCategories = ['success', 'warning', 'approval', 'attendance', 'leave', 'performance', 'AI'];
  const managerKeys = new Set(managerDefs.map((manager) => manager.key));
  const notificationRows = Array.from({ length: 40 }, (_, index) => {
    const recipient = userDefs[index % userDefs.length];
    const category = notificationCategories[index % notificationCategories.length];
    const roleBase = recipient.key === 'admin'
      ? '/dashboard/admin'
      : managerKeys.has(recipient.key)
        ? '/dashboard/manager'
        : '/dashboard/employee';
    const targetRoute = category === 'attendance' || category === 'warning'
      ? `${roleBase}/attendance`
      : category === 'leave' || category === 'approval'
        ? `${roleBase}/leaves`
        : category === 'performance'
          ? `${roleBase}/performance`
          : category === 'success' && recipient.key === 'admin'
            ? '/dashboard/admin/etl'
            : roleBase;
    const messages = {
      success: ['ETL Run Completed', 'The scheduled workforce pipeline completed successfully.'],
      warning: ['Attendance Pattern Warning', 'A recent attendance pattern requires review.'],
      approval: ['Approval Required', 'A leave request is waiting for your review.'],
      attendance: ['Attendance Recorded', 'Your latest attendance record was synchronized.'],
      leave: ['Leave Status Updated', 'A leave request moved to the next approval stage.'],
      performance: ['Performance Review Available', 'Your H1 manager review is available.'],
      AI: ['AI Insight Ready', 'A new advisory workforce insight is ready for human review.'],
    };
    return {
      id: id(`notification:${index + 1}`), organizationId, userId: recipient.id,
      type: notificationTypes[index % notificationTypes.length], title: messages[category][0],
      message: messages[category][1], isRead: index % 3 !== 0,
      metadata: {
        category,
        severity: category === 'warning' ? 'warning' : 'info',
        deterministicDemo: true,
        action: 'VIEW',
        targetRoute,
        deepLink: targetRoute,
      },
      createdAt: addUtcDays(anchor, -(index % 20)),
    };
  });
  await prisma.notification.createMany({ data: notificationRows });

  const etlStatuses = ['SUCCESS', 'SUCCESS', 'PARTIAL', 'SUCCESS', 'FAILED', 'SUCCESS', 'PARTIAL', 'SUCCESS', 'FAILED', 'SUCCESS', 'SUCCESS', 'PARTIAL'];
  const etlRows = etlStatuses.map((status, index) => {
    const startedAt = new Date(addUtcDays(anchor, -(index * 7)).getTime() + 2 * 60 * 60 * 1000);
    const durationMinutes = 2 + (index % 6);
    return {
      id: id(`etl:${index + 1}`), organizationId,
      source: index % 3 === 0 ? 'MANUAL_DEMO' : index % 3 === 1 ? 'SCHEDULED' : 'BIOMETRIC_SYNC',
      status, recordsIn: status === 'FAILED' ? 25 : 225 + index * 17,
      recordsOut: status === 'SUCCESS' ? 225 + index * 17 : status === 'PARTIAL' ? 218 + index * 17 : 0,
      errorLog: status === 'PARTIAL' ? 'Two source rows were quarantined after validation.' : status === 'FAILED' ? 'Upstream demo connector timed out; no rows were committed.' : null,
      startedAt, completedAt: new Date(startedAt.getTime() + durationMinutes * 60 * 1000),
    };
  });
  await prisma.etlSyncLog.createMany({ data: etlRows });

  const integrationId = id('biometric-integration');
  await prisma.biometricIntegration.create({ data: {
    id: integrationId, organizationId, integrationType: 'ADMS', enabled: true,
    fieldMapping: { employeeId: 'USERID', timestamp: 'CHECKINTIME', punchType: 'TYPE' },
    syncIntervalMinutes: 15, lastTestedAt: anchor,
    lastTestResult: { success: true, message: 'Deterministic demo connection verified', latencyMs: 82 },
  } });
  await prisma.biometricDevice.createMany({ data: [
    { id: id('device:karachi-main'), organizationId, biometricIntegrationId: integrationId, name: 'Karachi Main Entrance', deviceSerial: 'WNT-DEMO-ZK-001', ipAddress: '10.20.10.51', port: 4370, location: 'Karachi HQ Reception', status: 'ONLINE', lastSeenAt: anchor },
    { id: id('device:karachi-floor2'), organizationId, biometricIntegrationId: integrationId, name: 'Karachi Engineering Floor', deviceSerial: 'WNT-DEMO-ZK-002', ipAddress: '10.20.10.52', port: 4370, location: 'Engineering Floor 2', status: 'OFFLINE', lastSeenAt: addUtcDays(anchor, -2) },
  ] });

  const auditTemplates = [
    ['LOGIN', 'Auth', 'User login completed'], ['CREATE', 'User', 'Employee profile created'],
    ['APPROVE', 'LeaveRequest', 'Leave request approved'], ['CREATE', 'EtlSyncLog', 'ETL pipeline executed'],
    ['UPDATE', 'LeavePolicy', 'Leave policy updated'], ['CREATE', 'Attendance', 'Attendance batch synchronized'],
    ['READ', 'AIQuery', 'AI assistant query completed'], ['READ', 'Forecast', 'Forecast generated for review'],
    ['READ', 'ReportExport', 'Workforce report exported'], ['UPDATE', 'PerformanceReview', 'Performance review submitted'],
  ];
  const auditRows = Array.from({ length: 100 }, (_, index) => {
    const actor = userDefs[index % userDefs.length];
    const [action, entity, event] = auditTemplates[index % auditTemplates.length];
    return {
      id: id(`audit:${index + 1}`), organizationId, userId: actor.id, action, entity,
      entityId: id(`audit-entity:${entity}:${index % 20}`),
      newValues: { event, sequence: index + 1, deterministicDemo: true },
      ipAddress: `10.20.${10 + (index % 5)}.${20 + (index % 50)}`,
      userAgent: 'WorkNex-Demo-Seeder/1.0', createdAt: addUtcDays(anchor, -(index % 60)),
    };
  });
  await prisma.auditLog.createMany({ data: auditRows });

  return validateDemo({ throwOnFailure: true });
}

async function validateDemo({ throwOnFailure = false } = {}) {
  await migrationHealth();
  const organization = await prisma.organization.findUnique({ where: { slug: DEMO_SLUG } });
  const errors = [];
  if (!organization) errors.push('Demo organization is missing.');
  if (errors.length) {
    if (throwOnFailure) throw new Error(errors.join(' '));
    return { valid: false, errors, counts: {} };
  }
  const organizationId = organization.id;
  const countModels = {
    organizations: prisma.organization.count({ where: { id: organizationId } }),
    departments: prisma.department.count({ where: { organizationId } }),
    staffCategories: prisma.staffCategory.count({ where: { organizationId } }),
    roles: prisma.role.count({ where: { organizationId } }),
    users: prisma.user.count({ where: { organizationId } }),
    managers: prisma.user.count({ where: { organizationId, customRole: { tier: 'MANAGER' } } }),
    employees: prisma.user.count({ where: { organizationId, customRole: { tier: 'EMPLOYEE' } } }),
    attendance: prisma.attendance.count({ where: { organizationId } }),
    holidays: prisma.holiday.count({ where: { organizationId } }),
    leavePolicies: prisma.leavePolicy.count({ where: { organizationId } }),
    leaveBalances: prisma.leaveBalance.count({ where: { organizationId } }),
    leaveRequests: prisma.leaveRequest.count({ where: { organizationId } }),
    leaveDecisions: prisma.leaveDecisionLog.count({ where: { organizationId } }),
    goals: prisma.goal.count({ where: { organizationId } }),
    reviews: prisma.performanceReview.count({ where: { organizationId } }),
    performanceRecords: prisma.performanceRecord.count({ where: { organizationId } }),
    attritionRecords: prisma.attritionRecord.count({ where: { organizationId } }),
    notifications: prisma.notification.count({ where: { organizationId } }),
    auditLogs: prisma.auditLog.count({ where: { organizationId } }),
    etlLogs: prisma.etlSyncLog.count({ where: { organizationId } }),
    biometricIntegrations: prisma.biometricIntegration.count({ where: { organizationId } }),
    biometricDevices: prisma.biometricDevice.count({ where: { organizationId } }),
    subscriptions: prisma.subscription.count({ where: { organizationId } }),
    invoices: prisma.invoice.count({ where: { organizationId } }),
    policyDocuments: prisma.policyDocument.count({ where: { organizationId } }),
  };
  const entries = Object.entries(countModels);
  const values = await Promise.all(entries.map(([, promise]) => promise));
  const counts = Object.fromEntries(entries.map(([key], index) => [key, values[index]]));

  const users = await prisma.user.findMany({
    where: { organizationId }, select: { id: true, email: true, departmentId: true, managerId: true, customRole: { select: { tier: true } } },
  });
  const userIds = new Set(users.map((user) => user.id));
  const employeeUsers = users.filter((user) => user.customRole.tier === 'EMPLOYEE');
  const managerUsers = users.filter((user) => user.customRole.tier === 'MANAGER');
  const managerIds = new Set(managerUsers.map((user) => user.id));
  if (new Set(users.map((user) => user.email)).size !== users.length) errors.push('Duplicate demo email detected.');
  if (users.some((user) => !user.departmentId)) errors.push('A demo user has no department.');
  if (employeeUsers.some((user) => !user.managerId || !userIds.has(user.managerId))) errors.push('An employee has an invalid manager.');
  if (managerUsers.some((user) => !user.managerId || !userIds.has(user.managerId))) errors.push('A manager has an invalid admin manager.');

  const departmentCoverage = await prisma.department.findMany({
    where: { organizationId },
    select: {
      name: true,
      users: { select: { managerId: true, customRole: { select: { tier: true } } } },
    },
  });
  for (const department of departmentCoverage) {
    const employees = department.users.filter((user) => user.customRole.tier === 'EMPLOYEE');
    if (!employees.length) errors.push(`${department.name} has no employees.`);
    if (!employees.some((user) => managerIds.has(user.managerId))) errors.push(`${department.name} has no valid assigned manager.`);
  }

  const attendance = await prisma.attendance.findMany({
    where: { organizationId }, select: { date: true, checkIn: true, checkOut: true, status: true, source: true },
  });
  if (attendance.some((row) => row.checkIn && row.checkOut && row.checkOut <= row.checkIn)) errors.push('Attendance contains check-out before check-in.');
  if (attendance.some((row) => ['ABSENT', 'HOLIDAY', 'ON_LEAVE'].includes(row.status) && (row.checkIn || row.checkOut))) errors.push('Non-working attendance contains punch timestamps.');
  if (attendance.some((row) => isWeekend(row.date) && row.source !== 'CALENDAR')) errors.push('A normal punch exists on a weekend.');
  const attendanceStatuses = new Set(attendance.map((row) => row.status));
  for (const requiredStatus of ['PRESENT', 'LATE', 'HALF_DAY', 'ABSENT', 'HOLIDAY', 'ON_LEAVE']) {
    if (!attendanceStatuses.has(requiredStatus)) errors.push(`Attendance does not include ${requiredStatus}.`);
  }
  if (!attendance.some((row) => row.source === 'REMOTE_WEB')) errors.push('Attendance does not include supported remote-work records.');

  const leaves = await prisma.leaveRequest.findMany({ where: { organizationId }, select: { id: true, employeeId: true, startDate: true, endDate: true, totalDays: true } });
  const decisions = await prisma.leaveDecisionLog.groupBy({ by: ['leaveRequestId'], where: { organizationId }, _count: { _all: true } });
  const decisionIds = new Set(decisions.filter((row) => row._count._all > 0).map((row) => row.leaveRequestId));
  if (leaves.some((leave) => !userIds.has(leave.employeeId))) errors.push('A leave request references an invalid employee.');
  if (leaves.some((leave) => leave.endDate < leave.startDate || leave.totalDays < 1)) errors.push('A leave request has impossible dates.');
  if (leaves.some((leave) => !decisionIds.has(leave.id))) errors.push('A leave request has no decision history.');
  const activeLeaves = await prisma.leaveRequest.findMany({
    where: { organizationId, status: { in: ['APPROVED', 'PENDING_MANAGER', 'PENDING_ADMIN'] } },
    select: { id: true, employeeId: true, startDate: true, endDate: true },
    orderBy: { startDate: 'asc' },
  });
  for (let index = 0; index < activeLeaves.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < activeLeaves.length; otherIndex += 1) {
      const left = activeLeaves[index];
      const right = activeLeaves[otherIndex];
      if (left.employeeId === right.employeeId && left.startDate <= right.endDate && right.startDate <= left.endDate) {
        errors.push(`Active leave requests overlap for employee ${left.employeeId}.`);
      }
    }
  }

  const approvedLeaves = await prisma.leaveRequest.findMany({
    where: { organizationId, status: 'APPROVED' },
    select: { employeeId: true, leaveType: true, balanceLeaveType: true, totalDays: true },
  });
  const expectedUsage = new Map();
  for (const leave of approvedLeaves) {
    const leaveType = leave.balanceLeaveType || leave.leaveType;
    const key = `${leave.employeeId}:${leaveType}`;
    expectedUsage.set(key, (expectedUsage.get(key) || 0) + leave.totalDays);
  }
  const balances = await prisma.leaveBalance.findMany({
    where: { organizationId, year: anchor.getUTCFullYear() },
    select: { userId: true, usedDays: true, remainingDays: true, totalDays: true, policy: { select: { leaveType: true } } },
  });
  if (balances.some((balance) => balance.usedDays !== (expectedUsage.get(`${balance.userId}:${balance.policy.leaveType}`) || 0))) {
    errors.push('Leave balances do not match approved leave deductions.');
  }
  if (balances.some((balance) => balance.remainingDays !== balance.totalDays - balance.usedDays)) {
    errors.push('A leave balance total is inconsistent.');
  }

  const employeeGoalCoverage = await prisma.goal.groupBy({ by: ['userId'], where: { organizationId }, _count: { _all: true } });
  const employeeReviewCoverage = await prisma.performanceReview.groupBy({ by: ['userId'], where: { organizationId }, _count: { _all: true } });
  if (employeeGoalCoverage.length !== employeeUsers.length || employeeGoalCoverage.some((row) => row._count._all < 2)) errors.push('Every employee must have at least two goals.');
  if (employeeReviewCoverage.length !== employeeUsers.length || employeeReviewCoverage.some((row) => row._count._all < 1)) errors.push('Every employee must have a manager review.');

  const riskLabels = new Set((await prisma.attritionRecord.findMany({ where: { organizationId }, select: { riskLabel: true } })).map((row) => row.riskLabel));
  for (const riskLabel of ['LOW', 'MEDIUM', 'HIGH']) if (!riskLabels.has(riskLabel)) errors.push(`Attrition does not include ${riskLabel} risk.`);
  const etlStatuses = new Set((await prisma.etlSyncLog.findMany({ where: { organizationId }, select: { status: true } })).map((row) => row.status));
  for (const status of ['SUCCESS', 'PARTIAL', 'FAILED']) if (!etlStatuses.has(status)) errors.push(`ETL does not include ${status} runs.`);
  const notificationCategories = new Set((await prisma.notification.findMany({ where: { organizationId }, select: { metadata: true } })).map((row) => row.metadata?.category));
  for (const category of ['success', 'warning', 'approval', 'attendance', 'leave', 'performance', 'AI']) {
    if (!notificationCategories.has(category)) errors.push(`Notifications do not include ${category}.`);
  }

  const expectedExact = {
    organizations: 1, departments: 6, roles: 3, users: 25, managers: 4, employees: 20,
    holidays: 6, leavePolicies: 6, leaveBalances: 150, biometricIntegrations: 1,
    biometricDevices: 2, subscriptions: 1, invoices: 1, policyDocuments: 1,
  };
  const expectedMinimum = {
    attendance: 2250, leaveRequests: 36, leaveDecisions: 58, goals: 40, reviews: 20,
    performanceRecords: 150, attritionRecords: 25, notifications: 40, auditLogs: 100, etlLogs: 12,
  };
  for (const [key, value] of Object.entries(expectedExact)) {
    if (counts[key] !== value) errors.push(`${key}: expected ${value}, found ${counts[key]}.`);
  }
  for (const [key, value] of Object.entries(expectedMinimum)) {
    if (counts[key] < value) errors.push(`${key}: expected at least ${value}, found ${counts[key]}.`);
  }

  const result = {
    valid: errors.length === 0,
    demo: { name: organization.name, slug: organization.slug, anchorDate: ANCHOR_DATE },
    counts,
    checks: {
      migrations: 'PASS', foreignKeys: 'PASS', uniqueEmails: errors.some((item) => item.includes('email')) ? 'FAIL' : 'PASS',
      managersAndDepartments: errors.some((item) => item.includes('manager') || item.includes('department')) ? 'FAIL' : 'PASS',
      attendanceConsistency: errors.some((item) => item.includes('Attendance') || item.includes('punch')) ? 'FAIL' : 'PASS',
      leaveConsistency: errors.some((item) => item.includes('leave')) ? 'FAIL' : 'PASS',
    },
    errors,
  };
  if (throwOnFailure && errors.length) throw new Error(`Demo validation failed: ${errors.join(' ')}`);
  return result;
}

async function main() {
  const mode = (process.argv[2] || 'seed').toLowerCase();
  const startedAt = Date.now();
  if (!['seed', 'reset', 'rebuild', 'validate'].includes(mode)) {
    throw new Error(`Unknown mode "${mode}". Use seed, reset, rebuild, or validate.`);
  }
  if (mode === 'reset') {
    await resetDemo();
    return;
  }
  if (mode === 'validate') {
    const result = await validateDemo();
    console.log(JSON.stringify(result, null, 2));
    if (!result.valid) process.exitCode = 1;
    return;
  }
  const result = await createDemo();
  result.durationSeconds = Number(((Date.now() - startedAt) / 1000).toFixed(2));
  result.accounts = {
    admin: `admin@${DEMO_DOMAIN}`,
    manager: `manager@${DEMO_DOMAIN}`,
    employee: `employee@${DEMO_DOMAIN}`,
    passwordSource: process.env.DEMO_USER_PASSWORD ? 'DEMO_USER_PASSWORD' : 'documented non-production default',
    twoFactorAuthentication: 'disabled',
  };
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(`Demo seeder failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());

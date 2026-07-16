/**
 * Configure the NTS/faculty attendance and leave policy supplied by HR.
 *
 * Usage:
 *   npm run policy:configure -- --organization <organization-slug>
 *   npm run policy:configure -- --all
 *
 * The script is idempotent. It updates existing policy/category records and
 * preserves leave already used in the current year's balances.
 */
require('dotenv').config();

const prisma = require('../src/config/db');
const { ensureSystemRoles } = require('../src/utils/systemRoles');

const CURRENT_YEAR = new Date().getFullYear();

const getArguments = () => {
  const args = process.argv.slice(2);
  const organizationIndex = args.indexOf('--organization');
  return {
    all: args.includes('--all'),
    organizationSlug: organizationIndex >= 0 ? args[organizationIndex + 1] : null,
  };
};

const updateCurrentBalances = async (tx, organizationId, policy) => {
  const balances = await tx.leaveBalance.findMany({
    where: { organizationId, policyId: policy.id, year: CURRENT_YEAR },
    select: { id: true, usedDays: true },
  });

  for (const balance of balances) {
    await tx.leaveBalance.update({
      where: { id: balance.id },
      data: {
        totalDays: policy.totalDays,
        remainingDays: Math.max(0, policy.totalDays - balance.usedDays),
      },
    });
  }
};

const configureOrganization = async (organization) => {
  await prisma.$transaction(async (tx) => {
    const roles = await ensureSystemRoles(tx, organization.id);
    const applicableRoleIds = ['EMPLOYEE', 'MANAGER', 'ADMIN']
      .map((tier) => roles[tier]?.id)
      .filter(Boolean);

    const leavePolicies = [
      {
        leaveType: 'CASUAL',
        totalDays: 12,
        carryForward: false,
        maxCarryForward: 0,
        description: 'Casual Leave (CL): 1 day per month / 12 days per year; expires at year end.',
      },
      {
        leaveType: 'ANNUAL',
        totalDays: 36,
        carryForward: true,
        // HR specified carry-forward but did not specify a cap. A value of 0
        // is retained as the system's representation of "no configured cap".
        maxCarryForward: 0,
        description: 'Earned Leave (EL): 3 days per month / 36 days per year; carries forward.',
      },
    ];

    for (const data of leavePolicies) {
      const policy = await tx.leavePolicy.upsert({
        where: {
          organizationId_leaveType: {
            organizationId: organization.id,
            leaveType: data.leaveType,
          },
        },
        update: { ...data, applicableRoleIds },
        create: { organizationId: organization.id, ...data, applicableRoleIds },
      });
      await updateCurrentBalances(tx, organization.id, policy);
    }

    await tx.staffCategory.upsert({
      where: {
        organizationId_name: { organizationId: organization.id, name: 'NTS' },
      },
      update: { lateThresholdTime: '08:40', latesPerAbsence: 3 },
      create: {
        organizationId: organization.id,
        name: 'NTS',
        lateThresholdTime: '08:40',
        latesPerAbsence: 3,
      },
    });

    await tx.staffCategory.upsert({
      where: {
        organizationId_name: { organizationId: organization.id, name: 'Faculty' },
      },
      update: { minHoursPerDay: 8, minHoursPerWeek: 40 },
      create: {
        organizationId: organization.id,
        name: 'Faculty',
        minHoursPerDay: 8,
        minHoursPerWeek: 40,
      },
    });

    const existingSettings = await tx.organizationSettings.findUnique({
      where: { organizationId: organization.id },
      select: { attendancePolicyJson: true },
    });
    const existingAttendancePolicy = existingSettings?.attendancePolicyJson;
    const attendancePolicy = {
      ...(existingAttendancePolicy && typeof existingAttendancePolicy === 'object'
        ? existingAttendancePolicy
        : {}),
      allowedCheckInStart: '08:00',
      allowedCheckOutEnd: '18:00',
      fullDayHours: 8,
      weeklyHours: 40,
      latesPerAbsence: 3,
      leaveAccrual: {
        CL: { daysPerMonth: 1, daysPerYear: 12, carryForward: false },
        EL: { daysPerMonth: 3, daysPerYear: 36, carryForward: true },
      },
    };

    await tx.organizationSettings.upsert({
      where: { organizationId: organization.id },
      update: {
        workingHoursStart: '08:00',
        workingHoursEnd: '18:00',
        sandwichLeaveEnabled: true,
        attendancePolicyJson: attendancePolicy,
      },
      create: {
        organizationId: organization.id,
        timezone: 'Asia/Karachi',
        workingHoursStart: '08:00',
        workingHoursEnd: '18:00',
        sandwichLeaveEnabled: true,
        attendancePolicyJson: attendancePolicy,
      },
    });
  });

  console.log(`[policy-config] Configured ${organization.name} (${organization.slug})`);
};

async function main() {
  const { all, organizationSlug } = getArguments();
  if (!all && !organizationSlug) {
    throw new Error('Pass --organization <slug> (recommended) or --all.');
  }
  if (all && organizationSlug) {
    throw new Error('Use either --organization <slug> or --all, not both.');
  }

  const organizations = await prisma.organization.findMany({
    where: organizationSlug ? { slug: organizationSlug } : undefined,
    select: { id: true, name: true, slug: true },
    orderBy: { name: 'asc' },
  });
  if (organizations.length === 0) {
    throw new Error(`Organization not found: ${organizationSlug}`);
  }

  for (const organization of organizations) {
    await configureOrganization(organization);
  }
  console.log(`[policy-config] Done. ${organizations.length} organization(s) configured.`);
}

main()
  .catch((error) => {
    console.error(`[policy-config] Failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

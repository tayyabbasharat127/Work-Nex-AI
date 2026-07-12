const DEFAULT_LEAVE_POLICIES = [
  {
    leaveType: 'ANNUAL',
    totalDays: 18,
    carryForward: true,
    maxCarryForward: 5,
    applicableRoles: ['EMPLOYEE', 'MANAGER', 'ADMIN'],
    description: 'Default annual leave policy for new organizations.',
  },
  {
    leaveType: 'SICK',
    totalDays: 10,
    carryForward: false,
    maxCarryForward: 0,
    applicableRoles: ['EMPLOYEE', 'MANAGER', 'ADMIN'],
    description: 'Default sick leave policy for new organizations.',
  },
  {
    leaveType: 'CASUAL',
    totalDays: 8,
    carryForward: false,
    maxCarryForward: 0,
    applicableRoles: ['EMPLOYEE', 'MANAGER', 'ADMIN'],
    description: 'Default casual leave policy for new organizations.',
  },
  {
    leaveType: 'UNPAID',
    totalDays: 30,
    carryForward: false,
    maxCarryForward: 0,
    applicableRoles: ['EMPLOYEE', 'MANAGER', 'ADMIN'],
    description: 'Default unpaid leave policy for new organizations.',
  },
];

const ensureDefaultLeavePolicies = async (tx, organizationId, systemRoles) => {
  const policies = [];
  for (const policy of DEFAULT_LEAVE_POLICIES) {
    const applicableRoleIds = policy.applicableRoles
      .map((tier) => systemRoles[tier]?.id)
      .filter(Boolean);
    policies.push(await tx.leavePolicy.upsert({
      where: {
        organizationId_leaveType: {
          organizationId,
          leaveType: policy.leaveType,
        },
      },
      update: {},
      create: {
        organizationId,
        ...policy,
        applicableRoleIds,
      },
    }));
  }
  return policies;
};

const ensureLeaveBalancesForUser = async (tx, organizationId, userId, policies, year = new Date().getFullYear()) => {
  for (const policy of policies) {
    await tx.leaveBalance.upsert({
      where: {
        userId_policyId_year: {
          userId,
          policyId: policy.id,
          year,
        },
      },
      update: {},
      create: {
        organizationId,
        userId,
        policyId: policy.id,
        year,
        totalDays: policy.totalDays,
        usedDays: 0,
        remainingDays: policy.totalDays,
      },
    });
  }
};

module.exports = {
  DEFAULT_LEAVE_POLICIES,
  ensureDefaultLeavePolicies,
  ensureLeaveBalancesForUser,
};

// Phase A -> Phase B bridge for the dynamic-roles migration.
// Reads the legacy `User.role` / `LeavePolicy.applicableRoles` (RoleTier) data
// written before this migration and populates the new `Role` table +
// `User.roleId` + `LeavePolicy.applicableRoleIds` from it. Idempotent — safe
// to re-run (uses upsert on Role's [organizationId, name] unique constraint).
const prisma = require('../src/config/db');

// Reproduces today's exact authorize() behavior: only ADMIN/SUPER_ADMIN pass
// these gates today, so only the Admin system role gets them backfilled.
const ADMIN_PERMISSIONS = [
  'users:manage',
  'leave:manage_policy',
  'attendance:manage',
  'settings:manage',
  'notifications:broadcast',
];

const SYSTEM_ROLE_DEFS = [
  { name: 'Admin', tier: 'ADMIN', permissions: ADMIN_PERMISSIONS },
  { name: 'Manager', tier: 'MANAGER', permissions: [] },
  { name: 'Employee', tier: 'EMPLOYEE', permissions: [] },
];

async function ensurePlatformSuperAdminRole() {
  const existing = await prisma.role.findFirst({
    where: { organizationId: null, tier: 'SUPER_ADMIN' },
  });
  if (existing) return existing;

  return prisma.role.create({
    data: {
      organizationId: null,
      name: 'Super Admin',
      tier: 'SUPER_ADMIN',
      permissions: [],
      isSystem: true,
    },
  });
}

async function ensureOrgSystemRoles(organizationId) {
  const roles = {};
  for (const def of SYSTEM_ROLE_DEFS) {
    const role = await prisma.role.upsert({
      where: { organizationId_name: { organizationId, name: def.name } },
      update: {},
      create: {
        organizationId,
        name: def.name,
        tier: def.tier,
        permissions: def.permissions,
        isSystem: true,
      },
    });
    roles[def.tier] = role;
  }
  return roles;
}

async function backfillUsers(organizationId, orgRolesByTier, platformSuperAdminRole) {
  const users = await prisma.user.findMany({
    where: { organizationId, roleId: null },
    select: { id: true, role: true },
  });

  for (const user of users) {
    const targetRole = user.role === 'SUPER_ADMIN' ? platformSuperAdminRole : orgRolesByTier[user.role];
    if (!targetRole) {
      console.warn(`  ! No matching Role for user ${user.id} (legacy role=${user.role}) — skipped`);
      continue;
    }
    await prisma.user.update({ where: { id: user.id }, data: { roleId: targetRole.id } });
  }
  return users.length;
}

async function backfillLeavePolicies(organizationId, orgRolesByTier, platformSuperAdminRole) {
  const policies = await prisma.leavePolicy.findMany({
    where: { organizationId },
    select: { id: true, applicableRoles: true, applicableRoleIds: true },
  });

  let updated = 0;
  for (const policy of policies) {
    if (policy.applicableRoleIds.length > 0) continue; // already backfilled
    const ids = policy.applicableRoles
      .map((tier) => (tier === 'SUPER_ADMIN' ? platformSuperAdminRole : orgRolesByTier[tier]))
      .filter(Boolean)
      .map((role) => role.id);

    await prisma.leavePolicy.update({ where: { id: policy.id }, data: { applicableRoleIds: ids } });
    updated += 1;
  }
  return updated;
}

async function main() {
  console.log('Backfilling dynamic roles...\n');

  const platformSuperAdminRole = await ensurePlatformSuperAdminRole();
  console.log(`Platform Super Admin role: ${platformSuperAdminRole.id}`);

  const organizations = await prisma.organization.findMany({ select: { id: true, name: true } });

  for (const org of organizations) {
    console.log(`\nOrganization: ${org.name} (${org.id})`);
    const orgRolesByTier = await ensureOrgSystemRoles(org.id);
    console.log(`  System roles: ${Object.values(orgRolesByTier).map((r) => `${r.name}=${r.id}`).join(', ')}`);

    const userCount = await backfillUsers(org.id, orgRolesByTier, platformSuperAdminRole);
    console.log(`  Users backfilled: ${userCount}`);

    const policyCount = await backfillLeavePolicies(org.id, orgRolesByTier, platformSuperAdminRole);
    console.log(`  Leave policies backfilled: ${policyCount}`);
  }

  const stillMissing = await prisma.user.count({ where: { roleId: null } });
  console.log(`\nUsers still missing roleId: ${stillMissing}`);
  if (stillMissing > 0) {
    console.warn('WARNING: some users were not backfilled — investigate before running Phase B.');
    process.exitCode = 1;
  } else {
    console.log('All users backfilled successfully.');
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

const { DEFAULT_ADMIN_PERMISSIONS } = require('../constants/permissions');

const SYSTEM_ROLE_DEFS = [
  { name: 'Admin', tier: 'ADMIN', permissions: DEFAULT_ADMIN_PERMISSIONS },
  { name: 'Manager', tier: 'MANAGER', permissions: [] },
  { name: 'Employee', tier: 'EMPLOYEE', permissions: [] },
];

// Every organization needs its own Admin/Manager/Employee system roles for
// users to be assigned to. Call this once at org-creation time (and it's
// safe to call again — upsert on the [organizationId, name] unique key).
const ensureSystemRoles = async (tx, organizationId) => {
  const roles = {};
  for (const def of SYSTEM_ROLE_DEFS) {
    roles[def.tier] = await tx.role.upsert({
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
  }
  return roles;
};

// Resolves the org's built-in system Role id for a given tier. `db` can be
// the regular prisma client or a `tx` transaction client.
const getSystemRoleId = async (db, organizationId, tier) => {
  const role = await db.role.findFirst({
    where: { organizationId, tier, isSystem: true },
    select: { id: true },
  });
  return role?.id || null;
};

// There is exactly one SUPER_ADMIN role, platform-wide (organizationId: null)
// — it's not scoped to any single org, unlike the Admin/Manager/Employee
// system roles created by ensureSystemRoles.
const ensurePlatformSuperAdminRole = async (db) => {
  const existing = await db.role.findFirst({ where: { organizationId: null, tier: 'SUPER_ADMIN' } });
  if (existing) return existing;
  return db.role.create({
    data: { organizationId: null, name: 'Super Admin', tier: 'SUPER_ADMIN', permissions: [], isSystem: true },
  });
};

module.exports = { ensureSystemRoles, SYSTEM_ROLE_DEFS, getSystemRoleId, ensurePlatformSuperAdminRole };

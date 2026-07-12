const prisma = require('../../config/db');
const { ApiError } = require('../../utils/ApiError');
const { PERMISSIONS, PERMISSION_KEYS } = require('../../constants/permissions');

const ASSIGNABLE_TIERS = ['ADMIN', 'MANAGER', 'EMPLOYEE'];

const validatePermissions = (permissions = []) => {
  if (!Array.isArray(permissions)) throw new ApiError(400, 'permissions must be an array');
  const invalid = permissions.filter((p) => !PERMISSION_KEYS.includes(p));
  if (invalid.length) throw new ApiError(400, `Unknown permission(s): ${invalid.join(', ')}`);
  return permissions;
};

const getPermissionCatalog = () => PERMISSIONS;

const listRoles = async (requestingUser) => {
  return prisma.role.findMany({
    where: { organizationId: requestingUser.organizationId },
    include: { _count: { select: { users: true } } },
    orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
  });
};

const createRole = async (data, requestingUser) => {
  if (!data.name?.trim()) throw new ApiError(400, 'Role name is required');
  if (!ASSIGNABLE_TIERS.includes(data.tier)) {
    throw new ApiError(400, `tier must be one of ${ASSIGNABLE_TIERS.join(', ')}`);
  }
  const permissions = validatePermissions(data.permissions);

  const existing = await prisma.role.findFirst({
    where: { organizationId: requestingUser.organizationId, name: data.name.trim() },
  });
  if (existing) throw new ApiError(409, 'A role with this name already exists');

  return prisma.role.create({
    data: {
      organizationId: requestingUser.organizationId,
      name: data.name.trim(),
      tier: data.tier,
      permissions,
      isSystem: false,
    },
  });
};

const updateRole = async (id, data, requestingUser) => {
  const role = await prisma.role.findFirst({
    where: { id, organizationId: requestingUser.organizationId },
  });
  if (!role) throw new ApiError(404, 'Role not found');

  const updateData = {};
  if (data.permissions !== undefined) updateData.permissions = validatePermissions(data.permissions);

  // System roles (Admin/Manager/Employee) keep their name and tier fixed —
  // other code (route guards, redirects) assumes those three always exist.
  // Their permission set can still be tuned.
  if (!role.isSystem) {
    if (data.name !== undefined) {
      if (!data.name.trim()) throw new ApiError(400, 'Role name is required');
      updateData.name = data.name.trim();
    }
    if (data.tier !== undefined) {
      if (!ASSIGNABLE_TIERS.includes(data.tier)) {
        throw new ApiError(400, `tier must be one of ${ASSIGNABLE_TIERS.join(', ')}`);
      }
      updateData.tier = data.tier;
    }
  }

  return prisma.role.update({ where: { id }, data: updateData });
};

const deleteRole = async (id, requestingUser) => {
  const role = await prisma.role.findFirst({
    where: { id, organizationId: requestingUser.organizationId },
  });
  if (!role) throw new ApiError(404, 'Role not found');
  if (role.isSystem) throw new ApiError(400, 'Built-in roles cannot be deleted');

  const assignedCount = await prisma.user.count({ where: { roleId: id } });
  if (assignedCount > 0) {
    throw new ApiError(409, `Cannot delete — ${assignedCount} user(s) still assigned to this role`);
  }

  await prisma.role.delete({ where: { id } });
  return { id };
};

module.exports = { getPermissionCatalog, listRoles, createRole, updateRole, deleteRole };

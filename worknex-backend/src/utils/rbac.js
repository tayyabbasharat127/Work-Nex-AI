const prisma = require('../config/db');
const { ApiError } = require('./ApiError');

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'ADMIN']);

const isAdminRole = (user) => ADMIN_ROLES.has(user?.role);
const isPlatformAdmin = (user) => user?.role === 'SUPER_ADMIN';

const getManagerSubordinateIds = async (managerId, organizationId = null) => {
  const where = { managerId };
  if (organizationId) where.organizationId = organizationId;

  const users = await prisma.user.findMany({
    where,
    select: { id: true },
  });

  return users.map((user) => user.id);
};

const canAccessUser = async (requestingUser, targetUserId) => {
  if (!requestingUser || !targetUserId) {
    return false;
  }

  if (isAdminRole(requestingUser)) {
    if (isPlatformAdmin(requestingUser)) {
      return true;
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { organizationId: true },
    });

    return targetUser?.organizationId === requestingUser.organizationId;
  }

  if (requestingUser.role === 'EMPLOYEE') {
    return requestingUser.id === targetUserId;
  }

  if (requestingUser.role === 'MANAGER') {
    if (requestingUser.id === targetUserId) {
      return true;
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        managerId: true,
        organizationId: true,
      },
    });

    return targetUser?.organizationId === requestingUser.organizationId
      && targetUser.managerId === requestingUser.id;
  }

  return false;
};

const assertCanAccessUser = async (requestingUser, targetUserId) => {
  const allowed = await canAccessUser(requestingUser, targetUserId);

  if (!allowed) {
    throw new ApiError(403, 'Not authorized to access this user');
  }
};

const getAccessibleUserIds = async (requestingUser) => {
  if (!requestingUser) {
    return [];
  }

  if (isAdminRole(requestingUser)) {
    return null;
  }

  if (requestingUser.role === 'MANAGER') {
    return getManagerSubordinateIds(requestingUser.id, requestingUser.organizationId);
  }

  if (requestingUser.role === 'EMPLOYEE') {
    return [requestingUser.id];
  }

  return [];
};

const addAccessibleUserScope = async (where, requestingUser, field = 'userId') => {
  const accessibleUserIds = await getAccessibleUserIds(requestingUser);

  if (accessibleUserIds === null) {
    return where;
  }

  return {
    ...where,
    [field]: { in: accessibleUserIds },
  };
};

module.exports = {
  isAdminRole,
  isPlatformAdmin,
  getManagerSubordinateIds,
  canAccessUser,
  assertCanAccessUser,
  getAccessibleUserIds,
  addAccessibleUserScope,
};

const prisma = require('../config/db');
const { ApiError } = require('./ApiError');

const isPlatformAdmin = (user) => user?.role === 'SUPER_ADMIN';

const getOrganizationScope = (user, field = 'organizationId') => {
  if (!user) {
    return {};
  }

  if (isPlatformAdmin(user)) {
    return {};
  }

  if (!user?.organizationId) {
    throw new ApiError(403, 'Organization context required');
  }

  return { [field]: user.organizationId };
};

const assertOrganizationAccess = (user, organizationId) => {
  if (isPlatformAdmin(user)) {
    return;
  }

  if (!organizationId || user?.organizationId !== organizationId) {
    throw new ApiError(403, 'Not authorized for this organization');
  }
};

const getUserOrganizationId = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { organizationId: true },
  });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return user.organizationId;
};

const assertUserInOrganization = async (requestingUser, targetUserId) => {
  if (isPlatformAdmin(requestingUser)) {
    return;
  }

  const organizationId = await getUserOrganizationId(targetUserId);
  assertOrganizationAccess(requestingUser, organizationId);
};

module.exports = {
  isPlatformAdmin,
  getOrganizationScope,
  assertOrganizationAccess,
  getUserOrganizationId,
  assertUserInOrganization,
};

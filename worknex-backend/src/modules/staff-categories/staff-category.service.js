const prisma = require('../../config/db');
const { ApiError } = require('../../utils/ApiError');
const { isPlatformAdmin } = require('../../utils/rbac');
const { assertOrganizationAccess, getOrganizationScope } = require('../../utils/tenant');

// Org-defined, admin-named attendance-policy groups (e.g. "Faculty"/"NTS" for
// a university, "Engineering"/"Remote" for a software house, or none at all).
// Mirrors the existing Department CRUD pattern (users.service.js) exactly —
// same tenant-scoping conventions, same shape.

const getStaffCategories = async (requestingUser) => {
  return prisma.staffCategory.findMany({
    where: getOrganizationScope(requestingUser),
    orderBy: { name: 'asc' },
  });
};

const createStaffCategory = async (data, requestingUser) => {
  if (!isPlatformAdmin(requestingUser) && data.organizationId && data.organizationId !== requestingUser.organizationId) {
    throw new ApiError(403, 'Cannot create staff category in another organization');
  }

  const organizationId = isPlatformAdmin(requestingUser)
    ? data.organizationId || requestingUser.organizationId
    : requestingUser.organizationId;

  assertOrganizationAccess(requestingUser, organizationId);
  return prisma.staffCategory.create({
    data: {
      organizationId,
      name: data.name,
      lateThresholdTime: data.lateThresholdTime || null,
      latesPerAbsence: data.latesPerAbsence ?? null,
      minHoursPerDay: data.minHoursPerDay ?? null,
      minHoursPerWeek: data.minHoursPerWeek ?? null,
    },
  });
};

const updateStaffCategory = async (id, data, requestingUser) => {
  const category = await prisma.staffCategory.findFirst({ where: { id, ...getOrganizationScope(requestingUser) } });
  if (!category) throw new ApiError(404, 'Staff category not found');
  assertOrganizationAccess(requestingUser, category.organizationId);
  const { organizationId, ...safeData } = data;
  return prisma.staffCategory.update({ where: { id }, data: safeData });
};

const deleteStaffCategory = async (id, requestingUser) => {
  const category = await prisma.staffCategory.findFirst({ where: { id, ...getOrganizationScope(requestingUser) } });
  if (!category) throw new ApiError(404, 'Staff category not found');
  assertOrganizationAccess(requestingUser, category.organizationId);
  const activeUsers = await prisma.user.count({
    where: { organizationId: category.organizationId, staffCategoryId: id, isActive: true },
  });
  if (activeUsers > 0) {
    throw new ApiError(409, 'Cannot delete a staff category with active users. Reassign or deactivate users first.');
  }
  await prisma.staffCategory.delete({ where: { id } });
};

module.exports = {
  getStaffCategories,
  createStaffCategory,
  updateStaffCategory,
  deleteStaffCategory,
};

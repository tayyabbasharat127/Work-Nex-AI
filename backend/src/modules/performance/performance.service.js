const prisma = require('../../config/db');
const { assertCanAccessUser, getAccessibleUserIds, isAdminRole } = require('../../utils/rbac');
const { getOrganizationScope } = require('../../utils/tenant');

const getMyPerformance = async (user, year) => {
  return prisma.performanceRecord.findMany({
    where: { userId: user.id, organizationId: user.organizationId, year: parseInt(year) },
    orderBy: { month: 'asc' },
  });
};

const getUserPerformance = async (userId, year, requestingUser) => {
  await assertCanAccessUser(requestingUser, userId);

  return prisma.performanceRecord.findMany({
    where: { userId, ...getOrganizationScope(requestingUser), year: parseInt(year) },
    orderBy: { month: 'asc' },
  });
};

const getTeamPerformance = async (requestingUser, month, year) => {
  const accessibleUserIds = await getAccessibleUserIds(requestingUser);
  const where = {
    ...getOrganizationScope(requestingUser),
    month: parseInt(month),
    year: parseInt(year),
  };

  if (!isAdminRole(requestingUser)) {
    where.userId = { in: accessibleUserIds };
  }

  const records = await prisma.performanceRecord.findMany({
    where,
    include: { user: { select: { firstName: true, lastName: true, employeeId: true } } },
  });

  return records;
};

const getLeaderboard = async (month, year, requestingUser) => {
  const accessibleUserIds = await getAccessibleUserIds(requestingUser);
  const where = {
    ...getOrganizationScope(requestingUser),
    month: parseInt(month),
    year: parseInt(year),
  };

  if (!isAdminRole(requestingUser)) {
    where.userId = { in: accessibleUserIds };
  }

  return prisma.performanceRecord.findMany({
    where,
    include: {
      user: { select: { firstName: true, lastName: true, employeeId: true, department: { select: { name: true } } } },
    },
    orderBy: { overallScore: 'desc' },
    take: 20,
  });
};

module.exports = { getMyPerformance, getUserPerformance, getTeamPerformance, getLeaderboard };

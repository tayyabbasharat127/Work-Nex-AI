const prisma = require('../../config/db');

const getMyPerformance = async (userId, year) => {
  return prisma.performanceRecord.findMany({
    where: { userId, year: parseInt(year) },
    orderBy: { month: 'asc' },
  });
};

const getUserPerformance = async (userId, year) => {
  return prisma.performanceRecord.findMany({
    where: { userId, year: parseInt(year) },
    orderBy: { month: 'asc' },
  });
};

const getTeamPerformance = async (managerId, month, year) => {
  const subordinates = await prisma.user.findMany({
    where: { managerId, isActive: true },
    select: { id: true, firstName: true, lastName: true, employeeId: true },
  });

  const ids = subordinates.map((u) => u.id);
  const records = await prisma.performanceRecord.findMany({
    where: { userId: { in: ids }, month: parseInt(month), year: parseInt(year) },
    include: { user: { select: { firstName: true, lastName: true, employeeId: true } } },
  });

  return records;
};

const getLeaderboard = async (month, year) => {
  return prisma.performanceRecord.findMany({
    where: { month: parseInt(month), year: parseInt(year) },
    include: {
      user: { select: { firstName: true, lastName: true, employeeId: true, department: { select: { name: true } } } },
    },
    orderBy: { overallScore: 'desc' },
    take: 20,
  });
};

module.exports = { getMyPerformance, getUserPerformance, getTeamPerformance, getLeaderboard };

const prisma = require('../../config/db');
const { getMonthRange } = require('../../utils/dateHelpers');
const { ApiError } = require('../../utils/ApiError');
const { addAccessibleUserScope, assertCanAccessUser, getAccessibleUserIds, isPlatformAdmin } = require('../../utils/rbac');
const { getOrganizationScope } = require('../../utils/tenant');
const axios = require('axios');
const etlOrchestrator = require('../etl/etl.orchestrator');

const getUserScope = async (requestingUser, field = 'userId') => {
  const accessibleUserIds = await getAccessibleUserIds(requestingUser);
  const organizationScope = getOrganizationScope(requestingUser, field === 'id' ? 'organizationId' : 'organizationId');
  if (accessibleUserIds === null) {
    return organizationScope;
  }
  return { ...organizationScope, [field]: { in: accessibleUserIds } };
};

const getDashboardKPIs = async (requestingUser) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const userScope = await getUserScope(requestingUser, 'id');
  const attendanceScope = await getUserScope(requestingUser);
  const leaveScope = await getUserScope(requestingUser, 'employeeId');

  const [
    totalEmployees,
    activeToday,
    pendingLeaves,
    absentToday,
  ] = await Promise.all([
    prisma.user.count({ where: { ...userScope, isActive: true, role: 'EMPLOYEE' } }),
    prisma.attendance.count({ where: { ...attendanceScope, date: today, status: { in: ['PRESENT', 'LATE'] } } }),
    prisma.leaveRequest.count({ where: { ...leaveScope, status: 'PENDING' } }),
    prisma.attendance.count({ where: { ...attendanceScope, date: today, status: 'ABSENT' } }),
  ]);

  const attendanceRate = totalEmployees > 0
    ? parseFloat(((activeToday / totalEmployees) * 100).toFixed(1))
    : 0;

  return { totalEmployees, activeToday, pendingLeaves, absentToday, attendanceRate };
};

const getAttendanceTrends = async (year, month, requestingUser) => {
  const { start, end } = getMonthRange(parseInt(year), parseInt(month));
  const where = await addAccessibleUserScope({
    ...getOrganizationScope(requestingUser),
    date: { gte: start, lte: end },
  }, requestingUser);

  const records = await prisma.attendance.groupBy({
    by: ['date', 'status'],
    where,
    _count: { status: true },
    orderBy: { date: 'asc' },
  });

  // Pivot: group by date, spread statuses into columns
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const map = {};
  records.forEach(r => {
    const d = new Date(r.date);
    const label = `${monthNames[d.getMonth()]} ${d.getDate()}`;
    if (!map[label]) map[label] = { date: label, PRESENT: 0, ABSENT: 0, LATE: 0, HALF_DAY: 0 };
    map[label][r.status] = r._count.status;
  });

  return Object.values(map);
};

const getAttendanceHeatmap = async (userId, year, requestingUser) => {
  await assertCanAccessUser(requestingUser, userId);

  const start = new Date(parseInt(year), 0, 1);
  const end = new Date(parseInt(year), 11, 31);

  return prisma.attendance.findMany({
    where: { userId, date: { gte: start, lte: end } },
    select: { date: true, status: true, workingHours: true },
    orderBy: { date: 'asc' },
  });
};

const getDepartmentAttendance = async (month, year, requestingUser) => {
  const { start, end } = getMonthRange(parseInt(year), parseInt(month));

  if (!isPlatformAdmin(requestingUser)) {
    const where = await addAccessibleUserScope({
      ...getOrganizationScope(requestingUser),
      date: { gte: start, lte: end },
    }, requestingUser);
    const records = await prisma.attendance.findMany({
      where,
      select: {
        id: true,
        status: true,
        user: { select: { department: { select: { name: true } } } },
      },
    });

    const departments = {};
    records.forEach((record) => {
      const department = record.user?.department?.name || 'Unassigned';
      if (!departments[department]) {
        departments[department] = { department, present: 0, absent: 0, total: 0 };
      }
      if (['PRESENT', 'LATE'].includes(record.status)) departments[department].present += 1;
      if (record.status === 'ABSENT') departments[department].absent += 1;
      departments[department].total += 1;
    });

    return Object.values(departments)
      .sort((a, b) => a.department.localeCompare(b.department))
      .map((item) => ({
        ...item,
        rate: item.total > 0 ? parseFloat(((item.present / item.total) * 100).toFixed(1)) : 0,
      }));
  }

  const result = await prisma.$queryRaw`
    SELECT d.name as department, 
           COUNT(CASE WHEN a.status IN ('PRESENT','LATE') THEN 1 END) as present,
           COUNT(CASE WHEN a.status = 'ABSENT' THEN 1 END) as absent,
           COUNT(a.id) as total
    FROM "Attendance" a
    JOIN "User" u ON a."userId" = u.id
    JOIN "Department" d ON u."departmentId" = d.id
    WHERE a.date >= ${start} AND a.date <= ${end}
    GROUP BY d.name
    ORDER BY d.name
  `;

  // Convert BigInt to Number for JSON serialization
  return result.map(r => ({
    department: r.department,
    present: Number(r.present),
    absent: Number(r.absent),
    total: Number(r.total),
    rate: Number(r.total) > 0
      ? parseFloat(((Number(r.present) / Number(r.total)) * 100).toFixed(1))
      : 0,
  }));
};

const getLeaveSummary = async (year, requestingUser) => {
  const start = new Date(parseInt(year), 0, 1);
  const end = new Date(parseInt(year), 11, 31);
  const where = await addAccessibleUserScope({
    ...getOrganizationScope(requestingUser),
    startDate: { gte: start, lte: end },
  }, requestingUser, 'employeeId');

  return prisma.leaveRequest.groupBy({
    by: ['status'],
    where,
    _count: { status: true },
    _sum: { totalDays: true },
  });
};

const getLeaveTrends = async (year, requestingUser) => {
  if (!isPlatformAdmin(requestingUser)) {
    const start = new Date(parseInt(year), 0, 1);
    const end = new Date(parseInt(year), 11, 31);
    const where = await addAccessibleUserScope({
      ...getOrganizationScope(requestingUser),
      startDate: { gte: start, lte: end },
      status: 'APPROVED',
    }, requestingUser, 'employeeId');
    const records = await prisma.leaveRequest.findMany({
      where,
      select: { startDate: true, totalDays: true },
    });
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const totals = {};

    records.forEach((record) => {
      const monthNum = record.startDate.getMonth() + 1;
      if (!totals[monthNum]) {
        totals[monthNum] = { month: monthNames[monthNum - 1], monthNum, total_requests: 0, total_days: 0 };
      }
      totals[monthNum].total_requests += 1;
      totals[monthNum].total_days += Number(record.totalDays || 0);
    });

    return Object.values(totals).sort((a, b) => a.monthNum - b.monthNum);
  }

  const result = await prisma.$queryRaw`
    SELECT EXTRACT(MONTH FROM "startDate") as month,
           COUNT(*) as total_requests,
           SUM("totalDays") as total_days
    FROM "LeaveRequest"
    WHERE EXTRACT(YEAR FROM "startDate") = ${parseInt(year)}
    AND status = 'APPROVED'
    GROUP BY EXTRACT(MONTH FROM "startDate")
    ORDER BY month
  `;

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // Convert BigInt/Decimal to Number and add month name
  return result.map(r => ({
    month: monthNames[Number(r.month) - 1],
    monthNum: Number(r.month),
    total_requests: Number(r.total_requests),
    total_days: Number(r.total_days),
  }));
};

const getLeaveByType = async (year, requestingUser) => {
  const start = new Date(parseInt(year), 0, 1);
  const end = new Date(parseInt(year), 11, 31);
  const where = await addAccessibleUserScope({
    ...getOrganizationScope(requestingUser),
    startDate: { gte: start, lte: end },
    status: 'APPROVED',
  }, requestingUser, 'employeeId');

  return prisma.leaveRequest.groupBy({
    by: ['leaveType'],
    where,
    _count: { leaveType: true },
    _sum: { totalDays: true },
  });
};

const getHeadcount = async (requestingUser) => {
  const where = await getUserScope(requestingUser, 'id');
  const groups = await prisma.user.groupBy({
    by: ['role', 'isActive'],
    where,
    _count: { role: true },
  });

  // Flatten into readable format
  const result = {};
  groups.forEach(g => {
    const key = `${g.role}_${g.isActive ? 'active' : 'inactive'}`;
    result[key] = g._count.role;
  });

  // Add totals
  result.totalActive = groups.filter(g => g.isActive).reduce((s, g) => s + g._count.role, 0);
  result.totalInactive = groups.filter(g => !g.isActive).reduce((s, g) => s + g._count.role, 0);
  result.total = result.totalActive + result.totalInactive;

  return result;
};

const getTurnoverRate = async (year, requestingUser) => {
  const start = new Date(parseInt(year), 0, 1);
  const end = new Date(parseInt(year), 11, 31);
  const userScope = await getUserScope(requestingUser, 'id');

  const [deactivated, total] = await Promise.all([
    prisma.user.count({ where: { ...userScope, isActive: false, updatedAt: { gte: start, lte: end } } }),
    prisma.user.count({ where: userScope }),
  ]);

  return { deactivated, total, rate: total > 0 ? parseFloat(((deactivated / total) * 100).toFixed(2)) : 0 };
};

/**
 * Get Power BI embed token via Azure AD
 */
const getPowerBIToken = async () => {
  if (!process.env.POWERBI_CLIENT_ID || !process.env.POWERBI_TENANT_ID || !process.env.POWERBI_CLIENT_SECRET) {
    throw new ApiError(503, 'Power BI is not configured. Set POWERBI_CLIENT_ID, POWERBI_CLIENT_SECRET, POWERBI_TENANT_ID in environment.');
  }
  const tokenRes = await axios.post(
    `https://login.microsoftonline.com/${process.env.POWERBI_TENANT_ID}/oauth2/v2.0/token`,
    new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.POWERBI_CLIENT_ID,
      client_secret: process.env.POWERBI_CLIENT_SECRET,
      scope: 'https://analysis.windows.net/powerbi/api/.default',
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  return {
    accessToken: tokenRes.data.access_token,
    workspaceId: process.env.POWERBI_WORKSPACE_ID,
    reportId: process.env.POWERBI_REPORT_ID,
    embedUrl: process.env.POWERBI_EMBED_URL,
    rls: {
      supported: false,
      note: 'Current embed token does not apply full row-level-security identities; backend route access is ADMIN/SUPER_ADMIN only.',
    },
  };
};

/**
 * ETL: Run full ETL pipeline using orchestrator
 */
const runETL = async (month, year, requestingUser = null) => {
  const m = parseInt(month) || new Date().getMonth() + 1;
  const y = parseInt(year) || new Date().getFullYear();
  
  return await etlOrchestrator.runAll(m, y, requestingUser?.organizationId || null);
};

const getEtlLogs = async (requestingUser) => {
  return prisma.etlSyncLog.findMany({
    where: getOrganizationScope(requestingUser),
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
};

const getAuditLogs = async (requestingUser, limit = 50) => {
  return prisma.auditLog.findMany({
    where: getOrganizationScope(requestingUser),
    include: {
      user: { select: { firstName: true, lastName: true, email: true, role: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: Math.min(Number(limit) || 50, 100),
  });
};

module.exports = {
  getDashboardKPIs, getAttendanceTrends, getAttendanceHeatmap,
  getDepartmentAttendance, getLeaveSummary, getLeaveTrends, getLeaveByType,
  getHeadcount, getTurnoverRate, getPowerBIToken, runETL, getEtlLogs, getAuditLogs,
};

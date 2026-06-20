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
    prisma.leaveRequest.count({ where: { ...leaveScope, status: { in: ['PENDING', 'PENDING_MANAGER'] } } }),
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

const _countWorkingDays = (start, end) => {
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const d = cur.getDay();
    if (d !== 0 && d !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return Math.max(count, 1);
};

const getDepartmentAttendance = async (month, year, requestingUser) => {
  const { start, end } = getMonthRange(parseInt(year), parseInt(month));
  const workingDays = _countWorkingDays(start, end);

  if (!isPlatformAdmin(requestingUser)) {
    const orgScope = getOrganizationScope(requestingUser);

    // Employee count per department (used as denominator)
    const employees = await prisma.user.findMany({
      where: { ...orgScope, isActive: true },
      select: { department: { select: { name: true } } },
    });
    const empByDept = {};
    employees.forEach((e) => {
      const dept = e.department?.name || 'Unassigned';
      empByDept[dept] = (empByDept[dept] || 0) + 1;
    });

    const where = await addAccessibleUserScope({
      ...orgScope,
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
    // Seed all departments that have employees
    Object.keys(empByDept).forEach((dept) => {
      departments[dept] = { department: dept, present: 0, absent: 0, total: 0 };
    });
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
      .map((item) => {
        const empCount = empByDept[item.department] || 1;
        const expected = empCount * workingDays;
        return {
          ...item,
          rate: parseFloat(Math.min((item.present / expected) * 100, 100).toFixed(1)),
        };
      });
  }

  const result = await prisma.$queryRaw`
    SELECT d.name as department,
           COUNT(CASE WHEN a.status IN ('PRESENT','LATE') THEN 1 END) as present,
           COUNT(CASE WHEN a.status = 'ABSENT' THEN 1 END) as absent,
           COUNT(a.id) as total,
           COUNT(DISTINCT u.id) as emp_count
    FROM "Attendance" a
    JOIN "User" u ON a."userId" = u.id
    JOIN "Department" d ON u."departmentId" = d.id
    WHERE a.date >= ${start} AND a.date <= ${end}
    GROUP BY d.name
    ORDER BY d.name
  `;

  return result.map(r => {
    const present = Number(r.present);
    const empCount = Number(r.emp_count) || 1;
    const expected = empCount * workingDays;
    return {
      department: r.department,
      present,
      absent: Number(r.absent),
      total: Number(r.total),
      rate: parseFloat(Math.min((present / expected) * 100, 100).toFixed(1)),
    };
  });
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

const POWERBI_BASE = 'https://api.powerbi.com/v1.0/myorg';

const _requirePowerBIEnv = () => {
  const missing = ['POWERBI_CLIENT_ID', 'POWERBI_CLIENT_SECRET', 'POWERBI_TENANT_ID']
    .filter((k) => !process.env[k]);
  if (missing.length) {
    throw new ApiError(503, `Power BI not configured. Missing env vars: ${missing.join(', ')}`);
  }
};

const _getPowerBIAccessToken = async () => {
  _requirePowerBIEnv();
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
  return tokenRes.data.access_token;
};

/**
 * Get Power BI embed token via Azure AD (service-principal flow)
 */
const getPowerBIToken = async () => {
  const accessToken = await _getPowerBIAccessToken();
  return {
    accessToken,
    workspaceId: process.env.POWERBI_WORKSPACE_ID,
    reportId: process.env.POWERBI_REPORT_ID,
    embedUrl: process.env.POWERBI_EMBED_URL,
    rls: {
      supported: false,
      note: 'Service-principal token — ADMIN/SUPER_ADMIN only. Per-user RLS available via /powerbi/embed-token.',
    },
  };
};

/**
 * Generate a per-user RLS embed token scoped to the user's organization.
 * Requires POWERBI_DATASET_ID to apply RLS identities.
 */
const getPowerBIEmbedToken = async (requestingUser) => {
  const accessToken = await _getPowerBIAccessToken();
  const workspaceId = process.env.POWERBI_WORKSPACE_ID;
  const reportId = process.env.POWERBI_REPORT_ID;
  const datasetId = process.env.POWERBI_DATASET_ID;

  if (!workspaceId || !reportId) {
    throw new ApiError(503, 'POWERBI_WORKSPACE_ID and POWERBI_REPORT_ID must be set.');
  }

  const body = { accessLevel: 'View' };

  // Apply RLS identity when dataset supports it
  if (datasetId) {
    body.identities = [
      {
        username: requestingUser.email,
        roles: [requestingUser.role],
        datasets: [datasetId],
      },
    ];
  }

  const embedRes = await axios.post(
    `${POWERBI_BASE}/groups/${workspaceId}/reports/${reportId}/GenerateToken`,
    body,
    { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
  );

  return {
    embedToken: embedRes.data.token,
    embedTokenId: embedRes.data.tokenId,
    expiration: embedRes.data.expiration,
    reportId,
    workspaceId,
    datasetId: datasetId || null,
    embedUrl: process.env.POWERBI_EMBED_URL,
    rlsApplied: !!datasetId,
    userEmail: requestingUser.email,
    userRole: requestingUser.role,
  };
};

/**
 * Build the WorkNex Push Dataset schema definition.
 */
const _buildDatasetSchema = (orgId) => ({
  name: `WorkNex_${orgId || 'default'}`,
  defaultMode: 'Push',
  tables: [
    {
      name: 'Attendance',
      columns: [
        { name: 'UserId', dataType: 'string' },
        { name: 'Date', dataType: 'dateTime' },
        { name: 'Status', dataType: 'string' },
        { name: 'WorkingHours', dataType: 'double' },
        { name: 'Department', dataType: 'string' },
        { name: 'CheckIn', dataType: 'dateTime' },
        { name: 'CheckOut', dataType: 'dateTime' },
      ],
    },
    {
      name: 'LeaveRequests',
      columns: [
        { name: 'EmployeeId', dataType: 'string' },
        { name: 'LeaveType', dataType: 'string' },
        { name: 'Status', dataType: 'string' },
        { name: 'StartDate', dataType: 'dateTime' },
        { name: 'EndDate', dataType: 'dateTime' },
        { name: 'TotalDays', dataType: 'double' },
        { name: 'Department', dataType: 'string' },
      ],
    },
    {
      name: 'Performance',
      columns: [
        { name: 'UserId', dataType: 'string' },
        { name: 'Month', dataType: 'int64' },
        { name: 'Year', dataType: 'int64' },
        { name: 'AttendanceScore', dataType: 'double' },
        { name: 'LeaveScore', dataType: 'double' },
        { name: 'OverallScore', dataType: 'double' },
        { name: 'PresentDays', dataType: 'int64' },
        { name: 'LateDays', dataType: 'int64' },
        { name: 'AbsentDays', dataType: 'int64' },
        { name: 'Department', dataType: 'string' },
      ],
    },
    {
      name: 'Employees',
      columns: [
        { name: 'UserId', dataType: 'string' },
        { name: 'FullName', dataType: 'string' },
        { name: 'Email', dataType: 'string' },
        { name: 'Role', dataType: 'string' },
        { name: 'Department', dataType: 'string' },
        { name: 'IsActive', dataType: 'bool' },
        { name: 'JoinDate', dataType: 'dateTime' },
      ],
    },
  ],
});

/**
 * Create or reuse a Push Dataset in Power BI workspace for the organization.
 */
const _ensurePushDataset = async (accessToken, workspaceId, orgId) => {
  const listRes = await axios.get(
    `${POWERBI_BASE}/groups/${workspaceId}/datasets`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const datasetName = `WorkNex_${orgId || 'default'}`;
  const existing = listRes.data.value?.find((d) => d.name === datasetName);
  if (existing) return existing.id;

  const createRes = await axios.post(
    `${POWERBI_BASE}/groups/${workspaceId}/datasets`,
    _buildDatasetSchema(orgId),
    { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
  );
  return createRes.data.id;
};

/**
 * Push WorkNex organization data rows into the Power BI dataset tables.
 */
const pushDataToPowerBI = async (requestingUser) => {
  const accessToken = await _getPowerBIAccessToken();
  const workspaceId = process.env.POWERBI_WORKSPACE_ID;
  if (!workspaceId) throw new ApiError(503, 'POWERBI_WORKSPACE_ID must be set.');

  const orgId = requestingUser.organizationId;
  const datasetId = await _ensurePushDataset(accessToken, workspaceId, orgId);

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

  // Fetch data to push — last 30 days for attendance + leaves + perf records
  const [attendance, leaves, performance, employees] = await Promise.all([
    prisma.attendance.findMany({
      where: { organizationId: orgId, date: { gte: thirtyDaysAgo } },
      include: { user: { select: { department: { select: { name: true } } } } },
      take: 2000,
    }),
    prisma.leaveRequest.findMany({
      where: { organizationId: orgId, startDate: { gte: thirtyDaysAgo } },
      include: { employee: { select: { department: { select: { name: true } } } } },
      take: 1000,
    }),
    prisma.performanceRecord.findMany({
      where: { organizationId: orgId },
      include: { user: { select: { department: { select: { name: true } } } } },
      take: 2000,
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    }),
    prisma.user.findMany({
      where: { organizationId: orgId },
      select: {
        id: true, firstName: true, lastName: true, email: true,
        role: true, isActive: true, createdAt: true,
        department: { select: { name: true } },
      },
      take: 1000,
    }),
  ]);

  const pushTable = async (tableName, rows) => {
    if (!rows.length) return { table: tableName, pushed: 0 };
    await axios.post(
      `${POWERBI_BASE}/groups/${workspaceId}/datasets/${datasetId}/tables/${tableName}/rows`,
      { rows },
      { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
    );
    return { table: tableName, pushed: rows.length };
  };

  const results = await Promise.all([
    pushTable('Attendance', attendance.map((a) => ({
      UserId: a.userId,
      Date: a.date?.toISOString(),
      Status: a.status,
      WorkingHours: a.workingHours ? Number(a.workingHours) : 0,
      Department: a.user?.department?.name || 'Unassigned',
      CheckIn: a.checkIn?.toISOString() || null,
      CheckOut: a.checkOut?.toISOString() || null,
    }))),
    pushTable('LeaveRequests', leaves.map((l) => ({
      EmployeeId: l.employeeId,
      LeaveType: l.leaveType,
      Status: l.status,
      StartDate: l.startDate?.toISOString(),
      EndDate: l.endDate?.toISOString(),
      TotalDays: l.totalDays ? Number(l.totalDays) : 0,
      Department: l.employee?.department?.name || 'Unassigned',
    }))),
    pushTable('Performance', performance.map((p) => ({
      UserId: p.userId,
      Month: p.month,
      Year: p.year,
      AttendanceScore: p.attendanceScore ? Number(p.attendanceScore) : 0,
      LeaveScore: p.leaveScore ? Number(p.leaveScore) : 0,
      OverallScore: p.overallScore ? Number(p.overallScore) : 0,
      PresentDays: p.presentDays || 0,
      LateDays: p.lateDays || 0,
      AbsentDays: p.absentDays || 0,
      Department: p.user?.department?.name || 'Unassigned',
    }))),
    pushTable('Employees', employees.map((u) => ({
      UserId: u.id,
      FullName: `${u.firstName} ${u.lastName}`.trim(),
      Email: u.email,
      Role: u.role,
      Department: u.department?.name || 'Unassigned',
      IsActive: u.isActive,
      JoinDate: u.createdAt?.toISOString(),
    }))),
  ]);

  return {
    datasetId,
    workspaceId,
    datasetName: `WorkNex_${orgId || 'default'}`,
    tables: results,
    totalRowsPushed: results.reduce((s, r) => s + r.pushed, 0),
    pushedAt: now.toISOString(),
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

/* ─── Attrition Analytics ─────────────────────────────────────────────── */

const getAttritionAnalytics = async (month, year, requestingUser) => {
  const m = parseInt(month, 10) || new Date().getMonth() + 1;
  const y = parseInt(year, 10)  || new Date().getFullYear();

  const orgScope   = getOrganizationScope(requestingUser);
  const userIds    = await getAccessibleUserIds(requestingUser);
  const where      = { ...orgScope, month: m, year: y };
  if (userIds !== null) where.userId = { in: userIds };

  const [records, labelCounts] = await Promise.all([
    prisma.attritionRecord.findMany({
      where,
      include: {
        user: { select: { employeeId: true, firstName: true, lastName: true, department: { select: { name: true } } } },
      },
      orderBy: { riskScore: 'desc' },
    }),
    prisma.attritionRecord.groupBy({
      by: ['riskLabel'],
      where,
      _count: { riskLabel: true },
      _avg:   { riskScore: true },
    }),
  ]);

  const summary = Object.fromEntries(
    labelCounts.map(l => [l.riskLabel, { count: l._count.riskLabel, avgScore: parseFloat((l._avg.riskScore || 0).toFixed(2)) }])
  );

  const atRisk = records.filter(r => ['HIGH', 'CRITICAL'].includes(r.riskLabel));

  return {
    month: m, year: y,
    totalAnalyzed: records.length,
    summary,
    atRiskCount: atRisk.length,
    atRiskEmployees: atRisk.map(r => ({
      userId: r.userId,
      employeeId: r.user?.employeeId,
      name: `${r.user?.firstName || ''} ${r.user?.lastName || ''}`.trim(),
      department: r.user?.department?.name || null,
      riskScore: r.riskScore,
      riskLabel: r.riskLabel,
      willLeaveProb: r.willLeaveProb,
      factors: r.factors,
      source: r.source,
    })),
    all: records.map(r => ({
      userId: r.userId,
      riskScore: r.riskScore,
      riskLabel: r.riskLabel,
      willLeaveProb: r.willLeaveProb,
      source: r.source,
    })),
  };
};

/* ─── Performance Leaderboard ─────────────────────────────────────────── */

const getPerformanceLeaderboard = async (month, year, limit, requestingUser) => {
  const performanceETL = require('../etl/jobs/performance.etl');
  const orgScope = getOrganizationScope(requestingUser);
  const orgId = orgScope.organizationId || null;
  return performanceETL.getLeaderboard(
    month  || new Date().getMonth() + 1,
    year   || new Date().getFullYear(),
    limit  || 10,
    orgId,
  );
};

const getTeamPerformance = async (month, year, requestingUser) => {
  const performanceETL = require('../etl/jobs/performance.etl');
  return performanceETL.getTeamPerformance(
    requestingUser.id,
    month || new Date().getMonth() + 1,
    year  || new Date().getFullYear(),
  );
};

module.exports = {
  getDashboardKPIs, getAttendanceTrends, getAttendanceHeatmap,
  getDepartmentAttendance, getLeaveSummary, getLeaveTrends, getLeaveByType,
  getHeadcount, getTurnoverRate,
  getPowerBIToken, getPowerBIEmbedToken, pushDataToPowerBI,
  runETL, getEtlLogs, getAuditLogs,
  getAttritionAnalytics,
  getPerformanceLeaderboard, getTeamPerformance,
};

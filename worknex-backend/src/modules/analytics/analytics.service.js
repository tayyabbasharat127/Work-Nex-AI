const prisma = require('../../config/db');
const { config } = require('../../config/env');
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
  const leaveScope = await getUserScope(requestingUser, 'employeeId');

  // The headcount denominator and attendance numerator must describe the
  // exact same population. Admins/managers may have their own attendance
  // records, but the workforce KPI is intentionally employee-only.
  const employees = await prisma.user.findMany({
    where: { ...userScope, isActive: true, customRole: { tier: 'EMPLOYEE' } },
    select: { id: true },
  });
  const employeeIds = employees.map((employee) => employee.id);
  const attendanceWhere = {
    ...getOrganizationScope(requestingUser),
    userId: { in: employeeIds },
    date: today,
  };

  const [
    activeToday,
    pendingLeaves,
    absentToday,
  ] = await Promise.all([
    prisma.attendance.count({ where: { ...attendanceWhere, status: { in: ['PRESENT', 'LATE'] } } }),
    prisma.leaveRequest.count({ where: { ...leaveScope, status: { in: ['PENDING', 'PENDING_MANAGER', 'PENDING_ADMIN'] } } }),
    prisma.attendance.count({ where: { ...attendanceWhere, status: 'ABSENT' } }),
  ]);

  const totalEmployees = employeeIds.length;
  const attendanceRate = totalEmployees > 0
    ? parseFloat((Math.min(activeToday / totalEmployees, 1) * 100).toFixed(1))
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
  const userScope = await getUserScope(requestingUser, 'id');
  const employees = await prisma.user.findMany({
    where: {
      ...userScope,
      isActive: true,
      customRole: { tier: 'EMPLOYEE' },
      departmentId: { not: null },
    },
    select: { id: true },
  });
  if (!employees.length) return [];

  const records = await prisma.attendance.findMany({
    where: {
      ...getOrganizationScope(requestingUser),
      userId: { in: employees.map((employee) => employee.id) },
      date: { gte: start, lte: end },
    },
    select: {
      status: true,
      user: { select: { department: { select: { name: true } } } },
    },
  });

  const departments = {};
  records.forEach((record) => {
    const department = record.user?.department?.name;
    if (!department) return;
    if (!departments[department]) departments[department] = { department, present: 0, absent: 0, total: 0 };
    if (['PRESENT', 'LATE'].includes(record.status)) departments[department].present += 1;
    if (record.status === 'ABSENT') departments[department].absent += 1;
    departments[department].total += 1;
  });

  return Object.values(departments)
    .sort((a, b) => a.department.localeCompare(b.department))
    .map((item) => ({
      ...item,
      rate: parseFloat(((item.present / item.total) * 100).toFixed(1)),
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
  // Prisma groupBy only works on scalar columns, so group by roleId (a real
  // column) then resolve each id's tier — several custom roles can share a
  // tier, so counts for the same tier are summed rather than overwritten.
  const groups = await prisma.user.groupBy({
    by: ['roleId', 'isActive'],
    where,
    _count: { roleId: true },
  });

  const roles = await prisma.role.findMany({
    where: { id: { in: [...new Set(groups.map((g) => g.roleId))] } },
    select: { id: true, tier: true },
  });
  const tierById = Object.fromEntries(roles.map((r) => [r.id, r.tier]));

  // Flatten into readable format
  const result = {};
  groups.forEach(g => {
    const tier = tierById[g.roleId] || 'UNKNOWN';
    const key = `${tier}_${g.isActive ? 'active' : 'inactive'}`;
    result[key] = (result[key] || 0) + g._count.roleId;
  });

  // Add totals
  result.totalActive = groups.filter(g => g.isActive).reduce((s, g) => s + g._count.roleId, 0);
  result.totalInactive = groups.filter(g => !g.isActive).reduce((s, g) => s + g._count.roleId, 0);
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
  const requiredFields = { POWERBI_CLIENT_ID: 'clientId', POWERBI_CLIENT_SECRET: 'clientSecret', POWERBI_TENANT_ID: 'tenantId' };
  const missing = Object.entries(requiredFields).filter(([, field]) => !config.powerBi[field]).map(([name]) => name);
  if (missing.length) {
    throw new ApiError(503, `Power BI not configured. Missing env vars: ${missing.join(', ')}`);
  }
};

const _getPowerBIAccessToken = async () => {
  _requirePowerBIEnv();
  const tokenRes = await axios.post(
    `https://login.microsoftonline.com/${config.powerBi.tenantId}/oauth2/v2.0/token`,
    new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: config.powerBi.clientId,
      client_secret: config.powerBi.clientSecret,
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
    workspaceId: config.powerBi.workspaceId,
    reportId: config.powerBi.reportId,
    embedUrl: config.powerBi.embedUrl,
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
  const workspaceId = config.powerBi.workspaceId;
  const reportId = config.powerBi.reportId;
  const datasetId = config.powerBi.datasetId;

  if (!workspaceId || !reportId) {
    throw new ApiError(503, 'POWERBI_WORKSPACE_ID and POWERBI_REPORT_ID must be set.');
  }

  const body = { accessLevel: 'View' };

  // Apply RLS identity when dataset supports it
  if (datasetId) {
    const RLS_ROLE_MAP = {
      SUPER_ADMIN: 'SuperAdmin',
      ADMIN: 'OrgAdmin',
      MANAGER: 'Manager',
      EMPLOYEE: 'Employee',
    };
    body.identities = [
      {
        username: requestingUser.email,
        roles: [RLS_ROLE_MAP[requestingUser.role] || requestingUser.role],
        datasets: [datasetId],
        // Tenant key for row-level filtering — the report's role definitions
        // must filter on CUSTOMDATA() (e.g. [OrganizationId] = CUSTOMDATA())
        // for this to actually isolate orgs; role alone only segments by
        // tier, not by organization, so two OrgAdmins from different orgs
        // would otherwise get an identical RLS identity.
        customData: requestingUser.organizationId,
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
    embedUrl: config.powerBi.embedUrl,
    rlsApplied: !!datasetId,
    userEmail: requestingUser.email,
    userRole: requestingUser.role,
  };
};

const SHARED_DATASET_NAME = 'WorkNex_Platform';

/**
 * Build the WorkNex Push Dataset schema definition. One shared dataset holds
 * every organization's rows (each row tagged with OrganizationId) so the
 * single embedded report + RLS identity (see getPowerBIEmbedToken) can filter
 * per-viewer via CUSTOMDATA(). Per-org datasets were tried previously but the
 * embedded report can only ever point at one dataset, so per-org datasets
 * were invisible to it — see incident where new orgs saw stale/demo data.
 */
const _buildDatasetSchema = () => ({
  name: SHARED_DATASET_NAME,
  defaultMode: 'Push',
  tables: [
    {
      name: 'Attendance',
      columns: [
        { name: 'OrganizationId', dataType: 'string' },
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
        { name: 'OrganizationId', dataType: 'string' },
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
        { name: 'OrganizationId', dataType: 'string' },
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
        { name: 'OrganizationId', dataType: 'string' },
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
 * Resolve the single shared push dataset — reuses POWERBI_DATASET_ID when
 * configured (required so it matches the dataset the embedded report + RLS
 * identities in getPowerBIEmbedToken are bound to); otherwise finds/creates
 * the shared dataset by name. When newly created, the caller must configure
 * RLS roles on it in Power BI Service and set POWERBI_DATASET_ID — a fresh
 * push dataset has no RLS roles until that's done by hand.
 */
const _ensurePushDataset = async (accessToken, workspaceId) => {
  if (config.powerBi.datasetId) return config.powerBi.datasetId;

  const listRes = await axios.get(
    `${POWERBI_BASE}/groups/${workspaceId}/datasets`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const existing = listRes.data.value?.find((d) => d.name === SHARED_DATASET_NAME);
  if (existing) return existing.id;

  const createRes = await axios.post(
    `${POWERBI_BASE}/groups/${workspaceId}/datasets`,
    _buildDatasetSchema(),
    { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
  );
  return createRes.data.id;
};

const TABLE_NAMES = ['Attendance', 'LeaveRequests', 'Performance', 'Employees'];

/**
 * Refresh the shared Power BI dataset with every organization's current
 * data. The Push API can only delete ALL rows in a table (no per-org
 * filter), so a full replace — not an incremental per-org push — is the
 * only way to keep the shared dataset accurate without duplicate rows
 * piling up across syncs. RLS at view time (CUSTOMDATA() = OrganizationId)
 * is what actually isolates each org's viewers.
 */
const pushAllOrganizationsToPowerBI = async () => {
  const accessToken = await _getPowerBIAccessToken();
  const workspaceId = config.powerBi.workspaceId;
  if (!workspaceId) throw new ApiError(503, 'POWERBI_WORKSPACE_ID must be set.');

  const datasetId = await _ensurePushDataset(accessToken, workspaceId);

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const [attendance, leaves, performance, employees] = await Promise.all([
    prisma.attendance.findMany({
      where: { date: { gte: thirtyDaysAgo } },
      include: { user: { select: { department: { select: { name: true } } } } },
      take: 20000,
    }),
    prisma.leaveRequest.findMany({
      where: { startDate: { gte: thirtyDaysAgo } },
      include: { employee: { select: { department: { select: { name: true } } } } },
      take: 10000,
    }),
    prisma.performanceRecord.findMany({
      include: { user: { select: { department: { select: { name: true } } } } },
      take: 20000,
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    }),
    prisma.user.findMany({
      select: {
        id: true, firstName: true, lastName: true, email: true,
        isActive: true, createdAt: true, organizationId: true,
        customRole: { select: { name: true } },
        department: { select: { name: true } },
      },
      take: 10000,
    }),
  ]);

  const replaceTable = async (tableName, rows) => {
    await axios.delete(
      `${POWERBI_BASE}/groups/${workspaceId}/datasets/${datasetId}/tables/${tableName}/rows`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!rows.length) return { table: tableName, pushed: 0 };
    await axios.post(
      `${POWERBI_BASE}/groups/${workspaceId}/datasets/${datasetId}/tables/${tableName}/rows`,
      { rows },
      { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
    );
    return { table: tableName, pushed: rows.length };
  };

  const results = await Promise.all([
    replaceTable('Attendance', attendance.map((a) => ({
      OrganizationId: a.organizationId,
      UserId: a.userId,
      Date: a.date?.toISOString(),
      Status: a.status,
      WorkingHours: a.workingHours ? Number(a.workingHours) : 0,
      Department: a.user?.department?.name || 'Unassigned',
      CheckIn: a.checkIn?.toISOString() || null,
      CheckOut: a.checkOut?.toISOString() || null,
    }))),
    replaceTable('LeaveRequests', leaves.map((l) => ({
      OrganizationId: l.organizationId,
      EmployeeId: l.employeeId,
      LeaveType: l.leaveType,
      Status: l.status,
      StartDate: l.startDate?.toISOString(),
      EndDate: l.endDate?.toISOString(),
      TotalDays: l.totalDays ? Number(l.totalDays) : 0,
      Department: l.employee?.department?.name || 'Unassigned',
    }))),
    replaceTable('Performance', performance.map((p) => ({
      OrganizationId: p.organizationId,
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
    replaceTable('Employees', employees.map((u) => ({
      OrganizationId: u.organizationId,
      UserId: u.id,
      FullName: `${u.firstName} ${u.lastName}`.trim(),
      Email: u.email,
      Role: u.customRole.name,
      Department: u.department?.name || 'Unassigned',
      IsActive: u.isActive,
      JoinDate: u.createdAt?.toISOString(),
    }))),
  ]);

  return {
    datasetId,
    workspaceId,
    datasetName: SHARED_DATASET_NAME,
    tables: results,
    totalRowsPushed: results.reduce((s, r) => s + r.pushed, 0),
    pushedAt: now.toISOString(),
  };
};

/**
 * Manual "refresh now" trigger — pushes every org's current data into the
 * shared dataset. Platform-wide (not scoped to requestingUser's org) since
 * the Push API can't selectively replace one org's rows; gated to
 * SUPER_ADMIN at the route level for that reason.
 */
const pushDataToPowerBI = async () => pushAllOrganizationsToPowerBI();

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
      user: { select: { firstName: true, lastName: true, email: true, customRole: { select: { tier: true, name: true } } } },
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
      name: `${r.user?.firstName || ''} ${r.user?.lastName || ''}`.trim() || r.userId,
      department: r.user?.department?.name || '—',
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
  getPowerBIToken, getPowerBIEmbedToken, pushDataToPowerBI, pushAllOrganizationsToPowerBI,
  runETL, getEtlLogs, getAuditLogs,
  getAttritionAnalytics,
  getPerformanceLeaderboard, getTeamPerformance,
};

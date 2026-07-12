const prisma = require('../../config/db');
const { ApiError } = require('../../utils/ApiError');
const { getAccessibleUserIds } = require('../../utils/rbac');
const { getOrganizationScope } = require('../../utils/tenant');

const parseDate = (value) => (value ? new Date(value) : null);

const rangeFilter = (query) => {
  const start = parseDate(query.startDate);
  const end = parseDate(query.endDate);
  if (!start && !end) return {};
  return {
    date: {
      ...(start ? { gte: start } : {}),
      ...(end ? { lte: end } : {}),
    },
  };
};

const leaveRangeFilter = (query) => {
  const start = parseDate(query.startDate);
  const end = parseDate(query.endDate);
  if (!start && !end) return {};
  return {
    startDate: {
      ...(start ? { gte: start } : {}),
      ...(end ? { lte: end } : {}),
    },
  };
};

const scopedUserWhere = async (user, query = {}, field = 'userId') => {
  const where = { ...getOrganizationScope(user) };
  if (user.role === 'SUPER_ADMIN' && query.organizationId) where.organizationId = query.organizationId;
  const ids = await getAccessibleUserIds(user);
  if (ids !== null) where[field] = { in: ids };
  return where;
};

const baseReport = (type, user, filters, summary, rows) => ({
  reportType: type,
  generatedAt: new Date().toISOString(),
  generatedBy: user.id,
  organizationId: user.role === 'SUPER_ADMIN' ? (filters.organizationId || null) : user.organizationId,
  filters,
  summary,
  rows,
});

const getAttendanceReport = async (query, user) => {
  const where = { ...(await scopedUserWhere(user, query)), ...rangeFilter(query) };
  if (query.status) where.status = query.status;
  const rows = await prisma.attendance.findMany({
    where,
    include: { user: { select: { firstName: true, lastName: true, employeeId: true, department: { select: { name: true } } } } },
    orderBy: [{ date: 'desc' }, { checkIn: 'asc' }],
    take: Number(query.limit || 500),
  });
  const summary = rows.reduce((acc, row) => {
    acc.total += 1;
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, { total: 0 });
  return baseReport('attendance', user, query, summary, rows.map((row) => ({
    id: row.id,
    date: row.date,
    employeeId: row.user?.employeeId,
    employeeName: `${row.user?.firstName || ''} ${row.user?.lastName || ''}`.trim(),
    department: row.user?.department?.name || 'Unassigned',
    status: row.status,
    checkIn: row.checkIn,
    checkOut: row.checkOut,
    workingHours: row.workingHours,
  })));
};

const getLeaveReport = async (query, user) => {
  const where = { ...(await scopedUserWhere(user, query, 'employeeId')), ...leaveRangeFilter(query) };
  if (query.status) where.status = query.status;
  if (query.leaveType) where.leaveType = query.leaveType;
  const rows = await prisma.leaveRequest.findMany({
    where,
    include: { employee: { select: { firstName: true, lastName: true, employeeId: true, department: { select: { name: true } } } } },
    orderBy: { appliedAt: 'desc' },
    take: Number(query.limit || 500),
  });
  const summary = rows.reduce((acc, row) => {
    acc.total += 1;
    acc.totalDays += row.totalDays || 0;
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, { total: 0, totalDays: 0 });
  return baseReport('leave', user, query, summary, rows.map((row) => ({
    id: row.id,
    employeeId: row.employee?.employeeId,
    employeeName: `${row.employee?.firstName || ''} ${row.employee?.lastName || ''}`.trim(),
    department: row.employee?.department?.name || 'Unassigned',
    leaveType: row.leaveType,
    status: row.status,
    startDate: row.startDate,
    endDate: row.endDate,
    totalDays: row.totalDays,
  })));
};

const getPerformanceReport = async (query, user) => {
  const where = await scopedUserWhere(user, query);
  if (query.month) where.month = Number(query.month);
  if (query.year) where.year = Number(query.year);
  const rows = await prisma.performanceRecord.findMany({
    where,
    include: { user: { select: { firstName: true, lastName: true, employeeId: true, department: { select: { name: true } } } } },
    orderBy: [{ year: 'desc' }, { month: 'desc' }, { overallScore: 'desc' }],
    take: Number(query.limit || 500),
  });
  const avgScore = rows.length ? rows.reduce((sum, row) => sum + row.overallScore, 0) / rows.length : 0;
  return baseReport('performance', user, query, { total: rows.length, avgScore: Number(avgScore.toFixed(2)) }, rows.map((row) => ({
    employeeId: row.user?.employeeId,
    employeeName: `${row.user?.firstName || ''} ${row.user?.lastName || ''}`.trim(),
    department: row.user?.department?.name || 'Unassigned',
    month: row.month,
    year: row.year,
    presentDays: row.presentDays,
    absentDays: row.absentDays,
    lateDays: row.lateDays,
    overallScore: row.overallScore,
  })));
};

const getDepartmentReport = async (query, user) => {
  if (user.role === 'EMPLOYEE') throw new ApiError(403, 'Department reports require manager or admin access');
  const deptWhere = { ...getOrganizationScope(user) };
  if (user.role === 'SUPER_ADMIN' && query.organizationId) deptWhere.organizationId = query.organizationId;
  const userWhere = { ...deptWhere, isActive: true };
  const accessibleUserIds = await getAccessibleUserIds(user);
  if (accessibleUserIds !== null) userWhere.id = { in: accessibleUserIds };
  const users = await prisma.user.findMany({
    where: userWhere,
    select: { departmentId: true, customRole: { select: { tier: true } } },
  });
  if (user.role === 'MANAGER') {
    const departmentIds = [...new Set(users.map((item) => item.departmentId).filter(Boolean))];
    deptWhere.id = departmentIds.length ? { in: departmentIds } : '__none__';
  }
  const departments = await prisma.department.findMany({ where: deptWhere, orderBy: { name: 'asc' } });
  const rows = departments.map((dept) => {
    const members = users.filter((item) => item.departmentId === dept.id);
    return {
      id: dept.id,
      name: dept.name,
      description: dept.description,
      activeUsers: members.length,
      managers: members.filter((item) => item.customRole.tier === 'MANAGER').length,
      employees: members.filter((item) => item.customRole.tier === 'EMPLOYEE').length,
    };
  });
  return baseReport('department', user, query, { totalDepartments: rows.length, totalActiveUsers: users.length }, rows);
};

const generateReport = async (body, user) => {
  const type = body.reportType || body.type || 'attendance';
  const query = { ...(body.filters || {}), reportType: type };
  if (type === 'attendance') return getAttendanceReport(query, user);
  if (type === 'leave') return getLeaveReport(query, user);
  if (type === 'performance') return getPerformanceReport(query, user);
  if (type === 'department') return getDepartmentReport(query, user);
  throw new ApiError(400, 'Unsupported report type');
};

const getReports = async (query, user) => {
  const types = (query.type ? [query.type] : ['attendance', 'leave', 'performance', 'department']);
  const reports = [];
  for (const type of types) {
    reports.push(await generateReport({ reportType: type, filters: query }, user));
  }
  return reports;
};

const toCsv = (rows) => {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  return [headers.join(','), ...rows.map((row) => headers.map((header) => escape(row[header])).join(','))].join('\n');
};

module.exports = {
  generateReport,
  getReports,
  getAttendanceReport,
  getLeaveReport,
  getPerformanceReport,
  getDepartmentReport,
  toCsv,
};

const prisma = require('../../config/db');
const { ApiError } = require('../../utils/ApiError');
const { paginate, paginateMeta } = require('../../utils/pagination');
const { addAccessibleUserScope, assertCanAccessUser } = require('../../utils/rbac');
const { assertUserInOrganization, getOrganizationScope, getUserOrganizationId } = require('../../utils/tenant');
const processor = require('./attendance.processor');
const { tenantRepository } = require('../../utils/tenantPrisma');
const webProvider = require('./providers/web.provider');
const tmsProvider = require('./providers/tms.provider');

const {
  toAttendanceDate,
  formatAttendanceDate,
  getAttendanceTimeZone,
  getLocalParts,
  normalizeStatus,
  computeWorkingHours,
  getHolidayForDate,
  getApprovedLeaveForDate,
} = processor;

const ATTENDANCE_SOURCE = { MANUAL: 'MANUAL_CORRECTION', ABSENCE_JOB: 'ABSENCE_JOB' };

const getMonthDateRange = (year, month) => {
  const y = Number(year);
  const m = Number(month);
  if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) {
    throw new ApiError(400, 'Valid month and year are required');
  }

  return {
    start: new Date(Date.UTC(y, m - 1, 1)),
    end: new Date(Date.UTC(y, m, 0)),
  };
};

const serializeAuditValues = (value) => JSON.parse(JSON.stringify(value || null));

const writeAttendanceAudit = async (action, record, requestingUser, req, oldValues = null) => {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: record.organizationId,
        userId: requestingUser?.id || null,
        action,
        entity: 'Attendance',
        entityId: record.id,
        oldValues: serializeAuditValues(oldValues),
        newValues: serializeAuditValues(record),
        ipAddress: req?.ip || null,
        userAgent: req?.headers?.['user-agent'] || null,
      },
    });
  } catch {
    // Audit logging is non-blocking for correction workflows.
  }
};

// ─── Web provider entry points ─────────────────────────────────────────────────

const checkIn = (user, latitude, longitude, req) => webProvider.checkIn(user, latitude, longitude, req);
const checkOut = (user) => webProvider.checkOut(user);
const autoPing = (user, req) => webProvider.autoPing(user, req);

// ─── TMS provider entry point ──────────────────────────────────────────────────

const syncFromTMS = (date, requestingUser = null) => tmsProvider.syncFromTMS(date, requestingUser);

// ─── Reads ──────────────────────────────────────────────────────────────────────

const getTodayAttendance = async (user) => {
  return prisma.attendance.findFirst({
    where: { userId: user.id, organizationId: user.organizationId, date: toAttendanceDate() },
  });
};

const applyAttendanceFilters = (where, query) => {
  if (query.status) where.status = normalizeStatus(query.status);
  if (query.date) where.date = toAttendanceDate(query.date);
  if (query.month && query.year) {
    const { start, end } = getMonthDateRange(query.year, query.month);
    where.date = { gte: start, lte: end };
  }
  return where;
};

const getMyAttendance = async (userId, query, organizationId = null) => {
  const { skip, take, page, limit } = paginate(query);
  const where = applyAttendanceFilters({ userId }, query);
  if (organizationId) where.organizationId = organizationId;

  const [records, total] = await Promise.all([
    prisma.attendance.findMany({ where, skip, take, orderBy: { date: 'desc' } }),
    prisma.attendance.count({ where }),
  ]);

  return { records, meta: paginateMeta(total, page, limit) };
};

const getAllAttendance = async (query, requestingUser) => {
  const { skip, take, page, limit } = paginate(query);
  let where = {};
  if (query.userId) {
    await assertCanAccessUser(requestingUser, query.userId);
    where.userId = query.userId;
  } else {
    where = await addAccessibleUserScope(where, requestingUser);
  }
  Object.assign(where, getOrganizationScope(requestingUser));
  applyAttendanceFilters(where, query);

  const [records, total] = await Promise.all([
    prisma.attendance.findMany({
      where,
      skip,
      take,
      include: {
        user: {
          select: {
            id: true, firstName: true, lastName: true, email: true, employeeId: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: [{ date: 'desc' }, { checkIn: 'asc' }],
    }),
    prisma.attendance.count({ where }),
  ]);

  return { records, meta: paginateMeta(total, page, limit) };
};

const getUserAttendance = async (userId, query, requestingUser) => {
  await assertCanAccessUser(requestingUser, userId);
  return getMyAttendance(userId, query, requestingUser.role === 'SUPER_ADMIN' ? null : requestingUser.organizationId);
};

const getAttendanceSummary = async (query, requestingUser) => {
  const nowParts = getLocalParts();
  const month = query.month || nowParts.month;
  const year = query.year || nowParts.year;
  const { start, end } = getMonthDateRange(year, month);
  let where = await addAccessibleUserScope({ date: { gte: start, lte: end } }, requestingUser);
  Object.assign(where, getOrganizationScope(requestingUser));

  return prisma.attendance.groupBy({ by: ['status'], where, _count: { status: true } });
};

// Reporting only — no auto-penalty. For every user whose StaffCategory sets a
// minHoursPerWeek target (e.g. Faculty: 40 hrs/week), sums this week's actual
// workingHours and flags anyone under target. Users with no category, or a
// category with no target set, are simply omitted (nothing to report).
const getWeeklyHoursShortfall = async (requestingUser) => {
  const now = new Date();
  const day = now.getUTCDay();
  const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - ((day + 6) % 7)));
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  const users = await prisma.user.findMany({
    where: {
      ...getOrganizationScope(requestingUser),
      isActive: true,
      staffCategory: { minHoursPerWeek: { not: null } },
    },
    select: {
      id: true, firstName: true, lastName: true, employeeId: true,
      staffCategory: { select: { name: true, minHoursPerWeek: true } },
    },
  });
  if (!users.length) return [];

  const records = await prisma.attendance.findMany({
    where: { userId: { in: users.map((u) => u.id) }, date: { gte: weekStart, lt: weekEnd } },
    select: { userId: true, workingHours: true },
  });
  const hoursByUser = {};
  records.forEach((r) => { hoursByUser[r.userId] = (hoursByUser[r.userId] || 0) + Number(r.workingHours || 0); });

  return users.map((u) => {
    const hoursThisWeek = Number((hoursByUser[u.id] || 0).toFixed(2));
    const target = u.staffCategory.minHoursPerWeek;
    return {
      userId: u.id,
      name: `${u.firstName} ${u.lastName}`,
      employeeId: u.employeeId,
      category: u.staffCategory.name,
      hoursThisWeek,
      targetHoursPerWeek: target,
      shortfall: Number(Math.max(0, target - hoursThisWeek).toFixed(2)),
    };
  }).filter((row) => row.shortfall > 0);
};

// ─── Admin corrections ──────────────────────────────────────────────────────────

const manualEntry = async (data, requestingUser, req = null) => {
  const { userId, date, status, checkIn, checkOut, notes } = data;
  await assertUserInOrganization(requestingUser, userId);
  const organizationId = requestingUser.role === 'SUPER_ADMIN'
    ? await getUserOrganizationId(userId)
    : requestingUser.organizationId;
  const attendanceDate = toAttendanceDate(date);
  const existing = await prisma.attendance.findUnique({ where: { userId_date: { userId, date: attendanceDate } } });
  const workingHours = computeWorkingHours(checkIn, checkOut);
  const normalizedStatus = normalizeStatus(status);

  const record = await prisma.attendance.upsert({
    where: { userId_date: { userId, date: attendanceDate } },
    update: {
      organizationId,
      status: normalizedStatus,
      checkIn: checkIn ? new Date(checkIn) : null,
      checkOut: checkOut ? new Date(checkOut) : null,
      workingHours,
      notes,
      source: ATTENDANCE_SOURCE.MANUAL,
    },
    create: {
      organizationId,
      userId,
      date: attendanceDate,
      status: normalizedStatus,
      checkIn: checkIn ? new Date(checkIn) : null,
      checkOut: checkOut ? new Date(checkOut) : null,
      workingHours,
      notes,
      source: ATTENDANCE_SOURCE.MANUAL,
    },
  });

  await writeAttendanceAudit(existing ? 'UPDATE' : 'CREATE', record, requestingUser, req, existing);
  return record;
};

const updateAttendance = async (id, data, requestingUser, req = null) => {
  const orgId = requestingUser.role === 'SUPER_ADMIN'
    ? data.organizationId
    : requestingUser.organizationId;
  const record = orgId
    ? await tenantRepository(prisma, orgId).model('attendance').findById(id)
    : null;
  if (!record) throw new ApiError(404, 'Attendance not found');
  if (requestingUser.role !== 'SUPER_ADMIN' && record.organizationId !== requestingUser.organizationId) {
    throw new ApiError(403, 'Not authorized for this organization');
  }

  const { organizationId, userId, date, ...safeData } = data;
  if (safeData.status) safeData.status = normalizeStatus(safeData.status);
  if (safeData.checkIn) safeData.checkIn = new Date(safeData.checkIn);
  if (safeData.checkOut) safeData.checkOut = new Date(safeData.checkOut);
  if ('checkIn' in safeData || 'checkOut' in safeData) {
    safeData.workingHours = computeWorkingHours(safeData.checkIn || record.checkIn, safeData.checkOut || record.checkOut);
  }
  safeData.source = ATTENDANCE_SOURCE.MANUAL;

  const updated = await prisma.attendance.update({ where: { id }, data: safeData });
  await writeAttendanceAudit('UPDATE', updated, requestingUser, req, record);
  return updated;
};

// ─── Absence generation, holidays ──────────────────────────────────────────────

const generateAbsences = async (date = new Date(), requestingUser = null) => {
  const attendanceDate = toAttendanceDate(date);
  const organizationScope = getOrganizationScope(requestingUser);
  const employees = await prisma.user.findMany({
    where: { isActive: true, customRole: { tier: 'EMPLOYEE' }, ...organizationScope },
    select: { id: true, organizationId: true },
  });

  let created = 0;
  let skippedAttendance = 0;
  let skippedLeave = 0;
  let skippedHoliday = 0;
  const createdRecords = [];

  for (const employee of employees) {
    const holiday = await getHolidayForDate(employee.organizationId, attendanceDate);
    if (holiday) { skippedHoliday++; continue; }

    const existing = await prisma.attendance.findUnique({ where: { userId_date: { userId: employee.id, date: attendanceDate } } });
    if (existing) { skippedAttendance++; continue; }

    const onLeave = await getApprovedLeaveForDate(employee.organizationId, employee.id, attendanceDate);
    if (onLeave) { skippedLeave++; continue; }

    await prisma.attendance.create({
      data: { organizationId: employee.organizationId, userId: employee.id, date: attendanceDate, status: 'ABSENT', source: ATTENDANCE_SOURCE.ABSENCE_JOB },
    });
    created++;
    createdRecords.push({ userId: employee.id, organizationId: employee.organizationId, date: attendanceDate });
  }

  return { date: formatAttendanceDate(attendanceDate), scanned: employees.length, created, skippedAttendance, skippedLeave, skippedHoliday, createdRecords };
};

const getHolidays = async (requestingUser) => {
  const year = Number(getLocalParts().year);
  return prisma.holiday.findMany({
    where: { ...getOrganizationScope(requestingUser), date: { gte: new Date(Date.UTC(year, 0, 1)), lte: new Date(Date.UTC(year, 11, 31)) } },
    orderBy: { date: 'asc' },
  });
};

const createHoliday = async (data, requestingUser) => {
  return prisma.holiday.create({ data: { ...data, organizationId: requestingUser.organizationId, date: toAttendanceDate(data.date) } });
};

module.exports = {
  checkIn,
  checkOut,
  autoPing,
  getTodayAttendance,
  getMyAttendance,
  getAllAttendance,
  getUserAttendance,
  getAttendanceSummary,
  getWeeklyHoursShortfall,
  manualEntry,
  updateAttendance,
  syncFromTMS,
  generateAbsences,
  getHolidays,
  createHoliday,
  toAttendanceDate,
  getAttendanceTimeZone,
};

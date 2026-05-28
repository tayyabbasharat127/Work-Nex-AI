const axios = require('axios');
const prisma = require('../../config/db');
const { ApiError } = require('../../utils/ApiError');
const { paginate, paginateMeta } = require('../../utils/pagination');
const { verifyOfficeNetwork } = require('../../utils/wifiVerification');
const { addAccessibleUserScope, assertCanAccessUser } = require('../../utils/rbac');
const { assertUserInOrganization, getOrganizationScope, getUserOrganizationId } = require('../../utils/tenant');

const ATTENDANCE_SOURCE = {
  CHECK_IN: 'WEB_CHECK_IN',
  AUTO_PING: 'AUTO_PING',
  MANUAL: 'MANUAL_CORRECTION',
  TMS: 'TMS_SYNC',
  ABSENCE_JOB: 'ABSENCE_JOB',
};

const getAttendanceTimeZone = () => (
  process.env.ATTENDANCE_TIMEZONE
  || process.env.ORGANIZATION_TIMEZONE
  || process.env.TZ
  || 'Asia/Karachi'
);

const getLocalParts = (date = new Date(), timeZone = getAttendanceTimeZone()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
};

const toAttendanceDate = (value = new Date()) => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  const parts = getLocalParts(value instanceof Date ? value : new Date(value));
  return new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)));
};

const formatAttendanceDate = (value = new Date()) => {
  const isStoredDate = value instanceof Date
    && value.getUTCHours() === 0
    && value.getUTCMinutes() === 0
    && value.getUTCSeconds() === 0
    && value.getUTCMilliseconds() === 0;
  const date = isStoredDate ? value : toAttendanceDate(value);
  return date.toISOString().slice(0, 10);
};

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

const normalizeStatus = (status) => {
  const map = {
    Present: 'PRESENT',
    present: 'PRESENT',
    Late: 'LATE',
    late: 'LATE',
    Absent: 'ABSENT',
    absent: 'ABSENT',
    'On Leave': 'ON_LEAVE',
    on_leave: 'ON_LEAVE',
    Holiday: 'HOLIDAY',
    holiday: 'HOLIDAY',
    'Half Day': 'HALF_DAY',
    half_day: 'HALF_DAY',
  };
  return map[status] || status;
};

const calculateWorkingHours = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return null;
  const hours = (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60);
  return Number.isFinite(hours) && hours >= 0 ? parseFloat(hours.toFixed(2)) : null;
};

const isLateCheckIn = (checkIn = new Date()) => {
  const parts = getLocalParts(checkIn);
  const currentMinutes = Number(parts.hour) * 60 + Number(parts.minute);
  const lateMinutes = (parseInt(process.env.LATE_THRESHOLD_HOUR || '9', 10) * 60)
    + parseInt(process.env.LATE_THRESHOLD_MIN || '30', 10);
  return currentMinutes > lateMinutes;
};

const statusAfterCheckout = (record, workingHours) => {
  const halfDayHrs = parseFloat(process.env.HALF_DAY_HOURS || '4');
  if (workingHours !== null && workingHours < halfDayHrs) return 'HALF_DAY';
  return record.status === 'ABSENT' ? 'PRESENT' : record.status;
};

const getHolidayForDate = async (organizationId, date) => {
  const exact = await prisma.holiday.findFirst({ where: { organizationId, date } });
  if (exact) return exact;

  const recurring = await prisma.holiday.findMany({
    where: { organizationId, isRecurring: true },
  });
  const targetMonth = date.getUTCMonth();
  const targetDay = date.getUTCDate();
  return recurring.find((holiday) => (
    holiday.date.getUTCMonth() === targetMonth
    && holiday.date.getUTCDate() === targetDay
  )) || null;
};

const getApprovedLeaveForDate = (organizationId, userId, date) => {
  return prisma.leaveRequest.findFirst({
    where: {
      organizationId,
      employeeId: userId,
      status: 'APPROVED',
      startDate: { lte: date },
      endDate: { gte: date },
    },
  });
};

const assertCanWorkOnDate = async (user, date) => {
  const holiday = await getHolidayForDate(user.organizationId, date);
  if (holiday) throw new ApiError(400, `Cannot check in on holiday: ${holiday.name}`);

  const leave = await getApprovedLeaveForDate(user.organizationId, user.id, date);
  if (leave) throw new ApiError(400, 'Cannot check in while approved leave is active');
};

const toFiniteNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const distanceMeters = (fromLat, fromLng, toLat, toLng) => {
  const earthRadiusMeters = 6371000;
  const toRadians = (degrees) => degrees * (Math.PI / 180);
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);
  const lat1 = toRadians(fromLat);
  const lat2 = toRadians(toLat);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getLocationPolicy = async (organizationId) => {
  const settings = await prisma.organizationSettings.findUnique({ where: { organizationId } });
  const policy = settings?.attendancePolicyJson || {};
  const location = policy.location || policy.gps || {};
  const enabled = Boolean(
    policy.locationVerificationEnabled
    || policy.gpsVerificationEnabled
    || location.enabled
  );

  return {
    enabled,
    latitude: toFiniteNumber(location.latitude ?? policy.officeLatitude),
    longitude: toFiniteNumber(location.longitude ?? policy.officeLongitude),
    radiusMeters: toFiniteNumber(location.radiusMeters ?? policy.officeRadiusMeters) || 100,
  };
};

const verifyAttendanceLocation = async (user, latitude, longitude) => {
  const policy = await getLocationPolicy(user.organizationId);
  if (!policy.enabled) {
    return { latitude: toFiniteNumber(latitude), longitude: toFiniteNumber(longitude), verified: false };
  }

  if (policy.latitude === null || policy.longitude === null) {
    throw new ApiError(500, 'Attendance GPS verification is enabled but office coordinates are not configured');
  }

  const lat = toFiniteNumber(latitude);
  const lng = toFiniteNumber(longitude);
  if (lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new ApiError(400, 'Valid latitude and longitude are required for attendance check-in');
  }

  const distance = distanceMeters(lat, lng, policy.latitude, policy.longitude);
  if (distance > policy.radiusMeters) {
    throw new ApiError(403, `Attendance check-in requires office location. Device is ${Math.round(distance)}m from the configured office radius.`);
  }

  return { latitude: lat, longitude: lng, verified: true, distanceMeters: Math.round(distance) };
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

const checkIn = async (user, latitude, longitude, req) => {
  const networkCheck = verifyOfficeNetwork(req);
  if (!networkCheck.allowed) {
    throw new ApiError(403, `Attendance check-in requires office network. ${networkCheck.reason}`);
  }
  const locationCheck = await verifyAttendanceLocation(user, latitude, longitude);

  const date = toAttendanceDate();
  await assertCanWorkOnDate(user, date);

  const existing = await prisma.attendance.findUnique({
    where: { userId_date: { userId: user.id, date } },
  });
  if (existing?.checkIn) throw new ApiError(409, 'Already checked in today');
  if (existing && !['ABSENT', 'PRESENT', 'LATE', 'HALF_DAY'].includes(existing.status)) {
    throw new ApiError(409, `Cannot check in against ${existing.status} attendance`);
  }

  const now = new Date();
  const status = isLateCheckIn(now) ? 'LATE' : 'PRESENT';
  const data = {
    organizationId: user.organizationId,
    userId: user.id,
    date,
    checkIn: now,
    status,
    latitude: locationCheck.latitude,
    longitude: locationCheck.longitude,
    ipAddress: networkCheck.ip,
    source: ATTENDANCE_SOURCE.CHECK_IN,
    notes: locationCheck.verified ? `GPS verified within ${locationCheck.distanceMeters}m` : undefined,
  };

  if (existing) {
    return prisma.attendance.update({
      where: { id: existing.id },
      data: { ...data, checkOut: null, workingHours: null },
    });
  }

  return prisma.attendance.create({ data });
};

const autoPing = async (user, req) => {
  const networkCheck = verifyOfficeNetwork(req);
  if (!networkCheck.allowed) {
    return { action: 'ignored', reason: 'Not on office network', ip: networkCheck.ip };
  }

  const date = toAttendanceDate();
  const existing = await prisma.attendance.findUnique({
    where: { userId_date: { userId: user.id, date } },
  });
  if (existing?.checkIn) return { action: 'already_checked_in', ip: networkCheck.ip };

  await assertCanWorkOnDate(user, date);

  const now = new Date();
  const status = isLateCheckIn(now) ? 'LATE' : 'PRESENT';
  await prisma.attendance.upsert({
    where: { userId_date: { userId: user.id, date } },
    update: {
      checkIn: now,
      checkOut: null,
      workingHours: null,
      status,
      ipAddress: networkCheck.ip,
      source: ATTENDANCE_SOURCE.AUTO_PING,
    },
    create: {
      organizationId: user.organizationId,
      userId: user.id,
      date,
      checkIn: now,
      status,
      ipAddress: networkCheck.ip,
      source: ATTENDANCE_SOURCE.AUTO_PING,
    },
  });

  return { action: 'auto_checked_in', status, ip: networkCheck.ip };
};

const checkOut = async (user) => {
  const date = toAttendanceDate();
  const record = await prisma.attendance.findUnique({
    where: { userId_date: { userId: user.id, date } },
  });

  if (!record?.checkIn) throw new ApiError(400, 'No check-in found for today');
  if (record.checkOut) throw new ApiError(409, 'Already checked out today');

  const now = new Date();
  const workingHours = calculateWorkingHours(record.checkIn, now);

  return prisma.attendance.update({
    where: { id: record.id },
    data: {
      checkOut: now,
      workingHours,
      status: statusAfterCheckout(record, workingHours),
    },
  });
};

const getTodayAttendance = async (user) => {
  return prisma.attendance.findFirst({
    where: {
      userId: user.id,
      organizationId: user.organizationId,
      date: toAttendanceDate(),
    },
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
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employeeId: true,
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

  return prisma.attendance.groupBy({
    by: ['status'],
    where,
    _count: { status: true },
  });
};

const manualEntry = async (data, requestingUser, req = null) => {
  const { userId, date, status, checkIn, checkOut, notes } = data;
  await assertUserInOrganization(requestingUser, userId);
  const organizationId = requestingUser.role === 'SUPER_ADMIN'
    ? await getUserOrganizationId(userId)
    : requestingUser.organizationId;
  const attendanceDate = toAttendanceDate(date);
  const existing = await prisma.attendance.findUnique({
    where: { userId_date: { userId, date: attendanceDate } },
  });
  const workingHours = calculateWorkingHours(checkIn, checkOut);
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
  const record = await prisma.attendance.findUnique({ where: { id } });
  if (!record) throw new ApiError(404, 'Attendance not found');
  if (requestingUser.role !== 'SUPER_ADMIN' && record.organizationId !== requestingUser.organizationId) {
    throw new ApiError(403, 'Not authorized for this organization');
  }

  const { organizationId, userId, date, ...safeData } = data;
  if (safeData.status) safeData.status = normalizeStatus(safeData.status);
  if (safeData.checkIn) safeData.checkIn = new Date(safeData.checkIn);
  if (safeData.checkOut) safeData.checkOut = new Date(safeData.checkOut);
  if ('checkIn' in safeData || 'checkOut' in safeData) {
    safeData.workingHours = calculateWorkingHours(
      safeData.checkIn || record.checkIn,
      safeData.checkOut || record.checkOut,
    );
  }
  safeData.source = ATTENDANCE_SOURCE.MANUAL;

  const updated = await prisma.attendance.update({ where: { id }, data: safeData });
  await writeAttendanceAudit('UPDATE', updated, requestingUser, req, record);
  return updated;
};

const buildMockTmsRecords = async (date, requestingUser) => {
  const users = await prisma.user.findMany({
    where: { isActive: true, role: { in: ['EMPLOYEE', 'MANAGER', 'ADMIN'] }, ...getOrganizationScope(requestingUser) },
    select: { employeeId: true },
    orderBy: { employeeId: 'asc' },
  });
  const dateStr = formatAttendanceDate(date);

  return users.map((user, index) => {
    const isAbsent = index % 13 === 0;
    if (isAbsent) return { employeeId: user.employeeId, date: dateStr, status: 'ABSENT' };

    const checkIn = new Date(date);
    checkIn.setUTCHours(index % 5 === 0 ? 5 : 4, index % 5 === 0 ? 45 : 15, 0, 0);
    const checkOut = new Date(date);
    checkOut.setUTCHours(12, 30 + (index % 20), 0, 0);
    return {
      employeeId: user.employeeId,
      date: dateStr,
      checkIn: checkIn.toISOString(),
      checkOut: checkOut.toISOString(),
      status: isLateCheckIn(checkIn) ? 'LATE' : 'PRESENT',
    };
  });
};

const syncFromTMS = async (date, requestingUser = null) => {
  const syncDate = toAttendanceDate(date || new Date());
  const dateStr = formatAttendanceDate(syncDate);
  const startLog = await prisma.etlSyncLog.create({
    data: {
      organizationId: requestingUser?.organizationId || null,
      source: 'TMS',
      status: 'PARTIAL',
      recordsIn: 0,
      startedAt: new Date(),
    },
  });

  try {
    let records;
    let mode = 'external';
    if (process.env.TMS_API_URL && process.env.TMS_API_KEY) {
      const response = await axios.get(`${process.env.TMS_API_URL}/attendance`, {
        headers: { 'x-api-key': process.env.TMS_API_KEY },
        params: { date: dateStr },
      });
      records = response.data?.records || [];
    } else {
      mode = 'demo-fallback';
      records = await buildMockTmsRecords(syncDate, requestingUser);
    }

    let processed = 0;
    const errors = [];
    for (const rec of records) {
      try {
        const user = await prisma.user.findFirst({
          where: { employeeId: rec.employeeId, ...getOrganizationScope(requestingUser) },
        });
        if (!user) {
          errors.push(`Unknown employee: ${rec.employeeId}`);
          continue;
        }

        const recDate = toAttendanceDate(rec.date || syncDate);
        const checkIn = rec.checkIn ? new Date(rec.checkIn) : null;
        const checkOut = rec.checkOut ? new Date(rec.checkOut) : null;
        const workingHours = calculateWorkingHours(checkIn, checkOut);
        const status = normalizeStatus(rec.status || (checkIn && isLateCheckIn(checkIn) ? 'LATE' : 'PRESENT'));

        await prisma.attendance.upsert({
          where: { userId_date: { userId: user.id, date: recDate } },
          update: { organizationId: user.organizationId, checkIn, checkOut, workingHours, status, source: ATTENDANCE_SOURCE.TMS },
          create: {
            organizationId: user.organizationId,
            userId: user.id,
            date: recDate,
            checkIn,
            checkOut,
            workingHours,
            status,
            source: ATTENDANCE_SOURCE.TMS,
          },
        });
        processed++;
      } catch (err) {
        errors.push(err.message);
      }
    }

    await prisma.etlSyncLog.update({
      where: { id: startLog.id },
      data: {
        status: errors.length > 0 ? 'PARTIAL' : 'SUCCESS',
        recordsIn: records.length,
        recordsOut: processed,
        errorLog: errors.length > 0 ? errors.join('\n') : null,
        completedAt: new Date(),
      },
    });

    return { processed, errors, total: records.length, mode };
  } catch (err) {
    await prisma.etlSyncLog.update({
      where: { id: startLog.id },
      data: { status: 'FAILED', errorLog: err.message, completedAt: new Date() },
    });
    throw new ApiError(502, `TMS sync failed: ${err.message}`);
  }
};

const generateAbsences = async (date = new Date(), requestingUser = null) => {
  const attendanceDate = toAttendanceDate(date);
  const organizationScope = getOrganizationScope(requestingUser);
  const employees = await prisma.user.findMany({
    where: { isActive: true, role: 'EMPLOYEE', ...organizationScope },
    select: { id: true, organizationId: true },
  });

  let created = 0;
  let skippedAttendance = 0;
  let skippedLeave = 0;
  let skippedHoliday = 0;

  for (const employee of employees) {
    const holiday = await getHolidayForDate(employee.organizationId, attendanceDate);
    if (holiday) {
      skippedHoliday++;
      continue;
    }

    const existing = await prisma.attendance.findUnique({
      where: { userId_date: { userId: employee.id, date: attendanceDate } },
    });
    if (existing) {
      skippedAttendance++;
      continue;
    }

    const onLeave = await getApprovedLeaveForDate(employee.organizationId, employee.id, attendanceDate);
    if (onLeave) {
      skippedLeave++;
      continue;
    }

    await prisma.attendance.create({
      data: {
        organizationId: employee.organizationId,
        userId: employee.id,
        date: attendanceDate,
        status: 'ABSENT',
        source: ATTENDANCE_SOURCE.ABSENCE_JOB,
      },
    });
    created++;
  }

  return {
    date: formatAttendanceDate(attendanceDate),
    scanned: employees.length,
    created,
    skippedAttendance,
    skippedLeave,
    skippedHoliday,
  };
};

const getHolidays = async (requestingUser) => {
  const year = Number(getLocalParts().year);
  return prisma.holiday.findMany({
    where: {
      ...getOrganizationScope(requestingUser),
      date: { gte: new Date(Date.UTC(year, 0, 1)), lte: new Date(Date.UTC(year, 11, 31)) },
    },
    orderBy: { date: 'asc' },
  });
};

const createHoliday = async (data, requestingUser) => {
  return prisma.holiday.create({
    data: { ...data, organizationId: requestingUser.organizationId, date: toAttendanceDate(data.date) },
  });
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
  manualEntry,
  updateAttendance,
  syncFromTMS,
  generateAbsences,
  getHolidays,
  createHoliday,
  toAttendanceDate,
  getAttendanceTimeZone,
};

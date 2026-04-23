const prisma = require('../../config/db');
const { ApiError } = require('../../utils/ApiError');
const { paginate, paginateMeta } = require('../../utils/pagination');
const { getMonthRange } = require('../../utils/dateHelpers');
const { verifyOfficeNetwork } = require('../../utils/wifiVerification');
const axios = require('axios');
const notificationService = require('../notifications/notification.service');

const checkIn = async (userId, latitude, longitude, req) => {
  // WiFi / Network verification
  const networkCheck = verifyOfficeNetwork(req);
  if (!networkCheck.allowed) {
    throw new ApiError(403, `Attendance check-in requires office network. ${networkCheck.reason}`);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await prisma.attendance.findUnique({
    where: { userId_date: { userId, date: today } },
  });

  if (existing?.checkIn) throw new ApiError(409, 'Already checked in today');

  const now = new Date();

  // Late threshold: read from env (default 09:30). Compare in UTC+5 (PKT).
  // TZ_OFFSET_HOURS defaults to 5 for Pakistan Standard Time.
  const tzOffset = parseInt(process.env.TZ_OFFSET_HOURS || '5');
  const localHour = (now.getUTCHours() + tzOffset) % 24;
  const localMin  = now.getUTCMinutes();
  const lateHour  = parseInt(process.env.LATE_THRESHOLD_HOUR || '9');
  const lateMin   = parseInt(process.env.LATE_THRESHOLD_MIN  || '30');
  const isLate    = localHour > lateHour || (localHour === lateHour && localMin > lateMin);

  if (existing) {
    return prisma.attendance.update({
      where: { id: existing.id },
      data: { 
        checkIn: now, 
        status: isLate ? 'LATE' : 'PRESENT', 
        latitude, 
        longitude, 
        ipAddress: networkCheck.ip,
        source: 'MANUAL' 
      },
    });
  }

  return prisma.attendance.create({
    data: {
      userId, date: today, checkIn: now,
      status: isLate ? 'LATE' : 'PRESENT',
      latitude, longitude, 
      ipAddress: networkCheck.ip,
      source: 'MANUAL',
    },
  });
};

const autoPing = async (userId, req) => {
  // Verify office network
  const networkCheck = verifyOfficeNetwork(req);
  if (!networkCheck.allowed) {
    return { action: 'ignored', reason: 'Not on office network', ip: networkCheck.ip };
  }

  // Check if already checked in today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const existing = await prisma.attendance.findUnique({
    where: { userId_date: { userId, date: today } }
  });

  if (existing?.checkIn) {
    return { action: 'already_checked_in', ip: networkCheck.ip };
  }

  // Auto check-in
  const now = new Date();
  const tzOffset = parseInt(process.env.TZ_OFFSET_HOURS || '5');
  const localHour = (now.getUTCHours() + tzOffset) % 24;
  const localMin  = now.getUTCMinutes();
  const lateHour  = parseInt(process.env.LATE_THRESHOLD_HOUR || '9');
  const lateMin   = parseInt(process.env.LATE_THRESHOLD_MIN  || '30');
  const isLate    = localHour > lateHour || (localHour === lateHour && localMin > lateMin);

  await prisma.attendance.create({
    data: {
      userId, date: today, checkIn: now,
      status: isLate ? 'LATE' : 'PRESENT',
      ipAddress: networkCheck.ip,
      source: 'AUTO_PING',
    },
  });

  return { action: 'auto_checked_in', status: isLate ? 'LATE' : 'PRESENT', ip: networkCheck.ip };
};

const checkOut = async (userId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const record = await prisma.attendance.findUnique({
    where: { userId_date: { userId, date: today } },
  });

  if (!record?.checkIn) throw new ApiError(400, 'No check-in found for today');
  if (record.checkOut) throw new ApiError(409, 'Already checked out today');

  const now = new Date();
  const checkInTime = new Date(record.checkIn); // ensure Date object
  const workingHours = (now - checkInTime) / (1000 * 60 * 60);

  const tzOffset  = parseInt(process.env.TZ_OFFSET_HOURS || '5');
  const halfDayHrs = parseFloat(process.env.HALF_DAY_HOURS || '4');

  return prisma.attendance.update({
    where: { id: record.id },
    data: {
      checkOut: now,
      workingHours: parseFloat(workingHours.toFixed(2)),
      status: workingHours < halfDayHrs ? 'HALF_DAY' : record.status,
    },
  });
};

const getTodayAttendance = async (userId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return prisma.attendance.findUnique({ where: { userId_date: { userId, date: today } } });
};

const getMyAttendance = async (userId, query) => {
  const { skip, take, page, limit } = paginate(query);
  const where = { userId };
  if (query.month && query.year) {
    const { start, end } = getMonthRange(parseInt(query.year), parseInt(query.month));
    where.date = { gte: start, lte: end };
  }

  const [records, total] = await Promise.all([
    prisma.attendance.findMany({ where, skip, take, orderBy: { date: 'desc' } }),
    prisma.attendance.count({ where }),
  ]);

  return { records, meta: paginateMeta(total, page, limit) };
};

const getAllAttendance = async (query) => {
  const { skip, take, page, limit } = paginate(query);
  const where = {};
  if (query.userId) where.userId = query.userId;
  if (query.status) where.status = query.status;
  if (query.date) where.date = new Date(query.date);
  if (query.month && query.year) {
    const { start, end } = getMonthRange(parseInt(query.year), parseInt(query.month));
    where.date = { gte: start, lte: end };
  }

  const [records, total] = await Promise.all([
    prisma.attendance.findMany({
      where, skip, take,
      include: { user: { select: { id: true, firstName: true, lastName: true, employeeId: true } } },
      orderBy: { date: 'desc' },
    }),
    prisma.attendance.count({ where }),
  ]);

  return { records, meta: paginateMeta(total, page, limit) };
};

const getUserAttendance = async (userId, query) => {
  return getMyAttendance(userId, query);
};

const getAttendanceSummary = async (query) => {
  const { month, year } = query;
  const { start, end } = getMonthRange(parseInt(year), parseInt(month));

  const summary = await prisma.attendance.groupBy({
    by: ['status'],
    where: { date: { gte: start, lte: end } },
    _count: { status: true },
  });

  return summary;
};

const manualEntry = async (data) => {
  const { userId, date, status, checkIn, checkOut, notes } = data;
  const dateObj = new Date(date);
  dateObj.setHours(0, 0, 0, 0);

  return prisma.attendance.upsert({
    where: { userId_date: { userId, date: dateObj } },
    update: { status, checkIn: checkIn ? new Date(checkIn) : undefined, checkOut: checkOut ? new Date(checkOut) : undefined, notes, source: 'MANUAL' },
    create: { userId, date: dateObj, status, checkIn: checkIn ? new Date(checkIn) : null, checkOut: checkOut ? new Date(checkOut) : null, notes, source: 'MANUAL' },
  });
};

const updateAttendance = async (id, data) => {
  return prisma.attendance.update({ where: { id }, data });
};

/**
 * Sync attendance from TMS (Time Management System)
 * Fetches records from external TMS API and upserts into DB
 */
const syncFromTMS = async (date) => {
  if (!process.env.TMS_API_URL || !process.env.TMS_API_KEY) {
    throw new ApiError(503, 'TMS integration not configured. Set TMS_API_URL and TMS_API_KEY in environment.');
  }

  const syncDate = date ? new Date(date) : new Date();
  const dateStr = syncDate.toISOString().split('T')[0];

  const startLog = await prisma.etlSyncLog.create({
    data: { source: 'TMS', status: 'PARTIAL', recordsIn: 0, startedAt: new Date() },
  });

  try {
    const response = await axios.get(`${process.env.TMS_API_URL}/attendance`, {
      headers: { 'x-api-key': process.env.TMS_API_KEY },
      params: { date: dateStr },
    });

    const records = response.data?.records || [];
    let processed = 0;
    const errors = [];

    for (const rec of records) {
      try {
        const user = await prisma.user.findUnique({ where: { employeeId: rec.employeeId } });
        if (!user) { errors.push(`Unknown employee: ${rec.employeeId}`); continue; }

        const recDate = new Date(rec.date);
        recDate.setHours(0, 0, 0, 0);

        await prisma.attendance.upsert({
          where: { userId_date: { userId: user.id, date: recDate } },
          update: {
            checkIn: rec.checkIn ? new Date(rec.checkIn) : undefined,
            checkOut: rec.checkOut ? new Date(rec.checkOut) : undefined,
            status: rec.status || 'PRESENT',
            source: 'TMS_SYNC',
          },
          create: {
            userId: user.id, date: recDate,
            checkIn: rec.checkIn ? new Date(rec.checkIn) : null,
            checkOut: rec.checkOut ? new Date(rec.checkOut) : null,
            status: rec.status || 'PRESENT',
            source: 'TMS_SYNC',
          },
        });
        processed++;
      } catch (e) {
        errors.push(e.message);
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

    return { processed, errors, total: records.length };
  } catch (err) {
    await prisma.etlSyncLog.update({
      where: { id: startLog.id },
      data: { status: 'FAILED', errorLog: err.message, completedAt: new Date() },
    });
    throw new ApiError(502, `TMS sync failed: ${err.message}`);
  }
};

const getHolidays = async () => {
  const year = new Date().getFullYear();
  return prisma.holiday.findMany({
    where: { date: { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31) } },
    orderBy: { date: 'asc' },
  });
};

const createHoliday = async (data) => {
  return prisma.holiday.create({ data: { ...data, date: new Date(data.date) } });
};

module.exports = {
  checkIn, checkOut, autoPing, getTodayAttendance, getMyAttendance,
  getAllAttendance, getUserAttendance, getAttendanceSummary,
  manualEntry, updateAttendance, syncFromTMS,
  getHolidays, createHoliday,
};

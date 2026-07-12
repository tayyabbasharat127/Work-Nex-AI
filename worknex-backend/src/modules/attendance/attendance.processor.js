/**
 * Attendance Processor — the single funnel every attendance source
 * (web, TMS, and future providers) writes through.
 *
 * Centralizes what used to be duplicated across checkIn/checkOut/autoPing/
 * manualEntry/syncFromTMS: status computation, holiday/leave blocking, and
 * the upsert into the Attendance table. Providers own source-specific
 * concerns (network/GPS verification for web, vendor protocol for TMS) and
 * call in here once they have a normalized record.
 *
 * validateShift() / calculateOT() / emitNotifications() are stubbed —
 * there's no Shift model, no overtime calculation, and no attendance-event
 * notification wiring in the codebase yet. They're kept as explicit no-op
 * extension points (Open/Closed: add real logic later without touching
 * callers) rather than built speculatively now.
 */

const prisma = require('../../config/db');
const { ApiError } = require('../../utils/ApiError');

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

const getAttendanceTimeZone = () => (
  process.env.ATTENDANCE_TIMEZONE
  || process.env.ORGANIZATION_TIMEZONE
  || process.env.TZ
  || 'Asia/Karachi'
);

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

// ─── Status computation (previously duplicated in checkIn/autoPing/syncFromTMS) ──

const computeCheckInStatus = (checkInTime = new Date()) => {
  const parts = getLocalParts(checkInTime);
  const currentMinutes = Number(parts.hour) * 60 + Number(parts.minute);
  const lateMinutes = (parseInt(process.env.LATE_THRESHOLD_HOUR || '9', 10) * 60)
    + parseInt(process.env.LATE_THRESHOLD_MIN || '30', 10);
  return currentMinutes > lateMinutes ? 'LATE' : 'PRESENT';
};

const computeWorkingHours = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return null;
  const hours = (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60);
  return Number.isFinite(hours) && hours >= 0 ? parseFloat(hours.toFixed(2)) : null;
};

const computeCheckOutStatus = (record, workingHours) => {
  const halfDayHrs = parseFloat(process.env.HALF_DAY_HOURS || '4');
  if (workingHours !== null && workingHours < halfDayHrs) return 'HALF_DAY';
  return record.status === 'ABSENT' ? 'PRESENT' : record.status;
};

// ─── Holiday / leave blocking (core business rule — applies to every source) ──

const getHolidayForDate = async (organizationId, date) => {
  const exact = await prisma.holiday.findFirst({ where: { organizationId, date } });
  if (exact) return exact;

  const recurring = await prisma.holiday.findMany({ where: { organizationId, isRecurring: true } });
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

const validateLeave = async (organizationId, userId, date) => {
  const holiday = await getHolidayForDate(organizationId, date);
  if (holiday) throw new ApiError(400, `Cannot check in on holiday: ${holiday.name}`);

  const leave = await getApprovedLeaveForDate(organizationId, userId, date);
  if (leave) throw new ApiError(400, 'Cannot check in while approved leave is active');
};

// ─── Stub extension points — no underlying feature yet, kept as documented no-ops ──

const validateShift = async (userId, organizationId, date) => {
  // No Shift model exists yet. When one does, validate the punch falls
  // within the user's assigned shift window here.
};

const calculateOT = (record, workingHours) => {
  // No overtime policy exists yet. When one does, compute OT hours here
  // and attach them to the record before it's persisted.
  return null;
};

const emitNotifications = async (record, event) => {
  // No attendance-event notification wiring exists yet (late/absent alerts
  // are currently only present in seeded demo data). Wire real notification
  // dispatch here once that's built — event is one of 'CHECK_IN' | 'CHECK_OUT'.
};

// ─── Core funnel ────────────────────────────────────────────────────────────────

/**
 * Records a check-in punch from any source. Throws ApiError on conflict
 * (already checked in, holiday, active leave) — callers that need a soft
 * "already handled" response instead of a thrown error (e.g. autoPing)
 * should pre-check before calling this.
 */
const processCheckIn = async ({ userId, organizationId, date, checkInTime, source, ipAddress = null, latitude = null, longitude = null, notes = undefined }) => {
  await validateLeave(organizationId, userId, date);

  const existing = await prisma.attendance.findUnique({ where: { userId_date: { userId, date } } });
  if (existing?.checkIn) throw new ApiError(409, 'Already checked in today');
  if (existing && !['ABSENT', 'PRESENT', 'LATE', 'HALF_DAY'].includes(existing.status)) {
    throw new ApiError(409, `Cannot check in against ${existing.status} attendance`);
  }

  await validateShift(userId, organizationId, date);

  const status = computeCheckInStatus(checkInTime);
  const data = {
    organizationId,
    userId,
    date,
    checkIn: checkInTime,
    status,
    latitude,
    longitude,
    ipAddress,
    source,
    notes,
  };

  const record = existing
    ? await prisma.attendance.update({ where: { id: existing.id }, data: { ...data, checkOut: null, workingHours: null } })
    : await prisma.attendance.create({ data });

  await emitNotifications(record, 'CHECK_IN');
  return record;
};

/**
 * Records a check-out punch. Requires a same-day check-in to already exist.
 */
const processCheckOut = async ({ userId, organizationId, date, checkOutTime }) => {
  const record = await prisma.attendance.findUnique({ where: { userId_date: { userId, date } } });
  if (!record?.checkIn) throw new ApiError(400, 'No check-in found for today');
  if (record.checkOut) throw new ApiError(409, 'Already checked out today');
  if (record.organizationId !== organizationId) throw new ApiError(403, 'Not authorized for this organization');

  const workingHours = computeWorkingHours(record.checkIn, checkOutTime);
  calculateOT(record, workingHours);

  const updated = await prisma.attendance.update({
    where: { id: record.id },
    data: {
      checkOut: checkOutTime,
      workingHours,
      status: computeCheckOutStatus(record, workingHours),
    },
  });

  await emitNotifications(updated, 'CHECK_OUT');
  return updated;
};

/**
 * Records a full attendance record in one call — used by batch/vendor
 * sources (TMS) that report a punch (or a full day's check-in/check-out
 * pair) as a single unit rather than two separate events.
 */
const processRecord = async ({ userId, organizationId, date, checkIn = null, checkOut = null, status, source, notes = undefined }) => {
  const workingHours = computeWorkingHours(checkIn, checkOut);
  // Matches the pre-refactor syncFromTMS fallback exactly: no checkIn and no
  // explicit status still resolves to PRESENT, not ABSENT. Preserved as-is —
  // changing this is a behavior change, not a refactor, and out of scope here.
  const resolvedStatus = normalizeStatus(status) || (checkIn && computeCheckInStatus(checkIn) === 'LATE' ? 'LATE' : 'PRESENT');

  const record = await prisma.attendance.upsert({
    where: { userId_date: { userId, date } },
    update: { organizationId, checkIn, checkOut, workingHours, status: resolvedStatus, source, notes },
    create: { organizationId, userId, date, checkIn, checkOut, workingHours, status: resolvedStatus, source, notes },
  });

  await emitNotifications(record, checkOut ? 'CHECK_OUT' : 'CHECK_IN');
  return record;
};

module.exports = {
  toAttendanceDate,
  formatAttendanceDate,
  getAttendanceTimeZone,
  getLocalParts,
  normalizeStatus,
  computeCheckInStatus,
  computeWorkingHours,
  computeCheckOutStatus,
  getHolidayForDate,
  getApprovedLeaveForDate,
  validateLeave,
  processCheckIn,
  processCheckOut,
  processRecord,
};

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
const { config } = require('../../config/env');

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

const getAttendanceTimeZone = () => config.attendance.timezone;

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

// "HH:MM" -> minutes since midnight. Used for both the category late-threshold
// and the org work-window, so both accept the same simple string format.
const parseTimeToMinutes = (value) => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value || '');
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

// `lateThresholdTime` ("08:40") comes from the check-in user's StaffCategory —
// when absent (no category, or category has no threshold set), falls back to
// the existing org-wide env vars exactly as before this feature existed.
const computeCheckInStatus = (checkInTime = new Date(), lateThresholdTime = null) => {
  const parts = getLocalParts(checkInTime);
  const currentMinutes = Number(parts.hour) * 60 + Number(parts.minute);
  const overrideMinutes = parseTimeToMinutes(lateThresholdTime);
  const lateMinutes = overrideMinutes !== null
    ? overrideMinutes
    : (config.attendance.lateThresholdHour * 60) + config.attendance.lateThresholdMinute;
  return currentMinutes > lateMinutes ? 'LATE' : 'PRESENT';
};

// Reporting-only — never blocks a check-in, just flags punches outside the
// org's configured office hours (e.g. "8 AM – 6 PM") for visibility.
const isOutsideWorkWindow = async (checkInTime, organizationId) => {
  const settings = await prisma.organizationSettings.findUnique({ where: { organizationId } });
  const policy = settings?.attendancePolicyJson;
  const startMinutes = parseTimeToMinutes(policy?.workWindowStart);
  const endMinutes = parseTimeToMinutes(policy?.workWindowEnd);
  if (startMinutes === null || endMinutes === null) return false;

  const parts = getLocalParts(checkInTime);
  const currentMinutes = Number(parts.hour) * 60 + Number(parts.minute);
  return currentMinutes < startMinutes || currentMinutes > endMinutes;
};

// Counts this user's LATE days so far this calendar month (the month of
// `date`) and reports whether including `date` itself crosses a multiple of
// `latesPerAbsence` — e.g. the 3rd, 6th, 9th late of the month.
const isNthLateThisMonth = async (userId, organizationId, date, latesPerAbsence) => {
  const monthStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  const priorLateCount = await prisma.attendance.count({
    where: { userId, organizationId, status: 'LATE', date: { gte: monthStart, lt: monthEnd, not: date } },
  });
  const countIncludingToday = priorLateCount + 1;
  return countIncludingToday % latesPerAbsence === 0;
};

const computeWorkingHours = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return null;
  const hours = (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60);
  return Number.isFinite(hours) && hours >= 0 ? parseFloat(hours.toFixed(2)) : null;
};

const computeCheckOutStatus = (record, workingHours) => {
  const halfDayHrs = config.attendance.halfDayHours;
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

const getHolidaysInRange = async (organizationId, startDate, endDate) => {
  const start = toAttendanceDate(startDate);
  const end = toAttendanceDate(endDate);
  if (end < start) return [];

  const holidays = await prisma.holiday.findMany({
    where: {
      organizationId,
      OR: [
        { date: { gte: start, lte: end } },
        { isRecurring: true },
      ],
    },
    orderBy: { date: 'asc' },
  });
  const exactByDate = new Map();
  const recurringByMonthDay = new Map();
  holidays.forEach((holiday) => {
    exactByDate.set(holiday.date.toISOString().slice(0, 10), holiday);
    if (holiday.isRecurring) {
      recurringByMonthDay.set(`${holiday.date.getUTCMonth()}-${holiday.date.getUTCDate()}`, holiday);
    }
  });

  const occurrences = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const holiday = exactByDate.get(cursor.toISOString().slice(0, 10))
      || recurringByMonthDay.get(`${cursor.getUTCMonth()}-${cursor.getUTCDate()}`);
    if (holiday) occurrences.push({ ...holiday, observedDate: new Date(cursor) });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return occurrences;
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

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { staffCategory: true } });
  const category = user?.staffCategory || null;

  let status = computeCheckInStatus(checkInTime, category?.lateThresholdTime);
  const noteParts = notes ? [notes] : [];

  if (status === 'LATE' && category?.latesPerAbsence) {
    if (await isNthLateThisMonth(userId, organizationId, date, category.latesPerAbsence)) {
      status = 'ABSENT';
      noteParts.push(`Every ${category.latesPerAbsence} lates = 1 absence — threshold reached this month — auto-marked absent per ${category.name} policy`);
    }
  }

  if (await isOutsideWorkWindow(checkInTime, organizationId)) {
    noteParts.push('Outside configured work window');
  }

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
    notes: noteParts.length ? noteParts.join(' | ') : notes,
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
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { staffCategory: true } });
  const category = user?.staffCategory || null;

  // Matches the pre-refactor syncFromTMS fallback exactly: no checkIn and no
  // explicit status still resolves to PRESENT, not ABSENT. Preserved as-is —
  // changing this is a behavior change, not a refactor, and out of scope here.
  let resolvedStatus = normalizeStatus(status)
    || (checkIn && computeCheckInStatus(checkIn, category?.lateThresholdTime) === 'LATE' ? 'LATE' : 'PRESENT');

  const noteParts = notes ? [notes] : [];

  // The 3-lates-to-absence rule applies regardless of whether "LATE" came
  // from the device/source directly or from the fallback threshold check —
  // this is how real biometric-device attendance (the actual NTS check-in
  // path) gets covered, not just the web self check-in.
  if (resolvedStatus === 'LATE' && category?.latesPerAbsence) {
    if (await isNthLateThisMonth(userId, organizationId, date, category.latesPerAbsence)) {
      resolvedStatus = 'ABSENT';
      noteParts.push(`Every ${category.latesPerAbsence} lates = 1 absence — threshold reached this month — auto-marked absent per ${category.name} policy`);
    }
  }

  if (checkIn && await isOutsideWorkWindow(checkIn, organizationId)) {
    noteParts.push('Outside configured work window');
  }

  const finalNotes = noteParts.length ? noteParts.join(' | ') : notes;

  const record = await prisma.attendance.upsert({
    where: { userId_date: { userId, date } },
    update: { organizationId, checkIn, checkOut, workingHours, status: resolvedStatus, source, notes: finalNotes },
    create: { organizationId, userId, date, checkIn, checkOut, workingHours, status: resolvedStatus, source, notes: finalNotes },
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
  isOutsideWorkWindow,
  getHolidayForDate,
  getHolidaysInRange,
  getApprovedLeaveForDate,
  validateLeave,
  processCheckIn,
  processCheckOut,
  processRecord,
};

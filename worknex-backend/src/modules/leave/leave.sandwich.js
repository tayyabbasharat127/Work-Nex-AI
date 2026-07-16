/**
 * Sandwich-leave rule — opt-in per organization (OrganizationSettings.sandwichLeaveEnabled).
 *
 * "Leave on Friday + unapproved absence on Monday (or the mirror: leave starts
 * Monday, employee was absent the preceding Friday) swallows the weekend/holiday
 * gap into the leave too — 4 days deducted instead of 1."
 *
 * This module only detects the pattern using read operations. Callers own the
 * balance mutation, keeping detection independent from leave.service.js.
 */

const prisma = require('../../config/db');
const { getHolidayForDate, toAttendanceDate } = require('../attendance/attendance.processor');

const isWeekend = (date) => date.getUTCDay() === 0 || date.getUTCDay() === 6;

const fmt = (date) => date.toISOString().slice(0, 10);

const addDays = (date, n) => {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
};

// Walks backward from `date` to the most recent working day (skips weekends + holidays).
const findPreviousWorkingDay = async (date, organizationId) => {
  let d = addDays(date, -1);
  while (isWeekend(d) || await getHolidayForDate(organizationId, d)) {
    d = addDays(d, -1);
  }
  return d;
};

// Calendar days strictly between two dates (exclusive both ends).
const getGapDays = (fromDateExclusive, toDateExclusive) => {
  const days = [];
  let d = addDays(fromDateExclusive, 1);
  while (d < toDateExclusive) {
    days.push(d);
    d = addDays(d, 1);
  }
  return days;
};

const isSandwichEnabled = async (organizationId) => {
  const settings = await prisma.organizationSettings.findUnique({ where: { organizationId } });
  return Boolean(settings?.sandwichLeaveEnabled);
};

/**
 * Friday-leave → Monday-absent direction. Called after generateAbsences()
 * creates a new ABSENT record.
 */
const detectSandwichForAbsence = async (absentDate, employeeId, organizationId) => {
  if (!await isSandwichEnabled(organizationId)) return null;
  if (isWeekend(absentDate)) return null;
  if (await getHolidayForDate(organizationId, absentDate)) return null;

  const prevWorkingDay = await findPreviousWorkingDay(absentDate, organizationId);
  const gapDays = getGapDays(prevWorkingDay, absentDate);
  if (gapDays.length === 0) return null; // absence is the very next working day — no gap to sandwich

  const priorLeave = await prisma.leaveRequest.findFirst({
    where: {
      organizationId,
      employeeId,
      status: 'APPROVED',
      endDate: { gte: prevWorkingDay, lt: addDays(prevWorkingDay, 1) },
    },
  });
  if (!priorLeave) return null;

  const extraDays = gapDays.length + 1; // gap days + the absence day itself
  return {
    leaveRequestId: priorLeave.id,
    extraDays,
    gapDescription: `${gapDays.length} day(s) between leave ending ${fmt(prevWorkingDay)} and unapproved absence on ${fmt(absentDate)}`,
  };
};

/**
 * Monday-leave → Friday-absent direction. Called right after a leave transitions
 * to APPROVED (manual approval or auto-approval).
 */
const detectSandwichForNewLeave = async (leave, organizationId) => {
  if (!await isSandwichEnabled(organizationId)) return null;
  const leaveStart = new Date(leave.startDate);
  if (isWeekend(leaveStart)) return null;
  if (await getHolidayForDate(organizationId, leaveStart)) return null;

  const prevWorkingDay = await findPreviousWorkingDay(leaveStart, organizationId);
  const gapDays = getGapDays(prevWorkingDay, leaveStart);
  if (gapDays.length === 0) return null;

  const attendance = await prisma.attendance.findUnique({
    where: { userId_date: { userId: leave.employeeId, date: toAttendanceDate(prevWorkingDay) } },
  });
  if (!attendance || attendance.status !== 'ABSENT') return null;

  const extraDays = gapDays.length + 1;
  return {
    leaveRequestId: leave.id,
    extraDays,
    gapDescription: `${gapDays.length} day(s) between unapproved absence on ${fmt(prevWorkingDay)} and leave starting ${fmt(leaveStart)}`,
  };
};

module.exports = {
  detectSandwichForAbsence,
  detectSandwichForNewLeave,
  isSandwichEnabled,
};

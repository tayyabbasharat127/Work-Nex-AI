const prisma = require('../../config/db');
const { ApiError } = require('../../utils/ApiError');
const { identifyDevice, verifySignature } = require('./providers/webhook.provider');
const processor = require('./attendance.processor');

// A single day can carry more than one in/out pair (e.g. check-in 8am, out
// for lunch 2pm, back in 3pm, final out 5:30pm). Trust the device's own
// IN/OUT `type` label when every punch that day has one; otherwise fall back
// to strict chronological alternation (1st=IN, 2nd=OUT, 3rd=IN, ...).
const classifyPunches = (punches) => {
  const withKind = punches.map((punch) => ({
    ...punch,
    kind: /^in$/i.test(punch.type) ? 'IN' : /^out$/i.test(punch.type) ? 'OUT' : null,
  }));
  if (withKind.every((punch) => punch.kind)) return withKind;
  return withKind.map((punch, index) => ({ ...punch, kind: index % 2 === 0 ? 'IN' : 'OUT' }));
};

// Rebuilds the single daily Attendance row from every raw punch on that day —
// checkIn is the first IN, checkOut is the last OUT, and workingHours is the
// sum of each matched IN→OUT segment so a lunch gap is never counted as time
// worked (unlike a naive last-punch-minus-first-punch calculation).
const reconcileDayFromPunches = async ({ userId, organizationId, date }) => {
  const windowStart = new Date(date.getTime() - 24 * 60 * 60 * 1000);
  const windowEnd = new Date(date.getTime() + 48 * 60 * 60 * 1000);
  const candidates = await prisma.universityAttendancePunch.findMany({
    where: { userId, organizationId, checkInTime: { gte: windowStart, lt: windowEnd } },
    orderBy: { checkInTime: 'asc' },
  });
  const dayPunches = candidates.filter(
    (punch) => processor.toAttendanceDate(punch.checkInTime).getTime() === date.getTime(),
  );
  if (dayPunches.length === 0) return null;

  const classified = classifyPunches(dayPunches);

  let firstIn = null;
  let lastOut = null;
  let pendingIn = null;
  let workedMs = 0;
  for (const punch of classified) {
    if (punch.kind === 'IN') {
      if (!firstIn) firstIn = punch.checkInTime;
      pendingIn = punch.checkInTime;
    } else if (punch.kind === 'OUT' && pendingIn) {
      workedMs += punch.checkInTime.getTime() - pendingIn.getTime();
      lastOut = punch.checkInTime;
      pendingIn = null;
    }
  }
  const workingHours = workedMs > 0 ? Number((workedMs / 3600000).toFixed(2)) : null;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { staffCategory: true } });
  const status = firstIn ? processor.computeCheckInStatus(firstIn, user?.staffCategory?.lateThresholdTime) : 'ABSENT';

  return prisma.attendance.upsert({
    where: { userId_date: { userId, date } },
    update: { organizationId, checkIn: firstIn, checkOut: lastOut, workingHours, status, source: 'BIOMETRIC_PUNCH' },
    create: { organizationId, userId, date, checkIn: firstIn, checkOut: lastOut, workingHours, status, source: 'BIOMETRIC_PUNCH' },
  });
};

const ingestPunch = async ({ serialNumber, signature, timestamp, nonce, rawBody, punch }) => {
  const device = await identifyDevice(serialNumber);
  await verifySignature(device, { signature, timestamp, nonce, rawBody });

  const externalUserId = String(punch.USERID).trim();
  const user = await prisma.user.findFirst({
    where: {
      organizationId: device.organizationId,
      employeeId: externalUserId,
    },
    select: { id: true, organizationId: true },
  });

  if (!user) {
    throw new ApiError(404, `No WorkNex user found for USERID ${externalUserId}`);
  }

  const checkInTime = new Date(punch.CHECKINTIME);
  const record = await prisma.universityAttendancePunch.create({
    data: {
      organizationId: user.organizationId,
      userId: user.id,
      externalUserId,
      checkInTime,
      type: punch.TYPE,
    },
  });

  await reconcileDayFromPunches({
    userId: user.id,
    organizationId: user.organizationId,
    date: processor.toAttendanceDate(checkInTime),
  });

  return record;
};

const getPunchesForDay = async (userId, organizationId, date) => {
  const windowStart = new Date(date.getTime() - 24 * 60 * 60 * 1000);
  const windowEnd = new Date(date.getTime() + 48 * 60 * 60 * 1000);
  const candidates = await prisma.universityAttendancePunch.findMany({
    where: { userId, organizationId, checkInTime: { gte: windowStart, lt: windowEnd } },
    orderBy: { checkInTime: 'asc' },
  });
  const dayPunches = candidates.filter(
    (punch) => processor.toAttendanceDate(punch.checkInTime).getTime() === date.getTime(),
  );
  return classifyPunches(dayPunches).map((punch) => ({
    id: punch.id,
    time: punch.checkInTime,
    type: punch.kind,
    rawType: punch.type,
  }));
};

module.exports = { ingestPunch, reconcileDayFromPunches, getPunchesForDay };

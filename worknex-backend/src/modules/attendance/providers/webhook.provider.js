/**
 * ADMS webhook provider — receives real-time pushes directly from a
 * biometric device (the device dials out to us; we never dial it).
 *
 * Unlike the TMS/polling provider (which fetches a full day's records in
 * one batch), a device push is one punch at a time. There's no "check-in
 * vs check-out" flag in the payload — we infer it the same way the rest of
 * the system already does: first punch of the day fills checkIn, a later
 * punch the same day fills checkOut.
 *
 * The device isn't a logged-in user, so this can't use the JWT `authenticate`
 * middleware — it identifies itself by device serial number (registered in
 * the Devices tab) and, optionally, a shared communication key.
 */

const prisma = require('../../../config/db');
const { ApiError } = require('../../../utils/ApiError');
const { decrypt } = require('../../../utils/encryption');
const crypto = require('crypto');
const processor = require('../attendance.processor');

const ATTENDANCE_SOURCE = 'ADMS_PUSH';

const identifyDevice = async (serialNumber) => {
  if (!serialNumber) throw new ApiError(400, 'Device serial number (SN) is required');
  const device = await prisma.biometricDevice.findUnique({ where: { deviceSerial: serialNumber } });
  if (!device) throw new ApiError(404, `Unknown device serial: ${serialNumber} — register it first under Biometric Integration → Devices`);
  return device;
};

const verifySignature = async (device, { signature, timestamp, nonce, rawBody }) => {
  if (!device.hmacSecretEncrypted) throw new ApiError(401, 'Device HMAC credential is not configured');
  if (!signature || !timestamp || !nonce) throw new ApiError(401, 'Signed timestamp and nonce are required');
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(String(nonce))) throw new ApiError(400, 'Invalid webhook nonce');
  const timestampMs = Number(timestamp);
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > 5 * 60 * 1000) {
    throw new ApiError(401, 'Webhook timestamp is outside the allowed window');
  }
  const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from('');
  const expected = crypto.createHmac('sha256', decrypt(device.hmacSecretEncrypted))
    .update(`${timestamp}.${nonce}.`).update(body).digest('hex');
  const supplied = String(signature).replace(/^sha256=/, '').toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(supplied)
      || !crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(supplied, 'hex'))) {
    throw new ApiError(401, 'Invalid webhook signature');
  }
  try {
    await prisma.biometricWebhookNonce.create({
      data: { deviceId: device.id, nonce: String(nonce), expiresAt: new Date(timestampMs + 5 * 60 * 1000) },
    });
  } catch (error) {
    if (error?.code === 'P2002') throw new ApiError(409, 'Webhook replay detected');
    throw error;
  }
};

const readMappedField = (rawRecord, fieldMapping, field, defaultKey) => {
  const key = fieldMapping?.[field] || defaultKey;
  return rawRecord[key] ?? rawRecord[field] ?? rawRecord[defaultKey];
};

// One raw punch -> infer check-in or check-out against today's existing
// record for that user, same rule used everywhere else in this codebase.
const applyPunch = async (organizationId, userId, punchTime) => {
  const date = processor.toAttendanceDate(punchTime);
  const existing = await prisma.attendance.findUnique({ where: { userId_date: { userId, date } } });

  if (!existing?.checkIn) {
    return processor.processCheckIn({
      userId, organizationId, date, checkInTime: punchTime, source: ATTENDANCE_SOURCE,
    });
  }
  if (!existing.checkOut) {
    return processor.processCheckOut({ userId, organizationId, date, checkOutTime: punchTime });
  }
  // Both already set for today — extra punch, nothing to update.
  return existing;
};

/**
 * @param {{ serialNumber: string, communicationKey?: string, records: object[] }} payload
 *   records: raw punch rows in whatever shape the device/middleware sends —
 *   field names are resolved via the org's configured fieldMapping.
 */
const receivePush = async ({ serialNumber, signature, timestamp, nonce, rawBody, records }) => {
  const device = await identifyDevice(serialNumber);
  const integration = await prisma.biometricIntegration.findUnique({ where: { organizationId: device.organizationId } });
  if (!integration || integration.integrationType !== 'ADMS' || !integration.enabled) {
    throw new ApiError(403, 'ADMS integration is not enabled for this organization');
  }
  await verifySignature(device, { signature, timestamp, nonce, rawBody });

  const startLog = await prisma.etlSyncLog.create({
    data: {
      organizationId: device.organizationId, source: 'TMS', status: 'PARTIAL',
      recordsIn: records.length, startedAt: new Date(),
    },
  });

  let processed = 0;
  const errors = [];
  for (const rec of records) {
    try {
      const employeeId = readMappedField(rec, integration.fieldMapping, 'employeeId', 'USERID');
      const user = await prisma.user.findFirst({ where: { employeeId, organizationId: device.organizationId } });
      if (!user) { errors.push(`Unknown employee: ${employeeId}`); continue; }

      const punchTimeRaw = readMappedField(rec, integration.fieldMapping, 'checkIn', 'CHECKTIME');
      const punchTime = punchTimeRaw ? new Date(punchTimeRaw) : new Date();

      await applyPunch(device.organizationId, user.id, punchTime);
      processed++;
    } catch (err) {
      errors.push(err.message);
    }
  }

  await prisma.biometricDevice.update({ where: { id: device.id }, data: { status: 'ONLINE', lastSeenAt: new Date() } });

  await prisma.etlSyncLog.update({
    where: { id: startLog.id },
    data: {
      status: errors.length > 0 ? 'PARTIAL' : 'SUCCESS',
      recordsOut: processed,
      errorLog: errors.length > 0 ? errors.join('\n') : null,
      completedAt: new Date(),
    },
  });

  return { processed, errors, total: records.length };
};

module.exports = { receivePush };

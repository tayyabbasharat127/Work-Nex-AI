/**
 * Real ZKTeco ADMS / iClock push-protocol handler.
 *
 * This is the actual wire protocol ZKTeco terminal firmware (uFace 950,
 * and the wider iClock/ADMS family) speaks when its "Comm -> Cloud Server
 * Setting" menu is pointed at a server — as opposed to `webhook.provider.js`,
 * which is a custom JSON+HMAC contract for a middleware/relay, not something
 * unmodified device firmware can produce.
 *
 * Firmware only lets you configure a Server Address (IP) and Server Port —
 * it then always talks to these 4 fixed paths itself:
 *   GET  /iclock/cdata?SN=...&options=all         -> device handshake/config pull
 *   POST /iclock/cdata?SN=...&table=ATTLOG&Stamp=  -> attendance punches (plain text)
 *   POST /iclock/cdata?SN=...&table=OPERLOG        -> enrollment/user-management logs (ack only)
 *   GET  /iclock/getrequest?SN=...                 -> heartbeat / poll for pending commands
 *   POST /iclock/devicecmd?SN=...                  -> device acking a command we issued
 *
 * All responses are plain text ("OK", or device-specific key=value config
 * lines), never JSON — the firmware doesn't parse JSON.
 *
 * Security note: unlike the JSON webhook, firmware cannot produce HMAC
 * signatures or custom headers. Trust here is: (1) the device serial (SN)
 * must already be registered under Biometric Integration -> Devices for
 * SOME organization with ADMS enabled, and (2) network-level — this
 * endpoint is meant to be reached from a trusted LAN/VPN, not the open
 * internet. If BiometricDevice.ipAddress is set, a mismatch is logged as a
 * warning but never blocks (NAT/proxy can legitimately change source IP).
 */

const prisma = require('../../../config/db');
const logger = require('../../../config/logger');
const processor = require('../attendance.processor');
const crypto = require('crypto');
const { config } = require('../../../config/env');
const { decrypt } = require('../../../utils/encryption');

const ATTENDANCE_SOURCE = 'ADMS_PUSH';

/* ─── Device lookup (shared by every handler) ──────────────────────────── */

const findDevice = async (serialNumber) => {
  if (!serialNumber) return null;
  return prisma.biometricDevice.findUnique({ where: { deviceSerial: serialNumber } });
};

const constantTimeEqual = (left, right) => {
  const leftBuffer = Buffer.from(String(left || ''));
  const rightBuffer = Buffer.from(String(right || ''));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const authorizeDevice = async (serialNumber, req) => {
  const device = await findDevice(serialNumber);
  if (!device) return null;

  const integration = await prisma.biometricIntegration.findUnique({
    where: { organizationId: device.organizationId },
  });
  if (!integration || integration.integrationType !== 'ADMS' || !integration.enabled) return null;

  const configuredKey = integration.admsCommunicationKeyEncrypted
    ? decrypt(integration.admsCommunicationKeyEncrypted)
    : null;
  const suppliedKey = req.query.pushcommkey || req.query.PushCommKey || req.query.COMMKEY;
  if ((configuredKey && !constantTimeEqual(configuredKey, suppliedKey)) || (!configuredKey && config.isProduction)) {
    logger.warn('[iClock] Rejected device request with invalid communication key');
    return null;
  }

  return { device, integration };
};

const touchDevice = async (device, req) => {
  const seenIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString();
  if (device.ipAddress && !seenIp.includes(device.ipAddress)) {
    logger.warn(`[iClock] Device ${device.deviceSerial} pushed from ${seenIp}, registered IP is ${device.ipAddress} (not blocking — NAT/proxy can shift source IP)`);
  }
  await prisma.biometricDevice.update({
    where: { id: device.id },
    data: { status: 'ONLINE', lastSeenAt: new Date(), ipAddress: device.ipAddress || seenIp.split(',')[0].trim() },
  }).catch(() => {});
};

/* ─── GET /iclock/cdata — device handshake / option pull ──────────────── */
// Fired when the terminal first contacts the server (and periodically after).
// It expects a plain-text response of key=value config lines — an empty/
// minimal set is enough to make the device consider registration successful
// and move on to actually pushing ATTLOG data.
const handleHandshake = async (req, res) => {
  const sn = req.query.SN || req.query.sn;
  logger.info(`[iClock] Handshake from SN=${sn} options=${req.query.options || ''} pushver=${req.query.pushver || ''}`);
  const authorized = await authorizeDevice(sn, req);
  if (!authorized) {
    logger.warn(`[iClock] Unknown device SN=${sn} tried to hand-shake — register it under Biometric Integration -> Devices first`);
    return res.type('text/plain').status(200).send('OK');
  }
  const { device } = authorized;
  await touchDevice(device, req);
  const lines = [
    `GET OPTION FROM: ${sn}`,
    'Stamp=9999',
    'OpStamp=9999',
    'ErrorDelay=30',
    'Delay=30',
    'TransTimes=00:00;14:05',
    'TransInterval=1',
    'TransFlag=1111000000',
    'Realtime=1',
    'Encrypt=0',
  ];
  res.type('text/plain').status(200).send(lines.join('\n') + '\n');
};

/* ─── GET /iclock/getrequest — heartbeat / command poll ────────────────── */
// The terminal polls this repeatedly (every few seconds to a minute). We
// have no commands to push down to the device, so always reply OK.
const handleGetRequest = async (req, res) => {
  const sn = req.query.SN || req.query.sn;
  const authorized = await authorizeDevice(sn, req);
  if (authorized) await touchDevice(authorized.device, req);
  res.type('text/plain').status(200).send('OK');
};

/* ─── POST /iclock/devicecmd — device acking a command ─────────────────── */
const handleDeviceCmd = async (req, res) => {
  const sn = req.query.SN || req.query.sn;
  const authorized = await authorizeDevice(sn, req);
  if (authorized) await touchDevice(authorized.device, req);
  res.type('text/plain').status(200).send('OK');
};

/* ─── Parsing ATTLOG lines ──────────────────────────────────────────────
 * One punch per line, fields separated by tab (some firmware uses runs of
 * spaces instead — split on any whitespace run to be safe):
 *   PIN   TIME                STATUS  VERIFY  WORKCODE  ...
 *   3      2026-07-13 09:02:11  0       1        0
 * PIN is the enrolled user ID on the device — this must match a WorkNex
 * employeeId exactly (or the org's employeeId values must be re-keyed to
 * match device enrollment numbers).
 */
const parseAttlog = (rawBody) => {
  const text = rawBody.toString('utf8').trim();
  if (!text) return [];
  return text.split(/\r?\n/).filter(Boolean).map((line) => {
    const fields = line.trim().split(/\s+/);
    const [pin, dateStr, timeStr, status, verify, workcode] = fields.length >= 3 && fields[1].includes('-')
      // "PIN  YYYY-MM-DD  HH:MM:SS  ..." (date/time as two fields)
      ? [fields[0], fields[1], fields[2], fields[3], fields[4], fields[5]]
      // "PIN  YYYY-MM-DDTHH:MM:SS  ..." (date/time as one field) — reshuffle
      : [fields[0], null, fields[1], fields[2], fields[3], fields[4]];
    const punchTime = dateStr ? new Date(`${dateStr}T${timeStr}`) : new Date(timeStr);
    return { pin, punchTime, status, verify, workcode, raw: line };
  });
};

const applyPunch = async (organizationId, userId, punchTime) => {
  const date = processor.toAttendanceDate(punchTime);
  const existing = await prisma.attendance.findUnique({ where: { userId_date: { userId, date } } });
  if (!existing?.checkIn) {
    return processor.processCheckIn({ userId, organizationId, date, checkInTime: punchTime, source: ATTENDANCE_SOURCE });
  }
  if (!existing.checkOut) {
    return processor.processCheckOut({ userId, organizationId, date, checkOutTime: punchTime });
  }
  return existing; // extra punch same day — nothing to update
};

/* ─── POST /iclock/cdata — the actual data push ─────────────────────────── */
const handleDataPush = async (req, res) => {
  const sn = req.query.SN || req.query.sn;
  const table = (req.query.table || '').toUpperCase();
  const rawBody = Buffer.from(typeof req.body === 'string' ? req.body : '', 'utf8');

  logger.info(`[iClock] POST cdata SN=${sn} table=${table} bytes=${rawBody.length}`);
  const authorized = await authorizeDevice(sn, req);
  if (!authorized) {
    logger.warn(`[iClock] Unknown device SN=${sn} pushed table=${table} — ignoring (register the device first)`);
    return res.type('text/plain').status(200).send('OK');
  }

  const { device } = authorized;

  await touchDevice(device, req);

  if (table !== 'ATTLOG') {
    // OPERLOG (user/enrollment sync), OPLOG, etc. — ack so the device
    // doesn't retry-loop, but we don't process these yet.
    return res.type('text/plain').status(200).send('OK');
  }

  const punches = parseAttlog(rawBody);
  const startLog = await prisma.etlSyncLog.create({
    data: { organizationId: device.organizationId, source: 'TMS', status: 'PARTIAL', recordsIn: punches.length, startedAt: new Date() },
  });

  let processed = 0;
  const errors = [];
  for (const [index, punch] of punches.entries()) {
    try {
      if (!punch.pin || Number.isNaN(punch.punchTime.getTime())) {
        errors.push(`Punch ${index + 1} could not be parsed`);
        continue;
      }
      const user = await prisma.user.findFirst({ where: { employeeId: punch.pin, organizationId: device.organizationId } });
      if (!user) { errors.push(`Punch ${index + 1} references an unknown employee`); continue; }
      await applyPunch(device.organizationId, user.id, punch.punchTime);
      processed += 1;
    } catch (err) {
      errors.push(`Punch ${index + 1}: ${err.message}`);
    }
  }

  await prisma.etlSyncLog.update({
    where: { id: startLog.id },
    data: {
      status: errors.length > 0 ? 'PARTIAL' : 'SUCCESS',
      recordsOut: processed,
      errorLog: errors.length > 0 ? errors.join('\n') : null,
      completedAt: new Date(),
    },
  });

  if (errors.length) logger.warn(`[iClock] ${errors.length} issue(s) processing SN=${sn} push:\n${errors.join('\n')}`);
  logger.info(`[iClock] Processed ${processed}/${punches.length} punches from SN=${sn}`);

  // ZKTeco firmware expects literal "OK" (sometimes "OK: n") to consider the
  // batch delivered and clear it from the device's send queue.
  res.type('text/plain').status(200).send(`OK: ${processed}`);
};

module.exports = { handleHandshake, handleGetRequest, handleDeviceCmd, handleDataPush, parseAttlog };

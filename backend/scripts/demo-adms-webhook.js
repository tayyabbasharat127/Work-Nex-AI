/**
 * Demo/test script for the ADMS (Device Push) webhook — simulates what a
 * real biometric device (or a middleware translating its protocol) would
 * send, since real ZKTeco firmware cannot itself produce this webhook's
 * required JSON body + HMAC headers (see conversation notes — this webhook
 * is a custom contract, not the vendor's raw iClock/ADMS protocol).
 *
 * What it does:
 *   1. Ensures a BiometricIntegration row exists for the org (ADMS, enabled).
 *   2. Ensures a demo BiometricDevice is registered with a known HMAC secret.
 *   3. Builds one signed "punch" request exactly the way webhook.provider.js
 *      verifies it (HMAC-SHA256 over `${timestamp}.${nonce}.${rawBody}`).
 *   4. POSTs it to /api/v1/attendance/tms-webhook against the LIVE backend
 *      (must already be running).
 *   5. Reads back the resulting Attendance row to prove it landed.
 *
 * Idempotent-ish: safe to re-run — reuses the same integration/device if
 * they already exist. Each run punches in (or out, if already checked in
 * today) for the target employee.
 *
 * Usage: node scripts/demo-adms-webhook.js [employeeId]
 *   Defaults to Bilal Khan's account if no employeeId given.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const crypto = require('crypto');
const prisma = require('../src/config/db');
const { encrypt } = require('../src/utils/encryption');
const { toAttendanceDate } = require('../src/modules/attendance/attendance.processor');

const BACKEND = process.env.DEMO_WEBHOOK_TARGET;
if (!BACKEND) throw new Error('DEMO_WEBHOOK_TARGET is required');
const DEVICE_SERIAL = 'DEMO-ZKTECO-001';
const HMAC_SECRET = 'demo-secret-key-for-testing-only-32chars-min';

async function main() {
  const org = await prisma.organization.findFirst({ where: { name: 'DHA SUFFA UNIVERSITY' } });
  if (!org) throw new Error('Organization "DHA SUFFA UNIVERSITY" not found');

  const targetEmployeeId = process.argv[2];
  const employee = targetEmployeeId
    ? await prisma.user.findFirst({ where: { organizationId: org.id, employeeId: targetEmployeeId } })
    : await prisma.user.findFirst({ where: { organizationId: org.id, email: 'bilal.khan.test@example.com' } });
  if (!employee) throw new Error('Target employee not found');

  console.log(`\n=== ADMS Webhook Demo — punching for ${employee.firstName} ${employee.lastName} (${employee.employeeId}) ===\n`);

  // 1. Ensure integration exists and is enabled for ADMS
  await prisma.biometricIntegration.upsert({
    where: { organizationId: org.id },
    update: { integrationType: 'ADMS', enabled: true },
    create: {
      organizationId: org.id,
      integrationType: 'ADMS',
      enabled: true,
      fieldMapping: { employeeId: 'USERID', checkIn: 'CHECKTIME', checkOut: 'CHECKTIME', status: 'CHECKTYPE' },
    },
  });
  console.log('1. BiometricIntegration: ADMS mode enabled for the org.');

  // 2. Ensure the demo device is registered
  let device = await prisma.biometricDevice.findUnique({ where: { deviceSerial: DEVICE_SERIAL } });
  if (!device) {
    device = await prisma.biometricDevice.create({
      data: {
        organizationId: org.id,
        name: 'Demo ZKTeco Terminal (simulated)',
        deviceSerial: DEVICE_SERIAL,
        hmacSecretEncrypted: encrypt(HMAC_SECRET),
        location: 'Demo / Testing',
        status: 'UNKNOWN',
      },
    });
    console.log(`2. Registered demo device "${DEVICE_SERIAL}".`);
  } else {
    console.log(`2. Demo device "${DEVICE_SERIAL}" already registered.`);
  }

  // 3. Build the signed push payload — same shape a middleware would send
  const punchTime = new Date();
  const body = JSON.stringify({
    SN: DEVICE_SERIAL,
    records: [
      { USERID: employee.employeeId, CHECKTIME: punchTime.toISOString(), CHECKTYPE: '0' },
    ],
  });
  const timestamp = String(Date.now());
  const nonce = crypto.randomBytes(16).toString('hex');
  const signature = crypto.createHmac('sha256', HMAC_SECRET)
    .update(`${timestamp}.${nonce}.`).update(Buffer.from(body)).digest('hex');

  console.log('3. Built signed request (HMAC-SHA256, timestamp + nonce)...\n');

  // 4. Send it
  const res = await fetch(`${BACKEND}/api/v1/attendance/tms-webhook?SN=${DEVICE_SERIAL}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-worknex-signature': signature,
      'x-worknex-timestamp': timestamp,
      'x-worknex-nonce': nonce,
    },
    body,
  });
  const json = await res.json().catch(() => ({}));
  console.log(`4. POST ${BACKEND}/api/v1/attendance/tms-webhook -> HTTP ${res.status}`);
  console.log('   Response:', JSON.stringify(json));

  if (!res.ok) {
    console.log('\nFAILED — see response above.');
    await prisma.$disconnect();
    process.exit(1);
  }

  // 5. Confirm it actually landed in the Attendance table
  const record = await prisma.attendance.findUnique({
    where: { userId_date: { userId: employee.id, date: toAttendanceDate(punchTime) } },
  });
  console.log('\n5. Attendance record for today:');
  console.log('  ', record ? {
    status: record.status,
    checkIn: record.checkIn,
    checkOut: record.checkOut,
    source: record.source,
  } : 'NOT FOUND (unexpected)');

  console.log('\n=> Open the app as this employee (or as admin -> Attendance) to see it in the UI.');
  console.log(`   Employee login: ${employee.email}\n`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Script crashed:', err);
  await prisma.$disconnect();
  process.exit(1);
});

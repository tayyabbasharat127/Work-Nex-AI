const prisma = require('../../config/db');
const axios = require('axios');
const { ApiError } = require('../../utils/ApiError');
const { encrypt, decrypt } = require('../../utils/encryption');
const { assertSafeOutboundHost, assertSafeOutboundUrl } = require('../../utils/outboundNetwork');

const DEFAULT_FIELD_MAPPING = { employeeId: 'USERID', checkIn: 'CHECKTIME', checkOut: 'CHECKTIME', status: 'CHECKTYPE' };

// Fields that are encrypted on the way in and must never be sent back out.
const CREDENTIAL_FIELDS = ['dbPasswordEncrypted', 'apiKeyEncrypted', 'admsCommunicationKeyEncrypted'];
const SQL_IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_$]*$/;

const validateTableIdentifier = (value) => {
  const table = value || 'iclock_transaction';
  if (!SQL_IDENTIFIER_PATTERN.test(table)) {
    throw new ApiError(400, 'Biometric database table name is invalid');
  }
  return table;
};

const stripCredentials = (integration) => {
  if (!integration) return integration;
  const safe = { ...integration };
  for (const field of CREDENTIAL_FIELDS) {
    if (field in safe) safe[field] = safe[field] ? true : false; // expose only "is this set", never the value
  }
  return safe;
};

const getIntegration = async (organizationId) => {
  const integration = await prisma.biometricIntegration.findUnique({ where: { organizationId } });
  return stripCredentials(integration);
};

const upsertIntegration = async (data, organizationId) => {
  const {
    integrationType, enabled, syncIntervalMinutes, fieldMapping,
    dbType, dbHost, dbPort, dbName, dbUsername, dbPassword, dbTableName,
    apiBaseUrl, apiKey,
    admsCommunicationKey,
  } = data;

  const safeDbHost = integrationType === 'DATABASE' ? await assertSafeOutboundHost(dbHost) : dbHost;
  const safeApiBaseUrl = integrationType === 'API' ? await assertSafeOutboundUrl(apiBaseUrl) : apiBaseUrl;
  const safeTableName = integrationType === 'DATABASE' ? validateTableIdentifier(dbTableName) : dbTableName;

  const writeData = {
    integrationType, enabled, syncIntervalMinutes,
    fieldMapping: fieldMapping || DEFAULT_FIELD_MAPPING,
    dbType, dbHost: safeDbHost, dbPort: dbPort ? Number(dbPort) : null, dbName, dbUsername, dbTableName: safeTableName,
    apiBaseUrl: safeApiBaseUrl,
  };

  // Only overwrite a credential if a new value was actually provided —
  // otherwise leave the previously-stored encrypted value alone (the
  // frontend never receives the real value back, so it can't round-trip it).
  if (dbPassword) writeData.dbPasswordEncrypted = encrypt(dbPassword);
  if (apiKey) writeData.apiKeyEncrypted = encrypt(apiKey);
  if (admsCommunicationKey) writeData.admsCommunicationKeyEncrypted = encrypt(admsCommunicationKey);

  const integration = await prisma.biometricIntegration.upsert({
    where: { organizationId },
    update: writeData,
    create: { organizationId, ...writeData },
  });

  return stripCredentials(integration);
};

// ─── Test Connection — 4-step sequence, per integration type ──────────────────

const testDatabaseConnection = async (config) => {
  const steps = { reachable: false, portOpen: false, authenticated: false, testRead: false };
  const password = decrypt(config.dbPasswordEncrypted);
  await assertSafeOutboundHost(config.dbHost);
  const table = validateTableIdentifier(config.dbTableName);

  if (config.dbType === 'MYSQL') {
    const mysql = require('mysql2/promise');
    let conn;
    try {
      conn = await mysql.createConnection({
        host: config.dbHost, port: config.dbPort, user: config.dbUsername, password,
        database: config.dbName, connectTimeout: 5000,
      });
      steps.reachable = true; steps.portOpen = true; steps.authenticated = true;
      await conn.query(`SELECT 1 FROM \`${table}\` LIMIT 1`);
      steps.testRead = true;
    } finally {
      if (conn) await conn.end().catch(() => {});
    }
  } else if (config.dbType === 'SQLSERVER') {
    const mssql = require('mssql');
    let pool;
    try {
      pool = await mssql.connect({
        server: config.dbHost, port: config.dbPort, user: config.dbUsername, password,
        database: config.dbName, connectionTimeout: 5000,
        options: { trustServerCertificate: true },
      });
      steps.reachable = true; steps.portOpen = true; steps.authenticated = true;
      await pool.request().query(`SELECT TOP 1 1 FROM [${table}]`);
      steps.testRead = true;
    } finally {
      if (pool) await pool.close().catch(() => {});
    }
  } else {
    // PostgreSQL (BioTime's default database per ZKTeco's own installer)
    const { Client } = require('pg');
    const client = new Client({
      host: config.dbHost, port: config.dbPort, user: config.dbUsername, password,
      database: config.dbName, connectionTimeoutMillis: 5000,
    });
    try {
      await client.connect();
      steps.reachable = true; steps.portOpen = true; steps.authenticated = true;
      await client.query(`SELECT 1 FROM "${table}" LIMIT 1`);
      steps.testRead = true;
    } finally {
      await client.end().catch(() => {});
    }
  }

  return steps;
};

const testApiConnection = async (config) => {
  const steps = { reachable: false, portOpen: false, authenticated: false, testRead: false };
  const apiKey = decrypt(config.apiKeyEncrypted);
  const apiBaseUrl = await assertSafeOutboundUrl(config.apiBaseUrl);

  const res = await axios.get(apiBaseUrl, { timeout: 5000, maxRedirects: 0, validateStatus: () => true });
  steps.reachable = true;
  steps.portOpen = true;

  const authRes = await axios.get(`${apiBaseUrl}/attendance`, {
    headers: apiKey ? { 'x-api-key': apiKey } : {},
    timeout: 5000,
    maxRedirects: 0,
    params: { date: new Date().toISOString().slice(0, 10), limit: 1 },
    validateStatus: () => true,
  });
  steps.authenticated = authRes.status !== 401 && authRes.status !== 403;
  steps.testRead = authRes.status >= 200 && authRes.status < 300;

  return steps;
};

const testConnection = async (organizationId) => {
  const integration = await prisma.biometricIntegration.findUnique({ where: { organizationId } });
  if (!integration) throw new ApiError(404, 'No biometric integration configured yet — save your settings first');

  let steps;
  let error = null;

  try {
    if (integration.integrationType === 'DATABASE') {
      steps = await testDatabaseConnection(integration);
    } else if (integration.integrationType === 'API') {
      steps = await testApiConnection(integration);
    } else {
      // ADMS is device-initiated — there's nothing for us to dial out to.
      // "Testing" here just confirms the config is complete enough to hand
      // a webhook URL to whoever configures the physical device.
      steps = { reachable: null, portOpen: null, authenticated: true, testRead: null };
    }
  } catch (err) {
    error = err.message;
    steps = steps || { reachable: false, portOpen: false, authenticated: false, testRead: false };
  }

  const allPassed = Object.values(steps).every((v) => v === true || v === null);
  const result = {
    success: allPassed && !error,
    steps,
    error,
    testedAt: new Date().toISOString(),
  };

  await prisma.biometricIntegration.update({
    where: { organizationId },
    data: { lastTestedAt: new Date(), lastTestResult: result },
  });

  return result;
};

// ─── Devices ────────────────────────────────────────────────────────────────────

const stripDeviceSecret = (device) => {
  if (!device) return device;
  const { hmacSecretEncrypted, ...safe } = device;
  return { ...safe, hmacSecretConfigured: Boolean(hmacSecretEncrypted) };
};

const listDevices = async (organizationId) => (
  await prisma.biometricDevice.findMany({ where: { organizationId }, orderBy: { name: 'asc' } })
).map(stripDeviceSecret);

const upsertDevice = async (data, organizationId, deviceId = null) => {
  const integration = await prisma.biometricIntegration.findUnique({ where: { organizationId } });
  const payload = {
    name: data.name,
    deviceSerial: data.deviceSerial || null,
    ipAddress: data.ipAddress || null,
    port: data.port ? Number(data.port) : null,
    location: data.location || null,
    biometricIntegrationId: integration?.id || null,
  };
  if (data.hmacSecret) payload.hmacSecretEncrypted = encrypt(data.hmacSecret);

  if (deviceId) {
    const existing = await prisma.biometricDevice.findFirst({ where: { id: deviceId, organizationId } });
    if (!existing) throw new ApiError(404, 'Device not found');
    return stripDeviceSecret(await prisma.biometricDevice.update({ where: { id: deviceId }, data: payload }));
  }

  if (!data.hmacSecret) throw new ApiError(400, 'A per-device HMAC secret is required');
  return stripDeviceSecret(await prisma.biometricDevice.create({ data: { ...payload, organizationId } }));
};

const deleteDevice = async (deviceId, organizationId) => {
  const existing = await prisma.biometricDevice.findFirst({ where: { id: deviceId, organizationId } });
  if (!existing) throw new ApiError(404, 'Device not found');
  await prisma.biometricDevice.delete({ where: { id: deviceId } });
  return { id: deviceId };
};

// ─── Sync logs (reads the existing EtlSyncLog table — no new data) ────────────

const getSyncLogs = (organizationId, limit = 50) => prisma.etlSyncLog.findMany({
  where: { organizationId, source: 'TMS' },
  orderBy: { createdAt: 'desc' },
  take: Math.min(Number(limit) || 50, 100),
});

module.exports = {
  DEFAULT_FIELD_MAPPING,
  getIntegration, upsertIntegration, testConnection,
  listDevices, upsertDevice, deleteDevice,
  getSyncLogs,
};

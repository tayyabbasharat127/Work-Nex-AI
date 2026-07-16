/**
 * TMS attendance provider — biometric/device sync (currently: mock
 * fallback + generic HTTP/SFTP via tms.real.service.js; ZKTeco adapter is
 * a future addition behind this same interface).
 *
 * Fetches raw punches from whichever transport is configured, matches each
 * to a user by employeeId (org-scoped), and hands normalized records to the
 * processor. Devices/vendors don't know about "check-in vs check-out" — the
 * processor's upsert-by-(userId, date) key is what prevents duplicates.
 */

const axios = require('axios');
const prisma = require('../../../config/db');
const { config } = require('../../../config/env');
const { ApiError } = require('../../../utils/ApiError');
const { getOrganizationScope } = require('../../../utils/tenant');
const { decrypt } = require('../../../utils/encryption');
const processor = require('../attendance.processor');

const ATTENDANCE_SOURCE = { TMS: 'TMS_SYNC' };

// Applies the org's configured field mapping (e.g. USERID -> employeeId) to
// a raw row from a Database/API source, falling back to the WorkNex-native
// field names if no mapping is configured for a given field.
const applyFieldMapping = (rawRow, fieldMapping = {}) => {
  const get = (field, fallback) => rawRow[fieldMapping[field] || fallback] ?? rawRow[fallback];
  return {
    employeeId: get('employeeId', 'employeeId'),
    checkIn: get('checkIn', 'checkIn'),
    checkOut: get('checkOut', 'checkOut'),
    status: get('status', 'status'),
    date: rawRow.date,
  };
};

const fetchFromDatabaseIntegration = async (config) => {
  const password = decrypt(config.dbPasswordEncrypted);
  const table = config.dbTableName || 'iclock_transaction';
  let rows = [];

  if (config.dbType === 'MYSQL') {
    const mysql = require('mysql2/promise');
    const conn = await mysql.createConnection({
      host: config.dbHost, port: config.dbPort, user: config.dbUsername, password,
      database: config.dbName, connectTimeout: 8000,
    });
    try {
      const [result] = await conn.query(`SELECT * FROM \`${table}\` ORDER BY 1 DESC LIMIT 2000`);
      rows = result;
    } finally {
      await conn.end().catch(() => {});
    }
  } else if (config.dbType === 'SQLSERVER') {
    const mssql = require('mssql');
    const pool = await mssql.connect({
      server: config.dbHost, port: config.dbPort, user: config.dbUsername, password,
      database: config.dbName, connectionTimeout: 8000,
      options: { trustServerCertificate: true },
    });
    try {
      const result = await pool.request().query(`SELECT TOP 2000 * FROM [${table}]`);
      rows = result.recordset;
    } finally {
      await pool.close().catch(() => {});
    }
  } else {
    const { Client } = require('pg');
    const client = new Client({
      host: config.dbHost, port: config.dbPort, user: config.dbUsername, password,
      database: config.dbName, connectionTimeoutMillis: 8000,
    });
    try {
      await client.connect();
      const result = await client.query(`SELECT * FROM "${table}" LIMIT 2000`);
      rows = result.rows;
    } finally {
      await client.end().catch(() => {});
    }
  }

  return rows.map((row) => applyFieldMapping(row, config.fieldMapping));
};

const fetchFromApiIntegration = async (config) => {
  const apiKey = decrypt(config.apiKeyEncrypted);
  const response = await axios.get(`${config.apiBaseUrl}/attendance`, {
    headers: apiKey ? { 'x-api-key': apiKey } : {},
    timeout: 10000,
  });
  const rawRecords = response.data?.records || response.data?.data || [];
  return rawRecords.map((row) => applyFieldMapping(row, config.fieldMapping));
};

const buildMockTmsRecords = async (date, requestingUser) => {
  const users = await prisma.user.findMany({
    where: { isActive: true, customRole: { tier: { in: ['EMPLOYEE', 'MANAGER', 'ADMIN'] } }, ...getOrganizationScope(requestingUser) },
    select: { employeeId: true },
    orderBy: { employeeId: 'asc' },
  });
  const dateStr = processor.formatAttendanceDate(date);

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
      status: processor.computeCheckInStatus(checkIn),
    };
  });
};

const fetchRawRecords = async (syncDate, requestingUser) => {
  const dateStr = processor.formatAttendanceDate(syncDate);

  // Prefer the org's admin-configured integration (Biometric Integration
  // module) over env-var config — this is what lets an admin connect a
  // real device from the UI with no redeploy. Falls through to the legacy
  // env-based paths below if nothing is configured/enabled for this org.
  if (requestingUser?.organizationId) {
    const integration = await prisma.biometricIntegration.findUnique({
      where: { organizationId: requestingUser.organizationId },
    });
    if (integration?.enabled && integration.integrationType === 'DATABASE') {
      const records = await fetchFromDatabaseIntegration(integration);
      return { records, mode: 'db-integration' };
    }
    if (integration?.enabled && integration.integrationType === 'API') {
      const records = await fetchFromApiIntegration(integration);
      return { records, mode: 'api-integration' };
    }
    // ADMS has no outbound fetch — a real implementation would read punches
    // a webhook receiver already wrote to the DB; not built yet (see plan).
  }

  if (config.tms.enabled) {
    // Full real TMS service (retry backoff + SFTP fallback + normalisation)
    const tmsReal = require('../tms.real.service');
    const tmsResult = await tmsReal.fetchAttendance(dateStr);
    return { records: tmsResult.records || [], mode: tmsResult.source || 'real-tms' };
  }

  return { records: await buildMockTmsRecords(syncDate, requestingUser), mode: 'demo-fallback' };
};

const syncFromTMS = async (date, requestingUser = null) => {
  const syncDate = processor.toAttendanceDate(date || new Date());
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
    const { records, mode } = await fetchRawRecords(syncDate, requestingUser);

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

        const recDate = processor.toAttendanceDate(rec.date || syncDate);
        const checkIn = rec.checkIn ? new Date(rec.checkIn) : null;
        const checkOut = rec.checkOut ? new Date(rec.checkOut) : null;

        await processor.processRecord({
          userId: user.id,
          organizationId: user.organizationId,
          date: recDate,
          checkIn,
          checkOut,
          status: rec.status,
          source: ATTENDANCE_SOURCE.TMS,
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

module.exports = { syncFromTMS };

/**
 * WorkNex AI — Real TMS Integration Service
 *
 * Supports two transport modes chosen by env vars:
 *   TMS_MODE=HTTP   — polls a REST endpoint (Zkteco, BioTime, custom)
 *   TMS_MODE=SFTP   — downloads a daily CSV/XML from an SFTP share
 *
 * Environment variables:
 *   TMS_MODE           HTTP | SFTP          (default: HTTP)
 *   TMS_API_URL        Base URL of the TMS REST API
 *   TMS_API_KEY        API key (sent as X-Api-Key header)
 *   TMS_API_USER       Basic-auth username (optional)
 *   TMS_API_PASS       Basic-auth password (optional)
 *   TMS_TIMEOUT_MS     Request timeout      (default: 10000)
 *   TMS_RETRY_COUNT    Max HTTP retries     (default: 3)
 *   TMS_SFTP_HOST      SFTP hostname
 *   TMS_SFTP_PORT      SFTP port            (default: 22)
 *   TMS_SFTP_USER      SFTP username
 *   TMS_SFTP_PASS      SFTP password
 *   TMS_SFTP_PATH      Remote path to CSV   (default: /attendance)
 *   TMS_LATE_CUTOFF_H  Hour (0-23) after which check-in is "late" (default: 9)
 *
 * Returns: Promise<{ date, records: [{employeeId, checkIn, checkOut, status}] }>
 *
 * Record normalisation ensures status is one of: PRESENT | LATE | ABSENT
 *
 * Fallback chain: HTTP → SFTP → error (caller decides what to do)
 */

'use strict';

const axios = require('axios');
const logger = require('../../config/logger');

const TMS_MODE         = (process.env.TMS_MODE   || 'HTTP').toUpperCase();
const TMS_API_URL      = process.env.TMS_API_URL  || '';
const TMS_API_KEY      = process.env.TMS_API_KEY  || '';
const TMS_TIMEOUT_MS   = parseInt(process.env.TMS_TIMEOUT_MS  || '10000', 10);
const TMS_RETRY_COUNT  = parseInt(process.env.TMS_RETRY_COUNT || '3',     10);
const TMS_LATE_CUTOFF  = parseInt(process.env.TMS_LATE_CUTOFF_H || '9',   10);

// ─── HTTP transport ────────────────────────────────────────────────────────────

async function _httpHeaders() {
  const h = { 'Accept': 'application/json', 'X-Api-Key': TMS_API_KEY };
  if (process.env.TMS_API_USER && process.env.TMS_API_PASS) {
    const creds = Buffer.from(`${process.env.TMS_API_USER}:${process.env.TMS_API_PASS}`).toString('base64');
    h['Authorization'] = `Basic ${creds}`;
  }
  return h;
}

async function _fetchHTTP(dateStr, attempt = 1) {
  if (!TMS_API_URL) throw new Error('TMS_API_URL not configured');

  try {
    const resp = await axios.get(`${TMS_API_URL}/attendance`, {
      headers: await _httpHeaders(),
      params:  { date: dateStr },
      timeout: TMS_TIMEOUT_MS,
    });

    return _normalise(dateStr, resp.data);
  } catch (err) {
    if (attempt < TMS_RETRY_COUNT && err.response?.status >= 500) {
      const delay = attempt * 1500;
      logger.warn(`[TMS] HTTP attempt ${attempt} failed — retrying in ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
      return _fetchHTTP(dateStr, attempt + 1);
    }
    throw err;
  }
}

// ─── SFTP transport ────────────────────────────────────────────────────────────

async function _fetchSFTP(dateStr) {
  let Client;
  try {
    // ssh2-sftp-client is an optional peer dependency
    Client = require('ssh2-sftp-client');
  } catch {
    throw new Error('ssh2-sftp-client not installed. Run: npm install ssh2-sftp-client');
  }

  const sftp = new Client();
  await sftp.connect({
    host:       process.env.TMS_SFTP_HOST,
    port:       parseInt(process.env.TMS_SFTP_PORT || '22', 10),
    username:   process.env.TMS_SFTP_USER,
    password:   process.env.TMS_SFTP_PASS,
    readyTimeout: TMS_TIMEOUT_MS,
  });

  try {
    const remotePath = `${(process.env.TMS_SFTP_PATH || '/attendance').replace(/\/$/, '')}/${dateStr}.csv`;
    const buffer     = await sftp.get(remotePath);
    const csv        = buffer.toString('utf8');
    return _parseSFTPcsv(dateStr, csv);
  } finally {
    await sftp.end();
  }
}

function _parseSFTPcsv(dateStr, csv) {
  const lines   = csv.split('\n').filter(Boolean);
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const records = [];

  for (const line of lines.slice(1)) {
    const cols = line.split(',').map(c => c.trim());
    const row  = Object.fromEntries(headers.map((h, i) => [h, cols[i] ?? '']));

    records.push({
      employeeId: row['employeeid'] || row['employee_id'] || row['emp_id'],
      checkIn:    row['checkin']    || row['check_in']    || null,
      checkOut:   row['checkout']   || row['check_out']   || null,
      status:     row['status']?.toUpperCase()            || null,
    });
  }

  return _normalise(dateStr, { records });
}

// ─── Normalisation ─────────────────────────────────────────────────────────────

function _normalise(dateStr, payload) {
  // Handle multiple TMS response shapes
  const raw = payload?.records
    ?? payload?.data?.records
    ?? payload?.attendance
    ?? payload?.data
    ?? [];

  const cutoff = `${String(TMS_LATE_CUTOFF).padStart(2, '0')}:00`;

  const records = raw.map(r => {
    const checkIn  = r.checkIn  || r.check_in  || r.CheckIn  || null;
    const checkOut = r.checkOut || r.check_out || r.CheckOut || null;
    const empId    = r.employeeId || r.employee_id || r.EmployeeID || r.empId;

    let status = (r.status || r.Status || '').toUpperCase();

    if (!status && !checkIn) {
      status = 'ABSENT';
    } else if (!status && checkIn) {
      const timeStr = checkIn.length > 10 ? checkIn.slice(11, 16) : '';
      status = timeStr && timeStr > cutoff ? 'LATE' : 'PRESENT';
    }

    // Sanitise status to known enum values
    if (!['PRESENT', 'LATE', 'ABSENT'].includes(status)) status = 'PRESENT';

    return { employeeId: empId, checkIn, checkOut, status };
  });

  return { date: dateStr, total: records.length, records };
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetch attendance records from the real TMS for a given date.
 * @param {string} dateStr   YYYY-MM-DD
 * @returns {{ date, total, records: Array<{employeeId, checkIn, checkOut, status}> }}
 */
async function fetchAttendance(dateStr) {
  logger.info(`[TMS] Fetching attendance for ${dateStr} via ${TMS_MODE}`);

  if (TMS_MODE === 'SFTP') {
    return _fetchSFTP(dateStr);
  }

  // Default HTTP — with SFTP as fallback if TMS_SFTP_HOST is set
  try {
    return await _fetchHTTP(dateStr);
  } catch (err) {
    if (process.env.TMS_SFTP_HOST) {
      logger.warn('[TMS] HTTP failed, falling back to SFTP:', err.message);
      return _fetchSFTP(dateStr);
    }
    throw err;
  }
}

/**
 * Check whether TMS connectivity is working.
 * @returns {{ ok: boolean, mode: string, latency?: number, error?: string }}
 */
async function healthCheck() {
  const start = Date.now();
  try {
    if (!TMS_API_URL && TMS_MODE === 'HTTP') {
      return { ok: false, mode: TMS_MODE, error: 'TMS_API_URL not configured' };
    }
    const today = new Date().toISOString().slice(0, 10);
    await fetchAttendance(today);
    return { ok: true, mode: TMS_MODE, latency: Date.now() - start };
  } catch (err) {
    return { ok: false, mode: TMS_MODE, error: err.message };
  }
}

module.exports = { fetchAttendance, healthCheck };

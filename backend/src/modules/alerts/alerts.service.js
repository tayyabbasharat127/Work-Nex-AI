/**
 * WorkNex AI — Real-Time Anomaly Alert Service
 *
 * Architecture:
 *   • Clients connect via SSE: GET /api/alerts/stream
 *   • Background polling loop calls AI service /detect/anomalies every N minutes
 *   • New anomalies are pushed to all connected SSE clients for the same org
 *   • Anomalies are persisted in DB so clients can catch up on reconnect
 *
 * Alert types emitted: HIGH_ABSENCE_RATE | UNUSUAL_LATE_SPIKE | EARLY_CHECKOUT_PATTERN
 *                      OVERTIME_ANOMALY  | LEAVE_SURGE        | BIOMETRIC_MISMATCH
 */

'use strict';

const axios  = require('axios');
const prisma = require('../../config/db');
const logger = require('../../config/logger');
const { config } = require('../../config/env');

const AI_SERVICE_URL     = config.aiServiceUrl;
const ALERT_TIMEOUT_MS   = 8000;
const { aiServiceHeaders } = require('../../utils/aiServiceAuth');

// Map of orgId → Set<res> (SSE response streams)
const _clients = new Map();

// ─── SSE client management ─────────────────────────────────────────────────────

function registerClient(orgId, res) {
  if (!_clients.has(orgId)) _clients.set(orgId, new Set());
  _clients.get(orgId).add(res);
  logger.info(`[Alerts] SSE client registered for org ${orgId}. Total: ${_clients.get(orgId).size}`);

  // Start poller if first client
}

function unregisterClient(orgId, res) {
  const set = _clients.get(orgId);
  if (set) {
    set.delete(res);
    if (set.size === 0) _clients.delete(orgId);
  }
  // Stop poller if no clients left
  logger.info(`[Alerts] SSE client disconnected from org ${orgId}`);
}

function _broadcast(orgId, event) {
  const set = _clients.get(orgId);
  if (!set || set.size === 0) return;

  const payload = `data: ${JSON.stringify(event)}\n\n`;
  const dead    = [];

  for (const res of set) {
    try {
      res.write(payload);
    } catch {
      dead.push(res);
    }
  }

  for (const res of dead) {
    set.delete(res);
  }
}

// ─── Polling loop ──────────────────────────────────────────────────────────────

async function _pollOrg(orgId) {
  if (!AI_SERVICE_URL) {
    logger.warn('[Alerts] Scan skipped because AI_SERVICE_URL is not configured');
    return;
  }
  const today = new Date().toISOString().slice(0, 10);
  let anomalies;

  try {
    const resp = await axios.post(
      `${AI_SERVICE_URL}/detect/anomalies`,
      { organizationId: orgId, date: today },
      { headers: aiServiceHeaders(orgId), timeout: ALERT_TIMEOUT_MS },
    );
    anomalies = resp.data?.anomalies ?? resp.data ?? [];
  } catch (err) {
    logger.warn(`[Alerts] AI service unreachable for org ${orgId}: ${err.message}`);
    return;
  }

  for (const anomaly of anomalies) {
    await _handleAnomaly(orgId, anomaly);
  }
}

async function _handleAnomaly(orgId, anomaly) {
  // Deduplicate: skip if same type already fired today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const existing = await prisma.auditLog.findFirst({
      where: {
        organizationId: orgId,
        entity:         'ANOMALY_ALERT',
        action:         'CREATE',
        createdAt:      { gte: today },
        newValues:      { path: ['type'], equals: anomaly.type },
      },
    });

    if (existing) return; // already fired today

    // Persist
    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        action:         'CREATE',
        entity:         'ANOMALY_ALERT',
        newValues:      {
          type:        anomaly.type,
          severity:    anomaly.severity,
          description: anomaly.description,
          affectedIds: anomaly.affectedEmployeeIds ?? [],
          score:       anomaly.score ?? null,
          timestamp:   new Date().toISOString(),
        },
      },
    });

    // Push to SSE clients
    _broadcast(orgId, {
      type:      'ANOMALY_ALERT',
      alertType: anomaly.type,
      severity:  anomaly.severity ?? 'MEDIUM',
      message:   anomaly.description,
      score:     anomaly.score,
      timestamp: new Date().toISOString(),
    });

    logger.info(`[Alerts] Fired ${anomaly.type} for org ${orgId}`);
  } catch (err) {
    logger.error(`[Alerts] Failed to persist alert: ${err.message}`);
  }
}

// ─── Catchup for reconnecting clients ─────────────────────────────────────────

async function getRecentAlerts(orgId, hours = 24) {
  const since = new Date(Date.now() - hours * 3600 * 1000);

  const logs = await prisma.auditLog.findMany({
    where: {
      organizationId: orgId,
      entity:         'ANOMALY_ALERT',
      action:         'CREATE',
      createdAt:      { gte: since },
    },
    orderBy: { createdAt: 'desc' },
    take:    50,
  });

  return logs.map(l => ({
    id:        l.id,
    alertType: l.newValues?.type,
    severity:  l.newValues?.severity,
    message:   l.newValues?.description,
    score:     l.newValues?.score,
    timestamp: l.createdAt,
  }));
}

// ─── Manual trigger ────────────────────────────────────────────────────────────

async function triggerScan(orgId) {
  await _pollOrg(orgId);
  return getRecentAlerts(orgId, 1);
}

module.exports = { registerClient, unregisterClient, getRecentAlerts, triggerScan };

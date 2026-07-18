'use strict';

const alertsService = require('./alerts.service');

/**
 * GET /api/v1/alerts/stream
 * SSE endpoint — clients keep this connection open for real-time alerts.
 */
async function streamAlerts(req, res) {
  const orgId = req.user.organizationId;

  res.setHeader('Content-Type',      'text/event-stream');
  res.setHeader('Cache-Control',     'no-cache');
  res.setHeader('Connection',        'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', orgId, timestamp: new Date().toISOString() })}\n\n`);

  // Catchup: send last 24 h of alerts
  try {
    const recent = await alertsService.getRecentAlerts(orgId);
    if (recent.length > 0) {
      res.write(`data: ${JSON.stringify({ type: 'CATCHUP', alerts: recent })}\n\n`);
    }
  } catch { /* non-critical */ }

  const ping = setInterval(() => {
    try { res.write(': ping\n\n'); } catch { /* client gone */ }
  }, 30_000);

  alertsService.registerClient(orgId, res);

  req.on('close', () => {
    clearInterval(ping);
    alertsService.unregisterClient(orgId, res);
  });
}

/**
 * GET /api/v1/alerts/recent
 */
async function getRecentAlerts(req, res) {
  const orgId = req.user.organizationId;
  const hours = parseInt(req.query.hours || '24', 10);
  const alerts = await alertsService.getRecentAlerts(orgId, hours);
  res.json({ success: true, data: alerts, count: alerts.length });
}

/**
 * POST /api/v1/alerts/scan
 */
async function triggerScan(req, res) {
  const orgId = req.user.organizationId;
  const alerts = await alertsService.triggerScan(orgId);
  res.json({ success: true, data: alerts, count: alerts.length });
}

module.exports = { streamAlerts, getRecentAlerts, triggerScan };

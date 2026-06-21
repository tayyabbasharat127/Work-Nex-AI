'use strict';

const router     = require('express').Router();
const { streamAlerts, getRecentAlerts, triggerScan } = require('./alerts.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

router.use(authenticate);

// SSE stream — any authenticated user sees alerts for their org
router.get('/stream', streamAlerts);

// Recent alerts — any authenticated user
router.get('/recent', getRecentAlerts);

// Manual scan — admins and managers only
router.post('/scan', authorize('ADMIN', 'MANAGER', 'SUPER_ADMIN'), triggerScan);

module.exports = router;

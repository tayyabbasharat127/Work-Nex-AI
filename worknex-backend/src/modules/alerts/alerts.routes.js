'use strict';

const router     = require('express').Router();
const { streamAlerts, getRecentAlerts, triggerScan } = require('./alerts.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { query } = require('express-validator');
const { validate } = require('../../middleware/validate.middleware');

router.use(authenticate);
router.use(authorize('ADMIN', 'MANAGER', 'SUPER_ADMIN'));

// SSE stream — any authenticated user sees alerts for their org
router.get('/stream', streamAlerts);

// Recent alerts — any authenticated user
router.get('/recent', [query('hours').optional().isInt({ min: 1, max: 720 })], validate, getRecentAlerts);

// Manual scan — admins and managers only
router.post('/scan', triggerScan);

module.exports = router;

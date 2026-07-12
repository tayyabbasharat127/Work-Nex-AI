const express = require('express');
const router = express.Router();

router.use('/billing', require('../modules/billing/billing.routes'));
router.use('/auth', require('../modules/auth/auth.routes'));
router.use('/users', require('../modules/users/users.routes'));
router.use('/roles', require('../modules/roles/roles.routes'));
router.use('/biometric', require('../modules/biometric/biometric.routes'));
router.use('/attendance', require('../modules/attendance/attendance.routes'));
router.use('/leave', require('../modules/leave/leave.routes'));
router.use('/notifications', require('../modules/notifications/notification.routes'));
router.use('/analytics', require('../modules/analytics/analytics.routes'));
router.use('/performance', require('../modules/performance/performance.routes'));
router.use('/ai', require('../modules/ai/ai.routes'));
router.use('/reports', require('../modules/reports/reports.routes'));
router.use('/settings', require('../modules/settings/settings.routes'));
router.use('/alerts',   require('../modules/alerts/alerts.routes'));

module.exports = router;

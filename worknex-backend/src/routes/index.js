const express = require('express');
const router = express.Router();

router.use('/billing', require('../modules/billing/billing.routes'));
router.use('/auth', require('../modules/auth/auth.routes'));
router.use('/users', require('../modules/users/users.routes'));
router.use('/attendance', require('../modules/attendance/attendance.routes'));
router.use('/leave', require('../modules/leave/leave.routes'));
router.use('/notifications', require('../modules/notifications/notification.routes'));
router.use('/analytics', require('../modules/analytics/analytics.routes'));
router.use('/performance', require('../modules/performance/performance.routes'));
router.use('/ai', require('../modules/ai/ai.routes'));

module.exports = router;

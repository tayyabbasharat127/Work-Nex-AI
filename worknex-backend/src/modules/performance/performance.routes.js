const express = require('express');
const router = express.Router();
const performanceController = require('./performance.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

router.use(authenticate);

router.get('/me', performanceController.getMyPerformance);
router.get('/user/:userId', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), performanceController.getUserPerformance);
router.get('/team', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), performanceController.getTeamPerformance);
router.get('/leaderboard', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), performanceController.getLeaderboard);

module.exports = router;

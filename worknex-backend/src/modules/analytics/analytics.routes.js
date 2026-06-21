const express = require('express');
const router = express.Router();
const analyticsController = require('./analytics.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

router.use(authenticate);
router.use(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'));

// Dashboard KPIs
router.get('/dashboard', analyticsController.getDashboardKPIs);

// Attendance analytics
router.get('/attendance/trends', analyticsController.getAttendanceTrends);
router.get('/attendance/heatmap', analyticsController.getAttendanceHeatmap);
router.get('/attendance/department', analyticsController.getDepartmentAttendance);

// Leave analytics
router.get('/leave/summary', analyticsController.getLeaveSummary);
router.get('/leave/trends', analyticsController.getLeaveTrends);
router.get('/leave/by-type', analyticsController.getLeaveByType);

// Workforce analytics
router.get('/workforce/headcount', analyticsController.getHeadcount);
router.get('/workforce/turnover', analyticsController.getTurnoverRate);

// Attrition analytics
router.get('/attrition', analyticsController.getAttritionAnalytics);

// Performance analytics
router.get('/performance/leaderboard', analyticsController.getPerformanceLeaderboard);
router.get('/performance/team', authorize('ADMIN', 'MANAGER', 'SUPER_ADMIN'), analyticsController.getTeamPerformance);

// Power BI — service-principal token (no RLS)
router.get('/powerbi/token', authorize('SUPER_ADMIN', 'ADMIN'), analyticsController.getPowerBIToken);
// Power BI — per-user embed token with RLS identity
router.get('/powerbi/embed-token', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), analyticsController.getPowerBIEmbedToken);
// Power BI — push WorkNex data rows into the push dataset
router.post('/powerbi/push-data', authorize('SUPER_ADMIN', 'ADMIN'), analyticsController.pushDataToPowerBI);

// ETL
router.post('/etl/run', authorize('SUPER_ADMIN', 'ADMIN'), analyticsController.runETL);
router.get('/etl/logs', authorize('SUPER_ADMIN', 'ADMIN'), analyticsController.getEtlLogs);
router.get('/audit/logs', authorize('SUPER_ADMIN', 'ADMIN'), analyticsController.getAuditLogs);

module.exports = router;

const express = require('express');
const router = express.Router();
const analyticsController = require('./analytics.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { body, query } = require('express-validator');
const { validate } = require('../../middleware/validate.middleware');

const year = query('year').optional().isInt({ min: 2000, max: 2200 });
const month = query('month').optional().isInt({ min: 1, max: 12 });

router.use(authenticate);
router.use(authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'));

// Dashboard KPIs
router.get('/dashboard', analyticsController.getDashboardKPIs);

// Attendance analytics
router.get('/attendance/trends', year, month, validate, analyticsController.getAttendanceTrends);
router.get('/attendance/heatmap', query('userId').optional().isUUID(), year, validate, analyticsController.getAttendanceHeatmap);
router.get('/attendance/department', year, month, validate, analyticsController.getDepartmentAttendance);

// Leave analytics
router.get('/leave/summary', year, validate, analyticsController.getLeaveSummary);
router.get('/leave/trends', year, validate, analyticsController.getLeaveTrends);
router.get('/leave/by-type', year, validate, analyticsController.getLeaveByType);

// Workforce analytics
router.get('/workforce/headcount', analyticsController.getHeadcount);
router.get('/workforce/turnover', year, validate, analyticsController.getTurnoverRate);

// Attrition analytics
router.get('/attrition', year, month, validate, analyticsController.getAttritionAnalytics);

// Performance analytics
router.get('/performance/leaderboard', year, month, query('limit').optional().isInt({ min: 1, max: 100 }), validate, analyticsController.getPerformanceLeaderboard);
router.get('/performance/team', authorize('ADMIN', 'MANAGER', 'SUPER_ADMIN'), year, month, validate, analyticsController.getTeamPerformance);

// Power BI — service-principal token (no RLS) — SUPER_ADMIN only (exposes raw AAD token)
router.get('/powerbi/token', authorize('SUPER_ADMIN'), analyticsController.getPowerBIToken);
// Power BI — per-user embed token with RLS identity
router.get('/powerbi/embed-token', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), analyticsController.getPowerBIEmbedToken);
// Power BI — push WorkNex data rows into the push dataset
router.post('/powerbi/push-data', authorize('SUPER_ADMIN', 'ADMIN'), analyticsController.pushDataToPowerBI);

// ETL
router.post('/etl/run', authorize('SUPER_ADMIN', 'ADMIN'), body('year').isInt({ min: 2000, max: 2200 }), body('month').isInt({ min: 1, max: 12 }), validate, analyticsController.runETL);
router.get('/etl/logs', authorize('SUPER_ADMIN', 'ADMIN'), analyticsController.getEtlLogs);
router.get('/audit/logs', authorize('SUPER_ADMIN', 'ADMIN'), query('limit').optional().isInt({ min: 1, max: 1000 }), validate, analyticsController.getAuditLogs);

module.exports = router;

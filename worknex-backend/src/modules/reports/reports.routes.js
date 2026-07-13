const express = require('express');
const router = express.Router();
const reportsController = require('./reports.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { body, query } = require('express-validator');
const { validate } = require('../../middleware/validate.middleware');

const REPORT_TYPES = ['attendance', 'leave', 'performance', 'department'];
const reportQueryValidation = [
  query('type').optional().isIn(REPORT_TYPES),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('limit').optional().isInt({ min: 1, max: 1000 }),
  query('month').optional().isInt({ min: 1, max: 12 }),
  query('year').optional().isInt({ min: 2000, max: 2200 }),
  query('organizationId').optional().isUUID(),
  query('status').optional().isString().isLength({ max: 40 }),
  query('leaveType').optional().isString().isLength({ max: 40 }),
];

router.use(authenticate);

router.get('/', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE'), reportQueryValidation, validate, reportsController.getReports);
router.post('/generate', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE'), [
  body('reportType').optional().isIn(REPORT_TYPES),
  body('type').optional().isIn(REPORT_TYPES),
  body('filters').optional().isObject(),
  body('filters.startDate').optional().isISO8601(),
  body('filters.endDate').optional().isISO8601(),
  body('filters.limit').optional().isInt({ min: 1, max: 1000 }),
  body('filters.month').optional().isInt({ min: 1, max: 12 }),
  body('filters.year').optional().isInt({ min: 2000, max: 2200 }),
  body('filters.organizationId').optional().isUUID(),
], validate, reportsController.generateReport);
router.get('/attendance', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE'), reportQueryValidation, validate, reportsController.getAttendanceReport);
router.get('/leave', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE'), reportQueryValidation, validate, reportsController.getLeaveReport);
router.get('/performance', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE'), reportQueryValidation, validate, reportsController.getPerformanceReport);
router.get('/department', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), reportQueryValidation, validate, reportsController.getDepartmentReport);
router.get('/export/csv', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE'), reportQueryValidation, validate, reportsController.exportCsv);

module.exports = router;

const express = require('express');
const router = express.Router();
const reportsController = require('./reports.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

router.use(authenticate);

router.get('/', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE'), reportsController.getReports);
router.post('/generate', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE'), reportsController.generateReport);
router.get('/attendance', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE'), reportsController.getAttendanceReport);
router.get('/leave', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE'), reportsController.getLeaveReport);
router.get('/performance', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE'), reportsController.getPerformanceReport);
router.get('/department', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), reportsController.getDepartmentReport);
router.get('/export/csv', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE'), reportsController.exportCsv);

module.exports = router;

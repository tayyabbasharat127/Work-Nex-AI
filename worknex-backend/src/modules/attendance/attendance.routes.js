const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const attendanceController = require('./attendance.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');

router.use(authenticate);

// ── Employee self-service (named routes BEFORE /:id) ──────────────────────────
router.post('/check-in',  attendanceController.checkIn);
router.post('/check-out', attendanceController.checkOut);
router.post('/ping',      attendanceController.autoPing);
router.get('/today',      attendanceController.getTodayAttendance);
router.get('/my',         attendanceController.getMyAttendance);

// ── Holidays (named, before /:id) ─────────────────────────────────────────────
router.get('/holidays',  attendanceController.getHolidays);
router.post('/holidays', authorize('SUPER_ADMIN', 'ADMIN'), attendanceController.createHoliday);

// ── TMS Sync ──────────────────────────────────────────────────────────────────
router.post('/sync/tms', authorize('SUPER_ADMIN', 'ADMIN'), attendanceController.syncFromTMS);

// ── Admin/Manager collection routes ───────────────────────────────────────────
router.get('/',         authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), attendanceController.getAllAttendance);
router.get('/summary',  authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), attendanceController.getAttendanceSummary);
router.get('/user/:userId', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), attendanceController.getUserAttendance);

// ── Manual entry & update (parameterized last) ────────────────────────────────
router.post(
  '/manual',
  authorize('SUPER_ADMIN', 'ADMIN'),
  [
    body('userId').notEmpty().withMessage('userId required'),
    body('date').isISO8601().withMessage('Valid date required'),
    body('status').isIn(['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_LEAVE', 'HOLIDAY']).withMessage('Invalid status'),
  ],
  validate,
  attendanceController.manualEntry
);

router.put('/:id', authorize('SUPER_ADMIN', 'ADMIN'), attendanceController.updateAttendance);

module.exports = router;

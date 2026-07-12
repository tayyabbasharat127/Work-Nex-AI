const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const attendanceController = require('./attendance.controller');
const { authenticate, authorize, requirePermission } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');
const rateLimit = require('express-rate-limit');
const { auditHrAccess } = require('../../middleware/audit.middleware');

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.BIOMETRIC_WEBHOOK_RATE_LIMIT || 120),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Biometric webhook rate limit exceeded' },
});

// ── Device webhook (ADMS push) — public, device-authenticated by serial
// number + optional communication key, NOT a logged-in user, so this must
// stay ahead of the authenticate() gate below. ─────────────────────────────
router.post('/tms-webhook', webhookLimiter, [
  body().custom((payload) => {
    const records = Array.isArray(payload?.records) ? payload.records : [payload];
    if (!records.length || records.length > 100) throw new Error('records must contain between 1 and 100 punches');
    if (records.some((record) => !record || typeof record !== 'object' || Array.isArray(record))) {
      throw new Error('Every biometric punch must be an object');
    }
    return true;
  }),
], validate, attendanceController.tmsWebhook);

router.use(authenticate);

// ── Employee self-service (named routes BEFORE /:id) ──────────────────────────
router.post('/check-in',  attendanceController.checkIn);
router.post('/check-out', attendanceController.checkOut);
router.post('/ping',      attendanceController.autoPing);
router.get('/today',      attendanceController.getTodayAttendance);
router.get('/my',         attendanceController.getMyAttendance);

// ── Holidays (named, before /:id) ─────────────────────────────────────────────
router.get('/holidays',  attendanceController.getHolidays);
router.post('/holidays', requirePermission('attendance:manage'), attendanceController.createHoliday);

// ── TMS Sync ──────────────────────────────────────────────────────────────────
router.post('/sync/tms', requirePermission('attendance:manage'), attendanceController.syncFromTMS);
router.post('/generate-absences', requirePermission('attendance:manage'), attendanceController.generateAbsences);

// ── Admin/Manager collection routes ───────────────────────────────────────────
router.get('/summary',  authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), auditHrAccess('AttendanceSummary'), attendanceController.getAttendanceSummary);
router.get('/user/:userId', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), auditHrAccess('Attendance'), attendanceController.getUserAttendance);
router.get('/',         authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), auditHrAccess('Attendance'), attendanceController.getAllAttendance);

// ── Manual entry & update (parameterized last) ────────────────────────────────
router.post(
  '/manual',
  requirePermission('attendance:manage'),
  [
    body('userId').notEmpty().withMessage('userId required'),
    body('date').isISO8601().withMessage('Valid date required'),
    body('status').isIn(['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_LEAVE', 'HOLIDAY']).withMessage('Invalid status'),
  ],
  validate,
  attendanceController.manualEntry
);

router.put('/:id', requirePermission('attendance:manage'), attendanceController.updateAttendance);

module.exports = router;

const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const attendanceController = require('./attendance.controller');
const { authenticate, authorize, requirePermission } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');
const rateLimit = require('express-rate-limit');
const { auditHrAccess, auditLog } = require('../../middleware/audit.middleware');
const { config } = require('../../config/env');

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: config.biometricWebhookRateLimit,
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

router.post('/university/punches', webhookLimiter, [
  query('SN').trim().notEmpty().withMessage('Registered device serial number is required'),
  body().custom((payload) => {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('Attendance punch must be an object');
    }
    const fields = Object.keys(payload).sort();
    const expected = ['CHECKINTIME', 'TYPE', 'USERID'];
    if (fields.length !== expected.length || fields.some((field, index) => field !== expected[index])) {
      throw new Error('Only USERID, CHECKINTIME and TYPE are allowed');
    }
    return true;
  }),
  body('USERID').custom((value) => {
    if (!['string', 'number'].includes(typeof value) || String(value).trim().length === 0) {
      throw new Error('USERID is required');
    }
    return true;
  }),
  body('CHECKINTIME').isISO8601({ strict: true, strictSeparator: true }).withMessage('CHECKINTIME must be a valid ISO 8601 date and time'),
  body('TYPE').isString().trim().isLength({ min: 1, max: 50 }).withMessage('TYPE is required'),
], validate, attendanceController.universityPunch);

router.use(authenticate);

// ── Employee self-service (named routes BEFORE /:id) ──────────────────────────
router.post('/check-in', [
  body('latitude').optional().isFloat({ min: -90, max: 90 }),
  body('longitude').optional().isFloat({ min: -180, max: 180 }),
], validate, attendanceController.checkIn);
router.post('/check-out', attendanceController.checkOut);
router.post('/ping',      attendanceController.autoPing);
router.get('/today',      attendanceController.getTodayAttendance);
router.get('/my', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
], validate, attendanceController.getMyAttendance);

// ── Holidays (named, before /:id) ─────────────────────────────────────────────
const holidayFields = (partial = false) => [
  partial ? body('name').optional().trim().isLength({ min: 1, max: 150 }) : body('name').trim().isLength({ min: 1, max: 150 }),
  partial ? body('date').optional().isISO8601() : body('date').isISO8601(),
  body('description').optional({ nullable: true }).isString().isLength({ max: 1000 }),
  body('isRecurring').optional().isBoolean(),
];

router.get('/holidays', query('year').optional().isInt({ min: 2000, max: 2200 }), validate, attendanceController.getHolidays);
router.post('/holidays', requirePermission('attendance:manage'), holidayFields(), validate, auditLog('Holiday', 'CREATE'), attendanceController.createHoliday);
router.put('/holidays/:id', requirePermission('attendance:manage'), [
  param('id').isUUID(),
  ...holidayFields(true),
  body().custom((value) => ['name', 'date', 'description', 'isRecurring'].some((field) => Object.prototype.hasOwnProperty.call(value, field)))
    .withMessage('At least one holiday field is required'),
], validate, auditLog('Holiday', 'UPDATE'), attendanceController.updateHoliday);
router.delete('/holidays/:id', requirePermission('attendance:manage'), param('id').isUUID(), validate, auditLog('Holiday', 'DELETE'), attendanceController.deleteHoliday);

// ── TMS Sync ──────────────────────────────────────────────────────────────────
router.post('/sync/tms', requirePermission('attendance:manage'), body('date').optional().isISO8601(), validate, attendanceController.syncFromTMS);
router.post('/generate-absences', requirePermission('attendance:manage'), body('date').optional().isISO8601(), validate, attendanceController.generateAbsences);

// ── Admin/Manager collection routes ───────────────────────────────────────────
router.get('/summary',  authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), auditHrAccess('AttendanceSummary'), attendanceController.getAttendanceSummary);
router.get('/hours-shortfall', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), auditHrAccess('AttendanceHoursShortfall'), attendanceController.getWeeklyHoursShortfall);
router.get('/user/:userId', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), auditHrAccess('Attendance'), attendanceController.getUserAttendance);
router.get('/user/:userId/punches', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), query('date').optional().isISO8601(), validate, auditHrAccess('Attendance'), attendanceController.getUserPunches);
router.get('/',         authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), auditHrAccess('Attendance'), attendanceController.getAllAttendance);

// ── Manual entry & update (parameterized last) ────────────────────────────────
router.post(
  '/manual',
  requirePermission('attendance:manage'),
  [
    body('userId').isUUID().withMessage('Valid userId required'),
    body('date').isISO8601().withMessage('Valid date required'),
    body('status').isIn(['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_LEAVE', 'HOLIDAY']).withMessage('Invalid status'),
    body('checkIn').optional({ nullable: true }).isISO8601(),
    body('checkOut').optional({ nullable: true }).isISO8601(),
    body('notes').optional({ nullable: true }).isString().isLength({ max: 2000 }),
  ],
  validate,
  attendanceController.manualEntry
);

router.put('/:id', requirePermission('attendance:manage'), [
  param('id').isUUID(),
  body('organizationId').optional().isUUID(),
  body('status').optional().isIn(['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_LEAVE', 'HOLIDAY']),
  body('checkIn').optional({ nullable: true }).isISO8601(),
  body('checkOut').optional({ nullable: true }).isISO8601(),
  body('notes').optional({ nullable: true }).isString().isLength({ max: 2000 }),
  body().custom((value) => ['status', 'checkIn', 'checkOut', 'notes'].some((field) => Object.prototype.hasOwnProperty.call(value, field)))
    .withMessage('At least one editable attendance field is required'),
], validate, attendanceController.updateAttendance);

module.exports = router;

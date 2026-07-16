const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const settingsController = require('./settings.controller');
const { authenticate, requirePermission } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');

const time = /^([01]\d|2[0-3]):[0-5]\d$/;
const settingsRules = [
  body('organizationId').optional().isString().isLength({ min: 1, max: 100 }),
  body('name').optional().isString().trim().isLength({ min: 1, max: 200 }),
  body('industry').optional({ nullable: true }).isString().isLength({ max: 100 }),
  body('country').optional().isString().isLength({ min: 2, max: 100 }),
  body('phone').optional({ nullable: true }).isString().isLength({ max: 50 }),
  body('website').optional({ nullable: true }).isURL({ protocols: ['http', 'https'], require_protocol: true }),
  body('address').optional({ nullable: true }).isString().isLength({ max: 1000 }),
  body('logoUrl').optional({ nullable: true }).isURL({ protocols: ['http', 'https'], require_protocol: true }),
  body('timezone').optional().isString().isLength({ min: 1, max: 100 }),
  body('onboardingCompleted').optional().isBoolean(),
  body('onboardingStep').optional().isIn(['HR_CONFIGURATION', 'INVITE_EMPLOYEES', 'COMPLETED']),
  body('workingHoursStart').optional().matches(time),
  body('workingHoursEnd').optional().matches(time),
  body('workingHours.start').optional().matches(time),
  body('workingHours.end').optional().matches(time),
  body('lateThresholdMinutes').optional().isInt({ min: 0, max: 1440 }),
  body('wifiVerificationEnabled').optional().isBoolean(),
  body('leaveAutomationEnabled').optional().isBoolean(),
  body('sandwichLeaveEnabled').optional().isBoolean(),
  body('aiLeaveAdvisorEnabled').optional().isBoolean(),
  body('attendancePolicyJson').optional().isObject(),
  body('attendancePolicy').optional().isObject(),
  body('officeIpRanges').optional().custom((value) => {
    const ranges = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : null;
    if (!ranges || ranges.length > 100 || ranges.some((range) => typeof range !== 'string' || range.length > 64)) {
      throw new Error('officeIpRanges must contain at most 100 network ranges');
    }
    return true;
  }),
];

router.use(authenticate);

router.get('/organization', query('organizationId').optional().isString().isLength({ min: 1, max: 100 }), validate, settingsController.getOrganizationSettings);
router.put('/organization', requirePermission('settings:manage'), settingsRules, validate, settingsController.updateOrganizationSettings);

module.exports = router;

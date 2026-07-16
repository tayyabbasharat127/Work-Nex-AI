const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const billingController = require('./billing.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');
const { strongPassword } = require('../../middleware/validationRules');
const rateLimit = require('express-rate-limit');
const { config } = require('../../config/env');

const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.authRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many registration attempts, please try again later' },
});

const validTimezone = (value) => {
  try {
    Intl.DateTimeFormat('en-US', { timeZone: value }).format();
    return true;
  } catch {
    throw new Error('Valid IANA timezone required');
  }
};

// Public — no auth needed
router.get('/plans', billingController.getPlans);

router.post('/register/start', signupLimiter, [
  body('ownerFirstName').trim().isLength({ min: 1, max: 100 }),
  body('ownerLastName').trim().isLength({ min: 1, max: 100 }),
  body('ownerEmail').isEmail().normalizeEmail(),
  strongPassword('ownerPassword'),
  body('termsAccepted').custom((value) => value === true).withMessage('Terms and Privacy Policy acceptance is required'),
], validate, billingController.startOrganizationRegistration);

router.post('/register/resend', signupLimiter,
  body('registrationId').isUUID(), validate, billingController.resendOrganizationVerification);

router.post('/register/verify', signupLimiter, [
  body('registrationId').isUUID(),
  body('code').matches(/^\d{6}$/),
], validate, billingController.verifyOrganizationEmail);

router.post('/register/complete', signupLimiter, [
  body('completionToken').isString().isLength({ min: 32, max: 200 }),
  body('orgName').trim().isLength({ min: 1, max: 200 }),
  body('country').trim().isLength({ min: 2, max: 2 }).toUpperCase(),
  body('timezone').isString().isLength({ min: 1, max: 100 }).custom(validTimezone),
  body('industry').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 100 }),
  body('planType').isIn(['STARTER', 'GROWTH', 'BUSINESS']),
], validate, billingController.completeOrganizationRegistration);

router.post(
  '/register',
  [
    body('orgName').trim().isLength({ min: 1, max: 200 }).withMessage('Organization name required'),
    body('ownerEmail').isEmail().normalizeEmail().withMessage('Valid owner email required'),
    strongPassword('ownerPassword').optional({ checkFalsy: true }),
    strongPassword('password').optional({ checkFalsy: true }),
    body().custom((value) => Boolean(value.ownerPassword || value.password)).withMessage('Owner password is required'),
    body('ownerFirstName').trim().isLength({ min: 1, max: 100 }),
    body('ownerLastName').trim().isLength({ min: 1, max: 100 }),
    body('industry').trim().isLength({ min: 1, max: 100 }),
    body('country').trim().isLength({ min: 2, max: 100 }),
    body('role').not().exists().withMessage('Role is not allowed for public registration'),
  ],
  validate,
  billingController.registerOrganization
);

// Protected — SUPER_ADMIN only
router.use(authenticate);
router.use(authorize('SUPER_ADMIN'));

router.post(
  '/subscribe',
  [
    body('organizationId').isUUID(),
    body('planType').isIn(['STARTER', 'GROWTH', 'BUSINESS']),
    body('billingCycle').isIn(['MONTHLY', 'ANNUAL']),
    body('paymentMethod').trim().isLength({ min: 1, max: 100 }),
    body('paymentReference').trim().isLength({ min: 1, max: 255 }),
  ],
  validate,
  billingController.subscribe
);

router.post(
  '/upgrade',
  [
    body('organizationId').isUUID(),
    body('newPlan').isIn(['STARTER', 'GROWTH', 'BUSINESS', 'ENTERPRISE']),
    body('billingCycle').isIn(['MONTHLY', 'ANNUAL']),
  ],
  validate,
  billingController.upgradePlan
);

router.get('/:orgId/subscription', param('orgId').isUUID(), validate, billingController.getSubscription);
router.get('/:orgId/invoices', param('orgId').isUUID(), validate, billingController.getInvoices);
router.get('/:orgId/employee-limit', param('orgId').isUUID(), validate, billingController.checkEmployeeLimit);
router.post('/:orgId/cancel', param('orgId').isUUID(), body('reason').optional().isString().isLength({ max: 1000 }), validate, billingController.cancelSubscription);

module.exports = router;

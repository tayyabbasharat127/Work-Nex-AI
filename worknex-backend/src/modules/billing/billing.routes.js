const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const billingController = require('./billing.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');

// Public — no auth needed
router.get('/plans', billingController.getPlans);

router.post(
  '/register',
  [
    body('orgName').notEmpty().withMessage('Organization name required'),
    body('ownerEmail').isEmail().withMessage('Valid owner email required'),
    body('ownerFirstName').notEmpty(),
    body('ownerLastName').notEmpty(),
    body('industry').notEmpty(),
    body('country').notEmpty(),
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
    body('organizationId').notEmpty(),
    body('planType').isIn(['STARTER', 'GROWTH', 'BUSINESS']),
    body('billingCycle').isIn(['MONTHLY', 'ANNUAL']),
    body('paymentMethod').notEmpty(),
    body('paymentReference').notEmpty(),
  ],
  validate,
  billingController.subscribe
);

router.post(
  '/upgrade',
  [
    body('organizationId').notEmpty(),
    body('newPlan').isIn(['STARTER', 'GROWTH', 'BUSINESS', 'ENTERPRISE']),
    body('billingCycle').isIn(['MONTHLY', 'ANNUAL']),
  ],
  validate,
  billingController.upgradePlan
);

router.get('/:orgId/subscription',     billingController.getSubscription);
router.get('/:orgId/invoices',         billingController.getInvoices);
router.get('/:orgId/employee-limit',   billingController.checkEmployeeLimit);
router.post('/:orgId/cancel',          billingController.cancelSubscription);

module.exports = router;

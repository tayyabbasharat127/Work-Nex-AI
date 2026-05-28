const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('./auth.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');

router.post(
  '/register',
  authenticate,
  authorize('SUPER_ADMIN', 'ADMIN'),
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password min 8 chars'),
    body('firstName').notEmpty(),
    body('lastName').notEmpty(),
    body('employeeId').notEmpty(),
    body('organizationId').notEmpty().withMessage('organizationId required'),
    body('role').optional().isIn(['ADMIN', 'MANAGER', 'EMPLOYEE']).withMessage('Invalid role — SUPER_ADMIN cannot be assigned via this endpoint'),
  ],
  validate,
  authController.register
);

router.post(
  '/login',
  [
    body('email').isEmail(),
    body('password').notEmpty(),
  ],
  validate,
  authController.login
);

router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authenticate, authController.logout);

// 2FA
router.post('/2fa/setup', authenticate, authController.setup2FA);
router.post('/2fa/verify', authenticate, authController.verify2FA);
router.post('/2fa/disable', authenticate, authController.disable2FA);
router.post('/2fa/validate', authController.validate2FA);

// Password
router.post('/forgot-password', [body('email').isEmail()], validate, authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/change-password', authenticate, authController.changePassword);

module.exports = router;

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('./auth.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');
const { strongPassword, oneTimePassword } = require('../../middleware/validationRules');

router.post(
  '/register',
  authenticate,
  authorize('SUPER_ADMIN', 'ADMIN'),
  [
    body('email').isEmail().withMessage('Valid email required'),
    strongPassword('password'),
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

router.post('/refresh-token', body('refreshToken').optional({ nullable: true }).isString().isLength({ max: 4096 }), validate, authController.refreshToken);
router.post('/logout', authenticate, authController.logout);

// 2FA
router.post('/2fa/setup', authenticate, authController.setup2FA);
router.post('/2fa/verify', authenticate, oneTimePassword(), validate, authController.verify2FA);
router.post('/2fa/disable', authenticate, oneTimePassword(), validate, authController.disable2FA);
router.post('/2fa/validate', body('userId').isString().isLength({ min: 20, max: 4096 }), oneTimePassword(), validate, authController.validate2FA);

// Password
router.post('/forgot-password', [body('email').isEmail().normalizeEmail()], validate, authController.forgotPassword);
router.post('/reset-password', body('token').isString().isLength({ min: 20, max: 512 }), strongPassword('newPassword'), validate, authController.resetPassword);
router.post('/change-password', authenticate, body('oldPassword').isString().notEmpty(), strongPassword('newPassword'), validate, authController.changePassword);

module.exports = router;

const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const usersController = require('./users.controller');
const { authenticate, authorize, requirePermission } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');
const { strongPassword } = require('../../middleware/validationRules');
const { auditLog, auditHrAccess } = require('../../middleware/audit.middleware');

router.use(authenticate);

// ── Specific named routes MUST come before parameterized /:id ─────────────────
router.get('/me',                 usersController.getMe);
router.put('/me', [
  body('firstName').optional().trim().isLength({ min: 1, max: 100 }),
  body('lastName').optional().trim().isLength({ min: 1, max: 100 }),
  body('phone').optional({ nullable: true }).isString().isLength({ max: 50 }),
  body('profilePicture').optional({ nullable: true }).isURL({ protocols: ['http', 'https'], require_protocol: true }),
], validate, usersController.updateMe);
router.get('/departments/all',    usersController.getDepartments);
router.post('/departments', requirePermission('users:manage'), [
  body('name').trim().isLength({ min: 1, max: 150 }),
  body('description').optional({ nullable: true }).isString().isLength({ max: 1000 }),
  body('organizationId').optional().isUUID(),
], validate, usersController.createDepartment);
router.put('/departments/:id', requirePermission('users:manage'), [
  param('id').isUUID(),
  body('name').optional().trim().isLength({ min: 1, max: 150 }),
  body('description').optional({ nullable: true }).isString().isLength({ max: 1000 }),
], validate, auditLog('Department', 'UPDATE'), usersController.updateDepartment);
router.delete('/departments/:id', requirePermission('users:manage'), param('id').isUUID(), validate, auditLog('Department', 'DELETE'), usersController.deleteDepartment);
router.get('/department/:deptId', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), param('deptId').isUUID(), validate, auditHrAccess('UserDirectory'), usersController.getUsersByDepartment);
router.delete('/:id/hr-data', requirePermission('users:manage'), param('id').isUUID(), body('confirmation').equals('DELETE HR DATA'), validate, usersController.purgeUserHrData);

// ── Generic collection + parameterized routes ─────────────────────────────────
router.get('/',    authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), auditHrAccess('UserDirectory'), usersController.getAllUsers);
router.get('/:id', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), auditHrAccess('UserProfile'), usersController.getUserById);

router.post(
  '/',
  requirePermission('users:manage'),
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('employeeId').notEmpty().withMessage('Employee ID required'),
    body('firstName').trim().notEmpty().withMessage('First name required'),
    body('lastName').trim().notEmpty().withMessage('Last name required'),
    body('role').optional().isIn(['ADMIN', 'MANAGER', 'EMPLOYEE']).withMessage('Invalid role'),
    body('roleId').optional({ nullable: true, checkFalsy: true }).isString().withMessage('roleId must be a string'),
    strongPassword('password').optional({ checkFalsy: true }),
    body('departmentId').optional({ nullable: true, checkFalsy: true }).isString().withMessage('Department ID must be a string'),
    body('staffCategoryId').optional({ nullable: true, checkFalsy: true }).isString().withMessage('Staff category ID must be a string'),
    body('managerId').optional({ nullable: true, checkFalsy: true }).isString().withMessage('Manager ID must be a string'),
    body('designation').optional({ nullable: true, checkFalsy: true }).isString(),
    body('phone').optional({ nullable: true, checkFalsy: true }).isString(),
    body('joiningDate').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Invalid date format'),
  ],
  validate,
  auditLog('User', 'CREATE'),
  usersController.createUser
);

router.put(
  '/:id',
  requirePermission('users:manage'),
  [
    param('id').isUUID(),
    body('email').optional().isEmail(),
    body('employeeId').optional().trim().isLength({ min: 1, max: 100 }),
    body('firstName').optional().trim().isLength({ min: 1, max: 100 }),
    body('lastName').optional().trim().isLength({ min: 1, max: 100 }),
    body('role').optional().isIn(['ADMIN', 'MANAGER', 'EMPLOYEE']),
    body('roleId').optional({ nullable: true, checkFalsy: true }).isUUID(),
    strongPassword('password').optional({ checkFalsy: true }),
    body('departmentId').optional({ nullable: true, checkFalsy: true }).isUUID(),
    body('staffCategoryId').optional({ nullable: true, checkFalsy: true }).isUUID(),
    body('managerId').optional({ nullable: true, checkFalsy: true }).isUUID(),
    body('designation').optional({ nullable: true }).isString().isLength({ max: 150 }),
    body('phone').optional({ nullable: true }).isString().isLength({ max: 50 }),
    body('joiningDate').optional({ nullable: true, checkFalsy: true }).isISO8601(),
    body('isActive').optional().isBoolean(),
  ],
  validate,
  auditLog('User', 'UPDATE'),
  usersController.updateUser
);

router.delete(
  '/:id',
  requirePermission('users:manage'),
  param('id').isUUID(),
  validate,
  auditLog('User', 'DELETE'),
  usersController.deactivateUser
);

module.exports = router;

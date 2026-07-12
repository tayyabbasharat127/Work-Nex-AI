const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const usersController = require('./users.controller');
const { authenticate, authorize, requirePermission } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');
const { auditLog, auditHrAccess } = require('../../middleware/audit.middleware');

router.use(authenticate);

// ── Specific named routes MUST come before parameterized /:id ─────────────────
router.get('/me',                 usersController.getMe);
router.put('/me',                 usersController.updateMe);
router.get('/departments/all',    usersController.getDepartments);
router.post('/departments',       requirePermission('users:manage'), usersController.createDepartment);
router.put('/departments/:id',    requirePermission('users:manage'), auditLog('Department', 'UPDATE'), usersController.updateDepartment);
router.delete('/departments/:id', requirePermission('users:manage'), auditLog('Department', 'DELETE'), usersController.deleteDepartment);
router.get('/department/:deptId', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), auditHrAccess('UserDirectory'), usersController.getUsersByDepartment);
router.delete('/:id/hr-data', requirePermission('users:manage'), body('confirmation').equals('DELETE HR DATA'), validate, usersController.purgeUserHrData);

// ── Generic collection + parameterized routes ─────────────────────────────────
router.get('/',    authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), auditHrAccess('UserDirectory'), usersController.getAllUsers);
router.get('/:id', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), auditHrAccess('UserProfile'), usersController.getUserById);

router.post(
  '/',
  requirePermission('users:manage'),
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('employeeId').notEmpty().withMessage('Employee ID required'),
    body('firstName').notEmpty().withMessage('First name required'),
    body('lastName').notEmpty().withMessage('Last name required'),
    body('role').optional().isIn(['ADMIN', 'MANAGER', 'EMPLOYEE']).withMessage('Invalid role'),
    body('roleId').optional({ nullable: true, checkFalsy: true }).isString().withMessage('roleId must be a string'),
    body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
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
  auditLog('User', 'UPDATE'),
  usersController.updateUser
);

router.delete(
  '/:id',
  requirePermission('users:manage'),
  auditLog('User', 'DELETE'),
  usersController.deactivateUser
);

module.exports = router;

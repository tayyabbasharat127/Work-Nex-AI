const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const usersController = require('./users.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');
const { auditLog } = require('../../middleware/audit.middleware');

router.use(authenticate);

// ── Specific named routes MUST come before parameterized /:id ─────────────────
router.get('/me',                 usersController.getMe);
router.put('/me',                 usersController.updateMe);
router.get('/departments/all',    usersController.getDepartments);
router.post('/departments',       authorize('SUPER_ADMIN', 'ADMIN'), usersController.createDepartment);
router.put('/departments/:id',    authorize('SUPER_ADMIN', 'ADMIN'), auditLog('Department', 'UPDATE'), usersController.updateDepartment);
router.delete('/departments/:id', authorize('SUPER_ADMIN', 'ADMIN'), auditLog('Department', 'DELETE'), usersController.deleteDepartment);
router.get('/department/:deptId', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), usersController.getUsersByDepartment);

// ── Generic collection + parameterized routes ─────────────────────────────────
router.get('/',    authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), usersController.getAllUsers);
router.get('/:id', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), usersController.getUserById);

router.post(
  '/',
  authorize('SUPER_ADMIN', 'ADMIN'),
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('employeeId').notEmpty().withMessage('Employee ID required'),
    body('firstName').notEmpty().withMessage('First name required'),
    body('lastName').notEmpty().withMessage('Last name required'),
    body('role').isIn(['ADMIN', 'MANAGER', 'EMPLOYEE']).withMessage('Invalid role'),
    body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('departmentId').optional({ nullable: true, checkFalsy: true }).isString().withMessage('Department ID must be a string'),
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
  authorize('SUPER_ADMIN', 'ADMIN'),
  auditLog('User', 'UPDATE'),
  usersController.updateUser
);

router.delete(
  '/:id',
  authorize('SUPER_ADMIN', 'ADMIN'),
  auditLog('User', 'DELETE'),
  usersController.deactivateUser
);

module.exports = router;

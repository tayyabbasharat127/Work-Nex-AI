const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const staffCategoryController = require('./staff-category.controller');
const { authenticate, requirePermission } = require('../../middleware/auth.middleware');
const { auditLog } = require('../../middleware/audit.middleware');
const { validate } = require('../../middleware/validate.middleware');

const categoryRules = [
  body('name').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('organizationId').optional().isString().isLength({ min: 1, max: 100 }),
  body('lateThresholdTime').optional({ nullable: true }).matches(/^([01]\d|2[0-3]):[0-5]\d$/),
  body('latesPerAbsence').optional({ nullable: true }).isInt({ min: 1, max: 31 }),
  body('minHoursPerDay').optional({ nullable: true }).isFloat({ min: 0, max: 24 }),
  body('minHoursPerWeek').optional({ nullable: true }).isFloat({ min: 0, max: 168 }),
];

router.use(authenticate);

// Readable by any authenticated role (needed to populate the category
// dropdown on the Users page) — only mutations are admin-gated.
router.get('/', staffCategoryController.getStaffCategories);
router.post('/', requirePermission('users:manage'), categoryRules, body('name').exists(), validate, auditLog('StaffCategory', 'CREATE'), staffCategoryController.createStaffCategory);
router.put('/:id', requirePermission('users:manage'), param('id').isUUID(), categoryRules, validate, auditLog('StaffCategory', 'UPDATE'), staffCategoryController.updateStaffCategory);
router.delete('/:id', requirePermission('users:manage'), param('id').isUUID(), validate, auditLog('StaffCategory', 'DELETE'), staffCategoryController.deleteStaffCategory);

module.exports = router;

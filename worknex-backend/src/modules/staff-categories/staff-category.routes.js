const express = require('express');
const router = express.Router();
const staffCategoryController = require('./staff-category.controller');
const { authenticate, requirePermission } = require('../../middleware/auth.middleware');
const { auditLog } = require('../../middleware/audit.middleware');

router.use(authenticate);

// Readable by any authenticated role (needed to populate the category
// dropdown on the Users page) — only mutations are admin-gated.
router.get('/', staffCategoryController.getStaffCategories);
router.post('/', requirePermission('users:manage'), auditLog('StaffCategory', 'CREATE'), staffCategoryController.createStaffCategory);
router.put('/:id', requirePermission('users:manage'), auditLog('StaffCategory', 'UPDATE'), staffCategoryController.updateStaffCategory);
router.delete('/:id', requirePermission('users:manage'), auditLog('StaffCategory', 'DELETE'), staffCategoryController.deleteStaffCategory);

module.exports = router;

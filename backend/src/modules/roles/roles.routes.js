const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const rolesController = require('./roles.controller');
const { authenticate, authorize, requirePermission } = require('../../middleware/auth.middleware');
const { auditLog } = require('../../middleware/audit.middleware');
const { validate } = require('../../middleware/validate.middleware');
const { PERMISSION_KEYS } = require('../../constants/permissions');

const roleRules = [
  body('name').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('tier').optional().isIn(['ADMIN', 'MANAGER', 'EMPLOYEE']),
  body('permissions').optional().isArray({ max: PERMISSION_KEYS.length }),
  body('permissions.*').optional().isIn(PERMISSION_KEYS),
];

router.use(authenticate);

router.get('/permissions', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), rolesController.getPermissions);
router.get('/', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), rolesController.listRoles);

router.post('/', requirePermission('users:manage'), roleRules, body('name').exists(), body('tier').exists(), validate, auditLog('Role', 'CREATE'), rolesController.createRole);
router.put('/:id', requirePermission('users:manage'), param('id').isUUID(), roleRules, validate, auditLog('Role', 'UPDATE'), rolesController.updateRole);
router.delete('/:id', requirePermission('users:manage'), param('id').isUUID(), validate, auditLog('Role', 'DELETE'), rolesController.deleteRole);

module.exports = router;

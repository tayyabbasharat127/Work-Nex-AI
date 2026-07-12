const express = require('express');
const router = express.Router();
const rolesController = require('./roles.controller');
const { authenticate, authorize, requirePermission } = require('../../middleware/auth.middleware');
const { auditLog } = require('../../middleware/audit.middleware');

router.use(authenticate);

router.get('/permissions', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), rolesController.getPermissions);
router.get('/', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), rolesController.listRoles);

router.post('/', requirePermission('users:manage'), auditLog('Role', 'CREATE'), rolesController.createRole);
router.put('/:id', requirePermission('users:manage'), auditLog('Role', 'UPDATE'), rolesController.updateRole);
router.delete('/:id', requirePermission('users:manage'), auditLog('Role', 'DELETE'), rolesController.deleteRole);

module.exports = router;

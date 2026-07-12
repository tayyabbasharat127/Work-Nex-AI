const express = require('express');
const router = express.Router();
const biometricController = require('./biometric.controller');
const { authenticate, requirePermission } = require('../../middleware/auth.middleware');
const { auditLog } = require('../../middleware/audit.middleware');

router.use(authenticate);
router.use(requirePermission('attendance:manage'));

router.get('/integration', biometricController.getIntegration);
router.put('/integration', auditLog('BiometricIntegration', 'UPDATE'), biometricController.updateIntegration);
router.post('/integration/test', biometricController.testConnection);

router.get('/devices', biometricController.listDevices);
router.post('/devices', auditLog('BiometricDevice', 'CREATE'), biometricController.createDevice);
router.put('/devices/:id', auditLog('BiometricDevice', 'UPDATE'), biometricController.updateDevice);
router.delete('/devices/:id', auditLog('BiometricDevice', 'DELETE'), biometricController.deleteDevice);

router.get('/sync-logs', biometricController.getSyncLogs);

module.exports = router;

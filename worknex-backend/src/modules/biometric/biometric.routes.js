const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const biometricController = require('./biometric.controller');
const { authenticate, requirePermission } = require('../../middleware/auth.middleware');
const { auditLog } = require('../../middleware/audit.middleware');
const { validate } = require('../../middleware/validate.middleware');

const integrationRules = [
  body('integrationType').isIn(['DATABASE', 'API', 'ADMS']),
  body('enabled').isBoolean(),
  body('syncIntervalMinutes').isInt({ min: 1, max: 1440 }),
  body('fieldMapping').optional().isObject(),
  body('dbType').optional({ nullable: true }).isIn(['MYSQL', 'SQLSERVER', 'POSTGRESQL']),
  body('dbHost').optional({ nullable: true }).isString().trim().isLength({ min: 1, max: 253 }),
  body('dbPort').optional({ nullable: true }).isInt({ min: 1, max: 65535 }),
  body('dbName').optional({ nullable: true }).isString().trim().isLength({ min: 1, max: 128 }),
  body('dbUsername').optional({ nullable: true }).isString().isLength({ min: 1, max: 128 }),
  body('dbPassword').optional({ nullable: true }).isString().isLength({ max: 1024 }),
  body('dbTableName').optional({ nullable: true }).matches(/^[A-Za-z_][A-Za-z0-9_$]*$/),
  body('apiBaseUrl').optional({ nullable: true }).isURL({ protocols: ['http', 'https'], require_protocol: true }),
  body('apiKey').optional({ nullable: true }).isString().isLength({ max: 2048 }),
  body('admsCommunicationKey').optional({ nullable: true }).isString().isLength({ min: 16, max: 512 }),
  body().custom((payload) => {
    if (payload.integrationType === 'DATABASE' && (!payload.dbType || !payload.dbHost || !payload.dbPort || !payload.dbName || !payload.dbUsername)) {
      throw new Error('Database integration requires type, host, port, database, and username');
    }
    if (payload.integrationType === 'API' && !payload.apiBaseUrl) {
      throw new Error('API integration requires apiBaseUrl');
    }
    return true;
  }),
];

const deviceRules = [
  body('name').isString().trim().isLength({ min: 1, max: 120 }),
  body('deviceSerial').optional({ nullable: true }).isString().trim().isLength({ min: 1, max: 120 }),
  body('ipAddress').optional({ nullable: true }).isIP(),
  body('port').optional({ nullable: true }).isInt({ min: 1, max: 65535 }),
  body('location').optional({ nullable: true }).isString().trim().isLength({ max: 255 }),
  body('hmacSecret').optional({ nullable: true }).isString().isLength({ min: 32, max: 512 }),
];

router.use(authenticate);
router.use(requirePermission('attendance:manage'));

router.get('/integration', biometricController.getIntegration);
router.put('/integration', integrationRules, validate, auditLog('BiometricIntegration', 'UPDATE'), biometricController.updateIntegration);
router.post('/integration/test', biometricController.testConnection);

router.get('/devices', biometricController.listDevices);
router.post('/devices', deviceRules, validate, auditLog('BiometricDevice', 'CREATE'), biometricController.createDevice);
router.put('/devices/:id', param('id').isUUID(), deviceRules, validate, auditLog('BiometricDevice', 'UPDATE'), biometricController.updateDevice);
router.delete('/devices/:id', param('id').isUUID(), validate, auditLog('BiometricDevice', 'DELETE'), biometricController.deleteDevice);

router.get('/sync-logs', query('limit').optional().isInt({ min: 1, max: 100 }), validate, biometricController.getSyncLogs);

module.exports = router;

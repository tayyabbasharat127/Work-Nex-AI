const express = require('express');
const router = express.Router();
const settingsController = require('./settings.controller');
const { authenticate, requirePermission } = require('../../middleware/auth.middleware');

router.use(authenticate);

router.get('/organization', settingsController.getOrganizationSettings);
router.put('/organization', requirePermission('settings:manage'), settingsController.updateOrganizationSettings);

module.exports = router;

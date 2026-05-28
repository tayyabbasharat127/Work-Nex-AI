const express = require('express');
const router = express.Router();
const settingsController = require('./settings.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

router.use(authenticate);

router.get('/organization', settingsController.getOrganizationSettings);
router.put('/organization', authorize('SUPER_ADMIN', 'ADMIN'), settingsController.updateOrganizationSettings);

module.exports = router;

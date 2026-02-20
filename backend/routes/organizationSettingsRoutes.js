const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authentication');
const { getSettings, updateSettings } = require('../controller/organizationSettings');

// Get organization settings
router.get('/', authenticate, getSettings);

// Update organization settings
router.put('/', authenticate, updateSettings);

module.exports = router;

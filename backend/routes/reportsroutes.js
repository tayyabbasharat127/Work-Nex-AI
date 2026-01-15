const express = require('express');
const router = express.Router();
const { generateReport, getReports } = require('../controller/reports');
const authenticateToken = require('../middleware/authentication');
router.post('/generate', authenticateToken, generateReport);
router.get('/', authenticateToken, getReports);
module.exports = router;

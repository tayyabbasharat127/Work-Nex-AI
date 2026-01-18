const express = require('express');
const router = express.Router();
const { getKPIs, getTrends, getDepartmentAnalytics } = require('../controller/analytics');
const authenticateToken = require('../middleware/authentication');
router.get('/kpis', authenticateToken, getKPIs);
router.get('/trends', authenticateToken, getTrends);
router.get('/departments', authenticateToken, getDepartmentAnalytics);
module.exports = router;

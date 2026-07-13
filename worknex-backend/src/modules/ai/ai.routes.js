const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const aiController = require('./ai.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');

router.use(authenticate);
router.get('/status', aiController.status);

// Agentic chatbot
router.post(
  '/chat',
  [body('message').notEmpty().isLength({ max: 1000 })],
  validate,
  aiController.chat
);

// Predictive analytics
router.get('/predict/leave-forecast', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), [query('departmentId').optional().isUUID()], validate, aiController.leaveForecast);
router.get('/predict/attendance-anomaly', [query('userId').optional().isUUID()], validate, aiController.attendanceAnomaly);
router.get('/predict/attrition-risk', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), aiController.attritionRisk);
router.post('/predict-performance', [body('employeeId').optional().isUUID()], validate, aiController.predictPerformance);

module.exports = router;

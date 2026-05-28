const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const aiController = require('./ai.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');

router.use(authenticate);

// Agentic chatbot
router.post(
  '/chat',
  [body('message').notEmpty().isLength({ max: 1000 })],
  validate,
  aiController.chat
);

// Predictive analytics
router.get('/predict/leave-forecast', aiController.leaveForecast);
router.get('/predict/attendance-anomaly', aiController.attendanceAnomaly);
router.get('/predict/attrition-risk', aiController.attritionRisk);
router.post('/predict-performance', aiController.predictPerformance);

module.exports = router;

const aiService = require('./ai.service');
const { apiResponse } = require('../../utils/ApiResponse');

const chat = async (req, res) => {
  const result = await aiService.chat(req.user.id, req.body.message);
  apiResponse(res, 200, 'AI response', result);
};

const leaveForecast = async (req, res) => {
  const result = await aiService.leaveForecast(req.query.departmentId);
  apiResponse(res, 200, 'Leave forecast', result);
};

const attendanceAnomaly = async (req, res) => {
  const userId = req.query.userId || req.user.id;
  const result = await aiService.attendanceAnomaly(userId);
  apiResponse(res, 200, 'Attendance anomaly analysis', result);
};

const attritionRisk = async (req, res) => {
  const result = await aiService.attritionRisk();
  apiResponse(res, 200, 'Attrition risk analysis', result);
};

module.exports = { chat, leaveForecast, attendanceAnomaly, attritionRisk };

const aiService = require('./ai.service');
const { apiResponse } = require('../../utils/ApiResponse');

const status = async (req, res) => {
  const result = await aiService.status(req.headers.authorization);
  apiResponse(res, 200, 'AI service status', result);
};

const chat = async (req, res) => {
  // Extract the user's JWT from Authorization header and forward it to the AI service
  // so the LangChain agent can make personal DB queries on behalf of this user
  const authHeader = req.headers.authorization || '';
  const authToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const result = await aiService.chat(req.user.id, req.body.message, authToken);
  apiResponse(res, 200, 'AI response', result);
};

const leaveForecast = async (req, res) => {
  const result = await aiService.leaveForecast(req.user, req.query.departmentId, req.headers.authorization);
  apiResponse(res, 200, 'Leave forecast', result);
};

const attendanceAnomaly = async (req, res) => {
  const userId = req.query.userId || req.user.id;
  const result = await aiService.attendanceAnomaly(req.user, userId, req.headers.authorization);
  apiResponse(res, 200, 'Attendance anomaly analysis', result);
};

const attritionRisk = async (req, res) => {
  const result = await aiService.attritionRisk(req.user, req.headers.authorization);
  apiResponse(res, 200, 'Attrition risk analysis', result);
};

const predictPerformance = async (req, res) => {
  const result = await aiService.predictPerformance(req.user, req.body.employeeId || req.user.id, req.headers.authorization);
  apiResponse(res, 200, 'Performance prediction', result);
};

module.exports = { status, chat, leaveForecast, attendanceAnomaly, attritionRisk, predictPerformance };

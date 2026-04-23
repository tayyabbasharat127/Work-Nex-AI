const performanceService = require('./performance.service');
const { apiResponse } = require('../../utils/ApiResponse');

const getMyPerformance = async (req, res) => {
  const { year = new Date().getFullYear() } = req.query;
  const data = await performanceService.getMyPerformance(req.user.id, year);
  apiResponse(res, 200, 'Performance fetched', data);
};

const getUserPerformance = async (req, res) => {
  const { year = new Date().getFullYear() } = req.query;
  const data = await performanceService.getUserPerformance(req.params.userId, year);
  apiResponse(res, 200, 'Performance fetched', data);
};

const getTeamPerformance = async (req, res) => {
  const { month = new Date().getMonth() + 1, year = new Date().getFullYear() } = req.query;
  const data = await performanceService.getTeamPerformance(req.user.id, month, year);
  apiResponse(res, 200, 'Team performance fetched', data);
};

const getLeaderboard = async (req, res) => {
  const { month = new Date().getMonth() + 1, year = new Date().getFullYear() } = req.query;
  const data = await performanceService.getLeaderboard(month, year);
  apiResponse(res, 200, 'Leaderboard fetched', data);
};

module.exports = { getMyPerformance, getUserPerformance, getTeamPerformance, getLeaderboard };

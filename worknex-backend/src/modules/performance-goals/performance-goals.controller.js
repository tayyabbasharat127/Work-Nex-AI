const service = require('./performance-goals.service');
const { apiResponse } = require('../../utils/ApiResponse');

const getMyGoals = async (req, res) => {
  apiResponse(res, 200, 'Goals fetched', await service.getMyGoals(req.user));
};

const getUserGoals = async (req, res) => {
  apiResponse(res, 200, 'Goals fetched', await service.getUserGoals(req.params.userId, req.user));
};

const createGoal = async (req, res) => {
  apiResponse(res, 201, 'Goal created', await service.createGoal(req.body, req.user));
};

const updateGoal = async (req, res) => {
  apiResponse(res, 200, 'Goal updated', await service.updateGoal(req.params.id, req.body, req.user));
};

const deleteGoal = async (req, res) => {
  await service.deleteGoal(req.params.id, req.user);
  apiResponse(res, 200, 'Goal deleted', null);
};

const getMyReviews = async (req, res) => {
  apiResponse(res, 200, 'Reviews fetched', await service.getMyReviews(req.user));
};

const getUserReviews = async (req, res) => {
  apiResponse(res, 200, 'Reviews fetched', await service.getUserReviews(req.params.userId, req.user));
};

const createReview = async (req, res) => {
  apiResponse(res, 201, 'Review created', await service.createReview(req.body, req.user));
};

const updateReview = async (req, res) => {
  apiResponse(res, 200, 'Review updated', await service.updateReview(req.params.id, req.body, req.user));
};

const submitReview = async (req, res) => {
  apiResponse(res, 200, 'Review submitted', await service.submitReview(req.params.id, req.user));
};

const getTeamStatus = async (req, res) => {
  apiResponse(res, 200, 'Team review status fetched', await service.getTeamStatus(req.user));
};

const getPerformanceSummary = async (req, res) => {
  apiResponse(res, 200, 'Performance summary fetched', await service.getPerformanceSummary(req.params.userId, req.user));
};

module.exports = {
  getMyGoals, getUserGoals, createGoal, updateGoal, deleteGoal,
  getMyReviews, getUserReviews, createReview, updateReview, submitReview, getTeamStatus,
  getPerformanceSummary,
};

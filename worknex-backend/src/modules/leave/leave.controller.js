const leaveService = require('./leave.service');
const { apiResponse } = require('../../utils/ApiResponse');

const applyLeave = async (req, res) => {
  const leave = await leaveService.applyLeave(req.user.id, req.body);
  apiResponse(res, 201, 'Leave applied successfully', leave);
};

const approveLeave = async (req, res) => {
  const leave = await leaveService.approveLeave(req.user.id, req.params.id, req.body.note);
  apiResponse(res, 200, 'Leave approved', leave);
};

const rejectLeave = async (req, res) => {
  const leave = await leaveService.rejectLeave(req.user.id, req.params.id, req.body.note);
  apiResponse(res, 200, 'Leave rejected', leave);
};

const cancelLeave = async (req, res) => {
  const leave = await leaveService.cancelLeave(req.user.id, req.params.id);
  apiResponse(res, 200, 'Leave cancelled', leave);
};

const getLeaves = async (req, res) => {
  const result = await leaveService.getLeaves(req.query, req.user);
  apiResponse(res, 200, 'Leaves fetched', result.leaves, result.meta);
};

const getMyLeaves = async (req, res) => {
  const result = await leaveService.getMyLeaves(req.user.id, req.query);
  apiResponse(res, 200, 'My leaves fetched', result.leaves, result.meta);
};

const getPendingLeaves = async (req, res) => {
  const leaves = await leaveService.getPendingLeaves(req.user);
  apiResponse(res, 200, 'Pending leaves fetched', leaves);
};

const getLeaveById = async (req, res) => {
  const leave = await leaveService.getLeaveById(req.params.id);
  apiResponse(res, 200, 'Leave fetched', leave);
};

const getMyBalances = async (req, res) => {
  const balances = await leaveService.getMyBalances(req.user.id);
  apiResponse(res, 200, 'Leave balances fetched', balances);
};

const getUserBalances = async (req, res) => {
  const balances = await leaveService.getUserBalances(req.params.userId);
  apiResponse(res, 200, 'Leave balances fetched', balances);
};

const getPolicies = async (req, res) => {
  const policies = await leaveService.getPolicies();
  apiResponse(res, 200, 'Policies fetched', policies);
};

const createPolicy = async (req, res) => {
  const policy = await leaveService.createPolicy(req.body);
  apiResponse(res, 201, 'Policy created', policy);
};

const updatePolicy = async (req, res) => {
  const policy = await leaveService.updatePolicy(req.params.id, req.body);
  apiResponse(res, 200, 'Policy updated', policy);
};

module.exports = {
  applyLeave, approveLeave, rejectLeave, cancelLeave,
  getLeaves, getMyLeaves, getPendingLeaves, getLeaveById,
  getMyBalances, getUserBalances, getPolicies, createPolicy, updatePolicy,
};

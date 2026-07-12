const leaveService = require('./leave.service');
const { apiResponse } = require('../../utils/ApiResponse');

const applyLeave = async (req, res) => {
  const leave = await leaveService.applyLeave(req.user, req.body);
  apiResponse(res, 201, 'Leave applied successfully', leave);
};

const approveLeave = async (req, res) => {
  const leave = await leaveService.approveLeave(req.user, req.params.id, req.body.note);
  apiResponse(res, 200, 'Leave approved', leave);
};

const rejectLeave = async (req, res) => {
  const leave = await leaveService.rejectLeave(req.user, req.params.id, req.body.note);
  apiResponse(res, 200, 'Leave rejected', leave);
};

const cancelLeave = async (req, res) => {
  const leave = await leaveService.cancelLeave(req.user, req.params.id);
  apiResponse(res, 200, 'Leave cancelled', leave);
};

const getLeaves = async (req, res) => {
  const result = await leaveService.getLeaves(req.query, req.user);
  apiResponse(res, 200, 'Leaves fetched', result.leaves, result.meta);
};

const getMyLeaves = async (req, res) => {
  const result = await leaveService.getMyLeaves(req.user, req.query);
  apiResponse(res, 200, 'My leaves fetched', result.leaves, result.meta);
};

const getPendingLeaves = async (req, res) => {
  const leaves = await leaveService.getPendingLeaves(req.user);
  apiResponse(res, 200, 'Pending leaves fetched', leaves);
};

const getLeaveById = async (req, res) => {
  const leave = await leaveService.getLeaveById(req.params.id, req.user);
  apiResponse(res, 200, 'Leave fetched', leave);
};

const getMyBalances = async (req, res) => {
  const balances = await leaveService.getMyBalances(req.user);
  apiResponse(res, 200, 'Leave balances fetched', balances);
};

const getUserBalances = async (req, res) => {
  const balances = await leaveService.getUserBalances(req.params.userId, req.user);
  apiResponse(res, 200, 'Leave balances fetched', balances);
};

const getPolicies = async (req, res) => {
  const policies = await leaveService.getPolicies(req.user);
  apiResponse(res, 200, 'Policies fetched', policies);
};

const getActivePolicyVersion = async (req, res) => {
  const version = await leaveService.getActivePolicyVersion(req.user);
  apiResponse(res, 200, 'Active policy version fetched', version);
};

const getLeaveTypeLabels = async (req, res) => {
  const labels = await leaveService.getLeaveTypeLabels(req.user);
  apiResponse(res, 200, 'Leave type labels fetched', labels);
};

const createPolicy = async (req, res) => {
  const policy = await leaveService.createPolicy(req.body, req.user);
  apiResponse(res, 201, 'Policy created', policy);
};

const updatePolicy = async (req, res) => {
  const policy = await leaveService.updatePolicy(req.params.id, req.body, req.user);
  apiResponse(res, 200, 'Policy updated', policy);
};

const uploadPolicyDocument = async (req, res) => {
  const document = await leaveService.uploadPolicyDocument(req.file, req.user);
  apiResponse(res, 201, 'Policy document uploaded', document);
};

const extractPolicyDocument = async (req, res) => {
  const document = await leaveService.extractPolicyDocument(req.params.id, req.user);
  apiResponse(res, 200, 'Policy document extracted', document);
};

const aiParsePolicyDocument = async (req, res) => {
  const document = await leaveService.aiParsePolicyDocument(req.params.id, req.user);
  apiResponse(res, 200, 'Policy document parsed', document);
};

const approvePolicyRules = async (req, res) => {
  const document = await leaveService.approvePolicyRules(req.params.id, req.body, req.user);
  apiResponse(res, 200, 'Policy rules approved', document);
};

const saveManualPolicyRules = async (req, res) => {
  const result = await leaveService.saveManualPolicyRules(req.body.leavePolicies, req.user);
  apiResponse(res, 200, 'Policy rules activated', result);
};

const evaluateLeave = async (req, res) => {
  const decision = await leaveService.evaluateExistingLeave(req.params.id, req.user);
  apiResponse(res, 200, 'Leave evaluated', decision);
};

const getDecisionExplanation = async (req, res) => {
  const explanation = await leaveService.getDecisionExplanation(req.params.id, req.user);
  apiResponse(res, 200, 'Decision explanation fetched', explanation);
};

module.exports = {
  applyLeave, approveLeave, rejectLeave, cancelLeave,
  getLeaves, getMyLeaves, getPendingLeaves, getLeaveById,
  getMyBalances, getUserBalances, getPolicies, getActivePolicyVersion, getLeaveTypeLabels, createPolicy, updatePolicy,
  uploadPolicyDocument, extractPolicyDocument, aiParsePolicyDocument,
  approvePolicyRules, saveManualPolicyRules, evaluateLeave, getDecisionExplanation,
};

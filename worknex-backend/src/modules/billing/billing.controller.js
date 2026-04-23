const billingService = require('./billing.service');
const { apiResponse } = require('../../utils/ApiResponse');

const getPlans = (req, res) => {
  const plans = billingService.getPlans();
  apiResponse(res, 200, 'Plans fetched', plans);
};

const registerOrganization = async (req, res) => {
  const result = await billingService.registerOrganization(req.body);
  apiResponse(res, 201, 'Organization registered. Trial started!', result);
};

const subscribe = async (req, res) => {
  const { planType, billingCycle, paymentMethod, paymentReference } = req.body;
  const result = await billingService.subscribe(
    req.body.organizationId, planType, billingCycle, paymentMethod, paymentReference
  );
  apiResponse(res, 200, 'Subscription activated', result);
};

const upgradePlan = async (req, res) => {
  const { newPlan, billingCycle, paymentMethod, paymentReference } = req.body;
  const result = await billingService.upgradePlan(
    req.body.organizationId, newPlan, billingCycle, paymentMethod, paymentReference
  );
  apiResponse(res, 200, 'Plan upgraded successfully', result);
};

const getSubscription = async (req, res) => {
  const result = await billingService.getSubscription(req.params.orgId);
  apiResponse(res, 200, 'Subscription fetched', result);
};

const cancelSubscription = async (req, res) => {
  const result = await billingService.cancelSubscription(req.params.orgId, req.body.reason);
  apiResponse(res, 200, result.message, result);
};

const getInvoices = async (req, res) => {
  const invoices = await billingService.getInvoices(req.params.orgId);
  apiResponse(res, 200, 'Invoices fetched', invoices);
};

const checkEmployeeLimit = async (req, res) => {
  const result = await billingService.checkEmployeeLimit(req.params.orgId);
  apiResponse(res, 200, 'Employee limit status', result);
};

module.exports = {
  getPlans, registerOrganization, subscribe, upgradePlan,
  getSubscription, cancelSubscription, getInvoices, checkEmployeeLimit,
};

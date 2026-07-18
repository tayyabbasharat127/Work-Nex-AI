const biometricService = require('./biometric.service');
const { apiResponse } = require('../../utils/ApiResponse');

const getIntegration = async (req, res) => {
  const integration = await biometricService.getIntegration(req.user.organizationId);
  apiResponse(res, 200, 'Biometric integration settings fetched', integration);
};

const updateIntegration = async (req, res) => {
  const integration = await biometricService.upsertIntegration(req.body, req.user.organizationId);
  apiResponse(res, 200, 'Biometric integration settings saved', integration);
};

const testConnection = async (req, res) => {
  const result = await biometricService.testConnection(req.user.organizationId);
  apiResponse(res, 200, result.success ? 'Connected successfully' : 'Connection test failed', result);
};

const listDevices = async (req, res) => {
  const devices = await biometricService.listDevices(req.user.organizationId);
  apiResponse(res, 200, 'Devices fetched', devices);
};

const createDevice = async (req, res) => {
  const device = await biometricService.upsertDevice(req.body, req.user.organizationId);
  apiResponse(res, 201, 'Device added', device);
};

const updateDevice = async (req, res) => {
  const device = await biometricService.upsertDevice(req.body, req.user.organizationId, req.params.id);
  apiResponse(res, 200, 'Device updated', device);
};

const deleteDevice = async (req, res) => {
  const result = await biometricService.deleteDevice(req.params.id, req.user.organizationId);
  apiResponse(res, 200, 'Device removed', result);
};

const getSyncLogs = async (req, res) => {
  const logs = await biometricService.getSyncLogs(req.user.organizationId, req.query.limit);
  apiResponse(res, 200, 'Sync logs fetched', logs);
};

module.exports = {
  getIntegration, updateIntegration, testConnection,
  listDevices, createDevice, updateDevice, deleteDevice,
  getSyncLogs,
};

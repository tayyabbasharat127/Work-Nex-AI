const settingsService = require('./settings.service');
const { apiResponse } = require('../../utils/ApiResponse');

const getOrganizationSettings = async (req, res) => {
  const settings = await settingsService.getOrganizationSettings(req.user, req.query);
  apiResponse(res, 200, 'Organization settings fetched', settings);
};

const updateOrganizationSettings = async (req, res) => {
  const settings = await settingsService.updateOrganizationSettings(req.user, req.body);
  apiResponse(res, 200, 'Organization settings updated', settings);
};

module.exports = { getOrganizationSettings, updateOrganizationSettings };

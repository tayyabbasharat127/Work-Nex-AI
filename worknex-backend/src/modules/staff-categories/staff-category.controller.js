const staffCategoryService = require('./staff-category.service');
const { apiResponse } = require('../../utils/ApiResponse');

const getStaffCategories = async (req, res) => {
  const categories = await staffCategoryService.getStaffCategories(req.user);
  apiResponse(res, 200, 'Staff categories fetched', categories);
};

const createStaffCategory = async (req, res) => {
  const category = await staffCategoryService.createStaffCategory(req.body, req.user);
  apiResponse(res, 201, 'Staff category created', category);
};

const updateStaffCategory = async (req, res) => {
  const category = await staffCategoryService.updateStaffCategory(req.params.id, req.body, req.user);
  apiResponse(res, 200, 'Staff category updated', category);
};

const deleteStaffCategory = async (req, res) => {
  await staffCategoryService.deleteStaffCategory(req.params.id, req.user);
  apiResponse(res, 200, 'Staff category deleted', null);
};

module.exports = {
  getStaffCategories,
  createStaffCategory,
  updateStaffCategory,
  deleteStaffCategory,
};

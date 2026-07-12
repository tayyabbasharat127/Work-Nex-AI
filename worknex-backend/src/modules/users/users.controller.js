const usersService = require('./users.service');
const { apiResponse } = require('../../utils/ApiResponse');

const getMe = async (req, res) => {
  const user = await usersService.getUserById(req.user.id, req.user);
  apiResponse(res, 200, 'Profile fetched', user);
};

const updateMe = async (req, res) => {
  const user = await usersService.updateMe(req.user.id, req.body);
  apiResponse(res, 200, 'Profile updated', user);
};

const getAllUsers = async (req, res) => {
  const result = await usersService.getAllUsers(req.query, req.user);
  apiResponse(res, 200, 'Users fetched', result.users, result.meta);
};

const getUserById = async (req, res) => {
  const user = await usersService.getUserById(req.params.id, req.user);
  apiResponse(res, 200, 'User fetched', user);
};

const getUsersByDepartment = async (req, res) => {
  const users = await usersService.getUsersByDepartment(req.params.deptId, req.user);
  apiResponse(res, 200, 'Users fetched', users);
};

const createUser = async (req, res) => {
  const result = await usersService.createUser(req.body, req.user);
  res.locals.entityId = result.user.id;
  apiResponse(res, 201, 'User created', result.user);
};

const updateUser = async (req, res) => {
  const user = await usersService.updateUser(req.params.id, req.body, req.user);
  apiResponse(res, 200, 'User updated', user);
};

const deactivateUser = async (req, res) => {
  await usersService.deactivateUser(req.params.id, req.user);
  apiResponse(res, 200, 'User deactivated');
};

const getDepartments = async (req, res) => {
  const depts = await usersService.getDepartments(req.user);
  apiResponse(res, 200, 'Departments fetched', depts);
};

const createDepartment = async (req, res) => {
  const dept = await usersService.createDepartment(req.body, req.user);
  apiResponse(res, 201, 'Department created', dept);
};

const updateDepartment = async (req, res) => {
  const dept = await usersService.updateDepartment(req.params.id, req.body, req.user);
  apiResponse(res, 200, 'Department updated', dept);
};

const deleteDepartment = async (req, res) => {
  await usersService.deleteDepartment(req.params.id, req.user);
  apiResponse(res, 200, 'Department deleted');
};

const purgeUserHrData = async (req, res) => {
  const result = await usersService.purgeUserHrData(req.params.id, req.user);
  apiResponse(res, 200, 'User HR records permanently deleted', result);
};

module.exports = {
  getMe, updateMe, getAllUsers, getUserById, getUsersByDepartment,
  createUser, updateUser, deactivateUser, getDepartments, createDepartment,
  updateDepartment, deleteDepartment, purgeUserHrData,
};

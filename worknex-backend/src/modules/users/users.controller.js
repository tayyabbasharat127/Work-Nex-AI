const usersService = require('./users.service');
const { apiResponse } = require('../../utils/ApiResponse');

const getMe = async (req, res) => {
  const user = await usersService.getUserById(req.user.id);
  apiResponse(res, 200, 'Profile fetched', user);
};

const updateMe = async (req, res) => {
  const user = await usersService.updateMe(req.user.id, req.body);
  apiResponse(res, 200, 'Profile updated', user);
};

const getAllUsers = async (req, res) => {
  const result = await usersService.getAllUsers(req.query);
  apiResponse(res, 200, 'Users fetched', result.users, result.meta);
};

const getUserById = async (req, res) => {
  const user = await usersService.getUserById(req.params.id);
  apiResponse(res, 200, 'User fetched', user);
};

const getUsersByDepartment = async (req, res) => {
  const users = await usersService.getUsersByDepartment(req.params.deptId);
  apiResponse(res, 200, 'Users fetched', users);
};

const createUser = async (req, res) => {
  const result = await usersService.createUser(req.body);
  res.locals.entityId = result.user.id;
  apiResponse(res, 201, 'User created', result.user);
};

const updateUser = async (req, res) => {
  const user = await usersService.updateUser(req.params.id, req.body);
  apiResponse(res, 200, 'User updated', user);
};

const deactivateUser = async (req, res) => {
  await usersService.deactivateUser(req.params.id);
  apiResponse(res, 200, 'User deactivated');
};

const getDepartments = async (req, res) => {
  const depts = await usersService.getDepartments();
  apiResponse(res, 200, 'Departments fetched', depts);
};

const createDepartment = async (req, res) => {
  const dept = await usersService.createDepartment(req.body);
  apiResponse(res, 201, 'Department created', dept);
};

module.exports = {
  getMe, updateMe, getAllUsers, getUserById, getUsersByDepartment,
  createUser, updateUser, deactivateUser, getDepartments, createDepartment,
};

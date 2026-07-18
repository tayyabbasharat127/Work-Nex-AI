const rolesService = require('./roles.service');
const { apiResponse } = require('../../utils/ApiResponse');

const getPermissions = async (req, res) => {
  apiResponse(res, 200, 'Permission catalog fetched', rolesService.getPermissionCatalog());
};

const listRoles = async (req, res) => {
  const roles = await rolesService.listRoles(req.user);
  apiResponse(res, 200, 'Roles fetched', roles);
};

const createRole = async (req, res) => {
  const role = await rolesService.createRole(req.body, req.user);
  apiResponse(res, 201, 'Role created', role);
};

const updateRole = async (req, res) => {
  const role = await rolesService.updateRole(req.params.id, req.body, req.user);
  apiResponse(res, 200, 'Role updated', role);
};

const deleteRole = async (req, res) => {
  const result = await rolesService.deleteRole(req.params.id, req.user);
  apiResponse(res, 200, 'Role deleted', result);
};

module.exports = { getPermissions, listRoles, createRole, updateRole, deleteRole };

import { apiFetch } from './client';

// Roles API — dynamic, admin-configurable roles (a role has a fixed tier
// governing scope, plus a custom name and permission list)
export const rolesAPI = {
  getAll: async () => {
    const response = await apiFetch('/roles');
    return response.data || response;
  },

  getPermissions: async () => {
    const response = await apiFetch('/roles/permissions');
    return response.data || response;
  },

  create: async (roleData) => {
    const response = await apiFetch('/roles', {
      method: 'POST',
      body: JSON.stringify(roleData),
    });
    return response.data || response;
  },

  update: async (roleId, roleData) => {
    const response = await apiFetch(`/roles/${roleId}`, {
      method: 'PUT',
      body: JSON.stringify(roleData),
    });
    return response.data || response;
  },

  delete: async (roleId) => {
    const response = await apiFetch(`/roles/${roleId}`, { method: 'DELETE' });
    return response.data || response;
  },
};

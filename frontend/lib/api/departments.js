import { apiFetch } from './client';

export const departmentAPI = {
  getAll: async () => {
    const response = await apiFetch('/users/departments/all');
    return response.data || response;
  },

  create: async (departmentData) => {
    const response = await apiFetch('/users/departments', {
      method: 'POST',
      body: JSON.stringify(departmentData),
    });
    return response.data || response;
  },

  update: async (departmentId, departmentData) => {
    const response = await apiFetch(`/users/departments/${departmentId}`, {
      method: 'PUT',
      body: JSON.stringify(departmentData),
    });
    return response.data || response;
  },

  delete: async (departmentId) => {
    const response = await apiFetch(`/users/departments/${departmentId}`, { method: 'DELETE' });
    return response.data || response;
  },
};

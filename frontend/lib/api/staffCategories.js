import { apiFetch } from './client';

// Staff Categories API — org-defined attendance-policy groups (e.g.
// "Faculty"/"NTS" for a university), each with its own late threshold,
// 3-lates-to-absence rule, and weekly-hours target.
export const staffCategoryAPI = {
  getAll: async () => {
    const response = await apiFetch('/staff-categories');
    return response.data || response;
  },

  create: async (data) => {
    const response = await apiFetch('/staff-categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data || response;
  },

  update: async (id, data) => {
    const response = await apiFetch(`/staff-categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data || response;
  },

  delete: async (id) => {
    const response = await apiFetch(`/staff-categories/${id}`, { method: 'DELETE' });
    return response.data || response;
  },
};

import { apiFetch } from './client';

export const reportsAPI = {
  generate: async (reportData) => {
    const response = await apiFetch('/reports/generate', {
      method: 'POST',
      body: JSON.stringify(reportData),
    });
    return response.data || response;
  },

  getAll: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch(`/reports${queryString ? `?${queryString}` : ''}`);
    return response.data || response;
  },

  attendance: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch(`/reports/attendance${queryString ? `?${queryString}` : ''}`);
    return response.data || response;
  },

  leave: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch(`/reports/leave${queryString ? `?${queryString}` : ''}`);
    return response.data || response;
  },

  performance: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch(`/reports/performance${queryString ? `?${queryString}` : ''}`);
    return response.data || response;
  },

  department: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch(`/reports/department${queryString ? `?${queryString}` : ''}`);
    return response.data || response;
  },
};

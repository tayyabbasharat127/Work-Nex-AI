import { apiFetch } from './client';

export const analyticsAPI = {
  getDashboard: async () => {
    const response = await apiFetch('/analytics/dashboard');
    return response.data || response;
  },

  getAttendanceTrends: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch(`/analytics/attendance/trends${queryString ? `?${queryString}` : ''}`);
    return response.data || response;
  },

  getAttendanceHeatmap: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch(`/analytics/attendance/heatmap${queryString ? `?${queryString}` : ''}`);
    return response.data || response;
  },

  getDepartmentAttendance: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch(`/analytics/attendance/department${queryString ? `?${queryString}` : ''}`);
    return response.data || response;
  },

  getLeaveSummary: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch(`/analytics/leave/summary${queryString ? `?${queryString}` : ''}`);
    return response.data || response;
  },

  getLeaveTrends: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch(`/analytics/leave/trends${queryString ? `?${queryString}` : ''}`);
    return response.data || response;
  },

  getLeaveByType: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch(`/analytics/leave/by-type${queryString ? `?${queryString}` : ''}`);
    return response.data || response;
  },

  getHeadcount: async () => {
    const response = await apiFetch('/analytics/workforce/headcount');
    return response.data || response;
  },

  getTurnover: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch(`/analytics/workforce/turnover${queryString ? `?${queryString}` : ''}`);
    return response.data || response;
  },

  getAuditLogs: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch(`/analytics/audit/logs${queryString ? `?${queryString}` : ''}`);
    return response.data || response;
  },

  getPowerBIToken: async () => {
    const response = await apiFetch('/analytics/powerbi/token');
    return response.data || response;
  },

  getAttritionAnalytics: async (month, year) => {
    const params = new URLSearchParams();
    if (month) params.set('month', month);
    if (year) params.set('year', year);
    const qs = params.toString();
    const response = await apiFetch(`/analytics/attrition${qs ? `?${qs}` : ''}`);
    return response.data || response;
  },

  getPowerBIEmbedToken: async () => {
    const response = await apiFetch('/analytics/powerbi/embed-token');
    return response.data || response;
  },

  pushDataToPowerBI: async () => {
    const response = await apiFetch('/analytics/powerbi/push-data', { method: 'POST' });
    return response.data || response;
  },
};

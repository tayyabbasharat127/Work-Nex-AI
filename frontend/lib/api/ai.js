import { apiFetch } from './client';

export const aiAPI = {
  status: async () => {
    const response = await apiFetch('/ai/status');
    return response.data || response;
  },
  chat: async (message) => {
    const response = await apiFetch('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message })
    });
    return response.data || response;
  },

  leaveForecast: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch(`/ai/predict/leave-forecast${queryString ? `?${queryString}` : ''}`);
    return response.data || response;
  },

  attendanceAnomaly: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch(`/ai/predict/attendance-anomaly${queryString ? `?${queryString}` : ''}`);
    return response.data || response;
  },

  attritionRisk: async () => {
    const response = await apiFetch('/ai/predict/attrition-risk');
    return response.data || response;
  },

  predictPerformance: async (employeeId) => {
    const response = await apiFetch('/ai/predict-performance', {
      method: 'POST',
      body: JSON.stringify({ employeeId }),
    });
    return response.data || response;
  },
};

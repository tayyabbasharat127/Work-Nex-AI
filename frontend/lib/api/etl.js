import { apiFetch } from './client';

export const etlAPI = {
  runETL: async (month, year) => {
    const response = await apiFetch('/analytics/etl/run', {
      method: 'POST',
      body: JSON.stringify({ month, year }),
    });
    return response.data || response;
  },

  getLogs: async () => {
    const response = await apiFetch('/analytics/etl/logs');
    return response.data || response;
  },

  getStatus: async () => {
    const response = await apiFetch('/analytics/etl/logs');
    const logs = response.data || response;
    return Array.isArray(logs) ? logs[0] : logs;
  },
};

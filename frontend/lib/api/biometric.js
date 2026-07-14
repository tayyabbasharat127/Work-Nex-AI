import { apiFetch } from './client';

// Biometric Integration API — connect a real attendance device (ZKTeco/
// BioTime) via Database, API, or ADMS, all configured from the admin UI
export const biometricAPI = {
  getIntegration: async () => {
    const response = await apiFetch('/biometric/integration');
    return response.data || response;
  },

  updateIntegration: async (data) => {
    const response = await apiFetch('/biometric/integration', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data || response;
  },

  testConnection: async () => {
    const response = await apiFetch('/biometric/integration/test', { method: 'POST' });
    return response.data || response;
  },

  getDevices: async () => {
    const response = await apiFetch('/biometric/devices');
    return response.data || response;
  },

  createDevice: async (data) => {
    const response = await apiFetch('/biometric/devices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data || response;
  },

  updateDevice: async (id, data) => {
    const response = await apiFetch(`/biometric/devices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data || response;
  },

  deleteDevice: async (id) => {
    const response = await apiFetch(`/biometric/devices/${id}`, { method: 'DELETE' });
    return response.data || response;
  },

  getSyncLogs: async () => {
    const response = await apiFetch('/biometric/sync-logs');
    return response.data || response;
  },
};

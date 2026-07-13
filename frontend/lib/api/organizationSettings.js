import { apiFetch } from './client';

export const organizationSettingsAPI = {
  get: async () => {
    const response = await apiFetch('/settings/organization');
    return response.data || response;
  },

  update: async (settings) => {
    const response = await apiFetch('/settings/organization', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
    return response.data || response;
  },
};

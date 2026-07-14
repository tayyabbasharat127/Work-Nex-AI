import { apiFetch } from './client';

export const performanceAPI = {
  getMy: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch(`/performance/me${queryString ? `?${queryString}` : ''}`);
    return response.data || response;
  },

  getUser: async (userId, params) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch(`/performance/user/${userId}${queryString ? `?${queryString}` : ''}`);
    return response.data || response;
  },

  getTeam: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch(`/performance/team${queryString ? `?${queryString}` : ''}`);
    return response.data || response;
  },

  getLeaderboard: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch(`/performance/leaderboard${queryString ? `?${queryString}` : ''}`);
    return response.data || response;
  },

  getSummary: async (userId) => {
    const response = await apiFetch(`/performance-goals/summary/${userId}`);
    return response.data || response;
  },
};

export const goalsAPI = {
  getMy: async () => {
    const response = await apiFetch('/performance-goals/goals/me');
    return response.data || response;
  },

  getUser: async (userId) => {
    const response = await apiFetch(`/performance-goals/goals/user/${userId}`);
    return response.data || response;
  },

  create: async (data) => {
    const response = await apiFetch('/performance-goals/goals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data || response;
  },

  update: async (id, data) => {
    const response = await apiFetch(`/performance-goals/goals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return response.data || response;
  },

  delete: async (id) => {
    const response = await apiFetch(`/performance-goals/goals/${id}`, { method: 'DELETE' });
    return response.data || response;
  },
};

export const reviewsAPI = {
  getMy: async () => {
    const response = await apiFetch('/performance-goals/reviews/me');
    return response.data || response;
  },

  getUser: async (userId) => {
    const response = await apiFetch(`/performance-goals/reviews/user/${userId}`);
    return response.data || response;
  },

  getTeamStatus: async () => {
    const response = await apiFetch('/performance-goals/reviews/team-status');
    return response.data || response;
  },

  create: async (data) => {
    const response = await apiFetch('/performance-goals/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data || response;
  },

  update: async (id, data) => {
    const response = await apiFetch(`/performance-goals/reviews/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return response.data || response;
  },

  submit: async (id) => {
    const response = await apiFetch(`/performance-goals/reviews/${id}/submit`, { method: 'PATCH' });
    return response.data || response;
  },
};

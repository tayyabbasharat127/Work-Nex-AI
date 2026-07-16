import { apiFetch } from './client';

export const notificationsAPI = {
  getAll: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch(`/notifications${queryString ? `?${queryString}` : ''}`);
    return response.data || response;
  },

  getUnreadCount: async () => {
    const response = await apiFetch('/notifications/unread-count');
    return response.data || response;
  },

  markAsRead: (notificationId) => apiFetch(`/notifications/${notificationId}/read`, {
    method: 'PUT'
  }),

  markAllAsRead: () => apiFetch('/notifications/read-all', {
    method: 'PUT'
  }),

  delete: (notificationId) => apiFetch(`/notifications/${notificationId}`, {
    method: 'DELETE'
  }),

  broadcast: (notificationData) => apiFetch('/notifications/broadcast', {
    method: 'POST',
    body: JSON.stringify(notificationData)
  }),
};

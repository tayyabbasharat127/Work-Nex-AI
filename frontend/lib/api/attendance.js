import { apiFetch } from './client';

export const attendanceAPI = {
  checkIn: async (latitude, longitude) => {
    const response = await apiFetch('/attendance/check-in', {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude })
    });
    return response.data || response;
  },

  checkOut: async () => {
    const response = await apiFetch('/attendance/check-out', { method: 'POST' });
    return response.data || response;
  },

  ping: async () => {
    const response = await apiFetch('/attendance/ping', { method: 'POST' });
    return response.data || response;
  },

  getToday: async () => {
    const response = await apiFetch('/attendance/today');
    return response.data || response;
  },

  getMy: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch(`/attendance/my${queryString ? `?${queryString}` : ''}`);
    // Backend returns { records, meta }
    return response.data?.records || response.records || response.data || response;
  },

  getAll: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch(`/attendance${queryString ? `?${queryString}` : ''}`);
    return response.data || response;
  },

  getSummary: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch(`/attendance/summary${queryString ? `?${queryString}` : ''}`);
    return response.data || response;
  },

  manualEntry: async (userId, date, checkIn, checkOut, status, notes) => {
    const response = await apiFetch('/attendance/manual', {
      method: 'POST',
      body: JSON.stringify({ userId, date, checkIn, checkOut, status, notes }),
    });
    return response.data || response;
  },

  update: async (attendanceId, data) => {
    const response = await apiFetch(`/attendance/${attendanceId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data || response;
  },

  syncFromTMS: async (date) => {
    const response = await apiFetch('/attendance/sync/tms', {
      method: 'POST',
      body: JSON.stringify({ date })
    });
    return response.data || response;
  },

  getHolidays: async () => {
    const response = await apiFetch('/attendance/holidays');
    return response.data || response;
  },

  createHoliday: async (holidayData) => {
    const response = await apiFetch('/attendance/holidays', {
      method: 'POST',
      body: JSON.stringify(holidayData)
    });
    return response.data || response;
  },
};

import { apiFetch } from './client';

// Attendance hours-shortfall report (Faculty-style weekly-hours visibility)
export const hoursShortfallAPI = {
  getAll: async () => {
    const response = await apiFetch('/attendance/hours-shortfall');
    return response.data || response;
  },
};

import { getAuthToken, API_BASE_URL } from './client';

// Alerts API (SSE stream URL builder + REST)
export const alertsAPI = {
  getStreamURL: () => {
    const token = getAuthToken();
    return `${API_BASE_URL}/alerts/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },
};

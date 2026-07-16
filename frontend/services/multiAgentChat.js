import { getAuthToken } from '@/lib/api';

const MULTI_AGENT_API_URL = (
  process.env.NEXT_PUBLIC_MULTI_AGENT_API_URL || 'http://127.0.0.1:8010'
).replace(/\/$/, '');

export const multiAgentChat = {
  async sendMessage(message, threadId) {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Your session token is not available. Please log in again before using the agent.');
    }

    const response = await fetch(`${MULTI_AGENT_API_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        message,
        threadId,
      }),
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(data.message || data.error || `Agent request failed with HTTP ${response.status}`);
    }

    return data;
  },
};

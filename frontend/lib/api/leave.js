import { apiFetch, getAuthToken, API_BASE_URL } from './client';

export const leaveAPI = {
  apply: async (leaveData) => {
    const response = await apiFetch('/leave', {
      method: 'POST',
      body: JSON.stringify(leaveData),
    });
    return response.data || response;
  },

  getMy: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch(`/leave/my${queryString ? `?${queryString}` : ''}`);
    return response.data || response;
  },

  getPending: async () => {
    const response = await apiFetch('/leave/pending');
    return response.data || response;
  },

  getAll: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch(`/leave${queryString ? `?${queryString}` : ''}`);
    return response.data || response;
  },

  getById: async (leaveId) => {
    const response = await apiFetch(`/leave/${leaveId}`);
    return response.data || response;
  },

  approve: (leaveId, approverNote) => apiFetch(`/leave/${leaveId}/approve`, {
    method: 'PUT',
    body: JSON.stringify({ note: approverNote }),
  }),

  reject: (leaveId, approverNote) => apiFetch(`/leave/${leaveId}/reject`, {
    method: 'PUT',
    body: JSON.stringify({ note: approverNote }),
  }),

  cancel: (leaveId) => apiFetch(`/leave/${leaveId}/cancel`, {
    method: 'PUT'
  }),

  getMyBalances: async () => {
    const response = await apiFetch('/leave/balances/me');
    return response.data || response;
  },

  getUserBalances: async (userId) => {
    const response = await apiFetch(`/leave/balances/${userId}`);
    return response.data || response;
  },

  getSummaryForUser: async (userId) => {
    const response = await apiFetch(`/leave/summary/${userId}`);
    return response.data || response;
  },

  getPolicies: async () => {
    const response = await apiFetch('/leave/policies/all');
    return response.data || response;
  },

  uploadPolicyDocument: async (file) => {
    const token = getAuthToken();
    const formData = new FormData();
    formData.append('document', file);
    const response = await fetch(`${API_BASE_URL}/leave/policy-documents/upload`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Policy upload failed');
    return data.data || data;
  },

  extractPolicyDocument: async (documentId) => {
    const response = await apiFetch(`/leave/policy-documents/${documentId}/extract`, { method: 'POST' });
    return response.data || response;
  },

  aiParsePolicyDocument: async (documentId) => {
    const response = await apiFetch(`/leave/policy-documents/${documentId}/ai-parse`, { method: 'POST' });
    return response.data || response;
  },

  approvePolicyRules: async (documentId, rules) => {
    const response = await apiFetch(`/leave/policy-documents/${documentId}/approve-rules`, {
      method: 'PUT',
      body: JSON.stringify(rules || {}),
    });
    return response.data || response;
  },

  saveManualPolicyRules: async (leavePolicies) => {
    const response = await apiFetch('/leave/policies/manual', {
      method: 'PUT',
      body: JSON.stringify({ leavePolicies }),
    });
    return response.data || response;
  },

  getActivePolicyVersion: async () => {
    const response = await apiFetch('/leave/policies/active');
    return response.data || response;
  },

  getTypeLabels: async () => {
    const response = await apiFetch('/leave/type-labels');
    return response.data || response;
  },

  evaluate: async (leaveId) => {
    const response = await apiFetch(`/leave/${leaveId}/evaluate`, { method: 'POST' });
    return response.data || response;
  },

  getDecisionExplanation: async (leaveId) => {
    const response = await apiFetch(`/leave/${leaveId}/decision-explanation`);
    return response.data || response;
  },
};

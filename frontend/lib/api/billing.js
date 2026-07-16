import { apiFetch, setTokens } from './client';

export const billingAPI = {
  getPlans: async () => {
    const response = await apiFetch('/billing/plans');
    return response.data || response;
  },

  registerOrganization: (orgData) => apiFetch('/billing/register', {
    method: 'POST',
    body: JSON.stringify(orgData)
  }),

  startRegistration: async (ownerData) => {
    const response = await apiFetch('/billing/register/start', {
      method: 'POST',
      body: JSON.stringify(ownerData),
    });
    return response.data || response;
  },

  resendVerification: async (registrationId) => {
    const response = await apiFetch('/billing/register/resend', {
      method: 'POST',
      body: JSON.stringify({ registrationId }),
    });
    return response.data || response;
  },

  verifyRegistrationEmail: async (registrationId, code) => {
    const response = await apiFetch('/billing/register/verify', {
      method: 'POST',
      body: JSON.stringify({ registrationId, code }),
    });
    return response.data || response;
  },

  completeRegistration: async (workspaceData) => {
    const response = await apiFetch('/billing/register/complete', {
      method: 'POST',
      body: JSON.stringify(workspaceData),
    });
    const data = response.data || response;
    if (!data.accessToken || !data.user) throw new Error('Registration completed without a valid session');
    setTokens(data.accessToken, data.refreshToken);
    if (typeof window !== 'undefined') localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  },

  subscribe: (subscriptionData) => apiFetch('/billing/subscribe', {
    method: 'POST',
    body: JSON.stringify(subscriptionData)
  }),

  upgrade: (upgradeData) => apiFetch('/billing/upgrade', {
    method: 'POST',
    body: JSON.stringify(upgradeData)
  }),

  getSubscription: async (orgId) => {
    const response = await apiFetch(`/billing/${orgId}/subscription`);
    return response.data || response;
  },

  getInvoices: async (orgId) => {
    const response = await apiFetch(`/billing/${orgId}/invoices`);
    return response.data || response;
  },

  checkEmployeeLimit: async (orgId) => {
    const response = await apiFetch(`/billing/${orgId}/employee-limit`);
    return response.data || response;
  },

  cancelSubscription: (orgId) => apiFetch(`/billing/${orgId}/cancel`, {
    method: 'POST'
  }),
};

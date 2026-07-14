import { apiFetch } from './client';

export const billingAPI = {
  getPlans: async () => {
    const response = await apiFetch('/billing/plans');
    return response.data || response;
  },

  registerOrganization: (orgData) => apiFetch('/billing/register', {
    method: 'POST',
    body: JSON.stringify(orgData)
  }),

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

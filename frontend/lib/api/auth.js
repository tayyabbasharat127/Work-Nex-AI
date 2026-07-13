import { apiFetch, setTokens, clearTokens, setPending2FAUserId, clearPending2FA } from './client';

export const authAPI = {
  register: (userData) => {
    // Backend expects: email, password, firstName, lastName, employeeId, role
    const registerData = {
      email: userData.email,
      password: userData.password,
      firstName: userData.firstName || userData.first_name,
      lastName: userData.lastName || userData.last_name,
      employeeId: userData.employeeId || userData.employee_id,
      role: userData.role || 'EMPLOYEE',
      departmentId: userData.departmentId,
      managerId: userData.managerId,
      designation: userData.designation,
      phone: userData.phone
    };

    return apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify(registerData),
    });
  },

  // Alias for backward compatibility - handles both employee and organization registration
  signup: async function(userData) {
    // Check if this is organization registration (has organization_name)
    if (userData.organization_name || userData.orgName) {
      // Split admin_name into firstName and lastName
      const [firstName, ...lastNameParts] = (userData.admin_name || '').split(' ');
      const lastName = lastNameParts.join(' ') || 'User';

      const orgData = {
        orgName: userData.organization_name || userData.orgName,
        ownerEmail: userData.admin_email || userData.ownerEmail,
        ownerPassword: userData.password,
        ownerFirstName: firstName || 'Admin',
        ownerLastName: lastName,
        industry: userData.industry || 'Technology',
        country: userData.country || 'Pakistan',
        phone: userData.phone,
        website: userData.company_domain ? `https://${userData.company_domain}` : undefined,
        planType: userData.subscription_plan || userData.planType,
      };

      try {
        return await apiFetch('/billing/register', {
          method: 'POST',
          body: JSON.stringify(orgData),
        });
      } catch (error) {
        console.error('Organization registration failed:', error);
        throw error;
      }
    } else {
      // Employee registration
      return this.register(userData);
    }
  },

  verifyOTP: (email, otp) => apiFetch('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  }),

  login: async (email, password) => {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    // Backend returns either tokens+user or { requires2FA, userId } in data.
    if (data.data?.requires2FA && data.data?.userId) {
      clearTokens();
      setPending2FAUserId(data.data.userId);
    } else if (data.data && data.data.accessToken) {
      clearPending2FA();
      setTokens(data.data.accessToken, data.data.refreshToken);
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(data.data.user));
      }
    }

    return data;
  },

  superAdminLogin: async (email, password) => {
    const data = await authAPI.login(email, password);
    if (data.data?.requires2FA) {
      return data;
    }

    const user = data.data?.user || data.user;

    if (user?.role !== 'SUPER_ADMIN') {
      clearTokens();
      throw new Error('Super admin access required');
    }

    return data;
  },

  forgotPassword: (email) => apiFetch('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  }),

  resetPassword: (token, newPassword) => apiFetch('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  }),

  changePassword: (oldPassword, newPassword) => apiFetch('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ oldPassword, newPassword }),
  }),

  setup2FA: () => apiFetch('/auth/2fa/setup', {
    method: 'POST',
  }),

  verify2FA: (token) => apiFetch('/auth/2fa/verify', {
    method: 'POST',
    body: JSON.stringify({ token }),
  }),

  disable2FA: (token) => apiFetch('/auth/2fa/disable', {
    method: 'POST',
    body: JSON.stringify({ token }),
  }),

  validate2FA: async (userId, token) => {
    const response = await apiFetch('/auth/2fa/validate', {
      method: 'POST',
      body: JSON.stringify({ userId, token }),
    });

    const accessToken = response.data?.accessToken;
    if (!accessToken) {
      throw new Error('2FA validation response missing access token');
    }

    setTokens(accessToken);
    let user;
    try {
      const userResponse = await apiFetch('/users/me', { skipAuthRefresh: true });
      user = userResponse.data || userResponse;
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(user));
      }
    } catch (error) {
      clearTokens();
      throw error;
    }
    clearPending2FA();

    return {
      ...response,
      data: {
        ...response.data,
        user,
      },
    };
  },

  logout: async () => {
    const storedRefreshToken = typeof window !== 'undefined'
      ? localStorage.getItem('refreshToken')
      : null;
    try {
      await apiFetch('/auth/logout', {
        method: 'POST',
        skipAuthRefresh: true,
        body: JSON.stringify({ refreshToken: storedRefreshToken }),
      });
    } catch {
      // Local logout should still complete if the server session is already invalid.
    } finally {
      clearTokens();
    }
  },
};

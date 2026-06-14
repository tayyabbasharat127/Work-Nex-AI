// API Configuration and Base Setup
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
let inMemoryAccessToken = null;

// Helper function to get auth token
export const getAuthToken = () => {
  return inMemoryAccessToken;
};

// Helper function to set tokens
const setTokens = (token) => {
  inMemoryAccessToken = token || null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
  }
};

const setPending2FAUserId = (userId) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('pending2FAUserId', userId);
  }
};

const getPending2FAUserId = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('pending2FAUserId');
  }
  return null;
};

const clearPending2FA = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('pending2FAUserId');
  }
};

// Helper function to clear tokens
const clearTokens = () => {
  inMemoryAccessToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('pending2FAUserId');
  }
};

// Base fetch wrapper with error handling
async function apiFetch(endpoint, options = {}) {
  const token = getAuthToken();
  const { skipAuthRefresh = false, ...fetchOptions } = options;
  
  const config = {
    ...fetchOptions,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...fetchOptions.headers,
    },
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    // Handle 401 Unauthorized - try to refresh token
    if (response.status === 401 && !skipAuthRefresh && endpoint !== '/auth/refresh-token') {
      {
        try {
          const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          });
          
          if (refreshResponse.ok) {
            const refreshJson = await refreshResponse.json();
            const newToken = refreshJson.data?.accessToken || refreshJson.accessToken || refreshJson.token;
            if (!newToken) {
              throw new Error('Token refresh response missing access token');
            }
            setTokens(newToken);
            
            // Retry original request with new token
            config.headers.Authorization = `Bearer ${newToken}`;
            const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, config);
            const retryData = await retryResponse.json();
            
            if (!retryResponse.ok) {
              throw new Error(retryData.message || 'Request failed');
            }
            
            return retryData;
          } else {
            clearTokens();
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
          }
        } catch (error) {
          clearTokens();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          throw error;
        }
      }
    }

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || data.error || 'Something went wrong');
    }
    
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Auth API
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
        website: userData.company_domain ? `https://${userData.company_domain}` : undefined
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
      setTokens(data.data.accessToken);
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
    const token = getAuthToken();
    try {
      if (token) {
        await apiFetch('/auth/logout', {
          method: 'POST',
          skipAuthRefresh: true,
        });
      }
    } catch {
      // Local logout should still complete if the server session is already invalid.
    } finally {
      clearTokens();
    }
  },
};

// Attendance API
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

// Leave API
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

  evaluate: async (leaveId) => {
    const response = await apiFetch(`/leave/${leaveId}/evaluate`, { method: 'POST' });
    return response.data || response;
  },

  getDecisionExplanation: async (leaveId) => {
    const response = await apiFetch(`/leave/${leaveId}/decision-explanation`);
    return response.data || response;
  },
};

// User API
export const userAPI = {
  getMe: async () => {
    const response = await apiFetch('/users/me');
    return response.data || response;
  },
  
  updateMe: async (userData) => {
    const response = await apiFetch('/users/me', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
    return response.data || response;
  },
  
  getAll: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch(`/users${queryString ? `?${queryString}` : ''}`);
    return response.data || response;
  },
  
  getById: async (userId) => {
    const response = await apiFetch(`/users/${userId}`);
    return response.data || response;
  },
  
  create: async (userData) => {
    // Transform frontend data to backend format
    const [firstName, ...lastNameParts] = (userData.name || '').split(' ');
    const lastName = lastNameParts.join(' ') || 'User';
    
    // Map role_id to role string
    const roleMap = {
      1: 'ADMIN',
      2: 'MANAGER',
      3: 'EMPLOYEE',
      0: 'SUPER_ADMIN'
    };
    
    // Generate employeeId if not provided
    const employeeId = userData.employeeId || `EMP-${Date.now().toString().slice(-6)}`;
    
    // Validate required fields before sending
    if (!userData.email || !userData.email.trim()) {
      throw new Error('Email is required');
    }
    
    // Helper function to convert to string or return undefined (not null, not empty string)
    const toStringOrUndefined = (value) => {
      if (!value || value === '' || value === 'null' || value === 'undefined') {
        return undefined;
      }
      return String(value);
    };
    
    const backendData = {
      email: userData.email.trim(),
      firstName: userData.firstName || firstName || 'User',
      lastName: userData.lastName || lastName,
      employeeId: employeeId,
      role: userData.role || roleMap[userData.role_id] || 'EMPLOYEE',
    };
    
    // Only add optional fields if they have valid values
    const departmentId = toStringOrUndefined(userData.departmentId || userData.department_id);
    if (departmentId) backendData.departmentId = departmentId;
    
    const managerId = toStringOrUndefined(userData.managerId || userData.manager_id);
    if (managerId) backendData.managerId = managerId;
    
    const designation = userData.designation?.trim();
    if (designation) backendData.designation = designation;
    
    const phone = userData.phone?.trim();
    if (phone) backendData.phone = phone;
    
    const joiningDate = userData.joiningDate?.trim();
    if (joiningDate) backendData.joiningDate = joiningDate;
    
    // Include password if provided (optional - backend will auto-generate if not provided)
    const password = userData.password?.trim();
    if (password) backendData.password = password;
    
    console.log('Creating user with data:', backendData);
    
    const response = await apiFetch('/users', {
      method: 'POST',
      body: JSON.stringify(backendData),
    });
    return response.data || response;
  },
  
  update: async (userId, userData) => {
    // Transform frontend data to backend format
    const updateData = {};
    
    // Handle name splitting if provided
    if (userData.name) {
      const [firstName, ...lastNameParts] = userData.name.split(' ');
      updateData.firstName = firstName || 'User';
      updateData.lastName = lastNameParts.join(' ') || 'User';
    }
    
    // Map role_id to role string if provided
    if (userData.role_id !== undefined) {
      const roleMap = {
        1: 'ADMIN',
        2: 'MANAGER',
        3: 'EMPLOYEE',
        0: 'SUPER_ADMIN'
      };
      updateData.role = roleMap[userData.role_id] || 'EMPLOYEE';
    }
    
    // Map other fields
    if (userData.email) updateData.email = userData.email;
    if (userData.firstName) updateData.firstName = userData.firstName;
    if (userData.lastName) updateData.lastName = userData.lastName;
    if (userData.employeeId) updateData.employeeId = userData.employeeId;
    if (userData.role) updateData.role = userData.role;
    
    // Convert IDs to strings (UUIDs)
    if (userData.departmentId || userData.department_id) {
      const deptId = userData.departmentId || userData.department_id;
      updateData.departmentId = deptId && deptId !== '' ? String(deptId) : null;
    }
    
    if (userData.managerId || userData.manager_id) {
      const mgrId = userData.managerId || userData.manager_id;
      updateData.managerId = mgrId && mgrId !== '' ? String(mgrId) : null;
    }
    
    if (userData.designation !== undefined) updateData.designation = userData.designation || null;
    if (userData.phone !== undefined) updateData.phone = userData.phone || null;
    if (userData.joiningDate !== undefined) updateData.joiningDate = userData.joiningDate || null;
    
    // Handle status -> isActive conversion
    if (userData.status !== undefined) {
      updateData.isActive = userData.status === 'Active';
    }
    
    const response = await apiFetch(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
    return response.data || response;
  },
  
  deactivate: (userId) => apiFetch(`/users/${userId}`, { 
    method: 'DELETE' 
  }),
  
  getByDepartment: async (deptId) => {
    const response = await apiFetch(`/users/department/${deptId}`);
    return response.data || response;
  },
};

// Department API
export const departmentAPI = {
  getAll: async () => {
    const response = await apiFetch('/users/departments/all');
    return response.data || response;
  },
  
  create: async (departmentData) => {
    const response = await apiFetch('/users/departments', {
      method: 'POST',
      body: JSON.stringify(departmentData),
    });
    return response.data || response;
  },

  update: async (departmentId, departmentData) => {
    const response = await apiFetch(`/users/departments/${departmentId}`, {
      method: 'PUT',
      body: JSON.stringify(departmentData),
    });
    return response.data || response;
  },

  delete: async (departmentId) => {
    const response = await apiFetch(`/users/departments/${departmentId}`, { method: 'DELETE' });
    return response.data || response;
  },
};

// Analytics API
export const analyticsAPI = {
  getDashboard: async () => {
    const response = await apiFetch('/analytics/dashboard');
    return response.data || response;
  },
  
  getAttendanceTrends: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch(`/analytics/attendance/trends${queryString ? `?${queryString}` : ''}`);
    return response.data || response;
  },
  
  getAttendanceHeatmap: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch(`/analytics/attendance/heatmap${queryString ? `?${queryString}` : ''}`);
    return response.data || response;
  },
  
  getDepartmentAttendance: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch(`/analytics/attendance/department${queryString ? `?${queryString}` : ''}`);
    return response.data || response;
  },
  
  getLeaveSummary: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch(`/analytics/leave/summary${queryString ? `?${queryString}` : ''}`);
    return response.data || response;
  },
  
  getLeaveTrends: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch(`/analytics/leave/trends${queryString ? `?${queryString}` : ''}`);
    return response.data || response;
  },
  
  getLeaveByType: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch(`/analytics/leave/by-type${queryString ? `?${queryString}` : ''}`);
    return response.data || response;
  },
  
  getHeadcount: async () => {
    const response = await apiFetch('/analytics/workforce/headcount');
    return response.data || response;
  },
  
  getTurnover: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch(`/analytics/workforce/turnover${queryString ? `?${queryString}` : ''}`);
    return response.data || response;
  },

  getAuditLogs: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch(`/analytics/audit/logs${queryString ? `?${queryString}` : ''}`);
    return response.data || response;
  },

  getPowerBIToken: async () => {
    const response = await apiFetch('/analytics/powerbi/token');
    return response.data || response;
  },

  getPowerBIEmbedToken: async () => {
    const response = await apiFetch('/analytics/powerbi/embed-token');
    return response.data || response;
  },

  pushDataToPowerBI: async () => {
    const response = await apiFetch('/analytics/powerbi/push-data', { method: 'POST' });
    return response.data || response;
  },
};

// Reports API
export const reportsAPI = {
  generate: async (reportData) => {
    const response = await apiFetch('/reports/generate', {
    method: 'POST',
    body: JSON.stringify(reportData),
    });
    return response.data || response;
  },
  
  getAll: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch(`/reports${queryString ? `?${queryString}` : ''}`);
    return response.data || response;
  },

  attendance: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch(`/reports/attendance${queryString ? `?${queryString}` : ''}`);
    return response.data || response;
  },

  leave: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch(`/reports/leave${queryString ? `?${queryString}` : ''}`);
    return response.data || response;
  },

  performance: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch(`/reports/performance${queryString ? `?${queryString}` : ''}`);
    return response.data || response;
  },

  department: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch(`/reports/department${queryString ? `?${queryString}` : ''}`);
    return response.data || response;
  },
};

// Billing API
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

// AI API
export const aiAPI = {
  chat: async (message) => {
    const response = await apiFetch('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message })
    });
    return response.data || response;
  },
  
  leaveForecast: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch(`/ai/predict/leave-forecast${queryString ? `?${queryString}` : ''}`);
    return response.data || response;
  },
  
  attendanceAnomaly: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch(`/ai/predict/attendance-anomaly${queryString ? `?${queryString}` : ''}`);
    return response.data || response;
  },
  
  attritionRisk: async () => {
    const response = await apiFetch('/ai/predict/attrition-risk');
    return response.data || response;
  },

  predictPerformance: async (employeeId) => {
    const response = await apiFetch('/ai/predict-performance', {
      method: 'POST',
      body: JSON.stringify({ employeeId }),
    });
    return response.data || response;
  },
};

// Organization Settings API
export const organizationSettingsAPI = {
  get: () => apiFetch('/settings/organization'),
  
  update: (settings) => apiFetch('/settings/organization', {
    method: 'PUT',
    body: JSON.stringify(settings),
  }),
};

// Notifications API (if you have notification routes)
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

// Performance API
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
};

// ETL API
export const etlAPI = {
  runETL: async (month, year) => {
    const response = await apiFetch('/analytics/etl/run', {
      method: 'POST',
      body: JSON.stringify({ month, year }),
    });
    return response.data || response;
  },
  
  getLogs: async () => {
    const response = await apiFetch('/analytics/etl/logs');
    return response.data || response;
  },
  
  getStatus: async () => {
    const response = await apiFetch('/analytics/etl/logs');
    const logs = response.data || response;
    return Array.isArray(logs) ? logs[0] : logs;
  },
};

// Export utility functions
export { getAuthToken, getPending2FAUserId, clearPending2FA, clearTokens, setTokens };

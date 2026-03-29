// API Configuration and Base Setup
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Helper function to get auth token
const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

// Helper function to get refresh token
const getRefreshToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('refreshToken');
  }
  return null;
};

// Helper function to set tokens
const setTokens = (token, refreshToken) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token);
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
  }
};

// Helper function to clear tokens
const clearTokens = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }
};

// Base fetch wrapper with error handling
async function apiFetch(endpoint, options = {}) {
  const token = getAuthToken();
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    // Handle 401 Unauthorized - try to refresh token
    if (response.status === 401 && token) {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        try {
          const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });
          
          if (refreshResponse.ok) {
            const { token: newToken, refreshToken: newRefreshToken } = await refreshResponse.json();
            setTokens(newToken, newRefreshToken);
            
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
      } else {
        clearTokens();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
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
  signup: (userData) => {
    // Ensure userData has the correct field names for backend
    const signupData = {
      admin_name: userData.admin_name || userData.name,
      admin_email: userData.admin_email || userData.email,
      password: userData.password,
      organization_name: userData.organization_name || userData.organizationName || 'My Organization',
      subscription_plan: userData.subscription_plan || 'Basic'
    };
    
    return apiFetch('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(signupData),
    });
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
    
    if (data.token) {
      setTokens(data.token, data.refreshToken);
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
    }
    
    return data;
  },
  
  superAdminLogin: async (email, password) => {
    const data = await apiFetch('/auth/superadmin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (data.token) {
      setTokens(data.token, data.refreshToken);
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
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
  
  changePassword: (oldPassword, newPassword) => apiFetch('/auth/changePassword', {
    method: 'POST',
    body: JSON.stringify({ oldPassword, newPassword }),
  }),
  
  logout: () => {
    clearTokens();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },
};

// Attendance API
export const attendanceAPI = {
  checkIn: () => apiFetch('/attendance/check-in', { method: 'POST' }),
  
  checkOut: () => apiFetch('/attendance/check-out', { method: 'POST' }),
  
  ping: () => apiFetch('/attendance/ping', { method: 'POST' }),
  
  getTodayStatus: () => apiFetch('/attendance/today-status'),
  
  getHistory: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return apiFetch(`/attendance/history${queryString ? `?${queryString}` : ''}`);
  },
  
  getOverview: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return apiFetch(`/attendance/overview${queryString ? `?${queryString}` : ''}`);
  },
  
  manualMark: (userId, date, checkIn, checkOut, status) => apiFetch('/attendance/manual-mark', {
    method: 'POST',
    body: JSON.stringify({ userId, date, checkIn, checkOut, status }),
  }),
  
  adjust: (attendanceId, checkIn, checkOut, status) => apiFetch('/attendance/adjust', {
    method: 'PUT',
    body: JSON.stringify({ attendanceId, checkIn, checkOut, status }),
  }),
  
  triggerAutoCheckout: () => apiFetch('/attendance/trigger-auto-checkout', { method: 'POST' }),
};

// Leave API
export const leaveAPI = {
  create: async (leaveData) => {
    const response = await apiFetch('/leaves', {
      method: 'POST',
      body: JSON.stringify(leaveData),
    });
    // Return the leave object from response
    return response.leave || response.data || response;
  },
  
  getMyLeaves: async () => {
    const response = await apiFetch('/leaves/my');
    // Extract leaves array from response
    return response.leaves || response.data || response;
  },
  
  getAllLeaves: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch(`/leaves${queryString ? `?${queryString}` : ''}`);
    // Extract leaves array from response
    return response.leaves || response.data || response;
  },
  
  updateStatus: (leaveId, status, remarks) => apiFetch(`/leaves/${leaveId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status, remarks }),
  }),
  
  delete: (leaveId) => apiFetch(`/leaves/${leaveId}`, { method: 'DELETE' }),
};

// User API
export const userAPI = {
  create: async (userData) => {
    const response = await apiFetch('/users/createuser', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    return response.data || response;
  },
  
  getUsers: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiFetch(`/users/getuser${queryString ? `?${queryString}` : ''}`);
    // Extract users array from response
    return response.data || response;
  },
  
  update: (userId, userData) => apiFetch(`/users/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(userData),
  }),
  
  delete: (userId) => apiFetch(`/users/users/${userId}`, { method: 'DELETE' }),
};

// Department API
export const departmentAPI = {
  getAll: async () => {
    const response = await apiFetch('/departments');
    // Extract departments array from response
    return response.data || response;
  },
  
  create: async (departmentData) => {
    const response = await apiFetch('/departments', {
      method: 'POST',
      body: JSON.stringify(departmentData),
    });
    return response.data || response;
  },
  
  update: async (departmentId, departmentData) => {
    const response = await apiFetch(`/departments/${departmentId}`, {
      method: 'PUT',
      body: JSON.stringify(departmentData),
    });
    return response.data || response;
  },
  
  delete: (departmentId) => apiFetch(`/departments/${departmentId}`, { method: 'DELETE' }),
};

// Analytics API
export const analyticsAPI = {
  getKPIs: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return apiFetch(`/analytics/kpis${queryString ? `?${queryString}` : ''}`);
  },
  
  getTrends: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return apiFetch(`/analytics/trends${queryString ? `?${queryString}` : ''}`);
  },
  
  getDepartmentAnalytics: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return apiFetch(`/analytics/departments${queryString ? `?${queryString}` : ''}`);
  },
};

// Reports API
export const reportsAPI = {
  generate: (reportData) => apiFetch('/reports/generate', {
    method: 'POST',
    body: JSON.stringify(reportData),
  }),
  
  getAll: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return apiFetch(`/reports${queryString ? `?${queryString}` : ''}`);
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
  getAll: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return apiFetch(`/notifications${queryString ? `?${queryString}` : ''}`);
  },
};

// Export utility functions
export { getAuthToken, clearTokens, setTokens };

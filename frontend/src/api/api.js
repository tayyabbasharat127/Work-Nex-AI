import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000",
  headers: { "Content-Type": "application/json" },
  // withCredentials: true, // enable ONLY if backend uses cookies/sessions
});

api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log detailed error information
    console.log('=== API Error Details ===');
    console.log('Error:', error.message);
    console.log('Code:', error.code);
    console.log('Status:', error.response?.status);
    console.log('Network Error:', error.code === 'NETWORK_ERROR' || error.code === 'ECONNREFUSED');

    // Check for network errors (WiFi disconnect)
    if (error.code === 'NETWORK_ERROR' ||
      error.code === 'ECONNREFUSED' ||
      error.message?.includes('Network Error') ||
      !window.navigator.onLine) {
      console.log('📶 Network disconnected detected in API interceptor');

      // Trigger custom event for network disconnect
      window.dispatchEvent(new CustomEvent('network-disconnect'));
    }

    return Promise.reject(error);
  }
);


// Authentication
export const signupApi = (payload) =>
  api.post("/api/auth/signup", payload);
export const loginApi = (payload) =>
  api.post("/api/auth/login", payload);
export const superAdminLoginApi = (payload) =>
  api.post("/api/auth/superadmin/login", payload);
export const forgotPasswordApi = (payload) =>
  api.post("/api/auth/forgot-password", payload);
export const verifyOtpApi = (payload) =>
  api.post("/api/auth/verify-otp", payload);
export const resetPasswordApi = (payload) =>
  api.post("/api/auth/reset-password", payload);
export const changePasswordApi = (payload) =>
  api.post("/api/auth/changePassword", payload);

// Admin Users CRUD
// Create user API Admin
export const createUserApi = (payload) => api.post("/api/users/createuser", payload);
export const getUserApi = (params = {}) => api.get("/api/users/getuser", { params });
export const updateUserApi = (id, payload) =>
  api.put(`/api/users/users/${id}`, payload);
export const deleteUserApi = (id) => api.delete(`/api/users/users/${id}`);

export const createLeaveApi = (payload) => api.post("/api/leaves", payload);

// Get my leaves (Employee)
export const getMyLeavesApi = () => api.get("/api/leaves/my");

// Delete my leave (Employee)


// POST /api/attendance/check-in
export const checkInApi = (payload = {}) => {
  console.log("check in clicked", payload);
  return api.post("/api/attendance/check-in", payload);
};

// POST /api/attendance/check-out
export const checkOutApi = (payload = {}) =>
  api.post("/api/attendance/check-out", payload);

// POST /api/attendance/ping
export const getDeviceId = () => {
  let id = localStorage.getItem("device_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("device_id", id);
  }
  return id;
};

export const pingApi = (payload = {}) => {
  const deviceId = payload.deviceId || getDeviceId();
  return api.post("/api/attendance/ping", {
    deviceId,
    wifiMacAddress: payload.wifiMacAddress || null
  });
};
// GET /api/attendance/today-status
export const todayStatusApi = () =>
  api.get("/api/attendance/today-status");

// GET /api/attendance/history?from=2026-01-01&to=2026-01-31&page=1&limit=10
export const historyApi = (params = {}) =>
  api.get("/api/attendance/history", { params });

export const getAttendanceOverviewApi = (params = {}) =>
  api.get("/api/attendance/overview", { params });

export const getAllLeavesApi = () => api.get("/api/leaves");
// OR if your backend route is different, match it exactly (examples below)

// 2) PUT update leave status
export const updateLeaveStatusApi = (leaveId, payload) =>
  api.put(`/api/leaves/${leaveId}/status`, payload);

// 3) DELETE leave
export const deleteLeaveApi = (leaveId) =>
  api.delete(`/api/leaves/${leaveId}`);

// Leave Balance API
export const getLeaveBalanceApi = () => api.get("/api/leaves/balance");

// Department Management APIs
export const getAllDepartmentsApi = () => api.get("/api/departments");
export const createDepartmentApi = (payload) => api.post("/api/departments", payload);
export const updateDepartmentApi = (id, payload) => api.put(`/api/departments/${id}`, payload);
export const deleteDepartmentApi = (id) => api.delete(`/api/departments/${id}`);

// Notification APIs
export const getNotificationsApi = (params = {}) => api.get("/api/notifications", { params });
export const sendNotificationApi = (payload) => api.post("/api/notifications/send", payload);
export const markNotificationReadApi = (id) => api.put(`/api/notifications/read/${id}`);

// Analytics APIs
export const getKPIsApi = (params = {}) => api.get("/api/analytics/kpis", { params });
export const getTrendsApi = (params = {}) => api.get("/api/analytics/trends", { params });
export const getDepartmentAnalyticsApi = () => api.get("/api/analytics/departments");

// Reports APIs
export const generateReportApi = (payload) => api.post("/api/reports/generate", payload);
export const getReportsApi = () => api.get("/api/reports");

export default api;


// Organization Settings APIs
export const getOrganizationSettingsApi = () => api.get("/api/settings/organization");
export const updateOrganizationSettingsApi = (payload) => api.put("/api/settings/organization", payload);

// Manual Attendance APIs
export const manualMarkAttendanceApi = (payload) => api.post("/api/attendance/manual-mark", payload);
export const adjustAttendanceApi = (payload) => api.put("/api/attendance/adjust", payload);


// Super Admin APIs


// Analytics API
export const getOrganizationGrowthApi = () => api.get("/api/analytics/organization-growth");
export const getRevenueByTierApi = () => api.get("/api/analytics/revenue-by-tier");
export const getFeatureUsageStatsApi = () => api.get("/api/analytics/feature-usage");
export const getLicenseUtilizationApi = () => api.get("/api/analytics/license-utilization");
export const getExpiryTrackingApi = () => api.get("/api/analytics/expiry-tracking");



// Subscription Management API
export const getAllOrganizationsApi = () => api.get("/api/organizations"); // Added API for fetching all organizations
export const updateOrganizationSubscriptionApi = (orgId, payload) =>
  api.put(`/api/organizations/${orgId}/update-subscription`, payload);


export const getOrganizationApi = (orgId) => api.get(`/api/organizations/${orgId}`);
export const updateOrganizationStatusApi = (orgId, payload) =>
  api.patch(`/api/organizations/${orgId}/status`, payload);
export const renewSubscriptionApi = (orgId) =>
  api.post(`/api/organizations/${orgId}/renew-subscription`);
export const upgradeDowngradeTierApi = (orgId, payload) =>
  api.patch(`/api/organizations/${orgId}/update-tier`, payload);
export const manageLicensesApi = (orgId, payload) =>
  api.patch(`/api/organizations/${orgId}/manage-licenses`, payload);
export const suspendActivateOrganizationApi = (orgId, status) =>
  api.patch(`/api/organizations/${orgId}/status`, { status });


export const getAllUsersApi = (params = {}) =>
  api.get("/api/users", { params });

// ✅ Update user role (Admin / Super Admin)
export const updateUserRoleApi = (userId, payload) =>
  api.patch(`/api/users/${userId}/role`, payload);

export {
  getAllOrganizationsApi,
  updateOrganizationStatusApi,
  renewSubscriptionApi,
  upgradeDowngradeTierApi,
  // manageLicensesApi missing
};


import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1",
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
  api.post("/auth/register", payload);
export const loginApi = (payload) =>
  api.post("/auth/login", payload);
export const superAdminLoginApi = (payload) =>
  api.post("/auth/login", payload); // Same endpoint, role determined by credentials
export const forgotPasswordApi = (payload) =>
  api.post("/auth/forgot-password", payload);
export const verifyOtpApi = (payload) =>
  api.post("/auth/verify-otp", payload);
export const resetPasswordApi = (payload) =>
  api.post("/auth/reset-password", payload);
export const changePasswordApi = (payload) =>
  api.post("/auth/change-password", payload);

// Admin Users CRUD
export const createUserApi = (payload) => api.post("/users", payload);
export const getUserApi = (params = {}) => api.get("/users", { params });
export const updateUserApi = (id, payload) =>
  api.put(`/users/${id}`, payload);
export const deleteUserApi = (id) => api.delete(`/users/${id}`);

// Leave APIs (note: backend uses singular "leave" not "leaves")
export const createLeaveApi = (payload) => api.post("/leave", payload);
export const getMyLeavesApi = () => api.get("/leave/my");
export const getAllLeavesApi = () => api.get("/leave");
export const updateLeaveStatusApi = (leaveId, payload) =>
  api.put(`/leave/${leaveId}/status`, payload);
export const deleteLeaveApi = (leaveId) =>
  api.delete(`/leave/${leaveId}`);
export const getLeaveBalanceApi = () => api.get("/leave/balance");
// Attendance APIs
export const checkInApi = (payload = {}) => {
  console.log("check in clicked", payload);
  return api.post("/attendance/check-in", payload);
};

export const checkOutApi = (payload = {}) =>
  api.post("/attendance/check-out", payload);

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
  return api.post("/attendance/ping", {
    deviceId,
    wifiMacAddress: payload.wifiMacAddress || null
  });
};

export const todayStatusApi = () =>
  api.get("/attendance/today-status");

export const historyApi = (params = {}) =>
  api.get("/attendance/history", { params });

export const getAttendanceOverviewApi = (params = {}) =>
  api.get("/attendance/overview", { params });

export const manualMarkAttendanceApi = (payload) => 
  api.post("/attendance/manual-mark", payload);

export const adjustAttendanceApi = (payload) => 
  api.put("/attendance/adjust", payload);

// Department APIs (in users module)
export const getAllDepartmentsApi = () => api.get("/users/departments/all");
export const createDepartmentApi = (payload) => api.post("/users/departments", payload);
export const getUsersByDepartmentApi = (deptId) => api.get(`/users/department/${deptId}`);

// Notification APIs
export const getNotificationsApi = (params = {}) => api.get("/notifications", { params });
export const sendNotificationApi = (payload) => api.post("/notifications/send", payload);
export const markNotificationReadApi = (id) => api.put(`/notifications/${id}/read`);

// Analytics APIs
export const getKPIsApi = (params = {}) => api.get("/analytics/kpis", { params });
export const getTrendsApi = (params = {}) => api.get("/analytics/attendance/trends", { params });
export const getDepartmentAnalyticsApi = () => api.get("/analytics/attendance/department");
export const getAttendanceHeatmapApi = (params = {}) => api.get("/analytics/attendance/heatmap", { params });

// Performance APIs
export const getPerformanceScoresApi = (params = {}) => api.get("/performance/scores", { params });
export const getLeaderboardApi = (params = {}) => api.get("/performance/leaderboard", { params });

// AI APIs
export const getChatbotResponseApi = (payload) => api.post("/ai/chatbot", payload);
export const getLeaveForecastApi = (params = {}) => api.get("/ai/leave-forecast", { params });
export const getAnomalyDetectionApi = (params = {}) => api.get("/ai/anomaly-detection", { params });

export default api;

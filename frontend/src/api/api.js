import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000",
  headers: { "Content-Type": "application/json" },
  // withCredentials: true, // enable ONLY if backend uses cookies/sessions
});

api.interceptors.request.use((config) => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const API_PREFIX = "/api";

// Authentication
export const signupApi = (payload) =>
  api.post(`${API_PREFIX}/auth/signup`, payload);
export const loginApi = (payload) =>
  api.post(`${API_PREFIX}/auth/login`, payload);
export const forgotPasswordApi = (payload) =>
  api.post(`${API_PREFIX}/auth/forgot-password`, payload);
export const verifyOtpApi = (payload) =>
  api.post(`${API_PREFIX}/auth/verify-otp`, payload);
export const resetPasswordApi = (payload) =>
  api.post(`${API_PREFIX}/auth/reset-password`, payload);

// Admin Users CRUD
// Create user API Admin
export const createUserApi = (payload) => api.post("/api/createuser", payload);
export const getUserApi = (payload) => api.post("/api/getuser", payload);
export const updateUserApi = (id, payload) =>
  api.put(`/api/users/${id}`, payload);
export const deleteUserApi = (id) => api.delete(`/api/users/${id}`);

export const createLeaveApi = (payload) => api.post("/api/leaves", payload);

// Get my leaves (Employee)
export const getMyLeavesApi = () => api.get("/api/leaves/my");

// Delete my leave (Employee)


// POST /api/attendance/check-in
export const checkInApi = (payload = {}) =>
  http.post("/api/attendance/check-in", payload);

// POST /api/attendance/check-out
export const checkOutApi = (payload = {}) =>
  http.post("/api/attendance/check-out", payload);

// POST /api/attendance/ping
export const pingApi = (payload = {}) =>
  http.post("/api/attendance/ping", payload);

// GET /api/attendance/today-status
export const todayStatusApi = () =>
  http.get("/api/attendance/today-status");

// GET /api/attendance/history?from=2026-01-01&to=2026-01-31&page=1&limit=10
export const historyApi = (params = {}) =>
  http.get("/api/attendance/history", { params });

export const getAllLeavesApi = () => api.get("/api/leaves"); 
// OR if your backend route is different, match it exactly (examples below)

// 2) PATCH / PUT update leave status
export const updateLeaveStatusApi = (leaveId, payload) =>
  api.patch(`/api/leaves/${leaveId}/status`, payload);
// If your backend expects PUT, use api.put(...)

// 3) DELETE leave
export const deleteLeaveApi = (leaveId) =>
  api.delete(`/api/leaves/${leaveId}`);

export default api;

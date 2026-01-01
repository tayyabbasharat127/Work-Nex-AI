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
export const signupApi = (payload) => api.post(`${API_PREFIX}/auth/signup`, payload);
export const loginApi = (payload) => api.post(`${API_PREFIX}/auth/login`, payload);
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
export const updateUserApi = (id, payload) => api.put(`/api/users/${id}`, payload);
export const deleteUserApi = (id) => api.delete(`/api/users/${id}`);


export const createLeaveApi = (payload) =>
  api.post("/api/leaves", payload);

// Get my leaves (Employee)
export const getMyLeavesApi = () =>
  api.get("/api/leaves/my");

// Delete my leave (Employee)
export const deleteLeaveApi = (leave_id) =>
  api.delete(`/api/leaves/${leave_id}`);

// Admin: Get all leaves
export const getAllLeavesApi = () =>
  api.get("/api/leaves");

// Admin: Update leave status (Approved/Rejected/Pending etc.)
export const updateLeaveStatusApi = (leave_id, payload) =>
  api.put(`/api/leaves/${leave_id}/status`, payload);



export default api;

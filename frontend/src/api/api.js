import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const signupApi = (payload) => api.post("/api/auth/signup", payload);

export const loginApi = (payload) => api.post("/api/auth/login", payload);

export const forgotPasswordApi = (payload) =>
  api.post("/api/auth/forgot-password", payload);

export const verifyOtpApi = (payload) =>
  api.post("/api/auth/verify-otp", payload);

export const resetPasswordApi = (payload) =>
  api.post("/api/auth/reset-password", payload);

export default api;

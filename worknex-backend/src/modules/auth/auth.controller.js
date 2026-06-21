const authService = require('./auth.service');
const { apiResponse } = require('../../utils/ApiResponse');

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/api/v1/auth',
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

const setRefreshCookie = (res, refreshToken) => {
  if (refreshToken) res.cookie('refreshToken', refreshToken, refreshCookieOptions);
};

const clearRefreshCookie = (res) => {
  const { maxAge, ...clearCookieOptions } = refreshCookieOptions;
  res.clearCookie('refreshToken', clearCookieOptions);
};

const publicTokens = (result) => {
  if (!result || !result.refreshToken) return result;
  // In production the refresh token lives only in the HttpOnly cookie.
  // In development the cookie is SameSite=Lax which cross-origin fetch won't send,
  // so we include it in the body so the frontend can store and resend it.
  if (process.env.NODE_ENV === 'production') {
    const { refreshToken, ...safeResult } = result;
    return safeResult;
  }
  return result;
};

const register = async (req, res) => {
  const user = await authService.register(req.body, req.user);
  apiResponse(res, 201, 'User registered successfully', user);
};

const login = async (req, res) => {
  const result = await authService.login(req.body.email, req.body.password);
  setRefreshCookie(res, result.refreshToken);
  apiResponse(res, 200, result.requires2FA ? '2FA required' : 'Login successful', publicTokens(result));
};

const refreshToken = async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
  const tokens = await authService.refreshToken(refreshToken);
  setRefreshCookie(res, tokens.refreshToken);
  apiResponse(res, 200, 'Token refreshed', publicTokens(tokens));
};

const logout = async (req, res) => {
  await authService.logout(req.user.id, req.cookies?.refreshToken || req.body.refreshToken);
  clearRefreshCookie(res);
  apiResponse(res, 200, 'Logged out successfully');
};

const setup2FA = async (req, res) => {
  const data = await authService.setup2FA(req.user.id);
  apiResponse(res, 200, '2FA setup initiated', data);
};

const verify2FA = async (req, res) => {
  const result = await authService.verify2FA(req.user.id, req.body.token);
  apiResponse(res, 200, '2FA enabled', result);
};

const disable2FA = async (req, res) => {
  await authService.disable2FA(req.user.id, req.body.token);
  apiResponse(res, 200, '2FA disabled');
};

const validate2FA = async (req, res) => {
  const tokens = await authService.validate2FA(req.body.userId, req.body.token);
  setRefreshCookie(res, tokens.refreshToken);
  apiResponse(res, 200, 'Login successful', publicTokens(tokens));
};

const forgotPassword = async (req, res) => {
  await authService.forgotPassword(req.body.email);
  apiResponse(res, 200, 'If the email exists, a reset link has been sent');
};

const resetPassword = async (req, res) => {
  await authService.resetPassword(req.body.token, req.body.newPassword);
  apiResponse(res, 200, 'Password reset successfully');
};

const changePassword = async (req, res) => {
  await authService.changePassword(req.user.id, req.body.oldPassword, req.body.newPassword);
  apiResponse(res, 200, 'Password changed successfully');
};

module.exports = {
  register, login, refreshToken, logout,
  setup2FA, verify2FA, disable2FA, validate2FA,
  forgotPassword, resetPassword, changePassword,
};

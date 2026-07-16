const authService = require('./auth.service');
const { config } = require('../../config/env');
const { apiResponse } = require('../../utils/ApiResponse');
const { setRefreshCookie, clearRefreshCookie, publicTokens } = require('../../utils/authSessionResponse');

const register = async (req, res) => {
  const user = await authService.register(req.body, req.user);
  apiResponse(res, 201, 'User registered successfully', user);
};

const login = async (req, res) => {
  const result = await authService.login(req.body.email, req.body.password, {
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  setRefreshCookie(res, result.refreshToken);
  apiResponse(res, 200, result.requires2FA ? '2FA required' : 'Login successful', publicTokens(result));
};

const refreshToken = async (req, res) => {
  const refreshToken = req.cookies?.[config.cookies.refreshName] || req.body.refreshToken;
  const tokens = await authService.refreshToken(refreshToken, {
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  setRefreshCookie(res, tokens.refreshToken);
  apiResponse(res, 200, 'Token refreshed', publicTokens(tokens));
};

const logout = async (req, res) => {
  await authService.logout(req.user.id, req.cookies?.[config.cookies.refreshName] || req.body.refreshToken);
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
  const tokens = await authService.validate2FA(req.body.userId, req.body.token, {
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
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

const { config } = require('../config/env');

const refreshCookieOptions = {
  httpOnly: true,
  secure: config.cookies.secure,
  sameSite: config.cookies.sameSite,
  path: '/api/v1/auth',
  maxAge: config.cookies.maxAgeMs,
  ...(config.cookies.domain ? { domain: config.cookies.domain } : {}),
};

const setRefreshCookie = (res, refreshToken) => {
  if (refreshToken) res.cookie(config.cookies.refreshName, refreshToken, refreshCookieOptions);
};

const clearRefreshCookie = (res) => {
  const { maxAge, ...clearCookieOptions } = refreshCookieOptions;
  res.clearCookie(config.cookies.refreshName, clearCookieOptions);
};

const publicTokens = (result) => {
  if (!result || !result.refreshToken) return result;
  const { refreshToken, ...safeResult } = result;
  return safeResult;
};

module.exports = { setRefreshCookie, clearRefreshCookie, publicTokens };

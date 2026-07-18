const dns = require('dns').promises;
const net = require('net');
const { config } = require('../config/env');
const { ApiError } = require('./ApiError');

const normalizeHost = (host) => String(host || '').trim().toLowerCase().replace(/^\[|\]$/g, '');

const isProhibitedAddress = (address) => {
  const value = normalizeHost(address);
  if (net.isIPv4(value)) {
    const octets = value.split('.').map(Number);
    return octets[0] === 0
      || octets[0] === 127
      || (octets[0] === 169 && octets[1] === 254)
      || octets[0] >= 224;
  }

  if (net.isIPv6(value)) {
    return value === '::'
      || value === '::1'
      || value.startsWith('fe8')
      || value.startsWith('fe9')
      || value.startsWith('fea')
      || value.startsWith('feb')
      || value.startsWith('ff');
  }

  return false;
};

const assertAllowedHost = (host) => {
  const normalized = normalizeHost(host);
  if (!normalized) throw new ApiError(400, 'Integration host is required');

  if (config.isProduction && !config.biometricAllowedHosts.includes(normalized)) {
    throw new ApiError(400, 'Integration host is not in BIOMETRIC_ALLOWED_HOSTS');
  }

  if (normalized === 'localhost' && config.isProduction) {
    throw new ApiError(400, 'Loopback integration hosts are not allowed in production');
  }

  return normalized;
};

const assertSafeOutboundHost = async (host) => {
  const normalized = assertAllowedHost(host);
  const addresses = net.isIP(normalized)
    ? [{ address: normalized }]
    : await dns.lookup(normalized, { all: true, verbatim: true });

  const allowDevelopmentLoopback = !config.isProduction
    && (normalized === 'localhost' || addresses.every(({ address }) => address === '::1' || address.startsWith('127.')));

  if (!addresses.length || (!allowDevelopmentLoopback && addresses.some(({ address }) => isProhibitedAddress(address)))) {
    throw new ApiError(400, 'Integration host resolves to a prohibited network address');
  }

  return normalized;
};

const assertSafeOutboundUrl = async (rawUrl) => {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new ApiError(400, 'Integration API URL is invalid');
  }

  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new ApiError(400, 'Integration API URL must be HTTP(S) and must not contain credentials');
  }

  await assertSafeOutboundHost(parsed.hostname);
  return parsed.toString().replace(/\/$/, '');
};

module.exports = { assertSafeOutboundHost, assertSafeOutboundUrl, isProhibitedAddress };

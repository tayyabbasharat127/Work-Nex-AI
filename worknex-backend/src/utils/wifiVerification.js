/**
 * Network-based attendance verification.
 *
 * Production mode:
 * - Set WIFI_VERIFICATION_ENABLED=true.
 * - Set OFFICE_IP_RANGES to comma-separated CIDR ranges or IP prefixes.
 * - Configure Express trust proxy before trusting X-Forwarded-For.
 *
 * Local/demo mode:
 * - Verification is allowed when WIFI_VERIFICATION_ENABLED is not "true".
 * - The observed request IP is still returned for audit/debug context.
 */

const normalizeIp = (ip = '') => ip.replace(/^::ffff:/, '');

const isTrustProxyEnabled = (req) => {
  const setting = req?.app?.get?.('trust proxy');
  return setting === true || typeof setting === 'number' || typeof setting === 'function';
};

const getClientIP = (req) => {
  const forwarded = req?.headers?.['x-forwarded-for'];
  if (forwarded && isTrustProxyEnabled(req)) {
    return normalizeIp(forwarded.split(',')[0].trim());
  }
  return normalizeIp(req?.socket?.remoteAddress || req?.ip || '');
};

const ipInRange = (ip, cidr) => {
  try {
    if (!cidr.includes('/')) {
      return ip.startsWith(cidr);
    }

    const [range, bits] = cidr.split('/');
    const mask = ~(2 ** (32 - parseInt(bits, 10)) - 1);
    const ipNum = ip.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct, 10), 0);
    const rangeNum = range.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct, 10), 0);

    return (ipNum & mask) === (rangeNum & mask);
  } catch {
    return false;
  }
};

const verifyOfficeNetwork = (req) => {
  if (process.env.WIFI_VERIFICATION_ENABLED !== 'true') {
    return {
      allowed: true,
      ip: getClientIP(req),
      reason: 'Verification disabled for local/demo mode',
    };
  }

  const clientIP = getClientIP(req);
  const allowedRanges = (process.env.OFFICE_IP_RANGES || '')
    .split(',')
    .map((range) => range.trim())
    .filter(Boolean);

  if (allowedRanges.length === 0) {
    return { allowed: true, ip: clientIP, reason: 'No IP ranges configured' };
  }

  const isAllowed = allowedRanges.some((range) => ipInRange(clientIP, range));

  return {
    allowed: isAllowed,
    ip: clientIP,
    reason: isAllowed
      ? 'IP within office network range'
      : `IP ${clientIP} not in allowed ranges: ${allowedRanges.join(', ')}`,
  };
};

module.exports = { verifyOfficeNetwork, getClientIP };

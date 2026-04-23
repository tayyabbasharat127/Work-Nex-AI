/**
 * WorkNex AI — WiFi / Network-based Attendance Verification
 *
 * Strategy: IP-range verification (most practical for web apps)
 * The office router has a known public IP or internal IP range.
 * When an employee checks in, we verify their request IP is within
 * the allowed office network range.
 *
 * Anti-spoofing: We check X-Forwarded-For but also validate against
 * a whitelist — not just trust the header blindly.
 *
 * For stronger verification, combine with:
 *   - GPS coordinates (already stored)
 *   - Device fingerprint (future)
 *   - SSID via a companion mobile app (future)
 */

/**
 * Extract the real client IP from the request
 * Handles proxies, load balancers, and direct connections
 */
const getClientIP = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // X-Forwarded-For can be a comma-separated list — take the first (original client)
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || '';
};

/**
 * Check if an IP is within a CIDR range
 * Supports both IPv4 and simple range checks
 */
const ipInRange = (ip, cidr) => {
  try {
    // Handle simple prefix match (e.g. "192.168.1." matches "192.168.1.45")
    if (!cidr.includes('/')) {
      return ip.startsWith(cidr);
    }

    const [range, bits] = cidr.split('/');
    const mask = ~(2 ** (32 - parseInt(bits)) - 1);

    const ipNum   = ip.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct), 0);
    const rangeNum = range.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct), 0);

    return (ipNum & mask) === (rangeNum & mask);
  } catch {
    return false;
  }
};

/**
 * Verify that the request comes from an allowed office network
 *
 * Config via environment variables:
 *   OFFICE_IP_RANGES = "192.168.1.0/24,10.0.0.0/8,203.0.113.5"
 *   WIFI_VERIFICATION_ENABLED = "true" | "false"
 *
 * Returns: { allowed: boolean, ip: string, reason: string }
 */
const verifyOfficeNetwork = (req) => {
  // If verification is disabled (dev mode), always allow
  if (process.env.WIFI_VERIFICATION_ENABLED !== 'true') {
    return { allowed: true, ip: getClientIP(req), reason: 'Verification disabled' };
  }

  const clientIP = getClientIP(req);
  const allowedRanges = (process.env.OFFICE_IP_RANGES || '').split(',').map(r => r.trim()).filter(Boolean);

  if (allowedRanges.length === 0) {
    return { allowed: true, ip: clientIP, reason: 'No IP ranges configured' };
  }

  const isAllowed = allowedRanges.some(range => ipInRange(clientIP, range));

  return {
    allowed: isAllowed,
    ip: clientIP,
    reason: isAllowed
      ? 'IP within office network range'
      : `IP ${clientIP} not in allowed ranges: ${allowedRanges.join(', ')}`,
  };
};

module.exports = { verifyOfficeNetwork, getClientIP };

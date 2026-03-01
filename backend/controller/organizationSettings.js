const pool = require('../config/db');

/**
 * Get organization settings
 */
exports.getSettings = async (req, res) => {
  try {
    const { organizationId, roleId } = req.user;

    // Only admin can view settings
    if (roleId !== 1 && roleId !== 0) {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }

    const result = await pool.query(
      `SELECT * FROM organization_settings WHERE organization_id = $1`,
      [organizationId]
    );

    if (result.rows.length === 0) {
      // Create default settings if not exists
      const defaultSettings = await pool.query(
        `INSERT INTO organization_settings 
         (organization_id, wifi_ip_ranges, shift_start_time, shift_end_time, "createdAt", "updatedAt")
         VALUES ($1, ARRAY['192.168.100.0/24', '127.0.0.1', '::1'], '10:00:00', '19:00:00', NOW(), NOW())
         RETURNING *`,
        [organizationId]
      );
      return res.json({ success: true, data: defaultSettings.rows[0] });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Update organization settings
 */
exports.updateSettings = async (req, res) => {
  try {
    const { organizationId, roleId } = req.user;

    // Only admin can update settings
    if (roleId !== 1 && roleId !== 0) {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }

    const {
      wifi_ip_ranges,
      allowed_wifi_mac_addresses,
      require_wifi_mac_validation,
      shift_start_time,
      shift_end_time,
      late_threshold_minutes,
      early_departure_threshold_minutes,
      grace_period_minutes,
      half_day_hours,
      auto_checkout_timeout_minutes
    } = req.body;

    // Check if settings exist
    const existing = await pool.query(
      `SELECT id FROM organization_settings WHERE organization_id = $1`,
      [organizationId]
    );

    let result;
    if (existing.rows.length === 0) {
      // Insert new settings
      result = await pool.query(
        `INSERT INTO organization_settings 
         (organization_id, wifi_ip_ranges, allowed_wifi_mac_addresses, require_wifi_mac_validation,
          shift_start_time, shift_end_time, late_threshold_minutes, early_departure_threshold_minutes, 
          grace_period_minutes, half_day_hours, auto_checkout_timeout_minutes, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
         RETURNING *`,
        [
          organizationId,
          wifi_ip_ranges || ['192.168.100.0/24'],
          allowed_wifi_mac_addresses || [],
          require_wifi_mac_validation || false,
          shift_start_time || '10:00:00',
          shift_end_time || '19:00:00',
          late_threshold_minutes || 0,
          early_departure_threshold_minutes || 30,
          grace_period_minutes || 0,
          half_day_hours || 4,
          auto_checkout_timeout_minutes || 5
        ]
      );
    } else {
      // Update existing settings
      result = await pool.query(
        `UPDATE organization_settings 
         SET wifi_ip_ranges = COALESCE($2, wifi_ip_ranges),
             allowed_wifi_mac_addresses = COALESCE($3, allowed_wifi_mac_addresses),
             require_wifi_mac_validation = COALESCE($4, require_wifi_mac_validation),
             shift_start_time = COALESCE($5, shift_start_time),
             shift_end_time = COALESCE($6, shift_end_time),
             late_threshold_minutes = COALESCE($7, late_threshold_minutes),
             early_departure_threshold_minutes = COALESCE($8, early_departure_threshold_minutes),
             grace_period_minutes = COALESCE($9, grace_period_minutes),
             half_day_hours = COALESCE($10, half_day_hours),
             auto_checkout_timeout_minutes = COALESCE($11, auto_checkout_timeout_minutes),
             "updatedAt" = NOW()
         WHERE organization_id = $1
         RETURNING *`,
        [
          organizationId,
          wifi_ip_ranges,
          allowed_wifi_mac_addresses,
          require_wifi_mac_validation,
          shift_start_time,
          shift_end_time,
          late_threshold_minutes,
          early_departure_threshold_minutes,
          grace_period_minutes,
          half_day_hours,
          auto_checkout_timeout_minutes
        ]
      );
    }

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Validate network access (IP + optional WiFi MAC)
 */
exports.validateNetworkAccess = async (organizationId, clientIP, wifiMacAddress = null) => {
  try {
    const result = await pool.query(
      `SELECT wifi_ip_ranges, allowed_wifi_mac_addresses, require_wifi_mac_validation 
       FROM organization_settings WHERE organization_id = $1`,
      [organizationId]
    );

    if (result.rows.length === 0) {
      // No settings, use default (localhost only for testing)
      return clientIP === '127.0.0.1' || 
             clientIP === '::1' ||
             clientIP.startsWith('::ffff:127.0.0.1');
    }

    const settings = result.rows[0];
    const ipRanges = settings.wifi_ip_ranges || [];
    const allowedMacs = settings.allowed_wifi_mac_addresses || [];
    const requireMacValidation = settings.require_wifi_mac_validation || false;

    // Step 1: Validate IP
    let ipValid = false;
    for (const range of ipRanges) {
      if (range.includes('/')) {
        // CIDR notation (e.g., 192.168.100.0/24)
        if (isIPInCIDR(clientIP, range)) {
          ipValid = true;
          break;
        }
      } else {
        // Exact match or wildcard
        if (clientIP === range || clientIP.startsWith(range.replace('*', ''))) {
          ipValid = true;
          break;
        }
      }
    }

    if (!ipValid) {
      console.log('❌ IP validation failed:', clientIP);
      return false;
    }

    // Step 2: Validate WiFi MAC (if required)
    if (requireMacValidation && allowedMacs.length > 0) {
      if (!wifiMacAddress) {
        console.log('❌ WiFi MAC required but not provided');
        return false;
      }

      // Normalize MAC address (remove colons, hyphens, make uppercase)
      const normalizedMac = wifiMacAddress.replace(/[:-]/g, '').toUpperCase();
      
      const macValid = allowedMacs.some(allowedMac => {
        const normalizedAllowed = allowedMac.replace(/[:-]/g, '').toUpperCase();
        return normalizedMac === normalizedAllowed;
      });

      if (!macValid) {
        console.log('❌ WiFi MAC validation failed:', wifiMacAddress);
        return false;
      }

      console.log('✓ WiFi MAC validated:', wifiMacAddress);
    }

    console.log('✓ Network access validated');
    return true;
  } catch (err) {
    console.error('Validate network access error:', err);
    return false;
  }
};

/**
 * Legacy function for backward compatibility
 */
exports.validateIP = async (organizationId, clientIP) => {
  return exports.validateNetworkAccess(organizationId, clientIP, null);
};

/**
 * Helper: Check if IP is in CIDR range
 */
function isIPInCIDR(ip, cidr) {
  // Simple implementation for IPv4
  // For production, use a library like 'ip-range-check'
  
  // Handle localhost
  if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('::ffff:127.0.0.1')) {
    return cidr === '127.0.0.1' || cidr.includes('127.0.0.1');
  }

  const [range, bits] = cidr.split('/');
  if (!bits) return ip === range;

  // Convert IP to binary
  const ipBinary = ip.split('.').map(octet => 
    parseInt(octet).toString(2).padStart(8, '0')
  ).join('');

  const rangeBinary = range.split('.').map(octet => 
    parseInt(octet).toString(2).padStart(8, '0')
  ).join('');

  // Compare first 'bits' bits
  return ipBinary.substring(0, parseInt(bits)) === rangeBinary.substring(0, parseInt(bits));
}

/**
 * Get shift timings for organization
 */
exports.getShiftTimings = async (organizationId) => {
  try {
    const result = await pool.query(
      `SELECT shift_start_time, shift_end_time, late_threshold_minutes, grace_period_minutes
       FROM organization_settings WHERE organization_id = $1`,
      [organizationId]
    );

    if (result.rows.length === 0) {
      return {
        shift_start_time: '10:00:00',
        shift_end_time: '19:00:00',
        late_threshold_minutes: 0,
        grace_period_minutes: 0
      };
    }

    return result.rows[0];
  } catch (err) {
    console.error('Get shift timings error:', err);
    return {
      shift_start_time: '10:00:00',
      shift_end_time: '19:00:00',
      late_threshold_minutes: 0,
      grace_period_minutes: 0
    };
  }
};

module.exports.validateIP = exports.validateIP;
module.exports.validateNetworkAccess = exports.validateNetworkAccess;
module.exports.getShiftTimings = exports.getShiftTimings;

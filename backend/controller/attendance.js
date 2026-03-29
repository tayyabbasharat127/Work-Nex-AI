const pool = require('../config/db');
const { validateNetworkAccess, getShiftTimings } = require('./organizationSettings');
const sendEmail = require('../utils/sendEmail');

// Helper to get client IP
const getClientIP = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ip = forwarded.split(',')[0].trim();
    console.log('📍 Client IP (from x-forwarded-for):', ip);
    return ip;
  }
  const ip = req.socket.remoteAddress;
  console.log('📍 Client IP (from socket):', ip);
  
  // Convert IPv6-mapped IPv4 to regular IPv4
  if (ip && ip.startsWith('::ffff:')) {
    const ipv4 = ip.replace('::ffff:', '');
    console.log('📍 Converted to IPv4:', ipv4);
    return ipv4;
  }
  
  return ip;
};


exports.checkIn = async (req, res) => {
  try {
    const userId = req.user.userId;
    const organizationId = req.user.organizationId;
    const clientIP = getClientIP(req);
    const { deviceId, wifiMacAddress } = req.body;
    
    console.log('=== Check-In Request ===');
    console.log('User ID:', userId);
    console.log('Organization ID:', organizationId);
    console.log('Client IP:', clientIP);
    console.log('WiFi MAC:', wifiMacAddress);

    // Validate network access (IP + optional WiFi MAC)
    const isValidNetwork = await validateNetworkAccess(organizationId, clientIP, wifiMacAddress);
    if (!isValidNetwork) {
      return res.status(403).json({
        success: false,
        message: 'You must be connected to office WiFi to mark attendance'
      });
    }

    // Check if already checked in today
    const already = await pool.query(
      `SELECT * FROM "Attendances"
       WHERE employee_id = $1
       AND DATE(check_in_time) = CURRENT_DATE`,
      [userId]
    );

    if (already.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Already checked in today'
      });
    }

    // Get shift timings from organization settings
    const shiftSettings = await getShiftTimings(organizationId);
    
    const now = new Date();
    const shiftStart = new Date();
    const [hours, minutes, seconds] = shiftSettings.shift_start_time.split(':');
    shiftStart.setHours(parseInt(hours), parseInt(minutes), parseInt(seconds || 0), 0);

    // Add grace period
    shiftStart.setMinutes(shiftStart.getMinutes() + (shiftSettings.grace_period_minutes || 0));

    const status = now > shiftStart ? 'Late' : 'Present';

    // Insert attendance record
    const result = await pool.query(
      `INSERT INTO "Attendances"
       (employee_id, check_in_time, status, ip_address, device_id, wifi_mac_address, last_ping_time, "createdAt", "updatedAt")
       VALUES ($1, NOW(), $2, $3, $4, $5, NOW(), NOW(), NOW())
       RETURNING *`,
      [userId, status, clientIP, deviceId, wifiMacAddress]
    );

    console.log('✓ Check-in successful:', status);

    // Send notifications (async, don't wait)
    sendCheckInNotifications(userId, status, organizationId).catch(err => 
      console.error('Notification error:', err)
    );

    res.json({
      success: true,
      message: 'Check-in successful',
      status,
      attendance: result.rows[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
};


exports.checkOut = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Find today's active attendance
    const result = await pool.query(
      `SELECT * FROM "Attendances"
       WHERE employee_id = $1
       AND DATE(check_in_time) = CURRENT_DATE
       AND check_out_time IS NULL`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No active check-in found"
      });
    }

    const attendance = result.rows[0];

    // Shift end time 7 PM
    const shiftEnd = new Date();
    shiftEnd.setHours(19, 0, 0, 0);

    const now = new Date();
    // Logic for early leave status update if needed, but DB status is enum
    // Keeping existing status or updating to 'Half-Day' if very early could be added here
    // For now, just preserving current status or updating if needed. 
    // The previous code had "early_leave" which is NOT in the ENUM ('Present', 'Late', 'Absent', 'Half-Day')
    // So we will keep the status as is, or set to 'Half-Day' if < 4 hours?
    // Let's keep original status for now to avoid enum violation.

    await pool.query(
      `UPDATE "Attendances"
       SET check_out_time = NOW(),
           "updatedAt" = NOW()
       WHERE id = $1`,
      [attendance.id]
    );

    res.json({
      success: true,
      message: "Checked out successfully",
      status: attendance.status
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Auto checkout when employee leaves office (WiFi disconnect)
exports.autoCheckout = async (req, res) => {
  try {
    const userId = req.user.userId;
    const clientIP = getClientIP(req);

    // Find today's active attendance (check-in without checkout)
    const result = await pool.query(
      `SELECT * FROM "Attendances"
       WHERE employee_id = $1
       AND DATE(check_in_time) = CURRENT_DATE
       AND check_out_time IS NULL`,
      [userId]
    );

    if (result.rows.length > 0) {
      // Auto checkout with current timestamp
      await pool.query(
        `UPDATE "Attendances"
         SET check_out_time = NOW(),
             "updatedAt" = NOW()
         WHERE id = $1`,
        [result.rows[0].id]
      );

      console.log(`🚪 Auto checkout for user ${userId} at ${new Date().toISOString()}`);
    }

    res.json({
      success: true,
      message: result.rows.length > 0 ? "Auto checkout successful" : "No active attendance found"
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.ping = async (req, res) => {
  try {
    const userId = req.user.userId;
    const organizationId = req.user.organizationId;
    const { deviceId, wifiMacAddress } = req.body;
    const clientIP = getClientIP(req);

    console.log('=== Ping Request ===');
    console.log('User ID:', userId);
    console.log('Organization ID:', organizationId);
    console.log('Client IP:', clientIP);
    console.log('WiFi MAC:', wifiMacAddress);

    // Validate network access (IP + optional WiFi MAC)
    const isValidNetwork = await validateNetworkAccess(organizationId, clientIP, wifiMacAddress);
    
    if (!isValidNetwork) {
      console.log('❌ Not on office network');
      return res.status(403).json({ success: false, message: 'Not on office network' });
    }

    console.log('✓ On office network');

    // Check if already checked in today
    const today = await pool.query(
      `SELECT * FROM "Attendances" 
       WHERE employee_id = $1 
       AND DATE(check_in_time) = CURRENT_DATE`,
      [userId]
    );

    if (today.rows.length === 0) {
      // Auto check-in
      console.log('✓ Auto check-in - No attendance record for today');
      
      // Get shift timings
      const shiftSettings = await getShiftTimings(organizationId);
      const now = new Date();
      const shiftStart = new Date();
      const [hours, minutes] = shiftSettings.shift_start_time.split(':');
      shiftStart.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      // Add grace period
      shiftStart.setMinutes(shiftStart.getMinutes() + (shiftSettings.grace_period_minutes || 0));
      
      const status = now > shiftStart ? 'Late' : 'Present';
      
      await pool.query(
        `INSERT INTO "Attendances" 
         (employee_id, check_in_time, status, ip_address, device_id, wifi_mac_address, last_ping_time, "createdAt", "updatedAt")
         VALUES ($1, NOW(), $2, $3, $4, $5, NOW(), NOW(), NOW())`,
        [userId, status, clientIP, deviceId, wifiMacAddress]
      );
      
      console.log('✓ Auto check-in successful');
      
      // Send notifications (async)
      sendCheckInNotifications(userId, status, organizationId).catch(err => 
        console.error('Notification error:', err)
      );
    } else {
      // Update last ping time for existing attendance
      await pool.query(
        `UPDATE "Attendances"
         SET last_ping_time = NOW(),
             "updatedAt" = NOW()
         WHERE employee_id = $1
         AND DATE(check_in_time) = CURRENT_DATE
         AND check_out_time IS NULL`,
        [userId]
      );
      console.log('✓ Updated last ping time');
    }

    res.json({ success: true, message: 'Ping received' });
  } catch (err) {
    console.error('Ping error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.todayStatus = async (req, res) => {
  try {
    const userId = req.user.userId;

    console.log('=== Today Status Request ===');
    console.log('User ID:', userId);

    const result = await pool.query(
      `SELECT check_in_time, check_out_time, status
       FROM "Attendances"
       WHERE employee_id = $1
       AND DATE(check_in_time) = CURRENT_DATE`,
      [userId]
    );

    console.log('Query result:', result.rows);

    if (result.rows.length === 0) {
      console.log('No attendance record for today');
      return res.json({ status: "Absent" });
    }

    const attendance = result.rows[0];
    console.log('Returning attendance:', attendance);

    res.json({
      success: true,
      attendance: {
        status: attendance.status,
        check_in: attendance.check_in_time,
        check_out: attendance.check_out_time
      }
    });

  } catch (err) {
    console.error('Today status error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.history = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT check_in_time, check_out_time, status
       FROM "Attendances"
       WHERE employee_id = $1
       ORDER BY check_in_time DESC`,
      [userId]
    );

    // Map to frontend expected format
    const history = result.rows.map(row => ({
      check_in: row.check_in_time,
      check_out: row.check_out_time,
      status: row.status
    }));

    res.json({
      success: true,
      history: history
    });

  } catch (err) {
    console.error('History error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.attendanceOverview = async (req, res) => {
  try {
    const { organizationId, roleId } = req.user || {};

    console.log('=== Attendance Overview Request ===');
    console.log('User:', req.user);
    console.log('Organization ID:', organizationId);
    console.log('Role ID:', roleId);

    if (!organizationId) {
      console.log('❌ Missing organization context');
      return res.status(403).json({ success: false, message: 'Missing organization context' });
    }

    console.log('Fetching attendance for organization:', organizationId);

    // Get all users from both Users and users tables for this organization
    // Exclude admins (role_id = 1 or role = 'Admin')
    // Join with departments to get department names
    const result = await pool.query(
      `SELECT
         COALESCE(u1.id, u2.user_id) as user_id,
         COALESCE(u1.name, u2.name) as name,
         COALESCE(u1.email, u2.email) as email,
         u2.role_id as role_id,
         COALESCE(u1.role, 'Employee') as role,
         COALESCE(d.name, u1.department, u2.department_id::text, '—') as department,
         COALESCE(a.status, 'Absent') AS attendance_status,
         a.check_in_time,
         a.check_out_time
       FROM (
         SELECT id, name, email, role, department, organization_id FROM "Users" WHERE organization_id = $1
         UNION
         SELECT user_id as id, name, email, NULL as role, department_id::text as department, organization_id FROM users WHERE organization_id = $1
       ) AS combined
       LEFT JOIN "Users" u1 ON u1.id = combined.id AND u1.organization_id = $1
       LEFT JOIN users u2 ON u2.user_id = combined.id AND u2.organization_id = $1
       LEFT JOIN departments d ON d.department_id = COALESCE(u2.department_id, CAST(u1.department AS INTEGER))
       LEFT JOIN "Attendances" a
         ON a.employee_id = combined.id
         AND DATE(a.check_in_time) = CURRENT_DATE
       WHERE (u2.role_id IS NULL OR u2.role_id != 1) AND (u1.role IS NULL OR u1.role != 'Admin')
       ORDER BY combined.department NULLS LAST, combined.name`,
      [organizationId]
    );

    console.log('✓ Found', result.rows.length, 'employees (excluding admins)');

    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Attendance overview error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};


/**
 * Send notifications on check-in
 */
async function sendCheckInNotifications(userId, status, organizationId) {
  try {
    // Get user details
    const userResult = await pool.query(
      `SELECT name, email, manager_id, department_id FROM users WHERE user_id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) return;

    const user = userResult.rows[0];

    // Send to manager if exists
    if (user.manager_id) {
      const managerResult = await pool.query(
        `SELECT email FROM users WHERE user_id = $1`,
        [user.manager_id]
      );

      if (managerResult.rows.length > 0) {
        const managerEmail = managerResult.rows[0].email;
        await sendEmail(
          managerEmail,
          `Employee Check-In: ${user.name}`,
          `${user.name} has checked in at ${new Date().toLocaleTimeString()} with status: ${status}`
        );
      }
    }

    // Send to admin if late
    if (status === 'Late') {
      const adminResult = await pool.query(
        `SELECT email FROM users WHERE organization_id = $1 AND role_id = 1 LIMIT 1`,
        [organizationId]
      );

      if (adminResult.rows.length > 0) {
        const adminEmail = adminResult.rows[0].email;
        await sendEmail(
          adminEmail,
          `Late Arrival Alert: ${user.name}`,
          `${user.name} arrived late at ${new Date().toLocaleTimeString()}`
        );
      }
    }
  } catch (err) {
    console.error('Notification error:', err);
  }
}

/**
 * Manual mark attendance (Admin only)
 */
exports.manualMarkAttendance = async (req, res) => {
  try {
    const { roleId, userId: adminId } = req.user;

    // Only admin can manually mark
    if (roleId !== 1 && roleId !== 0) {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }

    const { employee_id, date, check_in_time, check_out_time, status, reason } = req.body;

    // Validate required fields
    if (!employee_id || !date || !check_in_time || !status) {
      return res.status(400).json({ 
        success: false, 
        message: 'employee_id, date, check_in_time, and status are required' 
      });
    }

    // Check if attendance already exists for this date
    const existing = await pool.query(
      `SELECT id FROM "Attendances" 
       WHERE employee_id = $1 AND DATE(check_in_time) = $2`,
      [employee_id, date]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Attendance already exists for this date'
      });
    }

    // Insert manual attendance
    const result = await pool.query(
      `INSERT INTO "Attendances"
       (employee_id, check_in_time, check_out_time, status, ip_address, 
        manual_entry, manual_reason, marked_by, "createdAt", "updatedAt")
       VALUES ($1, $2::timestamp, $3::timestamp, $4, 'MANUAL', true, $5, $6, NOW(), NOW())
       RETURNING *`,
      [employee_id, `${date} ${check_in_time}`, check_out_time ? `${date} ${check_out_time}` : null, status, reason, adminId]
    );

    res.json({
      success: true,
      message: 'Attendance marked manually',
      attendance: result.rows[0]
    });
  } catch (err) {
    console.error('Manual mark error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Adjust attendance (Manager/Admin only)
 */
exports.adjustAttendance = async (req, res) => {
  try {
    const { roleId, userId: managerId } = req.user;

    // Only manager or admin
    if (roleId !== 1 && roleId !== 2 && roleId !== 0) {
      return res.status(403).json({ success: false, message: 'Manager/Admin only' });
    }

    const { attendance_id, check_out_time, reason } = req.body;

    if (!attendance_id || !check_out_time) {
      return res.status(400).json({
        success: false,
        message: 'attendance_id and check_out_time are required'
      });
    }

    // Update attendance
    const result = await pool.query(
      `UPDATE "Attendances"
       SET check_out_time = $1::timestamp,
           adjusted_by = $2,
           adjustment_reason = $3,
           "updatedAt" = NOW()
       WHERE id = $4
       RETURNING *`,
      [check_out_time, managerId, reason, attendance_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    res.json({
      success: true,
      message: 'Attendance adjusted successfully',
      attendance: result.rows[0]
    });
  } catch (err) {
    console.error('Adjust attendance error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};


/**
 * Auto checkout employees who haven't pinged in X minutes
 * This should be called by a cron job every 5 minutes
 */
exports.autoCheckoutStale = async () => {
  try {
    console.log('=== Running Auto Checkout for Stale Attendances ===');

    // Get default timeout (5 minutes) or from settings
    const staleAttendances = await pool.query(`
      SELECT a.id, a.employee_id, a.last_ping_time, u.name, u.email,
             COALESCE(os.auto_checkout_timeout_minutes, 5) as timeout_minutes
      FROM "Attendances" a
      JOIN users u ON u.user_id = a.employee_id
      LEFT JOIN organization_settings os ON os.organization_id = u.organization_id
      WHERE DATE(a.check_in_time) = CURRENT_DATE
      AND a.check_out_time IS NULL
      AND a.last_ping_time IS NOT NULL
      AND a.last_ping_time < NOW() - (COALESCE(os.auto_checkout_timeout_minutes, 5) || ' minutes')::INTERVAL
    `);

    console.log(`Found ${staleAttendances.rows.length} stale attendances`);

    for (const attendance of staleAttendances.rows) {
      // Auto checkout with last ping time + 1 minute
      await pool.query(`
        UPDATE "Attendances"
        SET check_out_time = last_ping_time + INTERVAL '1 minute',
            auto_checkout = true,
            "updatedAt" = NOW()
        WHERE id = $1
      `, [attendance.id]);

      console.log(`✓ Auto checked out: ${attendance.name} (${attendance.email})`);

      // Send notification (async)
      sendEmail(
        attendance.email,
        'WorkNex AI - Auto Check-Out',
        `You have been automatically checked out at ${new Date(attendance.last_ping_time).toLocaleTimeString()} due to WiFi disconnection.\n\nIf this was a mistake, please contact your manager.`
      ).catch(err => console.error('Email error:', err));
    }

    return {
      success: true,
      count: staleAttendances.rows.length
    };
  } catch (err) {
    console.error('Auto checkout stale error:', err);
    return {
      success: false,
      error: err.message
    };
  }
};

/**
 * Manual endpoint to trigger auto checkout (for testing)
 */
exports.triggerAutoCheckout = async (req, res) => {
  try {
    const result = await exports.autoCheckoutStale();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

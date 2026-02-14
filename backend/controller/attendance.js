const pool = require('../config/db'); // PostgreSQL pool

// Helper to get client IP
const getClientIP = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress;
};


exports.checkIn = async (req, res) => {
  try {
    const userId = req.user.userId; // from JWT
    const clientIP = getClientIP(req);
    console.log('Client IP:', clientIP);

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

    // Shift timing (example: 10:00 AM)
    const now = new Date();
    const shiftStart = new Date();
    shiftStart.setHours(10, 0, 0, 0);

    const status = now > shiftStart ? 'Late' : 'Present';

    // Insert attendance record
    const result = await pool.query(
      `INSERT INTO "Attendances"
       (employee_id, check_in_time, status, ip_address, "createdAt", "updatedAt")
       VALUES ($1, NOW(), $2, $3, NOW(), NOW())
       RETURNING *`,
      [userId, status, clientIP]
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
    const { deviceId } = req.body;
    const clientIP = getClientIP(req);

    console.log('=== Ping Request ===');
    console.log('User ID:', userId);
    console.log('Client IP:', clientIP);
    console.log('Device ID:', deviceId);

    // 1. Office Wi-Fi check (192.168.100.x or localhost for testing)
    const isOfficeNetwork = clientIP.startsWith("192.168.100.") || 
                           clientIP === "::1" || 
                           clientIP === "127.0.0.1" ||
                           clientIP.startsWith("::ffff:127.0.0.1");
    
    if (!isOfficeNetwork) {
      console.log('❌ Not on office network');
      return res.status(403).json({ success: false, message: 'Not on office network' });
    }

    console.log('✓ On office network');

    // 2. Device validation (skip for now as device_id column check needed in Users)
    /*
    const user = await pool.query(
      "SELECT device_id FROM \"Users\" WHERE id = $1",
      [userId]
    );
    if (!user.rows[0] || user.rows[0].device_id !== deviceId) {
      return res.status(403).json({ success: false });
    }
    */

    // 3. Auto check-in
    const today = await pool.query(
      `SELECT * FROM "Attendances" WHERE employee_id = $1 AND DATE(check_in_time) = CURRENT_DATE`,
      [userId]
    );

    if (today.rows.length === 0) {
      console.log('✓ Auto check-in - No attendance record for today');
      await pool.query(
        `INSERT INTO "Attendances" (employee_id, check_in_time, status, ip_address, "createdAt", "updatedAt")
         VALUES ($1, NOW(), 'Present', $2, NOW(), NOW())`,
        [userId, clientIP]
      );
      console.log('✓ Auto check-in successful');
    } else {
      console.log('✓ Already checked in today');
    }

    res.json({ success: true });
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
    const result = await pool.query(
      `SELECT
         COALESCE(u1.id, u2.user_id) as user_id,
         COALESCE(u1.name, u2.name) as name,
         COALESCE(u1.email, u2.email) as email,
         COALESCE(u1.department, u2.department_id::text, '—') as department,
         COALESCE(a.status, 'Absent') AS attendance_status,
         a.check_in_time,
         a.check_out_time
       FROM (
         SELECT id, name, email, department, organization_id FROM "Users" WHERE organization_id = $1
         UNION
         SELECT user_id as id, name, email, department_id::text as department, organization_id FROM users WHERE organization_id = $1
       ) AS combined
       LEFT JOIN "Users" u1 ON u1.id = combined.id AND u1.organization_id = $1
       LEFT JOIN users u2 ON u2.user_id = combined.id AND u2.organization_id = $1
       LEFT JOIN "Attendances" a
         ON a.employee_id = combined.id
         AND DATE(a.check_in_time) = CURRENT_DATE
       ORDER BY combined.department NULLS LAST, combined.name`,
      [organizationId]
    );

    console.log('✓ Found', result.rows.length, 'employees');

    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Attendance overview error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

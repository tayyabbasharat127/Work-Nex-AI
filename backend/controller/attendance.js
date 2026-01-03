// controllers/attendanceController.js
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
    // OPTIONAL: office Wi-Fi validation (example subnet)
    if (!clientIP.startsWith('192.168.1.') && clientIP !== '::1') {
  return res.status(403).json({
    success: false,
    message: 'Not connected to office Wi-Fi'
  });
}
    // Check if already checked in today
    const already = await pool.query(
      `SELECT * FROM attendance
       WHERE user_id = $1
       AND DATE(check_in) = CURRENT_DATE`,
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

    const status = now > shiftStart ? 'late' : 'present';

    // Insert attendance record
    await pool.query(
      `INSERT INTO attendance
       (user_id, check_in, status, source, location)
       VALUES ($1, NOW(), $2, 'wifi', $3)`,
      [userId, status, clientIP]
    );

    res.json({
      success: true,
      message: 'Check-in successful',
      status
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// controllers/attendanceController.js

exports.checkOut = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Find today's active attendance
    const result = await pool.query(
      `SELECT * FROM attendance
       WHERE user_id = $1
       AND DATE(check_in) = CURRENT_DATE
       AND check_out IS NULL`,
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
    const status =
      now < shiftEnd ? "early_leave" : attendance.status;

    await pool.query(
      `UPDATE attendance
       SET check_out = NOW(),
           status = $1
       WHERE attendance_id = $2`,
      [status, attendance.attendance_id]
    );

    res.json({
      success: true,
      message: "Checked out successfully",
      status
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};
exports.ping = async (req, res) => {
  try {
    const userId = req.user.userId;
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // Must be office Wi-Fi
    if (!clientIP.startsWith("192.168.1.")) {
      return res.status(403).json({ success: false });
    }

    // Check today attendance
    const today = await pool.query(
      `SELECT * FROM attendance
       WHERE user_id = $1
       AND DATE(check_in) = CURRENT_DATE`,
      [userId]
    );

    // Auto check-in if none exists
    if (today.rows.length === 0) {
      await pool.query(
        `INSERT INTO attendance
         (user_id, check_in, status, source, location)
         VALUES ($1, NOW(), 'present', 'wifi', $2)`,
        [userId, clientIP]
      );
    }

    // Update last ping time (optional column)
    await pool.query(
      `UPDATE users SET last_seen = NOW()
       WHERE user_id = $1`,
      [userId]
    );

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};
exports.todayStatus = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT check_in, check_out, status, source
       FROM attendance
       WHERE user_id = $1
       AND DATE(check_in) = CURRENT_DATE`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({ status: "absent" });
    }

    res.json({
      success: true,
      attendance: result.rows[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};

exports.history = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT check_in, check_out, status, source
       FROM attendance
       WHERE user_id = $1
       ORDER BY check_in DESC`,
      [userId]
    );

    res.json({
      success: true,
      history: result.rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};

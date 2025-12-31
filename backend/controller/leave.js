const pool = require('../config/db');

/**
 * CREATE leave request
 */
exports.createLeave = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { leave_type, start_date, end_date, reason } = req.body;

    const result = await pool.query(
      `INSERT INTO leaves
       (user_id, leave_type, start_date, end_date, reason)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, leave_type, start_date, end_date, reason]
    );

    res.status(201).json({
      success: true,
      leave: result.rows[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};

/**
 * READ - get logged-in user's leaves
 */
exports.getMyLeaves = async (req, res) => {
  try {
    const userId = req.user.user_id;

    const result = await pool.query(
      `SELECT *
       FROM leaves
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      leaves: result.rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};

/**
 * READ - admin: get all leaves
 */
exports.getAllLeaves = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT l.*, u.name AS user_name
       FROM leaves l
       JOIN users u ON u.user_id = l.user_id
       ORDER BY l.created_at DESC`
    );

    res.json({
      success: true,
      leaves: result.rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};

/**
 * UPDATE - approve / reject leave (admin)
 */
exports.updateLeaveStatus = async (req, res) => {
  try {
    const adminId = req.user.user_id;
    const { leave_id } = req.params;
    const { status } = req.body; // approved | rejected

    const result = await pool.query(
      `UPDATE leaves
       SET status = $1,
           approved_by = $2
       WHERE leave_id = $3
       RETURNING *`,
      [status, adminId, leave_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Leave not found' });
    }

    res.json({
      success: true,
      leave: result.rows[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};

/**
 * DELETE - cancel leave (only pending)
 */
exports.deleteLeave = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { leave_id } = req.params;

    const result = await pool.query(
      `DELETE FROM leaves
       WHERE leave_id = $1
       AND user_id = $2
       AND status = 'pending'
       RETURNING *`,
      [leave_id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete approved/rejected leave'
      });
    }

    res.json({
      success: true,
      message: 'Leave deleted'
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};

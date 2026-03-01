const pool = require('../config/db');
const sendEmail = require('../utils/sendEmail');

/**
 * Helper: Calculate days between two dates
 */
const calculateLeaveDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end
  return diffDays;
};

/**
 * Helper: Get or create leave balance for user
 */
const getOrCreateLeaveBalance = async (userId) => {
  const currentYear = new Date().getFullYear();
  
  // Try to get existing balance
  let balance = await pool.query(
    'SELECT * FROM leave_balances WHERE user_id = $1 AND year = $2',
    [userId, currentYear]
  );

  // If doesn't exist, create it
  if (balance.rows.length === 0) {
    balance = await pool.query(
      `INSERT INTO leave_balances (user_id, year, annual_balance, used_annual, sick_balance, used_sick, casual_balance, used_casual, "createdAt", "updatedAt")
       VALUES ($1, $2, 20, 0, 10, 0, 7, 0, NOW(), NOW())
       RETURNING *`,
      [userId, currentYear]
    );
  }

  return balance.rows[0];
};

/**
 * CREATE leave request
 */
exports.createLeave = async (req, res) => {
  try {
    const userId = req.user.userId;
    const organizationId = req.user.organizationId;
    const { leave_type, start_date, end_date, reason } = req.body;

    // Calculate leave days
    const leaveDays = calculateLeaveDays(start_date, end_date);

    // Get user's leave balance
    const balance = await getOrCreateLeaveBalance(userId);

    // Check if user has enough balance
    const leaveTypeMap = {
      'Annual': { balance: balance.annual_balance, used: balance.used_annual },
      'Sick': { balance: balance.sick_balance, used: balance.used_sick },
      'Casual': { balance: balance.casual_balance, used: balance.used_casual }
    };

    const typeBalance = leaveTypeMap[leave_type];
    if (typeBalance) {
      const remaining = typeBalance.balance - typeBalance.used;
      if (leaveDays > remaining) {
        return res.status(400).json({
          success: false,
          error: `Insufficient ${leave_type.toLowerCase()} leave balance. You have ${remaining} days remaining.`
        });
      }
    }

    // Check for overlapping leaves
    const overlapCheck = await pool.query(
      `SELECT 1 FROM "Leaves"
       WHERE employee_id = $1
       AND status = 'Approved'
       AND (($2 BETWEEN start_date AND end_date)
         OR ($3 BETWEEN start_date AND end_date)
         OR ($2 < start_date AND $3 > end_date))`,
      [userId, start_date, end_date]
    );

    if (overlapCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Leave dates overlap with existing approved leave'
      });
    }

    // Create leave
    const result = await pool.query(
      `INSERT INTO "Leaves" (employee_id, leave_type, start_date, end_date, reason, status, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, 'Pending', NOW(), NOW())
       RETURNING *`,
      [userId, leave_type, start_date, end_date, reason]
    );

    // Get user details for email
    const user = await pool.query(
      'SELECT name, email FROM users WHERE user_id = $1',
      [userId]
    );

    // Send email to manager/admin
    const managers = await pool.query(
      'SELECT email, name FROM users WHERE organization_id = $1 AND role_id IN (0, 1)',
      [organizationId]
    );

    if (managers.rows.length > 0) {
      const managerEmails = managers.rows.map(m => m.email);
      const userName = user.rows[0]?.name || 'Employee';
      
      // Send to all managers/admins
      for (const manager of managers.rows) {
        sendEmail(
          manager.email,
          'WorkNex AI - New Leave Request',
          `Hello ${manager.name},\n\n${userName} has submitted a new leave request:\n\nType: ${leave_type}\nDates: ${start_date} to ${end_date} (${leaveDays} days)\nReason: ${reason}\n\nPlease review and approve/reject this request in the WorkNex dashboard.\n\nBest regards,\nWorkNex AI Team`
        ).catch(err => console.error('Email error:', err));
      }
    }

    res.json({
      success: true,
      message: 'Leave application submitted successfully',
      leave: result.rows[0]
    });

  } catch (err) {
    console.error('Create leave error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};


exports.getLeaveBalance = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get or create leave balance
    const balance = await getOrCreateLeaveBalance(userId);

    res.json({
      success: true,
      data: {
        annual_balance: balance.annual_balance,
        used_annual: balance.used_annual,
        remaining_annual: balance.annual_balance - balance.used_annual,
        
        sick_balance: balance.sick_balance,
        used_sick: balance.used_sick,
        remaining_sick: balance.sick_balance - balance.used_sick,
        
        casual_balance: balance.casual_balance,
        used_casual: balance.used_casual,
        remaining_casual: balance.casual_balance - balance.used_casual,
        
        year: balance.year
      }
    });
  } catch (err) {
    console.error('Get leave balance error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * READ - get logged-in user's leaves
 */
exports.getMyLeaves = async (req, res) => {
  try {
    const userId = req.user.userId;

    console.log('getMyLeaves - User ID:', userId);

    const result = await pool.query(
      `SELECT *
       FROM "Leaves"
       WHERE employee_id = $1
       ORDER BY "createdAt" DESC`,
      [userId]
    );

    console.log('getMyLeaves - Found', result.rows.length, 'leaves');

    res.json({
      success: true,
      leaves: result.rows
    });

  } catch (err) {
    console.error('getMyLeaves error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * READ - admin: get all leaves
 */
exports.getAllLeaves = async (req, res) => {
  try {
    const { organizationId } = req.user || {};

    console.log('getAllLeaves - Admin organization_id:', organizationId);

    if (!organizationId) {
      return res.status(403).json({ success: false, message: 'Missing organization context' });
    }

    // Get all leaves where the employee belongs to the admin's organization
    // Check both Users and users tables for the employee
    const result = await pool.query(
      `SELECT 
         l.*,
         COALESCE(u1.name, u2.name, 'Unknown') AS user_name,
         COALESCE(u1.email, u2.email, '') AS user_email
       FROM "Leaves" l
       LEFT JOIN "Users" u1 ON u1.id = l.employee_id
       LEFT JOIN users u2 ON u2.user_id = l.employee_id
       WHERE COALESCE(u1.organization_id, u2.organization_id) = $1
       ORDER BY l."createdAt" DESC`,
      [organizationId]
    );

    console.log('getAllLeaves - Found', result.rows.length, 'leaves for organization', organizationId);

    res.json({
      success: true,
      leaves: result.rows
    });

  } catch (err) {
    console.error('getAllLeaves error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * UPDATE - approve / reject leave (admin)
 */
exports.updateLeaveStatus = async (req, res) => {
  try {
    const adminId = req.user.userId;
    const { leave_id } = req.params;
    const { status } = req.body; // Approved | Rejected

    // Get leave details before updating
    const leaveDetails = await pool.query(
      'SELECT * FROM "Leaves" WHERE id = $1',
      [leave_id]
    );

    if (leaveDetails.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Leave not found' });
    }

    const leave = leaveDetails.rows[0];
    const leaveDays = calculateLeaveDays(leave.start_date, leave.end_date);

    // Update leave status
    const result = await pool.query(
      `UPDATE "Leaves"
       SET status = $1,
           manager_id = $2,
           approved_at = NOW(),
           "updatedAt" = NOW()
       WHERE id = $3
       RETURNING *`,
      [status, adminId, leave_id]
    );

    // Update leave balance based on status
    if (status === 'Approved') {
      // Deduct from balance
      const leaveTypeColumn = {
        'Annual': 'used_annual',
        'Sick': 'used_sick',
        'Casual': 'used_casual'
      }[leave.leave_type];

      if (leaveTypeColumn) {
        await pool.query(
          `UPDATE leave_balances 
           SET ${leaveTypeColumn} = ${leaveTypeColumn} + $1,
               "updatedAt" = NOW()
           WHERE user_id = $2 AND year = EXTRACT(YEAR FROM CURRENT_DATE)`,
          [leaveDays, leave.employee_id]
        );
      }
    } else if (status === 'Rejected' && leave.status === 'Approved') {
      // If previously approved and now rejected, restore balance
      const leaveTypeColumn = {
        'Annual': 'used_annual',
        'Sick': 'used_sick',
        'Casual': 'used_casual'
      }[leave.leave_type];

      if (leaveTypeColumn) {
        await pool.query(
          `UPDATE leave_balances 
           SET ${leaveTypeColumn} = GREATEST(${leaveTypeColumn} - $1, 0),
               "updatedAt" = NOW()
           WHERE user_id = $2 AND year = EXTRACT(YEAR FROM CURRENT_DATE)`,
          [leaveDays, leave.employee_id]
        );
      }
    }

    // Get employee email
    const employee = await pool.query(
      'SELECT name, email FROM users WHERE user_id = $1',
      [leave.employee_id]
    );

    // Send email notification to employee
    if (employee.rows.length > 0) {
      const emp = employee.rows[0];
      const statusText = status === 'Approved' ? 'approved' : 'rejected';
      
      sendEmail(
        emp.email,
        `WorkNex AI - Leave Request ${status}`,
        `Hello ${emp.name},\n\nYour leave request has been ${statusText}.\n\nDetails:\nType: ${leave.leave_type}\nDates: ${leave.start_date} to ${leave.end_date} (${leaveDays} days)\nReason: ${leave.reason}\n\n${status === 'Approved' ? 'Enjoy your time off!' : 'Please contact your manager if you have any questions.'}\n\nBest regards,\nWorkNex AI Team`
      ).catch(err => console.error('Email error:', err));
    }

    res.json({
      success: true,
      leave: result.rows[0]
    });

  } catch (err) {
    console.error('Update leave status error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * DELETE - cancel leave (only pending)
 */
exports.deleteLeave = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { leave_id } = req.params;

    const result = await pool.query(
      `DELETE FROM "Leaves"
       WHERE id = $1
       AND employee_id = $2
       AND status = 'Pending'
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

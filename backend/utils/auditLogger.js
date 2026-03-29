const pool = require('../config/db');

/**
 * Log super admin actions to superadmin_audit_logs table
 * @param {number} superAdminId - User ID of the super admin
 * @param {string} action - Action performed (e.g., 'update_org_status', 'create_package')
 * @param {string} targetType - Type of target ('organization', 'user', 'package')
 * @param {number} targetId - ID of the target entity
 * @param {object} details - Additional details about the action
 * @param {string} ipAddress - IP address of the request
 */
exports.logAction = async (superAdminId, action, targetType, targetId, details, ipAddress) => {
  try {
    await pool.query(
      `INSERT INTO superadmin_audit_logs 
       (super_admin_id, action, target_type, target_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [superAdminId, action, targetType, targetId, JSON.stringify(details), ipAddress]
    );
  } catch (err) {
    console.error('Audit log error:', err);
    // Don't throw - audit logging should not block operations
  }
};

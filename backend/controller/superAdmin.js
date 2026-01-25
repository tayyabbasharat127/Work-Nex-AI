const pool = require('../config/db');
const auditLogger = require('../utils/auditLogger');

/**
 * Get all organizations with subscription details
 */
exports.getAllOrganizations = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        organization_id,
        organization_name,
        organization_email,
        admin_email,
        subscription_plan,
        package_start_date,
        package_expiry_date,
        status,
        is_verified,
        created_at,
        CASE 
          WHEN package_expiry_date IS NULL THEN NULL
          ELSE EXTRACT(DAY FROM (package_expiry_date - NOW()))
        END as days_remaining
      FROM organization
      ORDER BY package_expiry_date ASC NULLS LAST
    `);
    
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get all organizations error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Get organization details by ID
 */
exports.getOrganizationDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    const org = await pool.query(
      `SELECT * FROM organization WHERE organization_id = $1`,
      [id]
    );
    
    if (!org.rows.length) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }
    
    const userCount = await pool.query(
      `SELECT COUNT(*) as total FROM users WHERE organization_id = $1`,
      [id]
    );
    
    res.json({ 
      success: true, 
      data: {
        ...org.rows[0],
        user_count: userCount.rows[0].total
      }
    });
  } catch (err) {
    console.error('Get organization details error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Update organization status (active/suspended)
 */
exports.updateOrganizationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { userId } = req.user;
    
    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }
    
    // Get old status for audit log
    const oldOrg = await pool.query(
      `SELECT status FROM organization WHERE organization_id = $1`,
      [id]
    );
    
    if (!oldOrg.rows.length) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }
    
    // Update status
    await pool.query(
      `UPDATE organization SET status = $1 WHERE organization_id = $2`,
      [status, id]
    );
    
    // Log action
    await auditLogger.logAction(
      userId,
      'update_org_status',
      'organization',
      id,
      { old_status: oldOrg.rows[0].status, new_status: status },
      req.ip
    );
    
    res.json({ success: true, message: 'Organization status updated' });
  } catch (err) {
    console.error('Update organization status error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Update organization package and expiry dates
 */
exports.updateOrganizationPackage = async (req, res) => {
  try {
    const { id } = req.params;
    const { package_name, package_start_date, package_expiry_date } = req.body;
    const { userId } = req.user;
    
    if (!package_name) {
      return res.status(400).json({ success: false, message: 'Package name is required' });
    }
    
    // Check if organization exists
    const orgCheck = await pool.query(
      `SELECT organization_id FROM organization WHERE organization_id = $1`,
      [id]
    );
    
    if (!orgCheck.rows.length) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }
    
    await pool.query(
      `UPDATE organization 
       SET subscription_plan = $1, 
           package_start_date = $2, 
           package_expiry_date = $3
       WHERE organization_id = $4`,
      [package_name, package_start_date, package_expiry_date, id]
    );
    
    await auditLogger.logAction(
      userId,
      'update_org_package',
      'organization',
      id,
      { package_name, package_start_date, package_expiry_date },
      req.ip
    );
    
    res.json({ success: true, message: 'Package updated successfully' });
  } catch (err) {
    console.error('Update organization package error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Get all users across organizations
 */
exports.getAllUsers = async (req, res) => {
  try {
    const { organization_id } = req.query;
    
    let query = `
      SELECT u.user_id, u.name, u.email, u.role_id, u.department_id, 
             u.organization_id, u.status, u.created_at,
             o.organization_name
      FROM users u
      LEFT JOIN organization o ON u.organization_id = o.organization_id
      WHERE u.role_id != 0
    `;
    
    const params = [];
    if (organization_id) {
      query += ' AND u.organization_id = $1';
      params.push(organization_id);
    }
    
    query += ' ORDER BY u.created_at DESC';
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get all users error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Get platform-wide analytics
 */
exports.getPlatformAnalytics = async (req, res) => {
  try {
    // Total organizations
    const orgCount = await pool.query(`SELECT COUNT(*) as total FROM organization`);
    
    // Total users (excluding super admin)
    const userCount = await pool.query(`SELECT COUNT(*) as total FROM users WHERE role_id != 0`);
    
    // Active users
    const activeUsers = await pool.query(`SELECT COUNT(*) as total FROM users WHERE status = 'active' AND role_id != 0`);
    
    // Package distribution
    const packageDist = await pool.query(`
      SELECT subscription_plan, COUNT(*) as count 
      FROM organization 
      GROUP BY subscription_plan
    `);
    
    // Status breakdown
    const statusBreakdown = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM organization 
      GROUP BY status
    `);
    
    // Expiring packages (within 7 days)
    const expiring = await pool.query(`
      SELECT COUNT(*) as total 
      FROM organization 
      WHERE package_expiry_date BETWEEN NOW() AND NOW() + INTERVAL '7 days'
    `);
    
    // Expired packages
    const expired = await pool.query(`
      SELECT COUNT(*) as total 
      FROM organization 
      WHERE package_expiry_date < NOW()
    `);
    
    // Recent registrations
    const recentOrgs = await pool.query(`
      SELECT organization_id, organization_name, created_at
      FROM organization
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    res.json({
      success: true,
      data: {
        total_organizations: parseInt(orgCount.rows[0].total),
        total_users: parseInt(userCount.rows[0].total),
        active_users: parseInt(activeUsers.rows[0].total),
        package_distribution: packageDist.rows,
        status_breakdown: statusBreakdown.rows,
        expiring_packages: parseInt(expiring.rows[0].total),
        expired_packages: parseInt(expired.rows[0].total),
        recent_registrations: recentOrgs.rows
      }
    });
  } catch (err) {
    console.error('Get platform analytics error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Get audit logs with optional filters
 */
exports.getAuditLogs = async (req, res) => {
  try {
    const { limit = 100, offset = 0, action, target_type } = req.query;
    
    let query = `SELECT * FROM superadmin_audit_logs WHERE 1=1`;
    const params = [];
    let paramCount = 1;
    
    if (action) {
      query += ` AND action = $${paramCount}`;
      params.push(action);
      paramCount++;
    }
    
    if (target_type) {
      query += ` AND target_type = $${paramCount}`;
      params.push(target_type);
      paramCount++;
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get audit logs error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

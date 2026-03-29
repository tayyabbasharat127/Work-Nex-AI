const pool = require('../config/db');
const bcrypt = require('bcrypt');

exports.createUser = async (req, res) => {
  try {
    const { organizationId, roleId } = req.user || {};
    const { email, name, password, role_id, department_id, manager_id } = req.body;

    console.log('Creating user - organizationId:', organizationId, 'roleId:', roleId);

    // Check if user is super admin (roleId 0) - they can't create users
    if (roleId === 0) {
      return res.status(403).json({ 
        success: false, 
        message: 'Super admins cannot create users. Please log in as an organization admin.' 
      });
    }

    if (!organizationId) {
      return res.status(403).json({ success: false, message: 'Organization ID is required. Please log in as an organization admin.' });
    }

    // Check if organization exists
    const orgCheck = await pool.query(
      `SELECT id FROM "Organizations" WHERE id = $1`,
      [organizationId]
    );

    if (!orgCheck.rowCount) {
      return res.status(400).json({ 
        success: false, 
        message: `Organization with ID ${organizationId} does not exist. Please contact support.` 
      });
    }

    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required' });
    }

    // Check if email already exists
    const existingUser = await pool.query(
      'SELECT user_id FROM users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ success: false, message: "Email already exists" });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create new user
    const result = await pool.query(
      `INSERT INTO users (
        name,
        email,
        password_hash,
        role_id,
        department_id,
        manager_id,
        organization_id,
        status,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW())
      RETURNING user_id, name, email, role_id, department_id, manager_id, organization_id, created_at`,
      [name, email, passwordHash, role_id, department_id || null, manager_id || null, organizationId]
    );

    const user = result.rows[0];
    res.status(201).json({ success: true, message: "User created", data: user });
  } catch (e) { 
    console.error('Error creating user:', e);
    res.status(500).json({ success: false, message: e.message }); 
  }
};

exports.getUser = async (req, res) => {
  try {
    const { organizationId } = req.user || {};
    const { department_id } = req.query;

    if (!organizationId) {
      return res.status(403).json({ success: false, message: 'Missing organization context' });
    }

    let query = `SELECT user_id, name, email, role_id, department_id, manager_id, organization_id, created_at
                 FROM users
                 WHERE organization_id = $1`;
    const params = [organizationId];

    if (department_id) {
      query += ' AND department_id = $2';
      params.push(department_id);
    }

    query += ' ORDER BY created_at DESC';

    const allusers = await pool.query(query, params);

    if (!allusers.rows || allusers.rows.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    return res.status(200).json({ success: true, data: allusers.rows });
  } catch (error) { 
    res.status(500).json({ success: false, message: error.message }); 
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.user || {};
    const { name, email, role_id, department_id, manager_id, password } = req.body;

    if (!id || !organizationId) {
      return res.status(400).json({
        success: false,
        message: "User ID and organization context are required"
      });
    }

    let passwordHash = null;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    // Update user
    const updateResult = await pool.query(
      `UPDATE users SET
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        role_id = COALESCE($3, role_id),
        department_id = COALESCE($4, department_id),
        manager_id = COALESCE($5, manager_id),
        password_hash = COALESCE($6, password_hash),
        updated_at = NOW()
       WHERE user_id = $7 AND organization_id = $8`,
      [name || null, email || null, role_id || null, department_id || null, manager_id || null, passwordHash, id, organizationId]
    );

    if (updateResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Get updated user (excluding password)
    const updatedUser = await pool.query(
      `SELECT user_id, name, email, role_id, department_id, manager_id, organization_id, created_at, updated_at
       FROM users WHERE user_id = $1 AND organization_id = $2`,
      [id, organizationId]
    );

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: updatedUser.rows[0]
    });

  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.user || {};

    if (!organizationId) {
      return res.status(403).json({ success: false, message: 'Missing organization context' });
    }

    const deleteResult = await pool.query(
      'DELETE FROM users WHERE user_id = $1 AND organization_id = $2',
      [id, organizationId]
    );

    if (deleteResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    return res.status(200).json({ 
      success: true, 
      message: 'User deleted Successfully' 
    });
  } catch (e) {
    return res.status(500).json({ 
      success: false, 
      message: e.message 
    });
  }
};
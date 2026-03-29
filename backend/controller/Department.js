const pool = require('../config/db');

exports.getAllDepartments = async (req, res) => {
  try {
    const { organizationId } = req.user;
    const result = await pool.query(
      `SELECT department_id, name, manager_id, description, created_at, updated_at
       FROM departments
       WHERE organization_id = $1
       ORDER BY name`,
      [organizationId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.createDepartment = async (req, res) => {
  try {
<<<<<<< HEAD
    const { organizationId, roleId, userId } = req.user;
    const { name, manager_id, description } = req.body;

    console.log('=== CREATE DEPARTMENT DEBUG ===');
    console.log('req.user:', req.user);
    console.log('organizationId:', organizationId, 'type:', typeof organizationId);
    console.log('roleId:', roleId);
    console.log('userId:', userId);
    console.log('Department name:', name);

    // Check if user is super admin (roleId 0) - they can't create departments
    if (roleId === 0) {
      console.log('❌ Super admin attempted to create department');
      return res.status(403).json({ 
        success: false, 
        message: 'Super admins cannot create departments. Please log in as an organization admin.' 
      });
    }

    // Check if organization exists
    if (!organizationId) {
      console.log('❌ No organization ID provided');
      return res.status(400).json({ 
        success: false, 
        message: 'Organization ID is required. Please log in as an organization admin.' 
      });
    }

    console.log('Checking if organization exists...');
    const orgCheck = await pool.query(
      `SELECT id, organization_name, status FROM "Organizations" WHERE id = $1`,
      [organizationId]
    );

    console.log('Organization check result:', orgCheck.rows);

    if (!orgCheck.rowCount) {
      console.log(`❌ Organization ${organizationId} does not exist`);
      return res.status(400).json({ 
        success: false, 
        message: `Organization with ID ${organizationId} does not exist. Please contact support.` 
      });
    }

    console.log('✓ Organization exists:', orgCheck.rows[0]);

    if (manager_id) {
      const managerCheck = await pool.query(
        `SELECT 1 FROM users WHERE user_id = $1 AND organization_id = $2`,
        [manager_id, organizationId]
      );
      if (!managerCheck.rowCount) {
        console.log('❌ Invalid manager');
=======
    const { organizationId } = req.user;
    const { name, manager_id, description } = req.body;

    if (manager_id) {
      const managerCheck = await pool.query(
        `SELECT 1 FROM "Users" WHERE id = $1 AND organization_id = $2`,
        [manager_id, organizationId]
      );
      if (!managerCheck.rowCount) {
>>>>>>> 0544562a1075bdc98c91d928eccf30541806636d
        return res.status(400).json({ success: false, message: 'Invalid manager for this organization' });
      }
    }

<<<<<<< HEAD
    console.log('Inserting department...');
=======
>>>>>>> 0544562a1075bdc98c91d928eccf30541806636d
    const result = await pool.query(
      `INSERT INTO departments (name, manager_id, description, organization_id, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING department_id, name, manager_id, description, organization_id, created_at`,
      [name, manager_id || null, description || null, organizationId]
    );

<<<<<<< HEAD
    console.log('✓ Department created:', result.rows[0]);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('❌ Error creating department:', err);
=======
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
>>>>>>> 0544562a1075bdc98c91d928eccf30541806636d
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.updateDepartment = async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { id } = req.params;
    const { name, manager_id, description } = req.body;

    if (manager_id) {
      const managerCheck = await pool.query(
        `SELECT 1 FROM "Users" WHERE id = $1 AND organization_id = $2`,
        [manager_id, organizationId]
      );
      if (!managerCheck.rowCount) {
        return res.status(400).json({ success: false, message: 'Invalid manager for this organization' });
      }
    }

    const result = await pool.query(
      `UPDATE departments
         SET name = COALESCE($1, name),
             manager_id = COALESCE($2, manager_id),
             description = COALESCE($3, description),
             updated_at = NOW()
       WHERE department_id = $4 AND organization_id = $5
       RETURNING department_id, name, manager_id, description, organization_id, updated_at`,
      [name || null, manager_id || null, description || null, id, organizationId]
    );

    if (!result.rowCount) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteDepartment = async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM departments WHERE department_id = $1 AND organization_id = $2`,
      [id, organizationId]
    );

    if (!result.rowCount) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    res.json({ success: true, message: 'Department deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
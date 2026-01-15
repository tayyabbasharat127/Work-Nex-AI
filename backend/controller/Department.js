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
    const { organizationId } = req.user;
    const { name, manager_id, description } = req.body;

    if (manager_id) {
      const managerCheck = await pool.query(
        `SELECT 1 FROM users WHERE user_id = $1 AND organization_id = $2`,
        [manager_id, organizationId]
      );
      if (!managerCheck.rowCount) {
        return res.status(400).json({ success: false, message: 'Invalid manager for this organization' });
      }
    }

    const result = await pool.query(
      `INSERT INTO departments (name, manager_id, description, organization_id, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING department_id, name, manager_id, description, organization_id, created_at`,
      [name, manager_id || null, description || null, organizationId]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
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
        `SELECT 1 FROM users WHERE user_id = $1 AND organization_id = $2`,
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
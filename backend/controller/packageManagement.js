const pool = require('../config/db');
const auditLogger = require('../utils/auditLogger');

/**
 * Get all subscription packages
 */
exports.getAllPackages = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM subscription_packages 
      ORDER BY price ASC
    `);
    
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get all packages error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Create a new subscription package
 */
exports.createPackage = async (req, res) => {
  try {
    const { package_name, price, features } = req.body;
    const { userId } = req.user;
    
    if (!package_name || !price) {
      return res.status(400).json({ 
        success: false, 
        message: 'Package name and price are required' 
      });
    }
    
    if (price < 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Package price must be positive' 
      });
    }
    
    const result = await pool.query(
      `INSERT INTO subscription_packages (package_name, price, features)
       VALUES ($1, $2, $3) RETURNING *`,
      [package_name, price, JSON.stringify(features || [])]
    );
    
    await auditLogger.logAction(
      userId, 
      'create_package', 
      'package', 
      result.rows[0].package_id, 
      { package_name, price, features }, 
      req.ip
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Create package error:', err);
    if (err.code === '23505') { // Unique constraint violation
      return res.status(400).json({ 
        success: false, 
        message: 'Package name already exists' 
      });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Update an existing package
 */
exports.updatePackage = async (req, res) => {
  try {
    const { id } = req.params;
    const { price, features } = req.body;
    const { userId } = req.user;
    
    if (price !== undefined && price < 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Package price must be positive' 
      });
    }
    
    const result = await pool.query(
      `UPDATE subscription_packages 
       SET price = COALESCE($1, price), 
           features = COALESCE($2, features),
           updated_at = NOW()
       WHERE package_id = $3 RETURNING *`,
      [price, features ? JSON.stringify(features) : null, id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Package not found' 
      });
    }
    
    await auditLogger.logAction(
      userId, 
      'update_package', 
      'package', 
      id, 
      { price, features }, 
      req.ip
    );
    
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Update package error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Delete a package (only if not in use)
 */
exports.deletePackage = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    
    // Get package name
    const pkg = await pool.query(
      `SELECT package_name FROM subscription_packages WHERE package_id = $1`,
      [id]
    );
    
    if (!pkg.rows.length) {
      return res.status(404).json({ 
        success: false, 
        message: 'Package not found' 
      });
    }
    
    // Check if package is in use by any organization
    const inUse = await pool.query(
      `SELECT COUNT(*) as count FROM organization 
       WHERE subscription_plan = $1`,
      [pkg.rows[0].package_name]
    );
    
    if (parseInt(inUse.rows[0].count) > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete package: currently in use by organizations' 
      });
    }
    
    await pool.query(`DELETE FROM subscription_packages WHERE package_id = $1`, [id]);
    
    await auditLogger.logAction(
      userId, 
      'delete_package', 
      'package', 
      id, 
      { package_name: pkg.rows[0].package_name }, 
      req.ip
    );
    
    res.json({ success: true, message: 'Package deleted successfully' });
  } catch (err) {
    console.error('Delete package error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Add a feature to a package
 */
exports.addFeature = async (req, res) => {
  try {
    const { id } = req.params;
    const { feature } = req.body;
    const { userId } = req.user;
    
    if (!feature) {
      return res.status(400).json({ 
        success: false, 
        message: 'Feature is required' 
      });
    }
    
    // Get current features
    const pkg = await pool.query(
      `SELECT features FROM subscription_packages WHERE package_id = $1`,
      [id]
    );
    
    if (!pkg.rows.length) {
      return res.status(404).json({ 
        success: false, 
        message: 'Package not found' 
      });
    }
    
    const currentFeatures = pkg.rows[0].features || [];
    
    // Check if feature already exists
    if (currentFeatures.includes(feature)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Feature already exists in package' 
      });
    }
    
    // Add feature
    const updatedFeatures = [...currentFeatures, feature];
    
    const result = await pool.query(
      `UPDATE subscription_packages 
       SET features = $1, updated_at = NOW()
       WHERE package_id = $2 RETURNING *`,
      [JSON.stringify(updatedFeatures), id]
    );
    
    await auditLogger.logAction(
      userId, 
      'add_feature', 
      'package', 
      id, 
      { feature }, 
      req.ip
    );
    
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Add feature error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Remove a feature from a package
 */
exports.removeFeature = async (req, res) => {
  try {
    const { id } = req.params;
    const { feature } = req.body;
    const { userId } = req.user;
    
    if (!feature) {
      return res.status(400).json({ 
        success: false, 
        message: 'Feature is required' 
      });
    }
    
    // Get current features
    const pkg = await pool.query(
      `SELECT features FROM subscription_packages WHERE package_id = $1`,
      [id]
    );
    
    if (!pkg.rows.length) {
      return res.status(404).json({ 
        success: false, 
        message: 'Package not found' 
      });
    }
    
    const currentFeatures = pkg.rows[0].features || [];
    
    // Remove feature
    const updatedFeatures = currentFeatures.filter(f => f !== feature);
    
    const result = await pool.query(
      `UPDATE subscription_packages 
       SET features = $1, updated_at = NOW()
       WHERE package_id = $2 RETURNING *`,
      [JSON.stringify(updatedFeatures), id]
    );
    
    await auditLogger.logAction(
      userId, 
      'remove_feature', 
      'package', 
      id, 
      { feature }, 
      req.ip
    );
    
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Remove feature error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

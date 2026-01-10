const pool = require('../config/db');
const fs = require('fs');
const path = require('path');
exports.generateReport = async (req, res) => {
  try {
    const { type, startDate, endDate, departmentId, format } = req.body;
    
    let reportData;
    let query;
    const params = [startDate, endDate];
    
    if (type === 'attendance') {
      query = `
        SELECT 
           u.name,
           u.email,
           d.name as department,
           COUNT(a.attendance_id) as total_days,
           COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_days,
           COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_days,
           COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_days,
           AVG(EXTRACT(EPOCH FROM (a.check_out - a.check_in))/3600) as avg_hours
         FROM users u
         LEFT JOIN departments d ON u.department_id = d.department_id
         LEFT JOIN attendance a ON u.user_id = a.user_id 
           AND DATE(a.check_in) BETWEEN $1 AND $2`;
      
      if (departmentId) {
        query += ' WHERE u.department_id = $3';
        params.push(departmentId);
      }
      
      query += ' GROUP BY u.user_id, u.name, u.email, d.name';
      reportData = await pool.query(query, params);
      
    } else if (type === 'leaves') {
      query = `
        SELECT 
           u.name,
           u.email,
           d.name as department,
           COUNT(l.leave_id) as total_leaves,
           COUNT(CASE WHEN l.status = 'approved' THEN 1 END) as approved,
           COUNT(CASE WHEN l.status = 'pending' THEN 1 END) as pending,
           COUNT(CASE WHEN l.status = 'rejected' THEN 1 END) as rejected,
           SUM(EXTRACT(DAY FROM (l.end_date - l.start_date)) + 1) as total_days
         FROM users u
         LEFT JOIN departments d ON u.department_id = d.department_id
         LEFT JOIN leaves l ON u.user_id = l.user_id 
           AND l.start_date BETWEEN $1 AND $2`;
      
      if (departmentId) {
        query += ' WHERE u.department_id = $3';
        params.push(departmentId);
      }
      
      query += ' GROUP BY u.user_id, u.name, u.email, d.name';
      reportData = await pool.query(query, params);
    }
    
    // Generate file (simplified - you can use proper libraries)
    const filename = `${type}_report_${Date.now()}.${format}`;
    const filePath = path.join(__dirname, '../reports', filename);
    
    // Save file (implement proper CSV/Excel generation)
    fs.writeFileSync(filePath, JSON.stringify(reportData.rows, null, 2));
    
    // Save to database
    await pool.query(
      `INSERT INTO reports (name, type, parameters, file_path, status, generated_by)
       VALUES ($1, $2, $3, $4, 'completed', $5)`,
      [filename, type, JSON.stringify({ startDate, endDate, departmentId }), filePath, req.user.userId]
    );
    
    res.json({ 
      success: true, 
      data: { filename, filePath, recordCount: reportData.rows.length }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
exports.getReports = async (req, res) => {
  try {
    const reports = await pool.query(
      `SELECT r.*, u.name as generated_by_name 
       FROM reports r
       LEFT JOIN users u ON r.generated_by = u.user_id
       ORDER BY r.created_at DESC`
    );
    
    res.json({ success: true, data: reports.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

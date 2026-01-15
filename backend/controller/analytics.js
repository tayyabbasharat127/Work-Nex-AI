const pool = require('../config/db');
exports.getKPIs = async (req, res) => {
  try {
    const { dateRange, departmentId } = req.query;
    
    const totalEmployees = await pool.query(
      `SELECT COUNT(*) as total FROM users WHERE status = 'active'`
    );
    
    const todayAttendance = await pool.query(
      `SELECT COUNT(*) as present FROM attendance 
       WHERE DATE(check_in) = CURRENT_DATE AND status = 'present'`
    );
    
    const todayLeaves = await pool.query(
      `SELECT COUNT(*) as onLeave FROM leaves 
       WHERE CURRENT_DATE BETWEEN start_date AND end_date AND status = 'approved'`
    );
    
    const kpis = {
      totalEmployees: totalEmployees.rows[0].total,
      presentToday: todayAttendance.rows[0].present,
      absentToday: totalEmployees.rows[0].total - todayAttendance.rows[0].present,
      onLeaveToday: todayLeaves.rows[0].onLeave,
      attendanceRate: ((todayAttendance.rows[0].present / totalEmployees.rows[0].total) * 100).toFixed(1)
    };
    
    res.json({ success: true, data: kpis });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
exports.getTrends = async (req, res) => {
  try {
    const { startDate, endDate, departmentId } = req.query;
    
    let query = `
      SELECT 
         DATE(check_in) as date,
         COUNT(*) as total,
         COUNT(CASE WHEN status = 'present' THEN 1 END) as present,
         COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent,
         COUNT(CASE WHEN status = 'late' THEN 1 END) as late
       FROM attendance 
       WHERE DATE(check_in) BETWEEN $1 AND $2`;
    
    const params = [startDate, endDate];
    
    if (departmentId) {
      query += ' AND user_id IN (SELECT user_id FROM users WHERE department_id = $3)';
      params.push(departmentId);
    }
    
    query += ' GROUP BY DATE(check_in) ORDER BY date DESC';
    
    const trends = await pool.query(query, params);
    
    res.json({ success: true, data: trends.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
exports.getDepartmentAnalytics = async (req, res) => {
  try {
    const departments = await pool.query(
      `SELECT 
         d.name as department,
         COUNT(u.user_id) as total_employees,
         COUNT(a.attendance_id) as present_today,
         COUNT(l.leave_id) as on_leave_today
       FROM departments d
       LEFT JOIN users u ON d.department_id = u.department_id
       LEFT JOIN attendance a ON u.user_id = a.user_id AND DATE(a.check_in) = CURRENT_DATE
       LEFT JOIN leaves l ON u.user_id = l.user_id 
         AND CURRENT_DATE BETWEEN l.start_date AND l.end_date AND l.status = 'approved'
       GROUP BY d.department_id, d.name`
    );
    
    res.json({ success: true, data: departments.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

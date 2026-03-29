const pool = require('../config/db');
exports.sendNotification = async (req, res) => {
  try {
    const { userIds, title, message, type, priority } = req.body;
    
    // Insert notifications one by one to avoid parameter binding issues
    for (const userId of userIds) {
      await pool.query(
        'INSERT INTO notifications (user_id, title, message, type, priority, created_at, read) VALUES ($1, $2, $3, $4, $5, NOW(), false)',
        [userId, title, message, type, priority || 'medium']
      );
    }
    
    res.json({ success: true, message: 'Notifications sent successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;
    
    const notifications = await pool.query(
      `SELECT * FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, (page - 1) * limit]
    );
    
    const unreadCount = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = false',
      [userId]
    );
    
    res.json({ 
      success: true, 
      data: notifications.rows,
      unreadCount: unreadCount.rows[0].count
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    await pool.query(
      'UPDATE notifications SET read = true, read_at = NOW() WHERE notification_id = $1 AND user_id = $2',
      [id, userId]
    );
    
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

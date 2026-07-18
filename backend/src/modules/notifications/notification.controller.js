const notificationService = require('./notification.service');
const { apiResponse } = require('../../utils/ApiResponse');

const getMyNotifications = async (req, res) => {
  const result = await notificationService.getMyNotifications(req.user, req.query);
  apiResponse(res, 200, 'Notifications fetched', result.notifications, result.meta);
};

const getUnreadCount = async (req, res) => {
  const count = await notificationService.getUnreadCount(req.user);
  apiResponse(res, 200, 'Unread count', { count });
};

const markAsRead = async (req, res) => {
  await notificationService.markAsRead(req.params.id, req.user);
  apiResponse(res, 200, 'Marked as read');
};

const markAllAsRead = async (req, res) => {
  await notificationService.markAllAsRead(req.user);
  apiResponse(res, 200, 'All notifications marked as read');
};

const deleteNotification = async (req, res) => {
  await notificationService.deleteNotification(req.params.id, req.user);
  apiResponse(res, 200, 'Notification deleted');
};

const broadcast = async (req, res) => {
  const { type, title, message, role } = req.body;
  const result = await notificationService.broadcast(type, title, message, role, req.user);
  apiResponse(res, 200, 'Broadcast sent', { count: result.count });
};

module.exports = {
  getMyNotifications, getUnreadCount, markAsRead,
  markAllAsRead, deleteNotification, broadcast,
};

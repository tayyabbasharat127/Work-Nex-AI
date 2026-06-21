const express = require('express');
const router = express.Router();
const notificationController = require('./notification.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

router.use(authenticate);

// Named routes BEFORE parameterized /:id
router.get('/',             notificationController.getMyNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.put('/read-all',     notificationController.markAllAsRead);
router.put('/:id/read',     notificationController.markAsRead);
router.delete('/:id',       notificationController.deleteNotification);

// Admin: broadcast notification
router.post('/broadcast', authorize('SUPER_ADMIN', 'ADMIN'), notificationController.broadcast);

module.exports = router;

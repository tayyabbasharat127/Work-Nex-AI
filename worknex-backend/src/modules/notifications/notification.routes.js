const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const notificationController = require('./notification.controller');
const { authenticate, requirePermission } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');

router.use(authenticate);

// Named routes BEFORE parameterized /:id
router.get('/', query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 100 }), query('isRead').optional().isBoolean(), validate, notificationController.getMyNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.put('/read-all',     notificationController.markAllAsRead);
router.put('/:id/read', param('id').isUUID(), validate, notificationController.markAsRead);
router.delete('/:id', param('id').isUUID(), validate, notificationController.deleteNotification);

// Admin: broadcast notification
router.post(
  '/broadcast',
  requirePermission('notifications:broadcast'),
  body('type').isIn(['LEAVE_APPLIED', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'ATTENDANCE_ALERT', 'SYSTEM', 'REMINDER']),
  body('title').isString().trim().isLength({ min: 1, max: 200 }),
  body('message').isString().trim().isLength({ min: 1, max: 2000 }),
  body('role').optional({ nullable: true }).isIn(['ADMIN', 'MANAGER', 'EMPLOYEE']),
  validate,
  notificationController.broadcast,
);

module.exports = router;

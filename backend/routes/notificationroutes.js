const express = require('express');
const router = express.Router();
const { sendNotification, getNotifications, markAsRead } = require('../controller/notifications');
const authenticateToken = require('../middleware/authentication');
router.post('/send', authenticateToken, sendNotification);
router.get('/', authenticateToken, getNotifications);
router.put('/read/:id', authenticateToken, markAsRead);
module.exports = router;

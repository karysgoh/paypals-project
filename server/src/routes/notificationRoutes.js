const express = require('express');
const notificationController = require('../controllers/notificationController');
const { verifyAccessToken } = require('../middlewares/jwtMiddleware');
const { validateNotificationCreation } = require('../middlewares/validators');
const { sanitizeNotificationInput } = require('../middlewares/sanitizers');

const router = express.Router();

// All notification routes require authentication
router.use(verifyAccessToken);

// GET /api/notifications - Get user notifications
router.get('/', notificationController.getUserNotifications);

// GET /api/notifications/unread-count - Get unread notification count
router.get('/unread-count', notificationController.getUnreadCount);

// PATCH /api/notifications/:notificationId/read - Mark notification as read
router.patch('/:notificationId/read', notificationController.markAsRead);

// PATCH /api/notifications/read-all - Mark all notifications as read
router.patch('/read-all', notificationController.markAllAsRead);

// DELETE /api/notifications/:notificationId - Delete a notification
router.delete('/:notificationId', notificationController.deleteNotification);

// POST /api/notifications - Create a manual notification (admin use)
router.post('/', 
    sanitizeNotificationInput,
    validateNotificationCreation,
    notificationController.createNotification
);

// POST /api/notifications/payment-reminders - Trigger payment reminders
router.post('/payment-reminders', notificationController.triggerPaymentReminders);

// POST /api/notifications/daily-reminders - Trigger daily payment reminders (for cron jobs)
router.post('/daily-reminders', notificationController.triggerDailyReminders);

module.exports = router;
const notificationModel = require('../models/notificationModel');
const logger = require("../logger.js");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");

const mapNotificationError = (error) => {
    const message = (error && error.message) ? error.message : String(error);
    if (message.includes('Access denied')) return { status: 403, message };
    if (message.toLowerCase().includes('notification not found')) return { status: 404, message: 'Notification not found' };
    if (message.toLowerCase().includes('invalid notification type')) return { status: 400, message: 'Invalid notification type' };
    return { status: 500, message: 'Internal server error' };
};

const notificationController = {
    // Get user notifications
    getUserNotifications: catchAsync(async (req, res, next) => {
        try {
            const userId = res.locals.user_id;
            const { limit = 50, offset = 0, unread_only = false } = req.query;

            const notifications = await notificationModel.getUserNotifications(userId, {
                limit: parseInt(limit),
                offset: parseInt(offset),
                unreadOnly: unread_only === 'true',
            });

            logger.info('Notifications retrieved successfully', { 
                userId,
                count: notifications.length 
            });

            res.status(200).json({
                status: 'success',
                message: 'Notifications retrieved successfully',
                data: {
                    notifications,
                    count: notifications.length,
                }
            });

        } catch (error) {
            logger.error('Error retrieving notifications', { 
                error: error.message,
                userId: res.locals.user_id 
            });
            const mappedError = mapNotificationError(error);
            return next(new AppError(mappedError.message, mappedError.status));
        }
    }),

    // Get unread notification count
    getUnreadCount: catchAsync(async (req, res, next) => {
        try {
            const userId = res.locals.user_id;

            const count = await notificationModel.getUnreadCount(userId);

            logger.info('Unread count retrieved successfully', { 
                userId,
                unreadCount: count 
            });

            res.status(200).json({
                status: 'success',
                message: 'Unread count retrieved successfully',
                data: {
                    unread_count: count,
                }
            });

        } catch (error) {
            logger.error('Error retrieving unread count', { 
                error: error.message,
                userId: res.locals.user_id 
            });
            const mappedError = mapNotificationError(error);
            return next(new AppError(mappedError.message, mappedError.status));
        }
    }),

    // Mark notification as read
    markAsRead: catchAsync(async (req, res, next) => {
        try {
            const { notificationId } = req.params;
            const userId = res.locals.user_id;

            const notificationIdNum = parseInt(notificationId, 10);
            if (isNaN(notificationIdNum)) {
                return next(new AppError('Invalid notification ID', 400));
            }

            const result = await notificationModel.markAsRead(notificationIdNum, userId);

            if (result.count === 0) {
                return next(new AppError('Notification not found or access denied', 404));
            }

            logger.info('Notification marked as read', { 
                notificationId: notificationIdNum,
                userId 
            });

            res.status(200).json({
                status: 'success',
                message: 'Notification marked as read successfully',
            });

        } catch (error) {
            logger.error('Error marking notification as read', { 
                error: error.message,
                notificationId: req.params.notificationId,
                userId: res.locals.user_id 
            });
            const mappedError = mapNotificationError(error);
            return next(new AppError(mappedError.message, mappedError.status));
        }
    }),

    // Mark all notifications as read
    markAllAsRead: catchAsync(async (req, res, next) => {
        try {
            const userId = res.locals.user_id;

            const result = await notificationModel.markAllAsRead(userId);

            logger.info('All notifications marked as read', { 
                userId,
                count: result.count 
            });

            res.status(200).json({
                status: 'success',
                message: `${result.count} notifications marked as read successfully`,
                data: {
                    updated_count: result.count,
                }
            });

        } catch (error) {
            logger.error('Error marking all notifications as read', { 
                error: error.message,
                userId: res.locals.user_id 
            });
            const mappedError = mapNotificationError(error);
            return next(new AppError(mappedError.message, mappedError.status));
        }
    }),

    // Delete a notification
    deleteNotification: catchAsync(async (req, res, next) => {
        try {
            const { notificationId } = req.params;
            const userId = res.locals.user_id;

            const notificationIdNum = parseInt(notificationId, 10);
            if (isNaN(notificationIdNum)) {
                return next(new AppError('Invalid notification ID', 400));
            }

            const result = await notificationModel.deleteNotification(notificationIdNum, userId);

            if (result.count === 0) {
                return next(new AppError('Notification not found or access denied', 404));
            }

            logger.info('Notification deleted', { 
                notificationId: notificationIdNum,
                userId 
            });

            res.status(200).json({
                status: 'success',
                message: 'Notification deleted successfully',
            });

        } catch (error) {
            logger.error('Error deleting notification', { 
                error: error.message,
                notificationId: req.params.notificationId,
                userId: res.locals.user_id 
            });
            const mappedError = mapNotificationError(error);
            return next(new AppError(mappedError.message, mappedError.status));
        }
    }),

    // Create manual notification (admin use)
    createNotification: catchAsync(async (req, res, next) => {
        try {
            const { user_id, type, title, message, transaction_id, circle_id } = req.body;
            const creatorId = res.locals.user_id;

            // Validate required fields
            if (!user_id || !type || !title || !message) {
                return next(new AppError('User ID, type, title, and message are required', 400));
            }

            const notification = await notificationModel.createNotification(
                user_id,
                type,
                title,
                message,
                {
                    transactionId: transaction_id,
                    circleId: circle_id,
                }
            );

            logger.info('Notification created manually', { 
                notificationId: notification.id,
                creatorId,
                targetUserId: user_id 
            });

            res.status(201).json({
                status: 'success',
                message: 'Notification created successfully',
                data: {
                    notification,
                }
            });

        } catch (error) {
            logger.error('Error creating notification', { 
                error: error.message,
                creatorId: res.locals.user_id 
            });
            const mappedError = mapNotificationError(error);
            return next(new AppError(mappedError.message, mappedError.status));
        }
    }),

    // Trigger payment reminders (can be called by cron job)
    triggerPaymentReminders: catchAsync(async (req, res, next) => {
        try {
            const reminderCount = await notificationModel.createPaymentReminders();

            logger.info('Payment reminders triggered', { 
                remindersSent: reminderCount 
            });

            res.status(200).json({
                status: 'success',
                message: 'Payment reminders processed successfully',
                data: {
                    reminders_sent: reminderCount,
                }
            });

        } catch (error) {
            logger.error('Error triggering payment reminders', { 
                error: error.message 
            });
            const mappedError = mapNotificationError(error);
            return next(new AppError(mappedError.message, mappedError.status));
        }
    }),

    // Trigger daily reminders (comprehensive reminder service)
    triggerDailyReminders: catchAsync(async (req, res, next) => {
        try {
            const NotificationService = require('../services/notificationService');
            const result = await NotificationService.sendDailyPaymentReminders();

            logger.info('Daily reminders triggered', { 
                result 
            });

            res.status(200).json({
                status: 'success',
                message: 'Daily reminders processed successfully',
                data: result
            });

        } catch (error) {
            logger.error('Error triggering daily reminders', { 
                error: error.message 
            });
            const mappedError = mapNotificationError(error);
            return next(new AppError(mappedError.message, mappedError.status));
        }
    }),
};

module.exports = notificationController;
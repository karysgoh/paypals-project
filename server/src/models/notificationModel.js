const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const notificationModel = {
    // Create a new notification
    async createNotification(userId, type, title, message, options = {}) {
        const notification = await prisma.notification.create({
            data: {
                user_id: userId,
                type,
                title,
                message,
                notification_channel: options.channel || 'in_app',
                related_transaction_id: options.transactionId || null,
                related_circle_id: options.circleId || null,
            },
        });
        return notification;
    },

    // Get all notifications for a user
    async getUserNotifications(userId, options = {}) {
        const { limit = 50, offset = 0, unreadOnly = false } = options;
        
        const whereClause = {
            user_id: userId,
        };

        if (unreadOnly) {
            whereClause.is_read = false;
        }

        const notifications = await prisma.notification.findMany({
            where: whereClause,
            orderBy: {
                created_at: 'desc',
            },
            take: limit,
            skip: offset,
            include: {
                related_transaction: {
                    select: {
                        id: true,
                        name: true,
                        total_amount: true,
                    },
                },
                related_circle: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        return notifications;
    },

    // Mark notification as read
    async markAsRead(notificationId, userId) {
        const notification = await prisma.notification.updateMany({
            where: {
                id: notificationId,
                user_id: userId,
            },
            data: {
                is_read: true,
                delivery_status: 'read',
            },
        });
        return notification;
    },

    // Mark all notifications as read for a user
    async markAllAsRead(userId) {
        const result = await prisma.notification.updateMany({
            where: {
                user_id: userId,
                is_read: false,
            },
            data: {
                is_read: true,
                delivery_status: 'read',
            },
        });
        return result;
    },

    // Get unread notification count
    async getUnreadCount(userId) {
        const count = await prisma.notification.count({
            where: {
                user_id: userId,
                is_read: false,
            },
        });
        return count;
    },

    // Delete a notification
    async deleteNotification(notificationId, userId) {
        const result = await prisma.notification.deleteMany({
            where: {
                id: notificationId,
                user_id: userId,
            },
        });
        return result;
    },

    // Create bulk notifications for multiple users
    async createBulkNotifications(notifications) {
        const result = await prisma.notification.createMany({
            data: notifications,
        });
        return result;
    },

    // Create payment reminder notifications
    async createPaymentReminders() {
        // Get all unpaid transaction members with transactions older than 24 hours
        const overdueTransactions = await prisma.transactionMember.findMany({
            where: {
                payment_status: 'unpaid',
                transaction: {
                    created_at: {
                        lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
                    },
                },
            },
            include: {
                transaction: {
                    include: {
                        creator: true,
                    },
                },
                user: true,
            },
        });

        // Check if reminders were already sent in the last 24 hours
        const existingReminders = await prisma.notification.findMany({
            where: {
                type: 'payment_due',
                created_at: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                },
                related_transaction_id: {
                    in: overdueTransactions.map(t => t.transaction_id),
                },
            },
        });

        const existingReminderTransactionIds = new Set(
            existingReminders.map(r => `${r.user_id}-${r.related_transaction_id}`)
        );

        // Create notifications for those who haven't received reminders today
        const notificationsToCreate = [];
        
        for (const member of overdueTransactions) {
            const key = `${member.user_id}-${member.transaction_id}`;
            
            if (!existingReminderTransactionIds.has(key) && member.user_id) {
                notificationsToCreate.push({
                    user_id: member.user_id,
                    type: 'payment_due',
                    title: 'Payment Reminder',
                    message: `Don't forget to pay $${member.amount_owed.toFixed(2)} for "${member.transaction.name}"`,
                    related_transaction_id: member.transaction_id,
                    related_circle_id: member.transaction.circle_id,
                });
            }
        }

        if (notificationsToCreate.length > 0) {
            await this.createBulkNotifications(notificationsToCreate);
        }

        return notificationsToCreate.length;
    },

    // Notification helpers for different event types
    async notifyTransactionCreated(transactionId, memberIds, creatorName, transactionName) {
        const notifications = memberIds.map(memberId => ({
            user_id: memberId,
            type: 'transaction_created',
            title: 'New Transaction Created',
            message: `${creatorName} created a new transaction: "${transactionName}"`,
            related_transaction_id: transactionId,
        }));

        if (notifications.length > 0) {
            return await this.createBulkNotifications(notifications);
        }
    },

    async notifyPaymentReceived(creatorId, payerName, amount, transactionName, transactionId) {
        return await this.createNotification(
            creatorId,
            'payment_received',
            'Payment Received',
            `${payerName} paid $${amount.toFixed(2)} for "${transactionName}"`,
            { transactionId }
        );
    },

    async notifyCircleInvitation(userId, inviterName, circleName, circleId) {
        return await this.createNotification(
            userId,
            'circle_invitation',
            'Circle Invitation',
            `${inviterName} invited you to join "${circleName}"`,
            { circleId }
        );
    },

    async notifyMemberJoined(memberIds, newMemberName, circleName, circleId) {
        const notifications = memberIds.map(memberId => ({
            user_id: memberId,
            type: 'member_joined',
            title: 'New Member Joined',
            message: `${newMemberName} joined "${circleName}"`,
            related_circle_id: circleId,
        }));

        if (notifications.length > 0) {
            return await this.createBulkNotifications(notifications);
        }
    },
};

module.exports = notificationModel;
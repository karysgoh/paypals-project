const notificationModel = require('../models/notificationModel');
const emailService = require('../utils/emailService');
const logger = require('../logger');

class NotificationService {
    // Daily payment reminders (can be called by a cron job)
    static async sendDailyPaymentReminders() {
        try {
            logger.info('Starting daily payment reminder process');
            
            // Create in-app notifications for overdue payments
            const reminderCount = await notificationModel.createPaymentReminders();
            
            logger.info(`Created ${reminderCount} payment reminder notifications`);
            
            // Optional: Send email reminders as well
            await this.sendEmailPaymentReminders();
            
            return {
                success: true,
                notificationsSent: reminderCount
            };
        } catch (error) {
            logger.error('Error in daily payment reminder process', { error: error.message });
            throw error;
        }
    }

    // Send email reminders for overdue payments
    static async sendEmailPaymentReminders() {
        try {
            const { PrismaClient } = require('@prisma/client');
            const prisma = new PrismaClient();

            // Get overdue payments that haven't received email reminders today
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
                            creator: { select: { username: true, email: true } },
                            circle: { select: { name: true } }
                        },
                    },
                    user: { 
                        select: { 
                            id: true, 
                            username: true, 
                            email: true 
                        } 
                    },
                },
            });

            let emailsSent = 0;

            for (const member of overdueTransactions) {
                if (member.user && member.user.email) {
                    try {
                        await emailService.sendPaymentReminderEmail(
                            member.user.email,
                            {
                                recipientName: member.user.username,
                                transactionName: member.transaction.name,
                                amount: member.amount_owed,
                                creatorName: member.transaction.creator?.username,
                                circleName: member.transaction.circle?.name,
                                transactionId: member.transaction.id
                            }
                        );
                        emailsSent++;
                    } catch (emailError) {
                        logger.error('Error sending payment reminder email', {
                            error: emailError.message,
                            userId: member.user.id,
                            transactionId: member.transaction.id
                        });
                    }
                }
            }

            logger.info(`Sent ${emailsSent} payment reminder emails`);
            return emailsSent;

        } catch (error) {
            logger.error('Error sending email payment reminders', { error: error.message });
            throw error;
        }
    }

    // Send welcome notification to new users
    static async sendWelcomeNotification(userId, username) {
        try {
            await notificationModel.createNotification(
                userId,
                'general',
                'Welcome to PayPals! 🎉',
                `Hi ${username}! Welcome to PayPals. Start by creating your first circle or joining one to manage group expenses together.`
            );
        } catch (error) {
            logger.error('Error sending welcome notification', { 
                error: error.message, 
                userId 
            });
        }
    }

    // Send summary notifications (weekly/monthly)
    static async sendSummaryNotifications() {
        try {
            const { PrismaClient } = require('@prisma/client');
            const prisma = new PrismaClient();

            // Get users with pending payments
            const usersWithPendingPayments = await prisma.user.findMany({
                where: {
                    transaction_members: {
                        some: {
                            payment_status: 'unpaid'
                        }
                    }
                },
                include: {
                    transaction_members: {
                        where: {
                            payment_status: 'unpaid'
                        },
                        include: {
                            transaction: {
                                select: {
                                    name: true,
                                    total_amount: true
                                }
                            }
                        }
                    }
                }
            });

            for (const user of usersWithPendingPayments) {
                const pendingCount = user.transaction_members.length;
                const totalOwed = user.transaction_members.reduce(
                    (sum, member) => sum + parseFloat(member.amount_owed), 
                    0
                );

                if (pendingCount > 0) {
                    await notificationModel.createNotification(
                        user.id,
                        'general',
                        'Payment Summary',
                        `You have ${pendingCount} pending payment${pendingCount > 1 ? 's' : ''} totaling $${totalOwed.toFixed(2)}. Don't forget to settle up!`
                    );
                }
            }

            logger.info(`Sent summary notifications to ${usersWithPendingPayments.length} users`);

        } catch (error) {
            logger.error('Error sending summary notifications', { error: error.message });
            throw error;
        }
    }
}

module.exports = NotificationService;
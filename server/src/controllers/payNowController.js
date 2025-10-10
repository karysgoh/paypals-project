const QRCode = require('qrcode');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const PayNowQRGenerator = require('../utils/payNowQRGenerator');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const logger = require('../logger');

const payNowController = {
  generateQR: catchAsync(async (req, res, next) => {
    try {
      const userId = res.locals.user_id;
      const { transactionId } = req.params;

      logger.info(`Generating PayNow QR for transaction ${transactionId} by user ${userId}`);

      // Fetch transaction with creator details
      const transaction = await prisma.transaction.findFirst({
        where: { 
          id: parseInt(transactionId)
        },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              email: true,
              paynow_phone: true,
              paynow_nric: true,
              paynow_enabled: true
            }
          },
          members: {
            where: { user_id: userId },
            select: { amount_owed: true, payment_status: true }
          }
        }
      });

      if (!transaction) {
        return next(new AppError('Transaction not found', 404));
      }

      // Check if user is part of this transaction
      const userMember = transaction.members[0];
      if (!userMember) {
        return next(new AppError('You are not part of this transaction', 403));
      }

      // Check if already paid
      if (userMember.payment_status === 'paid') {
        return next(new AppError('This transaction has already been paid', 400));
      }

      // Validate recipient has PayNow enabled
      if (!transaction.creator.paynow_enabled) {
        return next(new AppError('Recipient has not enabled PayNow payments', 400));
      }

      // Determine recipient PayNow ID (prefer phone over NRIC)
      const recipientPayNowId = transaction.creator.paynow_phone || transaction.creator.paynow_nric;
      if (!recipientPayNowId) {
        return next(new AppError('Recipient PayNow ID not found', 400));
      }

      // Generate PayNow QR data
      const qrGenerator = new PayNowQRGenerator();
      
      // Validate recipient ID format
      if (!qrGenerator.validateRecipient(recipientPayNowId)) {
        return next(new AppError('Invalid recipient PayNow ID format', 400));
      }

      const qrData = qrGenerator.generateQRData({
        recipient: recipientPayNowId,
        amount: userMember.amount_owed,
        merchantName: transaction.creator.username,
        reference: `PayPals-${transactionId}`,
        editableAmount: false // Fixed amount for bill splitting
      });

      // Generate QR code image as data URL
      const qrCodeDataURL = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      logger.info(`PayNow QR generated successfully for transaction ${transactionId}`);

      res.status(200).json({
        success: true,
        data: {
          qrCodeDataURL,
          qrData, // Raw EMV data for debugging
          paymentInfo: {
            recipient: transaction.creator.username,
            recipientId: recipientPayNowId,
            amount: userMember.amount_owed,
            currency: 'SGD',
            reference: `PayPals-${transactionId}`,
            description: transaction.description
          }
        }
      });

    } catch (error) {
      logger.error('PayNow QR generation error:', error);
      return next(new AppError('Failed to generate PayNow QR code', 500));
    }
  }),

  confirmPayment: catchAsync(async (req, res, next) => {
    try {
      const userId = res.locals.user_id;
      const { transactionId } = req.params;
      const { paymentReference } = req.body;

      logger.info(`Confirming PayNow payment for transaction ${transactionId} by user ${userId}`);

      // Verify transaction exists and user is member
      const transaction = await prisma.transaction.findFirst({
        where: { id: parseInt(transactionId) },
        include: {
          creator: true,
          members: {
            where: { user_id: userId }
          }
        }
      });

      if (!transaction) {
        return next(new AppError('Transaction not found', 404));
      }

      const userMember = transaction.members[0];
      if (!userMember) {
        return next(new AppError('You are not part of this transaction', 403));
      }

      if (userMember.payment_status === 'paid') {
        return next(new AppError('Payment already confirmed', 400));
      }

      // Update transaction member status
      await prisma.transactionMember.update({
        where: {
          id: userMember.id
        },
        data: {
          payment_status: 'paid',
          payment_method: 'paynow',
          paid_at: new Date()
        }
      });

      // Check if all members have paid
      const allMembers = await prisma.transactionMember.findMany({
        where: { transaction_id: parseInt(transactionId) }
      });

      const allPaid = allMembers.every(member => member.payment_status === 'paid');

      // Update main transaction status if all paid
      if (allPaid) {
        await prisma.transaction.update({
          where: { id: parseInt(transactionId) },
          data: { status: 'COMPLETED' }
        });
      }

      // Create notification for transaction creator
      await prisma.notification.create({
        data: {
          user_id: transaction.creator.id,
          type: 'payment_received',
          title: 'Payment Received',
          message: `Payment received via PayNow for ${transaction.description}`,
          reference_id: transactionId,
          reference_type: 'transaction'
        }
      });

      logger.info(`PayNow payment confirmed for transaction ${transactionId}`);

      res.status(200).json({
        success: true,
        message: 'Payment confirmed successfully',
        data: {
          transactionId: parseInt(transactionId),
          paymentStatus: 'PAID',
          allMembersPaid: allPaid
        }
      });

    } catch (error) {
      logger.error('PayNow payment confirmation error:', error);
      return next(new AppError('Failed to confirm payment', 500));
    }
  }),

  getPayNowSettings: catchAsync(async (req, res, next) => {
    try {
      const userId = res.locals.user_id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          paynow_phone: true,
          paynow_nric: true,
          paynow_enabled: true
        }
      });

      if (!user) {
        return next(new AppError('User not found', 404));
      }

      res.status(200).json({
        success: true,
        data: {
          payNowEnabled: user.paynow_enabled,
          payNowPhone: user.paynow_phone,
          payNowNric: user.paynow_nric,
          hasPayNowId: !!(user.paynow_phone || user.paynow_nric)
        }
      });

    } catch (error) {
      logger.error('Get PayNow settings error:', error);
      return next(new AppError('Failed to get PayNow settings', 500));
    }
  }),

  updatePayNowSettings: catchAsync(async (req, res, next) => {
    try {
      const userId = res.locals.user_id;
      const { payNowPhone, payNowNric, enabled } = req.body;

      // Validate at least one PayNow ID if enabling
      if (enabled && !payNowPhone && !payNowNric) {
        return next(new AppError('At least one PayNow ID (phone or NRIC) is required', 400));
      }

      // Validate formats if provided
      const qrGenerator = new PayNowQRGenerator();
      
      if (payNowPhone && !qrGenerator.validateRecipient(payNowPhone)) {
        return next(new AppError('Invalid phone number format', 400));
      }
      
      if (payNowNric && !qrGenerator.validateRecipient(payNowNric)) {
        return next(new AppError('Invalid NRIC format', 400));
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          paynow_phone: payNowPhone || null,
          paynow_nric: payNowNric || null,
          paynow_enabled: enabled && (payNowPhone || payNowNric)
        }
      });

      logger.info(`PayNow settings updated for user ${userId}`);

      res.status(200).json({
        success: true,
        message: 'PayNow settings updated successfully'
      });

    } catch (error) {
      logger.error('Update PayNow settings error:', error);
      return next(new AppError('Failed to update PayNow settings', 500));
    }
  })
};

module.exports = payNowController;
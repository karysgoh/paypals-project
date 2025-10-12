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

      logger.info(`=== PAYNOW QR GENERATION START ===`);
      logger.info(`User ID: ${userId}`);
      logger.info(`Transaction ID: ${transactionId}`);
      logger.info(`Request URL: ${req.originalUrl}`);
      logger.info(`Request method: ${req.method}`);

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
              paynow_enabled: true
            }
          },
          members: {
            where: { user_id: userId },
            select: { amount_owed: true, payment_status: true }
          }
        }
      });

      logger.info(`Transaction query result:`, {
        found: !!transaction,
        transactionId: transaction?.id,
        creatorId: transaction?.creator?.id,
        creatorUsername: transaction?.creator?.username,
        memberCount: transaction?.members?.length
      });

      if (!transaction) {
        logger.error(`Transaction ${transactionId} not found for user ${userId}`);
        return next(new AppError('Transaction not found', 404));
      }

      // Check if user is part of this transaction
      const userMember = transaction.members[0];
      logger.info(`User member check:`, {
        userMemberFound: !!userMember,
        userMemberAmount: userMember?.amount_owed,
        userMemberStatus: userMember?.payment_status
      });
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

      // Debug log creator's PayNow details
      logger.info(`Regular PayNow - Creator PayNow details - Phone: ${transaction.creator.paynow_phone ? `"${transaction.creator.paynow_phone}"` : 'Not set'}, Enabled: ${transaction.creator.paynow_enabled}`);

      // Use phone number only for PayNow
      const recipientPayNowId = transaction.creator.paynow_phone;
      if (!recipientPayNowId) {
        return next(new AppError(`PayNow recipient phone number not found. The recipient needs to set up their PayNow phone number in payment settings.`, 400));
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
      const { payNowPhone, enabled } = req.body;

      // Validate phone number is provided if enabling
      if (enabled && !payNowPhone) {
        return next(new AppError('PayNow phone number is required', 400));
      }

      // Validate phone format if provided
      const qrGenerator = new PayNowQRGenerator();
      
      if (payNowPhone && !qrGenerator.validateRecipient(payNowPhone)) {
        return next(new AppError('Invalid Singapore phone number format. Please use format: +6591234567 or 91234567', 400));
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          paynow_phone: payNowPhone || null,
          paynow_enabled: enabled && payNowPhone
        }
      });

      logger.info(`PayNow settings updated for user ${userId} - Phone: ${payNowPhone ? 'Set' : 'Unset'}, Enabled: ${enabled && payNowPhone}`);

      res.status(200).json({
        success: true,
        message: 'PayNow settings updated successfully'
      });

    } catch (error) {
      logger.error('Update PayNow settings error:', error);
      return next(new AppError('Failed to update PayNow settings', 500));
    }
  }),

  // External PayNow QR generation for non-authenticated users
  generateExternalQR: catchAsync(async (req, res, next) => {
    try {
      const { token } = req.params;

      logger.info(`=== EXTERNAL PAYNOW QR GENERATION START ===`);
      logger.info(`Token: ${token}`);
      logger.info(`Request URL: ${req.originalUrl}`);
      console.log(`=== EXTERNAL PAYNOW DEBUG - Token: ${token} ===`);

      // Find transaction and participant by external token
      const participant = await prisma.transactionMember.findFirst({
        where: { 
          access_token: token,
          access_token_expires: {
            gt: new Date()
          }
        },
        include: {
          transaction: {
            include: {
              creator: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                  paynow_phone: true,
                  paynow_enabled: true
                }
              }
            }
          }
        }
      });

      logger.info(`External participant query result:`, {
        found: !!participant,
        participantId: participant?.id,
        transactionId: participant?.transaction?.id,
        creatorId: participant?.transaction?.creator?.id,
        creatorUsername: participant?.transaction?.creator?.username,
        tokenExpiry: participant?.access_token_expires,
        isExpired: participant?.access_token_expires ? participant.access_token_expires < new Date() : 'N/A'
      });

      if (!participant) {
        logger.error(`External token not found or expired: ${token}`);
        return next(new AppError('Invalid or expired token', 404));
      }

      const transaction = participant.transaction;

      // Check if already paid
      if (participant.payment_status === 'PAID') {
        return next(new AppError('Payment already completed', 400));
      }

      // Check if creator has PayNow enabled
      if (!transaction.creator.paynow_enabled) {
        return next(new AppError('PayNow is not available for this transaction. The recipient has not set up PayNow.', 400));
      }

      // Debug log creator's PayNow details
      logger.info(`External PayNow - Creator PayNow details - Phone: ${transaction.creator.paynow_phone ? `"${transaction.creator.paynow_phone}"` : 'Not set'}, Enabled: ${transaction.creator.paynow_enabled}`);

      // Use phone number only for PayNow
      const recipientPayNowId = transaction.creator.paynow_phone;
      
      console.log(`=== PAYNOW RECIPIENT DEBUG ===`);
      console.log(`Creator phone: ${transaction.creator.paynow_phone}`);
      console.log(`Creator enabled: ${transaction.creator.paynow_enabled}`);
      console.log(`Final recipient ID: ${recipientPayNowId}`);
      
      if (!recipientPayNowId) {
        console.log(`=== ERROR: No PayNow phone number found ===`);
        return next(new AppError(`PayNow recipient phone number not found. The recipient needs to set up their PayNow phone number in payment settings.`, 400));
      }

      // Generate PayNow QR data
      const qrGenerator = new PayNowQRGenerator();
      
      // Validate recipient ID format
      if (!qrGenerator.validateRecipient(recipientPayNowId)) {
        logger.error(`Invalid external PayNow ID format: "${recipientPayNowId}" - validation failed`);
        return next(new AppError('Invalid recipient PayNow ID format', 400));
      }

      logger.info(`External PayNow ID validation passed for: "${recipientPayNowId}"`);

      const qrData = qrGenerator.generateQRData({
        recipient: recipientPayNowId,
        amount: participant.amount_owed,
        merchantName: transaction.creator.username,
        reference: `PayPals-${transaction.id}`,
        editableAmount: false
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

      logger.info(`External PayNow QR generated successfully for token ${token}`);

      res.status(200).json({
        success: true,
        data: {
          qrCodeDataURL,
          qrData,
          paymentInfo: {
            recipient: transaction.creator.username,
            recipientId: recipientPayNowId,
            amount: participant.amount_owed,
            currency: 'SGD',
            reference: `PayPals-${transaction.id}`,
            description: transaction.description
          }
        }
      });

    } catch (error) {
      logger.error('External PayNow QR generation error:', error);
      return next(new AppError('Failed to generate PayNow QR code', 500));
    }
  }),

  // External PayNow payment confirmation for non-authenticated users
  confirmExternalPayment: catchAsync(async (req, res, next) => {
    try {
      const { token } = req.params;
      const { paymentReference } = req.body;

      logger.info(`Confirming external PayNow payment for token ${token}`);

      // Find transaction and participant by external token
      const participant = await prisma.transactionMember.findFirst({
        where: { 
          access_token: token,
          access_token_expires: {
            gt: new Date()
          }
        },
        include: {
          transaction: true
        }
      });

      if (!participant) {
        return next(new AppError('Invalid or expired token', 404));
      }

      // Check if already paid
      if (participant.payment_status === 'PAID') {
        return next(new AppError('Payment already confirmed', 400));
      }

      // Update payment status
      await prisma.transactionMember.update({
        where: { id: participant.id },
        data: { 
          payment_status: 'PAID',
          paid_at: new Date()
        }
      });

      logger.info(`External PayNow payment confirmed for token ${token}`);

      res.status(200).json({
        success: true,
        message: 'Payment confirmed successfully',
        data: {
          paymentStatus: 'PAID',
          paymentReference
        }
      });

    } catch (error) {
      logger.error('External PayNow payment confirmation error:', error);
      return next(new AppError('Failed to confirm payment', 500));
    }
  })
};

module.exports = payNowController;
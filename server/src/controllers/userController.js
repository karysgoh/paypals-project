const express = require("express");
const userModel = require("../models/userModel.js");
const logger = require("../logger.js");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const crypto = require("crypto");
const { sendVerificationEmail } = require("../utils/emailService.js");
const NotificationService = require("../services/notificationService"); 

module.exports = {
  login: catchAsync(async (req, res, next) => {
    const { username, password } = req.body;
    if (!username || !password) {
      logger.warn("Login failed: Missing username or password");
      return next(new AppError("Missing username or password", 400));
    }

    const data = { username, password };
    const results = await userModel.selectByUsernameAndPassword(data);
    if (!results) {
      logger.warn(`Login failed: Username ${data.username} does not exist`);
      return next(new AppError(`Username ${data.username} does not exist`, 404));
    }

    if (!results.email_verified) {
      logger.warn(`Login failed: Email not verified for ${data.username}`);
      return next(new AppError("Please verify your email before logging in", 401));
    }

    logger.debug(`User ${data.username} logged in successfully`);
    res.locals.user_id = results.id;           
    res.locals.username = results.username;
    res.locals.hash = results.password;        
    res.locals.role_id = results.role?.id || null;      
    res.locals.role_name = results.role?.role_name || null; 
    res.locals.email_verified = results.email_verified;
    next();
  }),

  register: catchAsync(async (req, res, next) => {
    const { username, password, email } = req.body;
    if (!username || !password || !email) {
      logger.warn("Registration failed: Missing username, password, or email");
      return next(new AppError("Missing username, password, or email", 400));
    }

    const data = { username, password, email };
    
    try {
      const results = await userModel.createNewUser(data);
      if (!results) {
        logger.warn(`User registration failed for username ${data.username}`);
        return next(new AppError("User registration failed", 500));
      }

      // Generate email verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

      // Save verification token
      await userModel.createEmailVerificationToken({
        email: email,
        token: verificationToken,
        expires_at: tokenExpiry,
        user_id: results.id
      });

      // Send verification email (non-blocking with improved error handling)
      let emailResult = null;
      try {
        emailResult = await sendVerificationEmail(email, verificationToken, username);
        
        // Handle development mode
        if (emailResult.mode === 'development') {
          logger.info(`Development mode: Email verification skipped for ${email}`);
          emailResult = { 
            success: true, 
            mode: 'development',
            note: 'Development mode: Email verification was skipped. Account is ready to use.'
          };
        } else {
          logger.info(`Verification email sent to ${email}`);
          emailResult = { success: true };
        }
      } catch (emailError) {
        logger.error(`Failed to send verification email to ${email}: ${emailError.message}`);
        console.log(`Email sending failed for ${email}, but registration will continue`);
        emailResult = { 
          success: false, 
          error: emailError.message,
          note: 'Registration completed but verification email could not be sent. You can request a new verification email later.'
        };
      }

      // Send welcome notification
      try {
        await NotificationService.sendWelcomeNotification(results.id, username);
      } catch (notificationError) {
        logger.error(`Failed to send welcome notification to user ${results.id}: ${notificationError.message}`);
        // Don't fail registration if notification fails
      }

      logger.info(`User ${data.username} successfully created`);
      
      // Customize response message based on email sending status
      let responseMessage = `User ${data.username} successfully created.`;
      if (emailResult && emailResult.success === false) {
        responseMessage += ` ${emailResult.note || 'Verification email could not be sent at this time, but you can request a new one later.'}`;
      } else {
        responseMessage += ` Please check your email to verify your account.`;
      }
      
      res.locals.message = responseMessage;
      res.locals.user_id = results.id;           
      res.locals.username = results.username;
      res.locals.email = results.email;
      res.locals.role_id = results.role?.id || null;      
      res.locals.role_name = results.role?.role_name || null; 
      res.locals.email_verified = results.email_verified || false;
      res.locals.email_status = emailResult || { success: true };
      next();
    } catch (error) {
      // Handle unique constraint violations
      if (error.code === 'P2002') {
        const target = error.meta?.target;
        if (target?.includes('username')) {
          logger.warn(`Registration failed: Username already exists - ${data.username}`);
          return next(new AppError("Username already exists", 409));
        }
        if (target?.includes('email')) {
          logger.warn(`Registration failed: Email already exists - ${data.email}`);
          return next(new AppError("Email already exists", 409));
        }
        if (target?.includes('paynow_phone')) {
          logger.warn(`Registration failed: PayNow phone number already exists - ${data.username}`);
          return next(new AppError("This PayNow phone number is already registered", 409));
        }
        if (target?.includes('paynow_nric')) {
          logger.warn(`Registration failed: PayNow NRIC already exists - ${data.username}`);
          return next(new AppError("This PayNow NRIC is already registered", 409));
        }
        // Generic unique constraint error
        logger.warn(`Registration failed: Duplicate data - ${data.username}`);
        return next(new AppError("This information is already registered", 409));
      }
      
      // Re-throw other errors
      throw error;
    }
  }),

  verifyEmail: catchAsync(async (req, res, next) => {
    const { token } = req.params;
    
    if (!token) {
      logger.warn("Email verification failed: Missing token");
      return next(new AppError("Verification token is required", 400));
    }

    logger.debug(`Attempting to verify email with token: ${token}`);

    // Find and validate token
    const tokenRecord = await userModel.findEmailVerificationToken(token);
    
    if (!tokenRecord) {
      logger.warn(`Email verification failed: Invalid token ${token}`);
      return next(new AppError("Invalid or expired verification token", 400));
    }

    logger.debug(`Token found: ${JSON.stringify(tokenRecord)}`);

    if (tokenRecord.used) {
      logger.warn(`Email verification failed: Token already used ${token}`);
      return next(new AppError("Verification token has already been used", 400));
    }

    if (new Date() > tokenRecord.expires_at) {
      logger.warn(`Email verification failed: Token expired ${token}`);
      return next(new AppError("Verification token has expired", 400));
    }

    await userModel.markTokenAsUsed(token);
    
    await userModel.updateUserEmailVerification(tokenRecord.user_id, true);

    logger.info(`Email verified successfully for token: ${token}`);
    
    res.status(200).json({
      status: "success",
      message: "Email verified successfully! You can now log in."
    });
  }),

  resendVerificationEmail: catchAsync(async (req, res, next) => {
    const { email } = req.body;
    
    if (!email) {
      logger.warn("Resend verification failed: Missing email");
      return next(new AppError("Email is required", 400));
    }

    // Check if user exists
    const user = await userModel.findUserByEmail(email);
    if (!user) {
      logger.warn(`Resend verification failed: User with email ${email} not found`);
      return next(new AppError("User with this email does not exist", 404));
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Delete old tokens and create new one
    await userModel.deleteOldVerificationTokens(email);
    await userModel.createEmailVerificationToken({
      email: email,
      token: verificationToken,
      expires_at: tokenExpiry,
      user_id: user.id
    });

    // Send verification email
    try {
      await sendVerificationEmail(email, verificationToken, user.username);
      logger.info(`New verification email sent to ${email}`);
      
      res.status(200).json({
        status: "success",
        message: "Verification email sent. Please check your inbox."
      });
    } catch (emailError) {
      logger.error(`Failed to resend verification email to ${email}: ${emailError.message}`);
      return next(new AppError("Failed to send verification email", 500));
    }
  }),

  checkUsernameExist: catchAsync(async (req, res, next) => {
    const { username } = req.body;
    if (!username) {
      logger.warn("Username check failed: Missing username");
      return next(new AppError("Missing username", 400));
    }

    const data = { username };
    const user = await userModel.selectByUsernameAndPassword(data);
    if (user) {
      logger.warn(`Username check failed: Username ${username} already exists`);
      return next(new AppError("Username already exists. Please try another username", 409));
    }

    logger.debug(`Username ${username} is available`);
    next();
  }),

  checkEmailExist: catchAsync(async (req, res, next) => {
    const { email } = req.body;
    if (!email) {
      logger.warn("Email check failed: Missing email");
      return next(new AppError("Missing email", 400));
    }

    const user = await userModel.findUserByEmail(email);
    if (user) {
      logger.warn(`Email check failed: Email ${email} already exists`);
      return next(new AppError("Email already exists. Please use another email", 409));
    }

    logger.debug(`Email ${email} is available`);
    next();
  }),

  findUserByEmail: catchAsync(async (req, res, next) => {
    const { email } = req.body;
    if (!email) {
      logger.warn("Find user by email failed: Missing email");
      return next(new AppError("Missing email", 400));
    }

    const user = await userModel.findUserByEmail(email);
    if (user) {
      logger.debug(`Found user with email: ${email}`);
      // Return safe user data (no password or sensitive info)
      const safeUser = {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        email_verified: user.email_verified
      };
      res.status(200).json({ status: "success", data: safeUser });
    } else {
      logger.debug(`No user found with email: ${email}`);
      res.status(200).json({ status: "success", data: null });
    }
  }),

  readLoggedInUser: catchAsync(async (req, res, next) => {
    const user_id = res.locals.user_id;
    if (!user_id) {
      logger.warn("Read logged in user failed: Missing user ID");
      return next(new AppError("User ID is required", 400));
    }

    const data = { user_id };
    const results = await userModel.readLoggedInUser(data);
    if (!results) {
      logger.warn(`Read logged in user failed: User ${user_id} does not exist`);
      return next(new AppError(`User ${user_id} does not exist`, 404));
    }

    logger.debug(`Retrieved logged in user data for user: ${user_id}`);
    res.status(200).json({ status: "success", data: results });
  }),

  getUserCircles: catchAsync(async (req, res, next) => {
    const user_id = res.locals.user_id || req.params.userId;
    
    if (!user_id) {
      return next(new AppError("User ID is required", 400));
    }

    const circles = await userModel.getUserCircles(user_id);
    
    logger.debug(`Retrieved circles for user: ${user_id}`);
    res.status(200).json({
      status: "success",
      data: {
        circles: circles,
        count: circles.length
      }
    });
  }),

  getUserTransactionSummary: catchAsync(async (req, res, next) => {
    const user_id = res.locals.user_id || req.params.userId;
    
    if (!user_id) {
      return next(new AppError("User ID is required", 400));
    }

    const transactions = await userModel.getUserTransactionSummary(user_id);
    
    // Calculate summary statistics
    const totalOwed = transactions
      .filter(t => t.payment_status === 'unpaid')
      .reduce((sum, t) => sum + parseFloat(t.amount_owed), 0);
    
    const totalPaid = transactions
      .filter(t => t.payment_status === 'paid')
      .reduce((sum, t) => sum + parseFloat(t.amount_owed), 0);

    logger.debug(`Retrieved transaction summary for user: ${user_id}`);
    res.status(200).json({
      status: "success",
      data: {
        transactions: transactions,
        summary: {
          total_owed: totalOwed,
          total_paid: totalPaid,
          pending_count: transactions.filter(t => t.payment_status === 'unpaid').length
        }
      }
    });
  }),

  searchUsers: catchAsync(async (req, res, next) => {
    const { q: searchQuery, limit } = req.query;
    
    if (!searchQuery) {
      logger.warn("User search failed: Missing search query");
      return next(new AppError("Search query is required", 400));
    }

    if (searchQuery.length < 2) {
      logger.warn("User search failed: Search query too short");
      return next(new AppError("Search query must be at least 2 characters", 400));
    }

    const users = await userModel.findUsersByUsername(searchQuery, limit);
    
    logger.debug(`User search for "${searchQuery}" returned ${users.length} results`);
    
    res.status(200).json({
      status: "success",
      data: {
        users: users,
        count: users.length
      }
    });
  }),

  getPaymentMethods: catchAsync(async (req, res, next) => {
    const user_id = res.locals.user_id;
    
    if (!user_id) {
      logger.warn("Get payment methods failed: Missing user ID");
      return next(new AppError("User ID is required", 400));
    }

    const paymentMethods = await userModel.getPaymentMethods(user_id);
    
    logger.debug(`Retrieved payment methods for user: ${user_id}`);
    res.status(200).json({
      status: "success",
      data: paymentMethods
    });
  }),

  updatePaymentMethods: catchAsync(async (req, res, next) => {
    const user_id = res.locals.user_id;
    const { paynow_phone, paynow_nric, paynow_enabled } = req.body;
    
    if (!user_id) {
      logger.warn("Update payment methods failed: Missing user ID");
      return next(new AppError("User ID is required", 400));
    }

    // Validate PayNow phone number format (Singapore format)
    if (paynow_phone && !/^(\+65)?[689]\d{7}$/.test(paynow_phone.replace(/\s+/g, ''))) {
      logger.warn(`Update payment methods failed: Invalid phone number format for user ${user_id}`);
      return next(new AppError("Invalid Singapore phone number format. Please use format: +65XXXXXXXX or 8XXXXXXX", 400));
    }

    // Validate NRIC format (basic validation for Singapore NRIC/FIN)
    if (paynow_nric && !/^[STFG]\d{7}[A-Z]$/i.test(paynow_nric)) {
      logger.warn(`Update payment methods failed: Invalid NRIC format for user ${user_id}`);
      return next(new AppError("Invalid NRIC/FIN format. Please use format: S1234567A", 400));
    }

    // Normalize phone number (ensure it has +65 prefix)
    let normalizedPhone = null;
    if (paynow_phone) {
      const cleanPhone = paynow_phone.replace(/\s+/g, '');
      if (cleanPhone.startsWith('+65')) {
        normalizedPhone = cleanPhone;
      } else if (cleanPhone.match(/^[689]\d{7}$/)) {
        normalizedPhone = '+65' + cleanPhone;
      } else {
        normalizedPhone = cleanPhone;
      }
    }

    // Normalize NRIC (uppercase)
    const normalizedNRIC = paynow_nric ? paynow_nric.toUpperCase() : null;

    const paymentData = {
      paynow_phone: normalizedPhone,
      paynow_nric: normalizedNRIC,
      paynow_enabled: Boolean(paynow_enabled)
    };

    try {
      const updatedPaymentMethods = await userModel.updatePaymentMethods(user_id, paymentData);
      
      logger.info(`Payment methods updated for user: ${user_id}`);
      res.status(200).json({
        status: "success",
        message: "Payment methods updated successfully",
        data: updatedPaymentMethods
      });
    } catch (error) {
      // Handle unique constraint violations
      if (error.code === 'P2002') {
        const target = error.meta?.target;
        if (target?.includes('paynow_phone')) {
          logger.warn(`Update payment methods failed: PayNow phone number already exists for user ${user_id}`);
          return next(new AppError("This PayNow phone number is already registered by another user", 409));
        }
        if (target?.includes('paynow_nric')) {
          logger.warn(`Update payment methods failed: PayNow NRIC already exists for user ${user_id}`);
          return next(new AppError("This PayNow NRIC is already registered by another user", 409));
        }
        // Generic unique constraint error
        logger.warn(`Update payment methods failed: Duplicate data for user ${user_id}`);
        return next(new AppError("This PayNow information is already registered by another user", 409));
      }
      
      // Re-throw other errors
      throw error;
    }
  })
};
const express = require("express");
const userModel = require("../models/userModel.js");
const logger = require("../logger.js");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const crypto = require("crypto");
const { sendVerificationEmail } = require("../utils/emailService.js"); 

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

    // Link any pending invitations that were sent to this email to the newly created user
    try {
      const linked = await userModel.linkInvitationsToUser(results.id, email);
      if (linked && linked > 0) {
        logger.info(`Linked ${linked} pending invitations to new user ${results.id}`);
      }
    } catch (linkErr) {
      logger.error(`Failed to link invitations to new user ${results.id}: ${linkErr.message}`);
    }

    // Send verification email
    try {
      await sendVerificationEmail(email, verificationToken, username);
      logger.info(`Verification email sent to ${email}`);
    } catch (emailError) {
      logger.error(`Failed to send verification email to ${email}: ${emailError.message}`);
    }

    logger.info(`User ${data.username} successfully created`);
    res.locals.message = `User ${data.username} successfully created. Please check your email to verify your account.`;
    res.locals.user_id = results.id;           
    res.locals.username = results.username;
    res.locals.email = results.email;
    res.locals.role_id = results.role?.id || null;      
    res.locals.role_name = results.role?.role_name || null; 
    res.locals.email_verified = results.email_verified || false;
    next();
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
  })
,

  // Search users by query (username or email) for autocomplete when inviting
  searchUsers: catchAsync(async (req, res, next) => {
    const q = req.query.q;
    if (!q || String(q).trim() === '') {
      return res.status(200).json({ status: 'success', data: [] });
    }
    const results = await userModel.searchUsers(q);
    // Normalize: ensure each result has a visible username (fallback to email or id)
    const mapped = (results || []).map(u => ({
      id: u.id,
      username: u.username || u.email || `user-${u.id}`,
      email: u.email || null,
    }));
    // Debug: log search query and mapped results (helps diagnose missing username)
    try {
      logger.debug && logger.debug(`userController.searchUsers q=${q} mapped=${JSON.stringify(mapped)}`);
    } catch (err) {
      console.debug(`searchUsers debug: ${q}`, mapped);
    }
    res.status(200).json({ status: 'success', data: mapped });
  })
};
const nodemailer = require('nodemailer');
const logger = require('../logger');

// Create transporter with improved configuration and multiple SMTP options
const createTransporter = () => {
  // Try multiple environment variable names for flexibility
  const emailUser = process.env.EMAIL_USER || process.env.SMTP_USER || 'k4rysgoh@gmail.com';
  const emailPass = process.env.EMAIL_PASSWORD || process.env.SMTP_PASS || 'gmdn swjq lfpg vklr';
  
  console.log('Email configuration:', {
    NODE_ENV: process.env.NODE_ENV,
    emailUser: emailUser ? emailUser.substring(0, 3) + '***' : 'MISSING',
    emailPass: emailPass ? 'SET' : 'MISSING',
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT
  });

  // Try custom SMTP first if configured, otherwise use Gmail
  if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
    console.log('Using custom SMTP configuration');
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
      auth: {
        user: emailUser,
        pass: emailPass
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 20000
    });
  }

  // Default to Gmail with optimized settings
  console.log('Using Gmail SMTP configuration');
  return nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // Use STARTTLS
    auth: {
      user: emailUser,
      pass: emailPass
    },
    tls: {
      rejectUnauthorized: false,
      ciphers: 'SSLv3'
    },
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,   // 10 seconds  
    socketTimeout: 20000,     // 20 seconds
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
    rateLimit: 14, // max 14 messages/second
    debug: process.env.NODE_ENV === 'development'
  });
};

const sendVerificationEmail = async (email, token, username) => {
  // Development mode: Skip email sending and auto-verify
  if (process.env.NODE_ENV === 'development' || process.env.SKIP_EMAIL_VERIFICATION === 'true') {
    console.log(`📧 DEVELOPMENT MODE: Skipping email verification for ${email}`);
    console.log(`🔗 Verification URL: ${process.env.FRONTEND_URL || 'https://paypals-frontend.onrender.com'}/verify-email/${token}`);
    logger.info(`Development mode: Email verification skipped for ${email}`);
    return {
      success: true,
      mode: 'development',
      message: 'Email verification skipped in development mode'
    };
  }

  const verificationUrl = `${process.env.FRONTEND_URL || 'https://paypals-frontend.onrender.com'}/verify-email/${token}`;
  
  const htmlContent = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <div style="background-color: #4F46E5; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Welcome to PayPals!</h1>
      </div>
      
      <div style="padding: 30px; background-color: #f9fafb;">
        <h2 style="color: #374151;">Hi ${username}! 👋</h2>
        
        <p style="color: #6B7280; font-size: 16px; line-height: 1.6;">
          Thanks for joining PayPals - the easiest way to split bills with friends! 
          To get started, we need to verify your email address.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #4F46E5; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 8px; font-weight: bold; 
                    display: inline-block;">
            Verify Email Address
          </a>
        </div>
        
        <p style="color: #6B7280; font-size: 14px;">
          If the button doesn't work, copy and paste this link into your browser:
          <br>
          <a href="${verificationUrl}" style="color: #4F46E5; word-break: break-all;">
            ${verificationUrl}
          </a>
        </p>
        
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">
        
        <p style="color: #9CA3AF; font-size: 12px; text-align: center;">
          This verification link will expire in 24 hours.<br>
          If you didn't create a PayPals account, you can safely ignore this email.
        </p>
      </div>
      
      <div style="background-color: #374151; padding: 20px; text-align: center;">
        <p style="color: #9CA3AF; margin: 0; font-size: 12px;">
          © 2024 PayPals. Made with ❤️ for friend groups who split bills together.
        </p>
      </div>
    </div>
  `;

  const textContent = `
    Welcome to PayPals, ${username}!
    
    Please verify your email address by clicking the link below:
    ${verificationUrl}
    
    This link will expire in 24 hours.
    
    If you didn't create a PayPals account, you can safely ignore this email.
    
    Best regards,
    The PayPals Team
  `;

  try {
    const transporter = createTransporter();
    
    // Quick connection test with reduced timeout
    console.log('Testing SMTP connection...');
    const connectionTest = await Promise.race([
      transporter.verify(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection test timeout')), 8000) // 8 seconds
      )
    ]);
    
    if (!connectionTest) {
      throw new Error('SMTP connection verification failed');
    }
    console.log('SMTP connection verified successfully');
    
    const mailOptions = {
      from: {
        name: 'PayPals Team',
        address: process.env.EMAIL_USER || process.env.SMTP_USER || 'k4rysgoh@gmail.com'
      },
      to: email,
      subject: 'Verify Your PayPals Account',
      html: htmlContent,
      text: textContent
    };

    // Send email with timeout
    console.log(`Sending verification email to ${email} via SMTP...`);
    const info = await Promise.race([
      transporter.sendMail(mailOptions),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email send timeout')), 15000) // 15 seconds
      )
    ]);
    
    logger.info(`Verification email sent via SMTP to ${email}: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error(`Failed to send verification email to ${email}: ${error.message}`);
    throw error;
  }
};

const sendPasswordResetEmail = async (email, resetToken, username) => {
  try {
    const transporter = createTransporter();
    
    const resetUrl = `${process.env.FRONTEND_URL || 'https://paypals-frontend.onrender.com'}/reset-password/${resetToken}`;
    
    const mailOptions = {
      from: {
        name: 'PayPals Team',
        address: process.env.EMAIL_USER || process.env.SMTP_USER || 'k4rysgoh@gmail.com'
      },
      to: email,
      subject: 'Reset Your PayPals Password',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <div style="background-color: #DC2626; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">PayPals Password Reset</h1>
          </div>
          
          <div style="padding: 30px; background-color: #f9fafb;">
            <h2 style="color: #374151;">Hi ${username}! 🔒</h2>
            
            <p style="color: #6B7280; font-size: 16px; line-height: 1.6;">
              We received a request to reset your PayPals account password. 
              Click the button below to create a new password.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background-color: #DC2626; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 8px; font-weight: bold; 
                        display: inline-block;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #6B7280; font-size: 14px;">
              If the button doesn't work, copy and paste this link into your browser:
              <br>
              <a href="${resetUrl}" style="color: #DC2626; word-break: break-all;">
                ${resetUrl}
              </a>
            </p>
            
            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">
            
            <p style="color: #9CA3AF; font-size: 12px; text-align: center;">
              This password reset link will expire in 1 hour.<br>
              If you didn't request this, you can safely ignore this email.
            </p>
          </div>
        </div>
      `,
      text: `
        Hi ${username}!
        
        We received a request to reset your PayPals account password.
        Click the link below to create a new password:
        ${resetUrl}
        
        This link will expire in 1 hour.
        
        If you didn't request this, you can safely ignore this email.
        
        Best regards,
        The PayPals Team
      `
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Password reset email sent to ${email}: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error(`Failed to send password reset email to ${email}: ${error.message}`);
    throw error;
  }
};

// Additional email functions for other features...
const sendCircleInvitationEmail = async (email, circleId, circleName, inviterName, invitationToken) => {
  try {
    const transporter = createTransporter();
    
    const invitationUrl = `${process.env.FRONTEND_URL || 'https://paypals-frontend.onrender.com'}/join-circle/${invitationToken}`;
    
    const mailOptions = {
      from: {
        name: 'PayPals Team',
        address: process.env.EMAIL_USER || process.env.SMTP_USER || 'k4rysgoh@gmail.com'
      },
      to: email,
      subject: `You're invited to join "${circleName}" on PayPals!`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <div style="background-color: #059669; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Circle Invitation</h1>
          </div>
          
          <div style="padding: 30px; background-color: #f9fafb;">
            <h2 style="color: #374151;">You're invited! 🎉</h2>
            
            <p style="color: #6B7280; font-size: 16px; line-height: 1.6;">
              ${inviterName} has invited you to join the "${circleName}" circle on PayPals.
              Join now to start splitting bills and expenses together!
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${invitationUrl}" 
                 style="background-color: #059669; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 8px; font-weight: bold; 
                        display: inline-block;">
                Join Circle
              </a>
            </div>
            
            <p style="color: #6B7280; font-size: 14px;">
              If the button doesn't work, copy and paste this link into your browser:
              <br>
              <a href="${invitationUrl}" style="color: #059669; word-break: break-all;">
                ${invitationUrl}
              </a>
            </p>
          </div>
        </div>
      `,
      text: `
        You're invited to join "${circleName}" on PayPals!
        
        ${inviterName} has invited you to join their circle.
        Click the link below to join:
        ${invitationUrl}
        
        Best regards,
        The PayPals Team
      `
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Circle invitation email sent to ${email}: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error(`Failed to send circle invitation email to ${email}: ${error.message}`);
    throw error;
  }
};

const sendExternalTransactionInvite = async (email, transactionDetails, inviterName, invitationToken) => {
  try {
    const transporter = createTransporter();
    
    const joinUrl = `${process.env.FRONTEND_URL || 'https://paypals-frontend.onrender.com'}/join-transaction/${invitationToken}`;
    
    const mailOptions = {
      from: {
        name: 'PayPals Team',
        address: process.env.EMAIL_USER || process.env.SMTP_USER || 'k4rysgoh@gmail.com'
      },
      to: email,
      subject: `You're invited to split "${transactionDetails.description}" on PayPals`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <div style="background-color: #7C3AED; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Transaction Invite</h1>
          </div>
          
          <div style="padding: 30px; background-color: #f9fafb;">
            <h2 style="color: #374151;">Split the Bill! 💰</h2>
            
            <p style="color: #6B7280; font-size: 16px; line-height: 1.6;">
              ${inviterName} wants to split "${transactionDetails.description}" with you.
              Total amount: $${transactionDetails.amount}
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${joinUrl}" 
                 style="background-color: #7C3AED; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 8px; font-weight: bold; 
                        display: inline-block;">
                View & Pay
              </a>
            </div>
          </div>
        </div>
      `,
      text: `
        ${inviterName} wants to split "${transactionDetails.description}" with you.
        Total amount: $${transactionDetails.amount}
        
        Click the link to view and pay your share:
        ${joinUrl}
        
        Best regards,
        The PayPals Team
      `
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Transaction invitation email sent to ${email}: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error(`Failed to send transaction invitation email to ${email}: ${error.message}`);
    throw error;
  }
};

const sendTransactionPaymentReminder = async (email, transactionDetails, username) => {
  try {
    const transporter = createTransporter();
    
    const paymentUrl = `${process.env.FRONTEND_URL || 'https://paypals-frontend.onrender.com'}/transactions/${transactionDetails.id}`;
    
    const mailOptions = {
      from: {
        name: 'PayPals Team',
        address: process.env.EMAIL_USER || process.env.SMTP_USER || 'k4rysgoh@gmail.com'
      },
      to: email,
      subject: `Payment Reminder: ${transactionDetails.description}`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <div style="background-color: #F59E0B; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Payment Reminder</h1>
          </div>
          
          <div style="padding: 30px; background-color: #f9fafb;">
            <h2 style="color: #374151;">Hi ${username}! ⏰</h2>
            
            <p style="color: #6B7280; font-size: 16px; line-height: 1.6;">
              This is a friendly reminder that you have a pending payment for:
              "${transactionDetails.description}"
            </p>
            
            <p style="color: #6B7280; font-size: 16px;">
              <strong>Amount due: $${transactionDetails.amount}</strong>
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${paymentUrl}" 
                 style="background-color: #F59E0B; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 8px; font-weight: bold; 
                        display: inline-block;">
                Pay Now
              </a>
            </div>
          </div>
        </div>
      `,
      text: `
        Hi ${username}!
        
        This is a friendly reminder that you have a pending payment for:
        "${transactionDetails.description}"
        
        Amount due: $${transactionDetails.amount}
        
        Click the link to pay:
        ${paymentUrl}
        
        Best regards,
        The PayPals Team
      `
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Payment reminder email sent to ${email}: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error(`Failed to send payment reminder email to ${email}: ${error.message}`);
    throw error;
  }
};

const sendPaymentReminderEmail = async (email, transactionDetails, username) => {
  // This is an alias for sendTransactionPaymentReminder for backward compatibility
  return sendTransactionPaymentReminder(email, transactionDetails, username);
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendCircleInvitationEmail,
  sendExternalTransactionInvite,
  sendTransactionPaymentReminder,
  sendPaymentReminderEmail
};
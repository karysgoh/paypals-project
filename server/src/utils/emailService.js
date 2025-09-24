const nodemailer = require('nodemailer');
const logger = require('../logger');

// Create transporter
const createTransporter = () => {
  if (process.env.NODE_ENV === 'development') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS 
      }
    });
  }

  // For production, use your preferred email service
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

const sendVerificationEmail = async (email, token, username) => {
  try {
    const transporter = createTransporter();
    
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;
    
    const mailOptions = {
      from: {
        name: 'PayPals Team',
        address: process.env.SMTP_USER
      },
      to: email,
      subject: 'Verify Your PayPals Account',
      html: `
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
      `,
      text: `
        Welcome to PayPals, ${username}!
        
        Please verify your email address by clicking the link below:
        ${verificationUrl}
        
        This link will expire in 24 hours.
        
        If you didn't create a PayPals account, you can safely ignore this email.
        
        Best regards,
        The PayPals Team
      `
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Verification email sent to ${email}: ${info.messageId}`);
    return info;
    
  } catch (error) {
    logger.error(`Failed to send verification email to ${email}: ${error.message}`);
    throw error;
  }
};

const sendPasswordResetEmail = async (email, resetToken, username) => {
  try {
    const transporter = createTransporter();
    
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    
    const mailOptions = {
      from: {
        name: 'PayPals Team',
        address: process.env.SMTP_USER
      },
      to: email,
      subject: 'Reset Your PayPals Password',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <div style="background-color: #DC2626; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Password Reset Request</h1>
          </div>
          
          <div style="padding: 30px; background-color: #f9fafb;">
            <h2 style="color: #374151;">Hi ${username},</h2>
            
            <p style="color: #6B7280; font-size: 16px; line-height: 1.6;">
              We received a request to reset your PayPals password. If you made this request, 
              click the button below to reset your password:
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
              This reset link will expire in 1 hour.<br>
              If you didn't request a password reset, you can safely ignore this email.
            </p>
          </div>
        </div>
      `,
      text: `
        Password Reset Request
        
        Hi ${username},
        
        We received a request to reset your PayPals password.
        Please click the link below to reset your password:
        ${resetUrl}
        
        This link will expire in 1 hour.
        If you didn't request this reset, you can safely ignore this email.
        
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

const sendCircleInvitationEmail = async (email, inviterUsername, circleName) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: {
        name: 'PayPals Team',
        address: process.env.SMTP_USER
      },
      to: email,
      subject: `You're invited to join ${circleName} on PayPals` ,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <div style="background-color: #059669; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">You're invited!</h1>
          </div>
          <div style="padding: 30px; background-color: #f9fafb;">
            <p style="color: #374151;">${inviterUsername} invited you to join the circle <strong>${circleName}</strong> on PayPals.</p>
            <p style="color: #6B7280;">Create an account or log in to accept the invitation.</p>
          </div>
        </div>
      `,
      text: `${inviterUsername} invited you to join the circle ${circleName} on PayPals. Create an account or log in to accept the invitation.`
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Circle invitation email sent to ${email}: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error(`Failed to send circle invitation email to ${email}: ${error.message}`);
    throw error;
  }
}

const sendExternalTransactionInvite = async (externalEmail, externalName, transactionData, accessToken) => {
  try {
    const transporter = createTransporter();
    
    const transactionUrl = `${process.env.FRONTEND_URL}/external/transaction/${accessToken}`;
    
    const mailOptions = {
      from: {
        name: 'PayPals Team',
        address: process.env.SMTP_USER
      },
      to: externalEmail,
      subject: `You've been included in a transaction: ${transactionData.name}`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <div style="background-color: #059669; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">PayPals Transaction</h1>
          </div>
          
          <div style="padding: 30px; background-color: #f9fafb;">
            <h2 style="color: #374151;">Hi ${externalName}! 💰</h2>
            
            <p style="color: #6B7280; font-size: 16px; line-height: 1.6;">
              You've been included in a transaction by ${transactionData.creatorName} in the ${transactionData.circleName} circle.
            </p>
            
            <div style="background-color: white; padding: 25px; border-radius: 12px; margin: 25px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h3 style="margin-top: 0; color: #374151; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px;">📋 Transaction Details</h3>
              
              <div style="margin: 15px 0;">
                <p style="margin: 8px 0; display: flex; justify-content: space-between;">
                  <span style="color: #6B7280;"><strong>Transaction:</strong></span> 
                  <span style="color: #374151;">${transactionData.name}</span>
                </p>
                ${transactionData.description ? `
                <p style="margin: 8px 0; display: flex; justify-content: space-between;">
                  <span style="color: #6B7280;"><strong>Description:</strong></span> 
                  <span style="color: #374151;">${transactionData.description}</span>
                </p>` : ''}
                <p style="margin: 8px 0; display: flex; justify-content: space-between;">
                  <span style="color: #6B7280;"><strong>Category:</strong></span> 
                  <span style="color: #374151;">${transactionData.category || 'General'}</span>
                </p>
                ${transactionData.locationName ? `
                <p style="margin: 8px 0; display: flex; justify-content: space-between;">
                  <span style="color: #6B7280;"><strong>Location:</strong></span> 
                  <span style="color: #374151;">${transactionData.locationName}</span>
                </p>` : ''}
                <p style="margin: 8px 0; display: flex; justify-content: space-between;">
                  <span style="color: #6B7280;"><strong>Created by:</strong></span> 
                  <span style="color: #374151;">${transactionData.creatorName}</span>
                </p>
                <p style="margin: 8px 0; display: flex; justify-content: space-between;">
                  <span style="color: #6B7280;"><strong>Circle:</strong></span> 
                  <span style="color: #374151;">${transactionData.circleName}</span>
                </p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 15px 0;">
                <p style="margin: 8px 0; display: flex; justify-content: space-between;">
                  <span style="color: #6B7280;"><strong>Your Amount:</strong></span> 
                  <span style="color: #059669; font-size: 18px; font-weight: bold;">$${transactionData.userAmount}</span>
                </p>
                <p style="margin: 8px 0; display: flex; justify-content: space-between;">
                  <span style="color: #6B7280;"><strong>Total Amount:</strong></span> 
                  <span style="color: #374151;">$${transactionData.totalAmount}</span>
                </p>
              </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${transactionUrl}" 
                 style="background-color: #1E40AF; color: white; padding: 18px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px; box-shadow: 0 4px 12px rgba(30, 64, 175, 0.3);">
                💳 Pay Now 
              </a>
              <p style="color: #6B7280; font-size: 12px; margin-top: 10px;">
                Secure payment via NetsQR QR code
              </p>
            </div>
            
            <div style="background-color: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #374151; font-size: 14px; text-align: center;">
                <strong>💡 How it works:</strong><br>
                Click "Pay Now" → Scan NetsQR QR code → Complete payment → You're done!
              </p>
            </div>
            
            <div style="background-color: #FEF3C7; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #92400E; font-size: 14px;">
                <strong>Note:</strong> This link is valid for 30 days. You don't need to create an account to view or update this transaction.
              </p>
            </div>
            
            <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
              If you have any questions about this transaction, please contact ${transactionData.creatorName} directly.
            </p>
          </div>
          
          <div style="background-color: #374151; padding: 20px; text-align: center;">
            <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
              This is an automated message from PayPals. Do not reply to this email.
            </p>
          </div>
        </div>
      `,
      text: `
        You've been included in a transaction: ${transactionData.name}

        Transaction Details:
        - Description: ${transactionData.name}
        ${transactionData.description ? `- Details: ${transactionData.description}` : ''}
        - Category: ${transactionData.category || 'General'}
        ${transactionData.locationName ? `- Location: ${transactionData.locationName}` : ''}
        - Your amount: $${transactionData.userAmount}
        - Total amount: $${transactionData.totalAmount}
        - Created by: ${transactionData.creatorName}
        - Circle: ${transactionData.circleName}

        Pay securely with NetsQR QR code: ${transactionUrl}

        Click the link above to view transaction details and pay instantly with NetSqr QR code.
        This link is valid for 30 days and you don't need to create an account.
      `
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`External transaction invite sent to ${externalEmail}: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error(`Failed to send external transaction invite to ${externalEmail}: ${error.message}`);
    throw error;
  }
};

const sendTransactionPaymentReminder = async (userEmail, userName, transactionData) => {
  try {
    const transporter = createTransporter();
    
    const paymentUrl = `${process.env.FRONTEND_URL}/transaction/${transactionData.id}/pay`;
    
    const mailOptions = {
      from: {
        name: 'PayPals Team',
        address: process.env.SMTP_USER
      },
      to: userEmail,
      subject: `Payment Due: ${transactionData.name}`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <div style="background-color: #059669; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">PayPals Payment Reminder</h1>
          </div>
          
          <div style="padding: 30px; background-color: #f9fafb;">
            <h2 style="color: #374151;">Hi ${userName}! 💰</h2>
            
            <p style="color: #6B7280; font-size: 16px; line-height: 1.6;">
              You have a pending payment for a transaction in the ${transactionData.circleName} circle.
            </p>
            
            <div style="background-color: white; padding: 25px; border-radius: 12px; margin: 25px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h3 style="margin-top: 0; color: #374151; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px;">📋 Transaction Details</h3>
              
              <div style="margin: 15px 0;">
                <p style="margin: 8px 0; display: flex; justify-content: space-between;">
                  <span style="color: #6B7280;"><strong>Transaction:</strong></span> 
                  <span style="color: #374151;">${transactionData.name}</span>
                </p>
                ${transactionData.description ? `
                <p style="margin: 8px 0; display: flex; justify-content: space-between;">
                  <span style="color: #6B7280;"><strong>Description:</strong></span> 
                  <span style="color: #374151;">${transactionData.description}</span>
                </p>` : ''}
                <p style="margin: 8px 0; display: flex; justify-content: space-between;">
                  <span style="color: #6B7280;"><strong>Category:</strong></span> 
                  <span style="color: #374151;">${transactionData.category || 'General'}</span>
                </p>
                ${transactionData.locationName ? `
                <p style="margin: 8px 0; display: flex; justify-content: space-between;">
                  <span style="color: #6B7280;"><strong>Location:</strong></span> 
                  <span style="color: #374151;">${transactionData.locationName}</span>
                </p>` : ''}
                <p style="margin: 8px 0; display: flex; justify-content: space-between;">
                  <span style="color: #6B7280;"><strong>Created by:</strong></span> 
                  <span style="color: #374151;">${transactionData.creatorName}</span>
                </p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 15px 0;">
                <p style="margin: 8px 0; display: flex; justify-content: space-between;">
                  <span style="color: #6B7280;"><strong>Your Amount:</strong></span> 
                  <span style="color: #059669; font-size: 18px; font-weight: bold;">$${transactionData.userAmount}</span>
                </p>
                <p style="margin: 8px 0; display: flex; justify-content: space-between;">
                  <span style="color: #6B7280;"><strong>Total Amount:</strong></span> 
                  <span style="color: #374151;">$${transactionData.totalAmount}</span>
                </p>
              </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${paymentUrl}" 
                 style="background-color: #1E40AF; color: white; padding: 18px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px; box-shadow: 0 4px 12px rgba(30, 64, 175, 0.3);">
                💳 Pay Now with NetSqr
              </a>
              <p style="color: #6B7280; font-size: 12px; margin-top: 10px;">
                Secure payment via NetSqr QR code
              </p>
            </div>
            
            <div style="background-color: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #374151; font-size: 14px; text-align: center;">
                <strong>💡 How it works:</strong><br>
                Click "Pay Now" → Scan NetSqr QR code → Complete payment → You're done!
              </p>
            </div>
            
            <div style="background-color: #EEF2FF; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #3730A3; font-size: 14px;">
                <strong>Signed in user:</strong> This link will take you directly to the payment page after logging in to your PayPals account.
              </p>
            </div>
            
            <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
              If you have any questions about this transaction, please contact ${transactionData.creatorName} directly.
            </p>
          </div>
          
          <div style="background-color: #374151; padding: 20px; text-align: center;">
            <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
              This is an automated message from PayPals. Do not reply to this email.
            </p>
          </div>
        </div>
      `,
      text: `
Payment Reminder: ${transactionData.name}

Hi ${userName},

You have a pending payment for a transaction in the ${transactionData.circleName} circle.

Transaction Details:
- Description: ${transactionData.name}
${transactionData.description ? `- Details: ${transactionData.description}` : ''}
- Category: ${transactionData.category || 'General'}
${transactionData.locationName ? `- Location: ${transactionData.locationName}` : ''}
- Your amount: $${transactionData.userAmount}
- Total amount: $${transactionData.totalAmount}
- Created by: ${transactionData.creatorName}
- Circle: ${transactionData.circleName}

Pay securely with NetSqr QR code: ${paymentUrl}

Click the link above to log in to your PayPals account and complete payment with NetSqr QR code.
      `
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Transaction payment reminder sent to ${userEmail}: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error(`Failed to send transaction payment reminder to ${userEmail}: ${error.message}`);
    throw error;
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendCircleInvitationEmail,
  sendExternalTransactionInvite,
  sendTransactionPaymentReminder
};
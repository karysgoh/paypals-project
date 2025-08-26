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
    
    const verificationUrl = `${process.env.FRONTEND_URL}/api/verify-email/${token}`;
    
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

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendCircleInvitationEmail
};
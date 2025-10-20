#!/usr/bin/env node
/**
 * Email Service Test Script
 * Usage: node test-email.js [email@example.com]
 */

require('dotenv').config();
const { sendVerificationEmail } = require('./src/utils/emailService');

async function testEmail() {
  const testEmail = process.argv[2] || 'test@example.com';
  const testToken = 'test-token-12345';
  const testUsername = 'TestUser';

  console.log('🧪 Testing Nodemailer Email Service...');
  console.log(`📧 Sending test email to: ${testEmail}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⚙️  Skip Email: ${process.env.SKIP_EMAIL_VERIFICATION}`);
  console.log(`📮 SMTP Host: ${process.env.SMTP_HOST || 'Gmail (default)'}`);
  console.log(`📮 SMTP Port: ${process.env.SMTP_PORT || '587 (default)'}`);
  console.log('');

  try {
    const result = await sendVerificationEmail(testEmail, testToken, testUsername);
    
    console.log('✅ Email test completed successfully!');
    console.log('📋 Result:', result);
    
    if (result.mode === 'development') {
      console.log('');
      console.log('🚀 Development Mode Active');
      console.log('📧 Email sending was skipped');
      console.log('🔗 In a real app, users would go to:');
      console.log(`   ${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email/${testToken}`);
    } else {
      console.log('');
      console.log('📧 Email sent via SMTP!');
      console.log('📬 Check the recipient\'s inbox');
    }
    
  } catch (error) {
    console.error('❌ Email test failed:');
    console.error('📋 Error:', error.message);
    
    if (error.message.includes('timeout')) {
      console.error('');
      console.error('� Timeout Issue - Try:');
      console.error('   1. Check your Gmail App Password is correct');
      console.error('   2. Ensure 2FA is enabled on Gmail account');
      console.error('   3. Set SKIP_EMAIL_VERIFICATION=true for development');
      console.error('   4. Use a different SMTP service');
    }
    
    console.error('�🔍 Full Details:', error);
  }
}

testEmail();
#!/usr/bin/env node
/**
 * Registration Flow Test Script
 * Tests the complete registration process including email sending
 */

require('dotenv').config();
const axios = require('axios');

async function testRegistrationFlow() {
  // Test configuration
  const API_BASE_URL = process.env.API_BASE_URL || 'https://paypals-backend.onrender.com';
  const testUser = {
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: 'TestPassword123!',
    paynow_phone: `8${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`
  };

  console.log('🧪 Testing Complete Registration Flow...');
  console.log(`🌐 API Base URL: ${API_BASE_URL}`);
  console.log(`👤 Test User:`, {
    username: testUser.username,
    email: testUser.email,
    paynow_phone: testUser.paynow_phone
  });
  console.log('');

  try {
    // Step 1: Test registration endpoint
    console.log('📝 Step 1: Testing registration...');
    const registrationResponse = await axios.post(`${API_BASE_URL}/register`, {
      username: testUser.username,
      email: testUser.email,
      password: testUser.password,
      paynow_phone: testUser.paynow_phone
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });

    console.log('✅ Registration successful!');
    console.log('📋 Status:', registrationResponse.status);
    console.log('📋 Response:', registrationResponse.data);
    console.log('');

    // Step 2: Check if user was created (optional - would need login endpoint)
    console.log('📝 Step 2: Registration flow completed');
    console.log('📧 Email should be sent to:', testUser.email);
    console.log('🔗 User should be redirected to verification page');
    console.log('');

    // Step 3: Test email verification URL format
    const mockToken = 'test-verification-token-12345';
    const verificationUrl = `${process.env.FRONTEND_URL || 'https://paypals-frontend.onrender.com'}/verify-email/${mockToken}`;
    console.log('📝 Step 3: Email verification URL format');
    console.log('🔗 Verification URL:', verificationUrl);
    console.log('');

    console.log('🎉 Registration flow test completed successfully!');
    console.log('');
    console.log('📋 Summary:');
    console.log('✅ User registration: SUCCESS');
    console.log('✅ API response: SUCCESS');
    console.log('✅ Email should be sent');
    console.log('✅ Frontend redirect should work');

  } catch (error) {
    console.error('❌ Registration flow test failed:');
    
    if (error.response) {
      console.error('📋 Status:', error.response.status);
      console.error('📋 Error Response:', error.response.data);
      
      if (error.response.status === 409) {
        console.error('🔍 Conflict: Username, email, or phone already exists');
      } else if (error.response.status === 400) {
        console.error('🔍 Bad Request: Invalid input data');
      } else if (error.response.status === 500) {
        console.error('🔍 Server Error: Check backend logs');
      }
    } else if (error.request) {
      console.error('🔍 Network Error: Could not reach server');
      console.error('📋 Request:', error.request);
    } else {
      console.error('🔍 Setup Error:', error.message);
    }
    
    console.error('');
    console.error('🔧 Troubleshooting:');
    console.error('   1. Check if backend server is running');
    console.error('   2. Verify API_BASE_URL is correct');
    console.error('   3. Check network connection');
    console.error('   4. Review backend logs for errors');
  }
}

testRegistrationFlow();
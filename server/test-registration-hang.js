#!/usr/bin/env node
/**
 * Quick Registration Test - Check if registration hangs
 */

require('dotenv').config();
const axios = require('axios');

async function testRegistrationHang() {
  const API_BASE_URL = 'https://paypals-backend.onrender.com';
  const timestamp = Date.now();
  
  const testUser = {
    username: `testuser${timestamp.toString().slice(-6)}`,
    email: `test${timestamp}@example.com`,
    password: 'TestPassword123!',
    paynow_phone: '81234567'
  };

  console.log('🧪 Testing Registration Hang Issue...');
  console.log('📝 Test User:', testUser.username, testUser.email);
  console.log('⏱️  Starting registration request...');
  
  const startTime = Date.now();

  try {
    // Set a reasonable timeout
    const response = await axios.post(`${API_BASE_URL}/api/register`, testUser, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 45000 // 45 seconds
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('✅ Registration completed successfully!');
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log('📋 Status:', response.status);
    console.log('📋 Response:', response.data);

    if (duration > 30000) {
      console.log('⚠️  WARNING: Registration took more than 30 seconds');
      console.log('🔍 This suggests an issue with email service or database operations');
    }

  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.error('❌ Registration failed or timed out');
    console.error(`⏱️  Duration: ${duration}ms`);
    
    if (error.code === 'ECONNABORTED') {
      console.error('🕐 Request timed out after 45 seconds');
      console.error('🔍 This indicates the server is hanging during registration');
    } else if (error.response) {
      console.error('📋 Status:', error.response.status);
      console.error('📋 Error Response:', error.response.data);
    } else {
      console.error('🔍 Network Error:', error.message);
    }
  }
}

testRegistrationHang();
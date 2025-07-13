// Simple test script for notifications
const fetch = require('node-fetch');

async function testNotifications() {
  console.log('🧪 Testing Notification System...\n');

  // Test 1: Email notification
  console.log('📧 Testing Email...');
  try {
    const emailResponse = await fetch('http://localhost:3000/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send-email',
        to: 'test@example.com',
        subject: 'Test Email',
        message: 'This is a test email from the notification system.'
      })
    });

    const emailResult = await emailResponse.json();
    console.log('Email Result:', emailResult);
  } catch (error) {
    console.log('Email Error:', error.message);
  }

  console.log('\n📱 Testing SMS...');
  try {
    const smsResponse = await fetch('http://localhost:3000/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send-sms',
        to: '5551234567',
        message: 'Test SMS from notification system',
        carrier: 'verizon'
      })
    });

    const smsResult = await smsResponse.json();
    console.log('SMS Result:', smsResult);
  } catch (error) {
    console.log('SMS Error:', error.message);
  }

  console.log('\n✅ Test completed!');
}

testNotifications(); 
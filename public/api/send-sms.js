// Simple SMS API endpoint for development
// In production, this would be a proper backend endpoint

const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { to, message, from } = JSON.parse(event.body);

    if (!to || !message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: to, message' })
      };
    }

    // Send SMS using Twilio
    const result = await client.messages.create({
      body: message,
      from: from || fromNumber,
      to: to
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        sid: result.sid,
        message: 'SMS sent successfully'
      })
    };
  } catch (error) {
    console.error('SMS sending error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to send SMS',
        details: error.message 
      })
    };
  }
}; 
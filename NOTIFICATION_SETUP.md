# Notification Setup Guide for Twisted Roots Salon

This guide will help you set up real SMS and email notifications for your salon management system.

## Overview

The notification system supports:
- **SMS notifications** via Twilio
- **Email notifications** via SendGrid
- **Work-in request responses** (approved/denied)
- **Appointment cancellations**
- **Customer preference-based delivery** (SMS or email)

## Prerequisites

1. **Twilio Account** (for SMS)
   - Sign up at [twilio.com](https://www.twilio.com)
   - Get your Account SID and Auth Token
   - Purchase a phone number for sending SMS

2. **SendGrid Account** (for email)
   - Sign up at [sendgrid.com](https://www.sendgrid.com)
   - Get your API Key
   - Verify your sender domain or use a single sender

## Environment Variables Setup

Create a `.env` file in your project root with the following variables:

```env
# Twilio Configuration
REACT_APP_TWILIO_ACCOUNT_SID=your_twilio_account_sid
REACT_APP_TWILIO_AUTH_TOKEN=your_twilio_auth_token
REACT_APP_TWILIO_PHONE_NUMBER=+1234567890

# SendGrid Configuration
REACT_APP_SENDGRID_API_KEY=your_sendgrid_api_key
REACT_APP_SENDGRID_FROM_EMAIL=noreply@yourdomain.com
```

## Installation

Install the required dependencies:

```bash
npm install twilio @sendgrid/mail
```

## Backend API Setup

### Option 1: Express.js Backend (Recommended)

Create a simple Express.js server to handle notifications:

```javascript
// server.js
const express = require('express');
const twilio = require('twilio');
const sgMail = require('@sendgrid/mail');
require('dotenv').config();

const app = express();
app.use(express.json());

// Twilio setup
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// SendGrid setup
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// SMS endpoint
app.post('/api/send-sms', async (req, res) => {
  try {
    const { to, message, from } = req.body;
    
    const result = await twilioClient.messages.create({
      body: message,
      from: from || process.env.TWILIO_PHONE_NUMBER,
      to: to
    });
    
    res.json({ success: true, sid: result.sid });
  } catch (error) {
    console.error('SMS error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Email endpoint
app.post('/api/send-email', async (req, res) => {
  try {
    const { to, from, subject, text, html } = req.body;
    
    const msg = {
      to: to,
      from: from || process.env.SENDGRID_FROM_EMAIL,
      subject: subject,
      text: text,
      html: html || text.replace(/\n/g, '<br>')
    };
    
    const result = await sgMail.send(msg);
    
    res.json({ 
      success: true, 
      messageId: result[0]?.headers['x-message-id'] 
    });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Notification server running on port ${PORT}`);
});
```

### Option 2: Netlify Functions (Serverless)

If using Netlify, create functions in the `netlify/functions/` directory:

```javascript
// netlify/functions/send-sms.js
const twilio = require('twilio');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  try {
    const { to, message, from } = JSON.parse(event.body);
    
    const result = await client.messages.create({
      body: message,
      from: from || process.env.TWILIO_PHONE_NUMBER,
      to: to
    });
    
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, sid: result.sid })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
```

## Testing the Setup

1. **Test SMS**: Send a test SMS through the admin interface
2. **Test Email**: Send a test email through the admin interface
3. **Test Work-in Requests**: Submit a work-in request and respond to it
4. **Test Cancellations**: Cancel an appointment and verify notification

## Notification Types

### 1. Work-in Request Responses
- **Approved**: Sends confirmation with selected time
- **Denied**: Sends polite rejection with alternative suggestions
- **Contact Method**: Respects customer's preferred contact method

### 2. Appointment Cancellations
- **Automatic**: Sent when appointments are cancelled
- **Contact Method**: Uses customer's preferred contact method
- **Information**: Includes service, stylist, date, and time details

### 3. Customer Preferences
- **SMS**: Quick, concise messages
- **Email**: Detailed information with formatting
- **Fallback**: SMS if email not available

## Message Templates

### SMS Templates
```
Work-in Approved: "Twisted Roots: Your work-in request for [Service] on [Date] at [Time] has been APPROVED by [Stylist]! [Notes] Please call to confirm."

Work-in Denied: "Twisted Roots: Your work-in request for [Service] on [Date] was not available. [Notes] Please try booking a regular appointment."

Cancellation: "Twisted Roots: Your [Service] appointment on [Date] at [Time] with [Stylist] has been cancelled. Please call to reschedule."
```

### Email Templates
```
Subject: Work-In Request Approved - [Service]

Great news! [Stylist] has approved your work-in request.

Service: [Service]
Date: [Date]
Time: [Time]

[Stylist Notes]

Please call Twisted Roots to confirm your exact appointment time.

Thank you for choosing Twisted Roots!
```

## Troubleshooting

### Common Issues

1. **SMS not sending**
   - Verify Twilio credentials
   - Check phone number format (+1XXXXXXXXXX)
   - Ensure sufficient Twilio credits

2. **Email not sending**
   - Verify SendGrid API key
   - Check sender email verification
   - Review SendGrid activity logs

3. **CORS errors**
   - Ensure backend allows frontend domain
   - Check API endpoint URLs

### Debug Mode

The notification service includes fallback logging when credentials aren't configured:

```javascript
// Will log to console if Twilio not configured
console.log(`📱 SMS TO: ${to}`);
console.log(`📱 MESSAGE: ${message}`);
```

## Security Considerations

1. **Environment Variables**: Never commit API keys to version control
2. **Rate Limiting**: Implement rate limiting on notification endpoints
3. **Validation**: Validate phone numbers and email addresses
4. **Logging**: Log notification attempts for debugging
5. **Error Handling**: Graceful fallbacks when services are unavailable

## Cost Considerations

### Twilio SMS Pricing
- ~$0.0075 per SMS (US numbers)
- ~$0.05 per SMS (international)
- Free trial available

### SendGrid Email Pricing
- 100 emails/day free
- ~$14.95/month for 50k emails
- Pay-as-you-go available

## Production Deployment

1. **Environment Variables**: Set in production environment
2. **Domain Verification**: Verify sender domain with SendGrid
3. **Phone Number**: Use verified Twilio phone number
4. **Monitoring**: Set up alerts for notification failures
5. **Backup**: Consider backup notification services

## Support

For issues with:
- **Twilio**: [Twilio Support](https://support.twilio.com)
- **SendGrid**: [SendGrid Support](https://support.sendgrid.com)
- **Application**: Check console logs and network requests 
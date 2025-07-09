// Simple Email API endpoint for development
// In production, this would be a proper backend endpoint

const sgMail = require('@sendgrid/mail');

const apiKey = process.env.SENDGRID_API_KEY;
const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@twistedroots.com';

sgMail.setApiKey(apiKey);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { to, from, subject, text, html } = JSON.parse(event.body);

    if (!to || !subject || (!text && !html)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: to, subject, text or html' })
      };
    }

    // Send email using SendGrid
    const msg = {
      to: to,
      from: from || fromEmail,
      subject: subject,
      text: text,
      html: html || text.replace(/\n/g, '<br>')
    };

    const result = await sgMail.send(msg);

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        messageId: result[0]?.headers['x-message-id'],
        message: 'Email sent successfully'
      })
    };
  } catch (error) {
    console.error('Email sending error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to send email',
        details: error.message 
      })
    };
  }
}; 
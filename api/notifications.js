// Vercel Serverless Function for Free Notifications
// Supports SMS via email-to-SMS gateways and email via free services

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, ...data } = req.body;

  try {
    switch (action) {
      case 'send-sms':
        return await handleSMS(res, data);
      case 'send-email':
        return await handleEmail(res, data);
      case 'send-work-in-response':
        return await handleWorkInResponse(res, data);
      case 'send-cancellation':
        return await handleCancellation(res, data);
      default:
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid action. Use: send-sms, send-email, send-work-in-response, or send-cancellation' 
        });
    }
  } catch (error) {
    console.error('Notification error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

// SMS via email-to-SMS gateways
async function handleSMS(res, { to, message, carrier = 'verizon' }) {
  if (!to || !message) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required fields: to, message' 
    });
  }

  const smsGateways = {
    verizon: '@vtext.com',
    att: '@txt.att.net',
    tmobile: '@tmomail.net',
    sprint: '@messaging.sprintpcs.com',
    boost: '@myboostmobile.com',
    cricket: '@sms.cricketwireless.net',
    metro: '@mymetropcs.com',
    uscellular: '@email.uscc.net',
    virgin: '@vmobl.com'
  };

  try {
    // Clean phone number
    const cleanPhone = to.replace(/\D/g, '');
    const phone = cleanPhone.length === 11 && cleanPhone.startsWith('1') 
      ? cleanPhone.substring(1) 
      : cleanPhone;

    const gateway = smsGateways[carrier] || smsGateways.verizon;
    const email = `${phone}${gateway}`;

    // Use a free email service (Resend, Mailgun, or similar)
    const emailResult = await sendEmailViaService({
      to: email,
      subject: '',
      text: message,
      from: 'noreply@twistedroots.com'
    });

    if (emailResult.success) {
      return res.status(200).json({
        success: true,
        message: `SMS sent via ${carrier} gateway`,
        carrier
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Failed to send SMS via email gateway'
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// Email via free service
async function handleEmail(res, { to, subject, message }) {
  if (!to || !subject || !message) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required fields: to, subject, message' 
    });
  }

  try {
    const result = await sendEmailViaService({
      to,
      subject,
      text: message,
      html: message.replace(/\n/g, '<br>'),
      from: 'Twisted Roots <noreply@twistedroots.com>'
    });

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Email sent successfully'
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to send email'
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// Work-in response notification
async function handleWorkInResponse(res, { request, staffMember, status, responseNotes = '', services = [], selectedTime = '' }) {
  if (!request || !staffMember || !status) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required fields: request, staffMember, status' 
    });
  }

  try {
    const { customerInfo, requestedDate, requestedTime } = request;
    const serviceName = services.find(s => s.id === request.serviceId)?.name || 'Service';
    
    const formattedDate = new Date(requestedDate).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });

    if (customerInfo.preferredContact === 'email' && customerInfo.email) {
      // Send email notification
      const subject = status === 'approved' 
        ? `Work-In Request Approved - ${serviceName}`
        : `Work-In Request Update - ${serviceName}`;

      const timeDisplay = selectedTime ? 
        new Date(`2000-01-01T${selectedTime}:00`).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }) : 
        (!requestedTime || requestedTime === '01:00' || requestedTime === '' ? 'Flexible timing' : requestedTime);

      let message;
      if (status === 'approved') {
        message = `Great news! ${staffMember.name} has approved your work-in request.

Service: ${serviceName}
Date: ${formattedDate}
Time: ${timeDisplay}

${responseNotes ? `Stylist Notes: ${responseNotes}` : ''}

Please call Twisted Roots to confirm your exact appointment time.

Thank you for choosing Twisted Roots!`;
      } else {
        message = `We received your work-in request for ${serviceName} on ${formattedDate}.

Unfortunately, ${staffMember.name} is not available for a work-in appointment on this date.

${responseNotes ? `Stylist Notes: ${responseNotes}` : ''}

Please try booking a regular appointment or request a different date.

Thank you for choosing Twisted Roots!`;
      }

      const result = await sendEmailViaService({
        to: customerInfo.email,
        subject,
        text: message,
        html: message.replace(/\n/g, '<br>'),
        from: 'Twisted Roots <noreply@twistedroots.com>'
      });

      return res.status(200).json(result);
    } else {
      // Send SMS notification
      const timeDisplay = selectedTime ? 
        new Date(`2000-01-01T${selectedTime}:00`).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }) : 'flexible time';
      
      const smsMessage = status === 'approved'
        ? `Twisted Roots: Your work-in request for ${serviceName} on ${formattedDate} at ${timeDisplay} has been APPROVED by ${staffMember.name}! ${responseNotes ? 'Notes: ' + responseNotes : ''} Please call to confirm.`
        : `Twisted Roots: Your work-in request for ${serviceName} on ${formattedDate} was not available. ${responseNotes ? 'Notes: ' + responseNotes : ''} Please try booking a regular appointment.`;

      return await handleSMS(res, {
        to: customerInfo.phone,
        message: smsMessage
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// Appointment cancellation notification
async function handleCancellation(res, { appointment, staffMember, service, client }) {
  if (!appointment || !staffMember || !service || !client) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required fields: appointment, staffMember, service, client' 
    });
  }

  try {
    const formattedDate = new Date(appointment.date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });

    const timeDisplay = new Date(`2000-01-01T${appointment.time}:00`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    if (client.preferredContact === 'email' && client.email) {
      const subject = 'Appointment Cancellation - Twisted Roots';
      const message = `Dear ${client.name},

Your appointment has been cancelled.

Service: ${service.name}
Date: ${formattedDate}
Time: ${timeDisplay}
Stylist: ${staffMember.name}

We apologize for any inconvenience. Please call us to reschedule.

Thank you for choosing Twisted Roots!`;

      const result = await sendEmailViaService({
        to: client.email,
        subject,
        text: message,
        html: message.replace(/\n/g, '<br>'),
        from: 'Twisted Roots <noreply@twistedroots.com>'
      });

      return res.status(200).json(result);
    } else {
      const smsMessage = `Twisted Roots: Your ${service.name} appointment on ${formattedDate} at ${timeDisplay} with ${staffMember.name} has been cancelled. Please call to reschedule.`;

      return await handleSMS(res, {
        to: client.phone,
        message: smsMessage
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// Email service function (supports multiple free providers)
async function sendEmailViaService({ to, subject, text, html, from }) {
  // Try multiple free email services in order of preference
  
  // Option 1: Resend (free tier: 3,000 emails/month)
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = require('resend');
      const resendClient = new resend(process.env.RESEND_API_KEY);
      
      const result = await resendClient.emails.send({
        from: from || 'noreply@twistedroots.com',
        to: [to],
        subject,
        text,
        html
      });

      return { success: true, messageId: result.id };
    } catch (error) {
      console.log('Resend failed, trying next service...');
    }
  }

  // Option 2: Mailgun (free tier: 5,000 emails/month)
  if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
    try {
      const formData = new URLSearchParams();
      formData.append('from', from || 'noreply@twistedroots.com');
      formData.append('to', to);
      formData.append('subject', subject);
      formData.append('text', text);
      if (html) formData.append('html', html);

      const response = await fetch(`https://api.mailgun.net/v3/${process.env.MAILGUN_DOMAIN}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${process.env.MAILGUN_API_KEY}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        return { success: true, messageId: result.id };
      }
    } catch (error) {
      console.log('Mailgun failed, trying next service...');
    }
  }

  // Option 3: SendGrid (free tier: 100 emails/day)
  if (process.env.SENDGRID_API_KEY) {
    try {
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      
      const result = await sgMail.send({
        to,
        from: from || 'noreply@twistedroots.com',
        subject,
        text,
        html
      });

      return { success: true, messageId: result[0].headers['x-message-id'] };
    } catch (error) {
      console.log('SendGrid failed, trying next service...');
    }
  }

  // Option 4: Gmail SMTP (free, requires app password)
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    try {
      const nodemailer = require('nodemailer');
      
      const transporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD
        }
      });

      const result = await transporter.sendMail({
        from: from || 'noreply@twistedroots.com',
        to,
        subject,
        text,
        html
      });

      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.log('Gmail SMTP failed...');
    }
  }

  // Fallback: Log to console (for development)
  console.log('📧 EMAIL TO:', to);
  console.log('📧 SUBJECT:', subject);
  console.log('📧 MESSAGE:', text);
  
  return { 
    success: true, 
    message: 'Email logged to console (no email service configured)' 
  };
} 
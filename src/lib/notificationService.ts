// Notification Service for Twisted Roots Salon
// Handles real SMS and email notifications using Twilio and SendGrid

export interface NotificationResult {
  success: boolean;
  error?: any;
  messageId?: string;
}

export interface EmailParams {
  to: string;
  subject: string;
  message: string;
  from?: string;
}

export interface SMSParams {
  to: string;
  message: string;
  from?: string;
  carrier?: string;
}

export interface WorkInResponseParams {
  request: any;
  staffMember: any;
  status: "approved" | "denied";
  responseNotes?: string;
  services?: any[];
  selectedTime?: string;
}

class NotificationService {
  private twilioAccountSid: string;
  private twilioAuthToken: string;
  private twilioPhoneNumber: string;
  private sendGridApiKey: string;
  private sendGridFromEmail: string;

  constructor() {
    // Load environment variables for API keys
    this.twilioAccountSid = process.env.REACT_APP_TWILIO_ACCOUNT_SID || '';
    this.twilioAuthToken = process.env.REACT_APP_TWILIO_AUTH_TOKEN || '';
    this.twilioPhoneNumber = process.env.REACT_APP_TWILIO_PHONE_NUMBER || '';
    this.sendGridApiKey = process.env.REACT_APP_SENDGRID_API_KEY || '';
    this.sendGridFromEmail = process.env.REACT_APP_SENDGRID_FROM_EMAIL || 'noreply@twistedroots.com';
  }

  // Send SMS using Twilio
  async sendSMS(params: SMSParams): Promise<NotificationResult> {
    try {
      if (!this.twilioAccountSid || !this.twilioAuthToken || !this.twilioPhoneNumber) {
        console.warn('Twilio credentials not configured, falling back to console log');
        console.log(`📱 SMS TO: ${params.to}`);
        console.log(`📱 MESSAGE: ${params.message}`);
        return { success: true };
      }

      // For production, you would use the Twilio SDK
      // const client = require('twilio')(this.twilioAccountSid, this.twilioAuthToken);
      // const result = await client.messages.create({
      //   body: params.message,
      //   from: this.twilioPhoneNumber,
      //   to: params.to
      // });

      // Use Vercel serverless function
      const response = await fetch('https://salon-management-system-five.vercel.app/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'send-sms',
          to: params.to,
          message: params.message,
          carrier: params.carrier
        })
      });

      if (response.ok) {
        const result = await response.json();
        return { success: true, messageId: result.sid };
      } else {
        throw new Error(`SMS API error: ${response.status}`);
      }
    } catch (error) {
      console.error('SMS sending failed:', error);
      return { success: false, error };
    }
  }

  // Send email using SendGrid
  async sendEmail(params: EmailParams): Promise<NotificationResult> {
    try {
      if (!this.sendGridApiKey) {
        console.warn('SendGrid API key not configured, falling back to console log');
        console.log(`📧 EMAIL TO: ${params.to}`);
        console.log(`📧 SUBJECT: ${params.subject}`);
        console.log(`📧 MESSAGE: ${params.message}`);
        return { success: true };
      }

      // For production, you would use the SendGrid SDK
      // const sgMail = require('@sendgrid/mail');
      // sgMail.setApiKey(this.sendGridApiKey);
      // const result = await sgMail.send({
      //   to: params.to,
      //   from: this.sendGridFromEmail,
      //   subject: params.subject,
      //   text: params.message,
      //   html: params.message.replace(/\n/g, '<br>')
      // });

      // Use Vercel serverless function
      const response = await fetch('https://salon-management-system-five.vercel.app/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'send-email',
          to: params.to,
          subject: params.subject,
          message: params.message
        })
      });

      if (response.ok) {
        const result = await response.json();
        return { success: true, messageId: result.messageId };
      } else {
        throw new Error(`Email API error: ${response.status}`);
      }
    } catch (error) {
      console.error('Email sending failed:', error);
      return { success: false, error };
    }
  }

  // Send work-in response notification based on customer preference
  async sendWorkInResponse(params: WorkInResponseParams): Promise<NotificationResult> {
    const { request, staffMember, status, responseNotes = "", services = [], selectedTime = "" } = params;
    const { customerInfo, requestedDate, requestedTime } = request;
    const serviceName = services.find((s) => s.id === request.serviceId)?.name || "Service";
    
    const formattedDate = new Date(requestedDate).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

    try {
      // Determine contact method and send appropriate notification
      if (customerInfo.preferredContact === "email" && customerInfo.email) {
        // Send email notification
        const subject = status === "approved" 
          ? `Work-In Request Approved - ${serviceName}`
          : `Work-In Request Update - ${serviceName}`;

        const timeDisplay = selectedTime ? 
          new Date(`2000-01-01T${selectedTime}:00`).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          }) : 
          (!requestedTime || requestedTime === "01:00" || requestedTime === "" ? "Flexible timing" : requestedTime);

        let message;
        if (status === "approved") {
          message = `Great news! ${staffMember.name} has approved your work-in request.

Service: ${serviceName}
Date: ${formattedDate}
Time: ${timeDisplay}

${responseNotes ? `Stylist Notes: ${responseNotes}` : ""}

Please call Twisted Roots to confirm your exact appointment time.

Thank you for choosing Twisted Roots!`;
        } else {
          message = `We received your work-in request for ${serviceName} on ${formattedDate}.

Unfortunately, ${staffMember.name} is not available for a work-in appointment on this date.

${responseNotes ? `Stylist Notes: ${responseNotes}` : ""}

Please try booking a regular appointment or request a different date.

Thank you for choosing Twisted Roots!`;
        }

        return await this.sendEmail({
          to: customerInfo.email,
          subject,
          message
        });
      } else {
        // Send SMS notification (default or preferred method)
        const timeDisplay = selectedTime ? 
          new Date(`2000-01-01T${selectedTime}:00`).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          }) : "flexible time";
        
        const smsMessage = status === "approved"
          ? `Twisted Roots: Your work-in request for ${serviceName} on ${formattedDate} at ${timeDisplay} has been APPROVED by ${staffMember.name}! ${responseNotes ? "Notes: " + responseNotes : ""} Please call to confirm.`
          : `Twisted Roots: Your work-in request for ${serviceName} on ${formattedDate} was not available. ${responseNotes ? "Notes: " + responseNotes : ""} Please try booking a regular appointment.`;

        return await this.sendSMS({
          to: customerInfo.phone,
          message: smsMessage
        });
      }
    } catch (error) {
      console.error("Failed to send work-in response notification:", error);
      return { success: false, error };
    }
  }

  // Send appointment cancellation notification
  async sendCancellationNotification(appointment: any, staffMember: any, service: any, client: any): Promise<NotificationResult> {
    const formattedDate = new Date(appointment.date).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

    const timeDisplay = new Date(`2000-01-01T${appointment.time}:00`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    try {
      if (client.preferredContact === "email" && client.email) {
        const subject = "Appointment Cancellation - Twisted Roots";
        const message = `Dear ${client.name},

Your appointment has been cancelled.

Service: ${service.name}
Date: ${formattedDate}
Time: ${timeDisplay}
Stylist: ${staffMember.name}

We apologize for any inconvenience. Please call us to reschedule.

Thank you for choosing Twisted Roots!`;

        return await this.sendEmail({
          to: client.email,
          subject,
          message
        });
      } else {
        const smsMessage = `Twisted Roots: Your ${service.name} appointment on ${formattedDate} at ${timeDisplay} with ${staffMember.name} has been cancelled. Please call to reschedule.`;

        return await this.sendSMS({
          to: client.phone,
          message: smsMessage
        });
      }
    } catch (error) {
      console.error("Failed to send cancellation notification:", error);
      return { success: false, error };
    }
  }
}

export const notificationService = new NotificationService(); 
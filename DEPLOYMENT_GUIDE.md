# 🚀 Deployment Guide: Free Notification System

## 📋 **Prerequisites**

Before deploying, ensure your web server has:
- ✅ **PHP 7.4+** installed
- ✅ **Mail server** configured (or use Gmail SMTP)
- ✅ **File permissions** set correctly

## 🗂️ **File Structure**

After deployment, your server should have this structure:
```
your-website.com/
├── public/
│   ├── api/
│   │   └── notifications.php          # API endpoint
│   └── test-notifications.html        # Test page
├── src/
│   └── lib/
│       └── freeNotificationService.php # Core service
└── [your React app files]
```

## 🔧 **Step-by-Step Deployment**

### **Step 1: Upload Files to Server**

1. **Upload the PHP files** to your web server:
   ```bash
   # Upload to your server via FTP/SFTP
   public/api/notifications.php
   src/lib/freeNotificationService.php
   test-notifications.html
   ```

2. **Set proper file permissions**:
   ```bash
   chmod 644 public/api/notifications.php
   chmod 644 src/lib/freeNotificationService.php
   chmod 644 test-notifications.html
   ```

### **Step 2: Configure Mail Server**

#### **Option A: Use Server's Built-in Mail (Recommended)**
Most hosting providers have mail configured. Test with:
```php
<?php
// Test mail function
$result = mail('test@example.com', 'Test', 'Test message');
echo $result ? 'Mail works!' : 'Mail failed';
?>
```

#### **Option B: Configure Gmail SMTP (More Reliable)**
1. **Enable 2FA** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account Settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. **Update the PHP service** to use Gmail:

```php
// In freeNotificationService.php, replace the sendEmail method:
public function sendEmail($to, $subject, $message) {
    // Install PHPMailer first: composer require phpmailer/phpmailer
    require_once 'PHPMailer/PHPMailer.php';
    require_once 'PHPMailer/SMTP.php';
    
    $mail = new PHPMailer\PHPMailer\PHPMailer();
    $mail->isSMTP();
    $mail->Host = 'smtp.gmail.com';
    $mail->SMTPAuth = true;
    $mail->Username = 'your-email@gmail.com';
    $mail->Password = 'your-app-password';
    $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = 587;
    
    $mail->setFrom('noreply@twistedroots.com', 'Twisted Roots');
    $mail->addAddress($to);
    $mail->Subject = $subject;
    $mail->Body = $message;
    $mail->isHTML(true);
    
    return $mail->send();
}
```

### **Step 3: Test the System**

1. **Open the test page**: `https://your-website.com/test-notifications.html`
2. **Test SMS** with your phone number:
   - Select your carrier
   - Send a test message
3. **Test Email** with your email address
4. **Verify delivery** on your phone/email

### **Step 4: Update React App**

Your React app is already configured to use the new API. Just ensure the API endpoint is correct:

```typescript
// In src/lib/notificationService.ts
const response = await fetch('/api/notifications.php?action=send-sms', {
  // ... rest of the code
});
```

If your API is on a different domain, update the URL:
```typescript
const response = await fetch('https://your-website.com/api/notifications.php?action=send-sms', {
  // ... rest of the code
});
```

## 🔍 **Troubleshooting**

### **SMS Not Working?**
1. **Check carrier**: Verify the customer's carrier is supported
2. **Test with your phone**: Use the test page to verify
3. **Check server logs**: Look for mail delivery errors
4. **Try different carrier**: Some carriers block email-to-SMS

### **Email Not Working?**
1. **Check mail server**: Verify PHP mail() is working
2. **Check spam folder**: Emails might be flagged as spam
3. **Use Gmail SMTP**: More reliable than server mail
4. **Check server logs**: Look for mail delivery errors

### **API Endpoint Not Found?**
1. **Check file path**: Ensure notifications.php is in the correct location
2. **Check permissions**: Files should be readable by web server
3. **Check URL**: Verify the API endpoint URL is correct
4. **Check server logs**: Look for PHP errors

### **CORS Errors?**
The PHP API includes CORS headers, but if you're still getting errors:
```php
// Add these headers to notifications.php if needed
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
```

## 📊 **Monitoring & Maintenance**

### **Daily Checks**
- ✅ Test SMS delivery with your phone
- ✅ Test email delivery with your email
- ✅ Check server error logs

### **Monthly Tasks**
- ✅ Review notification delivery rates
- ✅ Update carrier gateways if needed
- ✅ Check for new free SMS/email services

### **Performance Optimization**
- ✅ Monitor server load during peak times
- ✅ Consider caching for frequently used data
- ✅ Optimize database queries if needed

## 🛡️ **Security Considerations**

### **API Security**
- ✅ Validate all input data
- ✅ Rate limit API calls
- ✅ Use HTTPS for all communications
- ✅ Sanitize phone numbers and emails

### **Data Privacy**
- ✅ Don't log sensitive customer data
- ✅ Use secure headers in emails
- ✅ Follow GDPR/privacy regulations
- ✅ Implement data retention policies

## 💰 **Cost Optimization**

### **Current Costs**
- ✅ **SMS**: $0 (email-to-SMS gateways)
- ✅ **Email**: $0 (PHP mail() or Gmail SMTP)
- ✅ **Total**: $0/month

### **Scaling Options**
- **100-500 notifications/month**: Current setup is perfect
- **500-1000 notifications/month**: Consider Gmail SMTP for reliability
- **1000+ notifications/month**: Consider Mailgun ($35/month for 50k emails)

## 🎯 **Success Metrics**

Track these metrics to ensure the system is working:
- **SMS Delivery Rate**: Should be >90%
- **Email Delivery Rate**: Should be >95%
- **Response Time**: Should be <5 seconds
- **Error Rate**: Should be <5%

## 🆘 **Support**

If you encounter issues:
1. **Check the test page** first
2. **Review server error logs**
3. **Test with different carriers**
4. **Contact your hosting provider** for mail server issues

## 🚀 **Go Live Checklist**

Before going live with customers:
- ✅ [ ] Test SMS with all major carriers
- ✅ [ ] Test email delivery to major providers
- ✅ [ ] Verify API endpoints are accessible
- ✅ [ ] Test work-in response notifications
- ✅ [ ] Test appointment cancellation notifications
- ✅ [ ] Monitor for 24 hours
- ✅ [ ] Have backup contact methods ready

---

**🎉 Congratulations!** You now have a completely free notification system that will save you hundreds of dollars per year while providing reliable service to your customers. 
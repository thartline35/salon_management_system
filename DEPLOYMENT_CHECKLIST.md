# 🚀 Deployment Checklist

## Before Uploading to Server
- [ ] All PHP files are in place
- [ ] File permissions are set correctly
- [ ] Test files are ready

## Server Setup
- [ ] PHP 7.4+ is installed
- [ ] Mail server is configured
- [ ] Files are uploaded to correct locations
- [ ] Permissions are set (644 for files)

## Testing
- [ ] Test mail function with test-mail.php
- [ ] Test SMS with test-notifications.html
- [ ] Test email with test-notifications.html
- [ ] Verify API endpoints are accessible

## Integration
- [ ] React app is updated to use new API
- [ ] All notification calls are working
- [ ] Error handling is in place

## Go Live
- [ ] Test with real phone numbers
- [ ] Test with real email addresses
- [ ] Monitor for 24 hours
- [ ] Have backup contact methods ready

## Troubleshooting
- [ ] Check server error logs
- [ ] Verify carrier gateways
- [ ] Test with different carriers
- [ ] Contact hosting provider if needed

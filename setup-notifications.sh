#!/bin/bash

# 🚀 Free Notification System Setup Script
# For Twisted Roots Salon

echo "🎨 Setting up Free Notification System for Twisted Roots Salon"
echo "================================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the salon-management directory"
    exit 1
fi

print_status "Checking current directory structure..."

# Create necessary directories
print_status "Creating directory structure..."
mkdir -p public/api
mkdir -p src/lib

print_success "Directories created successfully"

# Check if PHP files exist
if [ ! -f "src/lib/freeNotificationService.php" ]; then
    print_error "freeNotificationService.php not found in src/lib/"
    print_status "Please ensure all PHP files are in place"
    exit 1
fi

if [ ! -f "public/api/notifications.php" ]; then
    print_error "notifications.php not found in public/api/"
    print_status "Please ensure all PHP files are in place"
    exit 1
fi

print_success "All PHP files found"

# Check file permissions
print_status "Setting file permissions..."
chmod 644 public/api/notifications.php
chmod 644 src/lib/freeNotificationService.php
chmod 644 test-notifications.html

print_success "File permissions set"

# Create a simple PHP test file
print_status "Creating PHP test file..."
cat > test-mail.php << 'EOF'
<?php
// Simple mail test
echo "Testing PHP mail function...\n";

$to = "test@example.com";
$subject = "Test from Twisted Roots";
$message = "This is a test email from the notification system.";
$headers = "From: noreply@twistedroots.com";

$result = mail($to, $subject, $message, $headers);

if ($result) {
    echo "✅ Mail function is working!\n";
} else {
    echo "❌ Mail function failed. You may need to configure your mail server.\n";
    echo "Consider using Gmail SMTP for better reliability.\n";
}
?>
EOF

print_success "Test file created: test-mail.php"

# Create deployment checklist
print_status "Creating deployment checklist..."
cat > DEPLOYMENT_CHECKLIST.md << 'EOF'
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
EOF

print_success "Deployment checklist created: DEPLOYMENT_CHECKLIST.md"

# Display next steps
echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "Next steps:"
echo "1. Upload files to your web server:"
echo "   - public/api/notifications.php"
echo "   - src/lib/freeNotificationService.php"
echo "   - test-notifications.html"
echo ""
echo "2. Test the system:"
echo "   - Run: php test-mail.php (if PHP is available locally)"
echo "   - Open: test-notifications.html in your browser"
echo ""
echo "3. Configure your React app:"
echo "   - Update API endpoints if needed"
echo "   - Test all notification features"
echo ""
echo "4. Deploy to production:"
echo "   - Follow DEPLOYMENT_CHECKLIST.md"
echo "   - Test with real phone numbers"
echo ""
echo "📚 Documentation:"
echo "- FREE_NOTIFICATION_OPTIONS.md (all free options)"
echo "- DEPLOYMENT_GUIDE.md (detailed setup guide)"
echo "- DEPLOYMENT_CHECKLIST.md (step-by-step checklist)"
echo ""
echo "💰 Cost Savings:"
echo "- Before: ~$180/year (Twilio + SendGrid)"
echo "- After: $0/year (completely free)"
echo ""
print_success "You're all set to save money while providing great service!" 
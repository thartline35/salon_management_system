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

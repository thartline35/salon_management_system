<?php
/**
 * Free Notification Service for Twisted Roots Salon
 * Uses email-to-SMS gateways and PHP mail() function
 * Completely free - no API costs!
 */

class FreeNotificationService {
    
    // Email-to-SMS carrier gateways
    private $smsGateways = [
        'verizon' => '@vtext.com',
        'att' => '@txt.att.net',
        'tmobile' => '@tmomail.net',
        'sprint' => '@messaging.sprintpcs.com',
        'boost' => '@myboostmobile.com',
        'cricket' => '@sms.cricketwireless.net',
        'metro' => '@mymetropcs.com',
        'uscellular' => '@email.uscc.net',
        'virgin' => '@vmobl.com'
    ];
    
    // Default carrier (most common)
    private $defaultCarrier = 'verizon';
    
    /**
     * Send SMS using email-to-SMS gateway
     */
    public function sendSMS($phone, $message, $carrier = null) {
        try {
            // Clean phone number
            $phone = $this->cleanPhoneNumber($phone);
            
            // Determine carrier
            $carrier = $carrier ?: $this->detectCarrier($phone);
            $gateway = $this->smsGateways[$carrier] ?? $this->smsGateways[$this->defaultCarrier];
            
            // Create email address
            $email = $phone . $gateway;
            
            // Send email (which becomes SMS)
            $headers = [
                'From: noreply@twistedroots.com',
                'Content-Type: text/plain; charset=UTF-8'
            ];
            
            $result = mail($email, '', $message, implode("\r\n", $headers));
            
            if ($result) {
                return [
                    'success' => true,
                    'message' => "SMS sent via {$carrier} gateway",
                    'carrier' => $carrier
                ];
            } else {
                return [
                    'success' => false,
                    'error' => 'Failed to send SMS via email gateway'
                ];
            }
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Send email using PHP mail() function
     */
    public function sendEmail($to, $subject, $message) {
        try {
            $headers = [
                'From: Twisted Roots <noreply@twistedroots.com>',
                'Reply-To: noreply@twistedroots.com',
                'Content-Type: text/html; charset=UTF-8',
                'X-Mailer: PHP/' . phpversion()
            ];
            
            $result = mail($to, $subject, $message, implode("\r\n", $headers));
            
            if ($result) {
                return [
                    'success' => true,
                    'message' => 'Email sent successfully'
                ];
            } else {
                return [
                    'success' => false,
                    'error' => 'Failed to send email'
                ];
            }
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Send work-in response notification
     */
    public function sendWorkInResponse($request, $staffMember, $status, $responseNotes = '', $services = [], $selectedTime = '') {
        $customerInfo = $request['customerInfo'];
        $serviceName = $this->findServiceName($request['serviceId'], $services);
        $formattedDate = date('l, F j', strtotime($request['requestedDate']));
        
        try {
            if ($customerInfo['preferredContact'] === 'email' && !empty($customerInfo['email'])) {
                // Send email notification
                $subject = $status === 'approved' 
                    ? "Work-In Request Approved - {$serviceName}"
                    : "Work-In Request Update - {$serviceName}";
                
                $timeDisplay = $this->formatTimeDisplay($selectedTime, $request['requestedTime']);
                
                $message = $this->createEmailMessage($status, $staffMember, $serviceName, $formattedDate, $timeDisplay, $responseNotes);
                
                return $this->sendEmail($customerInfo['email'], $subject, $message);
                
            } else {
                // Send SMS notification
                $timeDisplay = $selectedTime ? date('g:i A', strtotime("2000-01-01 {$selectedTime}:00")) : 'flexible time';
                
                $smsMessage = $status === 'approved'
                    ? "Twisted Roots: Your work-in request for {$serviceName} on {$formattedDate} at {$timeDisplay} has been APPROVED by {$staffMember['name']}! " . ($responseNotes ? "Notes: {$responseNotes} " : "") . "Please call to confirm."
                    : "Twisted Roots: Your work-in request for {$serviceName} on {$formattedDate} was not available. " . ($responseNotes ? "Notes: {$responseNotes} " : "") . "Please try booking a regular appointment.";
                
                return $this->sendSMS($customerInfo['phone'], $smsMessage);
            }
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to send work-in response notification: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Send appointment cancellation notification
     */
    public function sendCancellationNotification($appointment, $staffMember, $service, $client) {
        $formattedDate = date('l, F j', strtotime($appointment['date']));
        $formattedTime = date('g:i A', strtotime("2000-01-01 {$appointment['time']}:00"));
        
        try {
            if ($client['preferredContact'] === 'email' && !empty($client['email'])) {
                $subject = "Appointment Cancellation - Twisted Roots";
                $message = "Dear {$client['name']},\n\nYour appointment has been cancelled.\n\nService: {$service['name']}\nDate: {$formattedDate}\nTime: {$formattedTime}\nStylist: {$staffMember['name']}\n\nWe apologize for any inconvenience. Please call us to reschedule.\n\nThank you for choosing Twisted Roots!";
                
                return $this->sendEmail($client['email'], $subject, $message);
                
            } else {
                $smsMessage = "Twisted Roots: Your {$service['name']} appointment on {$formattedDate} at {$formattedTime} with {$staffMember['name']} has been cancelled. Please call to reschedule.";
                
                return $this->sendSMS($client['phone'], $smsMessage);
            }
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to send cancellation notification: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Clean phone number for SMS gateway
     */
    private function cleanPhoneNumber($phone) {
        // Remove all non-numeric characters
        $phone = preg_replace('/[^0-9]/', '', $phone);
        
        // Ensure it's 10 digits (US format)
        if (strlen($phone) === 11 && substr($phone, 0, 1) === '1') {
            $phone = substr($phone, 1);
        }
        
        return $phone;
    }
    
    /**
     * Detect carrier from phone number (basic implementation)
     * In production, you might want to use a carrier lookup service
     */
    private function detectCarrier($phone) {
        // This is a basic implementation
        // In production, you could use a carrier lookup API
        // For now, default to Verizon
        return $this->defaultCarrier;
    }
    
    /**
     * Find service name by ID
     */
    private function findServiceName($serviceId, $services) {
        foreach ($services as $service) {
            if ($service['id'] === $serviceId) {
                return $service['name'];
            }
        }
        return 'Service';
    }
    
    /**
     * Format time display
     */
    private function formatTimeDisplay($selectedTime, $requestedTime) {
        if ($selectedTime) {
            return date('g:i A', strtotime("2000-01-01 {$selectedTime}:00"));
        }
        
        if (empty($requestedTime) || $requestedTime === '01:00' || $requestedTime === '') {
            return 'Flexible timing';
        }
        
        return date('g:i A', strtotime("2000-01-01 {$requestedTime}:00"));
    }
    
    /**
     * Create email message
     */
    private function createEmailMessage($status, $staffMember, $serviceName, $formattedDate, $timeDisplay, $responseNotes) {
        if ($status === 'approved') {
            return "Great news! {$staffMember['name']} has approved your work-in request.\n\nService: {$serviceName}\nDate: {$formattedDate}\nTime: {$timeDisplay}\n\n" . ($responseNotes ? "Stylist Notes: {$responseNotes}\n\n" : "") . "Please call Twisted Roots to confirm your exact appointment time.\n\nThank you for choosing Twisted Roots!";
        } else {
            return "We received your work-in request for {$serviceName} on {$formattedDate}.\n\nUnfortunately, {$staffMember['name']} is not available for a work-in appointment on this date.\n\n" . ($responseNotes ? "Stylist Notes: {$responseNotes}\n\n" : "") . "Please try booking a regular appointment or request a different date.\n\nThank you for choosing Twisted Roots!";
        }
    }
}

// Usage example:
/*
$notificationService = new FreeNotificationService();

// Send SMS
$result = $notificationService->sendSMS('5551234567', 'Your appointment is confirmed!');

// Send Email
$result = $notificationService->sendEmail('customer@example.com', 'Appointment Confirmation', 'Your appointment is confirmed!');

// Send work-in response
$result = $notificationService->sendWorkInResponse($request, $staffMember, 'approved', 'Great timing!', $services, '14:00');
*/
?> 
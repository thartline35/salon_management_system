<?php
/**
 * Free Notification API for Twisted Roots Salon
 * Handles SMS and email notifications using free services
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Include the notification service
require_once '../../src/lib/freeNotificationService.php';

$notificationService = new FreeNotificationService();

// Get the request data
$input = json_decode(file_get_contents('php://input'), true);
$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'send-sms':
            if (!isset($input['to']) || !isset($input['message'])) {
                throw new Exception('Missing required fields: to, message');
            }
            
            $result = $notificationService->sendSMS(
                $input['to'],
                $input['message'],
                $input['carrier'] ?? null
            );
            break;
            
        case 'send-email':
            if (!isset($input['to']) || !isset($input['subject']) || !isset($input['message'])) {
                throw new Exception('Missing required fields: to, subject, message');
            }
            
            $result = $notificationService->sendEmail(
                $input['to'],
                $input['subject'],
                $input['message']
            );
            break;
            
        case 'send-work-in-response':
            if (!isset($input['request']) || !isset($input['staffMember']) || !isset($input['status'])) {
                throw new Exception('Missing required fields: request, staffMember, status');
            }
            
            $result = $notificationService->sendWorkInResponse(
                $input['request'],
                $input['staffMember'],
                $input['status'],
                $input['responseNotes'] ?? '',
                $input['services'] ?? [],
                $input['selectedTime'] ?? ''
            );
            break;
            
        case 'send-cancellation':
            if (!isset($input['appointment']) || !isset($input['staffMember']) || !isset($input['service']) || !isset($input['client'])) {
                throw new Exception('Missing required fields: appointment, staffMember, service, client');
            }
            
            $result = $notificationService->sendCancellationNotification(
                $input['appointment'],
                $input['staffMember'],
                $input['service'],
                $input['client']
            );
            break;
            
        default:
            throw new Exception('Invalid action. Use: send-sms, send-email, send-work-in-response, or send-cancellation');
    }
    
    echo json_encode($result);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?> 
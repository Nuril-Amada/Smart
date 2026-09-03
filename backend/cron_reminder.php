<?php
// CLI or Web Cron script for update overdue status and logging
require_once __DIR__ . '/controllers/ReminderController.php';

header('Content-Type: application/json');

$controller = new ReminderController();
$updatedCount = $controller->updateOverdueAdvances();

$response = [
    "status" => "success",
    "timestamp" => date('Y-m-d H:i:s'),
    "updated_overdue_count" => $updatedCount,
    "message" => "Cron reminder check completed successfully."
];

echo json_encode($response, JSON_PRETTY_PRINT);

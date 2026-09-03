<?php
// PHP Native Front Controller & Router for Apache 2.4

// ---- Konfigurasi Timezone & Error Log PHP ----
date_default_timezone_set('Asia/Jakarta');
ini_set('log_errors', 'On');
ini_set('error_log', 'C:/Apache24/logs/php_error.log');
ini_set('display_errors', 'Off');

// ---- Logger Request Navicash ----
function navicash_log(string $level, string $message): void {
    $timestamp = date('Y-m-d H:i:s');
    $line = "[$timestamp][$level] $message" . PHP_EOL;
    file_put_contents('C:/Apache24/logs/navicash_api.log', $line, FILE_APPEND | LOCK_EX);
}

// Set CORS headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Require all controllers
require_once __DIR__ . '/controllers/GlAccountController.php';
require_once __DIR__ . '/controllers/CostCenterController.php';
require_once __DIR__ . '/controllers/EmployeeController.php';
require_once __DIR__ . '/controllers/VendorController.php';
require_once __DIR__ . '/controllers/CheckController.php';
require_once __DIR__ . '/controllers/AdvanceController.php';
require_once __DIR__ . '/controllers/SettlementController.php';
require_once __DIR__ . '/controllers/DashboardController.php';
require_once __DIR__ . '/controllers/CashOpnameController.php';
require_once __DIR__ . '/controllers/UploadController.php';
require_once __DIR__ . '/controllers/ReminderController.php';
require_once __DIR__ . '/controllers/ExportController.php';

// Parse Request URI
$requestUri = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];

// Remove query string
if (($pos = strpos($requestUri, '?')) !== false) {
    $requestUri = substr($requestUri, 0, $pos);
}

// Strip base prefix if any (e.g., /navicash/api or /api)
$path = rtrim($requestUri, '/');
if (empty($path)) {
    $path = '/';
}

// Remove known base paths
$basePaths = ['/navicash/api', '/api'];
foreach ($basePaths as $base) {
    if (strpos($path, $base) === 0) {
        $path = substr($path, strlen($base));
        break;
    }
}
$path = '/' . ltrim($path, '/');

// Parse JSON Body for POST/PUT/PATCH if applicable
$inputBody = [];
$rawInput = file_get_contents('php://input');
if (!empty($rawInput)) {
    $jsonDecoded = json_decode($rawInput, true);
    if (is_array($jsonDecoded)) {
        $inputBody = $jsonDecoded;
    }
}

// Root Route
if ($path === '/' || $path === '') {
    header("Content-Type: application/json");
    echo json_encode(["application" => "REFCON API (PHP Native)", "status" => "Running", "version" => "1.0.0"]);
    exit;
}

// Helper to match dynamic regex routes e.g. /employees/{id}
function matchRoute(string $pattern, string $path, &$matches): bool {
    $regex = preg_replace('/\{([a-zA-Z0-9_]+)\}/', '([^/]+)', $pattern);
    $regex = '#^' . $regex . '$#';
    return (bool)preg_match($regex, $path, $matches);
}

// Router Logic
$response = null;
$isCustomOutput = false;

try {
    // -------------------------------------------------------------
    // GL ACCOUNT
    // -------------------------------------------------------------
    if (($path === '/gl-account' || $path === '/gl-account/') && $method === 'GET') {
        $controller = new GlAccountController();
        $response = $controller->getAll($_GET);
    } else if (($path === '/gl-account' || $path === '/gl-account/') && $method === 'POST') {
        $controller = new GlAccountController();
        $response = $controller->create($inputBody);
    } else if (matchRoute('/gl-account/{id}', $path, $m) && $method === 'DELETE') {
        $controller = new GlAccountController();
        $response = $controller->delete((int)$m[1]);

    // -------------------------------------------------------------
    // COST CENTER
    // -------------------------------------------------------------
    } else if (($path === '/cost-center' || $path === '/cost-center/') && $method === 'GET') {
        $controller = new CostCenterController();
        $response = $controller->getAll($_GET);
    } else if (($path === '/cost-center' || $path === '/cost-center/') && $method === 'POST') {
        $controller = new CostCenterController();
        $response = $controller->create($inputBody);
    } else if (matchRoute('/cost-center/{id}', $path, $m) && $method === 'DELETE') {
        $controller = new CostCenterController();
        $response = $controller->delete((int)$m[1]);

    // -------------------------------------------------------------
    // EMPLOYEES
    // -------------------------------------------------------------
    } else if (($path === '/employees' || $path === '/employees/') && $method === 'GET') {
        $controller = new EmployeeController();
        $response = $controller->getAll($_GET);
    } else if (($path === '/employees' || $path === '/employees/') && $method === 'POST') {
        $controller = new EmployeeController();
        $response = $controller->create($inputBody);
    } else if (matchRoute('/employees/{id}', $path, $m) && $method === 'PUT') {
        $controller = new EmployeeController();
        $response = $controller->update((int)$m[1], $inputBody);
    } else if (matchRoute('/employees/{id}', $path, $m) && $method === 'DELETE') {
        $controller = new EmployeeController();
        $response = $controller->delete((int)$m[1]);

    // -------------------------------------------------------------
    // VENDOR
    // -------------------------------------------------------------
    } else if ($path === '/vendor' && $method === 'GET') {
        $controller = new VendorController();
        $response = $controller->getAll($_GET);
    } else if ($path === '/vendor' && $method === 'POST') {
        $controller = new VendorController();
        $response = $controller->create($inputBody);
    } else if (matchRoute('/vendor/{id}', $path, $m) && $method === 'GET') {
        $controller = new VendorController();
        $response = $controller->getDetail((int)$m[1]);
    } else if (matchRoute('/vendor/{id}', $path, $m) && $method === 'DELETE') {
        $controller = new VendorController();
        $response = $controller->delete((int)$m[1]);

    // -------------------------------------------------------------
    // CHECK
    // -------------------------------------------------------------
    } else if ($path === '/check' && $method === 'GET') {
        $controller = new CheckController();
        $response = $controller->getChecks($_GET);
    } else if ($path === '/check' && $method === 'POST') {
        $controller = new CheckController();
        $response = $controller->createOrUpdate($inputBody);
    } else if (matchRoute('/check/{id}', $path, $m) && $method === 'DELETE') {
        $controller = new CheckController();
        $response = $controller->deleteCheck((int)$m[1]);

    // -------------------------------------------------------------
    // ADVANCE (PPC)
    // -------------------------------------------------------------
    } else if ($path === '/advance/summary' && $method === 'GET') {
        $controller = new AdvanceController();
        $response = $controller->summary($_GET);
    } else if ($path === '/advance/ppc' && $method === 'GET') {
        $controller = new AdvanceController();
        $response = $controller->getAll($_GET);
    } else if ($path === '/advance/ppc' && $method === 'POST') {
        $controller = new AdvanceController();
        $response = $controller->create($inputBody);
    } else if ($path === '/advance/search-users' && $method === 'GET') {
        $controller = new AdvanceController();
        $response = $controller->searchUsers($_GET);
    } else if ($path === '/advance/search-cost-centers' && $method === 'GET') {
        $controller = new AdvanceController();
        $response = $controller->searchCostCenters($_GET);
    } else if ($path === '/advance/generate-ppc-no' && $method === 'GET') {
        $controller = new AdvanceController();
        $response = $controller->previewPpcNumber($_GET);
    } else if (matchRoute('/advance/ppc/{id}/cancel', $path, $m) && $method === 'PUT') {
        $controller = new AdvanceController();
        $response = $controller->cancel((int)$m[1]);
    } else if (matchRoute('/advance/ppc/{id}/settlement', $path, $m) && $method === 'POST') {
        $controller = new AdvanceController();
        $response = $controller->createSettlement((int)$m[1], $inputBody);
    } else if (matchRoute('/advance/ppc/{id}/receipt', $path, $m) && $method === 'GET') {
        $controller = new AdvanceController();
        $response = $controller->getReceipt((int)$m[1]);
    } else if (matchRoute('/advance/ppc/{id}', $path, $m) && $method === 'GET') {
        $controller = new AdvanceController();
        $response = $controller->getDetail((int)$m[1]);
    } else if (matchRoute('/advance/ppc/{id}', $path, $m) && $method === 'PUT') {
        $controller = new AdvanceController();
        $response = $controller->update((int)$m[1], $inputBody);
    } else if (matchRoute('/advance/ppc/{id}', $path, $m) && $method === 'DELETE') {
        $controller = new AdvanceController();
        $response = $controller->delete((int)$m[1]);

    // -------------------------------------------------------------
    // SETTLEMENTS
    // -------------------------------------------------------------
    } else if ($path === '/settlements/summary' && $method === 'GET') {
        $controller = new SettlementController();
        $response = $controller->summary($_GET);
    } else if ($path === '/settlements/list' && $method === 'GET') {
        $controller = new SettlementController();
        $response = $controller->getList($_GET);
    } else if ($path === '/settlements/reimbursement' && $method === 'POST') {
        $controller = new SettlementController();
        $response = $controller->createReimbursement($inputBody);
    } else if ($path === '/settlements/search-users' && $method === 'GET') {
        $controller = new SettlementController();
        $response = $controller->searchUsers($_GET);
    } else if ($path === '/settlements/search-cost-centers' && $method === 'GET') {
        $controller = new SettlementController();
        $response = $controller->searchCostCenters($_GET);
    } else if (matchRoute('/settlements/reimbursement/{id}', $path, $m) && $method === 'PUT') {
        $controller = new SettlementController();
        $response = $controller->updateReimbursement((int)$m[1], $inputBody);
    } else if (matchRoute('/settlements/{id}/check', $path, $m) && $method === 'PATCH') {
        $controller = new SettlementController();
        $response = $controller->toggleCheck((int)$m[1]);
    } else if (matchRoute('/settlements/{id}', $path, $m) && $method === 'GET') {
        $controller = new SettlementController();
        $response = $controller->getDetail((int)$m[1]);
    } else if (matchRoute('/settlements/{id}', $path, $m) && $method === 'DELETE') {
        $controller = new SettlementController();
        $response = $controller->delete((int)$m[1]);

    // -------------------------------------------------------------
    // DASHBOARD
    // -------------------------------------------------------------
    } else if ($path === '/dashboard/summary' && $method === 'GET') {
        $controller = new DashboardController();
        $response = $controller->summary($_GET);
    } else if ($path === '/dashboard/gl-account' && $method === 'GET') {
        $controller = new DashboardController();
        $response = $controller->expensePerGl($_GET);
    } else if ($path === '/dashboard/cost-center' && $method === 'GET') {
        $controller = new DashboardController();
        $response = $controller->expensePerCostCenter($_GET);
    } else if ($path === '/dashboard/top-cost-center' && $method === 'GET') {
        $controller = new DashboardController();
        $response = $controller->topCostCenter($_GET);
    } else if ($path === '/dashboard/trend' && $method === 'GET') {
        $controller = new DashboardController();
        $response = $controller->trend($_GET);
    } else if ($path === '/dashboard/transactions' && $method === 'DELETE') {
        $controller = new DashboardController();
        $response = $controller->deleteTransactions($_GET);

    // -------------------------------------------------------------
    // CASH OPNAME
    // -------------------------------------------------------------
    } else if ($path === '/cash-opname/recap/settlement' && $method === 'GET') {
        $controller = new CashOpnameController();
        $response = $controller->getSettlementRecap($_GET);
    } else if ($path === '/cash-opname/recap/advance' && $method === 'GET') {
        $controller = new CashOpnameController();
        $response = $controller->getAdvanceRecap($_GET);
    } else if ($path === '/cash-opname/history' && $method === 'GET') {
        $controller = new CashOpnameController();
        $response = $controller->getHistory();
    } else if ($path === '/cash-opname' && $method === 'POST') {
        $controller = new CashOpnameController();
        $response = $controller->save($inputBody);
    } else if (matchRoute('/cash-opname/{id}', $path, $m) && $method === 'PUT') {
        $controller = new CashOpnameController();
        $response = $controller->update((int)$m[1], $inputBody);
    } else if (matchRoute('/cash-opname/{id}', $path, $m) && $method === 'DELETE') {
        $controller = new CashOpnameController();
        $response = $controller->delete((int)$m[1]);

    // -------------------------------------------------------------
    // UPLOAD & ETL
    // -------------------------------------------------------------
    } else if ($path === '/dashboard/import-sap' && $method === 'POST') {
        $controller = new UploadController();
        $response = $controller->importSap($_GET, $_FILES);

    // -------------------------------------------------------------
    // REMINDERS
    // -------------------------------------------------------------
    } else if ($path === '/reminders/generate-eml' && $method === 'GET') {
        $controller = new ReminderController();
        $controller->generateEml($_GET);
        $isCustomOutput = true;
    } else if ($path === '/reminders/overdue-list' && $method === 'GET') {
        $controller = new ReminderController();
        $response = $controller->overdueList();
    } else if ($path === '/reminders/mark-sent' && $method === 'POST') {
        $controller = new ReminderController();
        // Frontend mengirim employee_name sebagai query param, bukan JSON body
        $mergedData = array_merge($_GET, $inputBody);
        $response = $controller->markSent($mergedData);
    } else if (matchRoute('/reminders/dismiss/{id}', $path, $m) && $method === 'DELETE') {
        $controller = new ReminderController();
        $response = $controller->dismiss((int)$m[1]);

    // -------------------------------------------------------------
    // EXPORTS
    // -------------------------------------------------------------
    } else if ($path === '/export/excel' && $method === 'GET') {
        $controller = new ExportController();
        $controller->exportExcel($_GET);
        $isCustomOutput = true;
    } else if ($path === '/export/pdf' && $method === 'GET') {
        $controller = new ExportController();
        $controller->exportPdf($_GET);
        $isCustomOutput = true;
    } else if ($path === '/export/settlement' && $method === 'GET') {
        $controller = new ExportController();
        $controller->exportSettlement($_GET);
        $isCustomOutput = true;
    } else if ($path === '/export/advance' && $method === 'GET') {
        $controller = new ExportController();
        $controller->exportAdvance($_GET);
        $isCustomOutput = true;
    } else if ($path === '/export/check' && $method === 'GET') {
        $controller = new ExportController();
        $controller->exportCheck($_GET);
        $isCustomOutput = true;
    } else if ($path === '/export/vendor' && $method === 'GET') {
        $controller = new ExportController();
        $controller->exportVendor($_GET);
        $isCustomOutput = true;

    } else {
        http_response_code(404);
        $response = ["detail" => "Endpoint {$method} {$path} not found."];
        navicash_log("WARN", "$method $path -> 404 Not Found");
    }
} catch (Exception $e) {
    http_response_code(500);
    $response = ["detail" => "Internal Server Error: " . $e->getMessage()];
    navicash_log("ERROR", "$method $path -> 500: " . $e->getMessage());
}

if (!$isCustomOutput && $response !== null) {
    header("Content-Type: application/json; charset=utf-8");
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $code = http_response_code();
    navicash_log("INFO", "$method $path -> $code");
}

<?php
// Function to load .env file into getenv() / $_ENV
function loadEnv($path) {
    if (!file_exists($path)) {
        return;
    }
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line) || strpos($line, '#') === 0) {
            continue;
        }
        list($name, $value) = explode('=', $line, 2) + [NULL, NULL];
        if ($name !== NULL && $value !== NULL) {
            $name = trim($name);
            $value = trim($value);
            putenv("$name=$value");
            $_ENV[$name] = $value;
            $_SERVER[$name] = $value;
        }
    }
}

// Load backend/.env
loadEnv(__DIR__ . '/../.env');

return [
    'db_connection' => getenv('DB_CONNECTION') ?: 'sqlsrv',
    'db_host'       => getenv('DB_HOST') ?: '127.0.0.1',
    'db_port'       => getenv('DB_PORT') ?: '60963',
    'db_name'       => getenv('DB_NAME') ?: 'navicash_db',
    'db_user'       => getenv('DB_USER') ?: 'navicash_user',
    'db_password'   => getenv('DB_PASSWORD') ?: 'navicash123',
    'app_host'      => getenv('APP_HOST') ?: '0.0.0.0',
    'app_port'      => getenv('APP_PORT') ?: 8000,
];

<?php
class Database {
    private static ?PDO $instance = null;

    public static function getConnection(): PDO {
        if (self::$instance === null) {
            $config = require __DIR__ . '/config.php';

            $driver   = strtolower($config['db_connection']);
            $host     = $config['db_host'];
            $port     = $config['db_port'];
            $dbname   = $config['db_name'];
            $user     = $config['db_user'];
            $password = $config['db_password'];

            try {
                if ($driver === 'sqlsrv') {
                    // Try sqlsrv extension first, fallback to dblib/odbc if sqlsrv driver not installed
                    if (extension_loaded('pdo_sqlsrv')) {
                        $dsn = "sqlsrv:Server={$host},{$port};Database={$dbname};TrustServerCertificate=true";
                        self::$instance = new PDO($dsn, $user, $password);
                    } else if (extension_loaded('pdo_dblib')) {
                        $dsn = "dblib:host={$host}:{$port};dbname={$dbname}";
                        self::$instance = new PDO($dsn, $user, $password);
                    } else {
                        // Fallback ODBC DSN for SQL Server
                        $dsn = "odbc:Driver={ODBC Driver 17 for SQL Server};Server={$host},{$port};Database={$dbname};TrustServerCertificate=yes;";
                        self::$instance = new PDO($dsn, $user, $password);
                    }
                } else if ($driver === 'mysql') {
                    $dsn = "mysql:host={$host};port={$port};dbname={$dbname};charset=utf8mb4";
                    self::$instance = new PDO($dsn, $user, $password, [
                        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
                    ]);
                } else {
                    // Default generic DSN
                    $dsn = "{$driver}:host={$host};port={$port};dbname={$dbname}";
                    self::$instance = new PDO($dsn, $user, $password);
                }

                self::$instance->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                self::$instance->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode([
                    "error" => "Database connection failed",
                    "message" => $e->getMessage()
                ]);
                exit;
            }
        }
        return self::$instance;
    }
}

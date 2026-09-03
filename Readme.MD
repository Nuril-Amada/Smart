# Navicash Backend

Backend dibangun menggunakan **PHP** dan **SQL Server (Express Edition)** yang dijalan di atas web server **Apache24**.
Sistem ini menangani proses import data SAP, monitoring petty cash, advance, settlement, reminder email, serta pencetakan check.

---

## Tech Stack

- PHP 8.x
- Apache 2.4 (Apache24)
- SQL Server Express Edition (`SQLEXPRESS`)
- Microsoft ODBC Driver 17 for SQL Server
- pdo_sqlsrv / sqlsrv Extension
- Composer
- PHPMailer (untuk Reminder Email)
- PhpSpreadsheet (untuk Export/Import Excel)
- FPDF / TCPDF (untuk PDF Export)

---

## Project Structure

```text
backend/
│
├── api/                    # REST API Endpoint (PHP Scripts)
│   ├── advance/
│   ├── check/
│   ├── dashboard/
│   ├── employee/
│   ├── export/
│   ├── gl_account/
│   ├── reminder/
│   ├── settlement/
│   ├── upload/
│   └── vendor/
│
├── config/
│   ├── database.php        # Koneksi SQL Server (PDO/sqlsrv)
│   └── env.php             # Reader Environment Variable
│
├── etl/                    # Modular Import & Processing Data SAP
│   ├── readers/
│   ├── transformers/
│   └── loaders/
│
├── services/               # Cron Jobs & Background Tasks
│   └── cron_reminder.php   # Script Reminder & Overdue Checker
│
├── uploads/                # Temporary uploaded files
│
├── vendor/                 # Dependency Composer
├── composer.json
├── .htaccess               # Apache Rewrite Rules / Routing
└── .env

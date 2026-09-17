# Navicash - Finance & Petty Cash Management System

Aplikasi manajemen keuangan internal untuk pengelolaan **Petty Cash (Kas Kecil)**, **Advance Request (Uang Muka)**, **Settlement (Pertanggungjawaban)**, **Cash Opname**, **Rekonsiliasi Transaksi SAP/Perak**, serta **Pencetakan Cek Bank (Sinarmas, dll.)**.

---

## 🛠️ Tech Stack & Requirements

### Software & Server Requirements
- **Web Server**: Apache 2.4 (Wajib modul `mod_rewrite` aktif untuk `.htaccess` API routing).
- **PHP Runtime**: PHP 8.0 - 8.3 (Konfigurasi `file_uploads = On`, `upload_max_filesize = 10M`).
- **Database Server**: Microsoft SQL Server 2016+ / SQL Server Express (misal: `SQLEXPRESS`).
- **ODBC Driver**: Microsoft ODBC Driver 17 or 18 for SQL Server (Komponen OS Windows/Linux).
- **Node.js**: Node.js v18+ & NPM (Untuk proses kompilasi/build Frontend React + Vite).

### PHP Extensions Wajib
1. `pdo` & `pdo_sqlsrv` (atau `sqlsrv`) : Koneksi utama PHP ke Microsoft SQL Server.
2. `zip` (`ZipArchive`) : Diperlukan oleh `SimpleXlsxWriter` & `SimpleXlsxReader` untuk mengompres & membaca file Excel `.xlsx`.
3. `xml` / `SimpleXML` : Untuk memproses data XML di dalam struktur file Excel `.xlsx`.
4. `json` : Untuk serialisasi data JSON pada REST API dan penyimpanan JSON di tabel `cash_opnames`.
5. `mbstring` & `fileinfo` : Untuk manipulasi karakter teks & pemeriksaan MIME-type file unggahan.

### Frontend Stack
- **Framework & Tooling**: React 18, Vite
- **UI & Iconography**: Tailwind CSS, Lucide React
- **HTTP Client**: Axios

---

## 📁 Struktur Direktori Proyek

```text
Finance/
├── backend/                  # REST API Backend (PHP)
│   ├── config/               # database.php & config.php (Koneksi SQL Server & loader .env)
│   ├── controllers/          # Controller REST API (Advance, Settlement, Opname, Check, dll.)
│   ├── services/             # Helper & Services (ETLService, Excel, PDF, PpcHelper)
│   ├── uploads/              # Folder penampung temporary upload file
│   ├── cron_reminder.php     # Script cron/CLI penanda overdue & reminder
│   ├── index.php             # Main Entry Point & API Router
│   ├── .htaccess             # Apache URL rewrite rules
│   ├── .env.example          # Template environment variable backend
│   └── .env                  # Environment variable backend (Local/Prod)
│
├── frontend/                 # Application Frontend (React + Vite)
│   ├── public/               # Asset statis
│   ├── src/                  # Components, Pages, Services, & Styles
│   ├── dist/                 # Output hasil build (npm run build)
│   ├── .env.example          # Template environment variable frontend
│   └── .env                  # Environment variable frontend
│
└── navicash_db_export.sql    # Script SQL lengkap (DDL Table + Data Seeders)
```

---

## 🚀 Panduan Setup Environment & Development Lokal

### 1. Setup Database (SQL Server)
1. Buka **SQL Server Management Studio (SSMS)**.
2. Buat database baru bernama `navicash_db`:
   ```sql
   CREATE DATABASE navicash_db;
   ```
3. Buka dan jalankan script SQL [`navicash_db_export.sql`] di dalam SSMS untuk membuat seluruh tabel dan mengisikan data awal.

### 2. Setup Backend (PHP)
1. Masuk ke direktori backend:
   ```bash
   cd backend
   ```
2. Salin file `.env.example` menjadi `.env`:
   ```bash
   copy .env.example .env
   ```
3. Sesuaikan konfigurasi di dalam file `.env`:
   ```env
   DB_CONNECTION=sqlsrv
   DB_HOST=127.0.0.1
   DB_PORT=1433   # Sesuaikan port SQL Server Anda (default: 1433)
   DB_NAME=navicash_db
   DB_USER=navicash_user
   DB_PASSWORD=navicash123
   ```
4. Jalankan server development PHP:
   ```bash
   php -S 127.0.0.1:8000
   ```

### 3. Setup Frontend (React + Vite)
1. Masuk ke direktori frontend:
   ```bash
   cd frontend
   ```
2. Install dependency Node.js:
   ```bash
   npm install
   ```
3. Salin file `.env.example` menjadi `.env`:
   ```bash
   copy .env.example .env
   ```
4. Isi URL Backend pada file `.env`:
   ```env
   VITE_API_BASE_URL=http://localhost:8000
   ```
5. Jalankan server development React:
   ```bash
   npm run dev
   ```
   Aplikasi dapat diakses via browser di `http://localhost:5173`.

---

## 🌐 Panduan Deployment ke Server Produksi

Jika proyek hendak diserahkan ke Tim IT / DevOps untuk di-deploy ke server produksi:

### 1. Import Database ke SQL Server Produksi
Jalankan script `navicash_db_export.sql` di server database produksi. Pastikan user database produksi diberikan role `db_datareader`, `db_datawriter`, dan `db_ddladmin` pada database `navicash_db`.

### 2. Deploy Backend (Apache Web Server)
1. Copy seluruh isi folder `backend/` ke direktori root Apache (contoh: `C:\Apache24\htdocs\navicash\backend` atau `/var/www/html/navicash/backend`).
2. Buat file `.env` di folder backend produksi dan sesuaikan credentials database produksi.
3. Pastikan modul Apache `mod_rewrite` diaktifkan agar routing `.htaccess` berjalan.
4. Berikan akses izin menulis (*Write Permission*) pada folder `backend/uploads/`.

### 3. Build & Deploy Frontend
1. Pada lingkungan build, jalankan kompilasi aset frontend:
   ```bash
   cd frontend
   npm install
   npm run build
   ```
2. Copy seluruh isi folder `frontend/dist/` ke direktori web server produksi yang dituju.

### 4. Setup Cron Job Pengingat Overdue (Background Task)
Jadwalkan eksekusi script `cron_reminder.php` secara berkala (misal setiap hari pukul 08.00 Pagi):
- **Windows Task Scheduler**: Jalankan `php.exe C:\Apache24\htdocs\navicash\backend\cron_reminder.php`
- **Linux Crontab**:
  ```bash
  0 8 * * * /usr/bin/php /var/www/html/navicash/backend/cron_reminder.php > /dev/null 2>&1
  ```

---

## 📄 Lisensi & Hak Cipta
Hak Cipta © 2026 Internal Finance Team & Development Team Navicash.

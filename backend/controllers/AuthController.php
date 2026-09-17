<?php
require_once __DIR__ . '/../config/database.php';

class AuthController {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
        $this->ensureUsersTableExists();
    }

    /**
     * Memastikan tabel users sudah otomatis ada di SQL Server
     */
    private function ensureUsersTableExists() {
        try {
            // Cek apakah tabel users sudah ada
            $checkStmt = $this->db->query("
                SELECT 1 FROM sys.objects 
                WHERE object_id = OBJECT_ID(N'[dbo].[users]') AND type in (N'U')
            ");
            $exists = $checkStmt ? $checkStmt->fetchColumn() : false;

            if (!$exists) {
                // 1. Buat tabel users
                $createSql = "
                    CREATE TABLE [dbo].[users] (
                        [id] INT IDENTITY(1,1) PRIMARY KEY,
                        [username] VARCHAR(50) NOT NULL UNIQUE,
                        [password] VARCHAR(255) NOT NULL,
                        [nama_lengkap] VARCHAR(100) NOT NULL,
                        [role] VARCHAR(20) DEFAULT 'user',
                        [created_at] DATETIME DEFAULT GETDATE()
                    )
                ";
                $this->db->exec($createSql);

                // 2. Buat akun admin default
                $hAdmin = password_hash('juli012026', PASSWORD_BCRYPT);
                $hHera  = password_hash('finance_2026', PASSWORD_BCRYPT);

                $insertStmt = $this->db->prepare("
                    INSERT INTO [dbo].[users] ([username], [password], [nama_lengkap], [role])
                    VALUES (:username, :pass, :nama, :role)
                ");
                $insertStmt->execute([':username' => 'admin', ':pass' => $hAdmin, ':nama' => 'Administrator Navicash', ':role' => 'admin']);
                $insertStmt->execute([':username' => 'HERA CHRISTIANTI', ':pass' => $hHera, ':nama' => 'HERA CHRISTIANTI', ':role' => 'admin']);
            } else {
                // Pastikan kolom role ada
                $checkRole = $this->db->query("
                    SELECT 1 FROM sys.columns 
                    WHERE object_id = OBJECT_ID(N'[dbo].[users]') AND name = N'role'
                ");
                if (!$checkRole || !$checkRole->fetchColumn()) {
                    $this->db->exec("ALTER TABLE [dbo].[users] ADD [role] VARCHAR(20) DEFAULT 'user'");
                }
            }
        } catch (Exception $e) {
            error_log("ensureUsersTableExists error: " . $e->getMessage());
        }
    }

    /**
     * Handle user login
     */
    public function login($body) {
        $username = isset($body['username']) ? trim($body['username']) : '';
        $password = isset($body['password']) ? trim($body['password']) : '';

        if (empty($username) || empty($password)) {
            http_response_code(400);
            return ["detail" => "Username dan Password wajib diisi."];
        }

        $this->ensureUsersTableExists();

        try {
            $stmt = $this->db->prepare("
                SELECT id, username, password, 
                       ISNULL(nama_lengkap, username) AS nama_lengkap, 
                       ISNULL(role, 'admin') AS role 
                FROM users 
                WHERE LOWER(username) = LOWER(:username)
            ");
            $stmt->execute([':username' => $username]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            $user = false;
        }

        // Fallback untuk admin default jika query db gagal
        if (!$user && strtolower($username) === 'admin' && ($password === 'juli012026' || $password === 'admin123')) {
            $user = [
                'id' => 1,
                'username' => 'admin',
                'password' => password_hash('juli012026', PASSWORD_BCRYPT),
                'nama_lengkap' => 'Administrator Navicash',
                'role' => 'admin'
            ];
        }

        if (!$user || !password_verify($password, $user['password'])) {
            http_response_code(401);
            return ["detail" => "Username atau Password yang Anda masukkan salah."];
        }

        unset($user['password']);

        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        $_SESSION['user'] = $user;

        return [
            "message" => "Login berhasil.",
            "user" => [
                "id" => (int)$user['id'],
                "username" => $user['username'],
                "nama_lengkap" => $user['nama_lengkap'],
                "role" => strtolower($user['role'])
            ],
            "token" => base64_encode(json_encode([
                "id" => $user['id'],
                "username" => $user['username'],
                "role" => strtolower($user['role']),
                "exp" => time() + 86400
            ]))
        ];
    }

    /**
     * Handle public user registration (Default role: 'user')
     */
    public function register($body) {
        $username = isset($body['username']) ? trim($body['username']) : '';
        $password = isset($body['password']) ? trim($body['password']) : '';
        $namaLengkap = isset($body['nama_lengkap']) ? trim($body['nama_lengkap']) : '';

        if (empty($username) || empty($password) || empty($namaLengkap)) {
            http_response_code(400);
            return ["detail" => "Username, Nama Lengkap, dan Password wajib diisi."];
        }

        if (strlen($password) < 4) {
            http_response_code(400);
            return ["detail" => "Password minimal 4 karakter."];
        }

        $this->ensureUsersTableExists();

        // Cek username unik
        $checkStmt = $this->db->prepare("SELECT 1 FROM users WHERE LOWER(username) = LOWER(:u)");
        $checkStmt->execute([':u' => $username]);
        if ($checkStmt->fetchColumn()) {
            http_response_code(400);
            return ["detail" => "Username '$username' sudah terdaftar. Silakan gunakan username lain."];
        }

        $hashedPass = password_hash($password, PASSWORD_BCRYPT);
        $insertStmt = $this->db->prepare("
            INSERT INTO users (username, password, nama_lengkap, role, created_at)
            VALUES (:u, :p, :n, 'user', GETDATE())
        ");
        $insertStmt->execute([
            ':u' => $username,
            ':p' => $hashedPass,
            ':n' => $namaLengkap
        ]);

        return [
            "message" => "Pendaftaran akun berhasil! Silakan login menggunakan username dan password Anda.",
            "username" => $username
        ];
    }

    /**
     * Self-service Change Password for logged-in user
     */
    public function changePassword($body) {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        $userId = isset($_SESSION['user']['id']) ? $_SESSION['user']['id'] : null;
        $sessionUsername = isset($_SESSION['user']['username']) ? $_SESSION['user']['username'] : null;

        $oldPassword = isset($body['old_password']) ? trim($body['old_password']) : '';
        $newPassword = isset($body['new_password']) ? trim($body['new_password']) : '';

        if (empty($oldPassword) || empty($newPassword)) {
            http_response_code(400);
            return ["detail" => "Password lama dan Password baru wajib diisi."];
        }

        if (strlen($newPassword) < 4) {
            http_response_code(400);
            return ["detail" => "Password baru minimal 4 karakter."];
        }

        if (!$sessionUsername && isset($body['username'])) {
            $sessionUsername = trim($body['username']);
        }

        if (!$sessionUsername) {
            http_response_code(401);
            return ["detail" => "Sesi login tidak valid. Silakan login kembali."];
        }

        $stmt = $this->db->prepare("SELECT id, password FROM users WHERE LOWER(username) = LOWER(:u)");
        $stmt->execute([':u' => $sessionUsername]);
        $userRow = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$userRow || !password_verify($oldPassword, $userRow['password'])) {
            http_response_code(400);
            return ["detail" => "Password lama yang Anda masukkan tidak sesuai."];
        }

        $newHashed = password_hash($newPassword, PASSWORD_BCRYPT);
        $upd = $this->db->prepare("UPDATE users SET password = :p WHERE id = :id");
        $upd->execute([':p' => $newHashed, ':id' => $userRow['id']]);

        return ["message" => "Password berhasil diperbarui!"];
    }

    /**
     * Admin: Get all users
     */
    public function getAllUsers() {
        $stmt = $this->db->query("
            SELECT id, username, nama_lengkap, ISNULL(role, 'user') AS role, created_at 
            FROM users 
            ORDER BY id ASC
        ");
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($users as &$u) {
            $u['id'] = (int)$u['id'];
            $u['role'] = strtolower($u['role']);
        }
        return $users;
    }

    /**
     * Admin: Create a new user with specific role
     */
    public function createUser($body) {
        $username = isset($body['username']) ? trim($body['username']) : '';
        $password = isset($body['password']) ? trim($body['password']) : '';
        $namaLengkap = isset($body['nama_lengkap']) ? trim($body['nama_lengkap']) : '';
        $role = isset($body['role']) ? strtolower(trim($body['role'])) : 'user';

        if (!in_array($role, ['admin', 'user'])) {
            $role = 'user';
        }

        if (empty($username) || empty($password) || empty($namaLengkap)) {
            http_response_code(400);
            return ["detail" => "Username, Nama Lengkap, dan Password wajib diisi."];
        }

        $checkStmt = $this->db->prepare("SELECT 1 FROM users WHERE LOWER(username) = LOWER(:u)");
        $checkStmt->execute([':u' => $username]);
        if ($checkStmt->fetchColumn()) {
            http_response_code(400);
            return ["detail" => "Username '$username' sudah terdaftar."];
        }

        $hashedPass = password_hash($password, PASSWORD_BCRYPT);
        $insertStmt = $this->db->prepare("
            INSERT INTO users (username, password, nama_lengkap, role, created_at)
            VALUES (:u, :p, :n, :r, GETDATE())
        ");
        $insertStmt->execute([
            ':u' => $username,
            ':p' => $hashedPass,
            ':n' => $namaLengkap,
            ':r' => $role
        ]);

        return ["message" => "User baru '$username' ($role) berhasil ditambahkan."];
    }

    /**
     * Admin: Update user role, name, or password
     */
    public function updateUser($id, $body) {
        $stmt = $this->db->prepare("SELECT id, username FROM users WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $userRow = $stmt->fetch();

        if (!$userRow) {
            http_response_code(404);
            return ["detail" => "User tidak ditemukan."];
        }

        $namaLengkap = isset($body['nama_lengkap']) ? trim($body['nama_lengkap']) : '';
        $role = isset($body['role']) ? strtolower(trim($body['role'])) : '';
        $newPassword = isset($body['password']) ? trim($body['password']) : '';

        $updates = [];
        $params = [':id' => $id];

        if (!empty($namaLengkap)) {
            $updates[] = "nama_lengkap = :nama";
            $params[':nama'] = $namaLengkap;
        }

        if (!empty($role) && in_array($role, ['admin', 'user'])) {
            $updates[] = "role = :role";
            $params[':role'] = $role;
        }

        if (!empty($newPassword)) {
            if (strlen($newPassword) < 4) {
                http_response_code(400);
                return ["detail" => "Password minimal 4 karakter."];
            }
            $updates[] = "password = :pass";
            $params[':pass'] = password_hash($newPassword, PASSWORD_BCRYPT);
        }

        if (empty($updates)) {
            return ["message" => "Tidak ada perubahan data."];
        }

        $sql = "UPDATE users SET " . implode(", ", $updates) . " WHERE id = :id";
        $updStmt = $this->db->prepare($sql);
        $updStmt->execute($params);

        return ["message" => "Data user berhasil diperbarui."];
    }

    /**
     * Admin: Delete user
     */
    public function deleteUser($id) {
        $stmt = $this->db->prepare("SELECT id, username FROM users WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $userRow = $stmt->fetch();

        if (!$userRow) {
            http_response_code(404);
            return ["detail" => "User tidak ditemukan."];
        }

        // Jangan izinkan hapus admin utama 'admin'
        if (strtolower($userRow['username']) === 'admin') {
            http_response_code(400);
            return ["detail" => "Akun admin utama tidak dapat dihapus."];
        }

        $delStmt = $this->db->prepare("DELETE FROM users WHERE id = :id");
        $delStmt->execute([':id' => $id]);

        return ["message" => "User '{$userRow['username']}' berhasil dihapus."];
    }

    /**
     * Handle user logout
     */
    public function logout() {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        unset($_SESSION['user']);
        session_destroy();

        return ["message" => "Logout berhasil."];
    }

    /**
     * Get current logged-in user profile
     */
    public function me() {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        if (isset($_SESSION['user'])) {
            return [
                "authenticated" => true,
                "user" => $_SESSION['user']
            ];
        }

        return [
            "authenticated" => false,
            "user" => null
        ];
    }
}

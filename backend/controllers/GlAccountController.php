<?php
require_once __DIR__ . '/../config/database.php';

class GlAccountController {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    public function getAll($queryParams) {
        $search = isset($queryParams['search']) ? trim($queryParams['search']) : null;

        if ($search !== null && $search !== '') {
            $stmt = $this->db->prepare("
                SELECT id, gl_account, nama_gl_account, created_at, updated_at 
                FROM gl_accounts 
                WHERE LOWER(gl_account) LIKE LOWER(:search) 
                   OR LOWER(nama_gl_account) LIKE LOWER(:search)
                ORDER BY gl_account ASC
            ");
            $stmt->execute([':search' => '%' . $search . '%']);
        } else {
            $stmt = $this->db->prepare("
                SELECT id, gl_account, nama_gl_account, created_at, updated_at 
                FROM gl_accounts 
                ORDER BY gl_account ASC
            ");
            $stmt->execute();
        }

        $result = $stmt->fetchAll();
        return $result;
    }

    public function create($body) {
        $glAccount = isset($body['gl_account']) ? trim($body['gl_account']) : '';
        $namaGlAccount = isset($body['nama_gl_account']) ? trim($body['nama_gl_account']) : '';

        if (empty($glAccount) || empty($namaGlAccount)) {
            http_response_code(400);
            return ["detail" => "Nomor dan Nama GL Account wajib diisi."];
        }

        // Check duplicate
        $checkStmt = $this->db->prepare("
            SELECT id FROM gl_accounts WHERE LOWER(gl_account) = LOWER(:gl)
        ");
        $checkStmt->execute([':gl' => $glAccount]);
        if ($checkStmt->fetch()) {
            http_response_code(400);
            return ["detail" => "GL Account sudah ada."];
        }

        $formattedName = ucwords(strtolower($namaGlAccount));

        $stmt = $this->db->prepare("
            INSERT INTO gl_accounts (gl_account, nama_gl_account, created_at, updated_at) 
            VALUES (:gl_account, :nama_gl_account, GETDATE(), GETDATE())
        ");
        $stmt->execute([
            ':gl_account' => $glAccount,
            ':nama_gl_account' => $formattedName
        ]);

        $id = $this->db->lastInsertId();

        // Fetch inserted record
        $fetchStmt = $this->db->prepare("SELECT id, gl_account, nama_gl_account, created_at, updated_at FROM gl_accounts WHERE id = :id");
        $fetchStmt->execute([':id' => $id ?: $glAccount]);
        $inserted = $fetchStmt->fetch() ?: [
            "id" => (int)$id,
            "gl_account" => $glAccount,
            "nama_gl_account" => $formattedName
        ];

        return [
            "message" => "GL Account berhasil ditambahkan.",
            "data" => $inserted
        ];
    }

    public function delete($id) {
        $checkStmt = $this->db->prepare("SELECT id FROM gl_accounts WHERE id = :id");
        $checkStmt->execute([':id' => $id]);
        if (!$checkStmt->fetch()) {
            http_response_code(404);
            return ["detail" => "GL Account tidak ditemukan."];
        }

        $stmt = $this->db->prepare("DELETE FROM gl_accounts WHERE id = :id");
        $stmt->execute([':id' => $id]);

        return ["message" => "GL Account berhasil dihapus."];
    }
}

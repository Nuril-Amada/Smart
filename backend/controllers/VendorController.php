<?php
require_once __DIR__ . '/../config/database.php';

class VendorController {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    public function getAll($queryParams) {
        $search = isset($queryParams['search']) ? trim($queryParams['search']) : '';

        if ($search !== '') {
            $stmt = $this->db->prepare("
                SELECT id, vendor_name, bank_name, bank_account_name, bank_account_no, created_at, updated_at 
                FROM vendors 
                WHERE LOWER(vendor_name) LIKE LOWER(:search)
                ORDER BY vendor_name ASC
            ");
            $stmt->execute([':search' => '%' . $search . '%']);
        } else {
            $stmt = $this->db->prepare("
                SELECT id, vendor_name, bank_name, bank_account_name, bank_account_no, created_at, updated_at 
                FROM vendors 
                ORDER BY vendor_name ASC
            ");
            $stmt->execute();
        }

        $vendors = $stmt->fetchAll();
        $results = [];
        foreach ($vendors as $vendor) {
            $results[] = [
                "id" => (int)$vendor['id'],
                "vendor_name" => $vendor['vendor_name'],
                "bank_name" => $vendor['bank_name'],
                "bank_account_name" => $vendor['bank_account_name'],
                "bank_account_no" => $vendor['bank_account_no']
            ];
        }

        return [
            "total_data" => count($results),
            "data" => $results
        ];
    }

    public function getDetail($vendorId) {
        $stmt = $this->db->prepare("
            SELECT id, vendor_name, bank_name, bank_account_name, bank_account_no 
            FROM vendors 
            WHERE id = :id
        ");
        $stmt->execute([':id' => $vendorId]);
        $vendor = $stmt->fetch();

        if (!$vendor) {
            http_response_code(404);
            return ["detail" => "Vendor tidak ditemukan."];
        }

        return [
            "id" => (int)$vendor['id'],
            "vendor_name" => $vendor['vendor_name'],
            "bank_name" => $vendor['bank_name'],
            "bank_account_name" => $vendor['bank_account_name'],
            "bank_account_no" => $vendor['bank_account_no']
        ];
    }

    public function create($body) {
        $vendorName = isset($body['vendor_name']) ? trim($body['vendor_name']) : '';
        $bankName = isset($body['bank_name']) ? trim($body['bank_name']) : '';
        $bankAccountName = isset($body['bank_account_name']) ? trim($body['bank_account_name']) : '';
        $bankAccountNo = isset($body['bank_account_no']) ? trim($body['bank_account_no']) : '';

        if (empty($vendorName) || empty($bankName) || empty($bankAccountName) || empty($bankAccountNo)) {
            http_response_code(400);
            return ["detail" => "Semua field wajib diisi."];
        }

        // Check duplicate bank_account_no
        $checkStmt = $this->db->prepare("SELECT id FROM vendors WHERE bank_account_no = :no");
        $checkStmt->execute([':no' => $bankAccountNo]);
        if ($checkStmt->fetch()) {
            http_response_code(400);
            return ["detail" => "Nomor rekening sudah digunakan."];
        }

        $stmt = $this->db->prepare("
            INSERT INTO vendors (vendor_name, bank_name, bank_account_name, bank_account_no, created_at, updated_at) 
            VALUES (:vendor_name, :bank_name, :bank_account_name, :bank_account_no, GETDATE(), GETDATE())
        ");
        $stmt->execute([
            ':vendor_name' => $vendorName,
            ':bank_name' => $bankName,
            ':bank_account_name' => $bankAccountName,
            ':bank_account_no' => $bankAccountNo
        ]);

        $id = $this->db->lastInsertId();

        return [
            "message" => "Vendor berhasil ditambahkan.",
            "data" => [
                "id" => (int)$id,
                "vendor_name" => $vendorName,
                "bank_name" => $bankName,
                "bank_account_name" => $bankAccountName,
                "bank_account_no" => $bankAccountNo
            ]
        ];
    }

    public function delete($vendorId) {
        $checkStmt = $this->db->prepare("SELECT id FROM vendors WHERE id = :id");
        $checkStmt->execute([':id' => $vendorId]);
        if (!$checkStmt->fetch()) {
            http_response_code(404);
            return ["detail" => "Vendor tidak ditemukan."];
        }

        $stmt = $this->db->prepare("DELETE FROM vendors WHERE id = :id");
        $stmt->execute([':id' => $vendorId]);

        return ["message" => "Vendor berhasil dihapus."];
    }
}

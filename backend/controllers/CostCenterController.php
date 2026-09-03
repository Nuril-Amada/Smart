<?php
require_once __DIR__ . '/../config/database.php';

class CostCenterController {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    public function getAll($queryParams) {
        $search = isset($queryParams['search']) ? trim($queryParams['search']) : null;

        if ($search !== null && $search !== '') {
            $stmt = $this->db->prepare("
                SELECT id, cost_center_code, cost_center_name, created_at, updated_at 
                FROM cost_centers 
                WHERE LOWER(cost_center_code) LIKE LOWER(:search) 
                   OR LOWER(cost_center_name) LIKE LOWER(:search)
                ORDER BY cost_center_code ASC
            ");
            $stmt->execute([':search' => '%' . $search . '%']);
        } else {
            $stmt = $this->db->prepare("
                SELECT id, cost_center_code, cost_center_name, created_at, updated_at 
                FROM cost_centers 
                ORDER BY cost_center_code ASC
            ");
            $stmt->execute();
        }

        return $stmt->fetchAll();
    }

    public function create($body) {
        $code = isset($body['cost_center_code']) ? trim($body['cost_center_code']) : '';
        $name = isset($body['cost_center_name']) ? trim($body['cost_center_name']) : '';

        if (empty($code) || empty($name)) {
            http_response_code(400);
            return ["detail" => "Kode dan nama Cost Center wajib diisi."];
        }

        // Check duplicate
        $checkStmt = $this->db->prepare("
            SELECT id FROM cost_centers WHERE LOWER(cost_center_code) = LOWER(:code)
        ");
        $checkStmt->execute([':code' => $code]);
        if ($checkStmt->fetch()) {
            http_response_code(400);
            return ["detail" => "Kode Cost Center sudah ada."];
        }

        $stmt = $this->db->prepare("
            INSERT INTO cost_centers (cost_center_code, cost_center_name, created_at, updated_at) 
            VALUES (:code, :name, GETDATE(), GETDATE())
        ");
        $stmt->execute([
            ':code' => $code,
            ':name' => $name
        ]);

        $id = $this->db->lastInsertId();

        $fetchStmt = $this->db->prepare("SELECT id, cost_center_code, cost_center_name, created_at, updated_at FROM cost_centers WHERE id = :id");
        $fetchStmt->execute([':id' => $id]);
        $inserted = $fetchStmt->fetch() ?: [
            "id" => (int)$id,
            "cost_center_code" => $code,
            "cost_center_name" => $name
        ];

        return [
            "message" => "Cost Center berhasil ditambahkan.",
            "data" => $inserted
        ];
    }

    public function delete($id) {
        $checkStmt = $this->db->prepare("SELECT id FROM cost_centers WHERE id = :id");
        $checkStmt->execute([':id' => $id]);
        if (!$checkStmt->fetch()) {
            http_response_code(404);
            return ["detail" => "Cost Center tidak ditemukan."];
        }

        $stmt = $this->db->prepare("DELETE FROM cost_centers WHERE id = :id");
        $stmt->execute([':id' => $id]);

        return ["message" => "Cost Center berhasil dihapus."];
    }
}

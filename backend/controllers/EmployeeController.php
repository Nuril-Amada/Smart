<?php
require_once __DIR__ . '/../config/database.php';

class EmployeeController {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    public function getAll($queryParams) {
        $search = isset($queryParams['search']) ? trim($queryParams['search']) : null;

        if ($search !== null && $search !== '') {
            $stmt = $this->db->prepare("
                SELECT id, employee_name, employee_email, department_email, created_at, updated_at 
                FROM employees 
                WHERE LOWER(employee_name) LIKE LOWER(:search)
                ORDER BY id DESC
            ");
            $stmt->execute([':search' => '%' . $search . '%']);
        } else {
            $stmt = $this->db->prepare("
                SELECT id, employee_name, employee_email, department_email, created_at, updated_at 
                FROM employees 
                ORDER BY id DESC
            ");
            $stmt->execute();
        }

        return $stmt->fetchAll();
    }

    public function create($body) {
        $empName = isset($body['employee_name']) ? strtoupper(trim($body['employee_name'])) : '';
        $empEmail = isset($body['employee_email']) ? strtolower(trim($body['employee_email'])) : '';
        $deptEmail = (isset($body['department_email']) && trim($body['department_email']) !== '') 
            ? strtolower(trim($body['department_email'])) 
            : null;

        if (empty($empName) || empty($empEmail)) {
            http_response_code(400);
            return ["detail" => "Nama dan Email Employee wajib diisi."];
        }

        // Check duplicate
        $checkStmt = $this->db->prepare("SELECT id FROM employees WHERE employee_name = :name");
        $checkStmt->execute([':name' => $empName]);
        if ($checkStmt->fetch()) {
            http_response_code(400);
            return ["detail" => "Employee sudah ada."];
        }

        $stmt = $this->db->prepare("
            INSERT INTO employees (employee_name, employee_email, department_email, created_at, updated_at) 
            VALUES (:name, :email, :dept_email, GETDATE(), GETDATE())
        ");
        $stmt->execute([
            ':name' => $empName,
            ':email' => $empEmail,
            ':dept_email' => $deptEmail
        ]);

        $id = $this->db->lastInsertId();

        $fetchStmt = $this->db->prepare("SELECT id, employee_name, employee_email, department_email, created_at, updated_at FROM employees WHERE id = :id");
        $fetchStmt->execute([':id' => $id]);
        $inserted = $fetchStmt->fetch() ?: [
            "id" => (int)$id,
            "employee_name" => $empName,
            "employee_email" => $empEmail,
            "department_email" => $deptEmail
        ];

        return [
            "message" => "Employee berhasil ditambahkan.",
            "data" => $inserted
        ];
    }

    public function update($id, $body) {
        $checkStmt = $this->db->prepare("SELECT id FROM employees WHERE id = :id");
        $checkStmt->execute([':id' => $id]);
        if (!$checkStmt->fetch()) {
            http_response_code(404);
            return ["detail" => "Employee tidak ditemukan."];
        }

        $empName = isset($body['employee_name']) ? strtoupper(trim($body['employee_name'])) : '';
        $empEmail = isset($body['employee_email']) ? strtolower(trim($body['employee_email'])) : '';
        $deptEmail = (isset($body['department_email']) && trim($body['department_email']) !== '') 
            ? strtolower(trim($body['department_email'])) 
            : null;

        if (empty($empName) || empty($empEmail)) {
            http_response_code(400);
            return ["detail" => "Nama dan Email Employee wajib diisi."];
        }

        $stmt = $this->db->prepare("
            UPDATE employees 
            SET employee_name = :name, 
                employee_email = :email, 
                department_email = :dept_email, 
                updated_at = GETDATE() 
            WHERE id = :id
        ");
        $stmt->execute([
            ':name' => $empName,
            ':email' => $empEmail,
            ':dept_email' => $deptEmail,
            ':id' => $id
        ]);

        $fetchStmt = $this->db->prepare("SELECT id, employee_name, employee_email, department_email, created_at, updated_at FROM employees WHERE id = :id");
        $fetchStmt->execute([':id' => $id]);
        $updated = $fetchStmt->fetch();

        return [
            "message" => "Employee berhasil diperbarui.",
            "data" => $updated
        ];
    }

    public function delete($id) {
        $checkStmt = $this->db->prepare("SELECT id FROM employees WHERE id = :id");
        $checkStmt->execute([':id' => $id]);
        if (!$checkStmt->fetch()) {
            http_response_code(404);
            return ["detail" => "Employee tidak ditemukan."];
        }

        $stmt = $this->db->prepare("DELETE FROM employees WHERE id = :id");
        $stmt->execute([':id' => $id]);

        return ["message" => "Employee berhasil dihapus."];
    }
}

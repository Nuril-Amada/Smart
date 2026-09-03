<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../services/PpcHelper.php';

class SettlementController {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    private function serializeSettlement(array $item): array {
        $settleDate = $item['settlement_date'] instanceof DateTime ? $item['settlement_date']->format('Y-m-d') : $item['settlement_date'];
        return [
            "id" => (int)$item['id'],
            "ppc_no" => $item['ppc_no'],
            "source" => $item['source'],
            "settlement_date" => $settleDate,
            "employee_name" => $item['employee_name'],
            "cost_center" => $item['cost_center'],
            "description" => $item['description'],
            "settlement_amount" => (float)$item['settlement_amount'],
            "created_at" => $item['created_at'],
            "updated_at" => $item['updated_at'],
            "is_checked" => (bool)$item['is_checked']
        ];
    }

    public function summary($queryParams) {
        $source = isset($queryParams['source']) && !empty($queryParams['source']) ? strtoupper(trim($queryParams['source'])) : null;
        $empName = isset($queryParams['employee_name']) && !empty($queryParams['employee_name']) ? trim($queryParams['employee_name']) : null;
        $costCenter = isset($queryParams['cost_center']) && !empty($queryParams['cost_center']) ? trim($queryParams['cost_center']) : null;
        $startDate = isset($queryParams['start_date']) && !empty($queryParams['start_date']) ? $queryParams['start_date'] : null;
        $endDate = isset($queryParams['end_date']) && !empty($queryParams['end_date']) ? $queryParams['end_date'] : null;

        $sql = "SELECT * FROM settlements WHERE is_deleted = 0";
        $params = [];

        if ($source) {
            $sql .= " AND UPPER(source) = :source";
            $params[':source'] = $source;
        }
        if ($empName) {
            $sql .= " AND LOWER(employee_name) LIKE LOWER(:emp_name)";
            $params[':emp_name'] = '%' . $empName . '%';
        }
        if ($costCenter) {
            $sql .= " AND LOWER(cost_center) LIKE LOWER(:cost_center)";
            $params[':cost_center'] = '%' . $costCenter . '%';
        }
        if ($startDate) {
            $sql .= " AND settlement_date >= :start_date";
            $params[':start_date'] = $startDate;
        }
        if ($endDate) {
            $sql .= " AND settlement_date <= :end_date";
            $params[':end_date'] = $endDate;
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $settlements = $stmt->fetchAll();

        $totalCount = count($settlements);
        $totalAdv = 0;
        $totalReimb = 0;
        $totalAmt = 0.0;

        foreach ($settlements as $item) {
            $src = strtoupper($item['source']);
            if ($src === 'ADVANCE') {
                $totalAdv++;
            } else if ($src === 'REIMBURSEMENT') {
                $totalReimb++;
            }
            $totalAmt += (float)$item['settlement_amount'];
        }

        return [
            "total" => $totalCount,
            "advance" => $totalAdv,
            "reimbursement" => $totalReimb,
            "total_amount" => $totalAmt,
            "total_settlement" => $totalCount,
            "total_advance" => $totalAdv,
            "total_reimbursement" => $totalReimb,
            "total_settlement_amount" => $totalAmt
        ];
    }

    public function getList($queryParams) {
        $source = isset($queryParams['source']) && !empty($queryParams['source']) ? strtoupper(trim($queryParams['source'])) : null;
        $empName = isset($queryParams['employee_name']) && !empty($queryParams['employee_name']) ? trim($queryParams['employee_name']) : null;
        $costCenter = isset($queryParams['cost_center']) && !empty($queryParams['cost_center']) ? trim($queryParams['cost_center']) : null;
        $startDate = isset($queryParams['start_date']) && !empty($queryParams['start_date']) ? $queryParams['start_date'] : null;
        $endDate = isset($queryParams['end_date']) && !empty($queryParams['end_date']) ? $queryParams['end_date'] : null;

        $sql = "SELECT * FROM settlements WHERE is_deleted = 0";
        $params = [];

        if ($source) {
            $sql .= " AND UPPER(source) = :source";
            $params[':source'] = $source;
        }
        if ($empName) {
            $sql .= " AND LOWER(employee_name) LIKE LOWER(:emp_name)";
            $params[':emp_name'] = '%' . $empName . '%';
        }
        if ($costCenter) {
            $sql .= " AND LOWER(cost_center) LIKE LOWER(:cost_center)";
            $params[':cost_center'] = '%' . $costCenter . '%';
        }
        if ($startDate) {
            $sql .= " AND settlement_date >= :start_date";
            $params[':start_date'] = $startDate;
        }
        if ($endDate) {
            $sql .= " AND settlement_date <= :end_date";
            $params[':end_date'] = $endDate;
        }

        $sql .= " ORDER BY settlement_date DESC, created_at DESC, id DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $settlements = $stmt->fetchAll();

        $results = [];
        foreach ($settlements as $item) {
            $settleDate = $item['settlement_date'] instanceof DateTime ? $item['settlement_date']->format('Y-m-d') : $item['settlement_date'];
            $results[] = [
                "id" => (int)$item['id'],
                "ppc_no" => $item['ppc_no'],
                "source" => $item['source'],
                "settlement_date" => $settleDate,
                "employee_name" => $item['employee_name'],
                "cost_center" => $item['cost_center'],
                "description" => $item['description'],
                "settlement_amount" => (float)$item['settlement_amount'],
                "is_checked" => (bool)$item['is_checked']
            ];
        }

        return $results;
    }

    public function toggleCheck($settlementId) {
        $stmt = $this->db->prepare("SELECT * FROM settlements WHERE id = :id AND is_deleted = 0");
        $stmt->execute([':id' => $settlementId]);
        $settlement = $stmt->fetch();

        if (!$settlement) {
            http_response_code(404);
            return ["detail" => "Settlement tidak ditemukan."];
        }

        $newChecked = $settlement['is_checked'] ? 0 : 1;
        $updateStmt = $this->db->prepare("UPDATE settlements SET is_checked = :chk, updated_at = GETDATE() WHERE id = :id");
        $updateStmt->execute([':chk' => $newChecked, ':id' => $settlementId]);

        return [
            "id" => (int)$settlementId,
            "is_checked" => (bool)$newChecked,
            "message" => "Checklist berhasil diperbarui."
        ];
    }

    public function createReimbursement($body) {
        $empName = isset($body['employee_name']) ? trim($body['employee_name']) : '';
        $settleDateStr = isset($body['settlement_date']) ? $body['settlement_date'] : '';
        $costCenter = isset($body['cost_center']) ? trim($body['cost_center']) : '';
        $description = isset($body['description']) ? trim($body['description']) : '';
        $settleAmount = isset($body['settlement_amount']) ? (float)$body['settlement_amount'] : 0.0;

        $empStmt = $this->db->prepare("SELECT employee_name FROM employees WHERE LOWER(employee_name) = LOWER(:name)");
        $empStmt->execute([':name' => $empName]);
        $empRow = $empStmt->fetch();
        if (!$empRow) {
            http_response_code(404);
            return ["detail" => "Employee tidak ditemukan."];
        }
        $validEmpName = $empRow['employee_name'];

        if ($settleAmount <= 0) {
            http_response_code(400);
            return ["detail" => "Settlement amount harus lebih dari 0."];
        }

        $settleDate = new DateTime($settleDateStr);
        $ppcNo = PpcHelper::generatePpcNo($this->db, $settleDate, true);

        $stmt = $this->db->prepare("
            INSERT INTO settlements (ppc_no, source, employee_name, settlement_date, cost_center, description, settlement_amount, is_checked, is_deleted, created_at, updated_at) 
            VALUES (:ppc_no, 'REIMBURSEMENT', :emp_name, :settle_date, :cost_center, :description, :settle_amount, 0, 0, GETDATE(), GETDATE())
        ");
        $stmt->execute([
            ':ppc_no' => $ppcNo,
            ':emp_name' => $validEmpName,
            ':settle_date' => $settleDate->format('Y-m-d'),
            ':cost_center' => $costCenter,
            ':description' => $description,
            ':settle_amount' => $settleAmount
        ]);

        $id = $this->db->lastInsertId();
        $fetchStmt = $this->db->prepare("SELECT * FROM settlements WHERE id = :id");
        $fetchStmt->execute([':id' => $id]);
        $inserted = $fetchStmt->fetch();

        return [
            "message" => "Reimbursement berhasil ditambahkan.",
            "data" => $this->serializeSettlement($inserted)
        ];
    }

    public function updateReimbursement($settlementId, $body) {
        $stmt = $this->db->prepare("SELECT * FROM settlements WHERE id = :id AND is_deleted = 0");
        $stmt->execute([':id' => $settlementId]);
        $settlement = $stmt->fetch();

        if (!$settlement) {
            http_response_code(404);
            return ["detail" => "Settlement tidak ditemukan."];
        }

        if (isset($body['employee_name']) && $body['employee_name'] !== null) {
            $empName = trim($body['employee_name']);
            $empStmt = $this->db->prepare("SELECT employee_name FROM employees WHERE LOWER(employee_name) = LOWER(:name)");
            $empStmt->execute([':name' => $empName]);
            $empRow = $empStmt->fetch();
            if (!$empRow) {
                http_response_code(404);
                return ["detail" => "Employee tidak ditemukan."];
            }
            $settlement['employee_name'] = $empRow['employee_name'];
        }

        if (isset($body['settlement_date']) && $body['settlement_date'] !== null) {
            $settlement['settlement_date'] = $body['settlement_date'];
        }
        if (isset($body['cost_center']) && $body['cost_center'] !== null) {
            $settlement['cost_center'] = trim($body['cost_center']);
        }
        if (isset($body['description']) && $body['description'] !== null) {
            $settlement['description'] = trim($body['description']);
        }
        if (isset($body['settlement_amount']) && $body['settlement_amount'] !== null) {
            $amt = (float)$body['settlement_amount'];
            if ($amt <= 0) {
                http_response_code(400);
                return ["detail" => "Settlement amount harus lebih dari 0."];
            }
            $settlement['settlement_amount'] = $amt;
        }

        $updateStmt = $this->db->prepare("
            UPDATE settlements 
            SET employee_name = :emp_name,
                settlement_date = :settle_date,
                cost_center = :cost_center,
                description = :description,
                settlement_amount = :settle_amount,
                updated_at = GETDATE()
            WHERE id = :id
        ");
        $updateStmt->execute([
            ':emp_name' => $settlement['employee_name'],
            ':settle_date' => $settlement['settlement_date'],
            ':cost_center' => $settlement['cost_center'],
            ':description' => $settlement['description'],
            ':settle_amount' => $settlement['settlement_amount'],
            ':id' => $settlementId
        ]);

        $fetchStmt = $this->db->prepare("SELECT * FROM settlements WHERE id = :id");
        $fetchStmt->execute([':id' => $settlementId]);
        $updated = $fetchStmt->fetch();

        return [
            "message" => "Settlement berhasil diperbarui.",
            "data" => $this->serializeSettlement($updated)
        ];
    }

    public function delete($settlementId) {
        $stmt = $this->db->prepare("SELECT * FROM settlements WHERE id = :id AND is_deleted = 0");
        $stmt->execute([':id' => $settlementId]);
        $settlement = $stmt->fetch();

        if (!$settlement) {
            http_response_code(404);
            return ["detail" => "Settlement tidak ditemukan."];
        }

        $delStmt = $this->db->prepare("UPDATE settlements SET is_deleted = 1, deleted_at = GETDATE() WHERE id = :id");
        $delStmt->execute([':id' => $settlementId]);

        return [
            "id" => (int)$settlementId,
            "message" => "Settlement berhasil dihapus."
        ];
    }

    public function searchUsers($queryParams) {
        $q = isset($queryParams['q']) ? trim($queryParams['q']) : '';
        if (empty($q)) {
            return [];
        }

        $stmt = $this->db->prepare("
            SELECT TOP 10 employee_name, employee_email, department_email 
            FROM employees 
            WHERE LOWER(employee_name) LIKE LOWER(:q)
        ");
        $stmt->execute([':q' => '%' . $q . '%']);
        return $stmt->fetchAll();
    }

    public function searchCostCenters($queryParams) {
        $q = isset($queryParams['q']) ? trim($queryParams['q']) : '';
        if (empty($q)) {
            return [];
        }

        $stmt = $this->db->prepare("
            SELECT DISTINCT TOP 10 cost_center 
            FROM settlements 
            WHERE LOWER(cost_center) LIKE LOWER(:q) AND is_deleted = 0 AND cost_center IS NOT NULL
        ");
        $stmt->execute([':q' => '%' . $q . '%']);
        $rows = $stmt->fetchAll();
        $results = [];
        foreach ($rows as $r) {
            if ($r['cost_center'] !== null) {
                $results[] = $r['cost_center'];
            }
        }
        return $results;
    }

    public function getDetail($settlementId) {
        $stmt = $this->db->prepare("SELECT * FROM settlements WHERE id = :id AND is_deleted = 0");
        $stmt->execute([':id' => $settlementId]);
        $settlement = $stmt->fetch();

        if (!$settlement) {
            http_response_code(404);
            return ["detail" => "Settlement tidak ditemukan."];
        }

        return $this->serializeSettlement($settlement);
    }
}

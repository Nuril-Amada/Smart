<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../services/PpcHelper.php';

class AdvanceController {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    private function calculateDueDate(DateTime $requestDate): DateTime {
        $dueDate = clone $requestDate;
        $workingDays = 0;
        while ($workingDays < 2) {
            $dueDate->modify('+1 day');
            // Monday = 1 ... Friday = 5, Saturday = 6, Sunday = 7
            $dayOfWeek = (int)$dueDate->format('N');
            if ($dayOfWeek < 6) {
                $workingDays++;
            }
        }
        return $dueDate;
    }

    private function updatePpcStatus(array &$ppc): void {
        $status = strtoupper($ppc['status']);
        if ($status === 'CANCEL' || $status === 'SETTLED') {
            return;
        }

        $dueDateStr = $ppc['due_date'];
        if (!empty($dueDateStr)) {
            $dueDate = new DateTime($dueDateStr);
            $today = new DateTime('today');
            if ($dueDate < $today) {
                if ($status !== 'OVERDUE') {
                    $ppc['status'] = 'OVERDUE';
                    $stmt = $this->db->prepare("UPDATE advance_requests SET status = 'OVERDUE', updated_at = GETDATE() WHERE id = :id");
                    $stmt->execute([':id' => $ppc['id']]);
                }
                return;
            }
        }

        if ($status !== 'ACTIVE') {
            $ppc['status'] = 'ACTIVE';
            $stmt = $this->db->prepare("UPDATE advance_requests SET status = 'ACTIVE', updated_at = GETDATE() WHERE id = :id");
            $stmt->execute([':id' => $ppc['id']]);
        }
    }

    private function serializePpc(array $ppc): array {
        $stmt = $this->db->prepare("
            SELECT settlement_date, settlement_amount 
            FROM settlements 
            WHERE ppc_no = :ppc_no AND source = 'ADVANCE' AND is_deleted = 0
        ");
        $stmt->execute([':ppc_no' => $ppc['ppc_no']]);
        $settlement = $stmt->fetch();

        $reqDate = $ppc['request_date'] instanceof DateTime ? $ppc['request_date']->format('Y-m-d') : $ppc['request_date'];
        $dueDate = $ppc['due_date'] instanceof DateTime ? $ppc['due_date']->format('Y-m-d') : $ppc['due_date'];
        $settleDate = null;
        $settleAmt = null;
        if ($settlement) {
            $settleDate = $settlement['settlement_date'] instanceof DateTime ? $settlement['settlement_date']->format('Y-m-d') : $settlement['settlement_date'];
            $settleAmt = (float)$settlement['settlement_amount'];
        }

        return [
            "id" => (int)$ppc['id'],
            "request_date" => $reqDate,
            "ppc_no" => $ppc['ppc_no'],
            "employee_name" => $ppc['employee_name'],
            "cost_center" => $ppc['cost_center'],
            "purpose" => $ppc['purpose'],
            "amount" => (float)$ppc['amount'],
            "due_date" => $dueDate,
            "settlement_date" => $settleDate,
            "settlement_amount" => $settleAmt,
            "status" => $ppc['status'],
            "created_at" => $ppc['created_at'],
            "updated_at" => $ppc['updated_at']
        ];
    }

    public function summary($queryParams) {
        $startDate = isset($queryParams['start_date']) && !empty($queryParams['start_date']) ? $queryParams['start_date'] : null;
        $endDate = isset($queryParams['end_date']) && !empty($queryParams['end_date']) ? $queryParams['end_date'] : null;

        $sql = "SELECT * FROM advance_requests WHERE 1=1";
        $params = [];

        if ($startDate) {
            $sql .= " AND request_date >= :start_date";
            $params[':start_date'] = $startDate;
        }
        if ($endDate) {
            $sql .= " AND request_date <= :end_date";
            $params[':end_date'] = $endDate;
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $ppcList = $stmt->fetchAll();

        $activeCount = 0;
        $overdueCount = 0;
        $totalAdvance = 0;
        $outstandingAmount = 0.0;

        foreach ($ppcList as &$ppc) {
            $this->updatePpcStatus($ppc);
            $st = strtoupper($ppc['status']);
            if ($st === 'ACTIVE') {
                $activeCount++;
            } else if ($st === 'OVERDUE') {
                $overdueCount++;
            }

            if (in_array($st, ['ACTIVE', 'OVERDUE', 'SETTLED'])) {
                $totalAdvance++;
            }

            if (in_array($st, ['ACTIVE', 'OVERDUE'])) {
                $outstandingAmount += (float)$ppc['amount'];
            }
        }

        return [
            "total_advance" => $totalAdvance,
            "active_advance" => $activeCount,
            "overdue_advance" => $overdueCount,
            "outstanding_amount" => $outstandingAmount
        ];
    }

    public function getAll($queryParams) {
        $empName = isset($queryParams['employee_name']) && !empty($queryParams['employee_name']) ? trim($queryParams['employee_name']) : null;
        $costCenter = isset($queryParams['cost_center']) && !empty($queryParams['cost_center']) ? trim($queryParams['cost_center']) : null;
        $status = isset($queryParams['status']) && !empty($queryParams['status']) ? trim($queryParams['status']) : null;
        $startDate = isset($queryParams['start_date']) && !empty($queryParams['start_date']) ? $queryParams['start_date'] : null;
        $endDate = isset($queryParams['end_date']) && !empty($queryParams['end_date']) ? $queryParams['end_date'] : null;

        $sql = "SELECT * FROM advance_requests WHERE 1=1";
        $params = [];

        if ($empName) {
            $sql .= " AND LOWER(employee_name) LIKE LOWER(:emp_name)";
            $params[':emp_name'] = '%' . $empName . '%';
        }
        if ($costCenter) {
            $sql .= " AND LOWER(cost_center) LIKE LOWER(:cost_center)";
            $params[':cost_center'] = '%' . $costCenter . '%';
        }
        if ($status) {
            $sql .= " AND UPPER(status) = :status";
            $params[':status'] = strtoupper($status);
        }
        if ($startDate) {
            $sql .= " AND request_date >= :start_date";
            $params[':start_date'] = $startDate;
        }
        if ($endDate) {
            $sql .= " AND request_date <= :end_date";
            $params[':end_date'] = $endDate;
        }

        $sql .= " ORDER BY request_date DESC, created_at DESC, id DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $ppcList = $stmt->fetchAll();

        $result = [];
        foreach ($ppcList as &$ppc) {
            $this->updatePpcStatus($ppc);
            $result[] = $this->serializePpc($ppc);
        }

        return $result;
    }

    public function getDetail($ppcId) {
        $stmt = $this->db->prepare("SELECT * FROM advance_requests WHERE id = :id");
        $stmt->execute([':id' => $ppcId]);
        $ppc = $stmt->fetch();

        if (!$ppc) {
            http_response_code(404);
            return ["detail" => "PPC tidak ditemukan."];
        }

        $this->updatePpcStatus($ppc);
        return $this->serializePpc($ppc);
    }

    public function create($body) {
        $empName = isset($body['employee_name']) ? trim($body['employee_name']) : '';
        $reqDateStr = isset($body['request_date']) ? $body['request_date'] : '';
        $costCenter = isset($body['cost_center']) ? trim($body['cost_center']) : '';
        $purpose = isset($body['purpose']) ? trim($body['purpose']) : '';
        $amount = isset($body['amount']) ? (float)$body['amount'] : 0.0;
        $dueDateStr = isset($body['due_date']) && !empty($body['due_date']) ? $body['due_date'] : null;

        // Check employee
        $empStmt = $this->db->prepare("SELECT employee_name FROM employees WHERE LOWER(employee_name) = LOWER(:name)");
        $empStmt->execute([':name' => $empName]);
        $empRow = $empStmt->fetch();
        if (!$empRow) {
            http_response_code(404);
            return ["detail" => "Employee tidak ditemukan."];
        }
        $validEmpName = $empRow['employee_name'];

        if ($amount <= 0) {
            http_response_code(400);
            return ["detail" => "Amount harus lebih dari Rp0."];
        }
        if ($amount > 1000000) {
            http_response_code(400);
            return ["detail" => "Amount tidak boleh melebihi Rp1.000.000."];
        }

        $reqDate = new DateTime($reqDateStr);
        if ($dueDateStr !== null) {
            $dueDate = new DateTime($dueDateStr);
        } else {
            $dueDate = $this->calculateDueDate($reqDate);
        }

        if ($dueDate < $reqDate) {
            http_response_code(400);
            return ["detail" => "Due date tidak valid."];
        }

        $ppcNo = PpcHelper::generatePpcNo($this->db, $reqDate, true);

        $stmt = $this->db->prepare("
            INSERT INTO advance_requests (ppc_no, request_date, employee_name, cost_center, purpose, amount, due_date, status, created_at, updated_at) 
            VALUES (:ppc_no, :req_date, :emp_name, :cost_center, :purpose, :amount, :due_date, 'ACTIVE', GETDATE(), GETDATE())
        ");
        $stmt->execute([
            ':ppc_no' => $ppcNo,
            ':req_date' => $reqDate->format('Y-m-d'),
            ':emp_name' => $validEmpName,
            ':cost_center' => $costCenter,
            ':purpose' => $purpose,
            ':amount' => $amount,
            ':due_date' => $dueDate->format('Y-m-d')
        ]);

        $id = $this->db->lastInsertId();
        $fetchStmt = $this->db->prepare("SELECT * FROM advance_requests WHERE id = :id");
        $fetchStmt->execute([':id' => $id]);
        $insertedPpc = $fetchStmt->fetch();

        return [
            "message" => "Advance berhasil ditambahkan.",
            "data" => $this->serializePpc($insertedPpc)
        ];
    }

    public function update($ppcId, $body) {
        $stmt = $this->db->prepare("SELECT * FROM advance_requests WHERE id = :id");
        $stmt->execute([':id' => $ppcId]);
        $ppc = $stmt->fetch();

        if (!$ppc) {
            http_response_code(404);
            return ["detail" => "PPC tidak ditemukan."];
        }

        $this->updatePpcStatus($ppc);
        if (strtoupper($ppc['status']) === 'SETTLED') {
            http_response_code(400);
            return ["detail" => "PPC yang sudah settled tidak dapat diubah."];
        }
        if (strtoupper($ppc['status']) === 'CANCEL') {
            http_response_code(400);
            return ["detail" => "PPC yang sudah dicancel tidak dapat diubah."];
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
            $ppc['employee_name'] = $empRow['employee_name'];
        }

        if (isset($body['cost_center']) && $body['cost_center'] !== null) {
            $ppc['cost_center'] = trim($body['cost_center']);
        }
        if (isset($body['purpose']) && $body['purpose'] !== null) {
            $ppc['purpose'] = trim($body['purpose']);
        }
        if (isset($body['amount']) && $body['amount'] !== null) {
            $amt = (float)$body['amount'];
            if ($amt <= 0) {
                http_response_code(400);
                return ["detail" => "Amount harus lebih dari Rp0."];
            }
            if ($amt > 1000000) {
                http_response_code(400);
                return ["detail" => "Amount tidak boleh melebihi Rp1.000.000."];
            }
            $ppc['amount'] = $amt;
        }

        if (isset($body['due_date']) && $body['due_date'] !== null) {
            $dueDate = new DateTime($body['due_date']);
            $reqDate = new DateTime($ppc['request_date']);
            if ($dueDate < $reqDate) {
                http_response_code(400);
                return ["detail" => "Due date tidak valid."];
            }
            $ppc['due_date'] = $dueDate->format('Y-m-d');
        }

        $updateStmt = $this->db->prepare("
            UPDATE advance_requests 
            SET employee_name = :emp_name,
                cost_center = :cost_center,
                purpose = :purpose,
                amount = :amount,
                due_date = :due_date,
                updated_at = GETDATE()
            WHERE id = :id
        ");
        $updateStmt->execute([
            ':emp_name' => $ppc['employee_name'],
            ':cost_center' => $ppc['cost_center'],
            ':purpose' => $ppc['purpose'],
            ':amount' => $ppc['amount'],
            ':due_date' => $ppc['due_date'],
            ':id' => $ppcId
        ]);

        $this->updatePpcStatus($ppc);
        return $this->serializePpc($ppc);
    }

    public function cancel($ppcId) {
        $stmt = $this->db->prepare("SELECT * FROM advance_requests WHERE id = :id");
        $stmt->execute([':id' => $ppcId]);
        $ppc = $stmt->fetch();

        if (!$ppc) {
            http_response_code(404);
            return ["detail" => "PPC tidak ditemukan."];
        }

        $this->updatePpcStatus($ppc);
        if (strtoupper($ppc['status']) === 'SETTLED') {
            http_response_code(400);
            return ["detail" => "PPC yang sudah settled tidak dapat dicancel."];
        }
        if (strtoupper($ppc['status']) === 'CANCEL') {
            http_response_code(400);
            return ["detail" => "PPC sudah dicancel."];
        }

        $cancelStmt = $this->db->prepare("UPDATE advance_requests SET status = 'CANCEL', updated_at = GETDATE() WHERE id = :id");
        $cancelStmt->execute([':id' => $ppcId]);

        return ["message" => "PPC berhasil dicancel."];
    }

    public function delete($ppcId) {
        $stmt = $this->db->prepare("SELECT * FROM advance_requests WHERE id = :id");
        $stmt->execute([':id' => $ppcId]);
        $ppc = $stmt->fetch();

        if (!$ppc) {
            http_response_code(404);
            return ["detail" => "PPC tidak ditemukan."];
        }

        $this->updatePpcStatus($ppc);
        $stUpper = strtoupper($ppc['status'] ?? '');

        if ($stUpper === 'ACTIVE' || $stUpper === 'OVERDUE') {
            http_response_code(400);
            return ["detail" => "Advance Masih Memiliki Nominal Outstanding."];
        }

        // Hapus log pengingat terkait di reminder_logs untuk menghindari Foreign Key constraint violation
        $delLogs = $this->db->prepare("DELETE FROM reminder_logs WHERE advance_request_id = :id");
        $delLogs->execute([':id' => $ppcId]);

        $delStmt = $this->db->prepare("DELETE FROM advance_requests WHERE id = :id");
        $delStmt->execute([':id' => $ppcId]);

        return ["message" => "PPC berhasil dihapus."];
    }

    public function createSettlement($ppcId, $body) {
        $stmt = $this->db->prepare("SELECT * FROM advance_requests WHERE id = :id");
        $stmt->execute([':id' => $ppcId]);
        $ppc = $stmt->fetch();

        if (!$ppc) {
            http_response_code(404);
            return ["detail" => "PPC tidak ditemukan."];
        }

        $this->updatePpcStatus($ppc);
        if (strtoupper($ppc['status']) === 'CANCEL') {
            http_response_code(400);
            return ["detail" => "PPC yang sudah dicancel tidak dapat disettlement."];
        }
        if (strtoupper($ppc['status']) === 'SETTLED') {
            http_response_code(400);
            return ["detail" => "PPC sudah disettlement."];
        }

        $settleAmount = isset($body['settlement_amount']) ? (float)$body['settlement_amount'] : 0.0;
        $settleDate = isset($body['settlement_date']) ? $body['settlement_date'] : '';
        $description = isset($body['description']) ? trim($body['description']) : '';

        if ($settleAmount <= 0) {
            http_response_code(400);
            return ["detail" => "Settlement amount harus lebih dari Rp0."];
        }
        if ($settleAmount > 1000000) {
            http_response_code(400);
            return ["detail" => "Settlement amount tidak boleh melebihi Rp1.000.000."];
        }

        $existStmt = $this->db->prepare("SELECT id FROM settlements WHERE ppc_no = :ppc_no AND source = 'ADVANCE' AND is_deleted = 0");
        $existStmt->execute([':ppc_no' => $ppc['ppc_no']]);
        if ($existStmt->fetch()) {
            http_response_code(400);
            return ["detail" => "Settlement sudah tersedia."];
        }

        $insStmt = $this->db->prepare("
            INSERT INTO settlements (ppc_no, source, employee_name, settlement_date, cost_center, description, settlement_amount, is_checked, is_deleted, created_at, updated_at) 
            VALUES (:ppc_no, 'ADVANCE', :emp_name, :settle_date, :cost_center, :description, :settle_amount, 0, 0, GETDATE(), GETDATE())
        ");
        $insStmt->execute([
            ':ppc_no' => $ppc['ppc_no'],
            ':emp_name' => $ppc['employee_name'],
            ':settle_date' => $settleDate,
            ':cost_center' => $ppc['cost_center'],
            ':description' => $description,
            ':settle_amount' => $settleAmount
        ]);

        $updatePpc = $this->db->prepare("UPDATE advance_requests SET status = 'SETTLED', updated_at = GETDATE() WHERE id = :id");
        $updatePpc->execute([':id' => $ppcId]);

        return [
            "message" => "Settlement berhasil dibuat.",
            "ppc_no" => $ppc['ppc_no']
        ];
    }

    public function getReceipt($ppcId) {
        $stmt = $this->db->prepare("SELECT * FROM advance_requests WHERE id = :id");
        $stmt->execute([':id' => $ppcId]);
        $ppc = $stmt->fetch();

        if (!$ppc) {
            http_response_code(404);
            return ["detail" => "PPC tidak ditemukan."];
        }

        $settleStmt = $this->db->prepare("SELECT * FROM settlements WHERE ppc_no = :ppc_no AND source = 'ADVANCE' AND is_deleted = 0");
        $settleStmt->execute([':ppc_no' => $ppc['ppc_no']]);
        $settlement = $settleStmt->fetch();

        if (!$settlement) {
            http_response_code(404);
            return ["detail" => "Settlement belum tersedia."];
        }

        $settleDate = $settlement['settlement_date'] instanceof DateTime ? $settlement['settlement_date']->format('Y-m-d') : $settlement['settlement_date'];

        return [
            "ppc_no" => $settlement['ppc_no'],
            "employee_name" => $settlement['employee_name'],
            "cost_center" => $settlement['cost_center'],
            "settlement_date" => $settleDate,
            "settlement_amount" => (float)$settlement['settlement_amount'],
            "description" => $settlement['description'],
            "created_at" => $settlement['created_at']
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
            SELECT DISTINCT cost_center 
            FROM advance_requests 
            WHERE LOWER(cost_center) LIKE LOWER(:q) AND cost_center IS NOT NULL
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

    public function previewPpcNumber($queryParams) {
        $reqDateStr = isset($queryParams['request_date']) ? $queryParams['request_date'] : date('Y-m-d');
        $reqDate = new DateTime($reqDateStr);
        $ppcNo = PpcHelper::generatePpcNo($this->db, $reqDate, false);
        return ["ppc_no" => $ppcNo];
    }
}

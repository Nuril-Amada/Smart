<?php
require_once __DIR__ . '/../config/database.php';

class CheckController {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    public function getChecks($queryParams) {
        $startDate = isset($queryParams['start_date']) && !empty($queryParams['start_date']) ? $queryParams['start_date'] : null;
        $endDate = isset($queryParams['end_date']) && !empty($queryParams['end_date']) ? $queryParams['end_date'] : null;
        $transactionType = isset($queryParams['transaction_type']) && !empty($queryParams['transaction_type']) ? $queryParams['transaction_type'] : null;
        $vendor = isset($queryParams['vendor']) && !empty($queryParams['vendor']) ? trim($queryParams['vendor']) : null;

        $where = [];
        $params = [];

        if ($startDate) {
            $where[] = "transaction_date >= :start_date";
            $params[':start_date'] = $startDate;
        }

        if ($endDate) {
            $where[] = "transaction_date <= :end_date";
            $params[':end_date'] = $endDate;
        }

        if ($transactionType) {
            $where[] = "transaction_type = :trans_type";
            $params[':trans_type'] = $transactionType;
        }

        if ($vendor) {
            $where[] = "LOWER(vendor_name) LIKE LOWER(:vendor)";
            $params[':vendor'] = '%' . $vendor . '%';
        }

        $sql = "SELECT * FROM printed_checks";
        if (count($where) > 0) {
            $sql .= " WHERE " . implode(" AND ", $where);
        }
        $sql .= " ORDER BY updated_at DESC, id DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $checks = $stmt->fetchAll();

        $results = [];
        foreach ($checks as $item) {
            $transDate = $item['transaction_date'];
            if ($transDate instanceof DateTime) {
                $transDate = $transDate->format('Y-m-d');
            }

            $amount = $item['amount'] !== null ? (float)$item['amount'] : null;
            $bankVal = $item['bank_type'];
            $bankLabel = "";
            if ($bankVal) {
                if (strcasecmp($bankVal, 'Maybank') === 0 || strcasecmp($bankVal, 'Maybank Indonesia') === 0) {
                    $bankLabel = "Maybank Indonesia";
                } else {
                    $bankLabel = "Bank {$bankVal}";
                }
            }

            $results[] = [
                "id" => (int)$item['id'],
                "transaction_date" => $transDate,
                "check_number" => $item['check_number'],
                "transaction_type" => $item['transaction_type'],
                "bank_type" => $item['bank_type'],
                "vendor_name" => $item['vendor_name'],
                "vendor_bank" => $item['vendor_bank'],
                "vendor_account_number" => $item['vendor_account_number'],
                "amount" => $amount,

                // Legacy key compatibility
                "tanggal" => $transDate,
                "nomorCek" => $item['check_number'],
                "jenisCek" => $item['transaction_type'],
                "bank" => $bankLabel,
                "vendor" => $item['vendor_name'],
                "nomorRekening" => $item['vendor_account_number'],
                "nominal" => $amount
            ];
        }

        return [
            "total_data" => count($results),
            "data" => $results
        ];
    }

    public function createOrUpdate($body) {
        $id = isset($body['id']) && $body['id'] !== null ? (int)$body['id'] : null;
        $transDate = isset($body['transaction_date']) ? $body['transaction_date'] : '';
        $checkNumber = isset($body['check_number']) ? trim($body['check_number']) : '';
        $transType = isset($body['transaction_type']) ? $body['transaction_type'] : '';
        $bankType = isset($body['bank_type']) ? $body['bank_type'] : '';
        $vendorName = isset($body['vendor_name']) ? trim($body['vendor_name']) : '';
        $amount = isset($body['amount']) ? (float)$body['amount'] : 0.0;
        $vendorBank = isset($body['vendor_bank']) ? trim($body['vendor_bank']) : null;
        $vendorAccNo = isset($body['vendor_account_number']) ? trim($body['vendor_account_number']) : null;

        if (empty($checkNumber) || empty($transDate) || empty($vendorName)) {
            http_response_code(400);
            return ["detail" => "Tanggal, nomor cek, dan nama vendor wajib diisi."];
        }

        if ($id !== null) {
            // Edit mode
            $checkStmt = $this->db->prepare("SELECT id FROM printed_checks WHERE id = :id");
            $checkStmt->execute([':id' => $id]);
            if (!$checkStmt->fetch()) {
                http_response_code(404);
                return ["detail" => "Data cek tidak ditemukan."];
            }

            $dupStmt = $this->db->prepare("SELECT id FROM printed_checks WHERE check_number = :chk AND id != :id");
            $dupStmt->execute([':chk' => $checkNumber, ':id' => $id]);
            if ($dupStmt->fetch()) {
                http_response_code(400);
                return ["detail" => "Nomor cek '{$checkNumber}' sudah pernah digunakan oleh data lain."];
            }

            $stmt = $this->db->prepare("
                UPDATE printed_checks 
                SET transaction_date = :trans_date,
                    check_number = :check_no,
                    transaction_type = :trans_type,
                    bank_type = :bank_type,
                    vendor_name = :vendor_name,
                    amount = :amount,
                    vendor_bank = :vendor_bank,
                    vendor_account_number = :vendor_acc,
                    updated_at = GETDATE()
                WHERE id = :id
            ");
            $stmt->execute([
                ':trans_date' => $transDate,
                ':check_no' => $checkNumber,
                ':trans_type' => $transType,
                ':bank_type' => $bankType,
                ':vendor_name' => $vendorName,
                ':amount' => $amount,
                ':vendor_bank' => $vendorBank,
                ':vendor_acc' => $vendorAccNo,
                ':id' => $id
            ]);

            return [
                "message" => "Data cek berhasil diperbarui.",
                "id" => $id,
                "is_update" => true
            ];
        } else {
            // Create mode
            $dupStmt = $this->db->prepare("SELECT id FROM printed_checks WHERE check_number = :chk");
            $dupStmt->execute([':chk' => $checkNumber]);
            if ($dupStmt->fetch()) {
                http_response_code(400);
                return ["detail" => "Nomor cek '{$checkNumber}' sudah pernah digunakan. Ganti nomor cek atau klik tombol Edit pada data yang ada."];
            }

            $stmt = $this->db->prepare("
                INSERT INTO printed_checks (transaction_date, check_number, transaction_type, bank_type, vendor_name, amount, vendor_bank, vendor_account_number, created_at, updated_at) 
                VALUES (:trans_date, :check_no, :trans_type, :bank_type, :vendor_name, :amount, :vendor_bank, :vendor_acc, GETDATE(), GETDATE())
            ");
            $stmt->execute([
                ':trans_date' => $transDate,
                ':check_no' => $checkNumber,
                ':trans_type' => $transType,
                ':bank_type' => $bankType,
                ':vendor_name' => $vendorName,
                ':amount' => $amount,
                ':vendor_bank' => $vendorBank,
                ':vendor_acc' => $vendorAccNo
            ]);

            $newId = (int)$this->db->lastInsertId();

            return [
                "message" => "Data cek berhasil disimpan.",
                "id" => $newId,
                "is_update" => false
            ];
        }
    }

    public function deleteCheck($checkId) {
        $checkStmt = $this->db->prepare("SELECT id FROM printed_checks WHERE id = :id");
        $checkStmt->execute([':id' => $checkId]);
        if (!$checkStmt->fetch()) {
            http_response_code(404);
            return ["detail" => "Cek tidak ditemukan."];
        }

        $stmt = $this->db->prepare("DELETE FROM printed_checks WHERE id = :id");
        $stmt->execute([':id' => $checkId]);

        return ["message" => "Cek berhasil dihapus."];
    }
}

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

    private function initLayoutsTable() {
        try {
            $this->db->exec("
                IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[bank_check_layouts]') AND type in (N'U'))
                BEGIN
                    CREATE TABLE [dbo].[bank_check_layouts] (
                        [id] INT IDENTITY(1,1) PRIMARY KEY,
                        [bank_name] VARCHAR(100) NOT NULL UNIQUE,
                        [tanggal_x] DECIMAL(6,2) DEFAULT 0.00,
                        [tanggal_y] DECIMAL(6,2) DEFAULT 0.00,
                        [vendor_x] DECIMAL(6,2) DEFAULT 0.00,
                        [vendor_y] DECIMAL(6,2) DEFAULT 0.00,
                        [terbilang1_x] DECIMAL(6,2) DEFAULT 0.00,
                        [terbilang1_y] DECIMAL(6,2) DEFAULT 0.00,
                        [terbilang2_x] DECIMAL(6,2) DEFAULT 0.00,
                        [terbilang2_y] DECIMAL(6,2) DEFAULT 0.00,
                        [nominal_x] DECIMAL(6,2) DEFAULT 0.00,
                        [nominal_y] DECIMAL(6,2) DEFAULT 0.00,
                        [width_cm] DECIMAL(6,2) DEFAULT 17.80,
                        [height_cm] DECIMAL(6,2) DEFAULT 7.00,
                        [is_custom] TINYINT DEFAULT 0,
                        [updated_at] DATETIME DEFAULT GETDATE()
                    );
                END
                ELSE
                BEGIN
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[bank_check_layouts]') AND name = 'width_cm')
                        ALTER TABLE [dbo].[bank_check_layouts] ADD [width_cm] DECIMAL(6,2) DEFAULT 17.80;
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[bank_check_layouts]') AND name = 'height_cm')
                        ALTER TABLE [dbo].[bank_check_layouts] ADD [height_cm] DECIMAL(6,2) DEFAULT 7.00;
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[bank_check_layouts]') AND name = 'is_custom')
                        ALTER TABLE [dbo].[bank_check_layouts] ADD [is_custom] TINYINT DEFAULT 0;
                END
            ");

            // Seed or update initial default bank positions if needed
            $defaults = [
                ['bank_name' => 'Bank Mandiri', 'tglX' => 11.50, 'tglY' => 1.55, 'vX' => 5.10, 'vY' => 2.25, 't1X' => 4.80, 't1Y' => 2.95, 't2X' => 3.10, 't2Y' => 3.65, 'nomX' => 12.60, 'nomY' => 3.15, 'width' => 17.80, 'height' => 7.00],
                ['bank_name' => 'Bank BCA', 'tglX' => 11.30, 'tglY' => 1.50, 'vX' => 6.40, 'vY' => 2.20, 't1X' => 6.10, 't1Y' => 3.00, 't2X' => 1.70, 't2Y' => 3.80, 'nomX' => 13.40, 'nomY' => 3.80, 'width' => 17.70, 'height' => 7.00],
                ['bank_name' => 'Bank Sinarmas', 'tglX' => 11.60, 'tglY' => 1.35, 'vX' => 6.80, 'vY' => 2.10, 't1X' => 6.10, 't1Y' => 2.50, 't2X' => 1.10, 't2Y' => 3.20, 'nomX' => 11.70, 'nomY' => 2.80, 'width' => 17.70, 'height' => 7.00],
                ['bank_name' => 'Maybank Indonesia', 'tglX' => 11.60, 'tglY' => 1.70, 'vX' => 5.60, 'vY' => 2.40, 't1X' => 5.10, 't1Y' => 3.00, 't2X' => 3.90, 't2Y' => 3.65, 'nomX' => 13.40, 'nomY' => 3.30, 'width' => 17.80, 'height' => 7.00],
            ];

            foreach ($defaults as $d) {
                $check = $this->db->prepare("SELECT vendor_y, terbilang1_x FROM bank_check_layouts WHERE bank_name = :b");
                $check->execute([':b' => $d['bank_name']]);
                $row = $check->fetch();
                if (!$row) {
                    $ins = $this->db->prepare("INSERT INTO bank_check_layouts (bank_name, tanggal_x, tanggal_y, vendor_x, vendor_y, terbilang1_x, terbilang1_y, terbilang2_x, terbilang2_y, nominal_x, nominal_y, width_cm, height_cm, is_custom, updated_at) VALUES (:b, :tglX, :tglY, :vX, :vY, :t1X, :t1Y, :t2X, :t2Y, :nomX, :nomY, :w, :h, 0, GETDATE())");
                    $ins->execute([':b' => $d['bank_name'], ':tglX' => $d['tglX'], ':tglY' => $d['tglY'], ':vX' => $d['vX'], ':vY' => $d['vY'], ':t1X' => $d['t1X'], ':t1Y' => $d['t1Y'], ':t2X' => $d['t2X'], ':t2Y' => $d['t2Y'], ':nomX' => $d['nomX'], ':nomY' => $d['nomY'], ':w' => $d['width'], ':h' => $d['height']]);
                } else {
                    // Force update old seed layout positions if they match previous seed values (e.g. vY == 2.00 for Mandiri)
                    $vY = (float)($row['vendor_y'] ?? 0);
                    $t1X = (float)($row['terbilang1_x'] ?? 0);
                    if ($vY == 2.00 || $t1X == 4.80 || $t1X == 4.60 || $vY == 0.00) {
                        $upd = $this->db->prepare("UPDATE bank_check_layouts SET tanggal_x = :tglX, tanggal_y = :tglY, vendor_x = :vX, vendor_y = :vY, terbilang1_x = :t1X, terbilang1_y = :t1Y, terbilang2_x = :t2X, terbilang2_y = :t2Y, nominal_x = :nomX, nominal_y = :nomY, width_cm = :w, height_cm = :h WHERE bank_name = :b");
                        $upd->execute([':b' => $d['bank_name'], ':tglX' => $d['tglX'], ':tglY' => $d['tglY'], ':vX' => $d['vX'], ':vY' => $d['vY'], ':t1X' => $d['t1X'], ':t1Y' => $d['t1Y'], ':t2X' => $d['t2X'], ':t2Y' => $d['t2Y'], ':nomX' => $d['nomX'], ':nomY' => $d['nomY'], ':w' => $d['width'], ':h' => $d['height']]);
                    }
                }
            }
        } catch (Exception $e) {
            // Log or ignore if table exists
        }
    }

    public function getCheckLayouts() {
        $this->initLayoutsTable();
        try {
            $stmt = $this->db->query("SELECT * FROM bank_check_layouts");
            $rows = $stmt->fetchAll();
            $result = [];
            foreach ($rows as $r) {
                $result[$r['bank_name']] = [
                    "bank_name" => $r['bank_name'],
                    "tanggalX" => (float)$r['tanggal_x'],
                    "tanggalY" => (float)$r['tanggal_y'],
                    "vendorX" => (float)$r['vendor_x'],
                    "vendorY" => (float)$r['vendor_y'],
                    "terbilang1X" => (float)$r['terbilang1_x'],
                    "terbilang1Y" => (float)$r['terbilang1_y'],
                    "terbilang2X" => (float)$r['terbilang2_x'],
                    "terbilang2Y" => (float)$r['terbilang2_y'],
                    "nominalX" => (float)$r['nominal_x'],
                    "nominalY" => (float)$r['nominal_y'],
                    "widthCm" => isset($r['width_cm']) ? (float)$r['width_cm'] : 17.80,
                    "heightCm" => isset($r['height_cm']) ? (float)$r['height_cm'] : 7.00,
                    "isCustom" => isset($r['is_custom']) ? (int)$r['is_custom'] : 0,
                ];
            }
            return $result;
        } catch (Exception $e) {
            return [];
        }
    }

    public function saveCheckLayout($body) {
        $this->initLayoutsTable();
        $bankName = isset($body['bank_name']) ? trim($body['bank_name']) : '';
        if (empty($bankName)) {
            http_response_code(400);
            return ["detail" => "Nama bank wajib diisi."];
        }

        $tglX = isset($body['tanggalX']) ? (float)$body['tanggalX'] : 0.0;
        $tglY = isset($body['tanggalY']) ? (float)$body['tanggalY'] : 0.0;
        $vX = isset($body['vendorX']) ? (float)$body['vendorX'] : 0.0;
        $vY = isset($body['vendorY']) ? (float)$body['vendorY'] : 0.0;
        $t1X = isset($body['terbilang1X']) ? (float)$body['terbilang1X'] : 0.0;
        $t1Y = isset($body['terbilang1Y']) ? (float)$body['terbilang1Y'] : 0.0;
        $t2X = isset($body['terbilang2X']) ? (float)$body['terbilang2X'] : 0.0;
        $t2Y = isset($body['terbilang2Y']) ? (float)$body['terbilang2Y'] : 0.0;
        $nomX = isset($body['nominalX']) ? (float)$body['nominalX'] : 0.0;
        $nomY = isset($body['nominalY']) ? (float)$body['nominalY'] : 0.0;
        $widthCm = isset($body['widthCm']) ? (float)$body['widthCm'] : (isset($body['width_cm']) ? (float)$body['width_cm'] : 17.80);
        $heightCm = isset($body['heightCm']) ? (float)$body['heightCm'] : (isset($body['height_cm']) ? (float)$body['height_cm'] : 7.00);
        $isCustom = isset($body['isCustom']) ? (int)$body['isCustom'] : (isset($body['is_custom']) ? (int)$body['is_custom'] : 0);

        $checkStmt = $this->db->prepare("SELECT 1 FROM bank_check_layouts WHERE bank_name = :bank_name");
        $checkStmt->execute([':bank_name' => $bankName]);
        $exists = $checkStmt->fetch();

        $params = [
            ':bank_name' => $bankName,
            ':tglX' => $tglX,
            ':tglY' => $tglY,
            ':vX' => $vX,
            ':vY' => $vY,
            ':t1X' => $t1X,
            ':t1Y' => $t1Y,
            ':t2X' => $t2X,
            ':t2Y' => $t2Y,
            ':nomX' => $nomX,
            ':nomY' => $nomY,
            ':widthCm' => $widthCm,
            ':heightCm' => $heightCm,
            ':isCustom' => $isCustom,
        ];

        if ($exists) {
            $stmt = $this->db->prepare("
                UPDATE bank_check_layouts
                SET tanggal_x = :tglX, tanggal_y = :tglY,
                    vendor_x = :vX, vendor_y = :vY,
                    terbilang1_x = :t1X, terbilang1_y = :t1Y,
                    terbilang2_x = :t2X, terbilang2_y = :t2Y,
                    nominal_x = :nomX, nominal_y = :nomY,
                    width_cm = :widthCm, height_cm = :heightCm,
                    is_custom = :isCustom,
                    updated_at = GETDATE()
                WHERE bank_name = :bank_name
            ");
        } else {
            $stmt = $this->db->prepare("
                INSERT INTO bank_check_layouts (bank_name, tanggal_x, tanggal_y, vendor_x, vendor_y, terbilang1_x, terbilang1_y, terbilang2_x, terbilang2_y, nominal_x, nominal_y, width_cm, height_cm, is_custom, updated_at)
                VALUES (:bank_name, :tglX, :tglY, :vX, :vY, :t1X, :t1Y, :t2X, :t2Y, :nomX, :nomY, :widthCm, :heightCm, :isCustom, GETDATE())
            ");
        }

        $stmt->execute($params);

        return [
            "message" => "Master ukuran format cek untuk {$bankName} berhasil disimpan ke database server.",
            "data" => $this->getCheckLayouts()
        ];
    }

    public function deleteCheckLayout($bankName) {
        $this->initLayoutsTable();
        $stmt = $this->db->prepare("DELETE FROM bank_check_layouts WHERE bank_name = :bank_name");
        $stmt->execute([':bank_name' => $bankName]);
        return [
            "message" => "Format layout cek bank {$bankName} berhasil dihapus dari database.",
            "data" => $this->getCheckLayouts()
        ];
    }
}

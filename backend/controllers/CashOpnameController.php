<?php
require_once __DIR__ . '/../config/database.php';

class CashOpnameController {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    private function serializeCashOpname(array $item): array {
        $settlementRows = [];
        $advanceRows = [];

        if (!empty($item['settlement_rows_json'])) {
            $settlementRows = json_decode($item['settlement_rows_json'], true) ?: [];
        }

        if (!empty($item['advance_rows_json'])) {
            $advanceRows = json_decode($item['advance_rows_json'], true) ?: [];
        }

        $dariTanggal = $item['dari_tanggal'] instanceof DateTime ? $item['dari_tanggal']->format('Y-m-d') : (string)$item['dari_tanggal'];
        $sampaiTanggal = $item['sampai_tanggal'] instanceof DateTime ? $item['sampai_tanggal']->format('Y-m-d') : (string)$item['sampai_tanggal'];
        $createdAt = $item['created_at'] instanceof DateTime ? $item['created_at']->format('Y-m-d\TH:i:s') : (string)$item['created_at'];

        return [
            "id" => (int)$item['id'],
            "dariTanggal" => $dariTanggal,
            "sampaiTanggal" => $sampaiTanggal,
            "jam" => $item['jam'],
            "saldoAwal" => (float)$item['saldo_awal'],
            "dibuatOleh1" => $item['dibuat_oleh_1'],
            "dibuatOleh2" => $item['dibuat_oleh_2'],
            "mengetahui" => $item['mengetahui'],
            "totalA" => (float)$item['total_a'],
            "totalB" => (float)$item['total_b'],
            "totalAB" => (float)$item['total_ab'],
            "saldoAkhir" => (float)$item['saldo_akhir'],
            "aksi" => $item['aksi'],
            "settlementRows" => $settlementRows,
            "advanceRows" => $advanceRows,
            "createdAt" => $createdAt
        ];
    }

    public function getSettlementRecap($queryParams) {
        $startDate = isset($queryParams['start_date']) ? $queryParams['start_date'] : null;
        $endDate = isset($queryParams['end_date']) ? $queryParams['end_date'] : null;

        if (!$startDate || !$endDate) {
            http_response_code(400);
            return ["detail" => "start_date dan end_date wajib diisi."];
        }

        $stmt = $this->db->prepare("
            SELECT * FROM settlements 
            WHERE settlement_date >= :start_date 
              AND settlement_date <= :end_date 
              AND is_deleted = 0
            ORDER BY settlement_date ASC, id ASC
        ");
        $stmt->execute([':start_date' => $startDate, ':end_date' => $endDate]);
        $settlements = $stmt->fetchAll();

        $result = [];
        foreach ($settlements as $item) {
            $tipe = strtoupper($item['source']) === 'ADVANCE' ? 'STLM' : 'RMB';
            $desc = $item['description'] ?: '';

            $settleDate = $item['settlement_date'] instanceof DateTime ? $item['settlement_date']->format('Y-m-d') : (string)$item['settlement_date'];

            $result[] = [
                "id" => (int)$item['id'],
                "tanggal" => $settleDate,
                "tipe" => $tipe,
                "kode" => $item['ppc_no'],
                "namaUser" => $item['employee_name'],
                "keterangan" => $desc,
                "jumlah" => (float)$item['settlement_amount']
            ];
        }

        return $result;
    }

    public function getAdvanceRecap($queryParams) {
        $startDate = isset($queryParams['start_date']) ? $queryParams['start_date'] : null;
        $endDate = isset($queryParams['end_date']) ? $queryParams['end_date'] : null;

        if (!$startDate || !$endDate) {
            http_response_code(400);
            return ["detail" => "start_date dan end_date wajib diisi."];
        }

        $stmt = $this->db->prepare("
            SELECT * FROM advance_requests 
            WHERE request_date >= :start_date 
              AND request_date <= :end_date 
              AND UPPER(status) IN ('ACTIVE', 'OVERDUE')
            ORDER BY request_date ASC, id ASC
        ");
        $stmt->execute([':start_date' => $startDate, ':end_date' => $endDate]);
        $advances = $stmt->fetchAll();

        $result = [];
        $idx = 1;
        foreach ($advances as $item) {
            $purpose = $item['purpose'] ?: '';
            $reqDate = $item['request_date'] instanceof DateTime ? $item['request_date']->format('Y-m-d') : (string)$item['request_date'];

            $result[] = [
                "id" => (int)$item['id'],
                "tanggal" => $reqDate,
                "tipe" => "UM" . $idx,
                "kode" => $item['ppc_no'],
                "namaUser" => $item['employee_name'],
                "keterangan" => $purpose,
                "jumlah" => (float)$item['amount'],
                "status" => $item['status']
            ];
            $idx++;
        }

        return $result;
    }

    public function getHistory() {
        $stmt = $this->db->prepare("
            SELECT * FROM cash_opnames 
            ORDER BY created_at DESC, id DESC
        ");
        $stmt->execute();
        $records = $stmt->fetchAll();

        $results = [];
        foreach ($records as $item) {
            $results[] = $this->serializeCashOpname($item);
        }

        return $results;
    }

    public function save($body) {
        $dariTanggal = isset($body['dariTanggal']) ? $body['dariTanggal'] : '';
        $sampaiTanggal = isset($body['sampaiTanggal']) ? $body['sampaiTanggal'] : '';
        $jam = isset($body['jam']) ? trim($body['jam']) : '';
        $saldoAwal = isset($body['saldoAwal']) ? (float)$body['saldoAwal'] : 0.0;
        $dibuatOleh1 = isset($body['dibuatOleh1']) ? trim($body['dibuatOleh1']) : '';
        $dibuatOleh2 = isset($body['dibuatOleh2']) ? trim($body['dibuatOleh2']) : '';
        $mengetahui = isset($body['mengetahui']) ? trim($body['mengetahui']) : '';
        $totalA = isset($body['totalA']) ? (float)$body['totalA'] : 0.0;
        $totalB = isset($body['totalB']) ? (float)$body['totalB'] : 0.0;
        $totalAB = isset($body['totalAB']) ? (float)$body['totalAB'] : 0.0;
        $saldoAkhir = isset($body['saldoAkhir']) ? (float)$body['saldoAkhir'] : 0.0;
        $aksi = isset($body['aksi']) && !empty($body['aksi']) ? $body['aksi'] : 'Simpan';
        $settlementRowsJson = json_encode(isset($body['settlementRows']) ? $body['settlementRows'] : []);
        $advanceRowsJson = json_encode(isset($body['advanceRows']) ? $body['advanceRows'] : []);

        $stmt = $this->db->prepare("
            INSERT INTO cash_opnames (dari_tanggal, sampai_tanggal, jam, saldo_awal, dibuat_oleh_1, dibuat_oleh_2, mengetahui, total_a, total_b, total_ab, saldo_akhir, aksi, settlement_rows_json, advance_rows_json, created_at) 
            VALUES (:dari, :sampai, :jam, :saldo_awal, :d1, :d2, :mengetahui, :total_a, :total_b, :total_ab, :saldo_akhir, :aksi, :settle_json, :adv_json, GETDATE())
        ");
        $stmt->execute([
            ':dari' => $dariTanggal,
            ':sampai' => $sampaiTanggal,
            ':jam' => $jam,
            ':saldo_awal' => $saldoAwal,
            ':d1' => $dibuatOleh1,
            ':d2' => $dibuatOleh2,
            ':mengetahui' => $mengetahui,
            ':total_a' => $totalA,
            ':total_b' => $totalB,
            ':total_ab' => $totalAB,
            ':saldo_akhir' => $saldoAkhir,
            ':aksi' => $aksi,
            ':settle_json' => $settlementRowsJson,
            ':adv_json' => $advanceRowsJson
        ]);

        $id = $this->db->lastInsertId();
        $fetchStmt = $this->db->prepare("SELECT * FROM cash_opnames WHERE id = :id");
        $fetchStmt->execute([':id' => $id]);
        $record = $fetchStmt->fetch();

        return [
            "message" => "Cash Opname berhasil disimpan.",
            "data" => $this->serializeCashOpname($record)
        ];
    }

    public function update($id, $body) {
        $stmt = $this->db->prepare("SELECT * FROM cash_opnames WHERE id = :id");
        $stmt->execute([':id' => $id]);
        if (!$stmt->fetch()) {
            http_response_code(404);
            return ["detail" => "Data Cash Opname tidak ditemukan."];
        }

        $dariTanggal = isset($body['dariTanggal']) ? $body['dariTanggal'] : '';
        $sampaiTanggal = isset($body['sampaiTanggal']) ? $body['sampaiTanggal'] : '';
        $jam = isset($body['jam']) ? trim($body['jam']) : '';
        $saldoAwal = isset($body['saldoAwal']) ? (float)$body['saldoAwal'] : 0.0;
        $dibuatOleh1 = isset($body['dibuatOleh1']) ? trim($body['dibuatOleh1']) : '';
        $dibuatOleh2 = isset($body['dibuatOleh2']) ? trim($body['dibuatOleh2']) : '';
        $mengetahui = isset($body['mengetahui']) ? trim($body['mengetahui']) : '';
        $totalA = isset($body['totalA']) ? (float)$body['totalA'] : 0.0;
        $totalB = isset($body['totalB']) ? (float)$body['totalB'] : 0.0;
        $totalAB = isset($body['totalAB']) ? (float)$body['totalAB'] : 0.0;
        $saldoAkhir = isset($body['saldoAkhir']) ? (float)$body['saldoAkhir'] : 0.0;
        $aksi = isset($body['aksi']) && !empty($body['aksi']) ? $body['aksi'] : 'Simpan';
        $settlementRowsJson = json_encode(isset($body['settlementRows']) ? $body['settlementRows'] : []);
        $advanceRowsJson = json_encode(isset($body['advanceRows']) ? $body['advanceRows'] : []);

        $upStmt = $this->db->prepare("
            UPDATE cash_opnames 
            SET dari_tanggal = :dari,
                sampai_tanggal = :sampai,
                jam = :jam,
                saldo_awal = :saldo_awal,
                dibuat_oleh_1 = :d1,
                dibuat_oleh_2 = :d2,
                mengetahui = :mengetahui,
                total_a = :total_a,
                total_b = :total_b,
                total_ab = :total_ab,
                saldo_akhir = :saldo_akhir,
                aksi = :aksi,
                settlement_rows_json = :settle_json,
                advance_rows_json = :adv_json
            WHERE id = :id
        ");
        $upStmt->execute([
            ':dari' => $dariTanggal,
            ':sampai' => $sampaiTanggal,
            ':jam' => $jam,
            ':saldo_awal' => $saldoAwal,
            ':d1' => $dibuatOleh1,
            ':d2' => $dibuatOleh2,
            ':mengetahui' => $mengetahui,
            ':total_a' => $totalA,
            ':total_b' => $totalB,
            ':total_ab' => $totalAB,
            ':saldo_akhir' => $saldoAkhir,
            ':aksi' => $aksi,
            ':settle_json' => $settlementRowsJson,
            ':adv_json' => $advanceRowsJson,
            ':id' => $id
        ]);

        $fetchStmt = $this->db->prepare("SELECT * FROM cash_opnames WHERE id = :id");
        $fetchStmt->execute([':id' => $id]);
        $record = $fetchStmt->fetch();

        return [
            "message" => "Cash Opname berhasil diperbarui.",
            "data" => $this->serializeCashOpname($record)
        ];
    }

    public function delete($id) {
        $stmt = $this->db->prepare("SELECT id FROM cash_opnames WHERE id = :id");
        $stmt->execute([':id' => $id]);
        if (!$stmt->fetch()) {
            http_response_code(404);
            return ["detail" => "Data Cash Opname tidak ditemukan."];
        }

        $delStmt = $this->db->prepare("DELETE FROM cash_opnames WHERE id = :id");
        $delStmt->execute([':id' => $id]);

        return [
            "id" => (int)$id,
            "message" => "Data Cash Opname berhasil dihapus."
        ];
    }
}

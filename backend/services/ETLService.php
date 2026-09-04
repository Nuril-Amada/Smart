<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/SimpleXlsxReader.php';

class ETLService {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    private function normalizeColumn(string $col): string {
        $col = strtolower(trim($col));
        $col = preg_replace('/[^a-z0-9]+/', '_', $col);
        $col = preg_replace('/_+/', '_', $col);
        return trim($col, '_');
    }
    
    private function normalizeCode($val): string {
        if ($val === null) return '';
        $str = trim((string)$val);
        // Remove trailing .0 from excel floats
        if (preg_match('/^\d+\.0$/', $str)) {
            $str = substr($str, 0, -2);
        }
        return $str;
    }

    private function parseDate($postDateStr): ?string {
        if ($postDateStr === null || $postDateStr === '') return null;

        if (is_numeric($postDateStr)) {
            $num = (float)$postDateStr;
            if ($num > 10000 && $num < 100000) {
                // Excel epoch offset (days since 1899-12-30)
                $unixTimestamp = (int)round(($num - 25569) * 86400);
                return date('Y-m-d', $unixTimestamp);
            }
        }

        $str = trim((string)$postDateStr);

        // Format DD.MM.YYYY or DD/MM/YYYY or DD-MM-YYYY
        if (preg_match('/^(\d{1,2})[\.\/-](\d{1,2})[\.\/-](\d{4})$/', $str, $m)) {
            $day = str_pad($m[1], 2, '0', STR_PAD_LEFT);
            $month = str_pad($m[2], 2, '0', STR_PAD_LEFT);
            $year = $m[3];
            return "{$year}-{$month}-{$day}";
        }

        // Format YYYY.MM.DD or YYYY/MM/DD or YYYY-MM-DD
        if (preg_match('/^(\d{4})[\.\/-](\d{1,2})[\.\/-](\d{1,2})$/', $str, $m)) {
            $year = $m[1];
            $month = str_pad($m[2], 2, '0', STR_PAD_LEFT);
            $day = str_pad($m[3], 2, '0', STR_PAD_LEFT);
            return "{$year}-{$month}-{$day}";
        }

        try {
            $dt = new DateTime($str);
            return $dt->format('Y-m-d');
        } catch (Exception $e) {
            return null;
        }
    }

    public function processSapImport(string $filePath, string $source): array {
        $rows = SimpleXlsxReader::parse($filePath);
        if (empty($rows)) {
            return ["message" => "File Excel kosong", "rows" => 0, "inserted" => 0, "skipped" => 0];
        }

        $headerRow = array_shift($rows);
        $colMap = [];
        foreach ($headerRow as $idx => $colName) {
            $norm = $this->normalizeColumn((string)$colName);
            if (in_array($norm, ['doc_date', 'posting_date', 'postingdate', 'pstng_date', 'pstngdate', 'document_date', 'documentdate', 'tanggal', 'date'])) {
                $colMap['posting_date'] = $idx;
            } else if (in_array($norm, ['documentno', 'document_no', 'document_number', 'doc_no', 'docno', 'no_dokumen', 'nodokumen', 'doc_number'])) {
                $colMap['document_no'] = $idx;
            } else if (in_array($norm, ['amount_in_doc_curr', 'amount_in_local_currency', 'amount_in_loc_curr', 'amount', 'dc_amount', 'nominal', 'jumlah', 'val_in_rep_cur'])) {
                $colMap['amount'] = $idx;
            } else if (in_array($norm, ['curr', 'currency', 'mata_uang', 'lcurr'])) {
                $colMap['currency'] = $idx;
            } else if (in_array($norm, ['g_l_acct', 'g_l_account', 'gl_account', 'gl_acct', 'gl', 'g_l', 'akun_gl', 'no_gl', 'account'])) {
                $colMap['gl_account'] = $idx;
            } else if (in_array($norm, ['cost_ctr', 'cost_center', 'costctr', 'pusat_biaya', 'cost_centre'])) {
                $colMap['cost_center'] = $idx;
            } else if (in_array($norm, ['reference', 'ref', 'referensi'])) {
                $colMap['reference'] = $idx;
            } else if (in_array($norm, ['document_header_text', 'transaction_type', 'doc_type', 'document_type', 'type', 'header_text', 'jenis_transaksi', 'tx_type'])) {
                $colMap['transaction_type'] = $idx;
            } else if (in_array($norm, ['text', 'description', 'sgtxt', 'item_text', 'keterangan'])) {
                $colMap['description'] = $idx;
            }
        }

        $table = strtolower($source) === 'perak' ? 'transactions_perak' : 'transactions';
        $inserted = 0;
        $skipped = 0;

        foreach ($rows as $row) {
            $postDateRaw = isset($colMap['posting_date']) ? $row[$colMap['posting_date']] ?? null : null;
            $docNo = isset($colMap['document_no']) ? $this->normalizeCode($row[$colMap['document_no']] ?? '') : '';
            $glAcc = isset($colMap['gl_account']) ? $this->normalizeCode($row[$colMap['gl_account']] ?? '') : '';

            $postDate = $this->parseDate($postDateRaw);

            if (empty($docNo) || empty($glAcc) || empty($postDate)) {
                $skipped++;
                continue;
            }

            $amount      = isset($colMap['amount'])           ? round((float)($row[$colMap['amount']] ?? 0), 2) : 0.0;
            $currency    = isset($colMap['currency'])         ? trim((string)($row[$colMap['currency']] ?? '')) : '';
            $costCenter  = isset($colMap['cost_center'])      ? $this->normalizeCode($row[$colMap['cost_center']] ?? '') : '';
            $reference   = isset($colMap['reference'])        ? $this->normalizeCode($row[$colMap['reference']] ?? '') : '';
            $transType   = isset($colMap['transaction_type']) ? trim((string)($row[$colMap['transaction_type']] ?? '')) : '';
            $description = isset($colMap['description'])      ? trim((string)($row[$colMap['description']] ?? '')) : '';

            $dt    = new DateTime($postDate);
            $month = (int)$dt->format('n');
            $year  = (int)$dt->format('Y');

            // Check duplicate
            $checkStmt = $this->db->prepare("SELECT id FROM {$table} WHERE document_no = :doc_no AND posting_date = :post_date");
            $checkStmt->execute([':doc_no' => $docNo, ':post_date' => $postDate]);
            if ($checkStmt->fetch()) {
                $skipped++;
                continue;
            }

            $stmt = $this->db->prepare("
                INSERT INTO {$table} (posting_date, document_no, amount, currency, gl_account, cost_center, reference, transaction_type, description, month, year, uploaded_at) 
                VALUES (:post_date, :doc_no, :amount, :currency, :gl_acc, :cost_ctr, :ref, :trans_type, :desc, :month, :year, GETDATE())
            ");
            $stmt->execute([
                ':post_date'  => $postDate,
                ':doc_no'     => $docNo,
                ':amount'     => $amount,
                ':currency'   => $currency,
                ':gl_acc'     => $glAcc,
                ':cost_ctr'   => $costCenter,
                ':ref'        => $reference,
                ':trans_type' => $transType,
                ':desc'       => $description,
                ':month'      => $month,
                ':year'       => $year
            ]);
            $inserted++;
        }

        return [
            "message"  => "Import SAP berhasil",
            "rows"     => count($rows),
            "inserted" => $inserted,
            "skipped"  => $skipped
        ];
    }
}

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
        if (strtolower($str) === 'nan' || strtolower($str) === 'none' || $str === '') return '';
        $str = str_replace("'", "", $str);
        // Remove trailing .0 or .00 from excel floats
        if (preg_match('/^\d+\.0+$/', $str)) {
            $str = preg_replace('/\.0+$/', '', $str);
        }
        return trim($str);
    }

    private function parseAmount($val): float {
        if ($val === null || $val === '') return 0.0;
        if (is_numeric($val)) return round((float)$val, 2);

        $str = trim((string)$val);
        if (empty($str)) return 0.0;

        $isNegative = false;
        if (str_ends_with($str, '-')) {
            $isNegative = true;
            $str = rtrim($str, '-');
        } else if (str_starts_with($str, '-') || (str_starts_with($str, '(') && str_ends_with($str, ')'))) {
            $isNegative = true;
            $str = trim($str, '-()');
        }

        // Handle string formats with dots and commas (e.g. 1.500.000,50 vs 1,500,000.50)
        if (strpos($str, '.') !== false && strpos($str, ',') !== false) {
            if (strrpos($str, ',') > strrpos($str, '.')) {
                // Indonesian/European style: 1.500.000,50
                $str = str_replace('.', '', $str);
                $str = str_replace(',', '.', $str);
            } else {
                // US style: 1,500,000.50
                $str = str_replace(',', '', $str);
            }
        } else if (strpos($str, ',') !== false) {
            // Comma decimal separator e.g. 1250,50
            if (preg_match('/^\d+,\d{1,2}$/', $str)) {
                $str = str_replace(',', '.', $str);
            } else {
                $str = str_replace(',', '', $str);
            }
        }

        $num = round((float)$str, 2);
        return $isNegative ? -$num : $num;
    }

    private function parseDate($postDateStr): ?string {
        if ($postDateStr === null || $postDateStr === '') return null;

        $str = trim((string)$postDateStr);
        $str = str_replace("'", "", $str);

        // Remove time component if present (e.g., "15/01/2026 00:00:00" -> "15/01/2026")
        if (strpos($str, ' ') !== false) {
            $str = explode(' ', $str)[0];
        }
        if (strpos($str, 'T') !== false) {
            $str = explode('T', $str)[0];
        }
        $str = trim($str);

        if (empty($str)) return null;

        // 1. Preprocess DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY (e.g. 15/01/2026 or 5.1.2026)
        if (preg_match('/^(\d{1,2})[\.\/-](\d{1,2})[\.\/-](\d{4})$/', $str, $m)) {
            $day = str_pad($m[1], 2, '0', STR_PAD_LEFT);
            $month = str_pad($m[2], 2, '0', STR_PAD_LEFT);
            $year = $m[3];
            if (checkdate((int)$month, (int)$day, (int)$year)) {
                return "{$year}-{$month}-{$day}";
            }
        }

        // 2. Preprocess YYYY.MM.DD, YYYY/MM/DD, YYYY-MM-DD (e.g. 2026-01-15)
        if (preg_match('/^(\d{4})[\.\/-](\d{1,2})[\.\/-](\d{1,2})$/', $str, $m)) {
            $year = $m[1];
            $month = str_pad($m[2], 2, '0', STR_PAD_LEFT);
            $day = str_pad($m[3], 2, '0', STR_PAD_LEFT);
            if (checkdate((int)$month, (int)$day, (int)$year)) {
                return "{$year}-{$month}-{$day}";
            }
        }

        // 3. Preprocess YYYYMMDD (8 digits e.g. 20260115)
        if (preg_match('/^(\d{4})(\d{2})(\d{2})$/', $str, $m)) {
            $year = $m[1];
            $month = $m[2];
            $day = $m[3];
            if (checkdate((int)$month, (int)$day, (int)$year)) {
                return "{$year}-{$month}-{$day}";
            }
        }

        // 4. Preprocess Excel Serial Numeric Float (e.g. 45678)
        if (is_numeric($str)) {
            $num = (float)$str;
            if ($num > 10000 && $num < 100000) {
                // Excel epoch offset (days since 1899-12-30)
                $unixTimestamp = (int)round(($num - 25569) * 86400);
                return date('Y-m-d', $unixTimestamp);
            }
        }

        // 5. Fallback DateTime parsing
        $dt = DateTime::createFromFormat('d/m/Y', $str);
        if ($dt !== false) {
            return $dt->format('Y-m-d');
        }

        try {
            $dtObj = new DateTime($str);
            return $dtObj->format('Y-m-d');
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
            if (in_array($norm, ['doc_date', 'posting_date', 'postingdate', 'pstng_date', 'pstngdate', 'document_date', 'documentdate', 'tanggal', 'date', 'doc_dte', 'pstng_dte'])) {
                $colMap['posting_date'] = $idx;
            } else if (in_array($norm, ['documentno', 'document_no', 'document_number', 'doc_no', 'docno', 'no_dokumen', 'nodokumen', 'doc_number', 'belnr', 'doc_num'])) {
                $colMap['document_no'] = $idx;
            } else if (in_array($norm, ['amount_in_doc_curr', 'amount_in_local_currency', 'amount_in_loc_curr', 'amount', 'dc_amount', 'nominal', 'jumlah', 'val_in_rep_cur', 'wrbtr', 'dmbtr'])) {
                $colMap['amount'] = $idx;
            } else if (in_array($norm, ['curr', 'currency', 'mata_uang', 'lcurr', 'waers'])) {
                $colMap['currency'] = $idx;
            } else if (in_array($norm, ['g_l_acct', 'g_l_account', 'gl_account', 'gl_acct', 'gl', 'g_l', 'akun_gl', 'no_gl', 'account', 'saknr', 'gl_acc', 'gl_account_no', 'no_akun'])) {
                $colMap['gl_account'] = $idx;
            } else if (in_array($norm, ['cost_ctr', 'cost_center', 'costctr', 'pusat_biaya', 'cost_centre', 'kostl'])) {
                $colMap['cost_center'] = $idx;
            } else if (in_array($norm, ['reference', 'ref', 'referensi', 'xblnr'])) {
                $colMap['reference'] = $idx;
            } else if (in_array($norm, ['document_header_text', 'transaction_type', 'doc_type', 'document_type', 'type', 'header_text', 'jenis_transaksi', 'tx_type', 'bktxt', 'blart'])) {
                $colMap['transaction_type'] = $idx;
            } else if (in_array($norm, ['text', 'description', 'sgtxt', 'item_text', 'keterangan'])) {
                $colMap['description'] = $idx;
            }
        }

        $table = strtolower($source) === 'perak' ? 'transactions_perak' : 'transactions';

        $inserted = 0;
        $skipped = 0;

        foreach ($rows as $row) {
            $transType = isset($colMap['transaction_type']) ? trim((string)($row[$colMap['transaction_type']] ?? '')) : '';
            
            // Transform step: Drop 'Bank In Transit' records (Document Header Text)
            $transTypeUpper = strtoupper($transType);
            if ($transTypeUpper === 'BANK IN TRANSIT' || str_contains($transTypeUpper, 'BANK IN TRANSIT')) {
                continue;
            }

            $postDateRaw = isset($colMap['posting_date']) ? $row[$colMap['posting_date']] ?? null : null;
            $docNo = isset($colMap['document_no']) ? $this->normalizeCode($row[$colMap['document_no']] ?? '') : '';
            $glAcc = isset($colMap['gl_account']) ? $this->normalizeCode($row[$colMap['gl_account']] ?? '') : '';

            $postDate = $this->parseDate($postDateRaw);

            // Loader step: Skip if essential fields (document_no or posting_date) are empty
            if (empty($docNo) || empty($postDate)) {
                $skipped++;
                continue;
            }

            $amountRaw = isset($colMap['amount']) ? $row[$colMap['amount']] ?? 0 : 0;
            $amount    = $this->parseAmount($amountRaw);

            $currency    = isset($colMap['currency'])         ? trim((string)($row[$colMap['currency']] ?? '')) : '';
            $costCenter  = isset($colMap['cost_center'])      ? $this->normalizeCode($row[$colMap['cost_center']] ?? '') : '';
            $reference   = isset($colMap['reference'])        ? $this->normalizeCode($row[$colMap['reference']] ?? '') : '';
            $description = isset($colMap['description'])      ? trim((string)($row[$colMap['description']] ?? '')) : '';

            $dt    = new DateTime($postDate);
            $month = (int)$dt->format('n');
            $year  = (int)$dt->format('Y');

            
            // Duplicate check: strictly check by document_no only (TEMPORARILY COMMENTED OUT FOR INSPECTION)
            $checkStmt = $this->db->prepare("SELECT id FROM {$table} WHERE document_no = :doc_no");
            $checkStmt->execute([':doc_no' => $docNo]);
            if ($checkStmt->fetch()) {
                $skipped++;
                continue;
            }

            $nowStr = date('Y-m-d H:i:s');
            $stmt = $this->db->prepare("
                INSERT INTO {$table} (posting_date, document_no, amount, currency, gl_account, cost_center, reference, transaction_type, description, month, year, uploaded_at) 
                VALUES (:post_date, :doc_no, :amount, :currency, :gl_acc, :cost_ctr, :ref, :trans_type, :desc, :month, :year, :uploaded_at)
            ");
            $stmt->execute([
                ':post_date'   => $postDate,
                ':doc_no'      => $docNo,
                ':amount'      => $amount,
                ':currency'    => $currency,
                ':gl_acc'      => $glAcc,
                ':cost_ctr'    => $costCenter,
                ':ref'         => $reference,
                ':trans_type'  => $transType,
                ':desc'        => $description,
                ':month'       => $month,
                ':year'        => $year,
                ':uploaded_at' => $nowStr
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

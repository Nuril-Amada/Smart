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
        // Handle scientific notation e.g. 1.20053e+07
        if (preg_match('/^\d+(\.\d+)?e\+\d+$/i', $str)) {
            $str = sprintf('%.0f', (float)$str);
        }
        return $str;
    }

    private function parseAmount($val): float {
        if ($val === null || $val === '') return 0.0;
        if (is_numeric($val)) {
            return abs((float)$val);
        }

        $str = trim((string)$val);
        // Remove currency codes, spaces, or non-numeric symbols except . , - ( )
        $str = preg_replace('/[^\d\.\,\-\(\)]/', '', $str);
        if ($str === '' || $str === '-') return 0.0;

        // Check if enclosed in parentheses (100.00)
        if (preg_match('/^\((.*)\)$/', $str, $m)) {
            $str = $m[1];
        }

        // Check trailing minus 100.00-
        if (substr($str, -1) === '-') {
            $str = substr($str, 0, -1);
        }
        // Check leading minus -100.00
        if (substr($str, 0, 1) === '-') {
            $str = substr($str, 1);
        }

        // Handle thousand & decimal separators
        if (strpos($str, '.') !== false && strpos($str, ',') !== false) {
            $lastDot = strrpos($str, '.');
            $lastComma = strrpos($str, ',');
            if ($lastComma > $lastDot) {
                // Indonesian/German format: 1.250.000,00 -> '.' thousand, ',' decimal
                $str = str_replace('.', '', $str);
                $str = str_replace(',', '.', $str);
            } else {
                // English format: 1,250,000.00 -> ',' thousand, '.' decimal
                $str = str_replace(',', '', $str);
            }
        } else if (strpos($str, ',') !== false && strpos($str, '.') === false) {
            $parts = explode(',', $str);
            if (count($parts) == 2 && strlen($parts[1]) <= 2) {
                $str = str_replace(',', '.', $str);
            } else {
                $str = str_replace(',', '', $str);
            }
        } else if (strpos($str, '.') !== false && strpos($str, ',') === false) {
            $parts = explode('.', $str);
            if (count($parts) > 2) {
                $str = str_replace('.', '', $str);
            }
        }

        return abs((float)$str);
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

        // Format YYYYMMDD (8 digits e.g. 20250707)
        if (preg_match('/^(\d{4})(\d{2})(\d{2})$/', $str, $m)) {
            $year = $m[1];
            $month = $m[2];
            $day = $m[3];
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

        $headerRowIdx = null;
        $colMap = [];

        // Scan top 20 rows to find actual header row
        $searchLimit = min(20, count($rows));
        for ($i = 0; $i < $searchLimit; $i++) {
            $candidateRow = $rows[$i];
            $tempColMap = [];
            foreach ($candidateRow as $idx => $colName) {
                $norm = $this->normalizeColumn((string)$colName);
                if (in_array($norm, ['posting_date', 'postingdate', 'pstng_date', 'pstngdate', 'pstng_dte', 'post_date', 'budat', 'tanggal', 'date'])) {
                    $tempColMap['posting_date'] = $idx;
                } else if (in_array($norm, ['doc_date', 'document_date', 'documentdate', 'doc_dte', 'bldat', 'belegdat'])) {
                    $tempColMap['document_date'] = $idx;
                } else if (in_array($norm, ['documentno', 'document_no', 'document_number', 'doc_no', 'docno', 'no_dokumen', 'nodokumen', 'doc_number', 'belnr', 'doc_num'])) {
                    $tempColMap['document_no'] = $idx;
                } else if (in_array($norm, ['amount_in_doc_curr', 'amount_in_local_currency', 'amount_in_loc_curr', 'amount', 'dc_amount', 'nominal', 'jumlah', 'val_in_rep_cur', 'wrbtr', 'dmbtr'])) {
                    $tempColMap['amount'] = $idx;
                } else if (in_array($norm, ['curr', 'currency', 'mata_uang', 'lcurr', 'waers'])) {
                    $tempColMap['currency'] = $idx;
                } else if (in_array($norm, ['g_l_acct', 'g_l_account', 'gl_account', 'gl_acct', 'gl', 'g_l', 'akun_gl', 'no_gl', 'account', 'saknr', 'gl_acc', 'g_l_acc', 'gl_account_no', 'no_akun'])) {
                    $tempColMap['gl_account'] = $idx;
                } else if (in_array($norm, ['cost_ctr', 'cost_center', 'costctr', 'pusat_biaya', 'cost_centre', 'kostl'])) {
                    $tempColMap['cost_center'] = $idx;
                } else if (in_array($norm, ['reference', 'ref', 'referensi', 'xblnr'])) {
                    $tempColMap['reference'] = $idx;
                } else if (in_array($norm, ['document_header_text', 'transaction_type', 'doc_type', 'document_type', 'type', 'header_text', 'jenis_transaksi', 'tx_type', 'bktxt', 'blart'])) {
                    $tempColMap['transaction_type'] = $idx;
                } else if (in_array($norm, ['text', 'description', 'sgtxt', 'item_text', 'keterangan'])) {
                    $tempColMap['description'] = $idx;
                }
            }

            if (isset($tempColMap['posting_date']) && isset($tempColMap['document_no'])) {
                $headerRowIdx = $i;
                $colMap = $tempColMap;
                break;
            }
        }

        if ($headerRowIdx === null) {
            $headerRow = array_shift($rows);
            foreach ($headerRow as $idx => $colName) {
                $norm = $this->normalizeColumn((string)$colName);
                if (in_array($norm, ['posting_date', 'postingdate', 'pstng_date', 'pstngdate', 'pstng_dte', 'post_date', 'budat', 'tanggal', 'date'])) {
                    $colMap['posting_date'] = $idx;
                } else if (in_array($norm, ['doc_date', 'document_date', 'documentdate', 'doc_dte', 'bldat', 'belegdat'])) {
                    $colMap['document_date'] = $idx;
                } else if (in_array($norm, ['documentno', 'document_no', 'document_number', 'doc_no', 'docno', 'no_dokumen', 'nodokumen', 'doc_number', 'belnr', 'doc_num'])) {
                    $colMap['document_no'] = $idx;
                } else if (in_array($norm, ['amount_in_doc_curr', 'amount_in_local_currency', 'amount_in_loc_curr', 'amount', 'dc_amount', 'nominal', 'jumlah', 'val_in_rep_cur', 'wrbtr', 'dmbtr'])) {
                    $colMap['amount'] = $idx;
                } else if (in_array($norm, ['curr', 'currency', 'mata_uang', 'lcurr', 'waers'])) {
                    $colMap['currency'] = $idx;
                } else if (in_array($norm, ['g_l_acct', 'g_l_account', 'gl_account', 'gl_acct', 'gl', 'g_l', 'akun_gl', 'no_gl', 'account', 'saknr', 'gl_acc', 'g_l_acc', 'gl_account_no', 'no_akun'])) {
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
        } else {
            $rows = array_slice($rows, $headerRowIdx + 1);
        }

        if (!isset($colMap['posting_date']) && isset($colMap['document_date'])) {
            $colMap['posting_date'] = $colMap['document_date'];
        }

        $table = strtolower($source) === 'perak' ? 'transactions_perak' : 'transactions';
        $inserted = 0;
        $skipped = 0;
        $seenInBatch = [];

        foreach ($rows as $row) {
            $transType = isset($colMap['transaction_type']) ? trim((string)($row[$colMap['transaction_type']] ?? '')) : '';

            // Drop 'BANK IN TRANSIT' records (Document Header Text)
            $transTypeUpper = strtoupper($transType);
            if ($transTypeUpper === 'BANK IN TRANSIT' || str_contains($transTypeUpper, 'BANK IN TRANSIT')) {
                continue;
            }

            $postDateRaw = isset($colMap['posting_date'])  ? $row[$colMap['posting_date']]  ?? null : null;
            $docDateRaw  = isset($colMap['document_date']) ? $row[$colMap['document_date']] ?? null : null;
            $docNo       = isset($colMap['document_no']) ? $this->normalizeCode($row[$colMap['document_no']] ?? '') : '';
            $glAccRaw    = isset($colMap['gl_account']) ? $this->normalizeCode($row[$colMap['gl_account']] ?? '') : '';
            $glAcc       = preg_match('/^0+(\d+)$/', $glAccRaw, $m) ? $m[1] : $glAccRaw;

            $postDate = $this->parseDate($postDateRaw);
            $docDate  = $this->parseDate($docDateRaw);

            // Only skip if document_no or posting_date is missing.
            // gl_account kosong tetap dimasukkan.
            if (empty($docNo) || empty($postDate)) {
                $skipped++;
                continue;
            }

            $amountRaw   = isset($colMap['amount'])           ? $row[$colMap['amount']] ?? 0 : 0;
            $amount      = $this->parseAmount($amountRaw);
            $currency    = isset($colMap['currency'])         ? trim((string)($row[$colMap['currency']] ?? '')) : '';
            $costCenter  = isset($colMap['cost_center'])      ? $this->normalizeCode($row[$colMap['cost_center']] ?? '') : '';
            $reference   = isset($colMap['reference'])        ? $this->normalizeCode($row[$colMap['reference']] ?? '') : '';
            $transType   = isset($colMap['transaction_type']) ? trim((string)($row[$colMap['transaction_type']] ?? '')) : '';
            $description = isset($colMap['description'])      ? trim((string)($row[$colMap['description']] ?? '')) : '';

            $dt    = new DateTime($postDate);
            $month = (int)$dt->format('n');
            $year  = (int)$dt->format('Y');

            // 1. Intra-batch duplicate check (baris ganda dalam file yang sama)
            $dedupKey = "{$docNo}|{$postDate}|{$glAcc}|" . sprintf('%.2f', $amount) . "|{$costCenter}|{$description}";
            if (isset($seenInBatch[$dedupKey])) {
                $skipped++;
                continue;
            }

            // 2. Inter-batch duplicate check (database existing records)
            if (!empty($glAcc)) {
                $checkSql = "
                    SELECT TOP 1 id FROM {$table} 
                    WHERE document_no = :doc_no 
                      AND posting_date = :post_date 
                      AND gl_account = :gl_acc 
                      AND ABS(amount - :amount) < 0.01
                      AND ISNULL(cost_center, '') = ISNULL(:cost_ctr, '')
                      AND ISNULL(description, '') = ISNULL(:desc, '')
                ";
                $checkStmt = $this->db->prepare($checkSql);
                $checkStmt->execute([
                    ':doc_no'    => $docNo,
                    ':post_date' => $postDate,
                    ':gl_acc'    => $glAcc,
                    ':amount'    => $amount,
                    ':cost_ctr'  => $costCenter,
                    ':desc'      => $description
                ]);
            } else {
                $checkSql = "
                    SELECT TOP 1 id FROM {$table} 
                    WHERE document_no = :doc_no 
                      AND posting_date = :post_date 
                      AND ABS(amount - :amount) < 0.01
                      AND ISNULL(cost_center, '') = ISNULL(:cost_ctr, '')
                      AND ISNULL(description, '') = ISNULL(:desc, '')
                ";
                $checkStmt = $this->db->prepare($checkSql);
                $checkStmt->execute([
                    ':doc_no'    => $docNo,
                    ':post_date' => $postDate,
                    ':amount'    => $amount,
                    ':cost_ctr'  => $costCenter,
                    ':desc'      => $description
                ]);
            }
            if ($checkStmt->fetch()) {
                $skipped++;
                continue;
            }

            $seenInBatch[$dedupKey] = true;

            $nowStr = date('Y-m-d H:i:s');
            $stmt = $this->db->prepare("
                INSERT INTO {$table} (document_date, posting_date, document_no, amount, currency, gl_account, cost_center, reference, transaction_type, description, month, year, uploaded_at) 
                VALUES (:doc_date, :post_date, :doc_no, :amount, :currency, :gl_acc, :cost_ctr, :ref, :trans_type, :desc, :month, :year, :uploaded_at)
            ");
            $stmt->execute([
                ':doc_date'    => $docDate,
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
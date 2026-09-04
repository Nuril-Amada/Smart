<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../services/SimplePdf.php';
require_once __DIR__ . '/../services/SimpleXlsxWriter.php';

class ExportController {
    private PDO $db;

    public function __construct() {
        date_default_timezone_set('Asia/Jakarta');
        $this->db = Database::getConnection();
    }

    private function rupiah(float $val): string {
        return "Rp " . number_format($val, 0, ',', '.');
    }

    private function countWorkdays(DateTime $start, DateTime $end): int {
        if ($start > $end) {
            return 0;
        }
        $days = 0;
        $current = clone $start;
        $current->setTime(0, 0, 0);
        $endDate = (clone $end)->setTime(0, 0, 0);

        while ($current <= $endDate) {
            $dayOfWeek = (int)$current->format('N');
            if ($dayOfWeek >= 1 && $dayOfWeek <= 5) { // Senin = 1 ... Jumat = 5 (5 Hari Kerja)
                $days++;
            }
            $current->modify('+1 day');
        }
        return $days;
    }

    // EXPORT DASHBOARD EXCEL (.xlsx)

    public function exportExcel($queryParams) {
        $source = isset($queryParams['source']) ? $queryParams['source'] : 'rungkut';
        $startDate = isset($queryParams['start_date']) && !empty($queryParams['start_date']) ? $queryParams['start_date'] : null;
        $endDate = isset($queryParams['end_date']) && !empty($queryParams['end_date']) ? $queryParams['end_date'] : null;

        $table = strtolower($source) === 'perak' ? 'transactions_perak' : 'transactions';
        $where = [];
        $params = [];

        if ($startDate) {
            $where[] = "t.posting_date >= :start_date";
            $params[':start_date'] = $startDate;
        }
        if ($endDate) {
            $where[] = "t.posting_date <= :end_date";
            $params[':end_date'] = $endDate;
        }

        $whereClause = count($where) > 0 ? " WHERE " . implode(" AND ", $where) : "";

        $sql = "
            SELECT 
                t.posting_date,
                t.document_no,
                t.amount,
                t.currency,
                t.gl_account,
                g.nama_gl_account,
                t.cost_center,
                t.reference,
                t.transaction_type,
                t.description,
                t.month,
                t.year,
                t.uploaded_at
            FROM {$table} t
            LEFT JOIN gl_accounts g ON t.gl_account = g.gl_account
            {$whereClause}
            ORDER BY t.posting_date ASC, t.id ASC
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        $headers = [
            "Posting Date", "Document No", "Amount", "Currency",
            "GL Account", "Cost Center", "Reference", "Transaction Type",
            "Description"
        ];

        $dataRows = [];
        foreach ($rows as $r) {
            $pDate = $r['posting_date'] instanceof DateTime 
                ? $r['posting_date']->format('d/m/Y') 
                : date('d/m/Y', strtotime($r['posting_date']));

            $docNo = is_numeric($r['document_no']) ? (int)$r['document_no'] : (string)$r['document_no'];
            $glAcc = is_numeric($r['gl_account']) ? (int)$r['gl_account'] : (string)$r['gl_account'];

            $dataRows[] = [
                $pDate,
                $docNo,
                (float)$r['amount'],
                !empty($r['currency']) ? (string)$r['currency'] : 'IDR',
                $glAcc,
                (string)$r['cost_center'],
                (string)$r['reference'],
                (string)$r['transaction_type'],
                (string)$r['description']
            ];
        }

        $filename = "Export_Dashboard_{$source}.xlsx";
        SimpleXlsxWriter::createXlsx($headers, $dataRows, $filename);
    }

    // =========================================================
    // EXPORT SETTLEMENT EXCEL (.xlsx)
    // =========================================================
    public function exportSettlement($queryParams) {
        $isAll = function(?string $val): bool {
            if ($val === null || trim($val) === '') return true;
            $v = strtolower(trim($val));
            return in_array($v, ['all', 'all source', 'all status', 'semua', 'semua status', 'semua user', 'semua cost center', 'null', 'undefined']);
        };

        $startDate  = isset($queryParams['start_date']) && !$isAll($queryParams['start_date']) ? trim($queryParams['start_date']) : null;
        $endDate    = isset($queryParams['end_date']) && !$isAll($queryParams['end_date']) ? trim($queryParams['end_date']) : null;
        $empName    = isset($queryParams['employee_name']) && !$isAll($queryParams['employee_name']) ? trim($queryParams['employee_name']) : null;
        $costCenter = isset($queryParams['cost_center']) && !$isAll($queryParams['cost_center']) ? trim($queryParams['cost_center']) : null;
        $status     = isset($queryParams['status']) && !$isAll($queryParams['status']) ? trim($queryParams['status']) : null;
        $source     = isset($queryParams['source']) && !$isAll($queryParams['source']) ? trim($queryParams['source']) : null;

        $where = ["(is_deleted IS NULL OR is_deleted = 0)"];
        $params = [];

        if ($startDate) {
            $where[] = "settlement_date >= :start_date";
            $params[':start_date'] = $startDate;
        }
        if ($endDate) {
            $where[] = "settlement_date <= :end_date";
            $params[':end_date'] = $endDate;
        }
        if ($empName) {
            $where[] = "LOWER(employee_name) LIKE LOWER(:emp_name)";
            $params[':emp_name'] = '%' . $empName . '%';
        }
        if ($costCenter) {
            $where[] = "LOWER(cost_center) LIKE LOWER(:cost_center)";
            $params[':cost_center'] = '%' . $costCenter . '%';
        }

        $applySourceOrStatus = function($val) use (&$where, &$params) {
            if (!$val) return;
            $vLower = strtolower($val);
            if ($vLower === 'checked' || $vLower === 'ya') {
                $where[] = "is_checked = 1";
            } else if ($vLower === 'unchecked' || $vLower === 'tidak') {
                $where[] = "(is_checked = 0 OR is_checked IS NULL)";
            } else if ($vLower === 'settlement' || $vLower === 'advance') {
                $where[] = "(LOWER(source) = 'settlement' OR LOWER(source) = 'advance')";
            } else if ($vLower === 'reimbursement') {
                $where[] = "LOWER(source) = 'reimbursement'";
            } else {
                $where[] = "LOWER(source) = LOWER(:src_val)";
                $params[':src_val'] = $val;
            }
        };

        if ($source) {
            $applySourceOrStatus($source);
        } else if ($status) {
            $applySourceOrStatus($status);
        }

        $whereClause = count($where) > 0 ? " WHERE " . implode(" AND ", $where) : "";

        $sql = "SELECT * FROM settlements {$whereClause} ORDER BY settlement_date DESC, id DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        $headers = ["Tanggal Settlement", "No PPC", "Tipe", "Nama Employee", "Cost Center", "Keterangan", "Nominal Settlement", "Currency", "Checked"];
        $dataRows = [];

        foreach ($rows as $r) {
            $sDate = $r['settlement_date'] instanceof DateTime ? $r['settlement_date']->format('d/m/Y') : date('d/m/Y', strtotime($r['settlement_date']));
            $isChecked = (!empty($r['is_checked']) && $r['is_checked']) ? 'Ya' : 'Tidak';
            $dataRows[] = [
                $sDate,
                $r['ppc_no'],
                strtoupper($r['source'] ?? '-'),
                $r['employee_name'],
                $r['cost_center'],
                $r['description'],
                (float)$r['settlement_amount'],
                'IDR',
                $isChecked
            ];
        }

        $filename = "Settlement_Report.xlsx";
        SimpleXlsxWriter::createXlsx($headers, $dataRows, $filename);
    }

    // =========================================================
    // EXPORT ADVANCE EXCEL (.xlsx)
    // =========================================================
    public function exportAdvance($queryParams) {
        $isAll = function(?string $val): bool {
            if ($val === null || trim($val) === '') return true;
            $v = strtolower(trim($val));
            return in_array($v, ['all', 'all status', 'semua', 'semua status', 'semua user', 'semua cost center', 'null', 'undefined']);
        };

        $startDate  = isset($queryParams['start_date']) && !$isAll($queryParams['start_date']) ? trim($queryParams['start_date']) : null;
        $endDate    = isset($queryParams['end_date']) && !$isAll($queryParams['end_date']) ? trim($queryParams['end_date']) : null;
        $empName    = isset($queryParams['employee_name']) && !$isAll($queryParams['employee_name']) ? trim($queryParams['employee_name']) : null;
        $costCenter = isset($queryParams['cost_center']) && !$isAll($queryParams['cost_center']) ? trim($queryParams['cost_center']) : null;
        $status     = isset($queryParams['status']) && !$isAll($queryParams['status']) ? trim($queryParams['status']) : null;

        $where = [];
        $params = [];

        if ($startDate) {
            $where[] = "request_date >= :start_date";
            $params[':start_date'] = $startDate;
        }
        if ($endDate) {
            $where[] = "request_date <= :end_date";
            $params[':end_date'] = $endDate;
        }
        if ($empName) {
            $where[] = "LOWER(employee_name) LIKE LOWER(:emp_name)";
            $params[':emp_name'] = '%' . $empName . '%';
        }
        if ($costCenter) {
            $where[] = "LOWER(cost_center) LIKE LOWER(:cost_center)";
            $params[':cost_center'] = '%' . $costCenter . '%';
        }
        if ($status) {
            $stUpper = strtoupper($status);
            if ($stUpper === 'CANCELED' || $stUpper === 'CANCEL') {
                $where[] = "(UPPER(status) = 'CANCEL' OR UPPER(status) = 'CANCELED')";
            } else {
                $where[] = "UPPER(status) = :status";
                $params[':status'] = $stUpper;
            }
        }

        $whereClause = count($where) > 0 ? " WHERE " . implode(" AND ", $where) : "";

        $sql = "SELECT * FROM advance_requests {$whereClause} ORDER BY request_date DESC, id DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        $headers = ["Tanggal Pengajuan", "No PPC", "Nama Employee", "Cost Center", "Tujuan", "Nominal", "Currency", "Tanggal Penyelesaian", "Status"];
        $dataRows = [];

        foreach ($rows as $r) {
            $rDate = $r['request_date'] instanceof DateTime ? $r['request_date']->format('d/m/Y') : date('d/m/Y', strtotime($r['request_date']));
            $dDate = $r['due_date'] instanceof DateTime ? $r['due_date']->format('d/m/Y') : date('d/m/Y', strtotime($r['due_date']));
            $dataRows[] = [
                $rDate,
                $r['ppc_no'],
                $r['employee_name'],
                $r['cost_center'],
                $r['purpose'],
                (float)$r['amount'],
                'IDR',
                $dDate,
                strtoupper($r['status'])
            ];
        }

        $filename = "Advance_Report.xlsx";
        SimpleXlsxWriter::createXlsx($headers, $dataRows, $filename);
    }

    // =========================================================
    // EXPORT CHECK EXCEL (.xlsx)
    // =========================================================
    public function exportCheck($queryParams) {
        $isAll = function(?string $val): bool {
            if ($val === null || trim($val) === '') return true;
            $v = strtolower(trim($val));
            return in_array($v, ['all', 'semua', 'semua bank', 'null', 'undefined']);
        };

        $startDate = isset($queryParams['start_date']) && !$isAll($queryParams['start_date']) ? trim($queryParams['start_date']) : null;
        $endDate   = isset($queryParams['end_date']) && !$isAll($queryParams['end_date']) ? trim($queryParams['end_date']) : null;
        $bankType  = isset($queryParams['bank_type']) && !$isAll($queryParams['bank_type']) ? trim($queryParams['bank_type']) : null;
        $transType = isset($queryParams['transaction_type']) && !$isAll($queryParams['transaction_type']) ? trim($queryParams['transaction_type']) : null;
        $vendor    = isset($queryParams['vendor']) && !$isAll($queryParams['vendor']) ? trim($queryParams['vendor']) : null;

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
        if ($bankType) {
            $btLower = strtolower(trim($bankType));
            // Gunakan keyword matching eksplisit untuk menghindari str_ireplace
            // yang secara destruktif menghapus substring 'bank' dari dalam kata 'Maybank'
            if (strpos($btLower, 'maybank') !== false) {
                $where[] = "LOWER(bank_type) LIKE '%maybank%'";
            } elseif (strpos($btLower, 'mandiri') !== false) {
                $where[] = "LOWER(bank_type) LIKE '%mandiri%'";
            } elseif (strpos($btLower, 'bca') !== false) {
                $where[] = "LOWER(bank_type) LIKE '%bca%'";
            } elseif (strpos($btLower, 'sinarmas') !== false) {
                $where[] = "LOWER(bank_type) LIKE '%sinarmas%'";
            } else {
                // Fallback: strip prefix 'Bank ' saja (bukan ' Indonesia') agar aman
                $cleanBank = trim(preg_replace('/^bank\s+/i', '', trim($bankType)));
                $where[] = "LOWER(bank_type) LIKE LOWER(:bank_type)";
                $params[':bank_type'] = '%' . $cleanBank . '%';
            }
        }
        if ($transType) {
            $where[] = "transaction_type = :trans_type";
            $params[':trans_type'] = $transType;
        }
        if ($vendor) {
            $where[] = "LOWER(vendor_name) LIKE LOWER(:vendor)";
            $params[':vendor'] = '%' . $vendor . '%';
        }

        $whereClause = count($where) > 0 ? " WHERE " . implode(" AND ", $where) : "";

        $sql = "SELECT * FROM printed_checks {$whereClause} ORDER BY updated_at DESC, id DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        $headers = ["Tanggal", "Nomor Cek", "Jenis Cek", "Bank", "Vendor", "Nomor Rekening", "Nominal", "Currency"];
        $dataRows = [];

        foreach ($rows as $r) {
            $tDate = $r['transaction_date'] instanceof DateTime ? $r['transaction_date']->format('d/m/Y') : date('d/m/Y', strtotime($r['transaction_date']));
            $bankVal = $r['bank_type'];
            $bankLabel = "";
            if ($bankVal) {
                if (strcasecmp($bankVal, 'Maybank') === 0 || strcasecmp($bankVal, 'Maybank Indonesia') === 0) {
                    $bankLabel = "Maybank Indonesia";
                } else {
                    $bankLabel = "Bank {$bankVal}";
                }
            } else {
                $bankLabel = "-";
            }

            $dataRows[] = [
                $tDate,
                $r['check_number'],
                $r['transaction_type'],
                $bankLabel,
                $r['vendor_name'],
                $r['vendor_account_number'],
                (float)$r['amount'],
                'IDR'
            ];
        }

        $filename = "Printed_Checks_" . date('Ymd_His') . ".xlsx";
        SimpleXlsxWriter::createXlsx($headers, $dataRows, $filename);
    }

    // =========================================================
    // EXPORT VENDOR EXCEL (.xlsx)
    // =========================================================
    public function exportVendor($queryParams) {
        $search = isset($queryParams['search']) ? trim($queryParams['search']) : '';
        $whereClause = "";
        $params = [];

        if (!empty($search)) {
            $whereClause = " WHERE LOWER(vendor_name) LIKE LOWER(:search)";
            $params[':search'] = '%' . $search . '%';
        }

        $sql = "SELECT * FROM vendors {$whereClause} ORDER BY vendor_name ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        $headers = ["Nama Vendor", "Nama Bank", "Nama Pemilik Rekening", "Nomor Rekening"];
        $dataRows = [];

        foreach ($rows as $r) {
            $bankAcc = is_numeric($r['bank_account_no']) ? (int)$r['bank_account_no'] : (string)$r['bank_account_no'];
            $dataRows[] = [
                (string)$r['vendor_name'],
                (string)$r['bank_name'],
                (string)$r['bank_account_name'],
                $bankAcc
            ];
        }

        $filename = "Vendors_" . date('Ymd_His') . ".xlsx";
        SimpleXlsxWriter::createXlsx($headers, $dataRows, $filename);
    }

    // =========================================================
    // EXPORT DASHBOARD PDF (Binary PDF - %PDF-1.4)
    // Features vertical table borders & Rp. left-aligned / amount right-aligned
    // =========================================================
    public function exportPdf($queryParams) {
        $source = isset($queryParams['source']) ? $queryParams['source'] : 'rungkut';
        $startDate = isset($queryParams['start_date']) && !empty($queryParams['start_date']) ? $queryParams['start_date'] : null;
        $endDate = isset($queryParams['end_date']) && !empty($queryParams['end_date']) ? $queryParams['end_date'] : null;
        $trendGroup = isset($queryParams['trend_group']) ? strtolower($queryParams['trend_group']) : 'month';

        $table = strtolower($source) === 'perak' ? 'transactions_perak' : 'transactions';
        $where = [];
        $params = [];

        if ($startDate) {
            $where[] = "posting_date >= :start_date";
            $params[':start_date'] = $startDate;
        }
        if ($endDate) {
            $where[] = "posting_date <= :end_date";
            $params[':end_date'] = $endDate;
        }

        $whereClause = count($where) > 0 ? " WHERE " . implode(" AND ", $where) : "";

        // 1. Summary
        $sumSql = "
            SELECT 
                SUM(amount) AS total_expense,
                COUNT(id) AS total_transactions,
                COUNT(DISTINCT gl_account) AS total_gl_accounts,
                COUNT(DISTINCT cost_center) AS total_cost_centers,
                MIN(posting_date) AS min_date,
                MAX(posting_date) AS max_date
            FROM {$table}
            {$whereClause}
        ";
        $stmt = $this->db->prepare($sumSql);
        $stmt->execute($params);
        $sumRow = $stmt->fetch();

        $totExpense = $sumRow && $sumRow['total_expense'] !== null ? (float)$sumRow['total_expense'] : 0.0;
        $totTrans   = $sumRow && $sumRow['total_transactions'] !== null ? (int)$sumRow['total_transactions'] : 0;
        $totCc      = $sumRow && $sumRow['total_cost_centers'] !== null ? (int)$sumRow['total_cost_centers'] : 0;

        $minDateStr = $sumRow['min_date'] ?? null;
        $maxDateStr = $sumRow['max_date'] ?? null;

        $startObj = null;
        $endObj = null;

        if ($startDate) {
            $startObj = new DateTime($startDate);
        } else if ($minDateStr) {
            $startObj = new DateTime($minDateStr);
        }

        if ($endDate) {
            $endObj = new DateTime($endDate);
        } else if ($maxDateStr) {
            $endObj = new DateTime($maxDateStr);
        }

        if ($startObj && $endObj) {
            $totalDays = $this->countWorkdays($startObj, $endObj);
        } else {
            $totalDays = 1;
        }

        if ($totalDays <= 0) {
            $totalDays = 1;
        }

        $avgDaily = $totExpense / $totalDays;

        // 2. Top GL Accounts
        $glWhere = [];
        $glParams = [];
        if ($startDate) { $glWhere[] = "t.posting_date >= :start_date"; $glParams[':start_date'] = $startDate; }
        if ($endDate) { $glWhere[] = "t.posting_date <= :end_date"; $glParams[':end_date'] = $endDate; }
        $glWhereClause = count($glWhere) > 0 ? " WHERE " . implode(" AND ", $glWhere) : "";

        $glSql = "
            SELECT TOP 10 t.gl_account, g.nama_gl_account, SUM(t.amount) AS total_amount
            FROM {$table} t
            LEFT JOIN gl_accounts g ON t.gl_account = g.gl_account
            {$glWhereClause}
            GROUP BY t.gl_account, g.nama_gl_account
            ORDER BY SUM(t.amount) DESC
        ";
        $glStmt = $this->db->prepare($glSql);
        $glStmt->execute($glParams);
        $topGl = $glStmt->fetchAll();

        // 3. Top Cost Centers
        $ccSql = "
            SELECT TOP 10 cost_center, SUM(amount) AS total_amount
            FROM {$table}
            {$whereClause}
            GROUP BY cost_center
            ORDER BY SUM(amount) DESC
        ";
        $ccStmt = $this->db->prepare($ccSql);
        $ccStmt->execute($params);
        $topCc = $ccStmt->fetchAll();

        // 4. Detail of Highest Cost Center
        $topCostCenterObj = reset($topCc);
        $topCcDetails = [];
        $topCcCode = null;
        if ($topCostCenterObj) {
            $topCcCode = $topCostCenterObj['cost_center'];
            $detailWhere = ["t.cost_center = :top_cc"];
            $detailParams = [':top_cc' => $topCcCode];
            if ($startDate) { $detailWhere[] = "t.posting_date >= :start_date"; $detailParams[':start_date'] = $startDate; }
            if ($endDate) { $detailWhere[] = "t.posting_date <= :end_date"; $detailParams[':end_date'] = $endDate; }
            $detailWhereClause = count($detailWhere) > 0 ? " WHERE " . implode(" AND ", $detailWhere) : "";

            $detailSql = "
                SELECT t.gl_account, g.nama_gl_account, SUM(t.amount) AS total_amount
                FROM {$table} t
                LEFT JOIN gl_accounts g ON t.gl_account = g.gl_account
                {$detailWhereClause}
                GROUP BY t.gl_account, g.nama_gl_account
                ORDER BY SUM(t.amount) DESC
            ";
            $detailStmt = $this->db->prepare($detailSql);
            $detailStmt->execute($detailParams);
            $topCcDetails = $detailStmt->fetchAll();
        }

        // 5. Trend
        if ($trendGroup === 'day') {
            $trendSql = "
                SELECT CAST(posting_date AS DATE) AS period, SUM(amount) AS total_amount
                FROM {$table} {$whereClause}
                GROUP BY CAST(posting_date AS DATE)
                ORDER BY CAST(posting_date AS DATE) ASC
            ";
        } else {
            $trendSql = "
                SELECT year, month, SUM(amount) AS total_amount
                FROM {$table} {$whereClause}
                GROUP BY year, month
                ORDER BY year ASC, month ASC
            ";
        }
        $trendStmt = $this->db->prepare($trendSql);
        $trendStmt->execute($params);
        $trendRows = $trendStmt->fetchAll();

        // BUILD PDF using SimplePdf
        $pdf = new SimplePdf();
        $navy = [31, 78, 120];

        // PAGE 1: Header + Summary + Top 10 GL
        $pdf->addPage();

        date_default_timezone_set('Asia/Jakarta');
        $fmtStart = $startDate ? date('d/m/Y', strtotime($startDate)) : null;
        $fmtEnd = $endDate ? date('d/m/Y', strtotime($endDate)) : null;
        $periodText = (!$fmtStart && !$fmtEnd) ? "All Data" : (($fmtStart && $fmtEnd) ? "{$fmtStart} s/d {$fmtEnd}" : ($fmtStart ? "{$fmtStart} s/d Sekarang" : "Sampai {$fmtEnd}"));
        $generatedText = date('d/m/Y H:i') . " WIB";

        // Header Title (Center Aligned)
        $locTitleName = strtolower($source) === "perak" ? "Perak" : "Rungkut";
        $pdf->writeTextCentered(40, "Petty Cash {$locTitleName} Report", 18, true, $navy);
        $pdf->writeTextCentered(62, "Period : {$periodText}", 10, false, [75, 85, 99]);
        $pdf->writeTextCentered(76, "Generated : {$generatedText}", 10, false, [75, 85, 99]);
        $pdf->drawLine(40, 90, 555, 90, 1.0, [203, 213, 225]);

        // Section: Dashboard Summary
        $y = 110;
        $pdf->writeText(40, $y, "Dashboard Summary", 13, true, $navy);
        $y += 15;

        // Table Summary Header & Rows (with vertical borders & currency alignment)
        $sumWidths = [255, 260];
        $pdf->drawTableRow(40, $y, 20, $sumWidths, [
            ['text' => 'Metric', 'align' => 'center'],
            ['text' => 'Value', 'align' => 'center']
        ], true, $navy);
        $y += 20;

        $sumItems = [
            ["Total Expense", ['type' => 'currency', 'text' => $totExpense]],
            ["Total Transaction", ['type' => 'text', 'text' => number_format($totTrans), 'align' => 'right']],
            ["Total Cost Center", ['type' => 'text', 'text' => number_format($totCc), 'align' => 'right']],
            ["Average Daily Expense", ['type' => 'currency', 'text' => $avgDaily]]
        ];

        foreach ($sumItems as $item) {
            $pdf->drawTableRow(40, $y, 18, $sumWidths, [
                ['text' => $item[0], 'align' => 'left'],
                $item[1]
            ], false, [255, 255, 255], [203, 213, 225]);
            $y += 18;
        }

        // Section: Top 10 GL Account
        $y += 25;
        $pdf->writeText(40, $y, "Top 10 GL Account", 13, true, $navy);
        $y += 15;

        $glWidths = [90, 235, 120, 70];
        $pdf->drawTableRow(40, $y, 20, $glWidths, [
            ['text' => 'GL Account', 'align' => 'center'],
            ['text' => 'GL Name', 'align' => 'center'],
            ['text' => 'Amount', 'align' => 'center'],
            ['text' => '%', 'align' => 'center']
        ], true, $navy);
        $y += 20;

        foreach ($topGl as $g) {
            $pct = $totExpense > 0 ? sprintf("%.2f%%", ($g['total_amount'] / $totExpense) * 100) : "0.00%";
            $gName = $g['nama_gl_account'] ?: '-';

            $pdf->drawTableRow(40, $y, 18, $glWidths, [
                ['text' => $g['gl_account'], 'align' => 'left'],
                ['text' => $gName, 'align' => 'left'],
                ['type' => 'currency', 'text' => $g['total_amount']],
                ['text' => $pct, 'align' => 'left']
            ], false, [255, 255, 255], [203, 213, 225]);
            $y += 18;
        }

        // PAGE 2: Top 10 Cost Center + Expense Detail
        $pdf->addPage();
        $y = 40;
        $pdf->writeText(40, $y, "Top 10 Cost Center", 13, true, $navy);
        $y += 15;

        $ccWidths = [210, 215, 90];
        $pdf->drawTableRow(40, $y, 20, $ccWidths, [
            ['text' => 'Cost Center', 'align' => 'center'],
            ['text' => 'Amount', 'align' => 'center'],
            ['text' => '%', 'align' => 'center']
        ], true, $navy);
        $y += 20;

        foreach ($topCc as $c) {
            $pct = $totExpense > 0 ? sprintf("%.2f%%", ($c['total_amount'] / $totExpense) * 100) : "0.00%";
            $pdf->drawTableRow(40, $y, 18, $ccWidths, [
                ['text' => $c['cost_center'], 'align' => 'left'],
                ['type' => 'currency', 'text' => $c['total_amount']],
                ['text' => $pct, 'align' => 'left']
            ], false, [255, 255, 255], [203, 213, 225]);
            $y += 18;
        }

        $y += 25;
        $pdf->writeText(40, $y, "Expense Detail by Top Cost Center", 13, true, $navy);
        $y += 15;
        if ($topCcCode) {
            $pdf->writeText(40, $y, "Cost Center : {$topCcCode}", 10, true, [51, 65, 85]);
            $y += 15;

            $pdf->drawTableRow(40, $y, 20, $glWidths, [
                ['text' => 'GL Account', 'align' => 'center'],
                ['text' => 'GL Name', 'align' => 'center'],
                ['text' => 'Amount', 'align' => 'center'],
                ['text' => '%', 'align' => 'center']
            ], true, $navy);
            $y += 20;

            $topCcTotal = (float)($topCostCenterObj['total_amount'] ?? 1);
            foreach ($topCcDetails as $d) {
                $pct = $topCcTotal > 0 ? sprintf("%.2f%%", ($d['total_amount'] / $topCcTotal) * 100) : "0.00%";
                $dName = $d['nama_gl_account'] ?: '-';

                $pdf->drawTableRow(40, $y, 18, $glWidths, [
                    ['text' => $d['gl_account'], 'align' => 'left'],
                    ['text' => $dName, 'align' => 'left'],
                    ['type' => 'currency', 'text' => $d['total_amount']],
                    ['text' => $pct, 'align' => 'left']
                ], false, [255, 255, 255], [203, 213, 225]);
                $y += 18;
            }
        }

        // PAGE 3: Expense Trend + Footer
        $pdf->addPage();
        $y = 40;
        $pdf->writeText(40, $y, "Expense Trend", 13, true, $navy);
        $y += 15;

        $trWidths = [150, 235, 130];
        $pdf->drawTableRow(40, $y, 20, $trWidths, [
            ['text' => 'Period', 'align' => 'center'],
            ['text' => 'Amount', 'align' => 'center'],
            ['text' => 'Growth (%)', 'align' => 'center']
        ], true, $navy);
        $y += 20;

        $prevAmt = null;
        foreach ($trendRows as $tr) {
            $curAmt = (float)$tr['total_amount'];
            if ($trendGroup === 'day') {
                $pStr = $tr['period'] instanceof DateTime ? $tr['period']->format('Y-m-d') : (string)$tr['period'];
            } else {
                $mStr = str_pad((string)$tr['month'], 2, '0', STR_PAD_LEFT);
                $pStr = "{$tr['year']}-{$mStr}";
            }

            $growthStr = "-";
            if ($prevAmt !== null && $prevAmt > 0) {
                $gVal = (($curAmt - $prevAmt) / $prevAmt) * 100;
                $growthStr = sprintf("%.2f%%", $gVal);
            }
            $prevAmt = $curAmt;

            $pdf->drawTableRow(40, $y, 18, $trWidths, [
                ['text' => $pStr, 'align' => 'left'],
                ['type' => 'currency', 'text' => $curAmt],
                ['text' => $growthStr, 'align' => 'left']
            ], false, [255, 255, 255], [203, 213, 225]);
            $y += 18;
        }

        // Footer
        $y += 30;
        $pdf->writeText(40, $y, "Generated automatically by Navicash Dashboard.", 8, false, [148, 163, 184]);

        $locName = $source === "perak" ? "Perak" : "Rungkut";
        $pdf->output("Report Petty Cash {$locName}.pdf");
    }

    public function exportSettlementPdf($queryParams) {
        $this->exportSettlement($queryParams);
    }

    public function exportAdvancePdf($queryParams) {
        $this->exportAdvance($queryParams);
    }
}

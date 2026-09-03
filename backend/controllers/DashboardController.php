<?php
require_once __DIR__ . '/../config/database.php';

class DashboardController {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    private function getTableName(string $source): string {
        return strtolower($source) === 'perak' ? 'transactions_perak' : 'transactions';
    }

    private function countWorkdays(DateTime $start, DateTime $end): int {
        $days = 0;
        $current = clone $start;
        while ($current <= $end) {
            $dayOfWeek = (int)$current->format('N');
            if ($dayOfWeek < 6) { // Monday = 1 ... Friday = 5
                $days++;
            }
            $current->modify('+1 day');
        }
        return $days;
    }

    public function summary($queryParams) {
        $source = isset($queryParams['source']) ? $queryParams['source'] : 'rungkut';
        $startDate = isset($queryParams['start_date']) && !empty($queryParams['start_date']) ? $queryParams['start_date'] : null;
        $endDate = isset($queryParams['end_date']) && !empty($queryParams['end_date']) ? $queryParams['end_date'] : null;

        $table = $this->getTableName($source);
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

        // Query sum, count, count distinct gl, count distinct cost_center for expense items (amount > 0)
        $sql = "
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

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $row = $stmt->fetch();

        $totalExpense = $row && $row['total_expense'] !== null ? (float)$row['total_expense'] : 0.0;
        $totalTransactions = $row && $row['total_transactions'] !== null ? (int)$row['total_transactions'] : 0;
        $totalGlAccounts = $row && $row['total_gl_accounts'] !== null ? (int)$row['total_gl_accounts'] : 0;
        $totalCostCenters = $row && $row['total_cost_centers'] !== null ? (int)$row['total_cost_centers'] : 0;

        $minDateStr = $row['min_date'] ?? null;
        $maxDateStr = $row['max_date'] ?? null;

        if ($minDateStr && $maxDateStr) {
            $minDate = new DateTime($minDateStr);
            $maxDate = new DateTime($maxDateStr);
            $totalDays = $this->countWorkdays($minDate, $maxDate);
        } else {
            $totalDays = 1;
        }

        $avgDaily = $totalDays > 0 ? ($totalExpense / $totalDays) : 0.0;

        return [
            "total_expense" => $totalExpense,
            "total_transactions" => $totalTransactions,
            "total_gl_accounts" => $totalGlAccounts,
            "total_cost_centers" => $totalCostCenters,
            "average_daily_expense" => $avgDaily
        ];
    }

    public function expensePerGl($queryParams) {
        $source = isset($queryParams['source']) ? $queryParams['source'] : 'rungkut';
        $startDate = isset($queryParams['start_date']) && !empty($queryParams['start_date']) ? $queryParams['start_date'] : null;
        $endDate = isset($queryParams['end_date']) && !empty($queryParams['end_date']) ? $queryParams['end_date'] : null;

        $table = $this->getTableName($source);
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
            SELECT TOP 10
                t.gl_account,
                g.nama_gl_account,
                SUM(t.amount) AS total_amount
            FROM {$table} t
            LEFT JOIN gl_accounts g ON t.gl_account = g.gl_account
            {$whereClause}
            GROUP BY t.gl_account, g.nama_gl_account
            ORDER BY SUM(t.amount) DESC
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        $results = [];
        foreach ($rows as $r) {
            $results[] = [
                "gl_account" => $r['gl_account'],
                "gl_name" => $r['nama_gl_account'] ?: $r['gl_account'],
                "total_amount" => (float)$r['total_amount']
            ];
        }

        return $results;
    }

    public function expensePerCostCenter($queryParams) {
        $source = isset($queryParams['source']) ? $queryParams['source'] : 'rungkut';
        $startDate = isset($queryParams['start_date']) && !empty($queryParams['start_date']) ? $queryParams['start_date'] : null;
        $endDate = isset($queryParams['end_date']) && !empty($queryParams['end_date']) ? $queryParams['end_date'] : null;

        $table = $this->getTableName($source);
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

        $sql = "
            SELECT TOP 10
                cost_center,
                SUM(amount) AS total_amount
            FROM {$table}
            {$whereClause}
            GROUP BY cost_center
            ORDER BY SUM(amount) DESC
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        $results = [];
        foreach ($rows as $r) {
            $results[] = [
                "cost_center" => $r['cost_center'],
                "total_amount" => (float)$r['total_amount']
            ];
        }

        return $results;
    }

    public function topCostCenter($queryParams) {
        $source = isset($queryParams['source']) ? $queryParams['source'] : 'rungkut';
        $startDate = isset($queryParams['start_date']) && !empty($queryParams['start_date']) ? $queryParams['start_date'] : null;
        $endDate = isset($queryParams['end_date']) && !empty($queryParams['end_date']) ? $queryParams['end_date'] : null;

        $table = $this->getTableName($source);
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

        $topSql = "
            SELECT TOP 1
                cost_center,
                SUM(amount) AS total_cost_center
            FROM {$table}
            {$whereClause}
            GROUP BY cost_center
            ORDER BY SUM(amount) DESC
        ";

        $stmt = $this->db->prepare($topSql);
        $stmt->execute($params);
        $topCc = $stmt->fetch();

        if (!$topCc) {
            return [
                "cost_center" => null,
                "total_cost_center" => 0,
                "details" => []
            ];
        }

        $ccCode = $topCc['cost_center'];
        $detailWhere = [];
        $detailParams = [];

        if ($startDate) {
            $detailWhere[] = "t.posting_date >= :start_date";
            $detailParams[':start_date'] = $startDate;
        }
        if ($endDate) {
            $detailWhere[] = "t.posting_date <= :end_date";
            $detailParams[':end_date'] = $endDate;
        }

        $detailWhere[] = "t.cost_center = :cc_code";
        $detailParams[':cc_code'] = $ccCode;

        $detailWhereClause = count($detailWhere) > 0 ? " WHERE " . implode(" AND ", $detailWhere) : "";

        $detailSql = "
            SELECT 
                t.gl_account,
                g.nama_gl_account,
                SUM(t.amount) AS total_amount
            FROM {$table} t
            LEFT JOIN gl_accounts g ON t.gl_account = g.gl_account
            {$detailWhereClause}
            GROUP BY t.gl_account, g.nama_gl_account
            ORDER BY SUM(t.amount) DESC
        ";

        $detailStmt = $this->db->prepare($detailSql);
        $detailStmt->execute($detailParams);
        $detailRows = $detailStmt->fetchAll();

        $details = [];
        foreach ($detailRows as $row) {
            $details[] = [
                "gl_account" => $row['gl_account'],
                "gl_name" => $row['nama_gl_account'] ?: $row['gl_account'],
                "total_amount" => (float)$row['total_amount']
            ];
        }

        return [
            "cost_center" => $ccCode,
            "total_cost_center" => (float)$topCc['total_cost_center'],
            "details" => $details
        ];
    }

    public function trend($queryParams) {
        $source = isset($queryParams['source']) ? $queryParams['source'] : 'rungkut';
        $groupBy = isset($queryParams['group_by']) ? strtolower($queryParams['group_by']) : 'month';
        $startDate = isset($queryParams['start_date']) && !empty($queryParams['start_date']) ? $queryParams['start_date'] : null;
        $endDate = isset($queryParams['end_date']) && !empty($queryParams['end_date']) ? $queryParams['end_date'] : null;

        $table = $this->getTableName($source);
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

        if ($groupBy === 'day') {
            $sql = "
                SELECT 
                    CAST(posting_date AS DATE) AS periode,
                    SUM(amount) AS total_amount
                FROM {$table}
                {$whereClause}
                GROUP BY CAST(posting_date AS DATE)
                ORDER BY CAST(posting_date AS DATE) ASC
            ";

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll();

            $results = [];
            foreach ($rows as $r) {
                $p = $r['periode'] instanceof DateTime ? $r['periode']->format('Y-m-d') : (string)$r['periode'];
                $results[] = [
                    "period" => $p,
                    "total_amount" => (float)$r['total_amount']
                ];
            }
            return $results;
        } else if ($groupBy === 'year') {
            $sql = "
                SELECT 
                    year,
                    SUM(amount) AS total_amount
                FROM {$table}
                {$whereClause}
                GROUP BY year
                ORDER BY year ASC
            ";

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll();

            $results = [];
            foreach ($rows as $r) {
                $results[] = [
                    "period" => (string)$r['year'],
                    "total_amount" => (float)$r['total_amount']
                ];
            }
            return $results;
        } else {
            // Month
            $sql = "
                SELECT 
                    year,
                    month,
                    SUM(amount) AS total_amount
                FROM {$table}
                {$whereClause}
                GROUP BY year, month
                ORDER BY year ASC, month ASC
            ";

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll();

            $results = [];
            foreach ($rows as $r) {
                $m = str_pad((string)$r['month'], 2, '0', STR_PAD_LEFT);
                $results[] = [
                    "period" => "{$r['year']}-{$m}",
                    "total_amount" => (float)$r['total_amount']
                ];
            }
            return $results;
        }
    }

    public function deleteTransactions($queryParams) {
        $source = isset($queryParams['source']) ? $queryParams['source'] : 'rungkut';
        $startDate = isset($queryParams['start_date']) && !empty($queryParams['start_date']) ? $queryParams['start_date'] : null;
        $endDate = isset($queryParams['end_date']) && !empty($queryParams['end_date']) ? $queryParams['end_date'] : null;

        $table = $this->getTableName($source);
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

        // Pre-count rows to ensure accurate count returned
        $countSql = "SELECT COUNT(*) FROM {$table}{$whereClause}";
        $countStmt = $this->db->prepare($countSql);
        $countStmt->execute($params);
        $deletedCount = (int)$countStmt->fetchColumn();

        if ($deletedCount > 0) {
            $sql = "DELETE FROM {$table}{$whereClause}";
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
        }

        return [
            "message" => "Berhasil menghapus {$deletedCount} transaksi.",
            "deleted" => $deletedCount,
            "source" => $source,
            "start_date" => $startDate,
            "end_date" => $endDate
        ];
    }
}

<?php
require_once __DIR__ . '/../config/database.php';

class PpcHelper {
    const STARTING_PPC_SEQUENCE = 648;
    const STARTING_PPC_SEQUENCE_YEAR = 2026;

    public static function monthToRoman(int $month): string {
        $romanMonths = [
            1 => "I", 2 => "II", 3 => "III", 4 => "IV",
            5 => "V", 6 => "VI", 7 => "VII", 8 => "VIII",
            9 => "IX", 10 => "X", 11 => "XI", 12 => "XII"
        ];
        return $romanMonths[$month] ?? "I";
    }

    public static function getNextPpcSequence(PDO $db, int $year): int {
        // Query max sequence from ppc_sequences
        $stmtHistory = $db->prepare("SELECT MAX(sequence) AS max_seq FROM ppc_sequences WHERE year = :yr");
        $stmtHistory->execute([':yr' => $year]);
        $rowHistory = $stmtHistory->fetch();
        $seqFromHistory = $rowHistory && $rowHistory['max_seq'] !== null ? (int)$rowHistory['max_seq'] : 0;

        // Safety fallback: query max sequence from advance_requests
        $stmtAdv = $db->prepare("SELECT ppc_no FROM advance_requests WHERE ppc_no LIKE :pattern");
        $stmtAdv->execute([':pattern' => "%/{$year}"]);
        $advances = $stmtAdv->fetchAll();
        $maxAdvSeq = 0;
        foreach ($advances as $item) {
            if (!empty($item['ppc_no'])) {
                $parts = explode('/', $item['ppc_no']);
                if (isset($parts[0]) && is_numeric($parts[0])) {
                    $maxAdvSeq = max($maxAdvSeq, (int)$parts[0]);
                }
            }
        }

        // Safety fallback: query max sequence from settlements
        $stmtSettle = $db->prepare("SELECT ppc_no FROM settlements WHERE ppc_no LIKE :pattern");
        $stmtSettle->execute([':pattern' => "%/{$year}"]);
        $settlements = $stmtSettle->fetchAll();
        $maxSettleSeq = 0;
        foreach ($settlements as $item) {
            if (!empty($item['ppc_no'])) {
                $parts = explode('/', $item['ppc_no']);
                if (isset($parts[0]) && is_numeric($parts[0])) {
                    $maxSettleSeq = max($maxSettleSeq, (int)$parts[0]);
                }
            }
        }

        $currentMax = max($seqFromHistory, $maxAdvSeq, $maxSettleSeq);
        if ($year === self::STARTING_PPC_SEQUENCE_YEAR && $currentMax < self::STARTING_PPC_SEQUENCE) {
            return self::STARTING_PPC_SEQUENCE + 1;
        }
        return $currentMax + 1;
    }

    public static function recordPpcSequence(PDO $db, string $ppcNo, int $year, int $sequence): void {
        $checkStmt = $db->prepare("SELECT id FROM ppc_sequences WHERE ppc_no = :ppc_no");
        $checkStmt->execute([':ppc_no' => $ppcNo]);
        if (!$checkStmt->fetch()) {
            $stmt = $db->prepare("
                INSERT INTO ppc_sequences (ppc_no, year, sequence, issued_at) 
                VALUES (:ppc_no, :yr, :seq, GETDATE())
            ");
            $stmt->execute([
                ':ppc_no' => $ppcNo,
                ':yr' => $year,
                ':seq' => $sequence
            ]);
        }
    }

    public static function generatePpcNo(PDO $db, DateTime $requestDate, bool $recordSequence = false): string {
        $year = (int)$requestDate->format('Y');
        $month = (int)$requestDate->format('n');
        $romanMonth = self::monthToRoman($month);

        $nextSequence = self::getNextPpcSequence($db, $year);
        $ppcNo = "{$nextSequence}/PPC/{$romanMonth}/{$year}";

        if ($recordSequence) {
            self::recordPpcSequence($db, $ppcNo, $year, $nextSequence);
        }

        return $ppcNo;
    }
}

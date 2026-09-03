<?php
require_once __DIR__ . '/../config/database.php';

class ReminderController {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    public function updateOverdueAdvances(): int {
        $hour = (int)date('H');
        if ($hour < 13) {
            return 0;
        }

        $today = date('Y-m-d');
        $stmt = $this->db->prepare("
            SELECT id FROM advance_requests 
            WHERE UPPER(status) = 'ACTIVE' AND due_date < :today
        ");
        $stmt->execute([':today' => $today]);
        $advances = $stmt->fetchAll();

        if (count($advances) > 0) {
            $upStmt = $this->db->prepare("
                UPDATE advance_requests 
                SET status = 'OVERDUE', updated_at = GETDATE() 
                WHERE UPPER(status) = 'ACTIVE' AND due_date < :today
            ");
            $upStmt->execute([':today' => $today]);
        }

        return count($advances);
    }

    public function generateEml($queryParams) {
        $this->updateOverdueAdvances();
        $employeeName = isset($queryParams['employee_name']) ? trim($queryParams['employee_name']) : '';

        if (empty($employeeName)) {
            http_response_code(400);
            return ["detail" => "employee_name wajib diisi."];
        }

        // Find Employee
        $empStmt = $this->db->prepare("SELECT * FROM employees WHERE LOWER(employee_name) = LOWER(:name)");
        $empStmt->execute([':name' => $employeeName]);
        $employee = $empStmt->fetch();

        // Find OVERDUE advance requests for this employee not dismissed and not sent yet
        $stmt = $this->db->prepare("
            SELECT * FROM advance_requests 
            WHERE LOWER(employee_name) = LOWER(:name) 
              AND UPPER(status) = 'OVERDUE' 
              AND id NOT IN (SELECT advance_request_id FROM dismissed_reminders)
              AND id NOT IN (SELECT advance_request_id FROM reminder_logs WHERE UPPER(status) = 'SUCCESS')
        ");
        $stmt->execute([':name' => $employeeName]);
        $advances = $stmt->fetchAll();

        if (empty($advances)) {
            http_response_code(400);
            return ["detail" => "Tidak ada transaksi advance overdue yang belum dikirim reminder untuk karyawan '{$employeeName}'."];
        }

        if (!$employee) {
            $empEmail = $advances[0]['employee_email'] ?? '';
            $deptEmail = $advances[0]['department_email'] ?? '-';
            $employee = [
                'employee_name' => $employeeName,
                'employee_email' => $empEmail,
                'department_email' => $deptEmail
            ];
        }

        if (empty($employee['employee_email'])) {
            http_response_code(404);
            return ["detail" => "Email untuk karyawan '{$employeeName}' belum diisi di Master Data Employee."];
        }

        $todayStr = date('d/m/Y');
        $rowsHtml = '';
        foreach ($advances as $adv) {
            $reqDate = $adv['request_date'] instanceof DateTime ? $adv['request_date']->format('d/m/Y') : date('d/m/Y', strtotime($adv['request_date']));
            $amountFormatted = number_format((float)$adv['amount'], 0, ',', '.');

            $rowsHtml .= "
    <tr>
      <td width=\"14%\" nowrap align=\"center\" valign=\"middle\" style=\"border: 1px solid #000000; text-align: center; padding: 6px 8px; white-space: nowrap; font-family: Arial, Helvetica, sans-serif; font-size: 12px;\">{$reqDate}</td>
      <td width=\"20%\" nowrap align=\"center\" valign=\"middle\" style=\"border: 1px solid #000000; text-align: center; padding: 6px 8px; white-space: nowrap; font-family: Arial, Helvetica, sans-serif; font-size: 12px;\">{$adv['ppc_no']}</td>
      <td width=\"20%\" nowrap align=\"center\" valign=\"middle\" style=\"border: 1px solid #000000; text-align: center; padding: 6px 8px; white-space: nowrap; font-family: Arial, Helvetica, sans-serif; font-size: 12px;\">{$adv['employee_name']}</td>
      <td width=\"24%\" align=\"center\" valign=\"middle\" style=\"border: 1px solid #000000; text-align: center; padding: 6px 8px; font-family: Arial, Helvetica, sans-serif; font-size: 12px;\">{$adv['purpose']}</td>
      <td width=\"11%\" nowrap align=\"right\" valign=\"middle\" style=\"border: 1px solid #000000; text-align: right; padding: 6px 8px; white-space: nowrap; font-family: Arial, Helvetica, sans-serif; font-size: 12px;\">{$amountFormatted}</td>
      <td width=\"11%\" nowrap align=\"center\" valign=\"middle\" style=\"border: 1px solid #000000; text-align: center; padding: 6px 8px; white-space: nowrap; font-family: Arial, Helvetica, sans-serif; font-size: 12px;\">&gt; 2 Hari</td>
    </tr>";
        }

        $htmlBody = "<!DOCTYPE html>
<html>
<head><meta charset=\"utf-8\"></head>
<body style=\"font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #000000; line-height: 1.5; margin: 0; padding: 15px;\">
<p style=\"margin: 0 0 16px 0;\">Kepada Bapak/Ibu {$employee['employee_name']}</p>
<p style=\"margin: 0 0 16px 0;\">Berikut adalah Uang Muka Petty Cash yang masih outstanding per hari ini {$todayStr}:</p>
<p style=\"margin: 0 0 6px 0;\"><u>UANG MUKA</u></p>
<table border=\"1\" cellpadding=\"6\" cellspacing=\"0\" width=\"100%\" style=\"border-collapse: collapse; border: 1px solid #000000; font-size: 12px;\">
  <thead>
    <tr bgcolor=\"#ffffff\">
      <th width=\"14%\" align=\"center\">Tanggal</th>
      <th width=\"20%\" align=\"center\">Nomor PPC</th>
      <th width=\"20%\" align=\"center\">Nama User</th>
      <th width=\"24%\" align=\"center\">Keterangan</th>
      <th width=\"11%\" align=\"center\">Nominal</th>
      <th width=\"11%\" align=\"center\">Status</th>
    </tr>
  </thead>
  <tbody>{$rowsHtml}</tbody>
</table>
<br>
<p style=\"margin: 0 0 6px 0;\">Mohon untuk memberikan update status dokumen penyelesaian atas petty cash tersebut dan target waktu penyelesaian dengan membalas email ini.</p>
<p style=\"margin: 0 0 6px 0;\">Silahkan segera submit ke Kasir jika dokumen penyelesaian sudah Full Approved.</p>
<p style=\"margin: 0 0 16px 0;\">Abaikan email ini jika sudah submit dokumen settlement dan mohon konfirmasi ke Kasir.</p>
<p style=\"margin: 0 0 6px 0;\">Internal Memo:</p>
<table border=\"0\" cellpadding=\"0\" cellspacing=\"0\" style=\"font-size: 12px; margin-bottom: 20px;\">
  <tr>
    <td style=\"padding-right: 15px; color: #333333; font-style: italic;\">036/BYM-FA/XII/2017</td>
    <td style=\"color: #333333; font-style: italic;\">\"Uang tunai yang diterima karyawan melalui Petty Cash harus dipertanggungjawabkan maksimum 2 (dua) hari kerja setelah uang diterima.\"</td>
  </tr>
</table>
<br>
<p style=\"margin: 0 0 16px 0;\">Terima kasih atas perhatian &amp; kerjasamanya.</p>
<p style=\"margin: 0 0 4px 0;\">Best Regards</p>
<p style=\"margin: 0;\">Retained Finance</p>
</body>
</html>";

        $dateRfc = date(DATE_RFC2822);
        $ccHeader = (!empty($employee['department_email']) && $employee['department_email'] !== '-') ? "Cc: {$employee['department_email']}\r\n" : "";

        $emlContent = "MIME-Version: 1.0\r\n";
        $emlContent .= "Content-Type: text/html; charset=utf-8\r\n";
        $emlContent .= "Subject: [Navicash] Outstanding Settlement Petty Cash\r\n";
        $emlContent .= "From: Retained Finance <noreply@navicash.local>\r\n";
        $emlContent .= "To: {$employee['employee_email']}\r\n";
        $emlContent .= $ccHeader;
        $emlContent .= "Date: {$dateRfc}\r\n";
        $emlContent .= "X-Unsent: 1\r\n\r\n";
        $emlContent .= $htmlBody;

        $safeFilename = str_replace(' ', '_', $employeeName);
        header('Content-Type: message/rfc822');
        header('Content-Disposition: attachment; filename="Reminder_Outstanding_' . $safeFilename . '.eml"');
        header('Content-Length: ' . strlen($emlContent));
        echo $emlContent;
        exit;
    }

    public function overdueList() {
        $this->updateOverdueAdvances();

        $stmt = $this->db->prepare("
            SELECT * FROM advance_requests 
            WHERE UPPER(status) = 'OVERDUE' 
              AND id NOT IN (SELECT advance_request_id FROM dismissed_reminders)
            ORDER BY request_date DESC
        ");
        $stmt->execute();
        $advances = $stmt->fetchAll();

        $results = [];
        foreach ($advances as $adv) {
            $logStmt = $this->db->prepare("
                SELECT TOP 1 sent_at FROM reminder_logs 
                WHERE advance_request_id = :id AND UPPER(status) = 'SUCCESS'
                ORDER BY sent_at DESC
            ");
            $logStmt->execute([':id' => $adv['id']]);
            $sentLog = $logStmt->fetch();

            $reqDateStr = $adv['request_date'] instanceof DateTime ? $adv['request_date']->format('Y-m-d H:i:s') : (string)$adv['request_date'];
            $lastSentStr = null;
            if ($sentLog && isset($sentLog['sent_at'])) {
                $lastSentStr = $sentLog['sent_at'] instanceof DateTime ? $sentLog['sent_at']->format('d/m/Y H:i') : date('d/m/Y H:i', strtotime($sentLog['sent_at']));
            }

            $results[] = [
                "advance_id" => (int)$adv['id'],
                "document_no" => $adv['ppc_no'],
                "employee_name" => $adv['employee_name'],
                "sent_at" => $reqDateStr,
                "amount" => (float)$adv['amount'],
                "purpose" => $adv['purpose'],
                "is_sent" => $sentLog ? true : false,
                "last_sent_at" => $lastSentStr
            ];
        }

        return $results;
    }

    public function markSent($body) {
        $cleanName = isset($body['employee_name']) ? trim($body['employee_name']) : '';

        if (empty($cleanName)) {
            http_response_code(400);
            return ["detail" => "employee_name wajib diisi."];
        }

        $stmt = $this->db->prepare("
            SELECT * FROM advance_requests 
            WHERE LOWER(employee_name) = LOWER(:name) 
              AND UPPER(status) = 'OVERDUE' 
              AND id NOT IN (SELECT advance_request_id FROM dismissed_reminders)
              AND id NOT IN (SELECT advance_request_id FROM reminder_logs WHERE UPPER(status) = 'SUCCESS')
        ");
        $stmt->execute([':name' => $cleanName]);
        $advances = $stmt->fetchAll();

        if (empty($advances)) {
            http_response_code(404);
            return ["detail" => "Tidak ada advance overdue yang belum dikirim reminder untuk karyawan '{$cleanName}'."];
        }

        $empStmt = $this->db->prepare("SELECT employee_email, department_email FROM employees WHERE LOWER(employee_name) = LOWER(:name)");
        $empStmt->execute([':name' => $cleanName]);
        $empRow = $empStmt->fetch();
        $empEmail = $empRow ? $empRow['employee_email'] : 'draft@mailto.com';
        $deptEmail = ($empRow && !empty($empRow['department_email'])) ? $empRow['department_email'] : '-';

        $now = date('Y-m-d H:i:s');
        $inserted = 0;
        foreach ($advances as $adv) {
            // Cegah duplikasi: cek apakah sudah pernah ada log SUCCESS untuk advance ini
            $dupCheck = $this->db->prepare("
                SELECT COUNT(*) FROM reminder_logs 
                WHERE advance_request_id = :id 
                  AND UPPER(status) = 'SUCCESS'
            ");
            $dupCheck->execute([':id' => $adv['id']]);
            if ((int)$dupCheck->fetchColumn() > 0) {
                continue; // Skip jika sudah pernah dikirim
            }

            $logStmt = $this->db->prepare("
                INSERT INTO reminder_logs (advance_request_id, employee_email, department_email, status, sent_at) 
                VALUES (:adv_id, :email, :dept_email, 'SUCCESS', :sent_at)
            ");
            $logStmt->execute([
                ':adv_id'     => $adv['id'],
                ':email'      => $empEmail,
                ':dept_email' => $deptEmail,
                ':sent_at'    => $now,
            ]);
            $inserted++;
        }

        return [
            "message" => "Status reminder berhasil diperbarui.",
            "inserted" => $inserted,
            "employee_name" => $cleanName,
        ];
    }

    public function dismiss($advanceId) {
        $ppcStmt = $this->db->prepare("SELECT id FROM advance_requests WHERE id = :id");
        $ppcStmt->execute([':id' => $advanceId]);
        if (!$ppcStmt->fetch()) {
            http_response_code(404);
            return ["detail" => "PPC tidak ditemukan."];
        }

        $checkStmt = $this->db->prepare("SELECT id FROM dismissed_reminders WHERE advance_request_id = :id");
        $checkStmt->execute([':id' => $advanceId]);
        if (!$checkStmt->fetch()) {
            $insStmt = $this->db->prepare("INSERT INTO dismissed_reminders (advance_request_id, dismissed_at) VALUES (:id, GETDATE())");
            $insStmt->execute([':id' => $advanceId]);
        }

        return ["message" => "Notifikasi berhasil dihapus (di-dismiss)."];
    }
}

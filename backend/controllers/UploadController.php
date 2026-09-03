<?php
require_once __DIR__ . '/../services/ETLService.php';

class UploadController {
    private ETLService $etl;

    public function __construct() {
        $this->etl = new ETLService();
    }

    public function importSap($queryParams, $files) {
        $source = isset($queryParams['source']) ? $queryParams['source'] : 'rungkut';

        if (!isset($files['file']) || empty($files['file']['tmp_name'])) {
            http_response_code(400);
            return ["detail" => "File Excel wajib diunggah."];
        }

        $file = $files['file'];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, ['xlsx', 'xls'])) {
            http_response_code(400);
            return ["detail" => "File harus berupa Excel (.xlsx/.xls)"];
        }

        $uploadDir = __DIR__ . '/../uploads';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }

        $targetPath = $uploadDir . '/' . uniqid('sap_') . '_' . basename($file['name']);
        if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
            http_response_code(500);
            return ["detail" => "Gagal menyimpan file temporary."];
        }

        try {
            $result = $this->etl->processSapImport($targetPath, $source);
            return array_merge([
                "message"  => "Import SAP berhasil",
                "filename" => $file['name']
            ], $result);
        } catch (Exception $e) {
            http_response_code(500);
            return ["detail" => "ETL failed: " . $e->getMessage()];
        } finally {
            if (file_exists($targetPath)) {
                @unlink($targetPath);
            }
        }
    }
}

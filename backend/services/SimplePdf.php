<?php
/**
 * SimplePdf - Pure PHP Native PDF 1.4 Generator
 * Generates genuine binary PDF documents (%PDF-1.4) with vertical table borders & currency alignment.
 */
class SimplePdf {
    private array $pages = [];
    private int $pageWidth = 595;  // A4 Width in points (72 dpi)
    private int $pageHeight = 842; // A4 Height in points
    private string $currentStream = '';

    public function __construct() {
    }

    public function addPage(): void {
        if ($this->currentStream !== '') {
            $this->pages[] = $this->currentStream;
        }
        $this->currentStream = '';
    }

    public function calcTextWidth(string $text, int $fontSize): float {
        $len = strlen($text);
        $w = 0.0;
        for ($i = 0; $i < $len; $i++) {
            $ch = $text[$i];
            if ($ch >= '0' && $ch <= '9') {
                $w += $fontSize * 0.556;
            } else if ($ch === '.' || $ch === ',' || $ch === ' ') {
                $w += $fontSize * 0.278;
            } else if ($ch === '%') {
                $w += $fontSize * 0.889;
            } else {
                $w += $fontSize * 0.550;
            }
        }
        return $w;
    }

    public function writeText(float $x, float $y, string $text, int $fontSize = 10, bool $bold = false, array $color = [30, 41, 59]): void {
        $fontName = $bold ? '/F2' : '/F1';
        $r = sprintf("%.3f", $color[0] / 255);
        $g = sprintf("%.3f", $color[1] / 255);
        $b = sprintf("%.3f", $color[2] / 255);

        $pdfY = sprintf("%.2f", $this->pageHeight - $y);
        $pdfX = sprintf("%.2f", $x);

        $safeText = str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $text);

        $this->currentStream .= "BT {$r} {$g} {$b} rg {$fontName} {$fontSize} Tf {$pdfX} {$pdfY} Td ({$safeText}) Tj ET\n";
    }

    public function writeTextCentered(float $y, string $text, int $fontSize = 10, bool $bold = false, array $color = [30, 41, 59]): void {
        $textWidth = $this->calcTextWidth($text, $fontSize);
        $x = max(40, ($this->pageWidth - $textWidth) / 2);
        $this->writeText($x, $y, $text, $fontSize, $bold, $color);
    }

    public function drawLine(float $x1, float $y1, float $x2, float $y2, float $lineWidth = 1.0, array $color = [203, 213, 225]): void {
        $r = sprintf("%.3f", $color[0] / 255);
        $g = sprintf("%.3f", $color[1] / 255);
        $b = sprintf("%.3f", $color[2] / 255);

        $pdfY1 = sprintf("%.2f", $this->pageHeight - $y1);
        $pdfY2 = sprintf("%.2f", $this->pageHeight - $y2);
        $pdfX1 = sprintf("%.2f", $x1);
        $pdfX2 = sprintf("%.2f", $x2);
        $lw   = sprintf("%.2f", $lineWidth);

        $this->currentStream .= "{$lw} w {$r} {$g} {$b} RG {$pdfX1} {$pdfY1} m {$pdfX2} {$pdfY2} l S\n";
    }

    public function drawRect(float $x, float $y, float $w, float $h, array $fillColor = [248, 250, 252], array $borderColor = [203, 213, 225]): void {
        $fr = sprintf("%.3f", $fillColor[0] / 255);
        $fg = sprintf("%.3f", $fillColor[1] / 255);
        $fb = sprintf("%.3f", $fillColor[2] / 255);

        $br = sprintf("%.3f", $borderColor[0] / 255);
        $bg = sprintf("%.3f", $borderColor[1] / 255);
        $bb = sprintf("%.3f", $borderColor[2] / 255);

        $pdfY = sprintf("%.2f", $this->pageHeight - $y - $h);
        $pdfX = sprintf("%.2f", $x);
        $pdfW = sprintf("%.2f", $w);
        $pdfH = sprintf("%.2f", $h);

        $this->currentStream .= "{$fr} {$fg} {$fb} rg {$br} {$bg} {$bb} RG 1 w {$pdfX} {$pdfY} {$pdfW} {$pdfH} re B\n";
    }

    /**
     * Draw table row with vertical grid lines & explicit cell alignment.
     * Supports type: 'currency' (Rp left-aligned, number right-aligned).
     */
    public function drawTableRow(float $startX, float $y, float $h, array $colWidths, array $cells, bool $isHeader = false, array $fillColor = [255, 255, 255], array $borderColor = [148, 163, 184]): void {
        $currentX = $startX;

        foreach ($colWidths as $idx => $width) {
            // Draw individual cell rectangle (creates horizontal and vertical borders!)
            $this->drawRect($currentX, $y, $width, $h, $fillColor, $borderColor);

            $cellData = $cells[$idx] ?? '';
            $text = is_array($cellData) ? ($cellData['text'] ?? '') : (string)$cellData;
            $type = is_array($cellData) ? ($cellData['type'] ?? 'text') : 'text';
            $align = is_array($cellData) ? ($cellData['align'] ?? 'left') : 'left';
            $bold = $isHeader || (is_array($cellData) && !empty($cellData['bold']));
            $color = $isHeader ? [255, 255, 255] : [30, 41, 59];
            $fontSize = $isHeader ? 9 : 8;

            $textY = $y + ($h / 2) + ($fontSize / 3);

            if ($type === 'currency' && !$isHeader) {
                // "Rp." at left side of cell
                $this->writeText($currentX + 6, $textY, "Rp.", $fontSize, $bold, $color);

                // Amount number right-aligned
                $numStr = is_numeric($text) ? number_format((float)$text, 0, ',', '.') : $text;
                $numWidth = $this->calcTextWidth($numStr, $fontSize);
                $numX = max($currentX + 30, $currentX + $width - 8 - $numWidth);
                $this->writeText($numX, $textY, $numStr, $fontSize, $bold, $color);
            } else {
                if ($align === 'right') {
                    $tWidth = $this->calcTextWidth($text, $fontSize);
                    $posX = max($currentX + 6, $currentX + $width - 8 - $tWidth);
                } else if ($align === 'center') {
                    $tWidth = $this->calcTextWidth($text, $fontSize);
                    $posX = max($currentX + 4, $currentX + ($width - $tWidth) / 2);
                } else {
                    $posX = $currentX + 6;
                }
                $this->writeText($posX, $textY, $text, $fontSize, $bold, $color);
            }

            $currentX += $width;
        }
    }

    public function output(string $filename = 'document.pdf'): void {
        if ($this->currentStream !== '') {
            $this->pages[] = $this->currentStream;
        }
        if (empty($this->pages)) {
            $this->addPage();
            $this->pages[] = $this->currentStream;
        }

        $pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
        $offsets = [];

        // Obj 1: Catalog
        $offsets[1] = strlen($pdf);
        $pdf .= "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";

        $offsets[3] = 0;
        $offsets[4] = 0;

        $pageObjIds = [];
        $nextObjId = 5;

        $pageData = [];
        foreach ($this->pages as $idx => $stream) {
            $contentObjId = $nextObjId++;
            $pageObjId = $nextObjId++;
            $pageObjIds[] = $pageObjId;
            $pageData[] = [
                'contentObjId' => $contentObjId,
                'pageObjId' => $pageObjId,
                'stream' => $stream
            ];
        }

        // Obj 2: Pages Catalog
        $kids = implode(' ', array_map(fn($id) => "{$id} 0 R", $pageObjIds));
        $offsets[2] = strlen($pdf);
        $pdf .= "2 0 obj\n<< /Type /Pages /Kids [ {$kids} ] /Count " . count($pageObjIds) . " >>\nendobj\n";

        // Obj 3: Font Helvetica
        $offsets[3] = strlen($pdf);
        $pdf .= "3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n";

        // Obj 4: Font Helvetica-Bold
        $offsets[4] = strlen($pdf);
        $pdf .= "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n";

        // Render Page and Stream Objects
        foreach ($pageData as $item) {
            $cId = $item['contentObjId'];
            $pId = $item['pageObjId'];
            $str = $item['stream'];

            $offsets[$cId] = strlen($pdf);
            $pdf .= "{$cId} 0 obj\n<< /Length " . strlen($str) . " >>\nstream\n{$str}endstream\nendobj\n";

            $offsets[$pId] = strlen($pdf);
            $pdf .= "{$pId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {$this->pageWidth} {$this->pageHeight}] /Contents {$cId} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>\nendobj\n";
        }

        // Xref Table
        $xrefOffset = strlen($pdf);
        $totalObjs = count($offsets) + 1;
        $pdf .= "xref\n0 {$totalObjs}\n";
        $pdf .= "0000000000 65535 f \n";
        ksort($offsets);
        foreach ($offsets as $id => $off) {
            $pdf .= sprintf("%010d 00000 n \n", $off);
        }

        $pdf .= "trailer\n<< /Size {$totalObjs} /Root 1 0 R >>\nstartxref\n{$xrefOffset}\n%%EOF\n";

        if (ob_get_length()) {
            ob_end_clean();
        }
        header('Content-Type: application/pdf');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Content-Length: ' . strlen($pdf));
        header('Cache-Control: private, max-age=0, must-revalidate');
        header('Pragma: public');
        echo $pdf;
        exit;
    }
}

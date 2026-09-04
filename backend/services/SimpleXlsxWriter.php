<?php
/**
 * SimpleXlsxWriter - Pure PHP Native XLSX File Generator
 * Generates 100% ECMA-376 compliant Microsoft Excel .xlsx workbooks.
 */
class SimpleXlsxWriter {
    public static function createXlsx(array $headers, array $dataRows, string $outputFilename): void {
        $tempFile = tempnam(sys_get_temp_dir(), 'xlsx_') . '.xlsx';

        $zip = new ZipArchive();
        if ($zip->open($tempFile, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            throw new Exception("Cannot create temporary XLSX zip archive.");
        }

        // Build sharedStrings.xml
        $stringTable = [];
        $stringMap = [];
        $totalStringOccurrences = 0;

        $getStringIndex = function(string $val) use (&$stringTable, &$stringMap, &$totalStringOccurrences): int {
            $totalStringOccurrences++;
            if (isset($stringMap[$val])) {
                return $stringMap[$val];
            }
            $idx = count($stringTable);
            $stringTable[] = $val;
            $stringMap[$val] = $idx;
            return $idx;
        };

        // Header string indices
        $headerIndices = [];
        foreach ($headers as $h) {
            $headerIndices[] = $getStringIndex((string)$h);
        }

        // Row string indices / data types
        // Style 2: String (Left Aligned)
        // Style 3: Amount / Float Numeric (Right Aligned, numFmt #,##0)
        // Style 4: Integer / Code Numeric (Left Aligned, numFmt 0)
        $processedRows = [];
        foreach ($dataRows as $row) {
            $pRow = [];
            foreach ($row as $val) {
                if ($val === null) {
                    $pRow[] = ['type' => 'str', 'style' => 2, 'val' => $getStringIndex('')];
                } else if (is_float($val)) {
                    // Float amount -> Right Aligned with decimal formatting
                    $pRow[] = ['type' => 'num', 'style' => 3, 'val' => (float)$val];
                } else if (is_int($val)) {
                    // Integer number -> Left Aligned
                    $pRow[] = ['type' => 'num', 'style' => 4, 'val' => (int)$val];
                } else if (is_numeric($val)) {
                    $strVal = (string)$val;
                    if (strpos($strVal, '.') !== false) {
                        $pRow[] = ['type' => 'num', 'style' => 3, 'val' => (float)$strVal];
                    } else {
                        // Numeric string (like document_no / gl_account as numeric) -> Left Aligned
                        $pRow[] = ['type' => 'num', 'style' => 4, 'val' => (float)$strVal];
                    }
                } else {
                    $strVal = (string)$val;
                    $pRow[] = ['type' => 'str', 'style' => 2, 'val' => $getStringIndex($strVal)];
                }
            }
            $processedRows[] = $pRow;
        }

        $rowCount = count($processedRows) + 1;
        $colCount = count($headers);
        $maxColLetter = self::getColLetter($colCount > 0 ? $colCount : 1);
        $dimensionRef = "A1:{$maxColLetter}{$rowCount}";

        // 1. [Content_Types].xml
        $contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' . "\n" .
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' .
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' .
            '<Default Extension="xml" ContentType="application/xml"/>' .
            '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' .
            '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' .
            '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>' .
            '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' .
            '</Types>';
        $zip->addFromString('[Content_Types].xml', $contentTypes);

        // 2. _rels/.rels
        $rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' . "\n" .
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' .
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' .
            '</Relationships>';
        $zip->addFromString('_rels/.rels', $rels);

        // 3. xl/_rels/workbook.xml.rels
        $wbRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' . "\n" .
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' .
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' .
            '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' .
            '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>' .
            '</Relationships>';
        $zip->addFromString('xl/_rels/workbook.xml.rels', $wbRels);

        // 4. xl/workbook.xml
        $workbook = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' . "\n" .
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' .
            '<fileVersion appName="xl" lastEdited="5" lowestEdited="5" rupBuild="9303"/>' .
            '<workbookPr defaultThemeVersion="124226"/>' .
            '<bookViews><workbookView xWindow="0" yWindow="0" windowWidth="22260" windowHeight="12420"/></bookViews>' .
            '<sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets>' .
            '<calcPr calcId="145621"/>' .
            '</workbook>';
        $zip->addFromString('xl/workbook.xml', $workbook);

        // 5. xl/styles.xml
        // Index 0: Normal default
        // Index 1: Header (Bold, Blue fill, Center align)
        // Index 2: Text/String Cell (Left align)
        // Index 3: Float Numeric / Amount Cell (Right align, numFmt #,##0)
        // Index 4: Integer Numeric / Code Cell (Left align, numFmt 0)
        $styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' . "\n" .
            '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' .
            '<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0"/></numFmts>' .
            '<fonts count="2">' .
            '<font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>' .
            '<font><b val="1"/><sz val="11"/><color rgb="00FFFFFF"/><name val="Calibri"/><family val="2"/></font>' .
            '</fonts>' .
            '<fills count="3">' .
            '<fill><patternFill/></fill>' .
            '<fill><patternFill patternType="gray125"/></fill>' .
            '<fill><patternFill patternType="solid"><fgColor rgb="001F4E78"/><bgColor rgb="001F4E78"/></patternFill></fill>' .
            '</fills>' .
            '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' .
            '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' .
            '<cellXfs count="5">' .
            '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" pivotButton="0" quotePrefix="0" xfId="0"/>' .
            '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" pivotButton="0" quotePrefix="0" xfId="0"><alignment horizontal="center" vertical="center"/></xf>' .
            '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" pivotButton="0" quotePrefix="0" xfId="0"><alignment horizontal="left" vertical="center"/></xf>' .
            '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" pivotButton="0" quotePrefix="0" xfId="0"><alignment horizontal="right" vertical="center"/></xf>' .
            '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" pivotButton="0" quotePrefix="0" xfId="0"><alignment horizontal="left" vertical="center"/></xf>' .
            '</cellXfs>' .
            '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0" hidden="0"/></cellStyles>' .
            '<tableStyles count="0" defaultTableStyle="TableStyleMedium9" defaultPivotStyle="PivotStyleLight16"/>' .
            '</styleSheet>';
        $zip->addFromString('xl/styles.xml', $styles);

        // 6. xl/sharedStrings.xml
        $ssXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' . "\n" .
            '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="' . $totalStringOccurrences . '" uniqueCount="' . count($stringTable) . '">';
        foreach ($stringTable as $s) {
            $escaped = htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
            $ssXml .= '<si><t xml:space="preserve">' . $escaped . '</t></si>';
        }
        $ssXml .= '</sst>';
        $zip->addFromString('xl/sharedStrings.xml', $ssXml);

        // 7. xl/worksheets/sheet1.xml
        $sheetXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' . "\n" .
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' .
            '<dimension ref="' . $dimensionRef . '"/>' .
            '<sheetViews><sheetView tabSelected="1" workbookViewId="0"/></sheetViews>' .
            '<sheetFormatPr defaultRowHeight="15"/>' .
            '<sheetData>';

        $rIdx = 1;
        // Header Row (s="1" for styled header, center aligned)
        $sheetXml .= '<row r="' . $rIdx . '">';
        foreach ($headerIndices as $cIdx => $sIdx) {
            $colLetter = self::getColLetter($cIdx + 1);
            $cellRef = $colLetter . $rIdx;
            $sheetXml .= '<c r="' . $cellRef . '" t="s" s="1"><v>' . $sIdx . '</v></c>';
        }
        $sheetXml .= '</row>';

        // Data Rows
        foreach ($processedRows as $row) {
            $rIdx++;
            $sheetXml .= '<row r="' . $rIdx . '">';
            foreach ($row as $cIdx => $cell) {
                $colLetter = self::getColLetter($cIdx + 1);
                $cellRef = $colLetter . $rIdx;
                if ($cell['type'] === 'num') {
                    // Numeric cell: s="3" (Right aligned, formatted amount) or s="4" (Left aligned, number)
                    $sheetXml .= '<c r="' . $cellRef . '" s="' . $cell['style'] . '"><v>' . $cell['val'] . '</v></c>';
                } else {
                    // Text cell: s="2" (Left aligned)
                    $sheetXml .= '<c r="' . $cellRef . '" t="s" s="' . $cell['style'] . '"><v>' . $cell['val'] . '</v></c>';
                }
            }
            $sheetXml .= '</row>';
        }

        $sheetXml .= '</sheetData></worksheet>';
        $zip->addFromString('xl/worksheets/sheet1.xml', $sheetXml);

        $zip->close();

        // Output headers for direct download - Clean ALL active buffer levels completely
        while (ob_get_level() > 0) {
            ob_end_clean();
        }

        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment; filename="' . $outputFilename . '"');
        header('Content-Length: ' . filesize($tempFile));
        header('Cache-Control: max-age=0, must-revalidate');
        header('Pragma: public');
        readfile($tempFile);
        @unlink($tempFile);
        exit;
    }

    private static function getColLetter(int $col): string {
        $letter = '';
        while ($col > 0) {
            $m = ($col - 1) % 26;
            $letter = chr(65 + $m) . $letter;
            $col = (int)(($col - $m) / 26);
        }
        return $letter;
    }
}

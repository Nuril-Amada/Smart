<?php
class SimpleXlsxReader {
    public static function parse(string $filePath): array {
        if (!file_exists($filePath)) {
            throw new Exception("File not found: " . $filePath);
        }

        $zip = new ZipArchive();
        if ($zip->open($filePath) !== true) {
            throw new Exception("Could not open XLSX file.");
        }

        // Read shared strings
        $sharedStrings = [];
        $sharedStringsXml = $zip->getFromName('xl/sharedStrings.xml');
        if ($sharedStringsXml !== false) {
            $xml = simplexml_load_string($sharedStringsXml);
            if ($xml && isset($xml->si)) {
                foreach ($xml->si as $val) {
                    if (isset($val->t)) {
                        $sharedStrings[] = (string)$val->t;
                    } else if (isset($val->r)) {
                        $text = '';
                        foreach ($val->r as $run) {
                            $text .= (string)$run->t;
                        }
                        $sharedStrings[] = $text;
                    } else {
                        $sharedStrings[] = '';
                    }
                }
            }
        }

        // Read sheet1.xml
        $sheetXml = $zip->getFromName('xl/worksheets/sheet1.xml');
        if ($sheetXml === false) {
            // try sheet1.xml in case path differs
            $sheetXml = $zip->getFromName('xl/worksheets/sheet.xml');
        }
        $zip->close();

        if ($sheetXml === false) {
            throw new Exception("Could not read sheet data from XLSX file.");
        }

        $xml = simplexml_load_string($sheetXml);
        if (!$xml || !isset($xml->sheetData)) {
            return [];
        }

        $rows = [];
        foreach ($xml->sheetData->row as $row) {
            $rowCells = [];
            foreach ($row->c as $c) {
                $cellRef = (string)$c['r'];
                $cellType = (string)$c['t'];
                $val = (string)$c->v;

                if ($cellType === 's' && isset($sharedStrings[(int)$val])) {
                    $cellValue = $sharedStrings[(int)$val];
                } else {
                    $cellValue = $val;
                }

                // Extract column letter index
                preg_match('/([A-Z]+)(\d+)/', $cellRef, $matches);
                $colLetter = $matches[1] ?? '';
                $colIndex = self::colLetterToIndex($colLetter);

                $rowCells[$colIndex] = $cellValue;
            }
            if (!empty($rowCells)) {
                $maxCol = max(array_keys($rowCells));
                for ($i = 0; $i <= $maxCol; $i++) {
                    if (!array_key_exists($i, $rowCells)) {
                        $rowCells[$i] = '';
                    }
                }
                ksort($rowCells);
                $rows[] = $rowCells;
            }
        }

        return $rows;
    }

    private static function colLetterToIndex(string $col): int {
        $length = strlen($col);
        $index = 0;
        for ($i = 0; $i < $length; $i++) {
            $index = $index * 26 + (ord($col[$i]) - ord('A') + 1);
        }
        return $index - 1;
    }
}

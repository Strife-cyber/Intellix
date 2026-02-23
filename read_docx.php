<?php
$files = [
    'c:/Users/dunam/Desktop/Projects/Personal/Laravel/intellix/storage/app/public/PROSIT ALLER N° 2 Exigence.docx',
    'c:/Users/dunam/Desktop/Projects/Personal/Laravel/intellix/storage/app/public/Prosit_Aller_1.docx',
    'c:/Users/dunam/Desktop/Projects/Personal/Laravel/intellix/storage/app/public/Prosit_Aller_4.docx'
];

function read_docx($filename){
    $content = '';
    $zip = zip_open($filename);
    if (!$zip || is_numeric($zip)) return "Failed to open $filename";
    while ($zip_entry = zip_read($zip)) {
        if (zip_entry_open($zip, $zip_entry) == FALSE) continue;
        if (zip_entry_name($zip_entry) != "word/document.xml") continue;
        $content .= zip_entry_read($zip_entry, zip_entry_filesize($zip_entry));
        zip_entry_close($zip_entry);
    }
    zip_close($zip);      
    $content = str_replace('</w:p>', "\n", $content);
    $content = strip_tags($content);
    return $content;
}

foreach ($files as $f) {
    echo "=== FILE: " . basename($f) . " ===\n";
    echo read_docx($f) . "\n\n";
}

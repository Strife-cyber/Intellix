<?php

use Illuminate\Support\Facades\DB;

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    $result = DB::select("SELECT * FROM pg_available_extensions WHERE name = 'vector'");
    if (count($result) > 0) {
        echo "VECTOR_EXTENSION_AVAILABLE\n";
    } else {
        echo "VECTOR_EXTENSION_NOT_AVAILABLE\n";
    }
} catch (\Exception $e) {
    echo 'ERROR: '.$e->getMessage()."\n";
}

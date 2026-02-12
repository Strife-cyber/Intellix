<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Config;

$host = env('QDRANT_HOST');
$key = env('QDRANT_API_KEY');

echo "Checking Qdrant Connector...\n";
echo "Host: " . ($host ? $host : 'NOT SET') . "\n";
echo "Key: " . ($key ? substr($key, 0, 5) . '...' : 'NOT SET') . "\n";

if (!$host || !$key) {
    echo "ERROR: Qdrant credentials missing in .env\n";
    exit(1);
}

try {
    // 1. Check Collection Existence
    echo "1. Checking collection 'resources'...\n";
    $response = Http::withHeaders(['api-key' => $key])->get("$host/collections/resources");
    
    if ($response->successful()) {
        echo "   Collection exists.\n";
    } elseif ($response->status() === 404) {
        echo "   Collection does NOT exist. Attempting to create...\n";
        $createResponse = Http::withHeaders(['api-key' => $key])->put("$host/collections/resources", [
            'vectors' => [
                'size' => 1536,
                'distance' => 'Cosine',
            ]
        ]);
        
        if ($createResponse->successful()) {
            echo "   Collection created successfully.\n";
        } else {
            echo "   failed to create collection: " . $createResponse->body() . "\n";
            exit(1);
        }
    } else {
         echo "   Failed to check collection: " . $response->status() . " " . $response->body() . "\n";
         exit(1);
    }

    // 2. Insert flexible Test Point
    echo "2. Inserting test point...\n";
    $testId = \Illuminate\Support\Str::uuid()->toString();
    // Create a zero vector of size 1536
    $vector = array_fill(0, 1536, 0.1); 
    
    $upsertResponse = Http::withHeaders(['api-key' => $key])->put("$host/collections/resources/points?wait=true", [
        'points' => [
            [
                'id' => $testId,
                'vector' => $vector,
                'payload' => ['test' => 'connectivity_check_'.time()]
            ]
        ]
    ]);

    if ($upsertResponse->successful()) {
        echo "   Point upserted successfully. ID: $testId\n";
    } else {
        echo "   Failed to upsert point: " . $upsertResponse->body() . "\n";
        exit(1);
    }

    echo "\nSUCCESS: Qdrant connectivity verified!\n";

} catch (\Exception $e) {
    echo "EXCEPTION: " . $e->getMessage() . "\n";
}

<?php

namespace App\Services;

use App\Models\Resource;
use App\Models\ResourceChunk;

class VectorService
{
    protected string $host;

    protected string $key;

    protected string $collection;

    public function __construct()
    {
        $this->host = config('services.qdrant.host');
        $this->key = config('services.qdrant.key');
        $this->collection = 'resources';
    }

    public function processAndStore(Resource $resource, string $textContent): void
    {
        try {
            // Ensure collection exists (idempotent check ideally, or just try/catch)
            $this->ensureCollectionExists();

            // 1. Chunk the text
            $chunks = $this->chunkText($textContent);

            $points = [];
            $ids = [];

            foreach ($chunks as $index => $chunkContent) {
                $embedding = $this->generateEmbedding($chunkContent);
                $pointId = \Illuminate\Support\Str::uuid()->toString();

                // Prepare Qdrant Point
                $points[] = [
                    'id' => $pointId,
                    'vector' => $embedding,
                    'payload' => [
                        'resource_id' => $resource->id,
                        'chunk_index' => $index,
                        'content' => $chunkContent,
                    ],
                ];

                // Local mapping
                ResourceChunk::create([
                    'id' => \Illuminate\Support\Str::uuid()->toString(),
                    'resource_id' => $resource->id,
                    'chunk_index' => $index,
                    'content' => $chunkContent,
                    'qdrant_point_id' => $pointId,
                ]);
            }

            if (! empty($points)) {
                $this->upsertPoints($points);
            }
        } catch (\Throwable $e) {
            dd($e->getMessage());
        }
    }

    protected function ensureCollectionExists(): void
    {
        // Check if collection exists
        $response = \Illuminate\Support\Facades\Http::withHeaders([
            'api-key' => $this->key,
        ])->get("{$this->host}/collections/{$this->collection}");

        if ($response->status() === 404) {
            // Create collection
            \Illuminate\Support\Facades\Http::withHeaders([
                'api-key' => $this->key,
            ])->put("{$this->host}/collections/{$this->collection}", [
                'vectors' => [
                    'size' => 1536,
                    'distance' => 'Cosine',
                ],
            ]);
        }
    }

    protected function upsertPoints(array $points): void
    {
        \Illuminate\Support\Facades\Http::withHeaders([
            'api-key' => $this->key,
        ])->put("{$this->host}/collections/{$this->collection}/points?wait=true", [
            'points' => $points,
        ]);
    }

    protected function chunkText(string $text, int $chunkSize = 1000): array
    {
        return str_split($text, $chunkSize);
    }

    protected function generateEmbedding(string $text): array
    {
        // Placeholder for now
        $vector = array_fill(0, 1536, 0.0);
        $hash = md5($text);
        for ($i = 0; $i < 10; $i++) {
            $val = hexdec(substr($hash, $i, 1)) / 16.0;
            $vector[$i] = $val;
        }

        return $vector;
    }
}

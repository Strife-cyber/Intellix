<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

class QdrantService
{
    public function collectionName(): string
    {
        return (string) config('services.qdrant.collection', 'resources');
    }

    public function isConfigured(): bool
    {
        return filled(config('services.qdrant.host'));
    }

    public function ensureCollection(int $vectorSize): void
    {
        $host = $this->host();
        $name = $this->collectionName();

        $response = $this->client()->get("{$host}/collections/{$name}");

        if ($response->successful()) {
            $existingSize = (int) ($response->json('result.config.params.vectors.size') ?? 0);
            if ($existingSize > 0 && $existingSize !== $vectorSize) {
                throw new RuntimeException(
                    "Qdrant collection « {$name} » uses vector size {$existingSize}, but your embedding model produced {$vectorSize}. "
                    .'Use the same embedding model as existing data, or recreate the collection in Qdrant.',
                );
            }

            return;
        }

        if ($response->status() !== 404) {
            throw new RuntimeException('Qdrant collection check failed: '.$response->body());
        }

        $create = $this->client()->put("{$host}/collections/{$name}", [
            'vectors' => [
                'size' => $vectorSize,
                'distance' => 'Cosine',
            ],
        ]);

        if ($create->failed()) {
            throw new RuntimeException('Could not create Qdrant collection: '.$create->body());
        }
    }

    public function deleteByResourceId(string $resourceId): void
    {
        if (! $this->isConfigured()) {
            return;
        }

        $host = $this->host();
        $name = $this->collectionName();

        $this->client()->post("{$host}/collections/{$name}/points/delete", [
            'filter' => [
                'must' => [[
                    'key' => 'resource_id',
                    'match' => ['value' => $resourceId],
                ]],
            ],
        ]);
    }

    /**
     * @param  list<array{id: string, vector: list<float>, payload: array<string, mixed>}>  $points
     */
    public function upsertPoints(array $points): void
    {
        if ($points === []) {
            return;
        }

        $host = $this->host();
        $name = $this->collectionName();

        $response = $this->client()->put(
            "{$host}/collections/{$name}/points?wait=true",
            ['points' => $points],
        );

        if ($response->failed()) {
            throw new RuntimeException('Qdrant upsert failed: '.$response->body());
        }
    }

    /**
     * @return list<array{payload: array<string, mixed>}>
     */
    public function scrollByResourceId(string $resourceId, int $limit = 50): array
    {
        $host = $this->host();
        $name = $this->collectionName();

        $response = $this->client()->post("{$host}/collections/{$name}/points/scroll", [
            'filter' => [
                'must' => [[
                    'key' => 'resource_id',
                    'match' => ['value' => $resourceId],
                ]],
            ],
            'limit' => $limit,
            'with_payload' => true,
        ]);

        if ($response->failed()) {
            throw new RuntimeException('Qdrant scroll failed: '.$response->body());
        }

        return $response->json('result.points') ?? [];
    }

    public function newPointId(): string
    {
        return (string) Str::uuid();
    }

    private function host(): string
    {
        $host = rtrim((string) config('services.qdrant.host'), '/');
        if ($host === '') {
            throw new RuntimeException('QDRANT_HOST is not configured in .env');
        }

        return $host;
    }

    private function client(): \Illuminate\Http\Client\PendingRequest
    {
        $request = Http::asJson()->timeout(60);
        $key = config('services.qdrant.key');
        if ($key) {
            $request = $request->withHeaders(['api-key' => $key]);
        }

        return $request;
    }
}

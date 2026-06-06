<?php

namespace App\Services;

use App\Models\UserEmbeddingAiSetting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

class QdrantService
{
    /**
     * Generate a per-user, per-model collection name.
     * This isolates each user's vectors so they can use different embedding models
     * without collisions.
     */
    public function collectionName(?UserEmbeddingAiSetting $setting = null): string
    {
        if ($setting) {
            $hash = substr(md5($setting->user_id), 0, 8);
            $model = $setting->model ? Str::slug($setting->model) : 'default';

            return "intellix_{$hash}_{$model}";
        }

        return (string) config('services.qdrant.collection', 'resources');
    }

    public function isConfigured(): bool
    {
        return filled(config('services.qdrant.host'));
    }

    public function ensureCollection(int $vectorSize, ?UserEmbeddingAiSetting $setting = null): void
    {
        $host = $this->host();
        $name = $this->collectionName($setting);

        $response = $this->client()->get("{$host}/collections/{$name}");

        if ($response->successful()) {
            $existingSize = (int) ($response->json('result.config.params.vectors.size') ?? 0);
            if ($existingSize > 0 && $existingSize !== $vectorSize) {
                throw new RuntimeException(
                    "Qdrant collection « {$name} » uses vector size {$existingSize}, but your embedding model produced {$vectorSize}. "
                    .'This should not happen with per-user collections — try re-indexing your documents.',
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

    public function deleteByResourceId(string $resourceId, ?UserEmbeddingAiSetting $setting = null): void
    {
        if (! $this->isConfigured()) {
            return;
        }

        $host = $this->host();
        $name = $this->collectionName($setting);

        $this->client()->post("{$host}/collections/{$name}/points/delete", [
            'filter' => [
                'must' => [[
                    'key' => 'resource_id',
                    'match' => ['value' => $resourceId],
                ]],
            ],
        ]);
    }

    public function deleteCollection(?UserEmbeddingAiSetting $setting = null): void
    {
        if (! $this->isConfigured()) {
            return;
        }

        $host = $this->host();
        $name = $this->collectionName($setting);

        $this->client()->delete("{$host}/collections/{$name}");
    }

    /**
     * @param  list<array{id: string, vector: list<float>, payload: array<string, mixed>}>  $points
     */
    public function upsertPoints(array $points, ?UserEmbeddingAiSetting $setting = null): void
    {
        if ($points === []) {
            return;
        }

        $host = $this->host();
        $name = $this->collectionName($setting);

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
    public function scrollByResourceId(string $resourceId, ?UserEmbeddingAiSetting $setting = null, int $limit = 50): array
    {
        $host = $this->host();
        $name = $this->collectionName($setting);

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

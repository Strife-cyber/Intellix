<?php

use App\Enums\ResourceStatus;
use App\Models\Resource;
use App\Models\User;
use App\Models\UserEmbeddingAiSetting;
use App\Services\ResourceIngestionService;
use App\Support\AiProviders;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

test('resource ingestion chunks embeds and upserts to qdrant', function () {
    Storage::fake('s3');
    config([
        'services.qdrant.host' => 'https://qdrant.test',
        'services.qdrant.key' => 'test-key',
        'services.qdrant.collection' => 'resources',
    ]);

    Http::fake(function ($request) {
        $url = $request->url();

        if (str_contains($url, '/v1/embeddings')) {
            $input = $request->data()['input'] ?? '';
            $count = is_array($input) ? count($input) : 1;
            $data = [];
            for ($i = 0; $i < $count; $i++) {
                $data[] = ['index' => $i, 'embedding' => array_fill(0, 4, 0.5)];
            }

            return Http::response(['data' => $data], 200);
        }

        if (str_contains($url, 'qdrant.test/collections/resources')) {
            if ($request->method() === 'GET') {
                return Http::response([], 404);
            }

            return Http::response(['status' => 'ok'], 200);
        }

        if (str_contains($url, 'qdrant.test')) {
            return Http::response(['status' => 'ok'], 200);
        }

        return Http::response([], 404);
    });

    $user = User::factory()->create();
    UserEmbeddingAiSetting::factory()->for($user)->create([
        'provider_type' => AiProviders::LMSTUDIO,
        'endpoint' => 'http://localhost:1234',
        'model' => 'test-embed',
    ]);

    $resource = Resource::factory()->for($user, 'owner')->create([
        's3_key' => 'resources/doc.txt',
        'mime_type' => 'text/plain',
        'status' => ResourceStatus::PENDING,
        'metadata' => ['extension' => 'txt'],
    ]);

    Storage::disk('s3')->put($resource->s3_key, "Line one about photosynthesis.\n\nLine two about chlorophyll.");

    $count = app(ResourceIngestionService::class)->ingest($resource, $user);

    expect($count)->toBeGreaterThan(0);
    expect($resource->fresh()->chunks)->not->toBeEmpty();

    Http::assertSent(function ($request) {
        return str_contains($request->url(), '/v1/embeddings')
            && ($request['model'] ?? null) === 'test-embed';
    });
});

test('user embedding service uses ollama embed endpoint', function () {
    Http::fake([
        'http://localhost:11434/api/embed' => Http::response([
            'embeddings' => [array_fill(0, 3, 0.1)],
        ], 200),
    ]);

    $user = User::factory()->create();
    UserEmbeddingAiSetting::factory()->for($user)->create([
        'provider_type' => AiProviders::OLLAMA,
        'endpoint' => 'http://localhost:11434',
        'model' => 'nomic-embed-text',
    ]);

    $vectors = app(\App\Services\UserEmbeddingService::class)->embed($user, ['hello']);

    expect($vectors)->toHaveCount(1);
    expect($vectors[0])->toHaveCount(3);
});

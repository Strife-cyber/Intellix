<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserEmbeddingAiSetting;
use App\Support\AiProviders;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

class UserEmbeddingService
{
    /**
     * @param  list<string>  $texts
     * @return list<list<float>>
     */
    public function embed(User $user, array $texts): array
    {
        $texts = array_values(array_filter($texts, fn ($t) => is_string($t) && trim($t) !== ''));
        if ($texts === []) {
            return [];
        }

        $setting = $this->embeddingSetting($user);
        if (! $setting) {
            throw new RuntimeException(
                'No embedding provider configured. Open Settings → Embeddings AI and choose a provider.',
            );
        }

        $model = $this->resolveEmbeddingModel($setting);
        if ($model === '') {
            throw new RuntimeException(
                "Provider « {$setting->provider_type} » needs an embedding model in Settings → Embeddings AI.",
            );
        }

        return $this->embedForSetting($setting, $texts);
    }

    /**
     * @param  list<string>  $texts
     * @return list<list<float>>
     */
    public function embedForSetting(UserEmbeddingAiSetting $setting, array $texts): array
    {
        $model = $this->resolveEmbeddingModel($setting);

        return match ($setting->provider_type) {
            AiProviders::GEMINI => $this->embedGemini($setting, $model, $texts),
            AiProviders::OLLAMA => $this->embedOllama($setting, $model, $texts),
            default => $this->embedOpenAiCompatible($setting, $model, $texts),
        };
    }

    /**
     * Test the embedding connection by sending a single probe text.
     *
     * @return array{success: bool, vector_size?: int, model?: string, error?: string}
     */
    public function testConnection(UserEmbeddingAiSetting $setting): array
    {
        $model = $this->resolveEmbeddingModel($setting);
        if ($model === '') {
            return ['success' => false, 'error' => 'No embedding model configured.'];
        }

        try {
            $vectors = $this->embedForSetting($setting, ['Test de connexion Intellix']);

            return [
                'success' => true,
                'vector_size' => count($vectors[0] ?? []),
                'model' => $model,
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    public function vectorSize(User $user): int
    {
        $setting = $this->embeddingSetting($user);
        if ($setting?->embedding_dimensions) {
            return (int) $setting->embedding_dimensions;
        }

        $vectors = $this->embed($user, ['dimension probe']);
        if ($vectors === [] || $vectors[0] === []) {
            throw new RuntimeException('Could not determine embedding vector size.');
        }

        $size = count($vectors[0]);
        $setting?->update(['embedding_dimensions' => $size]);

        return $size;
    }

    public function embeddingSetting(User $user): ?UserEmbeddingAiSetting
    {
        $setting = $user->embeddingAiSetting;
        if ($setting && $this->supportsEmbeddings($setting)) {
            return $setting;
        }

        return null;
    }

    public function supportsEmbeddings(UserEmbeddingAiSetting $setting): bool
    {
        return in_array($setting->provider_type, AiProviders::EMBEDDING_TYPES, true);
    }

    public function resolveEmbeddingModel(UserEmbeddingAiSetting $setting): string
    {
        if (filled($setting->model)) {
            return trim((string) $setting->model);
        }

        return match ($setting->provider_type) {
            AiProviders::OLLAMA => 'nomic-embed-text',
            AiProviders::OPENAI => 'text-embedding-3-small',
            AiProviders::OPENROUTER => 'openai/text-embedding-3-small',
            AiProviders::GEMINI => 'text-embedding-004',
            AiProviders::COHERE => 'embed-english-v3.0',
            AiProviders::JINA => 'jina-embeddings-v3',
            AiProviders::VOYAGE => 'voyage-3',
            AiProviders::TOGETHER => 'BAAI/bge-large-en-v1.5',
            default => '',
        };
    }

    // ── Retry helper ────────────────────────────────────────────────────

    /**
     * Wrap any embedding call with retry logic for transient failures.
     *
     * @template T
     *
     * @param  callable(): T  $fn
     * @return T
     */
    private function withRetry(callable $fn, string $label = 'embedding', int $maxRetries = 3): mixed
    {
        $attempt = 0;
        $lastException = null;

        while ($attempt < $maxRetries) {
            try {
                return $fn();
            } catch (Throwable $e) {
                $lastException = $e;
                $attempt++;

                if ($attempt >= $maxRetries) {
                    break;
                }

                $sleep = $attempt * 2;
                Log::warning("{$label} attempt {$attempt}/{$maxRetries} failed, retrying in {$sleep}s", [
                    'error' => $e->getMessage(),
                ]);
                sleep($sleep);
            }
        }

        throw $lastException;
    }

    // ── OpenAI-compatible (OpenAI, OpenRouter, Cohere, Jina, Voyage, Together, LM Studio) ──

    /**
     * @param  list<string>  $texts
     * @return list<list<float>>
     */
    private function embedOpenAiCompatible(UserEmbeddingAiSetting $setting, string $model, array $texts): array
    {
        return $this->withRetry(function () use ($setting, $model, $texts) {
            $url = $this->embeddingsUrl($setting);
            $headers = ['Content-Type' => 'application/json'];
            $apiKey = $setting->effectiveApiKey();
            if ($apiKey) {
                $headers['Authorization'] = 'Bearer '.$apiKey;
            }

            // Provider-specific headers
            if ($setting->provider_type === AiProviders::OPENROUTER) {
                $headers['HTTP-Referer'] = config('app.url', 'https://intellix.test');
                $headers['X-Title'] = config('app.name', 'Intellix');
            }

            $body = [
                'model' => $model,
                'input' => count($texts) === 1 ? $texts[0] : $texts,
            ];

            // Provider-specific body fields
            if (in_array($setting->provider_type, [AiProviders::COHERE], true)) {
                $body['input_type'] = 'search_document';
            }

            $response = Http::timeout(120)
                ->withHeaders($headers)
                ->post($url, $body);

            if ($response->failed()) {
                throw new RuntimeException(
                    "Embedding API failed ({$setting->provider_type}): ".$response->body(),
                );
            }

            // Cohere uses a different response format
            if ($setting->provider_type === AiProviders::COHERE) {
                return $this->parseCohereResponse($response, $texts);
            }

            $data = $response->json('data') ?? [];
            usort($data, fn ($a, $b) => ($a['index'] ?? 0) <=> ($b['index'] ?? 0));

            $vectors = [];
            foreach ($data as $item) {
                $embedding = $item['embedding'] ?? null;
                if (! is_array($embedding)) {
                    throw new RuntimeException('Embedding API returned an invalid vector.');
                }
                $vectors[] = array_map('floatval', $embedding);
            }

            if (count($vectors) !== count($texts)) {
                throw new RuntimeException('Embedding API returned an unexpected number of vectors.');
            }

            return $vectors;
        }, "embedding {$setting->provider_type}");
    }

    /**
     * @return list<list<float>>
     */
    private function parseCohereResponse(\Illuminate\Http\Client\Response $response, array $texts): array
    {
        $embeddings = $response->json('embeddings') ?? [];
        if (! is_array($embeddings) || count($embeddings) !== count($texts)) {
            throw new RuntimeException('Cohere embed returned an unexpected response format.');
        }

        return array_map(
            fn ($vec) => array_map('floatval', is_array($vec) ? $vec : []),
            $embeddings,
        );
    }

    // ── Ollama ──────────────────────────────────────────────────────────

    /**
     * @param  list<string>  $texts
     * @return list<list<float>>
     */
    private function embedOllama(UserEmbeddingAiSetting $setting, string $model, array $texts): array
    {
        return $this->withRetry(function () use ($setting, $model, $texts) {
            $base = rtrim($setting->endpoint ?: 'http://localhost:11434', '/');

            $response = Http::timeout(120)
                ->post("{$base}/api/embed", [
                    'model' => $model,
                    'input' => $texts,
                ]);

            if ($response->failed()) {
                throw new RuntimeException('Ollama embed failed: '.$response->body());
            }

            $embeddings = $response->json('embeddings') ?? [];
            if (! is_array($embeddings) || count($embeddings) !== count($texts)) {
                throw new RuntimeException('Ollama embed returned an invalid response.');
            }

            return array_map(
                fn ($vec) => array_map('floatval', is_array($vec) ? $vec : []),
                $embeddings,
            );
        }, 'ollama embed');
    }

    // ── Gemini ──────────────────────────────────────────────────────────

    /**
     * @param  list<string>  $texts
     * @return list<list<float>>
     */
    private function embedGemini(UserEmbeddingAiSetting $setting, string $model, array $texts): array
    {
        return $this->withRetry(function () use ($setting, $model, $texts) {
            $apiKey = $setting->effectiveApiKey();
            if (! $apiKey) {
                throw new RuntimeException('Gemini API key is required for embeddings.');
            }

            $modelPath = str_starts_with($model, 'models/') ? $model : "models/{$model}";

            // Gemini batch endpoint has a limit — chunk into groups of 100
            $allVectors = [];
            foreach (array_chunk($texts, 100) as $batch) {
                $requests = array_map(
                    fn (string $text) => [
                        'model' => $modelPath,
                        'content' => ['parts' => [['text' => $text]]],
                    ],
                    $batch,
                );

                $response = Http::timeout(120)
                    ->withQueryParameters(['key' => $apiKey])
                    ->post(
                        'https://generativelanguage.googleapis.com/v1beta/'.$modelPath.':batchEmbedContents',
                        ['requests' => $requests],
                    );

                if ($response->failed()) {
                    throw new RuntimeException('Gemini embed failed: '.$response->body());
                }

                $embeddings = $response->json('embeddings') ?? [];

                foreach ($embeddings as $item) {
                    $values = $item['values'] ?? $item['embedding']['values'] ?? null;
                    if (! is_array($values)) {
                        throw new RuntimeException('Gemini embed returned an invalid vector.');
                    }
                    $allVectors[] = array_map('floatval', $values);
                }
            }

            if (count($allVectors) !== count($texts)) {
                throw new RuntimeException('Gemini embed returned an unexpected number of vectors.');
            }

            return $allVectors;
        }, 'gemini embed');
    }

    // ── URL resolution ──────────────────────────────────────────────────

    private function embeddingsUrl(UserEmbeddingAiSetting $setting): string
    {
        return match ($setting->provider_type) {
            AiProviders::OPENROUTER => 'https://openrouter.ai/api/v1/embeddings',
            AiProviders::OPENAI => $this->withV1Path(
                $setting->endpoint ?: 'https://api.openai.com',
                'embeddings',
            ),
            AiProviders::OLLAMA => $this->withV1Path(
                $setting->endpoint ?: 'http://localhost:11434',
                'embeddings',
            ),
            AiProviders::LMSTUDIO => $this->withV1Path(
                $setting->endpoint ?: 'http://localhost:1234',
                'embeddings',
            ),
            AiProviders::COHERE => rtrim($setting->endpoint ?: 'https://api.cohere.ai', '/').'/v1/embed',
            AiProviders::JINA => rtrim($setting->endpoint ?: 'https://api.jina.ai', '/').'/v1/embeddings',
            AiProviders::VOYAGE => rtrim($setting->endpoint ?: 'https://api.voyageai.ai', '/').'/v1/embeddings',
            AiProviders::TOGETHER => rtrim($setting->endpoint ?: 'https://api.together.xyz', '/').'/v1/embeddings',
            default => throw new RuntimeException(
                "Provider « {$setting->provider_type} » does not expose OpenAI-compatible embeddings.",
            ),
        };
    }

    private function withV1Path(string $base, string $suffix): string
    {
        $base = rtrim($base, '/');
        if (str_ends_with($base, '/v1')) {
            return $base.'/'.$suffix;
        }

        return $base.'/v1/'.$suffix;
    }
}

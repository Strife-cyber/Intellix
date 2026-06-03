<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserEmbeddingAiSetting;
use App\Support\AiProviders;
use Illuminate\Support\Facades\Http;
use RuntimeException;

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

        return match ($setting->provider_type) {
            AiProviders::GEMINI => $this->embedGemini($setting, $model, $texts),
            AiProviders::OLLAMA => $this->embedOllama($setting, $model, $texts),
            default => $this->embedOpenAiCompatible($setting, $model, $texts),
        };
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
            default => '',
        };
    }

    /**
     * @param  list<string>  $texts
     * @return list<list<float>>
     */
    private function embedOpenAiCompatible(UserEmbeddingAiSetting $setting, string $model, array $texts): array
    {
        $url = $this->embeddingsUrl($setting);
        $headers = ['Content-Type' => 'application/json'];
        $apiKey = $setting->effectiveApiKey();
        if ($apiKey) {
            $headers['Authorization'] = 'Bearer '.$apiKey;
        }
        if ($setting->provider_type === AiProviders::OPENROUTER) {
            $headers['HTTP-Referer'] = config('app.url', 'https://intellix.test');
            $headers['X-Title'] = config('app.name', 'Intellix');
        }

        $response = Http::timeout(120)
            ->withHeaders($headers)
            ->post($url, [
                'model' => $model,
                'input' => count($texts) === 1 ? $texts[0] : $texts,
            ]);

        if ($response->failed()) {
            throw new RuntimeException(
                "Embedding API failed ({$setting->provider_type}): ".$response->body(),
            );
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
    }

    /**
     * @param  list<string>  $texts
     * @return list<list<float>>
     */
    private function embedOllama(UserEmbeddingAiSetting $setting, string $model, array $texts): array
    {
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
    }

    /**
     * @param  list<string>  $texts
     * @return list<list<float>>
     */
    private function embedGemini(UserEmbeddingAiSetting $setting, string $model, array $texts): array
    {
        $apiKey = $setting->effectiveApiKey();
        if (! $apiKey) {
            throw new RuntimeException('Gemini API key is required for embeddings.');
        }

        $modelPath = str_starts_with($model, 'models/') ? $model : "models/{$model}";
        $requests = array_map(
            fn (string $text) => [
                'model' => $modelPath,
                'content' => ['parts' => [['text' => $text]]],
            ],
            $texts,
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
        $vectors = [];

        foreach ($embeddings as $item) {
            $values = $item['values'] ?? $item['embedding']['values'] ?? null;
            if (! is_array($values)) {
                throw new RuntimeException('Gemini embed returned an invalid vector.');
            }
            $vectors[] = array_map('floatval', $values);
        }

        if (count($vectors) !== count($texts)) {
            throw new RuntimeException('Gemini embed returned an unexpected number of vectors.');
        }

        return $vectors;
    }

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

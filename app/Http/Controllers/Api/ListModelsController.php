<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class ListModelsController extends Controller
{
    /**
     * List available models from the selected AI provider.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'provider_type' => ['required', 'string'],
            'endpoint' => ['nullable', 'string', 'max:500'],
            'api_key' => ['nullable', 'string', 'max:2000'],
        ]);

        $providerType = $validated['provider_type'];
        $endpoint = $validated['endpoint'] ?? null;
        $apiKey = $validated['api_key'] ?? null;

        try {
            $models = match ($providerType) {
                'openai' => $this->listOpenAiCompatibleModels($endpoint, $apiKey),
                'openrouter' => $this->listOpenRouterModels($apiKey),
                'ollama' => $this->listOllamaModels($endpoint),
                'gemini' => $this->listGeminiModels($apiKey),
                'lmstudio' => $this->listLmStudioModels($endpoint),
                default => throw new RuntimeException("Unknown provider: {$providerType}"),
            };

            return response()->json([
                'success' => true,
                'models' => $models,
            ]);
        } catch (\Throwable $e) {
            Log::warning("Failed to list models for provider '{$providerType}': {$e->getMessage()}");

            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
                'models' => [],
            ]);
        }
    }

    /**
     * For OpenAI-compatible providers (OpenAI, DeepSeek, etc.), use the configured endpoint.
     */
    private function listOpenAiCompatibleModels(?string $endpoint, ?string $apiKey): array
    {
        // Use the user's configured endpoint, or fall back to official OpenAI
        $base = rtrim($endpoint ?: 'https://api.openai.com', '/');

        // Build the models URL properly
        if (str_ends_with($base, '/v1')) {
            $url = $base . '/models';
        } elseif (str_ends_with($base, '/v1/models')) {
            $url = $base;
        } else {
            $url = $base . '/v1/models';
        }

        $headers = ['Content-Type' => 'application/json'];
        if ($apiKey) {
            $headers['Authorization'] = 'Bearer ' . $apiKey;
        }

        $response = Http::timeout(10)
            ->withHeaders($headers)
            ->get($url);

        if ($response->failed()) {
            throw new RuntimeException("API error ({$response->status()}): {$response->body()}");
        }

        $data = $response->json();
        $models = $data['data'] ?? [];

        $names = array_map(fn($m) => $m['id'], $models);
        sort($names);

        return $names;
    }

    private function listOpenRouterModels(?string $apiKey): array
    {
        $headers = ['Content-Type' => 'application/json'];
        if ($apiKey) {
            $headers['Authorization'] = 'Bearer ' . $apiKey;
        }

        $response = Http::timeout(10)
            ->withHeaders($headers)
            ->get('https://openrouter.ai/api/v1/models');

        if ($response->failed()) {
            throw new RuntimeException("OpenRouter API error ({$response->status()}): {$response->body()}");
        }

        $data = $response->json();
        $models = $data['data'] ?? [];

        $names = array_map(fn($m) => $m['id'], $models);
        sort($names);

        return $names;
    }

    private function listOllamaModels(?string $endpoint): array
    {
        $base = rtrim($endpoint ?: 'http://localhost:11434', '/');
        $url = $base . '/api/tags';

        $response = Http::timeout(10)->get($url);

        if ($response->failed()) {
            throw new RuntimeException("Ollama API error ({$response->status()}): {$response->body()}");
        }

        $data = $response->json();
        $models = $data['models'] ?? [];

        $names = array_map(fn($m) => $m['name'], $models);
        sort($names);

        return $names;
    }

    private function listGeminiModels(?string $apiKey): array
    {
        if (! $apiKey) {
            throw new RuntimeException('A Gemini API key is required to list models.');
        }

        $url = 'https://generativelanguage.googleapis.com/v1beta/models?key=' . urlencode($apiKey);

        $response = Http::timeout(10)->get($url);

        if ($response->failed()) {
            throw new RuntimeException("Gemini API error ({$response->status()}): {$response->body()}");
        }

        $data = $response->json();
        $models = $data['models'] ?? [];

        $names = [];
        foreach ($models as $m) {
            $name = $m['name'] ?? '';
            $displayName = str_replace('models/', '', $name);
            $supportedMethods = $m['supportedGenerationMethods'] ?? [];
            if (in_array('generateContent', $supportedMethods)) {
                $names[] = $displayName;
            }
        }

        sort($names);
        return $names;
    }

    private function listLmStudioModels(?string $endpoint): array
    {
        $base = rtrim($endpoint ?: 'http://localhost:1234', '/');

        $url = $base;
        if (!str_ends_with($url, '/v1/models')) {
            $url = rtrim($url, '/');
            $url .= str_ends_with($url, '/v1') ? '/models' : '/v1/models';
        }

        $response = Http::timeout(5)->get($url);

        if ($response->failed()) {
            throw new RuntimeException(
                'Could not connect to LM Studio at ' . $base . '. ' .
                'Make sure LM Studio is running and the local server is started.'
            );
        }

        $data = $response->json();
        $models = $data['data'] ?? [];

        $names = array_map(fn($m) => $m['id'], $models);
        sort($names);

        return $names;
    }
}

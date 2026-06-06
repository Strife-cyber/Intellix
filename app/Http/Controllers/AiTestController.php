<?php

namespace App\Http\Controllers;

use App\Models\UserChatAiSetting;
use App\Models\UserEmbeddingAiSetting;
use App\Services\UserAiProviderResolver;
use App\Services\UserEmbeddingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Throwable;

class AiTestController extends Controller
{
    public function __construct(
        private UserEmbeddingService $embeddingService,
        private UserAiProviderResolver $aiResolver,
    ) {}

    /**
     * Test an AI provider connection without saving.
     */
    public function test(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => ['required', 'string', 'in:chat,embedding'],
            'provider_type' => ['required', 'string'],
            'endpoint' => ['nullable', 'string', 'max:500'],
            'model' => ['nullable', 'string', 'max:255'],
            'api_key' => ['nullable', 'string', 'max:2000'],
        ]);

        return $validated['type'] === 'embedding'
            ? $this->testEmbedding($validated, $request->user()->id)
            : $this->testChat($validated);
    }

    private function testEmbedding(array $data, string $userId): JsonResponse
    {
        // Build a temporary setting object to test with
        $setting = new UserEmbeddingAiSetting([
            'user_id' => $userId,
            'provider_type' => $data['provider_type'],
            'endpoint' => $data['endpoint'] ?? null,
            'model' => $data['model'] ?? null,
            'api_key' => $data['api_key'] ?? null,
        ]);

        $result = $this->embeddingService->testConnection($setting);

        return response()->json($result);
    }

    private function testChat(array $data): JsonResponse
    {
        $providerType = $data['provider_type'];
        $model = $data['model'] ?? null;
        $endpoint = $data['endpoint'] ?? null;
        $apiKey = $data['api_key'] ?? null;

        // Resolve defaults if empty
        if (! $model) {
            $model = $this->resolveDefaultChatModel($providerType);
        }

        try {
            $url = $this->resolveChatUrl($providerType, $endpoint);
            $headers = ['Content-Type' => 'application/json'];

            if ($apiKey) {
                $headers['Authorization'] = 'Bearer '.$apiKey;
            }

            if ($providerType === 'openrouter') {
                $headers['HTTP-Referer'] = config('app.url', 'https://intellix.test');
                $headers['X-Title'] = config('app.name', 'Intellix');
            }

            $payload = [
                'model' => $model,
                'messages' => [
                    ['role' => 'user', 'content' => 'Respond with only the word: ok'],
                ],
                'max_tokens' => 10,
            ];

            if ($providerType === 'gemini') {
                // Gemini uses a different endpoint structure
                $modelPath = str_starts_with($model, 'models/') ? $model : "models/{$model}";
                $url = "https://generativelanguage.googleapis.com/v1beta/{$modelPath}:generateContent";

                $payload = [
                    'contents' => [
                        ['parts' => [['text' => 'Respond with only the word: ok']]],
                    ],
                    'generationConfig' => ['maxOutputTokens' => 10],
                ];

                unset($headers['Authorization']);
                $url .= '?key='.urlencode($apiKey ?? '');
            }

            $response = Http::timeout(15)->withHeaders($headers)->post($url, $payload);

            if ($response->failed()) {
                $body = $response->body();
                $error = $body ?: $response->reason();

                return response()->json([
                    'success' => false,
                    'error' => "API error ({$response->status()}): {$error}",
                ]);
            }

            return response()->json([
                'success' => true,
                'model' => $model,
                'provider' => $providerType,
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function resolveChatUrl(string $providerType, ?string $endpoint): string
    {
        return match ($providerType) {
            'gemini' => '', // handled separately
            'openrouter' => 'https://openrouter.ai/api/v1/chat/completions',
            'ollama' => $this->withV1Path($endpoint ?: 'http://localhost:11434', 'chat/completions'),
            'lmstudio' => $this->withV1Path($endpoint ?: 'http://localhost:1234', 'chat/completions'),
            'openai' => $this->withV1Path($endpoint ?: 'https://api.openai.com', 'chat/completions'),
            default => throw new RuntimeException("Unknown provider: {$providerType}"),
        };
    }

    private function resolveDefaultChatModel(string $providerType): string
    {
        return match ($providerType) {
            'ollama' => 'llama3.1',
            'openrouter' => 'openai/gpt-4o-mini',
            'openai' => 'gpt-4o-mini',
            'gemini' => 'gemini-2.0-flash',
            'lmstudio' => '',
            default => '',
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

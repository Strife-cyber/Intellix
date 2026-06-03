<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserChatAiSetting;
use App\Support\AiProviders;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class UserAiChatService
{
    public function __construct(
        private UserAiProviderResolver $resolver,
    ) {}

    /**
     * @param  list<array{role: string, content: string}>  $messages
     * @return array{content: string, reasoning: ?string}
     */
    public function chat(User $user, array $messages, ?float $temperature = null): array
    {
        $setting = $this->resolver->defaultSetting($user);
        if (! $setting) {
            throw new RuntimeException(
                'No chat AI configured. Open Settings → Chat AI and choose a provider.',
            );
        }

        if (! $this->resolver->isConfigured($setting)) {
            throw new RuntimeException(
                "AI provider « {$setting->provider_type} » is missing required settings (e.g. API key).",
            );
        }

        $temperature ??= $this->resolver->resolveTemperature($user);

        if ($setting->provider_type === AiProviders::GEMINI) {
            return $this->chatGemini($setting, $messages, $temperature);
        }

        return $this->chatOpenAiCompatible($setting, $messages, $temperature);
    }

    /**
     * @param  list<array{role: string, content: string}>  $messages
     * @return array{content: string, reasoning: ?string}
     */
    private function chatOpenAiCompatible(UserChatAiSetting $setting, array $messages, float $temperature): array
    {
        $url = $this->openAiCompatibleUrl($setting);
        $model = $setting->model ?: $this->defaultModel($setting->provider_type);

        $headers = ['Content-Type' => 'application/json'];
        $apiKey = $setting->effectiveApiKey();
        if ($apiKey) {
            $headers['Authorization'] = 'Bearer '.$apiKey;
        }
        if ($setting->provider_type === AiProviders::OPENROUTER) {
            $headers['HTTP-Referer'] = config('app.url', 'https://intellix.test');
            $headers['X-Title'] = config('app.name', 'Intellix');
        }

        $response = Http::timeout(300)
            ->withHeaders($headers)
            ->post($url, [
                'model' => $model,
                'messages' => $messages,
                'temperature' => $temperature,
            ]);

        if ($response->failed()) {
            throw new RuntimeException(
                "AI request failed ({$setting->provider_type}): ".$response->body(),
            );
        }

        $data = $response->json();
        $choice = $data['choices'][0]['message'] ?? [];
        $content = $choice['content'] ?? '';
        $reasoning = $choice['reasoning_content'] ?? null;

        if (! $reasoning && preg_match('/<think>(.*?)<\/think>/s', $content, $matches)) {
            $reasoning = trim($matches[1]);
            $content = trim(preg_replace('/<think>.*?<\/think>/s', '', $content));
        }

        if ($content === '') {
            throw new RuntimeException('AI returned an empty response.');
        }

        return [
            'content' => $content,
            'reasoning' => $reasoning,
        ];
    }

    /**
     * @param  list<array{role: string, content: string}>  $messages
     * @return array{content: string, reasoning: ?string}
     */
    private function chatGemini(UserChatAiSetting $setting, array $messages, float $temperature): array
    {
        $apiKey = $setting->effectiveApiKey();
        if (! $apiKey) {
            throw new RuntimeException('Gemini API key is required.');
        }

        $model = $setting->model ?: 'gemini-2.0-flash';
        $model = str_starts_with($model, 'models/') ? $model : "models/{$model}";

        $systemText = '';
        $contents = [];

        foreach ($messages as $message) {
            $role = $message['role'] ?? 'user';
            $text = $message['content'] ?? '';
            if ($text === '') {
                continue;
            }

            if ($role === 'system') {
                $systemText .= ($systemText !== '' ? "\n\n" : '').$text;

                continue;
            }

            $geminiRole = $role === 'assistant' ? 'model' : 'user';
            $contents[] = [
                'role' => $geminiRole,
                'parts' => [['text' => $text]],
            ];
        }

        if ($contents === []) {
            throw new RuntimeException('No messages to send to Gemini.');
        }

        $payload = [
            'contents' => $contents,
            'generationConfig' => [
                'temperature' => $temperature,
            ],
        ];

        if ($systemText !== '') {
            $payload['systemInstruction'] = [
                'parts' => [['text' => $systemText]],
            ];
        }

        $url = 'https://generativelanguage.googleapis.com/v1beta/'.$model.':generateContent';

        $response = Http::timeout(300)
            ->withQueryParameters(['key' => $apiKey])
            ->post($url, $payload);

        if ($response->failed()) {
            throw new RuntimeException('Gemini API failed: '.$response->body());
        }

        $parts = $response->json('candidates.0.content.parts') ?? [];
        $text = '';
        foreach ($parts as $part) {
            if (is_array($part) && isset($part['text'])) {
                $text .= $part['text'];
            }
        }

        $text = trim($text);
        if ($text === '') {
            throw new RuntimeException('Gemini returned an empty response.');
        }

        return [
            'content' => $text,
            'reasoning' => null,
        ];
    }

    private function openAiCompatibleUrl(UserChatAiSetting $setting): string
    {
        return match ($setting->provider_type) {
            AiProviders::OPENROUTER => 'https://openrouter.ai/api/v1/chat/completions',
            AiProviders::OPENAI => $this->withV1Completions(
                $setting->endpoint ?: 'https://api.openai.com',
            ),
            AiProviders::OLLAMA => $this->withV1Completions(
                $setting->endpoint ?: 'http://localhost:11434',
            ),
            AiProviders::LMSTUDIO => $this->withV1Completions(
                $setting->endpoint ?: 'http://localhost:1234',
            ),
            default => throw new RuntimeException(
                "Provider « {$setting->provider_type} » does not support chat completions in Intellix.",
            ),
        };
    }

    private function withV1Completions(string $base): string
    {
        $base = rtrim($base, '/');
        if (str_ends_with($base, '/v1')) {
            return $base.'/chat/completions';
        }

        return $base.'/v1/chat/completions';
    }

    private function defaultModel(string $providerType): string
    {
        return match ($providerType) {
            AiProviders::OLLAMA => 'llama3.1',
            AiProviders::OPENROUTER => 'openai/gpt-4o-mini',
            AiProviders::OPENAI => 'gpt-4o-mini',
            AiProviders::LMSTUDIO => 'local-model',
            default => 'default',
        };
    }
}

<?php

namespace App\Models;

use App\Support\AiProviders;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserChatAiSetting extends Model
{
    /** @use \Illuminate\Database\Eloquent\Factories\HasFactory<\Database\Factories\UserChatAiSettingFactory> */
    use \Illuminate\Database\Eloquent\Factories\HasFactory;

    protected $fillable = [
        'user_id',
        'provider_type',
        'api_key',
        'endpoint',
        'model',
        'temperature',
        'is_default',
    ];

    protected function casts(): array
    {
        return [
            'api_key' => 'encrypted',
            'temperature' => 'float',
            'is_default' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * UI + validation catalog — matches micro-cer provider capabilities (no URL for Gemini/OpenRouter).
     *
     * @return list<array<string, mixed>>
     */
    public static function providerCatalog(): array
    {
        return [
            [
                'type' => AiProviders::GEMINI,
                'label' => 'Google Gemini',
                'summary' => 'Google AI Studio API key and optional model. No server URL — same as micro-cer.',
                'fields' => [
                    'apiKey' => true,
                    'apiKeyRequired' => false,
                    'endpoint' => false,
                    'model' => true,
                    'temperature' => false,
                ],
                'placeholders' => [
                    'model' => 'gemini-2.0-flash',
                    'apiKey' => 'AIza… (or leave empty if GEMINI_API_KEY is in .env)',
                ],
                'hints' => [
                    'model' => 'Optional — micro-cer uses its default if empty',
                    'apiKey' => 'Optional when GEMINI_API_KEY is set on the server (.env)',
                ],
            ],
            [
                'type' => AiProviders::OPENROUTER,
                'label' => 'OpenRouter',
                'summary' => 'OpenRouter cloud API — key and optional model only. No server URL.',
                'fields' => [
                    'apiKey' => true,
                    'apiKeyRequired' => true,
                    'endpoint' => false,
                    'model' => true,
                    'temperature' => false,
                ],
                'placeholders' => [
                    'model' => 'openai/gpt-4o-mini',
                    'apiKey' => 'sk-or-…',
                ],
                'hints' => [
                    'model' => 'Optional — OpenRouter default if empty',
                    'apiKey' => 'Required — from openrouter.ai/keys',
                ],
            ],
            [
                'type' => AiProviders::OLLAMA,
                'label' => 'Ollama',
                'summary' => 'Local Ollama on your machine.',
                'fields' => [
                    'apiKey' => false,
                    'apiKeyRequired' => false,
                    'endpoint' => true,
                    'model' => true,
                    'temperature' => true,
                ],
                'placeholders' => [
                    'endpoint' => 'http://localhost:11434',
                    'model' => 'llama3.1',
                ],
                'hints' => [
                    'endpoint' => 'Leave empty for http://localhost:11434',
                    'model' => 'Leave empty for the default model',
                    'temperature' => 'Optional; 0.7 is fine',
                ],
            ],
            [
                'type' => AiProviders::LMSTUDIO,
                'label' => 'LM Studio',
                'summary' => 'Local LM Studio server.',
                'fields' => [
                    'apiKey' => false,
                    'apiKeyRequired' => false,
                    'endpoint' => true,
                    'model' => true,
                    'temperature' => true,
                ],
                'placeholders' => [
                    'endpoint' => 'http://localhost:1234',
                    'model' => 'Loaded model name',
                ],
                'hints' => [
                    'endpoint' => 'Leave empty for http://localhost:1234',
                    'model' => 'Must match the model loaded in LM Studio',
                    'temperature' => 'Optional; 0.7 is typical',
                ],
            ],
            [
                'type' => AiProviders::OPENAI,
                'label' => 'OpenAI',
                'summary' => 'OpenAI or compatible API.',
                'fields' => [
                    'apiKey' => true,
                    'apiKeyRequired' => true,
                    'endpoint' => true,
                    'model' => true,
                    'temperature' => true,
                ],
                'placeholders' => [
                    'endpoint' => 'https://api.openai.com/v1',
                    'model' => 'gpt-4o-mini',
                    'apiKey' => 'sk-…',
                ],
                'hints' => [
                    'endpoint' => 'Leave empty for the official OpenAI API',
                    'model' => 'Optional — defaults to gpt-4o-mini',
                    'apiKey' => 'Required',
                    'temperature' => 'Optional',
                ],
            ],
        ];
    }

    public static function fallbackApiKeyForType(string $providerType): ?string
    {
        return match ($providerType) {
            AiProviders::GEMINI => config('services.gemini.api_key'),
            AiProviders::OPENROUTER => config('services.openrouter.api_key'),
            default => null,
        };
    }

    public function effectiveApiKey(): ?string
    {
        if ($this->api_key !== null && $this->api_key !== '') {
            return $this->api_key;
        }

        return self::fallbackApiKeyForType($this->provider_type);
    }

    /**
     * Payload for micro-cer — only fields each provider actually uses.
     *
     * @return array<string, mixed>
     */
    public function toCerProviderPayload(): array
    {
        $apiKey = $this->effectiveApiKey() ?? '';
        $model = $this->model ?? '';
        $temperature = (float) ($this->temperature ?: 0.1);

        return match ($this->provider_type) {
            AiProviders::GEMINI => [
                'type' => AiProviders::GEMINI,
                'apiKey' => $apiKey,
                'model' => $model,
                'temperature' => $temperature,
            ],
            AiProviders::OPENROUTER => [
                'type' => AiProviders::OPENROUTER,
                'apiKey' => $apiKey,
                'model' => $model,
            ],
            AiProviders::OLLAMA => [
                'type' => AiProviders::OLLAMA,
                'endpoint' => $this->endpoint ?? '',
                'apiKey' => $apiKey,
                'model' => $model,
                'temperature' => $temperature,
            ],
            AiProviders::LMSTUDIO => [
                'type' => AiProviders::LMSTUDIO,
                'endpoint' => $this->endpoint ?? '',
                'apiKey' => $apiKey,
                'model' => $model,
                'temperature' => $temperature,
            ],
            AiProviders::OPENAI => [
                'type' => AiProviders::OPENAI,
                'endpoint' => $this->endpoint ?? '',
                'apiKey' => $apiKey,
                'model' => $model,
                'temperature' => $temperature,
            ],
            default => [
                'type' => $this->provider_type,
                'endpoint' => $this->endpoint ?? '',
                'apiKey' => $apiKey,
                'model' => $model,
                'temperature' => $temperature,
            ],
        };
    }
}

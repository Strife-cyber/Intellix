<?php

namespace App\Models;

use App\Support\AiProviders;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserEmbeddingAiSetting extends Model
{
    /** @use \Illuminate\Database\Eloquent\Factories\HasFactory<\Database\Factories\UserEmbeddingAiSettingFactory> */
    use \Illuminate\Database\Eloquent\Factories\HasFactory;

    protected $fillable = [
        'user_id',
        'provider_type',
        'api_key',
        'endpoint',
        'model',
        'embedding_dimensions',
    ];

    protected function casts(): array
    {
        return [
            'api_key' => 'encrypted',
            'embedding_dimensions' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function effectiveApiKey(): ?string
    {
        if ($this->api_key !== null && $this->api_key !== '') {
            return $this->api_key;
        }

        return match ($this->provider_type) {
            AiProviders::GEMINI => config('services.gemini.api_key'),
            AiProviders::OPENROUTER => config('services.openrouter.api_key'),
            default => null,
        };
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function providerCatalog(): array
    {
        return [
            [
                'type' => AiProviders::GEMINI,
                'label' => 'Google Gemini',
                'summary' => 'Embeddings via Google AI (text-embedding-004, etc.).',
                'fields' => [
                    'apiKey' => true,
                    'apiKeyRequired' => false,
                    'endpoint' => false,
                    'model' => true,
                ],
                'placeholders' => [
                    'model' => 'text-embedding-004',
                    'apiKey' => 'AIza… (or GEMINI_API_KEY in .env)',
                ],
                'hints' => [
                    'model' => 'Embedding model name for Qdrant indexing',
                    'apiKey' => 'Optional when GEMINI_API_KEY is set on the server',
                ],
            ],
            [
                'type' => AiProviders::OPENROUTER,
                'label' => 'OpenRouter',
                'summary' => 'Embeddings via OpenRouter (/v1/embeddings).',
                'fields' => [
                    'apiKey' => true,
                    'apiKeyRequired' => true,
                    'endpoint' => false,
                    'model' => true,
                ],
                'placeholders' => [
                    'model' => 'openai/text-embedding-3-small',
                    'apiKey' => 'sk-or-…',
                ],
                'hints' => [
                    'model' => 'OpenRouter embedding model id',
                    'apiKey' => 'Required',
                ],
            ],
            [
                'type' => AiProviders::OLLAMA,
                'label' => 'Ollama',
                'summary' => 'Local Ollama /api/embed.',
                'fields' => [
                    'apiKey' => false,
                    'endpoint' => true,
                    'model' => true,
                ],
                'placeholders' => [
                    'endpoint' => 'http://localhost:11434',
                    'model' => 'nomic-embed-text',
                ],
                'hints' => [
                    'endpoint' => 'Leave empty for http://localhost:11434',
                    'model' => 'Run: ollama pull nomic-embed-text',
                ],
            ],
            [
                'type' => AiProviders::LMSTUDIO,
                'label' => 'LM Studio',
                'summary' => 'Local LM Studio /v1/embeddings.',
                'fields' => [
                    'apiKey' => false,
                    'endpoint' => true,
                    'model' => true,
                ],
                'placeholders' => [
                    'endpoint' => 'http://localhost:1234',
                    'model' => 'Your embedding model id',
                ],
                'hints' => [
                    'endpoint' => 'Leave empty for http://localhost:1234',
                    'model' => 'Must match the embedding model loaded in LM Studio',
                ],
            ],
            [
                'type' => AiProviders::OPENAI,
                'label' => 'OpenAI',
                'summary' => 'OpenAI or compatible embedding API.',
                'fields' => [
                    'apiKey' => true,
                    'apiKeyRequired' => true,
                    'endpoint' => true,
                    'model' => true,
                ],
                'placeholders' => [
                    'endpoint' => 'https://api.openai.com',
                    'model' => 'text-embedding-3-small',
                    'apiKey' => 'sk-…',
                ],
                'hints' => [
                    'endpoint' => 'Leave empty for official OpenAI API',
                    'model' => 'e.g. text-embedding-3-small',
                ],
            ],
        ];
    }
}

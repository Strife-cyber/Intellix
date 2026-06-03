<?php

namespace App\Services;

use App\Models\Resource;
use App\Models\User;
use App\Models\UserChatAiSetting;
use App\Support\AiProviders;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

class ResourceDocumentExtractor
{
    public function __construct(
        private UserAiProviderResolver $aiResolver,
    ) {}

    public function extract(Resource $resource, ?User $user = null): string
    {
        $user ??= $resource->owner;

        $plain = $this->fromPlainFile($resource);
        if ($plain !== '') {
            return $plain;
        }

        if ($user) {
            return $this->extractWithGemini($resource, $user);
        }

        return '';
    }

    public function fromPlainFile(Resource $resource): string
    {
        if (! $resource->s3_key || ! Storage::disk('s3')->exists($resource->s3_key)) {
            return '';
        }

        $mime = strtolower((string) $resource->mime_type);
        $extension = strtolower((string) ($resource->metadata['extension'] ?? pathinfo($resource->original_name, PATHINFO_EXTENSION)));

        $isPlain = str_starts_with($mime, 'text/')
            || in_array($extension, ['txt', 'md', 'csv', 'json', 'log'], true);

        if (! $isPlain) {
            return '';
        }

        $raw = Storage::disk('s3')->get($resource->s3_key);

        return is_string($raw) ? trim($raw) : '';
    }

    public function extractWithGemini(Resource $resource, User $user): string
    {
        if (! $resource->s3_key || ! Storage::disk('s3')->exists($resource->s3_key)) {
            return '';
        }

        $apiKey = $this->geminiApiKey($user);
        if (! $apiKey) {
            return '';
        }

        $bytes = Storage::disk('s3')->get($resource->s3_key);
        if (! is_string($bytes) || $bytes === '') {
            return '';
        }

        if (strlen($bytes) > 15 * 1024 * 1024) {
            throw new RuntimeException('File is too large for text extraction (max 15 MB).');
        }

        $mime = $this->normalizeMime($resource);
        $model = $this->geminiChatModel($user);
        $modelPath = str_starts_with($model, 'models/') ? $model : "models/{$model}";

        $response = Http::timeout(180)
            ->withQueryParameters(['key' => $apiKey])
            ->post(
                'https://generativelanguage.googleapis.com/v1beta/'.$modelPath.':generateContent',
                [
                    'contents' => [[
                        'parts' => [
                            [
                                'text' => 'Extract all readable text from this document for search indexing. '
                                    .'Return plain text only — no markdown fences, no commentary.',
                            ],
                            [
                                'inline_data' => [
                                    'mime_type' => $mime,
                                    'data' => base64_encode($bytes),
                                ],
                            ],
                        ],
                    ]],
                    'generationConfig' => ['temperature' => 0.1],
                ],
            );

        if ($response->failed()) {
            Log::error('Gemini text extraction failed', [
                'resource_id' => $resource->id,
                'body' => $response->body(),
            ]);

            throw new RuntimeException(
                'Could not extract text from file: '.Str::limit($response->body(), 200),
            );
        }

        $parts = $response->json('candidates.0.content.parts') ?? [];
        $text = '';
        foreach ($parts as $part) {
            if (is_array($part) && isset($part['text'])) {
                $text .= $part['text'];
            }
        }

        return trim($text);
    }

    private function geminiApiKey(User $user): ?string
    {
        $setting = $this->aiResolver->defaultSetting($user);
        if ($setting?->provider_type === AiProviders::GEMINI) {
            $key = $setting->effectiveApiKey();
            if ($key) {
                return $key;
            }
        }

        return UserChatAiSetting::fallbackApiKeyForType(AiProviders::GEMINI);
    }

    private function geminiChatModel(User $user): string
    {
        $setting = $this->aiResolver->defaultSetting($user);
        if ($setting?->provider_type === AiProviders::GEMINI && filled($setting->model)) {
            return $setting->model;
        }

        return 'gemini-2.0-flash';
    }

    private function normalizeMime(Resource $resource): string
    {
        $mime = strtolower((string) $resource->mime_type);
        if ($mime !== '' && $mime !== 'application/octet-stream') {
            return $mime;
        }

        return match (strtolower((string) ($resource->metadata['extension'] ?? ''))) {
            'pdf' => 'application/pdf',
            'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'doc' => 'application/msword',
            'pptx' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'txt' => 'text/plain',
            'csv' => 'text/csv',
            default => 'application/pdf',
        };
    }
}

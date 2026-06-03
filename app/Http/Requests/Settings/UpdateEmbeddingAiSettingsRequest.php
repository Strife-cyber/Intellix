<?php

namespace App\Http\Requests\Settings;

use App\Support\AiProviders;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEmbeddingAiSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $type = $this->input('provider_type');

        $rules = [
            'provider_type' => ['required', 'string', Rule::in(AiProviders::EMBEDDING_TYPES)],
            'api_key' => ['nullable', 'string', 'max:4096'],
            'endpoint' => ['nullable', 'string', 'max:2048'],
            'model' => ['nullable', 'string', 'max:255'],
        ];

        if ($type === AiProviders::OPENAI) {
            $existing = $this->user()?->embeddingAiSetting;
            if (! ($existing && $existing->api_key) && ! $this->filled('api_key')) {
                $rules['api_key'] = ['required', 'string', 'max:4096'];
            }
        }

        if ($type === AiProviders::GEMINI) {
            $existing = $this->user()?->embeddingAiSetting;
            $hasKey = ($existing && $existing->api_key) || filled(config('services.gemini.api_key'));
            if (! $hasKey && ! $this->filled('api_key')) {
                $rules['api_key'] = ['required', 'string', 'max:4096'];
            }
        }

        if ($type === AiProviders::OPENROUTER) {
            $existing = $this->user()?->embeddingAiSetting;
            $hasKey = ($existing && $existing->api_key) || filled(config('services.openrouter.api_key'));
            if (! $hasKey && ! $this->filled('api_key')) {
                $rules['api_key'] = ['required', 'string', 'max:4096'];
            }
        }

        if (in_array($type, [AiProviders::LMSTUDIO, AiProviders::OLLAMA], true) && ! $this->filled('model')) {
            $rules['model'] = ['required', 'string', 'max:255'];
        }

        return $rules;
    }
}

<?php

namespace App\Http\Requests\Settings;

use App\Models\UserAiSetting;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAiSettingsRequest extends FormRequest
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
        $isUpdate = $this->route('user_ai_setting') !== null;
        $providerType = $isUpdate
            ? $this->route('user_ai_setting')?->provider_type
            : $this->input('provider_type');

        $rules = [
            'provider_type' => [
                $isUpdate ? 'prohibited' : 'required',
                'string',
                Rule::in(UserAiSetting::PROVIDER_TYPES),
            ],
            'api_key' => ['nullable', 'string', 'max:4096'],
            'endpoint' => ['nullable', 'string', 'max:2048'],
            'model' => ['nullable', 'string', 'max:255'],
            'temperature' => ['nullable', 'numeric', 'min:0', 'max:2'],
            'is_default' => ['sometimes', 'boolean'],
        ];

        if ($providerType === UserAiSetting::PROVIDER_OPENROUTER || $providerType === UserAiSetting::PROVIDER_OPENAI) {
            $setting = $this->route('user_ai_setting');
            $hasExistingKey = $setting && $setting->api_key;

            if (! $hasExistingKey) {
                $rules['api_key'] = ['required', 'string', 'max:4096'];
            }
        }

        if ($providerType === UserAiSetting::PROVIDER_GEMINI) {
            $setting = $this->route('user_ai_setting');
            $hasKey = ($setting && $setting->api_key) || filled(UserAiSetting::fallbackApiKeyForType(UserAiSetting::PROVIDER_GEMINI));

            if (! $hasKey && ! $this->filled('api_key')) {
                $rules['api_key'] = ['required', 'string', 'max:4096'];
            }
        }

        return $rules;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('is_default')) {
            $this->merge([
                'is_default' => $this->boolean('is_default'),
            ]);
        }
    }
}

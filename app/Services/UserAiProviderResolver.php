<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserAiSetting;
use Illuminate\Support\Facades\Http;

class UserAiProviderResolver
{
    public function defaultSetting(User $user): ?UserAiSetting
    {
        $default = $user->aiSettings()->where('is_default', true)->first();
        if ($default) {
            return $default;
        }

        return $user->aiSettings()->orderBy('provider_type')->first();
    }

    public function resolveEndpoint(User $user): ?string
    {
        $setting = $this->defaultSetting($user);
        if (! $setting) {
            return config('services.ai.endpoint');
        }

        return $this->endpointForSetting($setting);
    }

    public function resolveModel(User $user): ?string
    {
        $setting = $this->defaultSetting($user);
        if (! $setting) {
            return null;
        }

        return $setting->model ?: $this->defaultModelForProvider($setting->provider_type);
    }

    public function resolveApiKey(User $user): ?string
    {
        return $this->defaultSetting($user)?->effectiveApiKey();
    }

    public function resolveTemperature(User $user): float
    {
        $setting = $this->defaultSetting($user);

        return $setting ? (float) $setting->temperature : 0.7;
    }

    public function cerProviderPayload(User $user): ?array
    {
        $setting = $this->defaultSetting($user);
        if (! $setting) {
            return null;
        }

        if (! $this->isConfigured($setting)) {
            return null;
        }

        return $setting->toCerProviderPayload();
    }

    /**
     * @return array<string, mixed>
     */
    public function status(User $user): array
    {
        $setting = $this->defaultSetting($user);
        if (! $setting) {
            return [
                'available' => false,
                'provider' => null,
                'endpoint' => config('services.ai.endpoint'),
                'model' => null,
                'message' => 'No AI provider configured. Add one in Settings → AI.',
            ];
        }

        $endpoint = $this->endpointForSetting($setting);
        $model = $this->resolveModel($user);
        $configured = $this->isConfigured($setting);
        $reachable = $configured && $this->isReachable($setting, $endpoint);

        return [
            'available' => $reachable,
            'provider' => $setting->provider_type,
            'endpoint' => $endpoint,
            'model' => $model,
            'message' => ! $configured
                ? 'AI provider is missing required settings (e.g. API key).'
                : ($reachable
                    ? 'AI provider is configured.'
                    : 'AI provider is configured but the service is not reachable.'),
        ];
    }

    public function endpointForSetting(UserAiSetting $setting): ?string
    {
        return match ($setting->provider_type) {
            UserAiSetting::PROVIDER_GEMINI, UserAiSetting::PROVIDER_OPENROUTER => null,
            UserAiSetting::PROVIDER_OPENAI => rtrim($setting->endpoint ?: 'https://api.openai.com', '/'),
            UserAiSetting::PROVIDER_OLLAMA => rtrim($setting->endpoint ?: 'http://localhost:11434', '/'),
            UserAiSetting::PROVIDER_LMSTUDIO => rtrim($setting->endpoint ?: 'http://localhost:1234', '/'),
            default => $setting->endpoint,
        };
    }

    private function defaultModelForProvider(string $providerType): ?string
    {
        return match ($providerType) {
            UserAiSetting::PROVIDER_OLLAMA => 'llama3.1',
            UserAiSetting::PROVIDER_OPENROUTER => 'openai/gpt-4o-mini',
            UserAiSetting::PROVIDER_OPENAI => 'gpt-4o-mini',
            UserAiSetting::PROVIDER_GEMINI => 'gemini-2.0-flash',
            default => null,
        };
    }

    public function chatCompletionsHeaders(User $user): array
    {
        $apiKey = $this->resolveApiKey($user);
        if ($apiKey) {
            return ['Authorization' => 'Bearer '.$apiKey];
        }

        return [];
    }

    private function isConfigured(UserAiSetting $setting): bool
    {
        return match ($setting->provider_type) {
            UserAiSetting::PROVIDER_GEMINI => filled($setting->effectiveApiKey()),
            UserAiSetting::PROVIDER_OPENROUTER, UserAiSetting::PROVIDER_OPENAI => filled($setting->effectiveApiKey()),
            UserAiSetting::PROVIDER_OLLAMA, UserAiSetting::PROVIDER_LMSTUDIO => true,
            default => true,
        };
    }

    private function isReachable(UserAiSetting $setting, ?string $endpoint): bool
    {
        if (in_array($setting->provider_type, [UserAiSetting::PROVIDER_GEMINI, UserAiSetting::PROVIDER_OPENROUTER], true)) {
            return filled($setting->effectiveApiKey());
        }

        if ($endpoint === null || $endpoint === '') {
            return false;
        }

        try {
            $url = match ($setting->provider_type) {
                UserAiSetting::PROVIDER_OLLAMA => rtrim($endpoint, '/').'/api/tags',
                UserAiSetting::PROVIDER_OPENAI, UserAiSetting::PROVIDER_LMSTUDIO => rtrim($endpoint, '/').'/v1/models',
                default => $endpoint,
            };

            $request = Http::timeout(3);
            if ($setting->effectiveApiKey()) {
                $request = $request->withToken($setting->effectiveApiKey());
            }

            return $request->get($url)->successful();
        } catch (\Throwable) {
            return false;
        }
    }
}

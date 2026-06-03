<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserChatAiSetting;
use App\Support\AiProviders;
use Illuminate\Support\Facades\Http;

class UserAiProviderResolver
{
    public function defaultSetting(User $user): ?UserChatAiSetting
    {
        $default = $user->chatAiSettings()->where('is_default', true)->first();
        if ($default) {
            return $default;
        }

        return $user->chatAiSettings()->orderBy('provider_type')->first();
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
                'message' => 'No chat AI configured. Open Settings → Chat AI.',
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
                ? 'Chat AI is missing required settings (e.g. API key).'
                : ($reachable
                    ? 'Chat AI is configured.'
                    : 'Chat AI is configured but the service is not reachable.'),
        ];
    }

    public function endpointForSetting(UserChatAiSetting $setting): ?string
    {
        return match ($setting->provider_type) {
            AiProviders::GEMINI, AiProviders::OPENROUTER => null,
            AiProviders::OPENAI => rtrim($setting->endpoint ?: 'https://api.openai.com', '/'),
            AiProviders::OLLAMA => rtrim($setting->endpoint ?: 'http://localhost:11434', '/'),
            AiProviders::LMSTUDIO => rtrim($setting->endpoint ?: 'http://localhost:1234', '/'),
            default => $setting->endpoint,
        };
    }

    private function defaultModelForProvider(string $providerType): ?string
    {
        return match ($providerType) {
            AiProviders::OLLAMA => 'llama3.1',
            AiProviders::OPENROUTER => 'openai/gpt-4o-mini',
            AiProviders::OPENAI => 'gpt-4o-mini',
            AiProviders::GEMINI => 'gemini-2.0-flash',
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

    public function isConfigured(UserChatAiSetting $setting): bool
    {
        return match ($setting->provider_type) {
            AiProviders::GEMINI => filled($setting->effectiveApiKey()),
            AiProviders::OPENROUTER, AiProviders::OPENAI => filled($setting->effectiveApiKey()),
            AiProviders::OLLAMA, AiProviders::LMSTUDIO => true,
            default => true,
        };
    }

    private function isReachable(UserChatAiSetting $setting, ?string $endpoint): bool
    {
        if (in_array($setting->provider_type, [AiProviders::GEMINI, AiProviders::OPENROUTER], true)) {
            return filled($setting->effectiveApiKey());
        }

        if ($endpoint === null || $endpoint === '') {
            return false;
        }

        try {
            $url = match ($setting->provider_type) {
                AiProviders::OLLAMA => rtrim($endpoint, '/').'/api/tags',
                AiProviders::OPENAI, AiProviders::LMSTUDIO => rtrim($endpoint, '/').'/v1/models',
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

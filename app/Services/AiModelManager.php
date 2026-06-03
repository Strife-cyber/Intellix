<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Auth;

class AiModelManager
{
    public static function getBestEndpoint(?User $user = null): ?string
    {
        $user ??= Auth::user();
        if (! $user) {
            return config('services.ai.endpoint');
        }

        return app(UserAiProviderResolver::class)->resolveEndpoint($user);
    }

    public static function getBestModel(?string $endpoint = null, ?User $user = null): ?string
    {
        $user ??= Auth::user();
        if (! $user) {
            return null;
        }

        return app(UserAiProviderResolver::class)->resolveModel($user);
    }

    /**
     * @return array<string, mixed>
     */
    public static function getStatus(?User $user = null): array
    {
        $user ??= Auth::user();
        if (! $user) {
            return [
                'available' => false,
                'provider' => null,
                'endpoint' => config('services.ai.endpoint'),
                'model' => null,
                'message' => 'Not authenticated.',
            ];
        }

        return app(UserAiProviderResolver::class)->status($user);
    }

    /**
     * @return array<string, string>
     */
    public static function chatHeaders(?User $user = null): array
    {
        $user ??= Auth::user();
        if (! $user) {
            return [];
        }

        return app(UserAiProviderResolver::class)->chatCompletionsHeaders($user);
    }
}

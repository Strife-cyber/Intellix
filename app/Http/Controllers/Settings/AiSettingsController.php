<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\UpdateAiSettingsRequest;
use App\Models\UserAiSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AiSettingsController extends Controller
{
    public function edit(Request $request): Response
    {
        $settings = $request->user()
            ->aiSettings()
            ->orderByDesc('is_default')
            ->orderBy('provider_type')
            ->get()
            ->map(fn (UserAiSetting $setting) => $this->toRow($setting));

        return Inertia::render('settings/ai', [
            'settings' => $settings,
            'providerCatalog' => UserAiSetting::providerCatalog(),
            'status' => $request->session()->get('status'),
        ]);
    }

    public function store(UpdateAiSettingsRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $user = $request->user();

        $exists = UserAiSetting::query()
            ->where('user_id', $user->id)
            ->where('provider_type', $validated['provider_type'])
            ->exists();

        if ($exists) {
            return back()->withErrors([
                'provider_type' => 'This provider is already configured. Edit it in the list below.',
            ]);
        }

        $setting = UserAiSetting::query()->create([
            'user_id' => $user->id,
            'provider_type' => $validated['provider_type'],
            'endpoint' => $validated['endpoint'] ?? null,
            'model' => $validated['model'] ?? null,
            'temperature' => $validated['temperature'] ?? 0.7,
            'is_default' => (bool) ($validated['is_default'] ?? false),
            'api_key' => filled($validated['api_key'] ?? null) ? $validated['api_key'] : null,
        ]);

        $this->syncDefaultFlag($user->id, $setting);

        return to_route('settings.ai.edit')->with('status', 'ai-settings-saved');
    }

    public function update(UpdateAiSettingsRequest $request, UserAiSetting $userAiSetting): RedirectResponse
    {
        $this->authorizeSetting($request, $userAiSetting);

        $validated = $request->validated();

        $userAiSetting->fill([
            'endpoint' => $validated['endpoint'] ?? null,
            'model' => $validated['model'] ?? null,
            'temperature' => $validated['temperature'] ?? $userAiSetting->temperature,
            'is_default' => (bool) ($validated['is_default'] ?? $userAiSetting->is_default),
        ]);

        if (array_key_exists('api_key', $validated) && filled($validated['api_key'])) {
            $userAiSetting->api_key = $validated['api_key'];
        }

        $userAiSetting->save();

        $this->syncDefaultFlag($request->user()->id, $userAiSetting);

        return to_route('settings.ai.edit')->with('status', 'ai-settings-saved');
    }

    public function makeDefault(Request $request, UserAiSetting $userAiSetting): RedirectResponse
    {
        $this->authorizeSetting($request, $userAiSetting);

        $userAiSetting->update(['is_default' => true]);
        $this->syncDefaultFlag($request->user()->id, $userAiSetting);

        return to_route('settings.ai.edit')->with('status', 'ai-settings-default-changed');
    }

    public function destroy(Request $request, UserAiSetting $userAiSetting): RedirectResponse
    {
        $this->authorizeSetting($request, $userAiSetting);

        $userId = $request->user()->id;
        $wasDefault = $userAiSetting->is_default;

        $userAiSetting->delete();

        if ($wasDefault) {
            $next = UserAiSetting::query()
                ->where('user_id', $userId)
                ->orderBy('provider_type')
                ->first();

            if ($next !== null) {
                $next->update(['is_default' => true]);
            }
        }

        return to_route('settings.ai.edit')->with('status', 'ai-settings-deleted');
    }

    private function authorizeSetting(Request $request, UserAiSetting $userAiSetting): void
    {
        abort_unless($userAiSetting->user_id === $request->user()->id, 403);
    }

    private function syncDefaultFlag(int $userId, UserAiSetting $setting): void
    {
        if (! $setting->is_default) {
            $hasDefault = UserAiSetting::query()
                ->where('user_id', $userId)
                ->where('is_default', true)
                ->exists();

            if (! $hasDefault) {
                $setting->update(['is_default' => true]);
            }

            return;
        }

        UserAiSetting::query()
            ->where('user_id', $userId)
            ->whereKeyNot($setting->id)
            ->update(['is_default' => false]);
    }

    /**
     * @return array<string, mixed>
     */
    private function toRow(UserAiSetting $setting): array
    {
        return [
            'id' => $setting->id,
            'provider_type' => $setting->provider_type,
            'endpoint' => $setting->endpoint,
            'model' => $setting->model,
            'temperature' => $setting->temperature,
            'is_default' => $setting->is_default,
            'has_api_key' => filled($setting->effectiveApiKey()),
        ];
    }
}

<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\UpdateEmbeddingAiSettingsRequest;
use App\Models\UserEmbeddingAiSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EmbeddingAiSettingsController extends Controller
{
    public function edit(Request $request): Response
    {
        $setting = $request->user()->embeddingAiSetting;

        return Inertia::render('settings/embedding-ai', [
            'setting' => $setting ? [
                'provider_type' => $setting->provider_type,
                'endpoint' => $setting->endpoint,
                'model' => $setting->model,
                'embedding_dimensions' => $setting->embedding_dimensions,
                'has_api_key' => filled($setting->effectiveApiKey()),
            ] : null,
            'providerCatalog' => UserEmbeddingAiSetting::providerCatalog(),
            'status' => $request->session()->get('status'),
        ]);
    }

    public function update(UpdateEmbeddingAiSettingsRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $user = $request->user();

        $setting = $user->embeddingAiSetting ?? new UserEmbeddingAiSetting(['user_id' => $user->id]);

        $setting->fill([
            'provider_type' => $validated['provider_type'],
            'endpoint' => $validated['endpoint'] ?? null,
            'model' => $validated['model'] ?? null,
        ]);

        if (array_key_exists('api_key', $validated) && filled($validated['api_key'])) {
            $setting->api_key = $validated['api_key'];
            $setting->embedding_dimensions = null;
        }

        $setting->save();

        return to_route('settings.ai.embedding.edit')->with('status', 'embedding-ai-settings-saved');
    }
}

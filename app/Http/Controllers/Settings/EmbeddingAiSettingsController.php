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

        $hasIndexedDocs = $request->user()
            ->resources()
            ->whereNotNull('metadata->ingested_at')
            ->exists();

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
            'hasIndexedDocs' => $hasIndexedDocs,
        ]);
    }

    public function update(UpdateEmbeddingAiSettingsRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $user = $request->user();

        $setting = $user->embeddingAiSetting ?? new UserEmbeddingAiSetting(['user_id' => $user->id]);

        // Detect model change for reindex warning
        $oldModel = $setting->exists ? $this->resolveModelString($setting) : null;
        $newModel = $validated['model'] ?? $setting->model;

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

        // Check if model changed and user has indexed documents
        $hasIndexedDocs = $user->resources()->whereNotNull('metadata->ingested_at')->exists();
        $modelChanged = $oldModel !== null && $oldModel !== $this->resolveModelString($setting);

        if ($hasIndexedDocs && $modelChanged) {
            return to_route('settings.ai.embedding.edit')
                ->with('status', 'embedding-ai-settings-saved')
                ->with('model_changed', true)
                ->with('needs_reindex', true);
        }

        return to_route('settings.ai.embedding.edit')->with('status', 'embedding-ai-settings-saved');
    }

    private function resolveModelString(UserEmbeddingAiSetting $setting): string
    {
        return $setting->model ?? match ($setting->provider_type) {
            'ollama' => 'nomic-embed-text',
            'openai' => 'text-embedding-3-small',
            'openrouter' => 'openai/text-embedding-3-small',
            'gemini' => 'text-embedding-004',
            'cohere' => 'embed-english-v3.0',
            'jina' => 'jina-embeddings-v3',
            'voyage' => 'voyage-3',
            'together' => 'BAAI/bge-large-en-v1.5',
            default => '',
        };
    }
}

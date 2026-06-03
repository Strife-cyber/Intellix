<?php

use App\Models\User;
use App\Models\UserChatAiSetting;
use App\Models\UserEmbeddingAiSetting;
use App\Support\AiProviders;

test('chat ai settings page is displayed', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('settings.ai.chat.edit'))
        ->assertOk();
});

test('embedding ai settings page is displayed', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('settings.ai.embedding.edit'))
        ->assertOk();
});

test('settings ai redirects to chat', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get('/settings/ai')
        ->assertRedirect('/settings/ai/chat');
});

test('user can add chat ai provider', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('settings.ai.chat.store'), [
            'provider_type' => AiProviders::LMSTUDIO,
            'endpoint' => 'http://localhost:1234',
            'model' => 'local-model',
            'temperature' => 0.5,
            'api_key' => 'secret-key',
            'is_default' => true,
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('settings.ai.chat.edit'));

    $this->assertDatabaseHas('user_chat_ai_settings', [
        'user_id' => $user->id,
        'provider_type' => AiProviders::LMSTUDIO,
        'is_default' => true,
    ]);

    expect($user->fresh()->chatAiSettings()->first()?->api_key)->toBe('secret-key');
});

test('user can update existing chat provider', function () {
    $user = User::factory()->create();
    $setting = UserChatAiSetting::factory()->for($user)->create([
        'provider_type' => AiProviders::GEMINI,
        'model' => 'old-model',
        'api_key' => 'old-key',
    ]);

    $this->actingAs($user)
        ->put(route('settings.ai.chat.update', $setting), [
            'model' => 'gemini-2.0',
            'temperature' => 0.3,
            'is_default' => true,
        ])
        ->assertRedirect(route('settings.ai.chat.edit'));

    $setting->refresh();
    expect($setting->model)->toBe('gemini-2.0')
        ->and($setting->api_key)->toBe('old-key')
        ->and($setting->is_default)->toBeTrue();
});

test('user can set default chat provider without editing fields', function () {
    $user = User::factory()->create();

    $ollama = UserChatAiSetting::factory()->for($user)->create([
        'provider_type' => AiProviders::OLLAMA,
        'is_default' => true,
    ]);
    $lmstudio = UserChatAiSetting::factory()->for($user)->create([
        'provider_type' => AiProviders::LMSTUDIO,
        'is_default' => false,
    ]);

    $this->actingAs($user)
        ->post(route('settings.ai.chat.default', $lmstudio))
        ->assertRedirect(route('settings.ai.chat.edit'));

    expect($ollama->fresh()->is_default)->toBeFalse()
        ->and($lmstudio->fresh()->is_default)->toBeTrue();
});

test('user can delete chat provider', function () {
    $user = User::factory()->create();
    $setting = UserChatAiSetting::factory()->for($user)->create();

    $this->actingAs($user)
        ->delete(route('settings.ai.chat.destroy', $setting))
        ->assertRedirect(route('settings.ai.chat.edit'));

    $this->assertDatabaseMissing('user_chat_ai_settings', ['id' => $setting->id]);
});

test('user can save embedding ai settings with openrouter', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->put(route('settings.ai.embedding.update'), [
            'provider_type' => AiProviders::OPENROUTER,
            'api_key' => 'sk-or-test',
            'model' => 'openai/text-embedding-3-small',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('settings.ai.embedding.edit'));
});

test('chat and embedding settings are independent', function () {
    $user = User::factory()->create();

    UserChatAiSetting::factory()->for($user)->create([
        'provider_type' => AiProviders::GEMINI,
        'is_default' => true,
    ]);
    UserEmbeddingAiSetting::factory()->for($user)->create([
        'provider_type' => AiProviders::LMSTUDIO,
    ]);

    expect(app(\App\Services\UserAiProviderResolver::class)->defaultSetting($user)?->provider_type)
        ->toBe(AiProviders::GEMINI)
        ->and(app(\App\Services\UserEmbeddingService::class)->embeddingSetting($user)?->provider_type)
        ->toBe(AiProviders::LMSTUDIO);
});

test('gemini cer payload omits endpoint like micro-cer', function () {
    $user = User::factory()->create();
    $setting = UserChatAiSetting::factory()->for($user)->create([
        'provider_type' => AiProviders::GEMINI,
        'api_key' => 'test-gemini-key',
        'model' => 'gemini-2.0-flash',
        'is_default' => true,
    ]);

    $payload = $setting->toCerProviderPayload();

    expect($payload)->toHaveKeys(['type', 'apiKey', 'model'])
        ->and($payload['type'])->toBe('gemini')
        ->and($payload['apiKey'])->toBe('test-gemini-key')
        ->and($payload)->not->toHaveKey('endpoint');
});

test('chat provider catalog includes gemini and openrouter', function () {
    $types = array_column(UserChatAiSetting::providerCatalog(), 'type');

    expect($types)->toContain(AiProviders::GEMINI, AiProviders::OPENROUTER);
});

test('user cannot modify another users chat setting', function () {
    $owner = User::factory()->create();
    $other = User::factory()->create();
    $setting = UserChatAiSetting::factory()->for($owner)->create();

    $this->actingAs($other)
        ->delete(route('settings.ai.chat.destroy', $setting))
        ->assertForbidden();
});

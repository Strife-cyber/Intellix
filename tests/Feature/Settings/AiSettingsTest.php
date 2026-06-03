<?php

use App\Models\User;
use App\Models\UserAiSetting;

test('ai settings page is displayed', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get(route('settings.ai.edit'));

    $response->assertOk();
});

test('user can add ai provider settings', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->post(route('settings.ai.store'), [
            'provider_type' => UserAiSetting::PROVIDER_LMSTUDIO,
            'endpoint' => 'http://localhost:1234',
            'model' => 'local-model',
            'temperature' => 0.5,
            'api_key' => 'secret-key',
            'is_default' => true,
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('settings.ai.edit'));

    $this->assertDatabaseHas('user_ai_settings', [
        'user_id' => $user->id,
        'provider_type' => UserAiSetting::PROVIDER_LMSTUDIO,
        'endpoint' => 'http://localhost:1234',
        'model' => 'local-model',
        'is_default' => true,
    ]);

    $setting = UserAiSetting::query()->where('user_id', $user->id)->first();
    expect($setting?->api_key)->toBe('secret-key');
});

test('user can update existing ai provider', function () {
    $user = User::factory()->create();
    $setting = UserAiSetting::factory()->for($user)->create([
        'provider_type' => UserAiSetting::PROVIDER_GEMINI,
        'model' => 'old-model',
        'api_key' => 'old-key',
    ]);

    $this->actingAs($user)
        ->put(route('settings.ai.update', $setting), [
            'model' => 'gemini-2.0',
            'endpoint' => 'https://generativelanguage.googleapis.com',
            'temperature' => 0.3,
            'is_default' => true,
        ])
        ->assertRedirect(route('settings.ai.edit'));

    $setting->refresh();
    expect($setting->model)->toBe('gemini-2.0')
        ->and($setting->api_key)->toBe('old-key')
        ->and($setting->is_default)->toBeTrue();
});

test('user can set default provider without editing fields', function () {
    $user = User::factory()->create();

    $ollama = UserAiSetting::factory()->for($user)->create([
        'provider_type' => UserAiSetting::PROVIDER_OLLAMA,
        'is_default' => true,
    ]);
    $lmstudio = UserAiSetting::factory()->for($user)->create([
        'provider_type' => UserAiSetting::PROVIDER_LMSTUDIO,
        'is_default' => false,
    ]);

    $this->actingAs($user)
        ->post(route('settings.ai.default', $lmstudio))
        ->assertRedirect(route('settings.ai.edit'));

    expect($ollama->fresh()->is_default)->toBeFalse()
        ->and($lmstudio->fresh()->is_default)->toBeTrue();
});

test('user can delete ai provider', function () {
    $user = User::factory()->create();
    $setting = UserAiSetting::factory()->for($user)->create();

    $this->actingAs($user)
        ->delete(route('settings.ai.destroy', $setting))
        ->assertRedirect(route('settings.ai.edit'));

    $this->assertDatabaseMissing('user_ai_settings', ['id' => $setting->id]);
});

test('only one default provider is kept per user', function () {
    $user = User::factory()->create();

    UserAiSetting::factory()->for($user)->create([
        'provider_type' => UserAiSetting::PROVIDER_OLLAMA,
        'is_default' => true,
    ]);

    $this->actingAs($user)->post(route('settings.ai.store'), [
        'provider_type' => UserAiSetting::PROVIDER_LMSTUDIO,
        'endpoint' => 'http://localhost:1234',
        'model' => 'local-model',
        'temperature' => 0.7,
        'is_default' => true,
    ])->assertRedirect(route('settings.ai.edit'));

    expect(UserAiSetting::query()->where('user_id', $user->id)->where('is_default', true)->count())->toBe(1);
    expect(UserAiSetting::query()->where('user_id', $user->id)->where('provider_type', UserAiSetting::PROVIDER_OLLAMA)->value('is_default'))->toBeFalse();
});

test('gemini cer payload omits endpoint like micro-cer', function () {
    $user = User::factory()->create();
    $setting = UserAiSetting::factory()->for($user)->create([
        'provider_type' => UserAiSetting::PROVIDER_GEMINI,
        'api_key' => 'test-gemini-key',
        'model' => 'gemini-2.0-flash',
        'endpoint' => 'https://should-not-be-sent.example',
        'is_default' => true,
    ]);

    $payload = $setting->toCerProviderPayload();

    expect($payload)->toHaveKeys(['type', 'apiKey', 'model'])
        ->and($payload['type'])->toBe('gemini')
        ->and($payload['apiKey'])->toBe('test-gemini-key')
        ->and($payload)->not->toHaveKey('endpoint');
});

test('user cannot modify another users ai setting', function () {
    $owner = User::factory()->create();
    $other = User::factory()->create();
    $setting = UserAiSetting::factory()->for($owner)->create();

    $this->actingAs($other)
        ->delete(route('settings.ai.destroy', $setting))
        ->assertForbidden();
});

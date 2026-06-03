<?php

use App\Models\User;
use App\Models\UserAiSetting;
use Illuminate\Support\Facades\Http;

test('cer proxy routes require authentication', function () {
    $this->get('/api/themes')->assertRedirect('/login');
});

test('authenticated cer proxy forwards signed themes request', function () {
    config(['services.cer.base_url' => 'http://micro-cer.test/api']);

    Http::fake([
        'micro-cer.test/api/themes' => Http::response(['themes' => ['coffee']], 200),
    ]);

    $user = User::factory()->create();

    $this->actingAs($user)
        ->get('/api/themes')
        ->assertOk()
        ->assertJson(['themes' => ['coffee']]);

    Http::assertSent(function ($request) use ($user) {
        return $request->url() === 'http://micro-cer.test/api/themes'
            && $request->hasHeader('X-CER-USER-KEY', (string) $user->id)
            && $request->hasHeader('X-CER-SIGNATURE')
            && $request->hasHeader('X-CER-TIMESTAMP');
    });
});

test('cer job proxy injects provider from user ai settings', function () {
    config(['services.cer.base_url' => 'http://micro-cer.test/api']);

    Http::fake([
        'micro-cer.test/api/jobs/cer' => Http::response(['id' => 'job-1', 'status' => 'queued'], 202),
    ]);

    $user = User::factory()->create();
    UserAiSetting::factory()->for($user)->create([
        'provider_type' => UserAiSetting::PROVIDER_LMSTUDIO,
        'endpoint' => 'http://localhost:1234',
        'model' => 'local-model',
        'api_key' => 'abc',
        'is_default' => true,
    ]);

    $this->actingAs($user)
        ->post('/cers/generate', [
            'prosit' => ['keywords' => []],
            'title' => 'Test',
            'description' => 'Desc',
            'version' => 1,
            'theme' => 'coffee',
            'template_id' => 'default',
        ])
        ->assertRedirect();

    Http::assertSent(function ($request) {
        $body = $request->data();

        return $request->url() === 'http://micro-cer.test/api/jobs/cer'
            && ($body['provider']['type'] ?? null) === UserAiSetting::PROVIDER_LMSTUDIO
            && ($body['provider']['model'] ?? null) === 'local-model';
    });
});

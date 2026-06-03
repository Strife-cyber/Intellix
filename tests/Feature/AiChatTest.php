<?php

use App\Models\User;
use App\Models\UserAiSetting;
use Illuminate\Support\Facades\Http;

test('ai chat accepts numeric session id from dexie', function () {
    Http::fake([
        'generativelanguage.googleapis.com/*' => Http::response([
            'candidates' => [[
                'content' => [
                    'parts' => [['text' => 'Bonjour !']],
                ],
            ]],
        ], 200),
    ]);

    $user = User::factory()->create();

    UserAiSetting::factory()->for($user)->create([
        'provider_type' => UserAiSetting::PROVIDER_GEMINI,
        'model' => 'gemini-2.0-flash',
        'api_key' => 'test-gemini-key',
        'is_default' => true,
    ]);

    $response = $this
        ->actingAs($user)
        ->postJson(route('ai.chat'), [
            'message' => 'hwllo',
            'resource_id' => '019e8d17-cdef-715c-9312-426b7c44f0e3',
            'session_id' => 3,
            'conversation_history' => [
                [
                    'sessionId' => 3,
                    'role' => 'user',
                    'content' => 'hwllo',
                    'createdAt' => 1_780_483_897_743,
                    'id' => 5,
                ],
            ],
        ]);

    $response
        ->assertOk()
        ->assertJsonPath('answer', 'Bonjour !');

    Http::assertSent(function ($request) {
        return str_contains($request->url(), 'generativelanguage.googleapis.com')
            && str_contains($request->url(), 'gemini-2.0-flash');
    });
});

test('ai chat returns provider error details on failure', function () {
    Http::fake([
        'generativelanguage.googleapis.com/*' => Http::response('API key invalid', 403),
    ]);

    $user = User::factory()->create();

    UserAiSetting::factory()->for($user)->create([
        'provider_type' => UserAiSetting::PROVIDER_GEMINI,
        'model' => 'gemini-2.0-flash',
        'api_key' => 'bad-key',
        'is_default' => true,
    ]);

    $response = $this
        ->actingAs($user)
        ->postJson(route('ai.chat'), [
            'message' => 'hello',
            'resource_id' => '019e8d17-cdef-715c-9312-426b7c44f0e3',
        ]);

    $response
        ->assertStatus(503)
        ->assertJsonPath('error', 'AI request failed')
        ->assertJsonStructure(['details']);
});

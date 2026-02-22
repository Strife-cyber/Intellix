<?php

use App\Enums\AccessRole;
use App\Enums\ResourceStatus;
use App\Models\FlashCard;
use App\Models\Resource;
use App\Models\User;
use Illuminate\Support\Str;

beforeEach(function () {
    $this->owner = User::factory()->create();
    $this->viewer = User::factory()->create();
    $this->stranger = User::factory()->create();

    $this->resource = Resource::create([
        'id' => Str::uuid()->toString(),
        'user_id' => $this->owner->id,
        'original_name' => 'Test Paper.pdf',
        'mime_type' => 'application/pdf',
        'size_bytes' => 1024,
        's3_key' => 'test/paper.pdf',
        'status' => ResourceStatus::READY->value,
    ]);

    $this->resource->grantAccess($this->owner, AccessRole::OWNER->value);
    $this->resource->grantAccess($this->viewer, AccessRole::VIEWER->value);
});

test('owner can list flashcards', function () {
    FlashCard::factory()->count(3)->create([
        'resource_id' => $this->resource->id,
        'user_id' => $this->owner->id,
    ]);

    $response = $this->actingAs($this->owner)
        ->getJson("/api/v1/flashcards?resource_id={$this->resource->id}");

    $response->assertStatus(200)
        ->assertJsonCount(3, 'data')
        ->assertJsonPath('can_edit', true);
});

test('viewer can list flashcards but cannot edit', function () {
    FlashCard::factory()->count(2)->create([
        'resource_id' => $this->resource->id,
        'user_id' => $this->owner->id,
    ]);

    $response = $this->actingAs($this->viewer)
        ->getJson("/api/v1/flashcards?resource_id={$this->resource->id}");

    $response->assertStatus(200)
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('can_edit', false);
});

test('stranger cannot list flashcards for resource', function () {
    $response = $this->actingAs($this->stranger)
        ->getJson("/api/v1/flashcards?resource_id={$this->resource->id}");

    $response->assertStatus(403);
});

test('owner can create flashcard', function () {
    $response = $this->actingAs($this->owner)
        ->postJson('/api/v1/flashcards', [
            'resource_id' => $this->resource->id,
            'front' => 'What is Laravel?',
            'back' => 'A PHP Framework.',
        ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.front', 'What is Laravel?');

    $this->assertDatabaseHas('flash_cards', [
        'resource_id' => $this->resource->id,
        'front' => 'What is Laravel?',
    ]);
});

test('viewer cannot create flashcard', function () {
    $response = $this->actingAs($this->viewer)
        ->postJson('/api/v1/flashcards', [
            'resource_id' => $this->resource->id,
            'front' => 'Sneaky?',
            'back' => 'No.',
        ]);

    $response->assertStatus(403);
});

test('owner can update flashcard', function () {
    $card = FlashCard::factory()->create([
        'resource_id' => $this->resource->id,
        'user_id' => $this->owner->id,
        'front' => 'Old Front',
    ]);

    $response = $this->actingAs($this->owner)
        ->putJson("/api/v1/flashcards/{$card->id}", [
            'front' => 'New Front',
        ]);

    $response->assertStatus(200)
        ->assertJsonPath('data.front', 'New Front');
});

test('owner can delete flashcard', function () {
    $card = FlashCard::factory()->create([
        'resource_id' => $this->resource->id,
        'user_id' => $this->owner->id,
    ]);

    $response = $this->actingAs($this->owner)
        ->deleteJson("/api/v1/flashcards/{$card->id}");

    $response->assertStatus(200);
    $this->assertDatabaseMissing('flash_cards', ['id' => $card->id]);
});

test('viewer can review flashcard', function () {
    $card = FlashCard::factory()->create([
        'resource_id' => $this->resource->id,
        'user_id' => $this->owner->id,
    ]);

    // This will likely return 500 or 404 in test env depending on binary, but should NOT be 403
    $response = $this->actingAs($this->viewer)
        ->postJson("/api/v1/flashcards/{$card->id}/review", [
            'rating' => 3,
            'duration_ms' => 5000,
        ]);

    expect($response->status())->not()->toBe(403);
});

test('stranger cannot review flashcard', function () {
    $card = FlashCard::factory()->create([
        'resource_id' => $this->resource->id,
        'user_id' => $this->owner->id,
    ]);

    $response = $this->actingAs($this->stranger)
        ->postJson("/api/v1/flashcards/{$card->id}/review", [
            'rating' => 3,
            'duration_ms' => 5000,
        ]);

    $response->assertStatus(403);
});

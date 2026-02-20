<?php

namespace Database\Factories;

use App\Models\Resource;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\FlashCard>
 */
class FlashCardFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'resource_id' => Resource::factory(),
            'front' => $this->faker->sentence(),
            'back' => $this->faker->paragraph(),
            'interval_days' => 0,
            'stability' => null,
            'difficulty' => null,
            'next_review' => now(),
            'last_reviewed_at' => null,
        ];
    }
}

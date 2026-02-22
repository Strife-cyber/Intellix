<?php

namespace Database\Factories;

use App\Enums\ResourceStatus;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Resource>
 */
class ResourceFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'id' => Str::uuid()->toString(),
            'user_id' => User::factory(),
            'original_name' => $this->faker->word().'.pdf',
            'mime_type' => 'application/pdf',
            'size_bytes' => $this->faker->numberBetween(1000, 1000000),
            's3_key' => 'resources/'.$this->faker->uuid().'/file.pdf',
            'status' => ResourceStatus::READY->value,
        ];
    }
}

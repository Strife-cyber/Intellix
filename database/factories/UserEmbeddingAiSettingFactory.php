<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\UserEmbeddingAiSetting;
use App\Support\AiProviders;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<UserEmbeddingAiSetting>
 */
class UserEmbeddingAiSettingFactory extends Factory
{
    protected $model = UserEmbeddingAiSetting::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'provider_type' => AiProviders::LMSTUDIO,
            'endpoint' => 'http://localhost:1234',
            'model' => 'test-embed',
        ];
    }
}

<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\UserAiSetting;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<UserAiSetting>
 */
class UserAiSettingFactory extends Factory
{
    protected $model = UserAiSetting::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'provider_type' => UserAiSetting::PROVIDER_LMSTUDIO,
            'api_key' => 'test-key',
            'endpoint' => 'http://localhost:1234',
            'model' => 'local-model',
            'temperature' => 0.7,
            'is_default' => true,
        ];
    }
}

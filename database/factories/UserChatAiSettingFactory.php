<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\UserChatAiSetting;
use App\Support\AiProviders;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<UserChatAiSetting>
 */
class UserChatAiSettingFactory extends Factory
{
    protected $model = UserChatAiSetting::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'provider_type' => AiProviders::GEMINI,
            'api_key' => 'test-chat-key',
            'model' => 'gemini-2.0-flash',
            'temperature' => 0.7,
            'is_default' => true,
        ];
    }
}

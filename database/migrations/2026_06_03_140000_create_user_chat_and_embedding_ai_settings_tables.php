<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_chat_ai_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('provider_type');
            $table->text('api_key')->nullable();
            $table->string('endpoint')->nullable();
            $table->string('model')->nullable();
            $table->decimal('temperature', 3, 2)->default(0.7);
            $table->timestamps();
        });

        Schema::create('user_embedding_ai_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('provider_type');
            $table->text('api_key')->nullable();
            $table->string('endpoint')->nullable();
            $table->string('model')->nullable();
            $table->unsignedSmallInteger('embedding_dimensions')->nullable();
            $table->timestamps();
        });

        if (Schema::hasTable('user_ai_settings')) {
            $this->migrateLegacyRows();
            Schema::drop('user_ai_settings');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('user_embedding_ai_settings');
        Schema::dropIfExists('user_chat_ai_settings');
    }

    private function migrateLegacyRows(): void
    {
        $rows = DB::table('user_ai_settings')->get();

        foreach ($rows->where('is_default', true) as $chat) {
            DB::table('user_chat_ai_settings')->updateOrInsert(
                ['user_id' => $chat->user_id],
                [
                    'provider_type' => $chat->provider_type,
                    'api_key' => $chat->api_key,
                    'endpoint' => $chat->endpoint,
                    'model' => $chat->model,
                    'temperature' => $chat->temperature,
                    'created_at' => $chat->created_at,
                    'updated_at' => now(),
                ],
            );
        }

        foreach ($rows->where('is_embedding_default', true) as $embed) {
            DB::table('user_embedding_ai_settings')->updateOrInsert(
                ['user_id' => $embed->user_id],
                [
                    'provider_type' => $embed->provider_type,
                    'api_key' => $embed->api_key,
                    'endpoint' => $embed->endpoint,
                    'model' => $embed->embedding_model ?: $embed->model,
                    'embedding_dimensions' => $embed->embedding_dimensions,
                    'created_at' => $embed->created_at,
                    'updated_at' => now(),
                ],
            );
        }
    }
};

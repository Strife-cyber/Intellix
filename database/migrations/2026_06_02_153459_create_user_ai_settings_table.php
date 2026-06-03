<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('user_ai_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('provider_type');
            $table->text('api_key')->nullable();
            $table->string('endpoint')->nullable();
            $table->string('model')->nullable();
            $table->decimal('temperature', 3, 2)->default(0.7);
            $table->boolean('is_default')->default(false);
            $table->timestamps();

            $table->unique(['user_id', 'provider_type']);
            $table->index(['user_id', 'is_default']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_ai_settings');
    }
};

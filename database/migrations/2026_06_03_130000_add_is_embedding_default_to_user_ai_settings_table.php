<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_ai_settings', function (Blueprint $table) {
            $table->boolean('is_embedding_default')->default(false)->after('is_default');
            $table->index(['user_id', 'is_embedding_default']);
        });
    }

    public function down(): void
    {
        Schema::table('user_ai_settings', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'is_embedding_default']);
            $table->dropColumn('is_embedding_default');
        });
    }
};

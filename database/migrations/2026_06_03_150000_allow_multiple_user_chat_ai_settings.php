<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_chat_ai_settings', function (Blueprint $table) {
            $table->dropUnique(['user_id']);
            $table->boolean('is_default')->default(false)->after('temperature');
            $table->unique(['user_id', 'provider_type']);
        });

        DB::table('user_chat_ai_settings')->update(['is_default' => true]);
    }

    public function down(): void
    {
        Schema::table('user_chat_ai_settings', function (Blueprint $table) {
            $table->dropUnique(['user_id', 'provider_type']);
            $table->dropColumn('is_default');
            $table->unique('user_id');
        });
    }
};

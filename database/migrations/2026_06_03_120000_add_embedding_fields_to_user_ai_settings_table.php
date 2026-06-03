<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_ai_settings', function (Blueprint $table) {
            $table->string('embedding_model')->nullable()->after('model');
            $table->unsignedSmallInteger('embedding_dimensions')->nullable()->after('embedding_model');
        });
    }

    public function down(): void
    {
        Schema::table('user_ai_settings', function (Blueprint $table) {
            $table->dropColumn(['embedding_model', 'embedding_dimensions']);
        });
    }
};

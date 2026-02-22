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
        Schema::table('resources', function (Blueprint $table) {
            $table->foreignUuid('prosit_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type')->nullable();
            $table->text('description')->nullable();
            $table->string('external_url')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('resources', function (Blueprint $table) {
            $table->dropForeign(['prosit_id']);
            $table->dropColumn(['prosit_id', 'type', 'description', 'external_url']);
        });
    }
};

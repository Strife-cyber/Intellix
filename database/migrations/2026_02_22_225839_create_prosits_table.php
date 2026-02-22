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
        Schema::create('prosits', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('chapter_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->longText('problem_statement');
            $table->text('context')->nullable();
            $table->string('difficulty_level')->nullable();
            $table->integer('estimated_duration')->nullable()->comment('Duration in minutes');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('prosits');
    }
};

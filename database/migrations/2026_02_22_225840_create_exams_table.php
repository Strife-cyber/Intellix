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
        Schema::create('exams', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('prosit_id')->constrained()->cascadeOnDelete();
            $table->boolean('generated_by_ai')->default(false);
            $table->string('difficulty_level')->nullable();
            $table->integer('duration')->nullable()->comment('Duration in minutes');
            $table->integer('total_marks')->default(100);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('exams');
    }
};

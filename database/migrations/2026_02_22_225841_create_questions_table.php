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
        Schema::create('questions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('exam_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['mcq', 'true_false', 'structured']);
            $table->text('question_text');
            $table->foreignUuid('competence_id')->constrained()->cascadeOnDelete();
            $table->string('difficulty')->nullable();
            $table->integer('marks')->default(1);
            $table->text('explanation');
            $table->json('options')->nullable();
            $table->string('correct_option')->nullable();
            $table->boolean('correct_boolean')->nullable();
            $table->text('expected_answer')->nullable();
            $table->json('grading_rubric')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('questions');
    }
};

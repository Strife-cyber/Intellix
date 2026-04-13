<?php

use App\Enums\NoteType;
use App\Models\Course;
use App\Models\User;
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
        Schema::create('notes', function (Blueprint $table) {
            $table->id();
            $table->foreignIdFor(User::class)->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('slug');

            $table->json('content');

            $table->foreignIdFor(Course::class)->nullable();
            $table->foreignId('parent_id')->nullable()->constrained('notes')->nullOnDelete();
            $table->boolean('is_published')->default(false);

            $table->integer('version')->default(1);

            $table->enum('type', NoteType::cases())->default(NoteType::OTHER);

            $table->timestamps();
            $table->index(['parent_id', 'version']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notes');
    }
};

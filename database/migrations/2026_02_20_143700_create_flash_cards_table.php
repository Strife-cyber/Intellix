<?php

use App\Models\Resource;
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
        Schema::create('flash_cards', function (Blueprint $table) {
            $table->id();

            $table->foreignIdFor(User::class)->constrained()->cascadeOnDelete();
            $table->foreignIdFor(Resource::class)->constrained()->cascadeOnDelete();

            $table->text('front');
            $table->text('back');

            $table->integer('interval_days')->default(0);

            $table->float('stability')->nullable();
            $table->float('difficulty')->nullable();

            $table->timestamp('next_review')->nullable()->index();
            $table->timestamp('last_reviewed_at')->nullable();

            $table->timestamps();

            // Helps the "due cards" query
            $table->index(['user_id', 'next_review']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('flash_cards');
    }
};

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
        Schema::create('cahiers', function (Blueprint $table) {
            $table->id();

            $table->integer('version');
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('prosit');
            $table->json('pdfs')->nullable();
            $table->json('zips')->nullable();
            $table->json('objectifs')->nullable();
            $table->json('difficultes')->nullable();
            $table->json('perspectives')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cahiers');
    }
};

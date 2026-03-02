<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Explicitly drop the check constraint created by the enum type in PostgreSQL
        try {
            DB::statement('ALTER TABLE competences DROP CONSTRAINT IF EXISTS competences_taxonomy_level_check');
        } catch (\Exception $e) {
            // Log or ignore if it doesn't exist
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};

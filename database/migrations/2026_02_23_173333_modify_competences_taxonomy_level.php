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
        // On PostgreSQL, changing an enum column is best done by changing type to string first 
        // to drop the check constraint automatically created for enums.
        Schema::table('competences', function (Blueprint $table) {
            $table->string('taxonomy_level')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('competences', function (Blueprint $table) {
            $table->enum('taxonomy_level', ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'])->change();
        });
    }
};

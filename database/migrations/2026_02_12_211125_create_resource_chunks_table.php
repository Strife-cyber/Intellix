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
        Schema::create('resource_chunks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('resource_id')->constrained()->cascadeOnDelete();
            $table->integer('chunk_index');
            $table->text('content');
            // Fallback to JSON if vector type is not available.
            // Ideally this should be: $table->vector('embedding', 1536);
            // But since the extension is missing, we use json.
            // Check if vector type exists before creating? 
            // For now, let's use json to ensure migration passes.
            // Verify if we can check for type existence easily in migration... 
            // Better yet, let's try to use vector if extension exists, else json.
             
            $hasVector = false;
            try {
                $hasVector = count(DB::select("SELECT * FROM pg_type WHERE typname = 'vector'")) > 0;
            } catch (\Exception $e) {
                // ignore
            }

            if ($hasVector) {
                 $table->vector('embedding', 1536);
            } else {
                 $table->json('embedding');
            }
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('resource_chunks');
    }
};

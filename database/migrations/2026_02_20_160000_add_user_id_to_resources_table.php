<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resources', function (Blueprint $table) {
            // Nullable initially so we can back-fill existing rows
            $table->foreignIdFor(User::class)
                ->nullable()
                ->after('id')
                ->constrained()
                ->nullOnDelete();
        });

        // Back-fill: try to find the owner from the access table
        // SQLite/Postgres/MySQL compatible simplified update
        DB::statement("
            UPDATE resources
            SET user_id = (
                SELECT user_id FROM access
                WHERE access.resource_id = resources.id
                  AND access.role = 'owner'
                LIMIT 1
            )
            WHERE user_id IS NULL
        ");
    }

    public function down(): void
    {
        Schema::table('resources', function (Blueprint $table) {
            $table->dropForeignIdFor(User::class);
            $table->dropColumn('user_id');
        });
    }
};

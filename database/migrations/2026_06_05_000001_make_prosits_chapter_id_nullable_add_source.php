<?php

use App\Enums\PrositSource;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('prosits', function (Blueprint $table) {
            // Make chapter_id nullable so prosits can exist unallocated
            $table->foreignUuid('chapter_id')->nullable()->change();

            // Track the origin of the prosit
            $table->string('source')->default(PrositSource::MANUAL->value)->after('chapter_id');

            // Link back to the CER microservice if imported from there
            $table->string('cer_microservice_id')->nullable()->unique()->after('source');
        });
    }

    public function down(): void
    {
        Schema::table('prosits', function (Blueprint $table) {
            $table->dropColumn(['source', 'cer_microservice_id']);
            $table->foreignUuid('chapter_id')->nullable(false)->change();
        });
    }
};

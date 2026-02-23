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
        Schema::table('prosits', function (Blueprint $table) {
            $table->renameColumn('problem_statement', 'problematique');
            $table->renameColumn('context', 'contexte');
            $table->longText('texte')->nullable();
            $table->text('mots_cles')->nullable();
            $table->text('besoin')->nullable();
            $table->string('generalisation')->nullable();
            $table->text('piste_de_solution')->nullable();
            $table->text('plan_d_action')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('prosits', function (Blueprint $table) {
            $table->renameColumn('problematique', 'problem_statement');
            $table->renameColumn('contexte', 'context');
            $table->dropColumn([
                'texte',
                'mots_cles',
                'besoin',
                'generalisation',
                'piste_de_solution',
                'plan_d_action',
            ]);
        });
    }
};

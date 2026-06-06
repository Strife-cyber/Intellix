<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Prosit extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'chapter_id',
        'source',
        'cer_microservice_id',
        'mots_cles',
        'contexte',
        'besoin',
        'problematique',
        'generalisation',
        'piste_de_solution',
        'plan_d_action',
        'texte',
    ];

    protected function casts(): array
    {
        return [
            'chapter_id' => 'string',
        ];
    }

    // ── Scopes ──────────────────────────────────────────────────────────

    /**
     * Scope to only include prosits not yet allocated to a chapter.
     */
    public function scopeUnallocated($query)
    {
        return $query->whereNull('chapter_id');
    }

    /**
     * Scope to only include prosits allocated to a chapter.
     */
    public function scopeAllocated($query)
    {
        return $query->whereNotNull('chapter_id');
    }

    // ── Relations ──────────────────────────────────────────────────────────

    public function chapter(): BelongsTo
    {
        return $this->belongsTo(Chapter::class);
    }

    public function competences(): HasMany
    {
        return $this->hasMany(Competence::class);
    }

    public function exams(): HasMany
    {
        return $this->hasMany(Exam::class);
    }

    public function resources(): HasMany
    {
        return $this->hasMany(Resource::class);
    }
}

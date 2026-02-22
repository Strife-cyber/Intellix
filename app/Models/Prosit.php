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
        'title',
        'problem_statement',
        'context',
        'difficulty_level',
        'estimated_duration',
    ];

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

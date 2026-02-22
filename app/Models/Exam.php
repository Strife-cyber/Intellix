<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Exam extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'prosit_id',
        'generated_by_ai',
        'difficulty_level',
        'duration',
        'total_marks',
    ];

    public function prosit(): BelongsTo
    {
        return $this->belongsTo(Prosit::class);
    }

    public function questions(): HasMany
    {
        return $this->hasMany(Question::class);
    }
}

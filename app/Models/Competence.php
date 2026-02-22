<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Competence extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'prosit_id',
        'title',
        'description',
        'taxonomy_level',
        'weight',
    ];

    public function prosit(): BelongsTo
    {
        return $this->belongsTo(Prosit::class);
    }
}

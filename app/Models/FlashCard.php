<?php

namespace App\Models;

use Database\Factories\FlashCardFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property mixed $next_review
 */
class FlashCard extends Model
{
    /** @use HasFactory<FlashCardFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'resource_id',
        'front',
        'back',
        'interval_days',
        'stability',
        'difficulty',
        'next_review',
        'last_reviewed_at',
    ];

    protected $casts = [
        'next_reviewed' => 'datetime',
        'last_reviewed_at' => 'datetime',
        'interval_days' => 'integer',
        'stability' => 'float',
        'difficulty' => 'float',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function resource(): BelongsTo
    {
        return $this->belongsTo(Resource::class);
    }

    /** Cards due for review (for a user) */
    public function scopeDue(Builder $query): Builder
    {
        return $query->whereNotNull('next_review')
            ->where('next_review', '<', now());
    }
}

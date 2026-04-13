<?php

namespace App\Models;

use Database\Factories\FlashCardFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $user_id
 * @property string $resource_id
 * @property string $front
 * @property string $back
 * @property int $interval_days
 * @property float|null $stability
 * @property float|null $difficulty
 * @property \Carbon\CarbonImmutable|null $next_review
 * @property \Carbon\CarbonImmutable|null $last_reviewed_at
 * @method static where(string $string, $id)
 * @method static forUser(mixed $id)
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
        'next_review' => 'datetime',
        'last_reviewed_at' => 'datetime',
        'interval_days' => 'integer',
        'stability' => 'float',
        'difficulty' => 'float',
    ];

    // ── Relations ──────────────────────────────────────────────────────────

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function resource(): BelongsTo
    {
        return $this->belongsTo(Resource::class);
    }

    // ── Scopes ─────────────────────────────────────────────────────────────

    /**
     * Cards that are due for review (next_review is in the past).
     */
    public function scopeDue(Builder $query): Builder
    {
        return $query->whereNotNull('next_review')
            ->where('next_review', '<=', now());
    }

    /**
     * Scope to cards a user can view:
     * - cards on resources where the user has an Access row (owner/admin/editor/viewer)
     */
    public function scopeForUser(Builder $query, int $userId): Builder
    {
        return $query->whereHas('resource', function (Builder $q) use ($userId) {
            $q->whereHas('users', function (Builder $inner) use ($userId) {
                $inner->where('user_id', $userId);
            });
        });
    }
}

<?php

namespace App\Models;

use App\Enums\AccessRole;
use App\Enums\ResourceStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @method static create(array $array)
 *
 * @property string $id
 * @property int $user_id Owner
 * @property mixed $status
 */
class Resource extends Model
{
    use HasUuids, \Illuminate\Database\Eloquent\Factories\HasFactory;

    protected $fillable = [
        'user_id',
        'original_name',
        'mime_type',
        'size_bytes',
        's3_key',
        'status',
        'metadata',
    ];

    protected $casts = [
        'status' => ResourceStatus::class,
        'metadata' => 'array',
    ];

    // ── Relations ──────────────────────────────────────────────────────────

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'access')
            ->withPivot('role')
            ->withTimestamps();
    }

    public function flashCards(): HasMany
    {
        return $this->hasMany(FlashCard::class);
    }

    public function chunks(): HasMany
    {
        return $this->hasMany(ResourceChunk::class);
    }

    public function prosit(): BelongsTo
    {
        return $this->belongsTo(Prosit::class);
    }

    // ── Access helpers ──────────────────────────────────────────────────────

    /**
     * Get the role of a user on this resource (from the access pivot).
     */
    public function roleOf(User $user): ?string
    {
        $pivot = $this->users()
            ->where('user_id', $user->id)
            ->first()?->pivot;

        return $pivot?->role instanceof AccessRole
            ? $pivot->role->value
            : $pivot?->role;
    }

    /**
     * Returns true if the user owns this resource (user_id match OR owner role).
     */
    public function isOwnedBy(User $user): bool
    {
        return $this->user_id === $user->id
            || $this->roleOf($user) === AccessRole::OWNER->value;
    }

    /**
     * Returns true if the user can edit this resource (owner / admin / editor).
     */
    public function isEditableBy(User $user): bool
    {
        if ($this->isOwnedBy($user)) {
            return true;
        }

        return in_array($this->roleOf($user), [
            AccessRole::ADMIN->value,
            AccessRole::EDITOR->value,
        ], true);
    }

    /**
     * Returns true if the user has any access to this resource.
     */
    public function isAccessibleBy(User $user): bool
    {
        return $this->isOwnedBy($user)
            || $this->users()->where('user_id', $user->id)->exists();
    }

    // ── Legacy pivot helpers (keep backward compat) ────────────────────────

    public function grantAccess(User $user, string $role = 'viewer'): void
    {
        $this->users()->syncWithoutDetaching([
            $user->id => ['role' => $role],
        ]);
    }

    public function updateAccess(User $user, string $role): void
    {
        $this->users()->updateExistingPivot($user->id, ['role' => $role]);
    }

    public function revokeAccess(User $user): void
    {
        $this->users()->detach($user->id);
    }
}

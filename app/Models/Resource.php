<?php

namespace App\Models;

use App\Enums\ResourceStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * @method static create(array $array)
 *
 * @property mixed $id
 * @property mixed $status
 */
class Resource extends Model
{
    use HasUuids;

    protected $fillable = [
        'original_name',
        'mime_type',
        'size_bytes',
        's3_key',
        'status',
    ];

    protected $casts = [
        'status' => ResourceStatus::class,
    ];

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'access')
            ->withPivot('role')
            ->withTimestamps();
    }

    public function grantAccess(User $user, string $role = 'viewer'): void
    {
        $this->users()->syncWithoutDetaching([
            $user->id => ['role' => $role],
        ]);
    }

    public function updateAccess(User $user, string $role): void
    {
        $this->users()->updateExistingPivot($user->id, [
            'role' => $role,
        ]);
    }

    public function revokeAccess(User $user): void
    {
        $this->users()->detach($user->id);
    }

    public function roleOf(User $user): ?string
    {
        return $this->users()
            ->where('user_id', $user->id)
            ->first()?->pivot?->role;
    }
}

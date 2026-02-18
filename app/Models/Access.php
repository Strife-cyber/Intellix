<?php

namespace App\Models;

use App\Enums\AccessRole;
use Database\Factories\AccessFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Access extends Model
{
    /** @use HasFactory<AccessFactory> */
    use HasFactory;

    protected $fillable = [
        'role',
        'user_id',
        'resource_id',
    ];

    protected $casts = [
        'role' => AccessRole::class,
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function resource(): BelongsTo
    {
        return $this->belongsTo(Resource::class);
    }
}

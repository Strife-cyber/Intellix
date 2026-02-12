<?php

namespace App\Models;

use App\Enums\ResourceStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

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
}

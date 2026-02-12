<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Pgvector\Laravel\Vector;

class ResourceChunk extends Model
{
    use HasUuids;
    // use HasNeighbors; // Disabled as vector extension might be missing

    protected $fillable = [
        'resource_id',
        'chunk_index',
        'content',
        'embedding',
    ];

    protected $casts = [
        'embedding' => 'array', // Changed from Vector::class to array for JSON compatibility
    ];

    public function resource(): BelongsTo
    {
        return $this->belongsTo(Resource::class);
    }
}

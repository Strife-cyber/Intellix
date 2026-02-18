<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Pgvector\Laravel\Vector;

class ResourceChunk extends Model
{
    use HasUuids;
    // use HasNeighbors; // Disabled as vector extension might be missing

    protected $fillable = [
        'id',
        'resource_id',
        'chunk_index',
        'content',
        'qdrant_point_id',
    ];

    public function resource(): BelongsTo
    {
        return $this->belongsTo(Resource::class);
    }
}

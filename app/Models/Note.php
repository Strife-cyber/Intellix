<?php

namespace App\Models;

use App\Enums\NoteType;
use Database\Factories\NoteFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property mixed $id
 * @property mixed $version
 * @property mixed $parent_id
 * @property mixed $content
 * @property mixed $type
 * @property mixed $parent
 * @method static where(string $string, mixed $parentId)
 * @method static findOrFail(mixed $parentId)
 */
class Note extends Model
{
    /** @use HasFactory<NoteFactory> */
    use HasFactory;

    protected $fillable = [
        'title', 'content',
        'user_id', 'slug', 'course_id',
        'version', 'type', 'parent_id',
    ];

    protected $casts = [
        'content' => 'array',
        'type' => NoteType::class,
    ];

    /**
     * Get the course that owns the note.
     */
    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    /**
     * Get the user that owns the note.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the original note (the "Aller" or first version).
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Note::class, 'parent_id');
    }

    /**
     * Get all subsequent versions or related "Retours".
     */
    public function versions(): HasMany
    {
        return $this->hasMany(Note::class, 'parent_id')->orderBy('version', 'desc');
    }

    /**
     * Helper to get the latest version easily.
     */
    public function latestVersion(): Note|static
    {
        return $this->versions()->first() ?? $this;
    }
}

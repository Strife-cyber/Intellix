<?php

namespace App\Models\Seo;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SeoMeta extends Model
{
    use HasFactory;

    protected $table = 'seo_meta';
    protected $primaryKey = 'page_name';

    protected $fillable = [
        'page_name',
        'title',
        'description',
        'keywords',
        'canonical_url',
        'og_title',
        'og_description',
        'og_image',
        'twitter_title',
        'twitter_description',
        'twitter_image',
        'robots',
    ];

    public function increment($column = null)
    {
        if (is_null($column)) {
            return parent::increment($this->getKeyName());
        }

        return $this->increment($column);
    }

    /**
     * Get SEO meta for a specific page
     */
    public function getByPage(string $page): ?array
    {
        // Convert kebab-case to snake_case for database query
        $pageName = str_replace('-', '_', $page);

        return $this->where('page_name', $pageName)
            ->first()?->toArray();
    }

    /**
     * Create or update SEO meta for a page
     */
    public function setForPage(string $page, array $data): self
    {
        $pageName = str_replace('-', '_', $page);

        $this->where('page_name', $pageName)->update(array_merge($this->fillable, $data));

        return $this;
    }

    /**
     * Get all SEO meta records
     */
    public function getAll(): array
    {
        return $this->get()->map(fn($m) => (array)$m)->toArray();
    }

    /**
     * Bulk insert or update SEO meta
     */
    public function bulkUpdate(array $data): void
    {
        // Delete existing records first
        $this->truncate();

        // Insert new records
        foreach ($data as $item) {
            $this->create($item);
        }
    }

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        // Automatically set description if not provided
        static::creating(function ($model) {
            if (empty($model->description)) {
                $model->description = config('app.description', 'IntelliX - Transform your data into actionable insights');
            }
        });
    }

    /**
     * Get default title for a page path
     */
    private function getDefaultTitle(): string
    {
        return config('app.name', 'IntelliX') . ' - Transform your data into actionable insights';
    }
}

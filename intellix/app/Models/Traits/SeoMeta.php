<?php

namespace App\Models\Traits;

use App\Models\Seo\SeoMeta;
use Illuminate\Support\Facades\DB;

trait SeoMeta
{
    /**
     * Get SEO meta for a page
     */
    protected function getSeoMeta(string $page): array
    {
        // Try to get from database first
        $seo = SeoMeta::getByPage($page);

        // If no record exists in database, create it with default values
        if (!$seo) {
            return [
                'title' => config('app.name') . ' - Default',
                'description' => config('app.description', 'Transform your data into actionable insights'),
                'keywords' => '',
                'canonical_url' => request()->url(),
                'og_title' => config('app.name'),
                'og_description' => config('app.description', ''),
                'og_image' => '/storage/brand/social-preview.png',
                'twitter_title' => config('app.name'),
                'twitter_description' => '',
                'twitter_image' => null,
            ];
        }

        return $seo;
    }

    /**
     * Set SEO meta for a page in the database
     */
    protected function setSeoMeta(string $page, array $data): void
    {
        // Only save non-null values
        $updateData = [];
        foreach ($data as $key => $value) {
            if ($value !== null && is_string($value)) {
                $updateData[$key] = $value;
            } elseif ($value === null) {
                $this->getSeoMeta($page); // Ensure record exists
            }
        }

        // Save to database if we have data
        if (!empty($updateData)) {
            SeoMeta::setForPage($page, $updateData);
        }
    }

    /**
     * Get page path for SEO purposes
     */
    protected function getPagePath(): string
    {
        // Extract the path from the request and clean it up
        $path = request()->path();

        // Remove file extensions
        $path = preg_replace('/\.[^./]+$/', '', $path);

        return $path;
    }
}

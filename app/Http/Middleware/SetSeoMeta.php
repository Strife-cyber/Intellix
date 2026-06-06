<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SetSeoMeta
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Get the page path for SEO purposes
        $path = $this->getCleanPath($request->path());

        if (!empty($path)) {
            // Try to get SEO meta from database
            $seoMeta = SeoMeta::getByPage($path);

            // If found, set the meta tags
            if ($seoMeta) {
                view()->share('seo_meta', [
                    'title' => $seoMeta['title'] ?? $this->getDefaultTitle(),
                    'description' => $seoMeta['description'] ?? config('app.description', ''),
                    'keywords' => $seoMeta['keywords'] ?? '',
                    'canonical_url' => $seoMeta['canonical_url'] ?? request()->url(),
                    'og_title' => $seoMeta['og_title'],
                    'og_description' => $seoMeta['og_description'],
                    'og_image' => $seoMeta['og_image'],
                    'twitter_card' => 'summary',
                    'twitter_title' => $seoMeta['twitter_title'] ?? config('app.name'),
                    'twitter_description' => $seoMeta['twitter_description'] ?? '',
                    'twitter_image' => $seoMeta['twitter_image'],
                ]);
            }
        }

        return $next($request);
    }

    /**
     * Get clean path for database lookup (kebab-case)
     */
    protected function getCleanPath(string $path): string
    {
        // Remove file extensions
        $path = preg_replace('/\.[^./]+$/', '', $path);

        return $path;
    }

    /**
     * Get default title if no SEO meta found
     */
    protected function getDefaultTitle(): string
    {
        return config('app.name') . ' | IntelliX Business Intelligence';
    }
}

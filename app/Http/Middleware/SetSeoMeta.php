<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\Seo\SeoMeta;

class SetSeoMeta
{
    public function handle(Request $request, Closure $next): mixed
    {
        $path = $this->getCleanPath($request->path());

        if (!empty($path) && $request->isMethod('GET')) {
            try {
                $seoMetaModel = new SeoMeta();
                $seoMeta = $seoMetaModel->getByPage($path);

                $metaData = $seoMeta ?: [
                    'title' => null,
                    'description' => null,
                    'keywords' => null,
                    'canonical_url' => null,
                    'og_title' => null,
                    'og_description' => null,
                    'og_image' => null,
                    'twitter_title' => null,
                    'twitter_description' => null,
                    'twitter_image' => null,
                ];

                view()->share('meta', [
                    'title' => $metaData['title'] ?? $this->getDefaultTitle(),
                    'description' => $metaData['description'] ?? config('app.description', ''),
                    'keywords' => $metaData['keywords'] ?? '',
                    'canonical_url' => $metaData['canonical_url'] ?? $request->url(),
                    'og_title' => $metaData['og_title'] ?? $this->getDefaultTitle(),
                    'og_description' => $metaData['og_description'] ?? config('app.description', ''),
                    'og_image' => $metaData['og_image'] ?? '/storage/brand/social-preview.jpg',
                    'twitter_card' => 'summary_large_image',
                    'twitter_title' => $metaData['twitter_title'] ?? $this->getDefaultTitle(),
                    'twitter_description' => $metaData['twitter_description'] ?? config('app.description', ''),
                    'twitter_image' => $metaData['twitter_image'] ?? '/storage/brand/social-preview.jpg',
                    'robots' => $metaData['robots'] ?? 'index, follow',
                ]);
            } catch (\Exception $e) {
                view()->share('meta', $this->getDefaultMeta($request));
            }
        }

        return $next($request);
    }

    protected function getDefaultMeta(Request $request): array
    {
        $ogImage = '/storage/brand/social-preview.jpg';
        return [
            'title' => $this->getDefaultTitle(),
            'description' => config('app.description', ''),
            'keywords' => '',
            'canonical_url' => $request->url(),
            'og_title' => $this->getDefaultTitle(),
            'og_description' => config('app.description', ''),
            'og_image' => $ogImage,
            'twitter_card' => 'summary_large_image',
            'twitter_title' => $this->getDefaultTitle(),
            'twitter_description' => config('app.description', ''),
            'twitter_image' => $ogImage,
            'robots' => 'index, follow',
        ];
    }

    protected function getCleanPath(string $path): string
    {
        $path = preg_replace('#\.[^./]+$#', '', $path);
        return $path;
    }

    protected function getDefaultTitle(): string
    {
        $name = config('app.name', 'IntelliX');
        return $name . ' - AI-Powered Learning Platform for Deep Work & Academic Excellence';
    }
}

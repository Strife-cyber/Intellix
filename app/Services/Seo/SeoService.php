<?php

namespace App\Services\Seo;

use Illuminate\Support\Facades\DB;

class SeoService
{
    /**
     * Get SEO meta data for a page
     */
    public function getMeta(string $page, string $type = 'default'): array
    {
        $seoModel = new SeoMeta();

        // Try to get from database first
        $meta = $seoModel->getByPage($page);

        if ($meta) {
            return $meta;
        }

        // Return default meta for specific page types
        return match (strtolower($page)) {
            'home' => [
                'title' => 'IntelliX - Intelligent Business Intelligence Platform',
                'description' => 'Transform your data into actionable insights with IntelliX. Enterprise-grade business intelligence, analytics, and reporting solutions for modern organizations.',
                'keywords' => ['business intelligence', 'analytics', 'dashboard', 'reporting', 'enterprise software', 'SaaS', 'data visualization', 'KPI tracking'],
            ],
            default => [
                'title' => $page . ' | IntelliX - Business Intelligence Platform',
                'description' => 'Get powerful analytics and insights from your data with IntelliX. Our platform helps businesses make smarter decisions through advanced data analysis.',
                'keywords' => ['business intelligence', 'analytics', 'data analysis'],
            ],
        };
    }

    /**
     * Get canonical URL for a page
     */
    public function getCanonicalUrl(string $url): string
    {
        // Remove trailing slashes and query params except anchor links
        return rtrim($url, '/');
    }

    /**
     * Sitemap generator
     */
    public function generateSitemap(): array
    {
        return [
            [
                'loc' => url('/'),
                'lastmod' => now()->toIso8601String(),
                'changefreq' => 'daily',
                'priority' => '1.0',
            ],
            // Add more routes here as needed
        ];
    }

    /**
     * Robots.txt content
     */
    public function getRobotsTxt(): string
    {
        return <<<'ROBOTS'
User-agent: *
Allow: /

# Allow crawling of specific pages
Allow: /dashboard/
Allow: /reports/
Allow: /analytics/
Allow: /insights/

# Disallow sensitive paths
Disallow: /api/*
Disallow: /login
Disallow: /register
Disallow: /admin/*

# Sitemap location
Sitemap: {{ config('app.url') }}/{{ config('app.sitemap_path', 'sitemap.xml') }}
ROBOTS;
    }

    /**
     * Get schema.org structured data for the site
     */
    public function getStructuredData(): array
    {
        return [
            [
                '@context' => 'https://schema.org',
                '@type' => 'SoftwareApplication',
                'name' => config('app.name', 'IntelliX'),
                'applicationCategory' => 'BusinessApplication',
                'operatingSystem' => 'Web-based',
                'offers' => [
                    '@type' => 'Offer',
                    'price' => '0',
                    'priceCurrency' => 'USD',
                ],
            ],
        ];
    }

    /**
     * Get breadcrumbs for a page
     */
    public function getBreadcrumbs(string $page): array
    {
        return [
            ['label' => 'Home', 'url' => url('/')],
            ['label' => ucfirst(str_replace('-', ' ', $page)), 'url' => null],
        ];
    }
}

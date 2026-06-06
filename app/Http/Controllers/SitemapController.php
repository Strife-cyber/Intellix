<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class SitemapController extends Controller
{
    public function index()
    {
        $sitemap = '<?xml version="1.0" encoding="UTF-8"?>';
        $sitemap .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

        // Only indexable (public, non-auth) pages
        $pages = [
            ['loc' => url('/'), 'priority' => '1.0', 'changefreq' => 'weekly'],
        ];

        foreach ($pages as $page) {
            $sitemap .= '<url>';
            $sitemap .= '<loc>' . e($page['loc']) . '</loc>';
            $sitemap .= '<lastmod>' . now()->toIso8601String() . '</lastmod>';
            $sitemap .= '<priority>' . $page['priority'] . '</priority>';
            $sitemap .= '<changefreq>' . $page['changefreq'] . '</changefreq>';
            $sitemap .= '</url>';
        }

        $sitemap .= '</urlset>';

        return response($sitemap, 200, [
            'Content-Type' => 'application/xml',
        ]);
    }
}

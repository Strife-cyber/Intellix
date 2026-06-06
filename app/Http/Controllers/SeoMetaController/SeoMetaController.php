<?php

namespace App\Http\Controllers\SeoMetaController;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\JsonResponse;

class SeoMetaController extends Controller
{
    /**
     * Get SEO meta for a specific page (for Inertia.js pages)
     */
    public function getByPage(string $pageName): array
    {
        // Convert kebab-case to snake_case for database query
        $pageName = str_replace('-', '_', $pageName);

        $seoMeta = DB::table('seo_meta')
            ->where('page_name', $pageName)
            ->first();

        if (!$seoMeta) {
            return [
                'page_name' => null,
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
                'robots' => 'index, follow',
            ];
        }

        return (array) $seoMeta;
    }

    /**
     * Store SEO meta for a page
     */
    public function store(array $data): JsonResponse
    {
        // Convert kebab-case to snake_case
        $pageName = str_replace('-', '_', $data['page_name'] ?? '');

        if (empty($pageName)) {
            return response()->json(['message' => 'Page name is required'], 400);
        }

        try {
            DB::table('seo_meta')->insert([
                'page_name' => $pageName,
                'title' => $data['title'] ?? null,
                'description' => $data['description'] ?? null,
                'keywords' => $data['keywords'] ?? null,
                'canonical_url' => $data['canonical_url'] ?? null,
                'og_title' => $data['og_title'] ?? null,
                'og_description' => $data['og_description'] ?? null,
                'og_image' => $data['og_image'] ?? null,
                'twitter_title' => $data['twitter_title'] ?? null,
                'twitter_description' => $data['twitter_description'] ?? null,
                'twitter_image' => $data['twitter_image'] ?? null,
                'robots' => $data['robots'] ?? 'index, follow',
            ]);

            return response()->json(['message' => 'SEO meta created successfully'], 201);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to create SEO meta', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Update SEO meta for a page
     */
    public function update(string $pageName, array $data): JsonResponse
    {
        // Convert kebab-case to snake_case
        $pageName = str_replace('-', '_', $pageName);

        try {
            DB::table('seo_meta')
                ->where('page_name', $pageName)
                ->update($data);

            return response()->json(['message' => 'SEO meta updated successfully']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to update SEO meta', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Bulk insert or update all SEO meta records
     */
    public function bulkUpdate(array $data): JsonResponse
    {
        try {
            // Delete existing records first
            DB::table('seo_meta')->truncate();

            // Insert new records
            foreach ($data as $item) {
                DB::table('seo_meta')->insert([
                    'page_name' => str_replace('-', '_', $item['page_name']),
                    'title' => $item['title'] ?? null,
                    'description' => $item['description'] ?? null,
                    'keywords' => $item['keywords'] ?? null,
                    'canonical_url' => $item['canonical_url'] ?? null,
                    'og_title' => $item['og_title'] ?? null,
                    'og_description' => $item['og_description'] ?? null,
                    'og_image' => $item['og_image'] ?? null,
                    'twitter_title' => $item['twitter_title'] ?? null,
                    'twitter_description' => $item['twitter_description'] ?? null,
                    'twitter_image' => $item['twitter_image'] ?? null,
                    'robots' => $item['robots'] ?? 'index, follow',
                ]);
            }

            return response()->json(['message' => 'SEO meta bulk updated successfully']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to update SEO meta', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get all SEO meta records
     */
    public function getAll()
    {
        $seoMetas = DB::table('seo_meta')->get()->map(fn($m) => (array)$m)->toArray();

        return response()->json($seoMetas);
    }

    /**
     * Delete SEO meta for a page
     */
    public function destroy(string $pageName): JsonResponse
    {
        // Convert kebab-case to snake_case
        $pageName = str_replace('-', '_', $pageName);

        try {
            DB::table('seo_meta')
                ->where('page_name', $pageName)
                ->delete();

            return response()->json(['message' => 'SEO meta deleted successfully']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to delete SEO meta', 'error' => $e->getMessage()], 500);
        }
    }
}

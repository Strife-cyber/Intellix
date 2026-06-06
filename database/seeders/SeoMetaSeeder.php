<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Seo\SeoMeta;

class SeoMetaSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Seed SEO meta for all main pages
        $seoData = [
            'home' => [
                'title' => 'IntelliX - Intelligent Business Intelligence Platform',
                'description' => 'Transform your data into actionable insights with IntelliX. Enterprise-grade business intelligence, analytics, and reporting solutions for modern organizations.',
                'keywords' => 'business intelligence, analytics, dashboard, reporting, enterprise software, SaaS, data visualization, KPI tracking, business analytics, decision support',
                'canonical_url' => config('app.url', '/'),
                'og_title' => 'IntelliX - Business Intelligence Platform',
                'og_description' => 'Transform your data into actionable insights with IntelliX. Enterprise-grade business intelligence and analytics solutions.',
                'og_image' => '/storage/brand/social-preview.png',
                'twitter_title' => 'IntelliX - Business Intelligence Platform',
                'twitter_description' => 'Transform your data into actionable insights with IntelliX.',
                'twitter_image' => '/storage/brand/social-preview.png',
            ],

            // Dashboard
            'dashboard-home' => [
                'title' => 'Dashboard | IntelliX - Business Intelligence Platform',
                'description' => 'Welcome to IntelliX. Your personal business intelligence assistant. Track metrics, review insights, and manage your analytics.',
                'keywords' => 'dashboard, learning dashboard, study tracker, flashcards, analytics, metrics, KPI tracking',
                'canonical_url' => config('app.url') . '/dashboard-home',
                'og_title' => 'Dashboard - IntelliX',
                'og_description' => 'Your personal business intelligence assistant. Track metrics and insights.',
                'og_image' => '/storage/brand/social-preview.png',
            ],

            // Reports
            'reports-index' => [
                'title' => 'Reports | IntelliX - Business Intelligence Platform',
                'description' => 'View, manage, and generate comprehensive business reports from your analytics data. Create custom reports with customizable layouts and filters.',
                'keywords' => 'reports, analytics reports, business reporting, data visualization, dashboards, metrics, insights',
                'canonical_url' => config('app.url') . '/reports/index',
                'og_title' => 'Reports - IntelliX',
                'og_description' => 'View and manage your comprehensive business reports.',
                'og_image' => '/storage/brand/social-preview.png',
            ],

            // Analytics
            'analytics-index' => [
                'title' => 'Analytics | IntelliX - Business Intelligence Platform',
                'description' => 'Deep dive into your data with our advanced analytics tools. Discover patterns, trends, and insights that drive business decisions.',
                'keywords' => 'analytics, data analysis, business intelligence, insights, trends, patterns, statistical analysis',
                'canonical_url' => config('app.url') . '/analytics/index',
                'og_title' => 'Analytics - IntelliX',
                'og_description' => 'Deep dive into your data with advanced analytics tools.',
                'og_image' => '/storage/brand/social-preview.png',
            ],

            // Insights
            'insights-index' => [
                'title' => 'Insights | IntelliX - Business Intelligence Platform',
                'description' => 'AI-powered insights and recommendations based on your data. Get actionable intelligence to improve business outcomes.',
                'keywords' => 'insights, AI insights, recommendations, predictive analytics, machine learning, data intelligence',
                'canonical_url' => config('app.url') . '/insights/index',
                'og_title' => 'Insights - IntelliX',
                'og_description' => 'AI-powered insights and recommendations based on your data.',
                'og_image' => '/storage/brand/social-preview.png',
            ],

            // Library
            'library-index' => [
                'title' => 'Data Library | IntelliX - Business Intelligence Platform',
                'description' => 'Browse and manage your uploaded datasets. Organize, annotate, and access your data from anywhere. Upload CSV, Excel, SQL dumps, and more.',
                'keywords' => 'data library, file management, dataset management, data upload, CSV, Excel, database import',
                'canonical_url' => config('app.url') . '/library/index',
                'og_title' => 'Data Library - IntelliX',
                'og_description' => 'Browse and manage your uploaded datasets.',
                'og_image' => '/storage/brand/social-preview.png',
            ],

            // Upload
            'upload' => [
                'title' => 'Upload Data | IntelliX - Business Intelligence Platform',
                'description' => 'Upload any dataset for analysis - CSV, Excel, TXT, JSON, SQL dumps, and more. Our platform will process your data for intelligent insights.',
                'keywords' => 'upload, data upload, file upload, CSV upload, Excel upload, data import, file processing',
                'canonical_url' => config('app.url') . '/upload',
                'og_title' => 'Upload Data - IntelliX',
                'og_description' => 'Upload datasets for intelligent analysis and insights.',
                'og_image' => '/storage/brand/social-preview.png',
            ],
        ];

        foreach ($seoData as $pageName => $data) {
            SeoMeta::create($data);
        }
    }
}

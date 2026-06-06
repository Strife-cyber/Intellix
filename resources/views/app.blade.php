<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark' => ($appearance ?? 'system') == 'dark'])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        {{-- Inline script to detect system dark mode preference and apply it immediately --}}
        <script>
            (function() {
                const appearance = '{{ $appearance ?? "system" }}';

                if (appearance === 'system') {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

                    if (prefersDark) {
                        document.documentElement.classList.add('dark');
                    }
                }
            })();
        </script>

        {{-- Inline style to set the HTML background color based on our theme in app.css --}}
        <style>
            html {
                background-color: oklch(1 0 0);
            }

            html.dark {
                background-color: oklch(0.145 0 0);
            }
        </style>

        {{-- SEO Meta Tags --}}
        @if (isset($pageTitle) || isset($meta['page_name']))
            <title>{{ $pageTitle ?? data_get($meta, 'title', config('app.name', 'IntelliX') . ' - Transform your data into actionable insights') }}</title>
        @endif

        {{-- Meta Description --}}
        @php
            $description = data_get($meta, 'description',
                config('app.description',
                    'IntelliX - Intelligent Business Intelligence Platform for modern enterprises. Transform your data into actionable insights with cutting-edge analytics and reporting solutions.'
                )
            );
        @endphp
        <meta name="description" content="$description">

        {{-- Meta Keywords --}}
        @php
            $keywords = data_get($meta, 'keywords',
                'business intelligence, analytics, dashboard, reporting, enterprise software, SaaS'
            );
        @endphp
        <meta name="keywords" content="$keywords">

        {{-- Open Graph Tags --}}
        @php
            $ogTitle = data_get($meta, 'og_title', data_get($pageTitle ?? config('app.name', 'IntelliX')));
            $ogDescription = data_get($meta, 'og_description', 'Intelligent Business Intelligence Platform');
        @endphp
        <meta property="og:title" content="$ogTitle">
        <meta property="og:description" content="$ogDescription">
        <meta property="og:type" content="website">

        {{-- Open Graph Image --}}
        @if (data_get($meta, 'og_image'))
            <meta property="og:image" content="{{ data_get($meta, 'og_image') }}">
        @endif

        {{-- Twitter Card Tags --}}
        <meta name="twitter:card" content="summary_large_image">
        @php
            $twitterTitle = data_get($meta, 'twitter_title', data_get($pageTitle ?? config('app.name', 'IntelliX')));
            $twitterDescription = data_get($meta, 'twitter_description', 'Transform your data into actionable insights');
        @endphp
        <meta name="twitter:title" content="$twitterTitle">
        <meta name="twitter:description" content="$twitterDescription">

        {{-- Twitter Image --}}
        @if (data_get($meta, 'twitter_image'))
            <meta name="twitter:image" content="{{ data_get($meta, 'twitter_image') }}">
        @endif

        {{-- Canonical URL for SEO --}}
        @if ($canonicalUrl ?? data_get($meta, 'canonical_url'))
            <link rel="canonical" href="$canonicalUrl ?? data_get($meta, 'canonical_url')">
        @endif

        {{-- Robots Meta Tag --}}
        @php
            $robots = data_get($meta, 'robots', 'index, follow');
        @endphp
        @if ($robots)
            <meta name="robots" content="$robots">
        @endif

        {{-- Favicon Links --}}
        <link rel="icon" href="/favicon.ico" sizes="any">
        <link rel="icon" href="/favicon.svg" type="image/svg+xml">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">

        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet" />

        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>

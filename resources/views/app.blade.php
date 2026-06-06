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
        @php
            // Determine the page title: Inertia sets $pageTitle, else fall back to middleware $meta
            $pageTitle = $pageTitle ?? (isset($meta) ? ($meta['title'] ?? config('app.name')) : config('app.name'));
            $metaDescription = isset($meta) ? ($meta['description'] ?? '') : '';
            $metaKeywords = isset($meta) ? ($meta['keywords'] ?? '') : '';
            $ogTitle = isset($meta) ? ($meta['og_title'] ?? $pageTitle) : $pageTitle;
            $ogDescription = isset($meta) ? ($meta['og_description'] ?? $metaDescription) : $metaDescription;
            $ogImage = isset($meta) ? ($meta['og_image'] ?? '') : '';
            $twitterTitle = isset($meta) ? ($meta['twitter_title'] ?? $pageTitle) : $pageTitle;
            $twitterDescription = isset($meta) ? ($meta['twitter_description'] ?? $metaDescription) : $metaDescription;
            $twitterImage = isset($meta) ? ($meta['twitter_image'] ?? '') : '';
            $canonicalUrl = isset($meta) ? ($meta['canonical_url'] ?? request()->url()) : request()->url();
            $robots = isset($meta) ? ($meta['robots'] ?? 'index, follow') : 'index, follow';
        @endphp

        <title>{{ $pageTitle }}</title>

        @if ($metaDescription)
            <meta name="description" content="{{ $metaDescription }}">
        @endif

        @if ($metaKeywords)
            <meta name="keywords" content="{{ $metaKeywords }}">
        @endif

        {{-- Open Graph Tags --}}
        <meta property="og:title" content="{{ $ogTitle }}">
        @if ($ogDescription)
            <meta property="og:description" content="{{ $ogDescription }}">
        @endif
        <meta property="og:type" content="website">
        <meta property="og:url" content="{{ $canonicalUrl }}">
        @if ($ogImage)
            <meta property="og:image" content="{{ $ogImage }}">
        @endif

        {{-- Twitter Card Tags --}}
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="{{ $twitterTitle }}">
        @if ($twitterDescription)
            <meta name="twitter:description" content="{{ $twitterDescription }}">
        @endif
        @if ($twitterImage)
            <meta name="twitter:image" content="{{ $twitterImage }}">
        @endif

        {{-- Canonical URL for SEO --}}
        <link rel="canonical" href="{{ $canonicalUrl }}">

        {{-- Robots Meta Tag --}}
        <meta name="robots" content="{{ $robots }}">

        {{-- Favicon Links --}}
        <link rel="icon" href="/favicon.ico" sizes="any">
        <link rel="icon" href="/favicon.svg" type="image/svg+xml">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">

        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet" />

        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        @inertiaHead

        {{-- JSON-LD Structured Data for SEO --}}
        <script type="application/ld+json">
<?php echo json_encode([
    '@context' => 'https://schema.org',
    '@type' => 'SoftwareApplication',
    'name' => config('app.name'),
    'description' => ($metaDescription ?: config('app.description', 'AI-powered learning platform for deep work and academic excellence')),
    'applicationCategory' => 'EducationalApplication',
    'operatingSystem' => 'Web',
    'offers' => [
        '@type' => 'Offer',
        'price' => '0',
        'priceCurrency' => 'USD',
    ],
    'author' => [
        '@type' => 'Organization',
        'name' => config('app.name'),
    ],
], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT); ?>
        </script>

        @if (request()->is('/'))
        <script type="application/ld+json">
<?php echo json_encode([
    '@context' => 'https://schema.org',
    '@type' => 'WebSite',
    'name' => config('app.name'),
    'url' => config('app.url'),
    'potentialAction' => [
        '@type' => 'SearchAction',
        'target' => config('app.url') . '/search?q={search_term_string}',
        'query-input' => 'required name=search_term_string',
    ],
], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT); ?>
        </script>
        @endif
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>

<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    's3' => [
        'driver' => 's3',
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
        'bucket' => env('AWS_BUCKET'),
        'url' => env('AWS_URL'),
        'endpoint' => env('AWS_ENDPOINT'),
        'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI'),
    ],

    'github' => [
        'client_id' => env('GITHUB_CLIENT_ID'),
        'client_secret' => env('GITHUB_CLIENT_SECRET'),
        'redirect' => env('GITHUB_REDIRECT_URI'),
    ],

    'qdrant' => [
        'host' => env('QDRANT_HOST'),
        'key' => env('QDRANT_API_KEY'),
        'collection' => env('QDRANT_COLLECTION', 'resources'),
        'chunk_size' => (int) env('QDRANT_CHUNK_SIZE', 2000),
        'chunk_overlap' => (int) env('QDRANT_CHUNK_OVERLAP', 200),
    ],

    'ai' => [
        'endpoint' => env('AI_ENDPOINT', 'http://100.93.40.102:9090'),
    ],

    'gemini' => [
        'api_key' => env('GEMINI_API_KEY'),
    ],

    'openrouter' => [
        'api_key' => env('OPENROUTER_API_KEY'),
    ],

    'broker' => [
        'url' => env('BROKER_URL', 'http://localhost:8080'),
    ],

    'cer' => [
        'base_url' => env('CER_BASE_URL', 'http://localhost:8080'),
        'shared_secret' => env('CER_SHARED_SECRET', ''),
    ],
];

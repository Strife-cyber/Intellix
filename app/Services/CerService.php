<?php

namespace App\Services;

use Exception;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

class CerService
{
    protected string $baseUrl;

    public function __construct()
    {
        $baseUrl = config('services.cer.base_url');

        // When CER_BASE_URL is not set (or the config key is missing), ensure we never assign null.
        // rtrim avoids double slashes when building request URLs.
        $normalized = rtrim($baseUrl ?: 'http://localhost:8080', '/');

        // Some setups may configure base_url as ".../api" already.
        // The CER endpoint is always ".../api/documents/upload", so remove a trailing "/api" to avoid "/api/api/...".
        $baseUrlWithoutApiSuffix = preg_replace('#/api$#', '', $normalized);
        $this->baseUrl = $baseUrlWithoutApiSuffix !== null ? $baseUrlWithoutApiSuffix : $normalized;
    }

    /**
     * @throws ConnectionException
     * @throws Exception
     */
    public function splitProsit(string $filePath, string $originalFileName): array
    {
        $response = Http::attach(
            'file',
            fopen($filePath, 'r'),
            // Use the original filename so the CER service can validate ".docx"/".pdf".
            $originalFileName
        )
            ->post($this->baseUrl.'/api/documents/upload');

        if ($response->failed()) {
            throw new Exception('CER API request failed: '.$response->body());
        }

        $data = $response->json();

        return is_array($data) ? $data : [];
    }
}

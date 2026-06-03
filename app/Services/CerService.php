<?php

namespace App\Services;

use App\Models\User;
use Exception;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;

class CerService
{
    public function __construct(
        private CerMicroserviceSigner $signer,
    ) {}

    protected function baseUrl(): string
    {
        $baseUrl = config('services.cer.base_url');
        $normalized = rtrim($baseUrl ?: 'http://localhost:8080', '/');
        $baseUrlWithoutApiSuffix = preg_replace('#/api$#', '', $normalized);

        return $baseUrlWithoutApiSuffix !== null ? $baseUrlWithoutApiSuffix : $normalized;
    }

    /**
     * @throws ConnectionException
     * @throws Exception
     */
    public function splitProsit(string $filePath, string $originalFileName, ?User $user = null): array
    {
        $user ??= Auth::user();
        if (! $user) {
            throw new Exception('Authentication required for CER extraction.');
        }

        $headers = $this->signer->headers($user, 'POST', 'upload');

        $response = Http::timeout(300)
            ->withHeaders($headers)
            ->attach(
                'file',
                fopen($filePath, 'r'),
                $originalFileName
            )
            ->post($this->baseUrl().'/api/upload');

        if ($response->failed()) {
            throw new Exception('CER API request failed: '.$response->body());
        }

        $data = $response->json();

        return is_array($data) ? $data : [];
    }
}

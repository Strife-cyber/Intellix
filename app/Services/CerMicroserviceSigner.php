<?php

namespace App\Services;

use App\Models\User;

class CerMicroserviceSigner
{
    /**
     * Build signed headers for micro-cer API requests.
     *
     * @return array<string, string>
     */
    public function headers(User $user, string $method, string $apiPath, ?string $body = null): array
    {
        $userKey = (string) $user->id;
        $timestamp = (string) time();
        $method = strtoupper($method);
        $apiPath = ltrim($apiPath, '/');
        $bodyHash = hash('sha256', $body ?? '');

        $payload = implode('|', [$userKey, $timestamp, $method, $apiPath, $bodyHash]);
        $secret = trim((string) config('services.cer.shared_secret', ''));
        $secret = trim($secret, "\"'");
        $signature = hash_hmac('sha256', $payload, $secret);

        return [
            'X-CER-USER-KEY' => $userKey,
            'X-CER-TIMESTAMP' => $timestamp,
            'X-CER-SIGNATURE' => $signature,
        ];
    }
}

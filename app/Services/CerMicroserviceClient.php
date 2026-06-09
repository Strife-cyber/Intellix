<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response as HttpClientResponse;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class CerMicroserviceClient
{
    public function __construct(
        private CerMicroserviceSigner $signer,
        private UserAiProviderResolver $aiResolver,
    ) {}

    public function cerBaseWithoutApiSuffix(): string
    {
        $base = rtrim((string) config('services.cer.base_url'), '/');

        if ($base === '') {
            $base = 'http://localhost:8080';
        }

        return preg_replace('#/api$#', '', $base) ?: $base;
    }

    private function target(string $path): string
    {
        $path = ltrim($path, '/');

        return $this->cerBaseWithoutApiSuffix().'/api/'.$path;
    }

    /**
     * @return array<string, string>
     */
    private function signedHeaders(User $user, string $method, string $apiPath, ?string $body = null): array
    {
        return $this->signer->headers($user, $method, $apiPath, $body);
    }

    private function signedRequest(User $user, string $method, string $apiPath, ?string $body = null): \Illuminate\Http\Client\PendingRequest
    {
        $headers = $this->signedHeaders($user, $method, $apiPath, $body);

        $request = Http::timeout(300)->withHeaders($headers);
        if ($body !== null) {
            $request = $request->withBody($body, 'application/json');
        }

        return $request;
    }

    /**
     * @return array<string, mixed>
     */
    private function decodeJson(HttpClientResponse $response): array
    {
        $data = $response->json();

        return is_array($data) ? $data : [];
    }

    /**
     * @return array<string, mixed>
     */
    private function ensureSuccess(HttpClientResponse $response): array
    {
        if ($response->successful()) {
            return $this->decodeJson($response);
        }

        $body = $response->json();
        $message = is_array($body)
            ? ($body['message'] ?? $body['error'] ?? $response->body())
            : $response->body();

        throw new RuntimeException(
            is_string($message) && $message !== '' ? $message : $response->reason(),
            $response->status(),
        );
    }

    /**
     * @param  callable(): HttpClientResponse  $request
     * @return array<string, mixed>
     */
    private function call(callable $request): array
    {
        try {
            return $this->ensureSuccess($request());
        } catch (ConnectionException) {
            $base = $this->cerBaseWithoutApiSuffix();

            throw new RuntimeException(
                "Cannot connect to {$base}. Start micro-cer (e.g. go run ./cmd/api).",
                503,
            );
        }
    }

    /**
     * @return list<string>
     */
    public function listThemes(User $user): array
    {
        $data = $this->call(fn () => $this->signedRequest($user, 'GET', 'themes')->get($this->target('themes')));

        return $data['themes'] ?? [];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listTemplates(User $user): array
    {
        $data = $this->call(fn () => $this->signedRequest($user, 'GET', 'templates')->get($this->target('templates')));

        return $data['templates'] ?? [];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listProsits(User $user): array
    {
        $data = $this->call(fn () => $this->signedRequest($user, 'GET', 'prosits')->get($this->target('prosits')));

        return $data['prosits'] ?? [];
    }

    /**
     * @return array<string, mixed>
     */
    public function uploadProsit(User $user, UploadedFile $file, ?string $displayName): array
    {
        // Keep the real extension on the multipart filename so micro-cer can detect .docx/.pdf/.odt.
        $originalName = $file->getClientOriginalName();
        $display = is_string($displayName) ? trim($displayName) : '';

        // Multipart body is not hashed (boundary unknown); micro-cer uses empty SHA-256.
        $headers = $this->signedHeaders($user, 'POST', 'prosits', null);

        return $this->call(function () use ($headers, $file, $originalName, $display) {
            $request = Http::timeout(300)
                ->withHeaders($headers)
                ->attach('file', fopen($file->getRealPath(), 'r'), $originalName);

            if ($display !== '') {
                return $request->post($this->target('prosits'), [
                    'filename' => $display,
                ]);
            }

            return $request->post($this->target('prosits'));
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function renameProsit(User $user, string $id, string $filename): array
    {
        $body = json_encode(['filename' => $filename], JSON_THROW_ON_ERROR);

        return $this->call(fn () => $this->signedRequest($user, 'PATCH', "prosits/{$id}", $body)
            ->patch($this->target("prosits/{$id}")));
    }

    /**
     * @return array<string, mixed>
     */
    public function getProsit(User $user, string $id): array
    {
        return $this->call(fn () => $this->signedRequest($user, 'GET', "prosits/{$id}")
            ->get($this->target("prosits/{$id}")));
    }

    public function deleteProsit(User $user, string $id): void
    {
        $this->call(fn () => $this->signedRequest($user, 'DELETE', "prosits/{$id}")
            ->delete($this->target("prosits/{$id}")));
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function startCerJob(User $user, array $payload): array
    {
        $provider = $this->aiResolver->cerProviderPayload($user);
        if ($provider !== null) {
            $payload['provider'] = $provider;
        }

        $body = json_encode($payload, JSON_THROW_ON_ERROR);

        return $this->call(fn () => $this->signedRequest($user, 'POST', 'jobs/cer', $body)
            ->post($this->target('jobs/cer')));
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listCerJobs(User $user): array
    {
        $data = $this->call(fn () => $this->signedRequest($user, 'GET', 'jobs')
            ->get($this->target('jobs')));

        return $data['jobs'] ?? [];
    }

    /**
     * @return array<string, mixed>
     */
    public function getJob(User $user, string $id): array
    {
        return $this->call(fn () => $this->signedRequest($user, 'GET', "jobs/{$id}")
            ->get($this->target("jobs/{$id}")));
    }

    public function downloadJob(User $user, string $id, string $kind): HttpClientResponse
    {
        try {
            return $this->signedRequest($user, 'GET', "jobs/{$id}/{$kind}")
                ->get($this->target("jobs/{$id}/{$kind}"));
        } catch (ConnectionException) {
            $base = $this->cerBaseWithoutApiSuffix();

            throw new RuntimeException(
                "Cannot connect to {$base}. Start micro-cer (e.g. go run ./cmd/api).",
                503,
            );
        }
    }
}

<?php

namespace App\Http\Controllers;

use App\Services\CerMicroserviceClient;
use Illuminate\Http\Client\Response as HttpClientResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use RuntimeException;

class CerMicroserviceProxyController extends Controller
{
    public function __construct(
        private CerMicroserviceClient $client,
    ) {}

    private function user(): \App\Models\User
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        return $user;
    }

    private function jsonResponse(array $data, int $status = 200): \Illuminate\Http\JsonResponse
    {
        return response()->json($data, $status);
    }

    private function fromClient(callable $action): mixed
    {
        try {
            return $this->jsonResponse($action());
        } catch (RuntimeException $e) {
            $status = $e->getCode();
            if ($status < 400 || $status >= 600) {
                $status = 502;
            }

            return $this->jsonResponse([
                'error' => 'CER microservice error',
                'message' => $e->getMessage(),
            ], $status);
        }
    }

    private function forwardDownload(HttpClientResponse $response): \Illuminate\Http\Response
    {
        $headers = [];
        if ($contentType = $response->header('content-type')) {
            $headers['Content-Type'] = $contentType;
        }
        if ($filename = $response->header('content-disposition')) {
            $headers['Content-Disposition'] = $filename;
        }

        return response($response->body(), $response->status(), $headers);
    }

    public function themes(): mixed
    {
        return $this->fromClient(fn () => ['themes' => $this->client->listThemes($this->user())]);
    }

    public function listProsits(): mixed
    {
        return $this->fromClient(fn () => ['prosits' => $this->client->listProsits($this->user())]);
    }

    public function uploadProsit(Request $request): mixed
    {
        $file = $request->file('file');
        if (! $file) {
            return response()->json(['error' => 'Missing file'], 422);
        }

        return $this->fromClient(fn () => $this->client->uploadProsit(
            $this->user(),
            $file,
            $request->input('filename'),
        ));
    }

    public function renameProsit(Request $request, string $id): mixed
    {
        $filename = $request->input('filename');
        if (! is_string($filename) || trim($filename) === '') {
            return response()->json(['error' => 'filename required'], 422);
        }

        return $this->fromClient(fn () => $this->client->renameProsit($this->user(), $id, $filename));
    }

    public function getProsit(string $id): mixed
    {
        return $this->fromClient(fn () => $this->client->getProsit($this->user(), $id));
    }

    public function deleteProsit(string $id): mixed
    {
        return $this->fromClient(function () use ($id) {
            $this->client->deleteProsit($this->user(), $id);

            return [];
        });
    }

    public function startCERJob(Request $request): mixed
    {
        return $this->fromClient(fn () => $this->client->startCerJob(
            $this->user(),
            $request->json()->all(),
        ));
    }

    public function listJobs(): mixed
    {
        return $this->fromClient(fn () => ['jobs' => $this->client->listCerJobs($this->user())]);
    }

    public function getJob(string $id): mixed
    {
        return $this->fromClient(fn () => $this->client->getJob($this->user(), $id));
    }

    public function downloadJob(string $id, string $kind): mixed
    {
        try {
            return $this->forwardDownload(
                $this->client->downloadJob($this->user(), $id, $kind),
            );
        } catch (RuntimeException $e) {
            $status = $e->getCode();
            if ($status < 400 || $status >= 600) {
                $status = 503;
            }

            return response()->json([
                'error' => 'CER microservice unreachable',
                'message' => $e->getMessage(),
            ], $status);
        }
    }
}

<?php

namespace App\Http\Controllers;

use App\Services\CerMicroserviceClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use RuntimeException;

class CerWebController extends Controller
{
    public function __construct(
        private CerMicroserviceClient $client,
    ) {}

    public function generate(Request $request): InertiaResponse
    {
        $user = $request->user();
        $microserviceError = null;
        $prosits = [];
        $themes = ['coffee'];

        try {
            $prosits = $this->client->listProsits($user);
            $themes = $this->client->listThemes($user) ?: $themes;
        } catch (RuntimeException $e) {
            $microserviceError = $e->getMessage();
        }

        return Inertia::render('cers/generate', [
            'prosits' => $prosits,
            'themes' => $themes,
            'microserviceError' => $microserviceError,
            'initialPrositId' => $request->query('prosit'),
        ]);
    }

    public function importProsit(Request $request): RedirectResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'max:51200'],
            'filename' => ['nullable', 'string', 'max:255'],
        ]);

        try {
            $stored = $this->client->uploadProsit(
                $request->user(),
                $request->file('file'),
                $request->input('filename'),
            );

            return redirect()
                ->route('cers.index')
                ->with('cer_flash', [
                    'type' => 'success',
                    'message' => 'Enregistré : '.($stored['filename'] ?? 'fichier'),
                ])
                ->with('cer_selected_prosit_id', $stored['id'] ?? null);
        } catch (RuntimeException $e) {
            return back()->withErrors([
                'prosit' => $e->getMessage(),
            ]);
        }
    }

    public function updateProsit(Request $request, string $id): RedirectResponse
    {
        $request->validate([
            'filename' => ['required', 'string', 'max:255'],
        ]);

        try {
            $this->client->renameProsit(
                $request->user(),
                $id,
                $request->string('filename')->toString(),
            );

            return redirect()
                ->route('cers.index')
                ->with('cer_flash', [
                    'type' => 'success',
                    'message' => 'Fichier renommé.',
                ])
                ->with('cer_selected_prosit_id', $id);
        } catch (RuntimeException $e) {
            return back()->withErrors([
                'prosit' => $e->getMessage(),
            ]);
        }
    }

    public function destroyProsit(Request $request, string $id): RedirectResponse
    {
        try {
            $this->client->deleteProsit($request->user(), $id);

            return redirect()
                ->route('cers.index')
                ->with('cer_flash', [
                    'type' => 'success',
                    'message' => 'Fichier supprimé.',
                ]);
        } catch (RuntimeException $e) {
            return back()->withErrors([
                'prosit' => $e->getMessage(),
            ]);
        }
    }

    public function startGeneration(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'prosit_id' => ['nullable', 'string'],
            'prosit' => ['nullable', 'array'],
            'title' => ['required', 'string', 'max:500'],
            'description' => ['required', 'string'],
            'version' => ['required', 'numeric', 'min:0.1'],
            'theme' => ['required', 'string', 'max:100'],
            'template_id' => ['nullable', 'string', 'max:100'],
            'objectifs' => ['nullable', 'array'],
            'objectifs.*' => ['string'],
            'difficulties' => ['nullable', 'array'],
            'difficulties.*' => ['string'],
            'perspectives' => ['nullable', 'array'],
            'perspectives.*' => ['string'],
        ]);

        $user = $request->user();
        $prositPayload = $validated['prosit'] ?? null;

        if (! empty($validated['prosit_id'])) {
            try {
                $stored = $this->client->getProsit($user, $validated['prosit_id']);
                $prositPayload = $stored['prosit'] ?? null;
            } catch (RuntimeException $e) {
                return back()->withErrors(['prosit' => $e->getMessage()]);
            }
        }

        if (! is_array($prositPayload) || $prositPayload === []) {
            return back()->withErrors([
                'prosit' => 'Sélectionnez un PROSIT ou importez-en un dans la bibliothèque.',
            ]);
        }

        try {
            $job = $this->client->startCerJob($user, [
                'prosit' => $prositPayload,
                'title' => $validated['title'],
                'description' => $validated['description'],
                'version' => (float) $validated['version'],
                'theme' => $validated['theme'],
                'template_id' => $validated['template_id'] ?? 'default',
                'objectifs' => $validated['objectifs'] ?? [],
                'difficulties' => $validated['difficulties'] ?? [],
                'perspectives' => $validated['perspectives'] ?? [],
            ]);

            $jobId = $job['id'] ?? null;
            if (! is_string($jobId) || $jobId === '') {
                return back()->withErrors([
                    'cer' => 'Le microservice n’a pas renvoyé d’identifiant de job.',
                ]);
            }

            return redirect()->to(route('cers.jobs').'?jobId='.urlencode($jobId));
        } catch (RuntimeException $e) {
            return back()->withErrors([
                'cer' => $e->getMessage(),
            ]);
        }
    }

    public function jobStatus(Request $request, string $id): JsonResponse
    {
        try {
            return response()->json(
                $this->client->getJob($request->user(), $id),
            );
        } catch (RuntimeException $e) {
            return response()->json([
                'error' => $e->getMessage(),
            ], $e->getCode() >= 400 && $e->getCode() < 600 ? $e->getCode() : 502);
        }
    }

    public function jobDownload(Request $request, string $id, string $kind): Response
    {
        try {
            $response = $this->client->downloadJob($request->user(), $id, $kind);
        } catch (RuntimeException $e) {
            abort($e->getCode() >= 400 && $e->getCode() < 600 ? $e->getCode() : 503, $e->getMessage());
        }

        $headers = [];
        if ($contentType = $response->header('content-type')) {
            $headers['Content-Type'] = $contentType;
        }
        if ($disposition = $response->header('content-disposition')) {
            $headers['Content-Disposition'] = $disposition;
        }

        return response($response->body(), $response->status(), $headers);
    }
}

<?php

namespace App\Http\Controllers;

use App\Enums\PrositSource;
use App\Enums\ResourceStatus;
use App\Models\Prosit;
use App\Models\Resource;
use App\Services\CerMicroserviceClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
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

            $microserviceId = $stored['id'] ?? null;
            $microserviceProsit = $stored['prosit'] ?? [];

            // Auto-create a local Prosit record from the microservice data
            if (is_string($microserviceId) && is_array($microserviceProsit)) {
                $existing = Prosit::where('cer_microservice_id', $microserviceId)->first();

                if (! $existing) {
                    Prosit::create([
                        'chapter_id' => null,
                        'source' => PrositSource::UPLOADED->value,
                        'cer_microservice_id' => $microserviceId,
                        'mots_cles' => isset($microserviceProsit['keywords'])
                            ? implode(', ', (array) $microserviceProsit['keywords'])
                            : null,
                        'contexte' => $microserviceProsit['context'] ?? null,
                        'besoin' => isset($microserviceProsit['needs'])
                            ? implode("\n", (array) $microserviceProsit['needs'])
                            : null,
                        'problematique' => isset($microserviceProsit['problems'])
                            ? implode("\n", (array) $microserviceProsit['problems'])
                            : ($microserviceProsit['context'] ?? 'Prosit importé — ajoutez une problématique'),
                        'generalisation' => $microserviceProsit['generalisation'] ?? $stored['filename'] ?? null,
                        'piste_de_solution' => isset($microserviceProsit['pistes'])
                            ? implode("\n", (array) $microserviceProsit['pistes'])
                            : null,
                        'plan_d_action' => isset($microserviceProsit['plan'])
                            ? implode("\n", (array) $microserviceProsit['plan'])
                            : null,
                        'texte' => $stored['filename'] ?? null,
                    ]);
                }
            }

            return redirect()
                ->route('cers.index')
                ->with('cer_flash', [
                    'type' => 'success',
                    'message' => 'Enregistré : '.($stored['filename'] ?? 'fichier'),
                ])
                ->with('cer_selected_prosit_id', $microserviceId);
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
                    'cer' => 'Le microservice n\'a pas renvoyé d\'identifiant de job.',
                ]);
            }

            // If a local Prosit is linked, store the CER job ID so we can
            // later attach the generated PDF as a Resource.
            $localPrositId = null;
            if (! empty($validated['prosit_id'])) {
                $localProsit = Prosit::where('cer_microservice_id', $validated['prosit_id'])->first();
                if ($localProsit) {
                    $localProsit->update([
                        'source' => PrositSource::GENERATED->value,
                        'texte' => $validated['title'],
                    ]);
                    $localPrositId = $localProsit->id;
                }
            }

            $params = '?jobId='.urlencode($jobId);
            if ($localPrositId) {
                $params .= '&prositId='.urlencode($localPrositId);
            }

            return redirect()->to(route('cers.jobs').$params);
        } catch (RuntimeException $e) {
            return back()->withErrors([
                'cer' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Save a completed CER job's PDF as a Resource linked to the prosit.
     * Called from the frontend when a CER job completes.
     */
    public function saveGeneratedResource(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'prosit_id' => ['required', 'string', 'exists:prosits,id'],
        ]);

        $user = $request->user();
        $prositId = $request->input('prosit_id');

        try {
            // Check if we already saved a resource for this job
            $existing = Resource::where('prosit_id', $prositId)
                ->where('type', 'cer')
                ->where('metadata->cer_job_id', $id)
                ->first();

            if ($existing) {
                return response()->json([
                    'message' => 'Resource already saved.',
                    'resource' => $existing,
                ]);
            }

            // Download the PDF from the microservice
            $pdfResponse = $this->client->downloadJob($user, $id, 'pdf');

            if ($pdfResponse->status() !== 200) {
                return response()->json([
                    'error' => 'PDF not ready yet or download failed.',
                ], 502);
            }

            $pdfBody = $pdfResponse->body();
            $contentType = $pdfResponse->header('content-type') ?: 'application/pdf';

            // Generate a clean filename
            $prosit = Prosit::findOrFail($prositId);
            $safeTitle = Str::slug($prosit->generalisation ?: $prosit->texte ?: 'cer');
            $fileName = $safeTitle ? "CER_{$safeTitle}.pdf" : "CER_{$id}.pdf";

            // Store in S3
            $s3Path = 'resources/'.Str::uuid().'.pdf';
            Storage::disk('s3')->put($s3Path, $pdfBody);

            // Create the Resource
            $resource = Resource::create([
                'user_id' => $user->id,
                'prosit_id' => $prositId,
                'original_name' => $fileName,
                'mime_type' => $contentType,
                's3_key' => $s3Path,
                'size_bytes' => strlen($pdfBody),
                'status' => ResourceStatus::READY,
                'type' => 'cer',
                'metadata' => [
                    'cer_job_id' => $id,
                    'generated_at' => now()->toIso8601String(),
                ],
            ]);

            // Grant OWNER access to the user who generated it
            $resource->grantAccess($user, 'owner');

            return response()->json([
                'message' => 'CER PDF saved as resource.',
                'resource' => $resource,
            ]);
        } catch (RuntimeException $e) {
            Log::error('Failed to save CER resource', [
                'job_id' => $id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => $e->getMessage(),
            ], 502);
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

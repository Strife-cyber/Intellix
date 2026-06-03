<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCahierRequest;
use App\Http\Requests\UpdateCahierRequest;
use App\Models\Cahier;
use App\Services\CerMicroserviceClient;
use App\Services\CerService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use RuntimeException;
use Throwable;

class CahierController extends Controller
{
    public function __construct(
        private CerMicroserviceClient $cerClient,
    ) {}

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $prosits = [];
        $microserviceError = null;

        try {
            $prosits = $this->cerClient->listProsits($request->user());
        } catch (RuntimeException $e) {
            $microserviceError = $e->getMessage();
        }

        return Inertia::render('cers/index', [
            'prosits' => $prosits,
            'microserviceError' => $microserviceError,
            'selectedPrositId' => session('cer_selected_prosit_id'),
            'cerFlash' => session('cer_flash'),
        ]);
    }

    public function all(Request $request)
    {
        $generatedCers = [];
        $microserviceError = null;

        try {
            $generatedCers = $this->cerClient->listCerJobs($request->user());
        } catch (RuntimeException $e) {
            $microserviceError = $e->getMessage();
        }

        return Inertia::render('cers/all', [
            'generatedCers' => $generatedCers,
            'microserviceError' => $microserviceError,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreCahierRequest $request): RedirectResponse
    {
        $sections = $request->input('sections', []);

        $cahier = Cahier::create([
            'version' => (float) $request->input('version'),
            'title' => $request->string('title'),
            'description' => $request->input('description'),
            // Store all extracted sections payload as JSON string in `prosit`.
            'prosit' => json_encode($sections, JSON_UNESCAPED_UNICODE),
            // Ensure JSON fields are always present to satisfy NOT NULL constraints.
            // We don't have those payloads at the CER step yet, so default to empty arrays.
            'pdfs' => [],
            'zips' => [],
            'objectifs' => [],
            'difficultes' => [],
            'perspectives' => [],
        ]);

        return redirect()->route('cers.show', $cahier);
    }

    /**
     * Display the specified resource.
     */
    public function show(Cahier $cer)
    {
        return Inertia::render('cers/show', [
            'cahier' => $cer,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Cahier $cahier)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateCahierRequest $request, Cahier $cahier)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Cahier $cahier)
    {
        //
    }

    public function upload(Request $request, CerService $cerService)
    {
        $request->validate([
            'file' => 'required|file|max:20480',
        ]);

        // Do not persist to local storage; forward the temp uploaded file to the CER service.
        /** @var UploadedFile $uploadedFile */
        $uploadedFile = $request->file('file');
        $fullPath = $uploadedFile->getRealPath();

        if ($fullPath === false) {
            return Inertia::render('cers/index', [
                'sections' => [],
            ]);
        }

        try {
            $originalFileName = $uploadedFile->getClientOriginalName();
            $result = $cerService->splitProsit($fullPath, $originalFileName);
        } catch (Throwable $e) {
            Log::error('CER extraction failed', [
                'error' => $e->getMessage(),
                'file_name' => $uploadedFile->getClientOriginalName(),
            ]);

            return Inertia::render('cers/index', [
                'sections' => [],
            ]);
        }

        $sections = [];

        // micro-cer returns a `core.Prosit` object:
        // { keywords: string[], context: string, needs: string[], constraints: string[], problems: string[], generalisation: string, pistes: string[], plan: string[] }
        if (is_array($result) && isset($result['keywords'])) {
            $sections = [
                [
                    'title' => 'Keywords',
                    'content' => implode('; ', $result['keywords'] ?? []),
                ],
                [
                    'title' => 'Context',
                    'content' => (string) ($result['context'] ?? ''),
                ],
                [
                    'title' => 'Needs',
                    'content' => implode(";\n", $result['needs'] ?? []),
                ],
                [
                    'title' => 'Constraints',
                    'content' => implode(";\n", $result['constraints'] ?? []),
                ],
                [
                    'title' => 'Problems',
                    'content' => implode(";\n", $result['problems'] ?? []),
                ],
                [
                    'title' => 'Generalisation',
                    'content' => (string) ($result['generalisation'] ?? ''),
                ],
                [
                    'title' => 'Pistes',
                    'content' => implode(";\n", $result['pistes'] ?? []),
                ],
                [
                    'title' => 'Plan',
                    'content' => implode("\n", $result['plan'] ?? []),
                ],
            ];
        } elseif (is_array($result) && isset($result['sections']) && is_array($result['sections'])) {
            // Backwards compatibility: some older responses may already be in `sections` format.
            $sections = array_map(function (array $section): array {
                return [
                    'title' => $section['title'] ?? '',
                    'content' => $section['content'] ?? '',
                ];
            }, $result['sections'] ?? []);
        }

        return Inertia::render('cers/index', [
            'sections' => $sections,
        ]);
    }
}

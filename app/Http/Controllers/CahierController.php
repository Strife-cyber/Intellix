<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCahierRequest;
use App\Http\Requests\UpdateCahierRequest;
use App\Models\Cahier;
use App\Services\CerService;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Inertia\Inertia;
use Throwable;

class CahierController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return Inertia::render('cers/index', [
            'sections' => [],
        ]);
    }

    public function all()
    {
        $cahiers = Cahier::all();

        return Inertia::render('cers/all', [
            'cahiers' => $cahiers,
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
    public function store(StoreCahierRequest $request)
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

        return Inertia::render('cers/index', [
            'sections' => $sections,
            'saved' => true,
            'cahierId' => $cahier->id,
        ]);
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
            dd($e->getMessage());
            return Inertia::render('cers/index', [
                'sections' => [],
            ]);
        }

        dd($result);

        $sections = array_map(function (array $section): array {
            return [
                'title' => $section['title'] ?? '',
                'content' => $section['content'] ?? '',
            ];
        }, $result['sections'] ?? []);

        return Inertia::render('cers/index', [
            'sections' => $sections,
        ]);
    }
}

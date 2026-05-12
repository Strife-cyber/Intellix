<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCahierRequest;
use App\Http\Requests\UpdateCahierRequest;
use App\Models\Cahier;
use App\Services\CerService;
use Illuminate\Http\Request;
use Inertia\Inertia;

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
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(Cahier $cahier)
    {
        //
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
        /** @var \Illuminate\Http\UploadedFile $uploadedFile */
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
        } catch (\Throwable $e) {
            return Inertia::render('cers/index', [
                'sections' => [],
            ]);
        }

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

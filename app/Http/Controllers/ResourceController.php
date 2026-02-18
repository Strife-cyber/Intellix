<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreResourceRequest;
use App\Http\Requests\UpdateResourceRequest;
use App\Models\Resource;
use App\Services\ResourceUploadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ResourceController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
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
    public function store(StoreResourceRequest $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(Resource $resource)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Resource $resource)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateResourceRequest $request, Resource $resource)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Resource $resource)
    {
        //
    }

    public function upload(Request $request, ResourceUploadService $service): JsonResponse
    {
        $request->validate([
            'files' => ['required', 'array'],
            'files.*' => ['file', 'max:102400'], // 100MB per file
        ]);

        $results = [];

        foreach ($request->file('files') as $file) {
            $resource = $service->upload($file);
            $results[] = [
                'resource_id' => $resource->id,
                'file_name' => $resource->original_name,
                'status_url' => "/v1/resources/{$resource->id}/status",
            ];
        }

        return response()->json($results, 202);
    }

    public function status(Resource $resource)
    {
        return response()->json([
            'id' => $resource->id,
            'status' => $resource->status,
        ]);
    }
}

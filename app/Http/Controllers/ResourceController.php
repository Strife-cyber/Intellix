<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreResourceRequest;
use App\Http\Requests\UpdateResourceRequest;
use App\Models\Resource;
use App\Models\User;
use App\Services\ResourceUploadService;
use Illuminate\Http\Client\Request;

class ResourceController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $auth_user = auth()->user();
        $user = User::where('id', $auth_user->id)->first();
        $resources = $user->resources;
        dd($resources);
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

    public function upload(Request $request, ResourceUploadService $service)
    {
        $request->validate([
            'file' => ['required', 'file', 'max:102400'],
        ]);

        $resource = $service->upload($request->file('file'));

        return response()->json([
            'resource_id' => $resource->id,
            'status_url' => route('resources.status', $resource),
        ], 202);
    }

    public function status(Resource $resource)
    {
        return response()->json([
            'id' => $resource->id,
            'status' => $resource->status,
        ]);
    }
}

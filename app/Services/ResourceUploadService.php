<?php

namespace App\Services;

use App\Enums\ResourceStatus;
use App\Jobs\ProcessResourceJob;
use App\Models\Resource;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ResourceUploadService
{
    /**
     * Upload a file and create a resource.
     * This method is designed to be FAST - it stores locally and returns immediately.
     * The actual S3 upload and vectorization happen async via a queued job.
     */
    public function upload(UploadedFile $file): Resource
    {
        $user = Auth::user();
        $originalName = $file->getClientOriginalName();
        $extension = $file->getClientOriginalExtension();
        $mimeType = $file->getMimeType();
        $size = $file->getSize();

        // Generate a unique path
        $uuid = Str::uuid();
        $path = 'resources/' . $uuid . '.' . $extension;

        // Store locally first (fast, always works)
        $localPath = $file->storeAs('resources', $uuid . '.' . $extension, 'local');

        // Create the resource record in the database
        /** @var resource $resource */
        $resource = Resource::create([
            'user_id' => $user->id,
            'original_name' => $originalName,
            's3_key' => $path,
            'mime_type' => $mimeType,
            'size_bytes' => $size,
            'status' => ResourceStatus::PENDING,
            'metadata' => [
                'extension' => $extension,
                'local_path' => $localPath,
            ],
        ]);

        // Dispatch S3 upload + vectorization as a queued job
        // Using afterResponse so it doesn't block the HTTP response
        ProcessResourceJob::dispatch($resource->id)->afterResponse();

        return $resource;
    }
}

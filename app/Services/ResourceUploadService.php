<?php

namespace App\Services;

use App\Models\Resource;
use App\Enums\ResourceStatus;
use App\Jobs\ProcessResourceJob;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ResourceUploadService
{
    /**
     * Upload a file and create a resource.
     *
     * @param UploadedFile $file
     * @return Resource
     */
    public function upload(UploadedFile $file): Resource
    {
        $user = Auth::user();
        $originalName = $file->getClientOriginalName();
        $extension = $file->getClientOriginalExtension();
        $mimeType = $file->getMimeType();
        $size = $file->getSize();

        // Generate a unique path in S3
        $path = 'resources/' . Str::uuid() . '.' . $extension;

        // Store the file in S3
        Storage::disk('s3')->put($path, file_get_contents($file));

        // Create the resource record in the database
        /** @var Resource $resource */
        $resource = Resource::create([
            'user_id' => $user->id,
            'original_name' => $originalName,
            's3_key' => $path,
            'mime_type' => $mimeType,
            'size' => $size,
            'status' => ResourceStatus::PENDING,
            'metadata' => [
                'extension' => $extension,
            ],
        ]);

        // Dispatch the processing job
        ProcessResourceJob::dispatch($resource->id);

        return $resource;
    }
}

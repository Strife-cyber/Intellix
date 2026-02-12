<?php

namespace App\Services;

use App\Enums\ResourceStatus;
use App\Jobs\ProcessResourceJob;
use App\Models\Resource;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ResourceUploadService
{
    public function upload(UploadedFile $file): Resource
    {
        $resourceId = (string) Str::uuid();

        $s3Key = "resources/$resourceId/".$file->getClientOriginalName();

        // STREAM upload (no file_get_contents!)
        Storage::disk('s3')->putFileAs(
            dirname($s3Key),
            $file,
            basename($s3Key)
        );

        $resource = Resource::create([
            'id' => $resourceId,
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType(),
            'size_bytes' => $file->getSize(),
            's3_key' => $s3Key,
            'status' => ResourceStatus::PROCESSING->value,
        ]);

        ProcessResourceJob::dispatch($resource);

        return $resource;
    }
}

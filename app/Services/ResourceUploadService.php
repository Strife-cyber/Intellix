<?php

namespace App\Services;

use App\Enums\AccessRole;
use App\Enums\ResourceStatus;
use App\Jobs\ProcessResourceJob;
use App\Models\Resource;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
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

        $userId = Auth::id();

        $resource = Resource::create([
            'id'            => $resourceId,
            'user_id'       => $userId,
            'original_name' => $file->getClientOriginalName(),
            'mime_type'     => $file->getMimeType(),
            'size_bytes'    => $file->getSize(),
            's3_key'        => $s3Key,
            'status'        => ResourceStatus::PROCESSING->value,
        ]);

        // Grant the uploader OWNER access in the access table
        if ($userId) {
            $resource->grantAccess(Auth::user(), AccessRole::OWNER->value);
        }

        ProcessResourceJob::dispatch($resource->id);

        return $resource;
    }

    public function delete(Resource $resource): void
    {
        // Delete from S3
        if ($resource->s3_key) {
            Storage::disk('s3')->delete($resource->s3_key);
            // Try to delete the directory if it's empty (optional, but good for cleanup)
            // dirname('resources/UUID/filename') -> 'resources/UUID'
            $dir = dirname($resource->s3_key);
            if ($dir !== '.' && $dir !== '/') {
                $files = Storage::disk('s3')->files($dir);
                if (empty($files)) {
                    Storage::disk('s3')->deleteDirectory($dir);
                }
            }
        }

        // Delete from DB
        $resource->delete();
    }
}

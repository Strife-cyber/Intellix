<?php

namespace App\Services;

use App\Enums\ResourceStatus;
use App\Jobs\ProcessResourceJob;
use App\Models\Resource;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ResourceUploadService
{
    /**
     * Upload a file and create a resource.
     */
    public function upload(UploadedFile $file): Resource
    {
        $user = Auth::user();
        $originalName = $file->getClientOriginalName();
        $extension = $file->getClientOriginalExtension();
        $mimeType = $file->getMimeType();
        $size = $file->getSize();

        // Generate a unique path in S3
        $path = 'resources/'.Str::uuid().'.'.$extension;

        // Store the file in S3
        Storage::disk('s3')->put($path, file_get_contents($file));

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
            ],
        ]);

        // Submit task to Go broker instead of Laravel queue
        $this->submitToBroker($resource);

        return $resource;
    }

    /**
     * Submit resource processing task to Go broker.
     */
    protected function submitToBroker(Resource $resource): void
    {
        $brokerUrl = config('services.broker.url', 'http://localhost:8080');
        $fileUrl = Storage::disk('s3')->url($resource->s3_key);
        $serviceId = config('app.name', 'intellix');

        try {
            $response = Http::timeout(5)
                ->connectTimeout(3)
                ->post($brokerUrl.'/api/tasks', [
                    'service_id' => $serviceId,
                    'file_url' => $fileUrl,
                    'task_type' => 'vectorize',
                ]);

            if ($response->successful()) {
                $data = $response->json();
                Log::info("Resource {$resource->id} submitted to broker", [
                    'task_id' => $data['task_id'] ?? null,
                ]);

                // Store broker task ID in resource metadata
                $resource->update([
                    'metadata' => array_merge($resource->metadata ?? [], [
                        'broker_task_id' => $data['task_id'] ?? null,
                        'broker_submitted_at' => now()->toDateTimeString(),
                    ]),
                ]);

                return;
            }

            Log::error("Failed to submit resource {$resource->id} to broker", [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
        } catch (\Throwable $e) {
            Log::error("Exception submitting resource {$resource->id} to broker: ".$e->getMessage());
        }

        $this->queueProcessing($resource);
    }

    /**
     * Queue post-upload processing after the HTTP response (never block upload with ingest/embed).
     */
    protected function queueProcessing(Resource $resource): void
    {
        $resourceId = $resource->id;

        try {
            ProcessResourceJob::dispatch($resourceId)->afterResponse();

            return;
        } catch (\Throwable $e) {
            Log::warning("Queue dispatch failed for resource {$resourceId}: {$e->getMessage()}");
        }

        try {
            dispatch(function () use ($resourceId): void {
                ProcessResourceJob::dispatchSync($resourceId);
            })->afterResponse();
        } catch (\Throwable $e) {
            Log::error("Could not schedule processing for resource {$resourceId}: {$e->getMessage()}");
            $resource->update([
                'metadata' => array_merge($resource->metadata ?? [], [
                    'processing_error' => 'Could not queue indexing. Start a queue worker or fix QUEUE_CONNECTION.',
                ]),
            ]);
        }
    }
}

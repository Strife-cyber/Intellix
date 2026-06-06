<?php

namespace App\Jobs;

use App\Enums\ResourceStatus;
use App\Models\Resource;
use App\Services\ResourceIngestionService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

class ProcessResourceJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     *
     * @var int
     */
    public $tries = 3;

    /**
     * The number of seconds the job can run before timing out.
     *
     * @var int
     */
    public $timeout = 600;

    /**
     * The number of seconds to wait between retries.
     *
     * @var int
     */
    public $backoff = 30;

    /**
     * Create a new job instance.
     */
    public function __construct(
        protected string $resourceId,
        protected array $options = []
    ) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $resource = Resource::findOrFail($this->resourceId);

        Log::info("Processing resource {$resource->id} (attempt {$this->attempts()})");

        // Update status to PROCESSING
        $resource->update(['status' => ResourceStatus::PROCESSING]);

        try {
            // Step 1: Upload local file to S3 if not already there
            $this->uploadToS3($resource);

            // Step 2: Ingest the resource (extract text, vectorize, store in Qdrant)
            $chunkCount = app(ResourceIngestionService::class)->ingest($resource, $resource->owner);

            $resource->update([
                'status' => ResourceStatus::READY,
                'metadata' => array_merge($resource->metadata ?? [], [
                    'processed_at' => now()->toDateTimeString(),
                    'indexed_chunks' => $chunkCount,
                ]),
            ]);

            Log::info("Resource {$resource->id} processed successfully ({$chunkCount} chunks)");

        } catch (Throwable $e) {
            Log::warning("Failed to process resource {$resource->id} (attempt {$this->attempts()}/{$this->tries}): " . $e->getMessage());

            if ($this->attempts() >= $this->tries) {
                $resource->update(['status' => ResourceStatus::FAILED]);
            }

            throw $e;
        }
    }

    /**
     * Upload the locally stored file to S3 for persistence.
     */
    protected function uploadToS3(Resource $resource): void
    {
        $localPath = $resource->metadata['local_path'] ?? null;

        if (!$localPath) {
            Log::info("Resource {$resource->id} has no local path, skipping S3 upload");
            return;
        }

        // Check if file exists locally
        if (!Storage::disk('local')->exists($localPath)) {
            Log::warning("Local file not found for resource {$resource->id}: {$localPath}");
            return;
        }

        // Read the file from local storage and upload to S3
        $fileContent = Storage::disk('local')->get($localPath);
        Storage::disk('s3')->put($resource->s3_key, $fileContent);

        Log::info("Resource {$resource->id} uploaded to S3: {$resource->s3_key}");

        // Update metadata to mark S3 upload as complete
        $resource->update([
            'metadata' => array_merge($resource->metadata ?? [], [
                's3_uploaded_at' => now()->toDateTimeString(),
            ]),
        ]);

        // Optionally delete local file after successful S3 upload
        Storage::disk('local')->delete($localPath);
    }

    /**
     * Handle a permanent failure.
     */
    public function failed(?Throwable $e): void
    {
        Log::error("Resource {$this->resourceId} permanently failed after {$this->tries} attempts: " . ($e?->getMessage() ?? 'Unknown error'));

        $resource = Resource::find($this->resourceId);
        if ($resource) {
            $resource->update([
                'status' => ResourceStatus::FAILED,
                'metadata' => array_merge($resource->metadata ?? [], [
                    'failed_at' => now()->toDateTimeString(),
                    'last_error' => $e?->getMessage() ?? 'Unknown error',
                ]),
            ]);
        }
    }
}

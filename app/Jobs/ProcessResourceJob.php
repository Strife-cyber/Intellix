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

        // Update status to PROCESSING
        $resource->update(['status' => ResourceStatus::PROCESSING]);

        try {
            $chunkCount = app(ResourceIngestionService::class)->ingest($resource, $resource->owner);

            $resource->update([
                'status' => ResourceStatus::READY,
                'metadata' => array_merge($resource->metadata ?? [], [
                    'processed_at' => now()->toDateTimeString(),
                    'indexed_chunks' => $chunkCount,
                ]),
            ]);

        } catch (Throwable $e) {
            Log::error("Failed to process resource {$resource->id}: ".$e->getMessage());
            $resource->update(['status' => ResourceStatus::FAILED]);
            throw $e;
        }
    }
}

<?php

namespace App\Jobs;

use App\Enums\ResourceStatus;
use App\Models\Resource;
use App\Services\Rust\RustService;
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
     * Create a new job instance.
     */
    public function __construct(
        protected string $resourceId,
        protected array $options = []
    ) {
    }

    /**
     * Execute the job.
     */
    public function handle(RustService $rustService): void
    {
        $resource = Resource::findOrFail($this->resourceId);

        // Update status to PROCESSING
        $resource->update(['status' => ResourceStatus::PROCESSING]);

        try {
            // Generate signed URL
            $url = Storage::disk('s3')->temporaryUrl($resource->s3_key, now()->addHour());

            // Trigger Rust Ingestion
            $result = $rustService->ingest($url, $resource->id, $this->options, [
                'resource_id' => $resource->id,
            ]);

            if ($result['success']) {
                $stdout = json_decode($result['stdout'], true);

                if (isset($stdout['success']) && $stdout['success']) {
                    $resource->update([
                        'status' => ResourceStatus::READY,
                        'metadata' => array_merge($resource->metadata ?? [], [
                            'total_chunks' => $stdout['total_chunks'] ?? 0,
                            'total_points_upserted' => $stdout['total_points_upserted'] ?? 0,
                            'processed_at' => now()->toDateTimeString(),
                        ]),
                    ]);

                    Log::info("Resource {$resource->id} processed successfully.", $stdout);
                } else {
                    $error = $stdout['error'] ?? 'Rust ingestion returned success=false without a specific error.';
                    throw new \Exception($error);
                }
            } else {
                // Build a detailed error message that includes stderr so the failure is debuggable
                $stderr = trim($result['stderr'] ?? '');
                $error  = $result['error'] ?? 'Rust process exited with a non-zero code.';

                // Try to parse the JSON error log from stderr
                $stderrLines = array_filter(array_map('trim', explode("\n", $stderr)));
                $stderrDetail = '';
                foreach ($stderrLines as $line) {
                    $decoded = json_decode($line, true);
                    if (is_array($decoded) && isset($decoded['message'])) {
                        $stderrDetail = $decoded['message'];
                        break;
                    }
                }

                $fullError = $stderrDetail ?: ($stderr ?: $error);

                Log::error("Resource {$resource->id} – Rust process failed", [
                    'exit_code' => $result['exit_code'] ?? null,
                    'stderr'    => $stderr,
                    'stdout'    => $result['stdout'] ?? '',
                    'error'     => $error,
                ]);

                throw new \Exception("Rust ingest failed (exit {$result['exit_code']}): {$fullError}");
            }
        } catch (Throwable $e) {
            Log::error("Failed to process resource {$resource->id}: " . $e->getMessage());

            $resource->update(['status' => ResourceStatus::FAILED]);

            throw $e;
        }
    }
}

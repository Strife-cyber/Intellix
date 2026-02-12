<?php

namespace App\Jobs;

use App\Models\Resource;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use App\Services\Rust\RustService;
use App\Services\VectorService;
use App\Enums\ResourceStatus;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Queue\SerializesModels;

class ProcessResourceJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Create a new job instance.
     */
    public function __construct(public Resource $resource)
    {
        //
    }

    /**
     * Execute the job.
     */
    public function handle(RustService $rustService, VectorService $vectorService): void
    {
        try {
            $this->resource->update(['status' => ResourceStatus::PROCESSING]);

            // 1. Extract text using Rust binary
            // We need a local file path. If it's on S3, we might need to download it first
            // or if the Rust binary supports S3 (unlikely for now), use that.
            // For now, let's assume we download it to a temp file.
            
            $extension = pathinfo($this->resource->original_name, PATHINFO_EXTENSION);
            if (empty($extension)) {
                $extension = 'tmp';
            }

            // Create a temp file with the correct extension
            $tempBase = tempnam(sys_get_temp_dir(), 'res');
            $tempPath = $tempBase . '.' . $extension;
            rename($tempBase, $tempPath);

            try {
                file_put_contents($tempPath, Storage::disk('s3')->get($this->resource->s3_key));

                $result = $rustService->extract($tempPath);
            } finally {
                if (file_exists($tempPath)) {
                    unlink($tempPath);
                }
                // Cleanup base if rename failed or something weird happened (though rename moves it)
                if (file_exists($tempBase)) {
                    unlink($tempBase);
                }
            }

            if (!$result['success']) {
                throw new \Exception("Rust extraction failed: " . ($result['stderr'] ?? 'Unknown error'));
            }

            $textContent = $result['stdout'];

            // 2. Process and Store Vectors
            $vectorService->processAndStore($this->resource, $textContent);

            $this->resource->update([
                'status' => ResourceStatus::READY,
            ]);
        } catch (\Throwable $e) {
            $this->resource->update([
                'status' => ResourceStatus::FAILED,
            ]);
            Log::error("Processing resource failed: {$this->resource->id}", ['error' => $e->getMessage()]);
            // Rethrow to fail the job (optional, depending on retry policy)
            throw $e; 
        }
    }
}

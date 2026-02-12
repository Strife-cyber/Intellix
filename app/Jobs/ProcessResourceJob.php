<?php

namespace App\Jobs;

use App\Models\Resource;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
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
    public function handle(): void
    {
        try {
            // Later: call Rust processor / OCR / parser
            // For milestone → simulate success

            $this->resource->update([
                'status' => 'ready',
            ]);
        } catch (\Throwable $e) {
            $this->resource->update([
                'status' => 'failed',
            ]);
            throw $e;
        }
    }
}

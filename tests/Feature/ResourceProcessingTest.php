<?php

namespace Tests\Feature;

use App\Enums\ResourceStatus;
use App\Jobs\ProcessResourceJob;
use App\Models\Resource;
use App\Models\ResourceChunk;
use App\Services\ResourceUploadService;
use App\Services\Rust\RustService;
use App\Services\VectorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Mockery;
use Tests\TestCase;

class ResourceProcessingTest extends TestCase
{
    use RefreshDatabase;

    public function test_resource_processing_and_deletion_flow()
    {
        $this->withoutExceptionHandling();
        Storage::fake('s3');
        
        config()->set('services.qdrant.host', 'https://mock-qdrant');
        config()->set('services.qdrant.key', 'mock-key');
        
        \Illuminate\Support\Facades\Http::fake([
            '*/collections/resources' => \Illuminate\Support\Facades\Http::response(['status' => 'ok'], 200),
            '*/collections/resources/points?wait=true' => \Illuminate\Support\Facades\Http::response(['status' => 'ok'], 200),
        ]);

        // 1. Mock RustService (Bind to container BEFORE upload, so the dispatched job uses it)
        $mockRust = Mockery::mock(RustService::class);
        $mockRust->shouldReceive('extract')
            ->once()
            ->andReturn([
                'success' => true,
                'stdout' => 'This is the extracted text content from the PDF.',
                'stderr' => '',
                'exit_code' => 0,
            ]);
        $this->instance(RustService::class, $mockRust);

        // 2. Upload (Triggers Job via Sync queue)
        $file = UploadedFile::fake()->create('document.pdf', 100);
        $service = new ResourceUploadService();
        $resource = $service->upload($file);

        // 3. Assert Processing Results (Job should have run synchronously)
        // Refresh resource to see updated status
        $resource->refresh();
        
        $this->assertEquals(ResourceStatus::READY->value, $resource->status->value);

        $this->assertDatabaseHas('resource_chunks', [
            'resource_id' => $resource->id,
            'content' => 'This is the extracted text content from the PDF.',
        ]);
        
        // Check if file is on S3 (fake)
        Storage::disk('s3')->assertExists($resource->s3_key);

        // 4. Delete
        $service->delete($resource);

        // 5. Assert Deletion
        $this->assertDatabaseMissing('resources', ['id' => $resource->id]);
        $this->assertDatabaseMissing('resource_chunks', ['resource_id' => $resource->id]);
        
        Storage::disk('s3')->assertMissing($resource->s3_key);
    }
}

<?php

namespace App\Services;

use App\Models\Resource;
use App\Models\ResourceChunk;
use Illuminate\Support\Facades\Log;

class VectorService
{
    /**
     * Process the text content, chunk it, generate embeddings, and store them.
     */
    public function processAndStore(Resource $resource, string $textContent): void
    {
        // 1. Chunk the text
        $chunks = $this->chunkText($textContent);

        // 2. Generate embeddings & Store
        foreach ($chunks as $index => $chunkContent) {
            $embedding = $this->generateEmbedding($chunkContent); // Returns array

            ResourceChunk::create([
                'resource_id' => $resource->id,
                'chunk_index' => $index,
                'content' => $chunkContent,
                'embedding' => $embedding,
            ]);
        }
    }

    /**
     * Split text into chunks.
     * @todo  Replace with a more sophisticated splitter (recursive character text splitter, etc.)
     */
    protected function chunkText(string $text, int $chunkSize = 1000): array
    {
        // Simple character-based splitting for now
        return str_split($text, $chunkSize);
    }

    /**
     * Generate an embedding vector for the given text.
     * @todo Replace with actual OpenAI / local model call.
     */
    protected function generateEmbedding(string $text): array
    {
        // Placeholder: deterministic pseudo-random vector for testing
        // Size 1536 (OpenAI standard)
        
        // This is just to make it work without an API key for now. 
        // In production, call: OpenAI::embeddings()->create(...)
        
        $vector = array_fill(0, 1536, 0.0);
        
        // Fill a few values so it's not all zeros
        $hash = md5($text);
        for ($i = 0; $i < 10; $i++) {
            $val = hexdec(substr($hash, $i, 1)) / 16.0; // 0.0 to 1.0
            $vector[$i] = $val;
        }

        return $vector;
    }
}

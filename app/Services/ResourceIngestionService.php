<?php

namespace App\Services;

use App\Models\Resource;
use App\Models\ResourceChunk;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class ResourceIngestionService
{
    public function __construct(
        private ResourceDocumentExtractor $extractor,
        private TextChunker $chunker,
        private UserEmbeddingService $embeddings,
        private QdrantService $qdrant,
    ) {}

    /**
     * Extract text, chunk, embed with the user's model, and upsert into Qdrant.
     */
    public function ingest(Resource $resource, ?User $user = null): int
    {
        $user ??= $resource->owner;
        if (! $user) {
            throw new RuntimeException('Resource has no owner for ingestion.');
        }

        if (! $this->qdrant->isConfigured()) {
            throw new RuntimeException('QDRANT_HOST is not configured in .env');
        }

        $embeddingSetting = $this->embeddings->embeddingSetting($user);
        if (! $embeddingSetting) {
            throw new RuntimeException(
                'No embedding provider configured. Open Settings → Embeddings AI and choose a provider.',
            );
        }

        $text = $this->extractor->extract($resource, $user);
        if (trim($text) === '') {
            throw new RuntimeException(
                'No text could be extracted from this file. Use PDF, Word, or plain text, and configure Chat AI in Settings if using Gemini for PDF extraction.',
            );
        }

        $chunks = $this->chunker->chunk($text);
        if ($chunks === []) {
            throw new RuntimeException('Document produced no text chunks.');
        }

        $batchSize = 16;
        $vectorSize = null;
        $allPoints = [];
        $dbRows = [];

        // Delete existing points from the per-user collection
        $this->qdrant->deleteByResourceId($resource->id, $embeddingSetting);
        $resource->chunks()->delete();

        foreach (array_chunk($chunks, $batchSize) as $batchIndex => $batch) {
            $vectors = $this->embeddings->embed($user, $batch);

            if ($vectorSize === null) {
                $vectorSize = count($vectors[0] ?? []);
                if ($vectorSize < 1) {
                    throw new RuntimeException('Embedding model returned empty vectors.');
                }
                $this->qdrant->ensureCollection($vectorSize, $embeddingSetting);
            }

            foreach ($batch as $i => $content) {
                $globalIndex = ($batchIndex * $batchSize) + $i;
                $pointId = $this->qdrant->newPointId();
                $vector = $vectors[$i] ?? [];

                if (count($vector) !== $vectorSize) {
                    throw new RuntimeException(
                        "Embedding dimension mismatch at chunk {$globalIndex}: expected {$vectorSize}, got ".count($vector),
                    );
                }

                $allPoints[] = [
                    'id' => $pointId,
                    'vector' => $vector,
                    'payload' => [
                        'resource_id' => $resource->id,
                        'chunk_index' => $globalIndex,
                        'full_content' => $content,
                        'user_id' => $user->id,
                    ],
                ];

                $dbRows[] = [
                    'id' => $pointId,
                    'resource_id' => $resource->id,
                    'chunk_index' => $globalIndex,
                    'content' => $content,
                    'qdrant_point_id' => $pointId,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
        }

        foreach (array_chunk($allPoints, 64) as $pointBatch) {
            $this->qdrant->upsertPoints($pointBatch, $embeddingSetting);
        }

        if ($dbRows !== []) {
            ResourceChunk::insert($dbRows);
        }

        $resource->update([
            'metadata' => array_merge($resource->metadata ?? [], [
                'ingested_at' => now()->toDateTimeString(),
                'chunk_count' => count($chunks),
                'embedding_model' => $this->embeddings->resolveEmbeddingModel($embeddingSetting),
                'embedding_provider' => $embeddingSetting->provider_type,
                'vector_size' => $vectorSize,
            ]),
        ]);

        Log::info("Resource {$resource->id} ingested into Qdrant", [
            'chunks' => count($chunks),
            'vector_size' => $vectorSize,
            'collection' => $this->qdrant->collectionName($embeddingSetting),
        ]);

        return count($chunks);
    }
}

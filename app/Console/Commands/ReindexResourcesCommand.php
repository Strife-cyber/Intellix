<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\QdrantService;
use App\Services\ResourceIngestionService;
use App\Services\UserEmbeddingService;
use Illuminate\Console\Command;

class ReindexResourcesCommand extends Command
{
    protected $signature = 'resources:reindex
        {--user= : The user ID to reindex resources for}
        {--resource= : A specific resource ID to reindex}';

    protected $description = 'Reindex all resources for a user with their current embedding model.';

    public function handle(
        ResourceIngestionService $ingestion,
        UserEmbeddingService $embeddings,
        QdrantService $qdrant,
    ): int {
        $userId = $this->option('user');
        $resourceId = $this->option('resource');

        if ($resourceId) {
            $resource = \App\Models\Resource::find($resourceId);
            if (! $resource) {
                $this->error("Resource {$resourceId} not found.");

                return 1;
            }

            $user = $resource->owner;
            if (! $user) {
                $this->error('Resource has no owner.');

                return 1;
            }

            $this->info("Reindexing resource {$resource->id} ({$resource->original_name})...");

            try {
                $chunks = $ingestion->ingest($resource, $user);
                $this->info("Done — {$chunks} chunks indexed.");
            } catch (\Throwable $e) {
                $this->error("Failed: {$e->getMessage()}");

                return 1;
            }

            return 0;
        }

        if (! $userId) {
            $this->error('Specify --user or --resource.');

            return 1;
        }

        $user = User::find($userId);
        if (! $user) {
            $this->error("User {$userId} not found.");

            return 1;
        }

        $setting = $embeddings->embeddingSetting($user);
        if (! $setting) {
            $this->error('User has no embedding provider configured.');

            return 1;
        }

        $resources = $user->resources()->whereNotNull('metadata->ingested_at')->get();

        if ($resources->isEmpty()) {
            $this->warn('No indexed resources found for this user.');

            return 0;
        }

        $this->info("Reindexing {$resources->count()} resources for user {$user->id}...");
        $this->info("Model: {$embeddings->resolveEmbeddingModel($setting)}");
        $this->info("Qdrant collection: {$qdrant->collectionName($setting)}");

        $bar = $this->output->createProgressBar($resources->count());
        $bar->start();

        $errors = 0;

        foreach ($resources as $resource) {
            try {
                $ingestion->ingest($resource, $user);
            } catch (\Throwable $e) {
                $this->error("\nFailed to reindex {$resource->id}: {$e->getMessage()}");
                $errors++;
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("Done — {$resources->count()} processed, {$errors} errors.");

        return $errors > 0 ? 1 : 0;
    }
}

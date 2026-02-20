<?php

namespace App\Services\Rust\Commands;

use App\Services\Rust\RustCommandInterface;
use InvalidArgumentException;

/**
 * Command for ingesting a resource into the vector store.
 *
 * Usage:
 * $command = new IngestCommand($signedUrl, $resourceId, ['chunk_size' => 1000]);
 * $result = $rust->execute($command);
 */
class IngestCommand implements RustCommandInterface
{
    public function __construct(
        protected string $url,
        protected string $resourceId,
        protected array $options = []
    ) {
    }

    public function getCommand(): string
    {
        return 'ingest';
    }

    public function getArguments(): array
    {
        $args = [$this->url, $this->resourceId];

        if (isset($this->options['chunk_size'])) {
            $args[] = '--chunk-size';
            $args[] = (string) $this->options['chunk_size'];
        }

        if (isset($this->options['token_overlap'])) {
            $args[] = '--token-overlap';
            $args[] = (string) $this->options['token_overlap'];
        }

        return $args;
    }

    public function validate(): void
    {
        if (empty($this->url)) {
            throw new InvalidArgumentException('URL cannot be empty');
        }

        if (empty($this->resourceId)) {
            throw new InvalidArgumentException('Resource ID cannot be empty');
        }
    }

    public function toCommandArray(string $binaryPath): array
    {
        return array_merge([$binaryPath, $this->getCommand()], $this->getArguments());
    }
}

<?php

namespace App\Services\Rust\Commands;

use App\Services\Rust\RustCommandInterface;
use InvalidArgumentException;

class IngestCommand implements RustCommandInterface
{
    public function __construct(
        protected string $url,
        protected string $resourceId,
        protected array $options = []
    ) {
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
        $command = [$binaryPath, 'ingest', $this->url, $this->resourceId];

        if (isset($this->options['chunk_size'])) {
            $command[] = '--chunk-size';
            $command[] = (string) $this->options['chunk_size'];
        }

        if (isset($this->options['token_overlap'])) {
            $command[] = '--token-overlap';
            $command[] = (string) $this->options['token_overlap'];
        }

        return $command;
    }
}

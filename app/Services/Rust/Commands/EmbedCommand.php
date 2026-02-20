<?php

namespace App\Services\Rust\Commands;

use App\Services\Rust\RustCommandInterface;
use InvalidArgumentException;

/**
 * Command for generating embeddings from text.
 *
 * Usage:
 * $command = new EmbedCommand('Some text to embed');
 * $result = $rust->execute($command);
 */
class EmbedCommand implements RustCommandInterface
{
    public function __construct(
        protected string $text
    ) {
        $this->validate();
    }

    public function getCommand(): string
    {
        return 'embed';
    }

    public function getArguments(): array
    {
        return ['--text', $this->text];
    }

    public function validate(): void
    {
        if (empty(trim($this->text))) {
            throw new InvalidArgumentException('Text to embed cannot be empty');
        }
    }

    public function toCommandArray(string $binaryPath): array
    {
        return array_merge([$binaryPath, $this->getCommand()], $this->getArguments());
    }

    /**
     * Get the text being embedded.
     */
    public function getText(): string
    {
        return $this->text;
    }
}

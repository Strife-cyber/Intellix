<?php

namespace App\Services\Rust;

/**
 * Interface defining allowed Rust binary commands.
 * This ensures type safety and prevents arbitrary command execution.
 */
interface RustCommandInterface
{
    /**
     * Get the command name (e.g., 'extract', 'scrape', 'fsrs').
     */
    public function getCommand(): string;

    /**
     * Get the command arguments as an array.
     * This will be passed to the Rust binary.
     */
    public function getArguments(): array;

    /**
     * Validate the command before execution.
     *
     * @throws \InvalidArgumentException if the command is invalid
     */
    public function validate(): void;

    /**
     * Get the full command array for Process execution.
     * Returns: [binary_path, command, ...args]
     */
    public function toCommandArray(string $binaryPath): array;
}

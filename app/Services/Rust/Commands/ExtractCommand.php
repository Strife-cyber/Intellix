<?php

namespace App\Services\Rust\Commands;

use App\Services\Rust\RustCommandInterface;
use InvalidArgumentException;

/**
 * Command for extracting text from documents.
 *
 * Usage:
 * $command = new ExtractCommand('/path/to/document.pdf');
 * $result = $rust->execute($command);
 */
class ExtractCommand implements RustCommandInterface
{
    /**
     * Supported file extensions for extraction.
     */
    protected const SUPPORTED_EXTENSIONS = [
        'pdf', 'docx', 'odt', 'txt', 'text', 'md', 'markdown', 'html', 'htm',
    ];

    public function __construct(
        protected string $filePath
    ) {
        $this->validate();
    }

    public function getCommand(): string
    {
        return 'extract';
    }

    public function getArguments(): array
    {
        return [$this->filePath];
    }

    public function validate(): void
    {
        if (empty($this->filePath)) {
            throw new InvalidArgumentException('File path cannot be empty');
        }

        // Check if file exists
        if (! file_exists($this->filePath)) {
            throw new InvalidArgumentException("File does not exist: {$this->filePath}");
        }

        // Check if it's a file (not a directory)
        if (! is_file($this->filePath)) {
            throw new InvalidArgumentException("Path is not a file: {$this->filePath}");
        }

        // Check file extension
        $extension = strtolower(pathinfo($this->filePath, PATHINFO_EXTENSION));
        if (! in_array($extension, self::SUPPORTED_EXTENSIONS, true)) {
            throw new InvalidArgumentException(
                "Unsupported file extension: {$extension}. ".
                'Supported: '.implode(', ', self::SUPPORTED_EXTENSIONS)
            );
        }

        // Check file is readable
        if (! is_readable($this->filePath)) {
            throw new InvalidArgumentException("File is not readable: {$this->filePath}");
        }
    }

    public function toCommandArray(string $binaryPath): array
    {
        return array_merge([$binaryPath, $this->getCommand()], $this->getArguments());
    }

    /**
     * Get the file path being extracted.
     */
    public function getFilePath(): string
    {
        return $this->filePath;
    }
}

<?php

namespace App\Services\Rust\Commands;

use App\Services\Rust\RustCommandInterface;
use InvalidArgumentException;

/**
 * Command for processing FSRS (Free Spaced Repetition Scheduler) review data.
 *
 * Usage:
 * $command = new FsrsCommand(['last_interval' => 1.0, 'difficulty' => 5.0, ...]);
 * $result = $rust->execute($command);
 *
 * Or with a file:
 * $command = new FsrsCommand(null, '/path/to/reviews.json');
 * $result = $rust->execute($command);
 */
class FsrsCommand implements RustCommandInterface
{
    /**
     * JSON input data (for stdin).
     */
    protected ?array $inputData = null;

    /**
     * Optional file path (if not using stdin).
     */
    protected ?string $filePath = null;

    public function __construct(?array $inputData = null, ?string $filePath = null)
    {
        if ($inputData === null && $filePath === null) {
            throw new InvalidArgumentException(
                'Either inputData or filePath must be provided'
            );
        }

        if ($inputData !== null && $filePath !== null) {
            throw new InvalidArgumentException(
                'Cannot provide both inputData and filePath. Use one or the other.'
            );
        }

        $this->inputData = $inputData;
        $this->filePath = $filePath;
        $this->validate();
    }

    public function getCommand(): string
    {
        return 'fsrs';
    }

    public function getArguments(): array
    {
        if ($this->filePath !== null) {
            return ['--file', $this->filePath];
        }

        // For stdin, no additional arguments needed
        return [];
    }

    public function validate(): void
    {
        if ($this->filePath !== null) {
            if (! file_exists($this->filePath)) {
                throw new InvalidArgumentException("File does not exist: {$this->filePath}");
            }

            if (! is_file($this->filePath)) {
                throw new InvalidArgumentException("Path is not a file: {$this->filePath}");
            }

            if (! is_readable($this->filePath)) {
                throw new InvalidArgumentException("File is not readable: {$this->filePath}");
            }

            // Validate JSON structure
            $content = file_get_contents($this->filePath);
            $decoded = json_decode($content, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new InvalidArgumentException(
                    'Invalid JSON in file: '.json_last_error_msg()
                );
            }

            $this->validateFsrsData($decoded);
        }

        if ($this->inputData !== null) {
            $this->validateFsrsData($this->inputData);
        }
    }

    /**
     * Validate FSRS input data structure.
     */
    protected function validateFsrsData(array $data): void
    {
        // Check if it's a batch input
        if (isset($data['reviews']) && is_array($data['reviews'])) {
            foreach ($data['reviews'] as $review) {
                $this->validateReviewInput($review);
            }

            return;
        }

        // Otherwise, it's a single review input
        $this->validateReviewInput($data);
    }

    /**
     * Validate a single review input.
     */
    protected function validateReviewInput(array $review): void
    {
        $required = ['last_interval', 'difficulty', 'rating'];
        foreach ($required as $field) {
            if (! isset($review[$field])) {
                throw new InvalidArgumentException(
                    "Missing required field: {$field}"
                );
            }
        }

        // Validate types
        if (! is_numeric($review['last_interval'])) {
            throw new InvalidArgumentException(
                'last_interval must be numeric, got: '.gettype($review['last_interval'])
            );
        }

        if (! is_numeric($review['difficulty'])) {
            throw new InvalidArgumentException(
                'difficulty must be numeric, got: '.gettype($review['difficulty'])
            );
        }

        // Validate rating
        $validRatings = ['again', 'hard', 'good', 'easy'];
        $rating = strtolower($review['rating']);
        if (! in_array($rating, $validRatings, true)) {
            throw new InvalidArgumentException(
                "Invalid rating: {$review['rating']}. Must be one of: ".
                implode(', ', $validRatings)
            );
        }
    }

    public function toCommandArray(string $binaryPath): array
    {
        return array_merge([$binaryPath, $this->getCommand()], $this->getArguments());
    }

    /**
     * Get the input data for stdin (if using stdin).
     */
    public function getInputData(): ?array
    {
        return $this->inputData;
    }

    /**
     * Get the JSON string for stdin input.
     */
    public function getInputJson(): ?string
    {
        if ($this->inputData === null) {
            return null;
        }

        return json_encode($this->inputData);
    }

    /**
     * Get the file path (if using file input).
     */
    public function getFilePath(): ?string
    {
        return $this->filePath;
    }
}

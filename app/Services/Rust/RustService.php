<?php

namespace App\Services\Rust;

use App\Services\Rust\Commands\ExtractCommand;
use App\Services\Rust\Commands\FsrsCommand;
use App\Services\Rust\Commands\ScrapeCommand;
use App\Services\RustBinaryExecutor;
use InvalidArgumentException;
use Symfony\Component\Process\Process;

/**
 * Facade/Service for executing Rust binary commands safely.
 *
 * This service provides a type-safe interface for executing Rust commands,
 * preventing arbitrary command execution and ensuring only valid commands
 * are executed.
 *
 * Usage:
 * $rust = new RustService();
 *
 * // Extract document
 * $result = $rust->extract('/path/to/document.pdf', ['job_id' => '123']);
 *
 * // Scrape URL
 * $result = $rust->scrape('https://example.com', ['user_id' => '456']);
 *
 * // Process FSRS review
 * $result = $rust->fsrs(['last_interval' => 1.0, 'difficulty' => 5.0, ...]);
 */
class RustService
{
    protected RustBinaryExecutor $executor;

    protected ?string $binaryPath = null;

    protected ?int $timeout = null;

    protected string $logChannel = 'rust';

    public function __construct(?RustBinaryExecutor $executor = null)
    {
        $this->executor = $executor ?? new RustBinaryExecutor;
        // Lazy load binary path - don't call base_path() in constructor
        // Will be loaded on first execute() call
    }

    /**
     * Find the compiled Rust binary path.
     */
    protected function findBinaryPath(): ?string
    {
        // Check for Windows executable
        $windowsPath = base_path('target/release/intellix.exe');
        if (file_exists($windowsPath)) {
            return $windowsPath;
        }

        // Check for Linux/Mac executable
        $unixPath = base_path('target/release/intellix');
        if (file_exists($unixPath)) {
            return $unixPath;
        }

        // Check environment variable
        $envPath = env('RUST_BINARY_PATH');
        if ($envPath && file_exists($envPath)) {
            return $envPath;
        }

        return null;
    }

    /**
     * Execute a Rust command.
     *
     * @param  RustCommandInterface  $command  The command to execute
     * @param  array  $context  Additional context for logging
     * @param  int|null  $timeout  Timeout in seconds
     * @return array Execution result
     *
     * @throws InvalidArgumentException if binary not found or command invalid
     */
    public function execute(
        RustCommandInterface $command,
        array $context = [],
        ?int $timeout = null
    ): array {
        // Lazy load binary path
        if ($this->binaryPath === null) {
            $this->binaryPath = $this->findBinaryPath();
        }

        if ($this->binaryPath === null) {
            throw new InvalidArgumentException(
                'Rust binary not found. '.
                'Build it with: cargo build --release '.
                'or set RUST_BINARY_PATH environment variable.'
            );
        }

        // Validate command before execution
        $command->validate();

        // Build command array
        $commandArray = $command->toCommandArray($this->binaryPath);

        // Handle stdin input for FSRS command
        $stdin = null;
        if ($command instanceof FsrsCommand && $command->getInputJson() !== null) {
            $stdin = $command->getInputJson();
        }

        // Execute with stdin if needed
        if ($stdin !== null) {
            return $this->executeWithStdin($commandArray, $stdin, $context, $timeout);
        }

        // Execute normally
        $timeout = $timeout ?? $this->timeout;
        if ($timeout !== null) {
            $this->executor->setTimeout($timeout);
        }

        $this->executor->setLogChannel($this->logChannel);

        return $this->executor->execute($commandArray, $context, $timeout);
    }

    /**
     * Execute command with stdin input.
     */
    protected function executeWithStdin(
        array $commandArray,
        string $stdin,
        array $context,
        ?int $timeout
    ): array {
        $process = new Process($commandArray);
        $process->setInput($stdin);

        if ($timeout !== null) {
            $process->setTimeout($timeout);
        } elseif ($this->timeout !== null) {
            $process->setTimeout($this->timeout);
        }

        $startTime = microtime(true);

        try {
            $process->run();
        } catch (\Symfony\Component\Process\Exception\ProcessTimedOutException $e) {
            $duration = microtime(true) - $startTime;

            return [
                'success' => false,
                'stdout' => $process->getOutput(),
                'stderr' => $process->getErrorOutput(),
                'exit_code' => -1,
                'duration' => $duration,
                'logs' => [],
                'error' => 'Process timed out',
            ];
        } catch (\Symfony\Component\Process\Exception\ProcessFailedException $e) {
            $duration = microtime(true) - $startTime;
            $exitCode = $process->getExitCode() ?? -1;
            $stderr = $process->getErrorOutput();
            $logs = $this->parseStderr($stderr, basename($commandArray[0]), implode(' ', $commandArray), $exitCode, $duration, $context);

            return [
                'success' => false,
                'stdout' => $process->getOutput(),
                'stderr' => $stderr,
                'exit_code' => $exitCode,
                'duration' => $duration,
                'logs' => $logs,
                'error' => $e->getMessage(),
            ];
        }

        $exitCode = $process->getExitCode();
        $stdout = $process->getOutput();
        $stderr = $process->getErrorOutput();
        $duration = microtime(true) - $startTime;

        // Parse STDERR using executor's method
        $logs = $this->parseStderr($stderr, basename($commandArray[0]), implode(' ', $commandArray), $exitCode, $duration, $context);

        // Log execution summary
        $this->logExecutionSummary(basename($commandArray[0]), implode(' ', $commandArray), $exitCode, $duration, $context);

        return [
            'success' => $exitCode === 0,
            'stdout' => $stdout,
            'stderr' => $stderr,
            'exit_code' => $exitCode,
            'duration' => $duration,
            'logs' => $logs,
        ];
    }

    /**
     * Parse STDERR output (reuse executor's logic).
     */
    protected function parseStderr(
        string $stderr,
        string $binaryName,
        string $command,
        int $exitCode,
        float $duration,
        array $context
    ): array {
        // Use reflection to call executor's protected method
        $reflection = new \ReflectionClass($this->executor);
        $method = $reflection->getMethod('parseStderr');
        $method->setAccessible(true);

        return $method->invoke($this->executor, $stderr, $binaryName, $command, $exitCode, $duration, $context);
    }

    /**
     * Log execution summary.
     */
    protected function logExecutionSummary(
        string $binaryName,
        string $command,
        int $exitCode,
        float $duration,
        array $context
    ): void {
        $reflection = new \ReflectionClass($this->executor);
        $method = $reflection->getMethod('logExecutionSummary');
        $method->setAccessible(true);
        $method->invoke($this->executor, $binaryName, $command, $exitCode, $duration, $context);
    }

    /**
     * Extract text from a document.
     *
     * @param  string  $filePath  Path to the document file
     * @param  array  $context  Additional context for logging
     * @return array Execution result
     */
    public function extract(string $filePath, array $context = []): array
    {
        $command = new ExtractCommand($filePath);

        return $this->execute($command, $context);
    }

    /**
     * Scrape content from a URL.
     *
     * @param  string  $url  URL to scrape
     * @param  array  $context  Additional context for logging
     * @return array Execution result
     */
    public function scrape(string $url, array $context = []): array
    {
        $command = new ScrapeCommand($url);

        return $this->execute($command, $context);
    }

    /**
     * Process FSRS review data.
     *
     * @param  array|null  $inputData  Review data (for stdin)
     * @param  string|null  $filePath  Path to JSON file (alternative to inputData)
     * @param  array  $context  Additional context for logging
     * @return array Execution result
     */
    public function fsrs(?array $inputData = null, ?string $filePath = null, array $context = []): array
    {
        $command = new FsrsCommand($inputData, $filePath);

        return $this->execute($command, $context);
    }

    /**
     * Set the binary path manually.
     */
    public function setBinaryPath(string $path): self
    {
        if (! file_exists($path)) {
            throw new InvalidArgumentException("Binary not found: {$path}");
        }

        $this->binaryPath = $path;

        return $this;
    }

    /**
     * Set the default timeout.
     */
    public function setTimeout(?int $timeout): self
    {
        $this->timeout = $timeout;

        return $this;
    }

    /**
     * Set the log channel.
     */
    public function setLogChannel(string $channel): self
    {
        $this->logChannel = $channel;

        return $this;
    }

    /**
     * Get the binary path.
     */
    public function getBinaryPath(): ?string
    {
        return $this->binaryPath;
    }
}

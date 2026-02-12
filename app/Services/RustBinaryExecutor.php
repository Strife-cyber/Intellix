<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Symfony\Component\Process\Exception\ProcessFailedException;
use Symfony\Component\Process\Exception\ProcessTimedOutException;
use Symfony\Component\Process\Process;

/**
 * Service for executing Rust binaries and capturing structured logs from STDERR.
 *
 * This service implements the observability contract:
 * - Captures STDERR separately from STDOUT
 * - Parses JSON from STDERR
 * - Logs parsed JSON to Laravel's logging system
 * - Captures and returns exit codes
 * - Handles timeouts and process failures
 */
class RustBinaryExecutor
{
    /**
     * Default timeout in seconds (null = no timeout)
     */
    protected ?int $timeout = 300;

    /**
     * The log channel to use for Rust logs
     */
    protected string $logChannel = 'rust';

    /**
     * Execute a Rust binary command.
     *
     * @param  array|string  $command  The command to execute
     * @param  array  $context  Additional context to include in logs (e.g., job_id, user_id)
     * @param  int|null  $timeout  Timeout in seconds (null = no timeout)
     * @return array{success: bool, stdout: string, stderr: string, exit_code: int, duration: float, logs: array}
     */
    public function execute(array|string $command, array $context = [], ?int $timeout = null): array
    {
        $startTime = microtime(true);
        $process = $this->createProcess($command);

        if ($timeout !== null) {
            $process->setTimeout($timeout);
        } elseif ($this->timeout !== null) {
            $process->setTimeout($this->timeout);
        }

        $commandString = is_array($command) ? implode(' ', $command) : $command;
        $binaryName = $this->extractBinaryName($command);

        try {
            $process->run();

            $exitCode = $process->getExitCode();
            $stdout = $process->getOutput();
            $stderr = $process->getErrorOutput();
            $duration = microtime(true) - $startTime;

            $logs = $this->parseStderr($stderr, $binaryName, $commandString, $exitCode, $duration, $context);

            // Log execution summary
            $this->logExecutionSummary($binaryName, $commandString, $exitCode, $duration, $context);

            return [
                'success' => $exitCode === 0,
                'stdout' => $stdout,
                'stderr' => $stderr,
                'exit_code' => $exitCode,
                'duration' => $duration,
                'logs' => $logs,
            ];
        } catch (ProcessTimedOutException $e) {
            $duration = microtime(true) - $startTime;
            $this->logTimeout($binaryName, $commandString, $duration, $context);

            return [
                'success' => false,
                'stdout' => $process->getOutput(),
                'stderr' => $process->getErrorOutput(),
                'exit_code' => -1,
                'duration' => $duration,
                'logs' => [],
                'error' => 'Process timed out',
            ];
        } catch (ProcessFailedException $e) {
            $duration = microtime(true) - $startTime;
            $exitCode = $process->getExitCode() ?? -1;
            $stderr = $process->getErrorOutput();

            $logs = $this->parseStderr($stderr, $binaryName, $commandString, $exitCode, $duration, $context);
            $this->logProcessFailure($binaryName, $commandString, $exitCode, $duration, $context);

            return [
                'success' => false,
                'stdout' => $process->getOutput(),
                'stderr' => $stderr,
                'exit_code' => $exitCode,
                'duration' => $duration,
                'logs' => $logs,
                'error' => $e->getMessage(),
            ];
        } catch (\Exception $e) {
            $duration = microtime(true) - $startTime;
            $this->logStartupError($binaryName, $commandString, $e, $context);

            return [
                'success' => false,
                'stdout' => '',
                'stderr' => '',
                'exit_code' => -1,
                'duration' => $duration,
                'logs' => [],
                'error' => 'Failed to start process: '.$e->getMessage(),
            ];
        }
    }

    /**
     * Create a Symfony Process instance.
     */
    protected function createProcess(array|string $command): Process
    {
        if (is_string($command)) {
            $command = explode(' ', $command);
        }

        return new Process($command);
    }

    /**
     * Extract binary name from command.
     */
    protected function extractBinaryName(array|string $command): string
    {
        if (is_string($command)) {
            $parts = explode(' ', $command);
        } else {
            $parts = $command;
        }

        $binary = $parts[0] ?? 'unknown';

        // Extract just the filename if it's a path
        return basename($binary);
    }

    /**
     * Parse STDERR output as JSON logs.
     *
     * @return array Array of parsed log entries
     */
    protected function parseStderr(
        string $stderr,
        string $binaryName,
        string $command,
        int $exitCode,
        float $duration,
        array $context
    ): array {
        if (empty(trim($stderr))) {
            return [];
        }

        $logs = [];
        // Normalize line endings and split
        $stderr = str_replace(["\r\n", "\r"], "\n", $stderr);
        $lines = explode("\n", trim($stderr));

        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line)) {
                continue;
            }

            $parsed = $this->parseJsonLine($line);

            if ($parsed !== null) {
                // Merge execution context into log entry
                $parsed['binary'] = $binaryName;
                $parsed['command'] = $command;
                $parsed['exit_code'] = $exitCode;
                $parsed['duration'] = $duration;
                $parsed['execution_context'] = $context;

                $logs[] = $parsed;

                // Log to Laravel's logging system
                try {
                    $this->logRustEntry($parsed);
                } catch (\Exception $e) {
                    // Don't fail if logging fails, but log the error
                    \Log::channel($this->logChannel)->error('Failed to log Rust entry', [
                        'error' => $e->getMessage(),
                        'entry' => $parsed,
                    ]);
                }
            } else {
                // Handle non-JSON STDERR output
                $this->logNonJsonStderr($binaryName, $command, $line, $exitCode, $duration, $context);
            }
        }

        return $logs;
    }

    /**
     * Parse a single line as JSON.
     *
     * @return array|null Parsed JSON or null if invalid
     */
    protected function parseJsonLine(string $line): ?array
    {
        $decoded = json_decode($line, true);

        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            return $decoded;
        }

        return null;
    }

    /**
     * Log a parsed Rust log entry to Laravel's logging system.
     */
    protected function logRustEntry(array $entry): void
    {
        $level = $this->mapRustLevelToLaravel($entry['level'] ?? 'error');
        $message = $entry['message'] ?? 'Rust binary log entry';

        Log::channel($this->logChannel)->log($level, $message, [
            'rust_log' => $entry,
        ]);
    }

    /**
     * Map Rust log level to Laravel log level.
     */
    protected function mapRustLevelToLaravel(string $rustLevel): string
    {
        return match (strtolower($rustLevel)) {
            'debug' => 'debug',
            'info' => 'info',
            'warning' => 'warning',
            'error' => 'error',
            'critical' => 'critical',
            default => 'error',
        };
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
        $level = $exitCode === 0 ? 'info' : 'warning';

        Log::channel($this->logChannel)->log($level, 'Rust binary execution completed', [
            'binary' => $binaryName,
            'command' => $command,
            'exit_code' => $exitCode,
            'duration' => $duration,
            'context' => $context,
        ]);
    }

    /**
     * Log timeout event.
     */
    protected function logTimeout(
        string $binaryName,
        string $command,
        float $duration,
        array $context
    ): void {
        Log::channel($this->logChannel)->error('Rust binary execution timed out', [
            'binary' => $binaryName,
            'command' => $command,
            'duration' => $duration,
            'context' => $context,
        ]);
    }

    /**
     * Log process failure.
     */
    protected function logProcessFailure(
        string $binaryName,
        string $command,
        int $exitCode,
        float $duration,
        array $context
    ): void {
        Log::channel($this->logChannel)->error('Rust binary execution failed', [
            'binary' => $binaryName,
            'command' => $command,
            'exit_code' => $exitCode,
            'duration' => $duration,
            'context' => $context,
        ]);
    }

    /**
     * Log startup error (process failed to start).
     */
    protected function logStartupError(
        string $binaryName,
        string $command,
        \Exception $exception,
        array $context
    ): void {
        Log::channel($this->logChannel)->critical('Failed to start Rust binary', [
            'binary' => $binaryName,
            'command' => $command,
            'error' => $exception->getMessage(),
            'exception' => get_class($exception),
            'context' => $context,
        ]);
    }

    /**
     * Log non-JSON STDERR output with a warning.
     */
    protected function logNonJsonStderr(
        string $binaryName,
        string $command,
        string $stderrLine,
        int $exitCode,
        float $duration,
        array $context
    ): void {
        Log::channel($this->logChannel)->warning('Rust binary produced non-JSON STDERR output', [
            'binary' => $binaryName,
            'command' => $command,
            'stderr_line' => $stderrLine,
            'exit_code' => $exitCode,
            'duration' => $duration,
            'context' => $context,
        ]);
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
}

<?php

namespace App\Logging;

use Monolog\Formatter\FormatterInterface;
use Monolog\LogRecord;

/**
 * Formatter for Rust STDERR JSON logs.
 * Parses JSON from STDERR and formats it for Laravel's logging system.
 */
class RustJsonFormatter implements FormatterInterface
{
    /**
     * Formats a log record.
     */
    public function format(LogRecord $record): string
    {
        $context = $record->context;

        // If the context contains parsed Rust log data, use it
        if (isset($context['rust_log'])) {
            $rustLog = $context['rust_log'];

            // Build a formatted message
            $message = $record->message;
            if (isset($rustLog['message'])) {
                $message = $rustLog['message'];
            }

            // Include context from Rust log
            $formatted = [
                'level' => $this->mapRustLevel($rustLog['level'] ?? 'error'),
                'message' => $message,
                'command' => $rustLog['command'] ?? null,
                'exit_code' => $rustLog['code'] ?? null,
                'context' => $rustLog['context'] ?? [],
                'timestamp' => $record->datetime->format('Y-m-d H:i:s'),
            ];

            return json_encode($formatted, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)."\n";
        }

        // Fallback to standard format
        return json_encode([
            'level' => $record->level->getName(),
            'message' => $record->message,
            'context' => $context,
            'timestamp' => $record->datetime->format('Y-m-d H:i:s'),
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)."\n";
    }

    /**
     * Formats a batch of log records.
     */
    public function formatBatch(array $records): string
    {
        $formatted = [];
        foreach ($records as $record) {
            $formatted[] = $this->format($record);
        }

        return implode('', $formatted);
    }

    /**
     * Map Rust log level to Monolog level.
     */
    private function mapRustLevel(string $rustLevel): string
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
}

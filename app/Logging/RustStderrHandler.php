<?php

namespace App\Logging;

use Monolog\Handler\StreamHandler;
use Monolog\LogRecord;

/**
 * Custom handler for capturing STDERR from Rust processes.
 * This handler writes to a file and expects JSON log entries from Rust binaries.
 */
class RustStderrHandler extends StreamHandler
{
    /**
     * Create a new handler instance.
     */
    public function __construct($stream, $level = \Monolog\Level::Debug, bool $bubble = true, ?int $filePermission = null, bool $useLocking = false)
    {
        parent::__construct($stream, $level, $bubble, $filePermission, $useLocking);
    }

    /**
     * Write the log record to the log.
     */
    protected function write(LogRecord $record): void
    {
        // The actual STDERR capture and parsing happens in RustBinaryExecutor
        // This handler writes the formatted log entry to the file
        parent::write($record);
    }
}

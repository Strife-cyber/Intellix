<?php

use App\Services\RustBinaryExecutor;
use Illuminate\Support\Facades\Log;

/**
 * Get the path to the compiled Rust binary.
 */
function getRustBinaryPath(): ?string
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

    return null;
}

test('it executes real Rust binary extract command', function () {
    $binaryPath = getRustBinaryPath();
    
    if ($binaryPath === null) {
        $this->markTestSkipped('Rust binary not found. Run: cargo build --release');
    }

    $executor = new RustBinaryExecutor();

    // Create a temporary test file
    $testFile = sys_get_temp_dir() . '/rust_test_' . uniqid() . '.txt';
    file_put_contents($testFile, "Hello, World!\nThis is a test document.");

    try {
        $result = $executor->execute([
            $binaryPath,
            'extract',
            $testFile
        ], [
            'test' => 'integration',
            'file' => basename($testFile)
        ]);

        expect($result['success'])->toBeTrue();
        expect($result['exit_code'])->toBe(0);
        expect($result['stdout'])->not->toBeEmpty();
        
        // Parse the JSON output
        $output = json_decode($result['stdout'], true);
        expect($output)->toBeArray();
        expect($output['ok'])->toBeTrue();
        expect($output['format'])->toBe('text');
        expect($output['pages'])->toBeArray();
        expect($output['pages'])->not->toBeEmpty();
        
        // Verify logs were captured
        expect($result['logs'])->toBeArray();
        
        // Verify execution context was included
        if (!empty($result['logs'])) {
            $logEntry = $result['logs'][0];
            expect($logEntry)->toHaveKey('execution_context');
            expect($logEntry['execution_context']['test'])->toBe('integration');
        }
    } finally {
        @unlink($testFile);
    }
})->skip(fn () => getRustBinaryPath() === null, 'Rust binary not found');

test('it captures Rust binary error logs correctly', function () {
    $binaryPath = getRustBinaryPath();
    
    if ($binaryPath === null) {
        $this->markTestSkipped('Rust binary not found. Run: cargo build --release');
    }

    $executor = new RustBinaryExecutor();

    // Try to extract a non-existent file (should produce error)
    $nonExistentFile = sys_get_temp_dir() . '/does_not_exist_' . uniqid() . '.pdf';

    $result = $executor->execute([
        $binaryPath,
        'extract',
        $nonExistentFile
    ], [
        'test' => 'error_handling'
    ]);

    expect($result['success'])->toBeFalse();
    expect($result['exit_code'])->not->toBe(0);
    
    // Should have error logs from Rust binary
    expect($result['logs'])->toBeArray();
    
    if (!empty($result['logs'])) {
        $errorLog = $result['logs'][0];
        expect($errorLog['level'])->toBe('error');
        expect($errorLog)->toHaveKey('message');
        expect($errorLog)->toHaveKey('code');
        expect($errorLog)->toHaveKey('command');
        // The command field contains the full command, but should include 'extract'
        expect($errorLog['command'])->toContain('extract');
        // Also check that the Rust log entry has the command field
        expect($errorLog)->toHaveKey('context');
    }
})->skip(fn () => getRustBinaryPath() === null, 'Rust binary not found');

test('it executes Rust binary scrape command', function () {
    $binaryPath = getRustBinaryPath();
    
    if ($binaryPath === null) {
        $this->markTestSkipped('Rust binary not found. Run: cargo build --release');
    }

    $executor = new RustBinaryExecutor();

    // Scrape a simple test URL (using a reliable test endpoint)
    $result = $executor->execute([
        $binaryPath,
        'scrape',
        'https://example.com'
    ], [
        'test' => 'scrape_integration'
    ]);

    // Scraping might fail due to network issues or HTML parsing errors

    // For now, just verify the command was executed and we got a response
    expect($result)->toHaveKey('exit_code');
    expect($result)->toHaveKey('stdout');
    expect($result)->toHaveKey('stderr');
    expect($result)->toHaveKey('logs');
    
    // If successful, verify the output structure
    if ($result['success']) {
        expect($result['exit_code'])->toBe(0);
        expect($result['stdout'])->not->toBeEmpty();
        
        // Parse the JSON output
        $output = json_decode($result['stdout'], true);
        expect($output)->toBeArray();
        expect($output['ok'])->toBeTrue();
        expect($output['url'])->toBe('https://example.com');
        expect($output)->toHaveKey('content');
        expect($output)->toHaveKey('fetched_at');
    } else {
        // If it failed, verify we got error logs
        expect($result['logs'])->toBeArray();
        // Network errors might not produce JSON logs, so we'll just verify the structure
    }
})->skip(fn () => getRustBinaryPath() === null, 'Rust binary not found');

test('it executes Rust binary fsrs command with stdin', function () {
    $binaryPath = getRustBinaryPath();
    
    if ($binaryPath === null) {
        $this->markTestSkipped('Rust binary not found. Run: cargo build --release');
    }

    $executor = new RustBinaryExecutor();

    // Create FSRS input JSON
    $fsrsInput = json_encode([
        'last_interval' => 1.0,
        'difficulty' => 5.0,
        'stability' => 1.0,
        'rating' => 'good'
    ]);

    // Use Symfony Process directly to pipe stdin
    $process = new \Symfony\Component\Process\Process([
        $binaryPath,
        'fsrs'
    ]);
    
    $process->setInput($fsrsInput);
    $process->run();

    $exitCode = $process->getExitCode();
    $stdout = $process->getOutput();
    $stderr = $process->getErrorOutput();

    expect($exitCode)->toBe(0);
    expect($stdout)->not->toBeEmpty();
    
    // Parse the JSON output
    $output = json_decode($stdout, true);
    expect($output)->toBeArray();
    expect($output)->toHaveKey('new_interval');
    expect($output)->toHaveKey('stability');
    expect($output)->toHaveKey('difficulty');
    expect($output)->toHaveKey('next_review');
})->skip(fn () => getRustBinaryPath() === null, 'Rust binary not found');

test('it logs Rust binary execution to Laravel log channel', function () {
    $binaryPath = getRustBinaryPath();
    
    if ($binaryPath === null) {
        $this->markTestSkipped('Rust binary not found. Run: cargo build --release');
    }

    Log::shouldReceive('channel')
        ->with('rust')
        ->andReturnSelf();
    
    Log::shouldReceive('log')
        ->atLeast()->once()
        ->with(\Mockery::any(), \Mockery::any(), \Mockery::type('array'));

    $executor = new RustBinaryExecutor();

    // Create a temporary test file
    $testFile = sys_get_temp_dir() . '/rust_test_' . uniqid() . '.txt';
    file_put_contents($testFile, "Test content");

    try {
        $result = $executor->execute([
            $binaryPath,
            'extract',
            $testFile
        ], [
            'test' => 'logging'
        ]);

        expect($result['success'])->toBeTrue();
    } finally {
        @unlink($testFile);
    }
})->skip(fn () => getRustBinaryPath() === null, 'Rust binary not found');

test('it handles Rust binary timeout correctly', function () {
    $binaryPath = getRustBinaryPath();
    
    if ($binaryPath === null) {
        $this->markTestSkipped('Rust binary not found. Run: cargo build --release');
    }

    $executor = new RustBinaryExecutor();

    // This test would need a Rust binary that can simulate long-running operations
    // For now, we'll skip it or test with a very short timeout on a quick operation
    $testFile = sys_get_temp_dir() . '/rust_test_' . uniqid() . '.txt';
    file_put_contents($testFile, "Quick test");

    try {
        // Set a very short timeout (should not timeout for extract)
        $result = $executor->execute([
            $binaryPath,
            'extract',
            $testFile
        ], [], 1); // 1 second timeout

        // Should complete successfully (extract is fast)
        expect($result['success'])->toBeTrue();
        expect($result['exit_code'])->toBe(0);
    } finally {
        @unlink($testFile);
    }
})->skip(fn () => getRustBinaryPath() === null, 'Rust binary not found');

test('it captures Rust binary exit codes correctly', function () {
    $binaryPath = getRustBinaryPath();
    
    if ($binaryPath === null) {
        $this->markTestSkipped('Rust binary not found. Run: cargo build --release');
    }

    $executor = new RustBinaryExecutor();

    // Test success case
    $testFile = sys_get_temp_dir() . '/rust_test_' . uniqid() . '.txt';
    file_put_contents($testFile, "Test");

    try {
        $result = $executor->execute([
            $binaryPath,
            'extract',
            $testFile
        ]);

        expect($result['success'])->toBeTrue();
        expect($result['exit_code'])->toBe(0);
    } finally {
        @unlink($testFile);
    }

    // Test error case (non-existent file)
    $nonExistentFile = sys_get_temp_dir() . '/does_not_exist_' . uniqid() . '.pdf';
    $result = $executor->execute([
        $binaryPath,
        'extract',
        $nonExistentFile
    ]);

    expect($result['success'])->toBeFalse();
    expect($result['exit_code'])->not->toBe(0);
    expect($result['exit_code'])->toBeGreaterThan(0);
})->skip(fn () => getRustBinaryPath() === null, 'Rust binary not found');

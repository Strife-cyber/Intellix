<?php

use App\Services\RustBinaryExecutor;

uses(Tests\TestCase::class);

function createTestScript(array $config): string
{
    $script = sys_get_temp_dir().'/rust_test_'.uniqid().'.php';

    $php = "<?php\n";

    if (isset($config['stderr'])) {
        // Use heredoc or var_export to avoid escaping issues with JSON
        $stderr = var_export($config['stderr'], true);
        $php .= "file_put_contents('php://stderr', {$stderr} . PHP_EOL);\n";
    }

    if (isset($config['sleep'])) {
        $php .= 'usleep('.($config['sleep'] * 1000000).");\n";
    }

    if (isset($config['stdout'])) {
        $stdout = var_export($config['stdout'], true);
        $php .= "echo {$stdout};\n";
    }

    $exitCode = $config['exit_code'] ?? 0;
    $php .= "exit({$exitCode});\n";

    file_put_contents($script, $php);

    return $script;
}

test('it parses JSON logs from STDERR correctly', function () {
    $executor = new RustBinaryExecutor;

    // Create a test script that outputs JSON to STDERR
    $testScript = createTestScript([
        'stderr' => json_encode([
            'level' => 'error',
            'message' => 'Test error message',
            'context' => ['key' => 'value'],
            'code' => 1,
            'command' => 'test',
        ]),
        'exit_code' => 1,
    ]);

    $result = $executor->execute(['php', $testScript]);

    expect($result['success'])->toBeFalse();
    expect($result['exit_code'])->toBe(1);
    expect($result['logs'])->toBeArray();
    expect($result['logs'])->not->toBeEmpty();
    expect($result['logs'][0]['level'])->toBe('error');
    expect($result['logs'][0]['message'])->toBe('Test error message');
    expect($result['logs'][0]['context'])->toBeArray();

    @unlink($testScript);
});

test('it captures exit codes correctly', function () {
    $executor = new RustBinaryExecutor;

    // Test with exit code 0
    $successScript = createTestScript([
        'exit_code' => 0,
    ]);

    $result = $executor->execute(['php', $successScript]);
    expect($result['success'])->toBeTrue();
    expect($result['exit_code'])->toBe(0);
    @unlink($successScript);

    // Test with exit code 1
    $failScript = createTestScript([
        'exit_code' => 1,
    ]);

    $result = $executor->execute(['php', $failScript]);
    expect($result['success'])->toBeFalse();
    expect($result['exit_code'])->toBe(1);
    @unlink($failScript);

    // Test with exit code 42
    $customScript = createTestScript([
        'exit_code' => 42,
    ]);

    $result = $executor->execute(['php', $customScript]);
    expect($result['success'])->toBeFalse();
    expect($result['exit_code'])->toBe(42);
    @unlink($customScript);
});

test('it handles non-JSON STDERR gracefully', function () {
    $executor = new RustBinaryExecutor;

    // Create a test script that outputs plain text to STDERR
    $testScript = createTestScript([
        'stderr' => 'This is plain text, not JSON',
        'exit_code' => 1,
    ]);

    $result = $executor->execute(['php', $testScript]);

    expect($result['success'])->toBeFalse();
    expect($result['exit_code'])->toBe(1);
    expect($result['stderr'])->toContain('This is plain text, not JSON');
    expect($result['logs'])->toBeArray();

    @unlink($testScript);
});

test('it includes expected fields in log entries', function () {
    $executor = new RustBinaryExecutor;

    $testScript = createTestScript([
        'stderr' => json_encode([
            'level' => 'error',
            'message' => 'Test message',
            'context' => ['test' => 'data'],
            'code' => 1,
            'command' => 'extract',
        ]),
        'exit_code' => 1,
    ]);

    $result = $executor->execute(['php', $testScript], [
        'job_id' => '123',
        'user_id' => '456',
    ]);

    expect($result['logs'])->not->toBeEmpty();
    $logEntry = $result['logs'][0];

    expect($logEntry)->toHaveKeys(['level', 'message', 'binary', 'command', 'exit_code', 'duration', 'execution_context']);
    expect($logEntry['execution_context'])->toBeArray();
    expect($logEntry['execution_context']['job_id'])->toBe('123');
    expect($logEntry['execution_context']['user_id'])->toBe('456');
    expect($logEntry['duration'])->toBeNumeric();
    expect($logEntry['duration'])->toBeGreaterThan(0);

    @unlink($testScript);
});

test('it handles process timeouts', function () {
    $executor = new RustBinaryExecutor;

    // Create a test script that sleeps for longer than timeout
    $testScript = createTestScript([
        'sleep' => 2,
        'exit_code' => 0,
    ]);

    $result = $executor->execute(['php', $testScript], [], 1); // 1 second timeout

    expect($result['success'])->toBeFalse();
    expect($result['exit_code'])->toBe(-1);
    expect($result['error'])->toBe('Process timed out');

    @unlink($testScript);
});

test('it handles process startup failures', function () {
    $executor = new RustBinaryExecutor;

    // Try to execute a non-existent binary
    // On Windows, this might actually execute through cmd.exe and return an exit code
    // rather than throwing an exception, so we just verify it fails
    $result = $executor->execute(['nonexistent-binary-that-does-not-exist-12345']);

    expect($result['success'])->toBeFalse();
    // The exit code might be -1 (exception) or a positive number (command not found)
    expect($result['exit_code'])->not->toBe(0);
    
    // If an error key exists, it should contain the failure message
    if (isset($result['error'])) {
        expect($result['error'])->toContain('Failed to start process');
    }
});

test('it captures execution duration', function () {
    $executor = new RustBinaryExecutor;

    $testScript = createTestScript([
        'sleep' => 0.1,
        'exit_code' => 0,
    ]);

    $result = $executor->execute(['php', $testScript]);

    expect($result['duration'])->toBeNumeric();
    expect($result['duration'])->toBeGreaterThan(0.09);
    expect($result['duration'])->toBeLessThan(1.0);

    @unlink($testScript);
});

test('it handles multiple JSON log lines', function () {
    $executor = new RustBinaryExecutor;

    $log1 = json_encode(['level' => 'info', 'message' => 'First log']);
    $log2 = json_encode(['level' => 'warning', 'message' => 'Second log']);
    $log3 = json_encode(['level' => 'error', 'message' => 'Third log']);

    $testScript = createTestScript([
        'stderr' => implode("\n", [$log1, $log2, $log3]),
        'exit_code' => 1,
    ]);

    $result = $executor->execute(['php', $testScript]);

    expect($result['logs'])->toHaveCount(3);
    expect($result['logs'][0]['level'])->toBe('info');
    expect($result['logs'][1]['level'])->toBe('warning');
    expect($result['logs'][2]['level'])->toBe('error');

    @unlink($testScript);
});

test('it maps Rust log levels to Laravel log levels correctly', function () {
    $executor = new RustBinaryExecutor;

    $levels = ['debug', 'info', 'warning', 'error', 'critical'];
    $scripts = [];

    foreach ($levels as $level) {
        $testScript = createTestScript([
            'stderr' => json_encode([
                'level' => $level,
                'message' => "Test {$level} message",
            ]),
            'exit_code' => 0,
        ]);

        $scripts[] = $testScript;

        $result = $executor->execute(['php', $testScript]);

        expect($result['logs'])->not->toBeEmpty();
        expect($result['logs'][0]['level'])->toBe($level);
    }

    foreach ($scripts as $script) {
        @unlink($script);
    }
});

test('it includes binary name and command in logs', function () {
    $executor = new RustBinaryExecutor;

    $testScript = createTestScript([
        'stderr' => json_encode([
            'level' => 'error',
            'message' => 'Test message',
        ]),
        'exit_code' => 1,
    ]);

    $result = $executor->execute(['php', $testScript]);

    expect($result['logs'])->not->toBeEmpty();
    $logEntry = $result['logs'][0];

    expect($logEntry['binary'])->toBe('php');
    expect($logEntry['command'])->toContain('php');

    @unlink($testScript);
});

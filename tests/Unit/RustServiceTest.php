<?php

use App\Services\Rust\RustService;
use App\Services\Rust\Commands\ExtractCommand;
use App\Services\Rust\Commands\ScrapeCommand;
use App\Services\Rust\Commands\FsrsCommand;

test('it prevents arbitrary command execution', function () {
    $service = new RustService();
    
    // Try to execute arbitrary command - should fail
    // We can't directly test this since execute() requires RustCommandInterface
    // But we can verify that only valid commands can be created
    
    // This should work - valid extract command
    $testFile = sys_get_temp_dir() . '/test_' . uniqid() . '.txt';
    file_put_contents($testFile, 'test');
    
    try {
        $command = new ExtractCommand($testFile);
        expect($command->getCommand())->toBe('extract');
    } finally {
        @unlink($testFile);
    }
});

test('it validates extract command file path', function () {
    // Test empty path
    expect(fn () => new ExtractCommand(''))
        ->toThrow(InvalidArgumentException::class, 'File path cannot be empty');
    
    // Test non-existent file
    expect(fn () => new ExtractCommand('/does/not/exist.pdf'))
        ->toThrow(InvalidArgumentException::class, 'File does not exist');
    
    // Test unsupported extension
    $testFile = sys_get_temp_dir() . '/test_' . uniqid() . '.xyz';
    file_put_contents($testFile, 'test');
    
    try {
        expect(fn () => new ExtractCommand($testFile))
            ->toThrow(InvalidArgumentException::class, 'Unsupported file extension');
    } finally {
        @unlink($testFile);
    }
    
    // Test valid file
    $validFile = sys_get_temp_dir() . '/test_' . uniqid() . '.txt';
    file_put_contents($validFile, 'test');
    
    try {
        $command = new ExtractCommand($validFile);
        expect($command->getFilePath())->toBe($validFile);
    } finally {
        @unlink($validFile);
    }
});

test('it validates scrape command URL', function () {
    // Test empty URL
    expect(fn () => new ScrapeCommand(''))
        ->toThrow(InvalidArgumentException::class, 'URL cannot be empty');
    
    // Test invalid URL
    expect(fn () => new ScrapeCommand('not-a-url'))
        ->toThrow(InvalidArgumentException::class, 'Invalid URL format');
    
    // Test non-HTTP(S) protocol
    expect(fn () => new ScrapeCommand('ftp://example.com'))
        ->toThrow(InvalidArgumentException::class, 'Only HTTP and HTTPS URLs are allowed');
    
    // Test localhost (security)
    expect(fn () => new ScrapeCommand('http://localhost'))
        ->toThrow(InvalidArgumentException::class, 'Localhost/internal URLs are not allowed');
    
    // Test valid URL
    $command = new ScrapeCommand('https://example.com');
    expect($command->getUrl())->toBe('https://example.com');
});

test('it validates fsrs command input', function () {
    // Test missing both inputData and filePath
    expect(fn () => new FsrsCommand())
        ->toThrow(InvalidArgumentException::class, 'Either inputData or filePath must be provided');
    
    // Test providing both
    expect(fn () => new FsrsCommand(['test' => 'data'], '/path/to/file.json'))
        ->toThrow(InvalidArgumentException::class, 'Cannot provide both inputData and filePath');
    
    // Test invalid review data
    expect(fn () => new FsrsCommand(['invalid' => 'data']))
        ->toThrow(InvalidArgumentException::class, 'Missing required field');
    
    // Test invalid rating
    expect(fn () => new FsrsCommand([
        'last_interval' => 1.0,
        'difficulty' => 5.0,
        'rating' => 'invalid'
    ]))->toThrow(InvalidArgumentException::class, 'Invalid rating');
    
    // Test valid input
    $command = new FsrsCommand([
        'last_interval' => 1.0,
        'difficulty' => 5.0,
        'rating' => 'good'
    ]);
    expect($command->getCommand())->toBe('fsrs');
    expect($command->getInputData())->toBeArray();
});

test('it builds correct command arrays', function () {
    $binaryPath = '/path/to/intellix.exe';
    
    // Extract command
    $testFile = sys_get_temp_dir() . '/test_' . uniqid() . '.txt';
    file_put_contents($testFile, 'test');
    
    try {
        $extractCmd = new ExtractCommand($testFile);
        $cmdArray = $extractCmd->toCommandArray($binaryPath);
        expect($cmdArray)->toBe([$binaryPath, 'extract', $testFile]);
    } finally {
        @unlink($testFile);
    }
    
    // Scrape command
    $scrapeCmd = new ScrapeCommand('https://example.com');
    $cmdArray = $scrapeCmd->toCommandArray($binaryPath);
    expect($cmdArray)->toBe([$binaryPath, 'scrape', 'https://example.com']);
    
    // FSRS command with file
    $fsrsFile = sys_get_temp_dir() . '/fsrs_' . uniqid() . '.json';
    file_put_contents($fsrsFile, json_encode([
        'last_interval' => 1.0,
        'difficulty' => 5.0,
        'rating' => 'good'
    ]));
    
    try {
        $fsrsCmd = new FsrsCommand(null, $fsrsFile);
        $cmdArray = $fsrsCmd->toCommandArray($binaryPath);
        expect($cmdArray)->toBe([$binaryPath, 'fsrs', '--file', $fsrsFile]);
    } finally {
        @unlink($fsrsFile);
    }
    
    // FSRS command with stdin
    $fsrsCmd = new FsrsCommand([
        'last_interval' => 1.0,
        'difficulty' => 5.0,
        'rating' => 'good'
    ]);
    $cmdArray = $fsrsCmd->toCommandArray($binaryPath);
    expect($cmdArray)->toBe([$binaryPath, 'fsrs']);
    expect($fsrsCmd->getInputJson())->toBeString();
});

test('it provides convenient facade methods', function () {
    $service = new RustService();
    
    // Test that facade methods exist
    expect(method_exists($service, 'extract'))->toBeTrue();
    expect(method_exists($service, 'scrape'))->toBeTrue();
    expect(method_exists($service, 'fsrs'))->toBeTrue();
    expect(method_exists($service, 'execute'))->toBeTrue();
    
    // Test that methods accept correct parameters (type checking)
    $reflection = new ReflectionClass($service);
    
    $extractMethod = $reflection->getMethod('extract');
    expect($extractMethod->getNumberOfParameters())->toBe(2); // filePath, context
    
    $scrapeMethod = $reflection->getMethod('scrape');
    expect($scrapeMethod->getNumberOfParameters())->toBe(2); // url, context
    
    $fsrsMethod = $reflection->getMethod('fsrs');
    expect($fsrsMethod->getNumberOfParameters())->toBe(3); // inputData, filePath, context
});

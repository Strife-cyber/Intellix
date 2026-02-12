# Rust Service - Secure Command Interface

## Overview

The `RustService` provides a **type-safe, secure facade** for executing Rust binary commands. It prevents arbitrary command execution by only allowing predefined, validated commands.

## Security Features

✅ **Type Safety** - Only `RustCommandInterface` implementations can be executed  
✅ **Input Validation** - All commands validate their inputs before execution  
✅ **URL Security** - Scrape command blocks localhost/internal IPs  
✅ **File Validation** - Extract command validates file existence, readability, and extension  
✅ **No Arbitrary Commands** - Cannot execute arbitrary system commands  

## Architecture

```
┌─────────────────┐
│  RustService    │  ← Facade (Public API)
│  (Facade)       │
└────────┬────────┘
         │
         │ Uses
         ▼
┌─────────────────────────┐
│  RustCommandInterface   │  ← Contract
│  (Interface)            │
└────────┬────────────────┘
         │
         │ Implemented by
         ├─────────────────┬─────────────────┬──────────────┐
         ▼                 ▼                 ▼              ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ExtractCommand│  │ScrapeCommand │  │ FsrsCommand │  │ Future...    │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────────────┘
       │                  │                 │
       │                  │                 │
       └──────────────────┴─────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │ RustBinaryExecutor    │
              │ (Low-level executor)  │
              └───────────────────────┘
```

## Usage Examples

### Extract Document

```php
use App\Services\Rust\RustService;

$rust = new RustService();

// Simple usage
$result = $rust->extract('/path/to/document.pdf', [
    'job_id' => '123',
    'user_id' => '456'
]);

if ($result['success']) {
    $output = json_decode($result['stdout'], true);
    $pages = $output['pages'];
}

// Or use command object directly
use App\Services\Rust\Commands\ExtractCommand;

$command = new ExtractCommand('/path/to/document.pdf');
$result = $rust->execute($command, ['context' => 'value']);
```

### Scrape URL

```php
$rust = new RustService();

$result = $rust->scrape('https://example.com', [
    'user_id' => '456'
]);

if ($result['success']) {
    $output = json_decode($result['stdout'], true);
    $content = $output['content'];
    $title = $output['title'];
}
```

### Process FSRS Review

```php
$rust = new RustService();

// With array input (stdin)
$result = $rust->fsrs([
    'last_interval' => 1.0,
    'difficulty' => 5.0,
    'stability' => 1.0,
    'rating' => 'good'
], null, ['review_id' => '789']);

// Or with file
$result = $rust->fsrs(null, '/path/to/reviews.json', ['batch_id' => '101']);
```

## Adding New Commands

To add a new Rust command:

1. **Add command to Rust binary** (`src/main.rs`)
2. **Create command class** implementing `RustCommandInterface`:

```php
namespace App\Services\Rust\Commands;

use App\Services\Rust\RustCommandInterface;

class NewCommand implements RustCommandInterface
{
    public function __construct(
        protected string $param1,
        protected int $param2
    ) {
        $this->validate();
    }

    public function getCommand(): string
    {
        return 'newcommand';
    }

    public function getArguments(): array
    {
        return [$this->param1, (string)$this->param2];
    }

    public function validate(): void
    {
        if (empty($this->param1)) {
            throw new \InvalidArgumentException('param1 cannot be empty');
        }
        // Add more validation...
    }

    public function toCommandArray(string $binaryPath): array
    {
        return array_merge([$binaryPath, $this->getCommand()], $this->getArguments());
    }
}
```

3. **Add facade method** to `RustService`:

```php
public function newCommand(string $param1, int $param2, array $context = []): array
{
    $command = new NewCommand($param1, $param2);
    return $this->execute($command, $context);
}
```

## Validation Examples

### ExtractCommand Validation

- ✅ File exists
- ✅ Is a file (not directory)
- ✅ File is readable
- ✅ Extension is supported (pdf, docx, odt, txt, md, html)
- ❌ Rejects: non-existent files, directories, unreadable files, unsupported formats

### ScrapeCommand Validation

- ✅ Valid URL format
- ✅ HTTP/HTTPS protocol only
- ❌ Blocks: localhost, 127.0.0.1, private IPs, FTP, file://, etc.

### FsrsCommand Validation

- ✅ Valid JSON structure
- ✅ Required fields present (last_interval, difficulty, rating)
- ✅ Valid rating values (again, hard, good, easy)
- ✅ Numeric types for intervals/difficulty
- ❌ Rejects: invalid JSON, missing fields, invalid ratings

## Security Benefits

1. **No Command Injection** - Cannot execute arbitrary commands
2. **Input Validation** - All inputs validated before execution
3. **Type Safety** - PHP type system prevents invalid usage
4. **Controlled Execution** - Only predefined commands allowed
5. **Audit Trail** - All commands logged with context

## Error Handling

All commands throw `InvalidArgumentException` for validation errors:

```php
try {
    $result = $rust->extract('/invalid/path.pdf');
} catch (\InvalidArgumentException $e) {
    // Handle validation error
    logger()->error('Extract validation failed', ['error' => $e->getMessage()]);
}
```

Execution errors are returned in the result array:

```php
$result = $rust->extract('/path/to/file.pdf');

if (!$result['success']) {
    // Check exit code
    if ($result['exit_code'] > 0) {
        // Rust binary error
        $logs = $result['logs']; // Structured error logs
    }
    
    // Check for timeout
    if (isset($result['error']) && $result['error'] === 'Process timed out') {
        // Handle timeout
    }
}
```

## Configuration

Set binary path via environment variable:

```env
RUST_BINARY_PATH=/custom/path/to/intellix.exe
```

Or programmatically:

```php
$rust = new RustService();
$rust->setBinaryPath('/custom/path/to/intellix.exe');
```

Set timeout:

```php
$rust->setTimeout(60); // 60 seconds
```

Set log channel:

```php
$rust->setLogChannel('pipeline');
```

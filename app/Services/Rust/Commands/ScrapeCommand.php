<?php

namespace App\Services\Rust\Commands;

use App\Services\Rust\RustCommandInterface;
use InvalidArgumentException;

/**
 * Command for scraping web content from URLs.
 *
 * Usage:
 * $command = new ScrapeCommand('https://example.com');
 * $result = $rust->execute($command);
 */
class ScrapeCommand implements RustCommandInterface
{
    public function __construct(
        protected string $url
    ) {
        $this->validate();
    }

    public function getCommand(): string
    {
        return 'scrape';
    }

    public function getArguments(): array
    {
        return [$this->url];
    }

    public function validate(): void
    {
        if (empty($this->url)) {
            throw new InvalidArgumentException('URL cannot be empty');
        }

        // Trim whitespace
        $this->url = trim($this->url);

        // Validate URL format
        if (! filter_var($this->url, FILTER_VALIDATE_URL)) {
            throw new InvalidArgumentException("Invalid URL format: {$this->url}");
        }

        // Only allow http/https protocols
        $scheme = parse_url($this->url, PHP_URL_SCHEME);
        if (! in_array(strtolower($scheme), ['http', 'https'], true)) {
            throw new InvalidArgumentException(
                "Only HTTP and HTTPS URLs are allowed. Got: {$scheme}"
            );
        }

        // Prevent localhost/internal IPs if needed (security)
        $host = parse_url($this->url, PHP_URL_HOST);
        if ($this->isLocalhost($host)) {
            throw new InvalidArgumentException(
                "Localhost/internal URLs are not allowed for security reasons: {$this->url}"
            );
        }
    }

    /**
     * Check if a host is localhost or internal IP.
     */
    protected function isLocalhost(?string $host): bool
    {
        if ($host === null) {
            return false;
        }

        $host = strtolower($host);

        // Check for localhost variants
        $localhostPatterns = [
            'localhost',
            '127.0.0.1',
            '::1',
            '0.0.0.0',
        ];

        if (in_array($host, $localhostPatterns, true)) {
            return true;
        }

        // Check for private IP ranges
        $ip = gethostbyname($host);
        if ($ip === $host) {
            return false; // Not resolved to IP
        }

        return filter_var(
            $ip,
            FILTER_VALIDATE_IP,
            FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
        ) === false;
    }

    public function toCommandArray(string $binaryPath): array
    {
        return array_merge([$binaryPath, $this->getCommand()], $this->getArguments());
    }

    /**
     * Get the URL being scraped.
     */
    public function getUrl(): string
    {
        return $this->url;
    }
}

<?php

namespace App\Services;

class TextChunker
{
    /**
     * Split text into overlapping chunks (character-based; works with any tokenizer downstream).
     *
     * @return list<string>
     */
    public function chunk(
        string $text,
        ?int $maxChars = null,
        ?int $overlap = null,
    ): array {
        $text = preg_replace("/\r\n|\r/", "\n", trim($text)) ?? '';
        if ($text === '') {
            return [];
        }

        $maxChars ??= (int) config('services.qdrant.chunk_size', 2000);
        $overlap ??= (int) config('services.qdrant.chunk_overlap', 200);
        $overlap = min($overlap, max(0, $maxChars - 1));

        if (strlen($text) <= $maxChars) {
            return [$text];
        }

        $chunks = [];
        $offset = 0;
        $length = strlen($text);

        while ($offset < $length) {
            $slice = substr($text, $offset, $maxChars);
            if ($slice === '') {
                break;
            }

            $chunks[] = $slice;
            if ($offset + $maxChars >= $length) {
                break;
            }

            $offset += $maxChars - $overlap;
        }

        return $chunks;
    }
}

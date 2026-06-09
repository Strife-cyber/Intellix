<?php

namespace App\Support;

final class AiProviders
{
    public const GEMINI = 'gemini';

    public const OPENROUTER = 'openrouter';

    public const OLLAMA = 'ollama';

    public const LMSTUDIO = 'lmstudio';

    public const OPENAI = 'openai';

    public const COHERE = 'cohere';

    public const JINA = 'jina';

    public const VOYAGE = 'voyage';

    public const TOGETHER = 'together';

    public const TEI = 'tei';

    /** @var list<string> */
    public const CHAT_TYPES = [
        self::GEMINI,
        self::OPENROUTER,
        self::OLLAMA,
        self::LMSTUDIO,
        self::OPENAI,
    ];

    /** @var list<string> */
    public const EMBEDDING_TYPES = [
        self::GEMINI,
        self::OPENROUTER,
        self::OLLAMA,
        self::LMSTUDIO,
        self::OPENAI,
        self::COHERE,
        self::JINA,
        self::VOYAGE,
        self::TOGETHER,
        self::TEI,
    ];
}

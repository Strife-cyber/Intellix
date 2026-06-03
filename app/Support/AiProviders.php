<?php

namespace App\Support;

final class AiProviders
{
    public const GEMINI = 'gemini';

    public const OPENROUTER = 'openrouter';

    public const OLLAMA = 'ollama';

    public const LMSTUDIO = 'lmstudio';

    public const OPENAI = 'openai';

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
    ];
}

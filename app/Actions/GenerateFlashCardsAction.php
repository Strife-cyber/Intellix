<?php

namespace App\Actions;

use App\Models\FlashCard;
use App\Models\Resource;
use App\Models\User;
use App\Services\UserAiChatService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;

class GenerateFlashCardsAction
{
    /**
     * Generate flashcards for a resource using AI.
     *
     * @param  resource  $resource  The resource to generate cards for
     * @param  int  $userId  The authenticated user creating the cards
     * @param  int  $count  Number of cards to generate (default 10)
     * @return FlashCard[] The created flash cards
     *
     * @throws RuntimeException
     */
    public function execute(Resource $resource, int $userId, int $count = 10): array
    {
        $count = max(1, min(50, $count));

        // 1. Gather source text from Qdrant (since chunks are vector-stored)
        $qdrantHost = env('QDRANT_HOST', 'http://localhost:6333');
        $qdrantKey = env('QDRANT_API_KEY');
        $collection = 'resources';

        $scrollPayload = [
            'filter' => [
                'must' => [[
                    'key' => 'resource_id',
                    'match' => ['value' => $resource->id],
                ]],
            ],
            'limit' => 20,
            'with_payload' => true,
        ];

        $qdrantRequest = Http::asJson();
        if ($qdrantKey) {
            $qdrantRequest->withHeaders(['api-key' => $qdrantKey]);
        }

        $qdrantResponse = $qdrantRequest->post("{$qdrantHost}/collections/{$collection}/points/scroll", $scrollPayload);

        if ($qdrantResponse->failed()) {
            Log::error('Qdrant scroll failed in GenerateFlashCardsAction', [
                'resource_id' => $resource->id,
                'response' => $qdrantResponse->body(),
            ]);
            throw new RuntimeException('Could not retrieve context from vector store.');
        }

        $points = $qdrantResponse->json()['result']['points'] ?? [];
        $chunks = array_map(fn ($p) => $p['payload']['full_content'] ?? '', $points);
        $chunks = array_filter($chunks);

        $sourceText = implode("\n\n", $chunks);

        // Truncate to avoid exceeding model context limits (~12000 chars)
        if (strlen($sourceText) > 12000) {
            $sourceText = Str::limit($sourceText, 12000, '...');
        }

        // 2. Build prompt
        $prompt = <<<PROMPT
You are an expert educational content creator. Based on the following text, generate exactly {$count} flashcard(s).

Rules:
- Return ONLY a valid JSON array. No extra text, no markdown code blocks, no explanation.
- Each item must have exactly two string fields: "front" (question/term) and "back" (answer/definition).
- Keep "front" concise (max 200 chars). Keep "back" clear and complete (max 500 chars).
- Cover the most important concepts in the text.

Format:
[{"front": "...", "back": "..."}, ...]

Text to analyze:
{$sourceText}
PROMPT;

        $user = User::findOrFail($userId);

        set_time_limit(300);

        if (trim($sourceText) === '') {
            throw new RuntimeException(
                'No document text found in the search index. Process the resource in the library first.',
            );
        }

        try {
            $result = app(UserAiChatService::class)->chat($user, [
                [
                    'role' => 'system',
                    'content' => 'You are a JSON-only API. Return only valid JSON. Never add explanations or markdown.',
                ],
                [
                    'role' => 'user',
                    'content' => $prompt,
                ],
            ], 0.4);
        } catch (RuntimeException $e) {
            throw new RuntimeException('AI provider request failed: '.$e->getMessage());
        }

        $rawContent = $result['content'];

        // 4. Parse and validate JSON output
        // Strip any potential markdown code fences
        $rawContent = preg_replace('/^```(?:json)?\s*/i', '', trim($rawContent));
        $rawContent = preg_replace('/\s*```$/', '', $rawContent);

        $cards = json_decode(trim($rawContent), true);

        if (! is_array($cards)) {
            Log::warning('GenerateFlashCardsAction: AI did not return valid JSON', [
                'resource_id' => $resource->id,
                'raw' => $rawContent,
            ]);
            throw new RuntimeException('AI did not return a valid JSON array. Raw response: '.Str::limit($rawContent, 300));
        }

        // Filter and sanitize
        $validCards = [];
        foreach ($cards as $card) {
            if (! is_array($card) || empty($card['front']) || empty($card['back'])) {
                continue;
            }
            $validCards[] = [
                'front' => substr(strip_tags($card['front']), 0, 2000),
                'back' => substr(strip_tags($card['back']), 0, 2000),
            ];
        }

        if (empty($validCards)) {
            throw new RuntimeException('AI returned no valid flashcards.');
        }

        // 5. Bulk insert
        $now = now();
        $rows = array_map(fn (array $c) => [
            'user_id' => $userId,
            'resource_id' => $resource->id,
            'front' => $c['front'],
            'back' => $c['back'],
            'interval_days' => 0,
            'stability' => null,
            'difficulty' => null,
            'next_review' => $now,
            'last_reviewed_at' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ], $validCards);

        FlashCard::insert($rows);

        Log::info('GenerateFlashCardsAction: cards created', [
            'resource_id' => $resource->id,
            'count' => count($rows),
        ]);

        // Return the freshly created cards
        return FlashCard::where('resource_id', $resource->id)
            ->where('user_id', $userId)
            ->orderByDesc('created_at')
            ->limit(count($rows))
            ->get()
            ->all();
    }
}

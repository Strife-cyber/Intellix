<?php

namespace App\Http\Controllers;

use App\Services\Rust\RustService;
use App\Services\AiModelManager;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class AiController extends Controller
{
    public function __construct(
        protected RustService $rustService
    ) {}

    /**
     * Get AI service status and available models.
     */
    public function status(): \Illuminate\Http\JsonResponse
    {
        return response()->json(AiModelManager::getStatus());
    }

    public function chat(Request $request)
    {
        $request->validate([
            'message' => 'required|string',
            'resource_id' => 'required|string',
            'session_id' => 'nullable|string', // Add session_id for conversation memory
            'conversation_history' => 'nullable|array', // Add conversation history
        ]);

        $message = $request->input('message');
        $resourceId = $request->input('resource_id');
        $sessionId = $request->input('session_id');
        $conversationHistory = $request->input('conversation_history', []);

        // 1. Generate Embedding using Rust Service
        // This uses the same service pattern as other controllers
        $result = $this->rustService->embed($message);

        if (! $result['success']) {
            return response()->json([
                'error' => 'Failed to generate embedding',
                'details' => $result['error'] ?? $result['stderr'],
            ], 500);
        }

        $vectorStr = trim($result['stdout']);
        $vector = json_decode($vectorStr, true);

        if (! is_array($vector)) {
            return response()->json([
                'error' => 'Invalid embedding format from CLI',
                'output' => $vectorStr,
            ], 500);
        }

        // 2. Search Qdrant
        $qdrantHost = env('QDRANT_HOST', 'http://localhost:6333');
        $qdrantKey = env('QDRANT_API_KEY');
        $collection = 'resources';

        $searchPayload = [
            'vector' => $vector,
            'limit' => 5,
            'with_payload' => true,
            'filter' => [
                'must' => [
                    [
                        'key' => 'resource_id',
                        'match' => [
                            'value' => $resourceId,
                        ],
                    ],
                ],
            ],
        ];

        $httpRequest = Http::asJson();
        if ($qdrantKey) {
            $httpRequest->withHeaders(['api-key' => $qdrantKey]);
        }

        $qdrantResponse = $httpRequest->post("{$qdrantHost}/collections/{$collection}/points/search", $searchPayload);

        if ($qdrantResponse->failed()) {
            return response()->json(['error' => 'Failed to search knowledge base', 'details' => $qdrantResponse->body()], 500);
        }

        $points = $qdrantResponse->json()['result'] ?? [];
        $context = '';
        foreach ($points as $point) {
            $payload = $point['payload'] ?? [];
            $text = $payload['full_content'] ?? '';
            if (! is_string($text) || trim($text) === '') {
                continue;
            }

            $chunkIndex = $payload['chunk_index'] ?? null;
            $page = $payload['page'] ?? null;
            $sourceUrl = $payload['source_url'] ?? null;
            $format = $payload['format'] ?? null;

            $metaParts = [];
            if ($chunkIndex !== null) {
                $metaParts[] = 'chunk='.$chunkIndex;
            }
            if ($page !== null) {
                $metaParts[] = 'page='.$page;
            }
            if ($format) {
                $metaParts[] = 'format='.$format;
            }
            if ($sourceUrl) {
                $metaParts[] = 'source_url='.$sourceUrl;
            }

            $meta = empty($metaParts) ? '' : ('['.implode(', ', $metaParts).']');
            $context .= $meta."\n".$text."\n\n";
        }

        // Increase execution time for deep reasoning or large local models
        set_time_limit(300);

        // 3. Auto-detect best AI endpoint and model
        $aiEndpoint = AiModelManager::getBestEndpoint();
        
        if (!$aiEndpoint) {
            return response()->json([
                'error' => 'No AI service available',
                'details' => 'Please ensure LM Studio is running with a loaded model, or check your AI_ENDPOINT configuration',
                'troubleshooting' => [
                    '1. Start LM Studio and load a model (DeepSeek, Llama, etc.)',
                    '2. Ensure LM Studio is listening on http://localhost:1234 or http://localhost:8080',
                    '3. Or set AI_ENDPOINT in your .env file to your preferred endpoint'
                ]
            ], 503);
        }

        $model = AiModelManager::getBestModel($aiEndpoint) ?? 'local-model';

        // Build conversation messages with memory
        $messages = [];

        // Add system instruction
        $systemInstruction = <<<'SYS'
You are a helpful AI assistant with memory of our conversation.

Rules:
- Use ONLY the provided context to answer.
- If the answer is not explicitly supported by the context, respond with: "I cannot find this information in the provided documents."
- Do not guess, do not use outside knowledge, do not invent citations.
- When you make a factual claim, include a citation using the nearest available context metadata (e.g. [chunk=..., page=...]).
- Answer in the same language as the user's question.
- Remember our previous conversation context and build upon it.
- Reference things we discussed earlier when relevant.
SYS;

        $messages[] = [
            'role' => 'system',
            'content' => $systemInstruction,
        ];

        // Add conversation history if provided
        if (!empty($conversationHistory)) {
            // Add previous messages to give AI memory of conversation
            foreach ($conversationHistory as $msg) {
                $messages[] = [
                    'role' => $msg['role'],
                    'content' => $msg['content'],
                ];
            }
        }

        // Add current message with context
        $messages[] = [
            'role' => 'user',
            'content' => "Document Context:\n".$context."\n\nCurrent Question:\n".$message,
        ];

        $response = Http::timeout(300)->post("{$aiEndpoint}/v1/chat/completions", [
            'model' => $model,
            'messages' => $messages,
            'temperature' => 0.7,
        ]);

        if ($response->failed()) {
            return response()->json([
                'error' => 'LM Studio API failed',
                'details' => $response->body(),
                'endpoint' => "{$aiEndpoint}/v1/chat/completions",
            ], 500);
        }

        $data = $response->json();
        $choice = $data['choices'][0]['message'] ?? [];
        $answer = $choice['content'] ?? 'No response generated.';

        // Some models (like DeepSeek) provide reasoning in a separate field or within <think> tags
        $reasoning = $choice['reasoning_content'] ?? null;

        // If not in reasoning_content, check for <think> tags in content
        if (! $reasoning && preg_match('/<think>(.*?)<\/think>/s', $answer, $matches)) {
            $reasoning = trim($matches[1]);
            $answer = trim(preg_replace('/<think>.*?<\/think>/s', '', $answer));
        }

        return response()->json([
            'answer' => $answer,
            'reasoning' => $reasoning,
        ]);
    }
}

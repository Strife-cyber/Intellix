<?php

namespace App\Http\Controllers;

use App\Services\Rust\RustService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class AiController extends Controller
{
    public function __construct(
        protected RustService $rustService
    ) {}

    public function chat(Request $request)
    {
        $request->validate([
            'message' => 'required|string',
            'resource_id' => 'required|string',
        ]);

        $message = $request->input('message');
        $resourceId = $request->input('resource_id');

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

        // 3. Call LM Studio (OpenAI compatible API)
        $aiEndpoint = env('AI_ENDPOINT', 'http://100.93.40.102:9090');

        $systemInstruction = <<<'SYS'
You are a helpful AI assistant.

Rules:
- Use ONLY the provided context to answer.
- If the answer is not explicitly supported by the context, respond with: "I cannot find this information in the provided documents."
- Do not guess, do not use outside knowledge, do not invent citations.
- When you make a factual claim, include a citation using the nearest available context metadata (e.g. [chunk=..., page=...]).
- Answer in the same language as the user's question.
SYS;

        $response = Http::timeout(300)->post("{$aiEndpoint}/v1/chat/completions", [
            'model' => 'local-model',
            'messages' => [
                [
                    'role' => 'system',
                    'content' => $systemInstruction,
                ],
                [
                    'role' => 'user',
                    'content' => "Context:\n".$context."\n\nQuestion:\n".$message,
                ],
            ],
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

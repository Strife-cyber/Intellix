<?php

namespace App\Http\Controllers;

use App\Services\AiModelManager;
use App\Services\UserAiChatService;
use Illuminate\Http\Request;
use RuntimeException;

class AiController extends Controller
{
    public function __construct() {}

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
            'session_id' => 'nullable', // Dexie session ids are numeric
            'conversation_history' => 'nullable|array',
        ]);

        $message = $request->input('message');
        $resourceId = $request->input('resource_id');
        $conversationHistory = $this->normalizeConversationHistory(
            $request->input('conversation_history', []),
        );

        // Search logic skipped as microservice migration is in progress
        $context = 'Search context temporarily disabled during microservice migration.';

        set_time_limit(300);

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

        foreach ($conversationHistory as $msg) {
            $messages[] = $msg;
        }

        // Add current message with context
        $messages[] = [
            'role' => 'user',
            'content' => "Document Context:\n".$context."\n\nCurrent Question:\n".$message,
        ];

        try {
            $result = app(UserAiChatService::class)->chat(
                $request->user(),
                $messages,
            );
        } catch (RuntimeException $e) {
            return response()->json([
                'error' => 'AI request failed',
                'details' => $e->getMessage(),
            ], 503);
        }

        return response()->json([
            'answer' => $result['content'],
            'reasoning' => $result['reasoning'],
        ]);
    }

    /**
     * @return list<array{role: string, content: string}>
     */
    private function normalizeConversationHistory(mixed $history): array
    {
        if (! is_array($history)) {
            return [];
        }

        $normalized = [];

        foreach ($history as $msg) {
            if (! is_array($msg)) {
                continue;
            }

            $role = $msg['role'] ?? 'user';
            if (! in_array($role, ['user', 'assistant', 'system'], true)) {
                continue;
            }

            $content = $msg['content'] ?? '';
            if (! is_string($content) || trim($content) === '') {
                continue;
            }

            $normalized[] = [
                'role' => $role,
                'content' => $content,
            ];
        }

        return $normalized;
    }
}

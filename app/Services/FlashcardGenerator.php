<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use App\Models\Resource;
use App\Models\Flashcard;

class FlashcardGenerator
{
    protected $apiKey;
    protected $apiUrl = 'https://api.openrouter.ai/api/v1/chat/completions';

    public function __construct()
    {
        $this->apiKey = config('services.openrouter.api_key');
    }

    public function generateFromResource(Resource $resource)
    {
        $textContent = $this->extractTextFromResource($resource);
        $flashcardsData = $this->generateFlashcardsWithAI($textContent);
        $this->saveFlashcards($resource, $flashcardsData);

        return $flashcardsData;
    }

    protected function extractTextFromResource(Resource $resource)
    {
        if ($resource->file_type === 'pdf') {
            return 'Extracted text from PDF: ' . $resource->file_path;
        } elseif (Str::endsWith($resource->file_path, ['.docx', '.doc'])) {
            return 'Extracted text from Word document: ' . $resource->file_path;
        } else {
            return 'Extracted text from file: ' . $resource->file_path;
        }
    }

    protected function generateFlashcardsWithAI(string $textContent)
    {
        $prompt = "You are an expert flashcard creator. Analyze the following text and generate 10-20 high-quality flashcards. "
            . "Each flashcard should have a clear question on the front and a concise answer on the back. "
            . "Focus on key concepts, definitions, and important relationships.\n\n"
            . "Text to analyze:\n{$textContent}\n\n"
            . "Format your response as a JSON array of objects with 'front' and 'back' properties.";

        $response = Http::withHeaders([
            'Authorization' => "Bearer {$this->apiKey}",
            'Content-Type' => 'application/json',
        ])->post($this->apiUrl, [
            'model' => 'openai/gpt-4',
            'messages' => [
                ['role' => 'user', 'content' => $prompt],
            ],
            'max_tokens' => 1000,
        ]);

        if ($response->successful()) {
            $content = $response->json('choices.0.message.content');
            return json_decode($content, true);
        }

        throw new \Exception('Failed to generate flashcards: ' . $response->body());
    }

    protected function saveFlashcards(Resource $resource, array $flashcardsData)
    {
        foreach ($flashcardsData as $flashcardData) {
            Flashcard::create([
                'resource_id' => $resource->id,
                'front' => $flashcardData['front'],
                'back' => $flashcardData['back'],
                'difficulty' => 0.5,
                'interval_days' => 1,
                'next_review_date' => now()->addDay(),
            ]);
        }
    }

    public function generateExam(Resource $resource, int $numQuestions = 10)
    {
        $flashcards = $resource->flashcards()->inRandomOrder()->limit($numQuestions)->get();

        $examQuestions = [];

        foreach ($flashcards as $flashcard) {
            $questionType = rand(0, 2);

            switch ($questionType) {
                case 0:
                    $examQuestions[] = [
                        'type' => 'definition',
                        'question' => 'What is the definition of \'' . $flashcard->front . '\'?',
                        'answer' => $flashcard->back,
                    ];
                    break;

                case 1:
                    $examQuestions[] = [
                        'type' => 'fill-in-the-blank',
                        'question' => str_replace($flashcard->back, '_____', $flashcard->front),
                        'answer' => $flashcard->back,
                    ];
                    break;

                case 2:
                    $falseStatement = $this->generateFalseStatement($flashcard->back);
                    $examQuestions[] = [
                        'type' => 'true-false',
                        'question' => 'True or False: ' . $falseStatement,
                        'answer' => 'False',
                    ];
                    break;
            }
        }

        return $examQuestions;
    }

    protected function generateFalseStatement(string $correctStatement)
    {
        $words = explode(' ', $correctStatement);
        $randomIndex = rand(0, count($words) - 1);
        $words[$randomIndex] = 'incorrect';
        return implode(' ', $words);
    }
}

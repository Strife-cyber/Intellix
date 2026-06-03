<?php

namespace App\Jobs;

use App\Models\Exam;
use App\Models\Prosit;
use App\Models\User;
use App\Services\UserAiChatService;
use Exception;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GenerateExamJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 900; // 15 minutes

    public array $backoff = [60, 300, 900]; // 1min, 5min, 15min

    public function __construct(
        private string $prositId,
        private int $userId,
        private int $totalQuestions = 10,
        private array $distribution = ['mcq' => 0.4, 'true_false' => 0.2, 'structured' => 0.4]
    ) {}

    public function handle(): void
    {
        try {
            $prosit = Prosit::with(['competences'])->findOrFail($this->prositId);

            if ($prosit->competences->isEmpty()) {
                throw new Exception('Prosit has no competences defined');
            }

            $user = User::findOrFail($this->userId);

            // 1. Gather context from Qdrant
            $qdrantHost = env('QDRANT_HOST', 'http://localhost:6333');
            $qdrantKey = env('QDRANT_API_KEY');
            $collection = 'resources';

            // Get relevant documents for this prosit
            $searchPayload = [
                'vector' => $this->generateEmbedding($prosit->generalisation ?? ''),
                'limit' => 10,
                'with_payload' => true,
                'filter' => [
                    'must' => [
                        [
                            'key' => 'resource_id',
                            'match' => [
                                'any' => $prosit->resources()->pluck('id')->toArray(),
                            ],
                        ],
                    ],
                ],
            ];

            $qdrantRequest = Http::asJson();
            if ($qdrantKey) {
                $qdrantRequest->withHeaders(['api-key' => $qdrantKey]);
            }

            $qdrantResponse = $qdrantRequest->post("{$qdrantHost}/collections/{$collection}/points/search", $searchPayload);

            if ($qdrantResponse->failed()) {
                throw new Exception('Failed to search knowledge base');
            }

            $points = $qdrantResponse->json()['result'] ?? [];
            $context = '';
            foreach ($points as $point) {
                $payload = $point['payload'] ?? [];
                $text = $payload['full_content'] ?? '';
                if (is_string($text) && trim($text) !== '') {
                    $context .= $text."\n\n";
                }
            }

            // 3. Build competences context
            $competencesContext = '';
            foreach ($prosit->competences as $comp) {
                $competencesContext .= "- {$comp->title} ({$comp->taxonomy_level}, poids: {$comp->weight}): {$comp->description}\n";
            }

            // 3.5. Get existing questions to avoid repetition
            $existingQuestionsContext = '';
            $existingExams = \App\Models\Exam::where('prosit_id', $this->prositId)->with('questions')->get();
            if ($existingExams->isNotEmpty()) {
                $existingQuestionsContext .= "\n\nEXISTING QUESTIONS TO AVOID:\n";
                foreach ($existingExams as $exam) {
                    foreach ($exam->questions as $question) {
                        $existingQuestionsContext .= '- '.substr($question->question, 0, 100)."...\n";
                    }
                }
                $existingQuestionsContext .= "\nDO NOT REPEAT THESE QUESTIONS!\n";
            }

            // 4. Generate exam questions
            // Calculate percentages outside the heredoc
            $mcqPercent = $this->distribution['mcq'] * 100;
            $trueFalsePercent = $this->distribution['true_false'] * 100;
            $structuredPercent = $this->distribution['structured'] * 100;

            $systemInstruction = <<<EOT
You are an expert educational assessment designer. Generate high-quality exam questions based on the provided context and competences.

Requirements:
- Generate exactly {$this->totalQuestions} questions total
- Distribution: {$mcqPercent}% MCQ, {$trueFalsePercent}% True/False, {$structuredPercent}% Structured
- Each question must be clearly linked to the provided competences
- Use ONLY the provided context for question content
- Questions should test understanding, not just memorization
- Include varying difficulty levels appropriate for the competences

Question Types:
1. MCQ: Multiple choice with 4 options (A, B, C, D), mark correct option
2. TRUE_FALSE: Boolean question, mark correct answer
3. STRUCTURED: Open-ended question with expected answer and grading rubric

Output format:
Return ONLY a valid JSON array with this exact structure:
[
  {
    "type": "mcq|true_false|structured",
    "question": "Clear question text",
    "options": ["A", "B", "C", "D"], // Only for MCQ
    "correct_option": "A|B|C|D", // Only for MCQ
    "correct_boolean": true|false, // Only for True/False
    "expected_answer": "Detailed answer", // Only for Structured
    "grading_rubric": ["Criteria1", "Criteria2", "Criteria3"], // Only for Structured
    "competence_focus": "Related competence title",
    "difficulty": "easy|medium|hard",
    "points": 1-5
  }
]

Important:
- Return ONLY the JSON array, no markdown or explanations
- Ensure all questions are in French
- Make questions challenging but fair
- Each question must be answerable from the provided context
EOT;

            $userMessage = "Context:\n".$context."\n\nCompetences:\n".$competencesContext.$existingQuestionsContext."\n\nGenerate NEW exam questions.";

            $result = app(UserAiChatService::class)->chat($user, [
                [
                    'role' => 'system',
                    'content' => 'You are a JSON-only API. Return only valid JSON. Never add explanations or markdown.',
                ],
                [
                    'role' => 'user',
                    'content' => $systemInstruction."\n\n".$userMessage,
                ],
            ], 0.8);

            $content = $result['content'] ?? null;

            if (! $content) {
                throw new Exception('No content received from AI');
            }

            // Parse and validate JSON response
            $questions = json_decode($content, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new Exception('Invalid JSON response from AI: '.json_last_error_msg());
            }

            if (! is_array($questions) || count($questions) !== $this->totalQuestions) {
                throw new Exception("Expected {$this->totalQuestions} questions, got ".count($questions));
            }

            // Create exam
            $exam = Exam::create([
                'prosit_id' => $this->prositId,
                'title' => 'Examen - '.($prosit->generalisation ?? 'Prosit'),
                'total_questions' => $this->totalQuestions,
                'distribution' => $this->distribution,
                'status' => 'draft',
                'created_by' => $this->userId,
            ]);

            // Create questions
            foreach ($questions as $index => $questionData) {
                $exam->questions()->create([
                    'type' => $questionData['type'],
                    'question' => $questionData['question'],
                    'options' => $questionData['options'] ?? null,
                    'correct_option' => $questionData['correct_option'] ?? null,
                    'correct_boolean' => $questionData['correct_boolean'] ?? null,
                    'expected_answer' => $questionData['expected_answer'] ?? null,
                    'grading_rubric' => $questionData['grading_rubric'] ?? null,
                    'competence_focus' => $questionData['competence_focus'] ?? null,
                    'difficulty' => $questionData['difficulty'] ?? 'medium',
                    'points' => $questionData['points'] ?? 1,
                    'order' => $index + 1,
                ]);
            }

            Log::info('Exam generation completed successfully', [
                'exam_id' => $exam->id,
                'prosit_id' => $this->prositId,
                'user_id' => $this->userId,
                'total_questions' => $this->totalQuestions,
                'model' => $model,
                'endpoint' => $aiEndpoint,
            ]);

        } catch (Exception $e) {
            Log::error('Exam generation failed', [
                'prosit_id' => $this->prositId,
                'user_id' => $this->userId,
                'error' => $e->getMessage(),
                'attempt' => $this->attempts(),
            ]);

            $this->fail($e);
        }
    }

    private function generateEmbedding(string $text): array
    {
        // This would typically use the Rust service
        // For now, return a dummy embedding to avoid complex dependencies
        return array_fill(0, 384, 0.1); // 384-dimensional embedding
    }

    public function failed(Exception $exception): void
    {
        Log::error('Exam generation job failed permanently', [
            'prosit_id' => $this->prositId,
            'user_id' => $this->userId,
            'error' => $exception->getMessage(),
            'attempts' => $this->attempts(),
        ]);
    }
}

<?php

namespace App\Services;

use App\Models\Exam;
use App\Models\Prosit;
use App\Models\Question;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class ExamGenerationService
{
    /**
     * Generate an AI exam for a given Prosit and the specified distribution.
     */
    public function generateExam(Prosit $prosit, array $distribution = ['mcq' => 0.4, 'true_false' => 0.2, 'structured' => 0.4], int $totalQuestions = 10): ?Exam
    {
        // 1. Gather Context
        $prosit->load(['competences', 'resources.chunks']);

        $competences = $prosit->competences;
        if ($competences->isEmpty()) {
            throw new Exception('Cannot generate an exam without competences.');
        }

        // Prepare context text
        $context = "";
        $context .= "PROBLEMATIQUE: {$prosit->problematique}\n\n";
        if ($prosit->contexte) {
            $context .= "CONTEXT: {$prosit->contexte}\n\n";
        }
        if ($prosit->texte) {
            $context .= "TEXTE: {$prosit->texte}\n\n";
        }
        if ($prosit->mots_cles) {
            $context .= "MOTS CLES: {$prosit->mots_cles}\n\n";
        }
        if ($prosit->besoin) {
            $context .= "BESOIN: {$prosit->besoin}\n\n";
        }
        if ($prosit->generalisation) {
            $context .= "GENERALISATION: {$prosit->generalisation}\n\n";
        }
        if ($prosit->piste_de_solution) {
            $context .= "PISTE DE SOLUTION: {$prosit->piste_de_solution}\n\n";
        }
        if ($prosit->plan_d_action) {
            $context .= "PLAN D'ACTION: {$prosit->plan_d_action}\n\n";
        }

        $context .= "RESOURCES CONTENT:\n";
        foreach ($prosit->resources as $resource) {
            foreach ($resource->chunks as $chunk) {
                $context .= $chunk->content."\n";
            }
        }

        $competencesContext = "COMPETENCES TO ASSESS:\n";
        foreach ($competences as $competence) {
            $competencesContext .= "- [ID: {$competence->id}] {$competence->title} ({$competence->taxonomy_level}) - Weight: {$competence->weight}\n";
            if ($competence->description) {
                $competencesContext .= "  Description: {$competence->description}\n";
            }
        }

        $allQuestionsData = [];
        $batchSize = 10;
        $numBatches = ceil($totalQuestions / $batchSize);

        for ($batchIndex = 0; $batchIndex < $numBatches; $batchIndex++) {
            $currentBatchCount = min($batchSize, $totalQuestions - count($allQuestionsData));
            if ($currentBatchCount <= 0) break;

            $batchQuestions = $this->generateBatch(
                $context, 
                $competencesContext, 
                $distribution, 
                $currentBatchCount, 
                $allQuestionsData
            );
            $allQuestionsData = array_merge($allQuestionsData, $batchQuestions);
        }

        if (empty($allQuestionsData)) {
            throw new Exception('AI failed to generate any questions.');
        }

        return DB::transaction(function () use ($prosit, $allQuestionsData) {
            $exam = Exam::create([
                'prosit_id' => $prosit->id,
                'generated_by_ai' => true,
                'difficulty_level' => 'Adaptive',
                'duration' => 60,
                'total_marks' => collect($allQuestionsData)->sum('marks'),
            ]);

            foreach ($allQuestionsData as $qData) {
                // Skip invalid data
                if (!isset($qData['question_text']) || !isset($qData['type'])) continue;

                // Ensure competence ID is valid, otherwise fallback
                $compId = $qData['competence_id'] ?? null;
                if (! $prosit->competences->contains('id', $compId)) {
                    $compId = $prosit->competences->first()->id;
                }

                Question::create([
                    'exam_id' => $exam->id,
                    'type' => $qData['type'],
                    'question_text' => $qData['question_text'],
                    'competence_id' => $compId,
                    'difficulty' => $qData['difficulty'] ?? 'Medium',
                    'marks' => $qData['marks'] ?? 1,
                    'explanation' => $qData['explanation'] ?? '',
                    'options' => $qData['options'] ?? null,
                    'correct_option' => $qData['correct_option'] ?? null,
                    'correct_boolean' => $qData['correct_boolean'] ?? null,
                    'expected_answer' => $qData['expected_answer'] ?? null,
                    'grading_rubric' => $qData['grading_rubric'] ?? null,
                ]);
            }

            return $exam;
        });
    }

    protected function generateBatch(string $context, string $competencesContext, array $distribution, int $count, array $previousQuestions): array
    {
        $avoidList = "";
        if (!empty($previousQuestions)) {
            $avoidList = "\n\nAVOID generating the following questions (already generated):\n";
            foreach ($previousQuestions as $prev) {
                $avoidList .= "- " . ($prev['question_text'] ?? 'Unknown') . "\n";
            }
        }

        $systemInstruction = <<<EOT
You are an expert academic evaluator. Your task is to generate a set of exam questions based STRICTLY on the provided PROSIT context and RESOURCES.
Do NOT include outside knowledge.

Requirements:
1. Questions must be moderately to highly complex, testing conceptual understanding, application, and reasoning.
2. Generate EXACTLY {$count} questions for this batch.
3. Distribution goals (overall): MCQ: {$distribution['mcq']}, True/False: {$distribution['true_false']}, Structured: {$distribution['structured']}.
4. Cover the provided competences proportionally. Every question must be mapped to a competence ID.
5. Output ONLY a valid JSON array of question objects.

JSON Schema per question object:
- type: string (one of: "mcq", "true_false", "structured")
- question_text: string
- competence_id: string (must perfectly match one of the provided competence IDs)
- difficulty: string ("Easy", "Medium", "Hard")
- marks: integer
- explanation: string (mandatory)

For "mcq": { "options": ["A", "B", "C", "D"], "correct_option": "exact match" }
For "true_false": { "correct_boolean": true/false }
For "structured": { "expected_answer": "...", "grading_rubric": ["CR1", "CR2"] }
EOT;

        $userMessage = "Context:\n".$context."\n\n".$competencesContext.$avoidList;

        set_time_limit(300);
        $aiEndpoint = env('AI_ENDPOINT', 'http://100.93.40.102:9090');

        $response = Http::timeout(300)->post("{$aiEndpoint}/v1/chat/completions", [
            'model' => 'local-model',
            'messages' => [
                ['role' => 'system', 'content' => $systemInstruction],
                ['role' => 'user', 'content' => $userMessage],
            ],
            'temperature' => 0.8,
        ]);

        if ($response->failed()) {
            throw new Exception('AI Batch generation failed: '.$response->body());
        }

        $answer = $response->json()['choices'][0]['message']['content'] ?? '';
        if (preg_match('/```json\s*(.*?)\s*```/s', $answer, $matches)) {
            $answer = $matches[1];
        }

        $data = json_decode(trim($answer), true);
        return is_array($data) ? $data : [];
    }
}

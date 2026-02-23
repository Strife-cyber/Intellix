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

        $systemInstruction = <<<EOT
You are an expert academic evaluator. Your task is to generate a comprehensive exam based STRICTLY on the provided PROSIT context and RESOURCES.
Do NOT include outside knowledge.

Exam Requirements:
1. Questions must be moderately to highly complex, testing conceptual understanding, application, and reasoning. Hide answers from simple copy-pasting.
2. The exam must consist of {$totalQuestions} total questions, distributed approximately as:
   - MCQ: {$distribution['mcq']} ratio
   - True/False: {$distribution['true_false']} ratio
   - Structured: {$distribution['structured']} ratio
3. You must cover the provided competences proportionally to their weights. Every question must be mapped to at least one competence ID.
4. Output your response as a valid JSON array of question objects, nothing else. No markdown wrappers.

JSON Schema per question object:
- type: string (one of: "mcq", "true_false", "structured")
- question_text: string
- competence_id: string (must perfectly match one of the provided competence IDs)
- difficulty: string (e.g. "Medium", "Hard")
- marks: integer
- explanation: string (mandatory justification/explanation for the answer)

For "mcq" type:
- options: array of strings (4-5 options)
- correct_option: string (exact match with one of the options)

For "true_false" type:
- correct_boolean: boolean (true or false)

For "structured" type:
- expected_answer: string
- grading_rubric: array of strings (the criteria to grade the answer)
EOT;

        $userMessage = "Context:\n".$context."\n\n".$competencesContext;

        set_time_limit(300);
        $aiEndpoint = env('AI_ENDPOINT', 'http://100.93.40.102:9090');

        $response = Http::timeout(300)->post("{$aiEndpoint}/v1/chat/completions", [
            'model' => 'local-model',
            'messages' => [
                [
                    'role' => 'system',
                    'content' => $systemInstruction,
                ],
                [
                    'role' => 'user',
                    'content' => $userMessage,
                ],
            ],
            'temperature' => 0.7,
        ]);

        if ($response->failed()) {
            throw new Exception('AI Exam generation failed: '.$response->body());
        }

        $data = $response->json();
        $answer = $data['choices'][0]['message']['content'] ?? '';

        // Extract JSON if wrapped in markdown
        if (preg_match('/```json\s*(.*?)\s*```/s', $answer, $matches)) {
            $answer = $matches[1];
        }

        $questionsData = json_decode(trim($answer), true);

        if (! is_array($questionsData)) {
            throw new Exception('Failed to parse AI output into JSON array. Output: '.substr($answer, 0, 500));
        }

        return DB::transaction(function () use ($prosit, $questionsData) {
            $exam = Exam::create([
                'prosit_id' => $prosit->id,
                'generated_by_ai' => true,
                'difficulty_level' => 'Adaptive',
                'duration' => 60,
                'total_marks' => collect($questionsData)->sum('marks'),
            ]);

            foreach ($questionsData as $qData) {
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
}

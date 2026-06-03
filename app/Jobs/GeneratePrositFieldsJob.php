<?php

namespace App\Jobs;

use App\Models\Prosit;
use App\Models\User;
use App\Services\UserAiChatService;
use Exception;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class GeneratePrositFieldsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 600; // 10 minutes

    public array $backoff = [60, 300, 900]; // 1min, 5min, 15min

    public function __construct(
        private string $originalText,
        private int $userId,
        private string $prositId
    ) {}

    public function handle(): void
    {
        try {
            $prosit = Prosit::findOrFail($this->prositId);

            $user = User::findOrFail($this->userId);

            // 1. Generate prosit fields using AI
            $systemInstruction = <<<EOT
You are an expert educational architect specializing in the Problem-Based Approach (PBA). 
Your task is to analyze the provided "Original Text" and extract/generate a structured Prosit following these strict definitions:

- mots_cles: An array of strings containing technical keywords or concepts central to the problem (e.g., ["Digitalisation", "Exigence", "Accessibilité"]).
- contexte: A short, engaging story/narrative (approx. 2-3 sentences) setting the scene. It MUST present a concrete situation, actors (e.g., a company, a team, a client), and the specific problem they face.
- besoin: An array of strings describing precisely what the main character needs to learn, acquire, or achieve to solve the problem (e.g., ["Connaissance sur les diagrammes UML", "Clarification des besoins du client"]).
- problematique: A single, well-formulated question that drives the learning. It must be specific to the context and address the core issue (e.g., "Comment concevoir une plateforme numérique sécurisée tout en prenant en compte le manque de règles formalisées ?").
- generalisation: A very short phrase or title (max 5 words) that summarizes the core academic concept of the Prosit (e.g., "Ingénierie des exigences", "Spécifications textuelles et semi formelles").
- piste_de_solution: An array of strings containing 2-4 guiding questions (hints) that prompt the student's research without giving the direct answer (e.g., ["L'utilisation de diagrammes UML est-elle adaptée pour visualiser le flux ?", "Une matrice de traçabilité peut-elle aider ?"]).
- plan_d_action: An array of strings listing 5-7 actionable steps the student should follow. Always start the first step with "Définition des mots clés". Start subsequent steps with action verbs (e.g., ["Définition des mots clés", "Etude sur l'ingénierie des exigences", "Etablir une matrice de traçabilité", "Modéliser les différentes exigences"]).
- competences: An array of objects representing what the student should master. Each object MUST have:
    - title: A concise name of the competence.
    - taxonomy_level: Must be one of ["Connaissance", "Application"].
    - weight: An integer from 1 to 5 indicating importance.
    - description: A short sentence explaining the goal.

Output your response as a valid JSON object with EXACTLY the following keys:
"mots_cles", "contexte", "besoin", "problematique", "generalisation", "piste_de_solution", "plan_d_action", "competences"

Important:
- Your entire response MUST be in French.
- Only output the raw JSON object. Do not include markdown blocks or any other text.

Text to analyze:
{$this->originalText}
EOT;

            $result = app(UserAiChatService::class)->chat($user, [
                [
                    'role' => 'system',
                    'content' => 'You are a JSON-only API. Return only valid JSON. Never add explanations or markdown.',
                ],
                [
                    'role' => 'user',
                    'content' => $systemInstruction,
                ],
            ], 0.7);

            $content = $result['content'] ?? null;

            if (! $content) {
                throw new Exception('No content received from AI');
            }

            // Parse and validate JSON response
            $prositsData = json_decode($content, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new Exception('Invalid JSON response from AI: '.json_last_error_msg());
            }

            // Validate required fields
            $requiredFields = ['mots_cles', 'contexte', 'besoin', 'problematique', 'generalisation', 'piste_de_solution', 'plan_d_action', 'competences'];
            foreach ($requiredFields as $field) {
                if (! isset($prositsData[$field])) {
                    throw new Exception("Missing required field: {$field}");
                }
            }

            // Update prosit with generated data
            $prosit->update([
                'mots_cles' => is_array($prositsData['mots_cles']) ? implode(', ', $prositsData['mots_cles']) : $prositsData['mots_cles'],
                'contexte' => $prositsData['contexte'],
                'besoin' => is_array($prositsData['besoin']) ? implode(', ', $prositsData['besoin']) : $prositsData['besoin'],
                'problematique' => $prositsData['problematique'],
                'generalisation' => $prositsData['generalisation'],
                'piste_de_solution' => is_array($prositsData['piste_de_solution']) ? implode(', ', $prositsData['piste_de_solution']) : $prositsData['piste_de_solution'],
                'plan_d_action' => is_array($prositsData['plan_d_action']) ? implode(', ', $prositsData['plan_d_action']) : $prositsData['plan_d_action'],
            ]);

            // Create competences
            foreach ($prositsData['competences'] as $compData) {
                $prosit->competences()->create([
                    'title' => $compData['title'],
                    'description' => $compData['description'],
                    'taxonomy_level' => $compData['taxonomy_level'],
                    'weight' => $compData['weight'],
                ]);
            }

            Log::info('Prosit generation completed successfully', [
                'prosit_id' => $this->prositId,
                'user_id' => $this->userId,
                'model' => $model,
                'endpoint' => $aiEndpoint,
            ]);

        } catch (Exception $e) {
            Log::error('Prosit generation failed', [
                'prosit_id' => $this->prositId,
                'user_id' => $this->userId,
                'error' => $e->getMessage(),
                'attempt' => $this->attempts(),
            ]);

            $this->fail($e);
        }
    }

    public function failed(Exception $exception): void
    {
        Log::error('Prosit generation job failed permanently', [
            'prosit_id' => $this->prositId,
            'user_id' => $this->userId,
            'error' => $exception->getMessage(),
            'attempts' => $this->attempts(),
        ]);
    }
}

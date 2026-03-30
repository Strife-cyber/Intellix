<?php

namespace App\Services;

use App\Services\AiModelManager;
use Exception;
use Illuminate\Support\Facades\Http;

class PrositGenerationService
{
    /**
     * Generate Prosit fields using AI based on the original text.
     */
    public function generatePrositFields(string $originalText): array
    {
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

Example 1:
Input: "Une équipe de dev travaille sur un site web de location de voiture. Après quelques semaines de développement, ils rencontrent plusieurs problèmes liés aux fonctionnalités attendues. Suite à cela, une reunion est tenue où ils décident d’en apprendre plus sur l’ingénierie des exigences afin de corriger ce problème."
Output: {
    "mots_cles": ["Exigence", "Ingénierie des exigences", "Exigences fonctionnelles", "Matrice de traçabilité"],
    "contexte": "Une équipe de développement travaille sur un site web de location de voitures mais rencontre des difficultés majeures avec les fonctionnalités attendues. Pour corriger ces incohérences, ils se réunissent pour explorer les fondements de l'ingénierie des exigences.",
    "besoin": ["Clarification des besoins du client", "Documentation des exigences", "Mise en place d'une matrice de traçabilité"],
    "problematique": "Comment l’équipe peut-elle clarifier et gérer les exigences pour éviter les incohérences et assurer un développement efficace du site ?",
    "generalisation": "Ingénierie des exigences",
    "piste_de_solution": ["Catégoriser les exigences va-t-il nous aider ?", "Est-ce qu'une matrice de traçabilité peut aider au suivi ?"],
    "plan_d_action": ["Définition des mots clés", "Etude sur l'ingénierie des exigences", "Rédiger des documents d'exigences", "Etablir une matrice de traçabilité", "Valider les exigences avec le client"],
    "competences": [
        {"title": "Maîtriser l'ingénierie des exigences", "taxonomy_level": "Application", "weight": 5, "description": "Être capable de recueillir et documenter les besoins métiers."},
        {"title": "Identifier les types d'exigences", "taxonomy_level": "Connaissance", "weight": 3, "description": "Distinguer les exigences fonctionnelles et non fonctionnelles."}
    ]
}

Important:
- Your entire response MUST be in French.
- Only output the raw JSON object. Do not include markdown blocks or any other text.
EOT;

        set_time_limit(300);
        
        // Auto-detect best AI endpoint and model
        $aiEndpoint = AiModelManager::getBestEndpoint();
        
        if (!$aiEndpoint) {
            throw new Exception(
                'No AI service available. Please ensure LM Studio is running with a loaded model, or check your AI_ENDPOINT configuration.'
            );
        }

        $model = AiModelManager::getBestModel($aiEndpoint) ?? 'local-model';

        $response = Http::timeout(300)->post("{$aiEndpoint}/v1/chat/completions", [
            'model' => $model,
            'messages' => [
                [
                    'role' => 'system',
                    'content' => $systemInstruction,
                ],
                [
                    'role' => 'user',
                    'content' => "Original Text:\n" . $originalText,
                ],
            ],
            'temperature' => 0.7,
        ]);

        if ($response->failed()) {
            throw new Exception('AI Prosit generation failed: ' . $response->body());
        }

        $data = $response->json();
        $answer = $data['choices'][0]['message']['content'] ?? '';

        // Extract JSON if wrapped in markdown
        if (preg_match('/```json\s*(.*?)\s*```/s', $answer, $matches)) {
            $answer = $matches[1];
        }

        $fields = json_decode(trim($answer), true);

        if (!is_array($fields)) {
            throw new Exception('Failed to parse AI output into JSON object. Output: ' . substr($answer, 0, 500));
        }

        // Ensure all fields are formatted correctly
        foreach ($fields as $key => $value) {
            if ($key === 'competences') {
                continue; // Keep as array
            }

            if (is_array($value)) {
                if ($key === 'mots_cles') {
                    $fields[$key] = implode(', ', $value);
                } else {
                    // Turn arrays for plan_d_action or piste_de_solution into markdown lists
                    $list = array_map(fn($item) => "- " . $item, $value);
                    $fields[$key] = implode("\n", $list);
                }
            }
        }

        return $fields;
    }
}

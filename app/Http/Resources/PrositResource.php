<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PrositResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'chapter_id' => $this->chapter_id,
            'mots_cles' => $this->mots_cles,
            'contexte' => $this->contexte,
            'besoin' => $this->besoin,
            'problematique' => $this->problematique,
            'generalisation' => $this->generalisation,
            'piste_de_solution' => $this->piste_de_solution,
            'plan_d_action' => $this->plan_d_action,
            'texte' => $this->texte,
            'competences' => CompetenceResource::collection($this->whenLoaded('competences')),
            'resources' => ResourceResource::collection($this->whenLoaded('resources')),
            'exams' => ExamResource::collection($this->whenLoaded('exams')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}

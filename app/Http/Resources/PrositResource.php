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
            'title' => $this->title,
            'problem_statement' => $this->problem_statement,
            'context' => $this->context,
            'difficulty_level' => $this->difficulty_level,
            'estimated_duration' => $this->estimated_duration,
            'competences' => CompetenceResource::collection($this->whenLoaded('competences')),
            'exams' => ExamResource::collection($this->whenLoaded('exams')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}

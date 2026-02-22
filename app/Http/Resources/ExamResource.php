<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExamResource extends JsonResource
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
            'prosit_id' => $this->prosit_id,
            'generated_by_ai' => $this->generated_by_ai,
            'difficulty_level' => $this->difficulty_level,
            'duration' => $this->duration,
            'total_marks' => $this->total_marks,
            'questions' => QuestionResource::collection($this->whenLoaded('questions')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}

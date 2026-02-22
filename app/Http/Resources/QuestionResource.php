<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QuestionResource extends JsonResource
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
            'exam_id' => $this->exam_id,
            'type' => $this->type,
            'question_text' => $this->question_text,
            'competence_id' => $this->competence_id,
            'difficulty' => $this->difficulty,
            'marks' => $this->marks,
            'explanation' => $this->explanation,
            'options' => $this->options,
            'correct_option' => $this->correct_option,
            'correct_boolean' => $this->correct_boolean,
            'expected_answer' => $this->expected_answer,
            'grading_rubric' => $this->grading_rubric,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}

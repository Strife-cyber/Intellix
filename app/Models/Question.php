<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Question extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'exam_id',
        'type',
        'question_text',
        'competence_id',
        'difficulty',
        'marks',
        'explanation',
        'options',
        'correct_option',
        'correct_boolean',
        'expected_answer',
        'grading_rubric',
    ];

    protected $casts = [
        'options' => 'array',
        'grading_rubric' => 'array',
        'correct_boolean' => 'boolean',
    ];

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class);
    }

    public function competence(): BelongsTo
    {
        return $this->belongsTo(Competence::class);
    }
}

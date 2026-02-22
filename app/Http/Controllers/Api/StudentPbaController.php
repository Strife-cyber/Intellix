<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ChapterResource;
use App\Http\Resources\ExamResource;
use App\Http\Resources\PrositResource;
use App\Models\Chapter;
use App\Models\Exam;
use App\Models\Prosit;
use App\Services\ExamGenerationService;

class StudentPbaController extends Controller
{
    public function viewChapter(Chapter $chapter)
    {
        // Return chapter with its Prosits
        $chapter->load('prosits');

        return new ChapterResource($chapter);
    }

    public function viewProsit(Prosit $prosit)
    {
        // Return prosit with resources and competences
        $prosit->load(['resources', 'competences']);

        return new PrositResource($prosit);
    }

    public function generateExamForProsit(Prosit $prosit, ExamGenerationService $examService)
    {
        // Trigger AI Exam generation for this Prosit (could also be triggered by Admin)
        $exam = $examService->generateExam($prosit);

        $exam->load('questions');

        return new ExamResource($exam);
    }

    public function takeExam(Exam $exam)
    {
        // Return the exam with questions for the student to take
        $exam->load('questions');

        return new ExamResource($exam);
    }

    // Grading/Submission would be added here
}

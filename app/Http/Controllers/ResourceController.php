<?php

namespace App\Http\Controllers;

use App\Models\Resource;
use App\Services\FlashcardGenerator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ResourceController extends Controller
{
    protected $flashcardGenerator;

    public function __construct(FlashcardGenerator $flashcardGenerator)
    {
        $this->flashcardGenerator = $flashcardGenerator;
    }

    public function generateFlashcards(Request $request, Resource $resource)
    {
        try {
            // Generate flashcards from the resource
            $flashcards = $this->flashcardGenerator->generateFromResource($resource);

            return response()->json([
                'success' => true,
                'message' => 'Flashcards generated successfully',
                'flashcards' => $flashcards,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to generate flashcards: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to generate flashcards',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function generateExam(Request $request, Resource $resource)
    {
        try {
            $numQuestions = $request->input('num_questions', 10);

            // Generate an exam from the resource's flashcards
            $exam = $this->flashcardGenerator->generateExam($resource, $numQuestions);

            return response()->json([
                'success' => true,
                'message' => 'Exam generated successfully',
                'exam' => $exam,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to generate exam: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to generate exam',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function getFlashcards(Resource $resource)
    {
        try {
            $flashcards = $resource->flashcards()->get();

            return response()->json([
                'success' => true,
                'flashcards' => $flashcards,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch flashcards: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch flashcards',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}

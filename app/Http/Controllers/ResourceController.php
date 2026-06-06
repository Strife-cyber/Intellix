<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreResourceRequest;
use App\Models\Resource;
use App\Services\FlashcardGenerator;
use App\Services\ResourceUploadService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ResourceController extends Controller
{
    use AuthorizesRequests;

    protected $flashcardGenerator;

    public function __construct(FlashcardGenerator $flashcardGenerator)
    {
        $this->flashcardGenerator = $flashcardGenerator;
    }

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreResourceRequest $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(Resource $resource)
    {
        $this->authorize('view', $resource);

        // Include current user role for UI
        $resource->role = $resource->roleOf(auth()->user());

        return response()->json($resource);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Resource $resource)
    {
        $this->authorize('delete', $resource);

        // In a real app, delete from S3 too.
        $resource->delete();

        return response()->json(['message' => 'Resource deleted successfully']);
    }

    public function upload(Request $request, ResourceUploadService $service): JsonResponse
    {
        set_time_limit(300); // Increase execution time to 300 seconds

        $request->validate([
            'files' => ['required', 'array'],
            'files.*' => ['file', 'max:102400'], // 100MB per file
        ]);

        $results = [];

        try {
            foreach ($request->file('files') as $file) {
                $resource = $service->upload($file);
                $results[] = [
                    'resource_id' => $resource->id,
                    'file_name' => $resource->original_name,
                    'status_url' => "/resources/{$resource->id}/status",
                ];
            }
        } catch (\Throwable $e) {
            report($e);

            $message = $e->getMessage();
            if (str_contains($message, 'connection attempt failed') || str_contains($message, 'Could not connect')) {
                $message = 'Storage service unreachable. Check MinIO/S3 (AWS_ENDPOINT) is running and reachable from this machine.';
            }

            return response()->json(['message' => $message], 503);
        }

        return response()->json($results, 202);
    }

    public function status(Resource $resource)
    {
        return response()->json([
            'id' => $resource->id,
            'status' => $resource->status,
        ]);
    }

    // ── AI-powered features ──────────────────────────────────────────────────

    public function generateFlashcards(Request $request, Resource $resource)
    {
        try {
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

<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class JobStatusController extends Controller
{
    public function __construct() {}

    /**
     * Get status of a prosit generation job.
     */
    public function prositStatus(string $jobId): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Prosit job status temporarily disabled (migration in progress)',
        ], 503);
    }

    /**
     * Get status of an exam generation job.
     */
    public function examStatus(string $jobId): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Exam job status temporarily disabled (migration in progress)',
        ], 503);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CourseResource;
use App\Http\Resources\PrositResource;
use App\Models\Course;
use App\Models\Prosit;
use Illuminate\Http\Request;

class PbaAdminController extends Controller
{
    public function indexCourses()
    {
        return CourseResource::collection(Course::with('modules', 'chapters')->latest()->get());
    }

    public function storeCourse(Request $request)
    {
        // Inline validation to save time; typical implementation uses a FormRequest
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'cover_image' => 'nullable|string',
        ]);

        $course = Course::create($validated);

        return new CourseResource($course);
    }

    public function showCourse(Course $course)
    {
        $course->load('modules', 'chapters');

        return new CourseResource($course);
    }

    public function updateCourse(Request $request, Course $course)
    {
        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'cover_image' => 'nullable|string',
        ]);

        $course->update($validated);

        return new CourseResource($course);
    }

    public function destroyCourse(Course $course)
    {
        $course->delete();

        return response()->noContent();
    }

    public function storeProsit(Request $request)
    {
        $validated = $request->validate([
            'chapter_id' => 'required|exists:chapters,id',
            'title' => 'required|string|max:255',
            'problem_statement' => 'required|string',
            'context' => 'nullable|string',
            'difficulty_level' => 'nullable|string',
            'estimated_duration' => 'nullable|integer',
        ]);

        $prosit = Prosit::create($validated);

        return new PrositResource($prosit);
    }

    public function showProsit(Prosit $prosit)
    {
        $prosit->load('competences', 'exams.questions');

        return new PrositResource($prosit);
    }
}

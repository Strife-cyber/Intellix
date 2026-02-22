<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\Exam;
use App\Models\Prosit;
use App\Services\ExamGenerationService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PbaWebController extends Controller
{
    public function indexCourses()
    {
        $courses = Course::with('chapters.prosits')->latest()->get();

        return Inertia::render('courses/index', [
            'courses' => $courses,
        ]);
    }

    public function showCourse(Course $course)
    {
        $course->load('chapters.prosits');

        return Inertia::render('courses/show', [
            'course' => $course,
        ]);
    }

    public function showProsit(Course $course, Prosit $prosit)
    {
        $prosit->load(['resources', 'competences', 'chapter']);

        return Inertia::render('prosits/show', [
            'course' => $course,
            'prosit' => $prosit,
        ]);
    }

    public function generateExam(Request $request, Prosit $prosit, ExamGenerationService $examService)
    {
        try {
            $exam = $examService->generateExam($prosit);

            return redirect()->route('exams.show', ['exam' => $exam->id])
                ->with('success', 'Exam generated successfully!');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function storeCourse(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'cover_image' => 'nullable|string',
        ]);
        Course::create($validated);

        return back()->with('success', 'Course created successfully');
    }

    public function updateCourse(Request $request, Course $course)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'cover_image' => 'nullable|string',
        ]);
        $course->update($validated);

        return back()->with('success', 'Course updated successfully');
    }

    public function destroyCourse(Course $course)
    {
        $course->delete();

        return redirect()->route('courses.index')->with('success', 'Course deleted');
    }

    public function storeChapter(Request $request, Course $course)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'order_index' => 'nullable|integer',
            'estimated_duration' => 'nullable|integer',
        ]);
        $validated['course_id'] = $course->id;
        Chapter::create($validated);

        return back()->with('success', 'Chapter created successfully');
    }

    public function destroyChapter(Chapter $chapter)
    {
        $chapter->delete();

        return back()->with('success', 'Chapter deleted');
    }

    public function indexProsits()
    {
        $prosits = Prosit::with(['chapter.course'])->latest()->get();
        $chapters = \App\Models\Chapter::with('course')->get();

        return Inertia::render('prosits/index', [
            'prosits' => $prosits,
            'chapters' => $chapters,
        ]);
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
        Prosit::create($validated);

        return back()->with('success', 'Prosit created successfully');
    }

    public function updateProsit(Request $request, Prosit $prosit)
    {
        $validated = $request->validate([
            'chapter_id' => 'required|exists:chapters,id',
            'title' => 'required|string|max:255',
            'problem_statement' => 'required|string',
            'context' => 'nullable|string',
            'difficulty_level' => 'nullable|string',
            'estimated_duration' => 'nullable|integer',
        ]);
        $prosit->update($validated);

        return back()->with('success', 'Prosit updated successfully');
    }

    public function destroyProsit(Prosit $prosit)
    {
        $prosit->delete();

        return back()->with('success', 'Prosit deleted');
    }

    public function indexExams()
    {
        $exams = Exam::with(['prosit.chapter.course'])->latest()->get();

        return Inertia::render('exams/index', [
            'exams' => $exams,
        ]);
    }

    public function showExam(Exam $exam)
    {
        $exam->load(['questions.competence', 'prosit']);

        return Inertia::render('exams/show', [
            'exam' => $exam,
        ]);
    }
}

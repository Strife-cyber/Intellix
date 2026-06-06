<?php

namespace App\Http\Controllers;

use App\Models\Chapter;
use App\Models\Competence;
use App\Models\Course;
use App\Models\Exam;
use App\Models\Prosit;
use App\Models\Resource;
use App\Services\CerMicroserviceClient;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Exception;
use RuntimeException;

class PbaWebController extends Controller
{
    public function __construct(
        private CerMicroserviceClient $cerClient,
    ) {}

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
        $allResources = Resource::whereNull('prosit_id')->latest()->get();

        return Inertia::render('prosits/show', [
            'course' => $course,
            'prosit' => $prosit,
            'allResources' => $allResources,
        ]);
    }

    public function generateExam(Request $request, Prosit $prosit)
    {
        return response()->json([
            'success' => false,
            'message' => 'Exam generation temporarily disabled (migration in progress)',
        ], 503);
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
        $chapters = Chapter::with('course')->get();
        $unallocatedProsits = Prosit::unallocated()->latest()->get();

        return Inertia::render('prosits/index', [
            'prosits' => $prosits,
            'chapters' => $chapters,
            'unallocatedProsits' => $unallocatedProsits,
        ]);
    }

    public function storeProsit(Request $request)
    {
        $rules = [
            'chapter_id' => 'nullable|exists:chapters,id',
            'texte' => 'required|string',
            'generate_with_ai' => 'boolean',
        ];

        if ($request->boolean('generate_with_ai')) {
             return back()->withErrors(['error' => 'AI Generation temporarily disabled (migration in progress)']);
        }

        $rules = array_merge($rules, [
            'mots_cles' => 'nullable|string',
            'contexte' => 'nullable|string',
            'besoin' => 'nullable|string',
            'problematique' => 'required|string',
            'generalisation' => 'nullable|string|max:255',
            'piste_de_solution' => 'nullable|string',
            'plan_d_action' => 'nullable|string',
        ]);

        $validated = $request->validate($rules);

        $validated['source'] = \App\Enums\PrositSource::MANUAL->value;

        $prosit = Prosit::create($validated);

        if (isset($validated['competences']) && is_array($validated['competences'])) {
            foreach ($validated['competences'] as $comp) {
                $prosit->competences()->create([
                    'title' => $comp['title'] ?? 'Sans titre',
                    'taxonomy_level' => $comp['taxonomy_level'] ?? 'Connaissance',
                    'weight' => $comp['weight'] ?? 1,
                    'description' => $comp['description'] ?? '',
                ]);
            }
        }

        return back()->with('success', 'Prosit created successfully');
    }

    public function generatePrositFields(Request $request)
    {
        return response()->json(['error' => 'AI Generation temporarily disabled (migration in progress)'], 503);
    }

    public function updateProsit(Request $request, Prosit $prosit)
    {
        $validated = $request->validate([
            'chapter_id' => 'nullable|exists:chapters,id',
            'mots_cles' => 'nullable|string',
            'contexte' => 'nullable|string',
            'besoin' => 'nullable|string',
            'problematique' => 'required|string',
            'generalisation' => 'nullable|string|max:255',
            'piste_de_solution' => 'nullable|string',
            'plan_d_action' => 'nullable|string',
            'texte' => 'nullable|string',
        ]);
        $prosit->update($validated);

        return back()->with('success', 'Prosit updated successfully');
    }

    public function destroyProsit(Prosit $prosit)
    {
        // Also delete the linked prosit in the CER microservice if it was uploaded from there
        if ($prosit->cer_microservice_id) {
            try {
                $this->cerClient->deleteProsit(auth()->user(), $prosit->cer_microservice_id);
            } catch (RuntimeException $e) {
                // Microservice may be unreachable — log and continue
                report($e);
            }
        }

        $prosit->delete();

        return redirect()->route('prosits.index')->with('success', 'Prosit deleted');
    }

    public function storeCompetence(Request $request, Prosit $prosit)
    {
        // Support both single competence and mass add (array)
        if ($request->has('competences') && is_array($request->input('competences'))) {
            $validated = $request->validate([
                'competences' => 'required|array',
                'competences.*.title' => 'required|string|max:255',
                'competences.*.description' => 'nullable|string',
                'competences.*.taxonomy_level' => 'required|string',
                'competences.*.weight' => 'required|integer|min:1',
            ]);

            foreach ($validated['competences'] as $comp) {
                $prosit->competences()->create($comp);
            }
        } else {
            $validated = $request->validate([
                'title' => 'required|string|max:255',
                'description' => 'nullable|string',
                'taxonomy_level' => 'required|string',
                'weight' => 'required|integer|min:1',
            ]);

            $prosit->competences()->create($validated);
        }

        return back()->with('success', 'Competences added successfully');
    }

    public function destroyCompetence(Competence $competence)
    {
        $competence->delete();

        return back()->with('success', 'Competence removed');
    }

    public function attachResource(Request $request, Prosit $prosit)
    {
        if ($request->has('resource_ids') && is_array($request->input('resource_ids'))) {
            $validated = $request->validate([
                'resource_ids' => 'required|array',
                'resource_ids.*' => 'exists:resources,id',
            ]);

            Resource::whereIn('id', $validated['resource_ids'])->update(['prosit_id' => $prosit->id]);
        } else {
            $request->validate([
                'resource_id' => 'required|exists:resources,id',
            ]);

            $resource = Resource::findOrFail($request->resource_id);
            $resource->update(['prosit_id' => $prosit->id]);
        }

        return back()->with('success', 'Resources attached');
    }

    public function detachResource(Resource $resource)
    {
        $resource->update(['prosit_id' => null]);

        return back()->with('success', 'Resource detached');
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

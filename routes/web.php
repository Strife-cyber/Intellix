<?php

use App\Http\Controllers\AiController;
use App\Http\Controllers\CahierController;
use App\Http\Controllers\CerWebController;
use App\Http\Controllers\FileController;
use App\Http\Controllers\FlashCardController;
use App\Http\Controllers\GithubController;
use App\Http\Controllers\GoogleController;
use App\Http\Controllers\JobStatusController;
use App\Http\Controllers\NoteController;
use App\Http\Controllers\PbaWebController;
use App\Http\Controllers\ResourceAccessController;
use App\Http\Controllers\ResourceController;
use App\Http\Controllers\StudyPlannerController;
use App\Models\Course;
use App\Models\FlashCard;
use App\Models\User;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/', function () {
    return Inertia::render('welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        $auth_user = auth()->user();
        $user = User::where('id', $auth_user->id)->first();

        // Get user's resources
        $resources = $user->resources;

        // Get flashcards count for this user
        $flashcardsCount = FlashCard::where('user_id', $user->id)->count();
        $flashcardsDueToday = FlashCard::where('user_id', $user->id)
            ->where('next_review', '<=', now())
            ->count();

        // Get courses count
        $coursesCount = Course::count();

        // Get recent activity (last 5 resources)
        $recentResources = $resources->take(5)->map(function ($resource) {
            return [
                'id' => $resource->id,
                'name' => $resource->original_name,
                'status' => $resource->status->value,
                'created_at' => $resource->created_at->diffForHumans(),
            ];
        });

        return Inertia::render('dashboard', [
            'resources' => $resources,
            'stats' => [
                'resources_count' => $resources->count(),
                'flashcards_count' => $flashcardsCount,
                'flashcards_due_today' => $flashcardsDueToday,
                'courses_count' => $coursesCount,
            ],
            'recent_resources' => $recentResources,
        ]);
    })->name('dashboard');

    Route::get('library', function () {
        $auth_user = auth()->user();
        $user = User::where('id', $auth_user->id)->first();
        $resources = $user->resources;

        return Inertia::render('library', [
            'resources' => $resources,
        ]);
    })->name('library');

    Route::get('flashcards-page', function () {

        /** @var User|null $user */
        $user = auth()->user();
        $resources = $user ? $user->resources : collect();

        return Inertia::render('flashcards', [
            'resources' => $resources,
        ]);
    })->name('flashcards');

    Route::get('upload', function () {
        return Inertia::render('upload');
    })->name('upload');

    // ── Resource Management ──────────────────────────────────────────────────
    Route::prefix('resources')->group(function () {
        Route::post('upload', [ResourceController::class, 'upload']);
        Route::get('{resource}', [ResourceController::class, 'show']);
        Route::delete('{resource}', [ResourceController::class, 'destroy']);
        Route::get('{resource}/status', [ResourceController::class, 'status']);

        // Resource Access
        Route::get('{resource}/access', [ResourceAccessController::class, 'index']);
        Route::post('{resource}/access', [ResourceAccessController::class, 'store']);
        Route::put('{resource}/access/{user}', [ResourceAccessController::class, 'update']);
        Route::delete('{resource}/access/{user}', [ResourceAccessController::class, 'destroy']);
    });

    // ── Note Management ──────────────────────────────────────────────────
    Route::post('notes/upload', [NoteController::class, 'upload'])->name('notes.upload');
    Route::resource('notes', NoteController::class);

    // ── Flashcard Management ────────────────────────────────────────────────
    Route::prefix('flashcards')->group(function () {
        Route::get('/', [FlashCardController::class, 'index']);
        Route::post('/', [FlashCardController::class, 'store']);
        Route::get('{flashCard}', [FlashCardController::class, 'show']);
        Route::put('{flashCard}', [FlashCardController::class, 'update']);
        Route::delete('{flashCard}', [FlashCardController::class, 'destroy']);

        Route::post('{flashCard}/review', [FlashCardController::class, 'review']);
        Route::post('generate', [FlashCardController::class, 'generate']); // Legacy?
    });

    Route::post('resources/{resource}/flashcards/generate', [FlashCardController::class, 'generate']);

    // ── PBA Learning Platform ────────────────────────────────────────────────
    Route::get('courses', [PbaWebController::class, 'indexCourses'])->name('courses.index');
    Route::post('courses', [PbaWebController::class, 'storeCourse'])->name('courses.store');
    Route::put('courses/{course}', [PbaWebController::class, 'updateCourse'])->name('courses.update');
    Route::delete('courses/{course}', [PbaWebController::class, 'destroyCourse'])->name('courses.destroy');
    Route::get('courses/{course}', [PbaWebController::class, 'showCourse'])->name('courses.show');

    Route::post('courses/{course}/chapters', [PbaWebController::class, 'storeChapter'])->name('chapters.store');
    Route::delete('chapters/{chapter}', [PbaWebController::class, 'destroyChapter'])->name('chapters.destroy');

    Route::get('prosits', [PbaWebController::class, 'indexProsits'])->name('prosits.index');
    Route::post('prosits', [PbaWebController::class, 'storeProsit'])->name('prosits.store');
    Route::post('prosits/generate-fields', [PbaWebController::class, 'generatePrositFields'])->name('prosits.generate-fields');
    Route::put('prosits/{prosit}', [PbaWebController::class, 'updateProsit'])->name('prosits.update');
    Route::delete('prosits/{prosit}', [PbaWebController::class, 'destroyProsit'])->name('prosits.destroy');

    // Prosit Competences & Resources
    Route::post('prosits/{prosit}/competences', [PbaWebController::class, 'storeCompetence'])->name('prosits.competences.store');
    Route::delete('competences/{competence}', [PbaWebController::class, 'destroyCompetence'])->name('competences.destroy');
    Route::post('prosits/{prosit}/resources/attach', [PbaWebController::class, 'attachResource'])->name('prosits.resources.attach');
    Route::delete('resources/{resource}/detach', [PbaWebController::class, 'detachResource'])->name('resources.detach');
    Route::get('courses/{course}/prosits/{prosit}', [PbaWebController::class, 'showProsit'])->name('prosits.show');
    Route::post('prosits/{prosit}/generate-exam', [PbaWebController::class, 'generateExam'])->name('prosits.generate-exam');

    Route::get('exams', [PbaWebController::class, 'indexExams'])->name('exams.index');
    Route::get('exams/{exam}', [PbaWebController::class, 'showExam'])->name('exams.show');

    Route::get('/ai/status', [AiController::class, 'status'])->name('ai.status');
    Route::post('/ai/chat', [AiController::class, 'chat'])->name('ai.chat');

    // Job Status Routes
    Route::get('/jobs/prosit/{jobId}/status', [JobStatusController::class, 'prositStatus'])->name('jobs.prosit.status');
    Route::get('/jobs/exam/{jobId}/status', [JobStatusController::class, 'examStatus'])->name('jobs.exam.status');
    Route::post('/jobs/exam/batch-status', [JobStatusController::class, 'examBatchStatus'])->name('jobs.exam.batch-status');
    Route::get('/jobs/user', [JobStatusController::class, 'userJobs'])->name('jobs.user')->middleware('auth');

    // ── Study Planner ───────────────────────────────────────────────────────
    Route::get('study-planner', function () {
        $user = auth()->user();

        // Get current month schedule (optimized with single query)
        $start = now()->startOfMonth();
        $end = now()->endOfMonth();

        // Get all due cards for the month in a single query
        $allDueFlashcards = FlashCard::forUser($user->id)
            ->due()
            ->whereBetween('next_review', [$start, $end])
            ->with(['resource'])
            ->get();

        // Group cards by date
        $cardsByDate = $allDueFlashcards->groupBy(function ($card) {
            return Carbon::parse($card->next_review)->format('Y-m-d');
        });

        $schedule = [];
        $period = CarbonPeriod::create($start, $end);

        foreach ($period as $date) {
            $dateStr = $date->format('Y-m-d');
            $dayFlashcards = $cardsByDate->get($dateStr, collect());

            $schedule[] = [
                'date' => $dateStr,
                'due_count' => $dayFlashcards->count(),
                'flashcards' => $dayFlashcards->map(function ($card) {
                    return [
                        'id' => $card->id,
                        'front' => $card->front,
                        'resource_title' => $card->resource->original_name ?? 'Unknown',
                        'interval_days' => $card->interval_days,
                        'difficulty' => $card->difficulty,
                    ];
                }),
                'total_study_time' => $dayFlashcards->count() * 2,
            ];
        }

        // Get statistics (optimized using already fetched data)
        $allDueCards = FlashCard::forUser($user->id)->due();
        $allCards = FlashCard::forUser($user->id);

        $stats = [
            'total_due' => $allDueCards->where('next_review', '<=', $end)->count(),
            'overdue_count' => $allDueCards->where('next_review', '<', now())->count(),
            'due_today' => $allDueCards->whereDate('next_review', today())->count(),
            'total_flashcards' => $allCards->count(),
        ];

        // Calculate study streak (optimized)
        $thirtyDaysAgo = now()->subDays(30);
        $studyDays = FlashCard::forUser($user->id)
            ->whereNotNull('last_reviewed_at')
            ->where('last_reviewed_at', '>=', $thirtyDaysAgo)
            ->selectRaw('DATE(last_reviewed_at) as study_date')
            ->distinct()
            ->pluck('study_date')
            ->sort()
            ->toArray();

        $currentStreak = 0;
        $longestStreak = 0;

        if (! empty($studyDays)) {
            // Calculate current streak - count consecutive days ending today or yesterday
            $maxIterations = 30; // Safety limit
            $iterations = 0;

            // Check if there's study activity today or yesterday to start a streak
            $todayStr = now()->format('Y-m-d');
            $yesterdayStr = now()->subDay()->format('Y-m-d');

            if (in_array($todayStr, $studyDays) || in_array($yesterdayStr, $studyDays)) {
                $checkDate = in_array($todayStr, $studyDays) ? now() : now()->subDay();

                while (in_array($checkDate->format('Y-m-d'), $studyDays) && $iterations < $maxIterations) {
                    $currentStreak++;
                    $checkDate->subDay();
                    $iterations++;
                }
            }

            // Calculate longest streak (optimized)
            $studyDaysSorted = array_values($studyDays);
            $tempStreak = 1;

            for ($i = 1; $i < count($studyDaysSorted); $i++) {
                $prevDate = new Carbon($studyDaysSorted[$i - 1]);
                $currentDate = new Carbon($studyDaysSorted[$i]);

                if ($currentDate->diffInDays($prevDate) == 1) {
                    $tempStreak++;
                } else {
                    $longestStreak = max($longestStreak, $tempStreak);
                    $tempStreak = 1;
                }
            }
            $longestStreak = max($longestStreak, $tempStreak);
        }

        $studyStreak = [
            'current' => $currentStreak,
            'longest' => $longestStreak,
            'last_study_date' => ! empty($studyDays) ? end($studyDays) : null,
        ];

        return Inertia::render('study-planner', [
            'schedule' => $schedule,
            'stats' => $stats,
            'study_streak' => $studyStreak,
        ]);
    })->name('study-planner.index');

    Route::prefix('study-planner')->group(function () {
        Route::get('/recommendations', [StudyPlannerController::class, 'recommendations'])->name('study-planner.recommendations');
        Route::get('/generate-plan', [StudyPlannerController::class, 'generatePlan'])->name('study-planner.generate-plan');
    });

    Route::get('/files/preview/{path}', [FileController::class, 'preview'])
        ->where('path', '(.*)');

    Route::post('cers/upload', [CahierController::class, 'upload'])->name('cers.upload');
    Route::post('cers/save', [CahierController::class, 'store'])->name('cers.save');

    Route::get('cers/all', [CahierController::class, 'all'])->name('cers.all');

    Route::get('cers/generate', [CerWebController::class, 'generate'])->name('cers.generate');
    Route::post('cers/generate', [CerWebController::class, 'startGeneration'])->name('cers.generate.start');
    Route::post('cers/prosits/import', [CerWebController::class, 'importProsit'])->name('cers.prosits.import');
    Route::patch('cers/prosits/{id}', [CerWebController::class, 'updateProsit'])->name('cers.prosits.update');
    Route::delete('cers/prosits/{id}', [CerWebController::class, 'destroyProsit'])->name('cers.prosits.destroy');
    Route::get('cers/jobs/{id}/status', [CerWebController::class, 'jobStatus'])->name('cers.jobs.status');
    Route::get('cers/jobs/{id}/{kind}', [CerWebController::class, 'jobDownload'])
        ->where('kind', 'pdf|latex|download')
        ->name('cers.jobs.download');

    Route::get('cers/jobs', function () {
        return Inertia::render('cers/jobs');
    })->name('cers.jobs');

    Route::resource('cers', CahierController::class);
});

Route::get('/auth/google/redirect', [GoogleController::class, 'redirect'])->name('google.redirect');
Route::get('/auth/google/callback', [GoogleController::class, 'callback']);

Route::get('/auth/github/redirect', [GithubController::class, 'redirect'])->name('github.redirect');
Route::get('/auth/github/callback', [GithubController::class, 'callback']);

require __DIR__.'/settings.php';

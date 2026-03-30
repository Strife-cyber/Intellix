<?php

use App\Http\Controllers\AiController;
use App\Http\Controllers\FileController;
use App\Http\Controllers\FlashCardController;
use App\Http\Controllers\GithubController;
use App\Http\Controllers\GoogleController;
use App\Http\Controllers\StudyPlannerController;
use App\Http\Controllers\ResourceAccessController;
use App\Http\Controllers\ResourceController;
use App\Models\User;
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
        $flashcardsCount = \App\Models\FlashCard::where('user_id', $user->id)->count();
        $flashcardsDueToday = \App\Models\FlashCard::where('user_id', $user->id)
            ->where('next_review', '<=', now())
            ->count();
        
        // Get courses count
        $coursesCount = \App\Models\Course::count();
        
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
        return Inertia::render('upload', []);
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
    Route::get('courses', [\App\Http\Controllers\PbaWebController::class, 'indexCourses'])->name('courses.index');
    Route::post('courses', [\App\Http\Controllers\PbaWebController::class, 'storeCourse'])->name('courses.store');
    Route::put('courses/{course}', [\App\Http\Controllers\PbaWebController::class, 'updateCourse'])->name('courses.update');
    Route::delete('courses/{course}', [\App\Http\Controllers\PbaWebController::class, 'destroyCourse'])->name('courses.destroy');
    Route::get('courses/{course}', [\App\Http\Controllers\PbaWebController::class, 'showCourse'])->name('courses.show');

    Route::post('courses/{course}/chapters', [\App\Http\Controllers\PbaWebController::class, 'storeChapter'])->name('chapters.store');
    Route::delete('chapters/{chapter}', [\App\Http\Controllers\PbaWebController::class, 'destroyChapter'])->name('chapters.destroy');

    Route::get('prosits', [\App\Http\Controllers\PbaWebController::class, 'indexProsits'])->name('prosits.index');
    Route::post('prosits', [\App\Http\Controllers\PbaWebController::class, 'storeProsit'])->name('prosits.store');
    Route::post('prosits/generate-fields', [\App\Http\Controllers\PbaWebController::class, 'generatePrositFields'])->name('prosits.generate-fields');
    Route::put('prosits/{prosit}', [\App\Http\Controllers\PbaWebController::class, 'updateProsit'])->name('prosits.update');
    Route::delete('prosits/{prosit}', [\App\Http\Controllers\PbaWebController::class, 'destroyProsit'])->name('prosits.destroy');

    // Prosit Competences & Resources
    Route::post('prosits/{prosit}/competences', [\App\Http\Controllers\PbaWebController::class, 'storeCompetence'])->name('prosits.competences.store');
    Route::delete('competences/{competence}', [\App\Http\Controllers\PbaWebController::class, 'destroyCompetence'])->name('competences.destroy');
    Route::post('prosits/{prosit}/resources/attach', [\App\Http\Controllers\PbaWebController::class, 'attachResource'])->name('prosits.resources.attach');
    Route::delete('resources/{resource}/detach', [\App\Http\Controllers\PbaWebController::class, 'detachResource'])->name('resources.detach');
    Route::get('courses/{course}/prosits/{prosit}', [\App\Http\Controllers\PbaWebController::class, 'showProsit'])->name('prosits.show');
    Route::post('prosits/{prosit}/generate-exam', [\App\Http\Controllers\PbaWebController::class, 'generateExam'])->name('prosits.generate-exam');

    Route::get('exams', [\App\Http\Controllers\PbaWebController::class, 'indexExams'])->name('exams.index');
    Route::get('exams/{exam}', [\App\Http\Controllers\PbaWebController::class, 'showExam'])->name('exams.show');

    Route::get('/ai/status', [AiController::class, 'status'])->name('ai.status');
    Route::post('/ai/chat', [AiController::class, 'chat'])->name('ai.chat');

    // ── Study Planner ───────────────────────────────────────────────────────
    Route::get('study-planner', function () {
        $user = auth()->user();
        
        // Get current month schedule (optimized with single query)
        $start = now()->startOfMonth();
        $end = now()->endOfMonth();
        
        // Get all due cards for the month in a single query
        $allDueFlashcards = \App\Models\FlashCard::forUser($user->id)
            ->due()
            ->whereBetween('next_review', [$start, $end])
            ->with(['resource'])
            ->get();
        
        // Group cards by date
        $cardsByDate = $allDueFlashcards->groupBy(function ($card) {
            return \Carbon\Carbon::parse($card->next_review)->format('Y-m-d');
        });
        
        $schedule = [];
        $period = \Carbon\CarbonPeriod::create($start, $end);
        
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
        $allDueCards = \App\Models\FlashCard::forUser($user->id)->due();
        $allCards = \App\Models\FlashCard::forUser($user->id);
        
        $stats = [
            'total_due' => $allDueCards->where('next_review', '<=', $end)->count(),
            'overdue_count' => $allDueCards->where('next_review', '<', now())->count(),
            'due_today' => $allDueCards->whereDate('next_review', today())->count(),
            'total_flashcards' => $allCards->count(),
        ];
        
        // Calculate study streak (optimized)
        $thirtyDaysAgo = now()->subDays(30);
        $studyDays = \App\Models\FlashCard::forUser($user->id)
            ->whereNotNull('last_reviewed_at')
            ->where('last_reviewed_at', '>=', $thirtyDaysAgo)
            ->selectRaw('DATE(last_reviewed_at) as study_date')
            ->distinct()
            ->pluck('study_date')
            ->sort()
            ->toArray();
        
        $currentStreak = 0;
        $longestStreak = 0;
        $tempStreak = 0;
        
        if (!empty($studyDays)) {
            // Calculate current streak - count consecutive days ending today or yesterday
            $currentStreak = 0;
            $checkDate = now();
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
                $prevDate = new \Carbon\Carbon($studyDaysSorted[$i - 1]);
                $currentDate = new \Carbon\Carbon($studyDaysSorted[$i]);
                
                if ($currentDate->diffInDays($prevDate) === 1) {
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
            'last_study_date' => !empty($studyDays) ? end($studyDays) : null,
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
});

Route::get('/auth/google/redirect', [GoogleController::class, 'redirect'])->name('google.redirect');
Route::get('/auth/google/callback', [GoogleController::class, 'callback']);

Route::get('/auth/github/redirect', [GithubController::class, 'redirect'])->name('github.redirect');
Route::get('/auth/github/callback', [GithubController::class, 'callback']);

require __DIR__.'/settings.php';

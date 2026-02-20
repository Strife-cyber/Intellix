<?php

use App\Http\Controllers\AiController;
use App\Http\Controllers\FileController;
use App\Http\Controllers\FlashCardController;
use App\Http\Controllers\GithubController;
use App\Http\Controllers\GoogleController;
use App\Http\Controllers\ResourceController;
use App\Http\Controllers\ResourceAccessController;
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
        return Inertia::render('dashboard', []);
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

    Route::post('/ai/chat', [AiController::class, 'chat'])->name('ai.chat');

    Route::get('/files/preview/{path}', [FileController::class, 'preview'])
        ->where('path', '(.*)');
});

Route::get('/auth/google/redirect', [GoogleController::class, 'redirect'])->name('google.redirect');
Route::get('/auth/google/callback', [GoogleController::class, 'callback']);

Route::get('/auth/github/redirect', [GithubController::class, 'redirect'])->name('github.redirect');
Route::get('/auth/github/callback', [GithubController::class, 'callback']);

require __DIR__.'/settings.php';

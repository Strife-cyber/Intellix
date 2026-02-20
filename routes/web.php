<?php

use App\Http\Controllers\AiController;
use App\Http\Controllers\FileController;
use App\Http\Controllers\GithubController;
use App\Http\Controllers\GoogleController;
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

Route::get('dashboard', function () {
    return Inertia::render('dashboard', []);
})->middleware(['auth', 'verified'])->name('dashboard');

Route::get('library', function () {
    $auth_user = auth()->user();
    $user = User::where('id', $auth_user->id)->first();
    $resources = $user->resources;

    return Inertia::render('library', [
        'resources' => $resources,
    ]);
})->middleware(['auth', 'verified'])->name('library');

Route::get('flashcards', function () {
    return Inertia::render('flashcards', []);
})->middleware(['auth', 'verified'])->name('flashcards');

Route::get('upload', function () {
    return Inertia::render('upload', []);
})->middleware(['auth', 'verified'])->name('upload');

Route::prefix('v1')->group(function () {
    Route::post('/resources/upload', [ResourceController::class, 'upload']);
    Route::get('/resources/{resource}/status', [ResourceController::class, 'status']);
});

Route::get('/files/preview/{path}', [FileController::class, 'preview'])
    ->where('path', '(.*)')
    ->middleware(['auth', 'verified']);

Route::get('/auth/google/redirect', [GoogleController::class, 'redirect'])->name('google.redirect');
Route::get('/auth/google/callback', [GoogleController::class, 'callback']);

Route::get('/auth/github/redirect', [GithubController::class, 'redirect'])->name('github.redirect');
Route::get('/auth/github/callback', [GithubController::class, 'callback']);

Route::post('/ai/chat', [AiController::class, 'chat'])
    ->middleware(['auth', 'verified'])
    ->name('ai.chat');

require __DIR__.'/settings.php';

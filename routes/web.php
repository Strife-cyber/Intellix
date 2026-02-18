<?php

use App\Http\Controllers\GithubController;
use App\Http\Controllers\GoogleController;
use App\Http\Controllers\ResourceController;
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
    return Inertia::render('library', []);
})->middleware(['auth', 'verified'])->name('library');

Route::get('upload', function () {
    return Inertia::render('upload', []);
})->middleware(['auth', 'verified'])->name('upload');

Route::prefix('v1')->group(function () {
    Route::post('/resources/upload', [ResourceController::class, 'upload']);
    Route::get('/resources/{resource}/status', [ResourceController::class, 'status']);
});

Route::get('/auth/google/redirect', [GoogleController::class, 'redirect']);
Route::get('/auth/google/callback', [GoogleController::class, 'callback']);

Route::get('/auth/github/redirect', [GithubController::class, 'redirect']);
Route::get('/auth/github/callback', [GithubController::class, 'callback']);

require __DIR__.'/settings.php';

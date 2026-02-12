<?php

use App\Http\Controllers\GithubController;
use App\Http\Controllers\GoogleController;
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

Route::get('/auth/google/redirect', [GoogleController::class, 'redirect']);
Route::get('/auth/google/callback', [GoogleController::class, 'callback']);

Route::get('/auth/github/redirect', [GithubController::class, 'redirect']);
Route::get('/auth/github/callback', [GithubController::class, 'callback']);

require __DIR__.'/settings.php';

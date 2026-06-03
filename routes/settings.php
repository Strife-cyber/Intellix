<?php

use App\Http\Controllers\Settings\AiSettingsController;
use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\TwoFactorAuthenticationController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware(['auth'])->group(function () {
    Route::redirect('settings', '/settings/profile');

    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('settings/password', [PasswordController::class, 'edit'])->name('user-password.edit');

    Route::put('settings/password', [PasswordController::class, 'update'])
        ->middleware('throttle:6,1')
        ->name('user-password.update');

    Route::get('settings/appearance', function () {
        return Inertia::render('settings/appearance');
    })->name('appearance.edit');

    Route::get('settings/two-factor', [TwoFactorAuthenticationController::class, 'show'])
        ->name('two-factor.show');

    Route::get('settings/ai', [AiSettingsController::class, 'edit'])->name('settings.ai.edit');
    Route::post('settings/ai', [AiSettingsController::class, 'store'])->name('settings.ai.store');
    Route::put('settings/ai/{user_ai_setting}', [AiSettingsController::class, 'update'])->name('settings.ai.update');
    Route::delete('settings/ai/{user_ai_setting}', [AiSettingsController::class, 'destroy'])->name('settings.ai.destroy');
    Route::post('settings/ai/{user_ai_setting}/default', [AiSettingsController::class, 'makeDefault'])->name('settings.ai.default');
});

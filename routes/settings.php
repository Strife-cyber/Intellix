<?php

use App\Http\Controllers\AiTestController;
use App\Http\Controllers\Settings\ChatAiSettingsController;
use App\Http\Controllers\Settings\EmbeddingAiSettingsController;
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

    Route::redirect('settings/ai', '/settings/ai/chat');

    Route::get('settings/ai/chat', [ChatAiSettingsController::class, 'edit'])->name('settings.ai.chat.edit');
    Route::post('settings/ai/chat', [ChatAiSettingsController::class, 'store'])->name('settings.ai.chat.store');
    Route::put('settings/ai/chat/{user_chat_ai_setting}', [ChatAiSettingsController::class, 'update'])->name('settings.ai.chat.update');
    Route::delete('settings/ai/chat/{user_chat_ai_setting}', [ChatAiSettingsController::class, 'destroy'])->name('settings.ai.chat.destroy');
    Route::post('settings/ai/chat/{user_chat_ai_setting}/default', [ChatAiSettingsController::class, 'makeDefault'])->name('settings.ai.chat.default');

    Route::get('settings/ai/embeddings', [EmbeddingAiSettingsController::class, 'edit'])->name('settings.ai.embedding.edit');
    Route::put('settings/ai/embeddings', [EmbeddingAiSettingsController::class, 'update'])->name('settings.ai.embedding.update');

    // AI provider test endpoint (used by both chat and embedding settings)
    Route::post('settings/ai/test', [AiTestController::class, 'test'])->name('settings.ai.test');
});

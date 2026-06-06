<?php

use App\Http\Controllers\CerMicroserviceProxyController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// ── CER Microservice Proxy ───────────────────────────────────────────────────
// The CER microservice is hosted separately; proxy it through this app so the
// frontend can keep calling relative `/api/*` URLs. Session auth is required.

// Read-only CER proxy (GET). Mutations use web routes + Inertia for CSRF.
Route::middleware(['web', 'auth'])->group(function () {
    Route::get('/themes', [CerMicroserviceProxyController::class, 'themes']);
    Route::get('/prosits', [CerMicroserviceProxyController::class, 'listProsits']);
    Route::get('/prosits/{id}', [CerMicroserviceProxyController::class, 'getProsit']);
    Route::get('/jobs', [CerMicroserviceProxyController::class, 'listJobs']);
    Route::get('/jobs/{id}', [CerMicroserviceProxyController::class, 'getJob']);
    Route::get('/jobs/{id}/{kind}', [CerMicroserviceProxyController::class, 'downloadJob']);

    // ── AI Provider Model Listing ───────────────────────────────────────────────────
    // List available models for a given provider (OpenAI, Ollama, etc.)
    Route::post('/ai/list-models', [\App\Http\Controllers\Api\ListModelsController::class, '__invoke']);
});

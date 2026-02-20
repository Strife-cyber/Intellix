<?php

namespace App\Http\Controllers;

use App\Actions\GenerateFlashCardsAction;
use App\Actions\ReviewFlashCardAction;
use App\Http\Requests\StoreFlashCardRequest;
use App\Http\Requests\UpdateFlashCardRequest;
use App\Models\FlashCard;
use App\Models\Resource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class FlashCardController extends Controller
{
    // ── GET /api/v1/flashcards?resource_id=... ──────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'resource_id' => ['required', 'string', 'exists:resources,id'],
        ]);

        /** @var \App\Models\User $user */
        $user     = $request->user();
        $resource = Resource::findOrFail($request->input('resource_id'));

        // Policy: viewAny is always true (scoped below), but ensure user can see resource
        Gate::authorize('view', $resource);

        $cards = FlashCard::where('resource_id', $resource->id)
            ->orderBy('created_at')
            ->get()
            ->map(fn (FlashCard $card) => $this->formatCard($card, $user));

        $canEdit = $resource->isEditableBy($user);

        return response()->json([
            'data'     => $cards,
            'can_edit' => $canEdit,
        ]);
    }

    // ── POST /api/v1/flashcards ─────────────────────────────────────────────

    public function store(StoreFlashCardRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user     = $request->user();
        $resource = Resource::findOrFail($request->validated('resource_id'));

        Gate::authorize('create', [FlashCard::class, $resource]);

        $card = FlashCard::create([
            'user_id'     => $user->id,
            'resource_id' => $resource->id,
            'front'       => $request->validated('front'),
            'back'        => $request->validated('back'),
            'interval_days' => 0,
            'next_review'   => now(),
        ]);

        return response()->json(['data' => $this->formatCard($card, $user)], 201);
    }

    // ── GET /api/v1/flashcards/{id} ─────────────────────────────────────────

    public function show(Request $request, FlashCard $flashCard): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        Gate::authorize('view', $flashCard);

        return response()->json(['data' => $this->formatCard($flashCard, $user)]);
    }

    // ── PUT /api/v1/flashcards/{id} ─────────────────────────────────────────

    public function update(UpdateFlashCardRequest $request, FlashCard $flashCard): JsonResponse
    {
        Gate::authorize('update', $flashCard);

        $flashCard->update($request->validated());

        /** @var \App\Models\User $user */
        $user = $request->user();

        return response()->json(['data' => $this->formatCard($flashCard->fresh(), $user)]);
    }

    // ── DELETE /api/v1/flashcards/{id} ──────────────────────────────────────

    public function destroy(Request $request, FlashCard $flashCard): JsonResponse
    {
        Gate::authorize('delete', $flashCard);

        $flashCard->delete();

        return response()->json(['message' => 'Deleted.'], 200);
    }

    // ── POST /api/v1/flashcards/{id}/review ─────────────────────────────────

    public function review(
        Request $request,
        FlashCard $flashCard,
        ReviewFlashCardAction $action,
    ): JsonResponse {
        $request->validate([
            'rating'      => ['required', 'integer', 'min:1', 'max:4'],
            'duration_ms' => ['required', 'integer', 'min:0'],
        ]);

        Gate::authorize('review', $flashCard);

        try {
            $result = $action->execute(
                $flashCard,
                (int) $request->input('rating'),
                (int) $request->input('duration_ms'),
            );
        } catch (\RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }

        return response()->json(['data' => $result]);
    }

    // ── POST /api/v1/resources/{resource}/flashcards/generate ───────────────

    public function generate(
        Request $request,
        Resource $resource,
        GenerateFlashCardsAction $action,
    ): JsonResponse {
        $request->validate([
            'count' => ['sometimes', 'integer', 'min:1', 'max:50'],
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();

        Gate::authorize('create', [FlashCard::class, $resource]);

        $count = (int) $request->input('count', 10);

        try {
            $cards = $action->execute($resource, $user->id, $count);
        } catch (\RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        $canEdit = $resource->isEditableBy($user);

        return response()->json([
            'data'     => array_map(fn ($card) => $this->formatCard($card, $user), $cards),
            'can_edit' => $canEdit,
        ], 201);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private function formatCard(FlashCard $card, \App\Models\User $user): array
    {
        return [
            'id'               => $card->id,
            'resource_id'      => $card->resource_id,
            'front'            => $card->front,
            'back'             => $card->back,
            'interval_days'    => $card->interval_days,
            'stability'        => $card->stability,
            'difficulty'       => $card->difficulty,
            'next_review'      => $card->next_review?->toIso8601String(),
            'last_reviewed_at' => $card->last_reviewed_at?->toIso8601String(),
            'created_at'       => $card->created_at?->toIso8601String(),
        ];
    }
}

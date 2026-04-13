<?php

namespace App\Actions;

use App\Models\FlashCard;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class ReviewFlashCardAction
{
    public function __construct() {}

    /**
     * Process an FSRS review for a flash card.
     * (Temporarily using simplified logic during microservice migration)
     *
     * @param  int  $rating  1=Again 2=Hard 3=Good 4=Easy
     * @param  int  $durationMs  Time spent on card (milliseconds)
     * @return array{next_review: string, interval_days: int, stability: float}
     *
     * @throws RuntimeException
     */
    public function execute(FlashCard $card, int $rating, int $durationMs): array
    {
        $ratingMap = [1 => 'again', 2 => 'hard', 3 => 'good', 4 => 'easy'];

        if (! isset($ratingMap[$rating])) {
            throw new \InvalidArgumentException("Invalid rating: {$rating}. Must be 1–4.");
        }

        // Simplified logic replacing Rust-based FSRS during migration
        Log::info("Flashcard {$card->id} review – skipping FSRS (migration in progress).");

        $currentInterval = $card->interval_days ?: 0;
        $multiplier = match($rating) {
            1 => 0,
            2 => 1.2,
            3 => 2.5,
            4 => 4.0,
            default => 1.0
        };

        $intervalDays = $currentInterval === 0 ? 1 : (int) round($currentInterval * $multiplier);
        if ($intervalDays < 1 && $rating > 1) $intervalDays = 1;
        
        $stability = $card->stability * ($multiplier ?: 0.5);
        $difficulty = $card->difficulty ?? 5.0;
        $nextReview = now()->addDays($intervalDays)->toIso8601String();

        $card->update([
            'interval_days' => $intervalDays,
            'stability' => $stability,
            'difficulty' => $difficulty,
            'last_reviewed_at' => now(),
            'next_review' => $nextReview,
        ]);

        return [
            'next_review' => $nextReview,
            'interval_days' => $intervalDays,
            'stability' => $stability,
        ];
    }
}

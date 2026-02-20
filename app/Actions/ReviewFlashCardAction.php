<?php

namespace App\Actions;

use App\Models\FlashCard;
use App\Models\Resource;
use App\Services\Rust\RustService;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class ReviewFlashCardAction
{
    public function __construct(
        protected RustService $rustService,
    ) {}

    /**
     * Process an FSRS review for a flash card.
     *
     * @param  FlashCard  $card
     * @param  int        $rating      1=Again 2=Hard 3=Good 4=Easy
     * @param  int        $durationMs  Time spent on card (milliseconds)
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

        $inputData = [
            'last_interval' => (float) $card->interval_days,
            'difficulty'    => $card->difficulty ?? 5.0,
            'stability'     => $card->stability,
            'rating'        => $ratingMap[$rating],
        ];

        $result = $this->rustService->fsrs($inputData, null, [
            'flash_card_id' => $card->id,
        ]);

        if (! $result['success']) {
            $errorMsg = $result['error'] ?? 'FSRS process failed';
            Log::error('FSRS review failed', [
                'card_id'   => $card->id,
                'exit_code' => $result['exit_code'] ?? null,
                'stderr'    => $result['stderr'] ?? null,
                'error'     => $errorMsg,
            ]);
            throw new RuntimeException("FSRS calculation failed: {$errorMsg}");
        }

        $output = json_decode($result['stdout'], true);

        if (
            ! is_array($output)
            || ! isset($output['new_interval'], $output['stability'], $output['difficulty'], $output['next_review'])
        ) {
            throw new RuntimeException('FSRS returned unexpected output format: '.$result['stdout']);
        }

        $intervalDays = (int) round($output['new_interval']);
        $stability    = (float) $output['stability'];
        $difficulty   = (float) $output['difficulty'];
        $nextReview   = $output['next_review'];  // ISO8601

        $card->update([
            'interval_days'    => $intervalDays,
            'stability'        => $stability,
            'difficulty'       => $difficulty,
            'last_reviewed_at' => now(),
            'next_review'      => $nextReview,
        ]);

        return [
            'next_review'   => $nextReview,
            'interval_days' => $intervalDays,
            'stability'     => $stability,
        ];
    }
}

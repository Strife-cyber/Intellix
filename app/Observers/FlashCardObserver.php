<?php

namespace App\Observers;

use App\Models\FlashCard;

class FlashCardObserver
{
    public function creating(FlashCard $card): void
    {
        if (is_null($card->next_review)) {
            $card->next_review = now();
        }

        // No FSRS yet → leave these null unless you want defaults
        $card->last_reviewed_at ??= null;
        $card->stability ??= null;
        $card->difficulty ??= null;
    }

    /**
     * Handle the FlashCard "created" event.
     */
    public function created(FlashCard $flashCard): void
    {
        //
    }

    /**
     * Handle the FlashCard "updated" event.
     */
    public function updated(FlashCard $flashCard): void
    {
        //
    }

    /**
     * Handle the FlashCard "deleted" event.
     */
    public function deleted(FlashCard $flashCard): void
    {
        //
    }

    /**
     * Handle the FlashCard "restored" event.
     */
    public function restored(FlashCard $flashCard): void
    {
        //
    }

    /**
     * Handle the FlashCard "force deleted" event.
     */
    public function forceDeleted(FlashCard $flashCard): void
    {
        //
    }
}

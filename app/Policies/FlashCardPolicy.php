<?php

namespace App\Policies;

use App\Models\FlashCard;
use App\Models\Resource;
use App\Models\User;

class FlashCardPolicy
{
    // ── Collection-level ────────────────────────────────────────────────────

    /**
     * viewAny requires resource_id context — enforced in controller, not here.
     * Return true so controller can apply its own scoping.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    // ── Instance-level ──────────────────────────────────────────────────────

    /**
     * View a card: user has any access to the underlying resource.
     */
    public function view(User $user, FlashCard $flashCard): bool
    {
        /** @var resource $resource */
        $resource = $flashCard->resource;

        return $resource->isAccessibleBy($user);
    }

    /**
     * Create a card for a resource: user must be owner or editor.
     * NOTE: The Resource instance is passed as 2nd arg when checking
     * `Gate::authorize('create', [FlashCard::class, $resource])`.
     */
    public function create(User $user, Resource $resource): bool
    {
        return $resource->isEditableBy($user);
    }

    /**
     * Update: user must own or be able to edit the resource.
     */
    public function update(User $user, FlashCard $flashCard): bool
    {
        /** @var resource $resource */
        $resource = $flashCard->resource;

        return $resource->isEditableBy($user);
    }

    /**
     * Delete: same as update.
     */
    public function delete(User $user, FlashCard $flashCard): bool
    {
        /** @var resource $resource */
        $resource = $flashCard->resource;

        return $resource->isEditableBy($user);
    }

    /**
     * Review: any user with access can review.
     */
    public function review(User $user, FlashCard $flashCard): bool
    {
        /** @var resource $resource */
        $resource = $flashCard->resource;

        return $resource->isAccessibleBy($user);
    }

    // keep stubs for completeness
    public function restore(User $user, FlashCard $flashCard): bool
    {
        return false;
    }

    public function forceDelete(User $user, FlashCard $flashCard): bool
    {
        return false;
    }
}

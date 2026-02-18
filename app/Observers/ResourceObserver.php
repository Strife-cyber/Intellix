<?php

namespace App\Observers;

use App\Enums\AccessRole;
use App\Models\Resource;
use App\Models\User;

class ResourceObserver
{
    /**
     * Handle the Resource "created" event.
     */
    public function created(Resource $resource): void
    {
        $auth_user = auth()->user();
        $user = User::where('id', $auth_user->id)->first();

        if ($user) {
            $resource->grantAccess($user, AccessRole::OWNER->value);
        }
    }

    /**
     * Handle the Resource "updated" event.
     */
    public function updated(Resource $resource): void
    {
        //
    }

    /**
     * Handle the Resource "deleted" event.
     */
    public function deleted(Resource $resource): void
    {
        //
    }

    /**
     * Handle the Resource "restored" event.
     */
    public function restored(Resource $resource): void
    {
        //
    }

    /**
     * Handle the Resource "force deleted" event.
     */
    public function forceDeleted(Resource $resource): void
    {
        //
    }
}

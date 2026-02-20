<?php

namespace App\Policies;

use App\Models\Resource;
use App\Models\User;

class ResourcePolicy
{
    private function role(User $user, Resource $resource)
    {
        return $resource->roleOf($user);
    }

    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return false;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Resource $resource)
    {
        return in_array($this->role($user, $resource), [
            'viewer', 'editor', 'admin', 'owner',
        ]);
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return false;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Resource $resource): bool
    {
        return in_array($this->role($user, $resource), [
            'editor', 'admin', 'owner',
        ]);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Resource $resource): bool
    {
        return in_array($this->role($user, $resource), [
            'admin', 'owner',
        ]);
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Resource $resource): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Resource $resource): bool
    {
        return false;
    }

    /**
     * Determine whether the user can manage access (share) the resource.
     */
    public function manageAccess(User $user, Resource $resource): bool
    {
        return in_array($this->role($user, $resource), ['owner', 'admin']);
    }
}

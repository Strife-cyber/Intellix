<?php

namespace App\Http\Controllers;

use App\Enums\AccessRole;
use App\Models\Resource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class ResourceAccessController extends Controller
{
    /**
     * List all users who have access to this resource.
     */
    public function index(Resource $resource)
    {
        Gate::authorize('manageAccess', $resource);

        return response()->json([
            'data' => $resource->users()->get()->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->pivot->role,
                ];
            }),
        ]);
    }

    /**
     * Grant or invite a user to this resource by email.
     */
    public function store(Request $request, Resource $resource)
    {
        Gate::authorize('manageAccess', $resource);

        $request->validate([
            'email' => 'required|email',
            'role' => 'required|string|in:admin,editor,viewer',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user) {
            return response()->json([
                'message' => 'User not found. In a full implementation, this could send an email invitation.',
            ], 404);
        }

        // Check if already has access
        if ($resource->users()->where('user_id', $user->id)->exists()) {
            // Update existing role
            $resource->users()->updateExistingPivot($user->id, ['role' => $request->role]);
        } else {
            $resource->grantAccess($user, $request->role);
        }

        return response()->json([
            'message' => "Access granted to {$user->name} as ".strtoupper($request->role),
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $request->role,
            ],
        ]);
    }

    /**
     * Update a user's role for this resource.
     */
    public function update(Request $request, Resource $resource, User $user)
    {
        Gate::authorize('manageAccess', $resource);

        $request->validate([
            'role' => 'required|string|in:admin,editor,viewer,owner',
        ]);

        // Prevent downgrading the only owner if needed, but here we trust the manager
        $resource->users()->updateExistingPivot($user->id, ['role' => $request->role]);

        return response()->json(['message' => 'Role updated successfully']);
    }

    /**
     * Revoke a user's access to this resource.
     */
    public function destroy(Resource $resource, User $user)
    {
        Gate::authorize('manageAccess', $resource);

        // Don't allow revoking the owner (simple check)
        $role = $resource->users()->where('user_id', $user->id)->first()?->pivot->role;
        if ($role === AccessRole::OWNER->value) {
            return response()->json(['message' => 'Cannot revoke access from the owner'], 403);
        }

        $resource->users()->detach($user->id);

        return response()->json(['message' => 'Access revoked']);
    }
}

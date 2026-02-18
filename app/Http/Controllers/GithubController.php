<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Routing\Redirector;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Socialite\Socialite;

class GithubController extends Controller
{
    public function redirect()
    {
        return Socialite::driver('github')
            ->scopes(['user:email'])
            ->redirect();
    }

    public function callback(): Redirector|RedirectResponse
    {
        $githubUser = Socialite::driver('github')->stateless()->user();

        $user = User::where('github_id', $githubUser->id)
            ->orWhere('email', $githubUser->email)
            ->first();

        if (! $user) {
            $user = User::create([
                'name' => $githubUser->name ?? $githubUser->nickname,
                'email' => $githubUser->email,
                'github_id' => $githubUser->id,
                'email_verified_at' => now(),
                'password' => Hash::make(Str::random(32)),
            ]);
        } else {
            if (! $user->github_id) {
                $user->update(['github_id' => $githubUser->id]);
            }
        }

        Auth::login($user);

        return redirect('/dashboard');
    }
}

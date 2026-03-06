<?php

namespace App\Providers;

use App\Models\FlashCard;
use App\Models\Resource;
use App\Observers\FlashCardObserver;
use App\Observers\ResourceObserver;
use App\Policies\FlashCardPolicy;
use App\Policies\ResourcePolicy;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();

        Resource::observe(ResourceObserver::class);
        FlashCard::observe(FlashCardObserver::class);

        Gate::policy(Resource::class, ResourcePolicy::class);
        Gate::policy(FlashCard::class, FlashCardPolicy::class);
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null
        );

	if ($this->app->environment('production')) {
            URL::forceScheme('https');
        }
    }
}

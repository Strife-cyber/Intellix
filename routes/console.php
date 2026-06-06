<?php

use App\Console\Commands\ReindexResourcesCommand;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Register the reindex command
Artisan::registerCommand(app()->make(ReindexResourcesCommand::class));

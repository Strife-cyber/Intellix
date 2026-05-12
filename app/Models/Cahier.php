<?php

namespace App\Models;

use Database\Factories\CahierFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Cahier extends Model
{
    /** @use HasFactory<CahierFactory> */
    use HasFactory;

    protected $fillable = [
        'version', 'title', 'description',
        'prosit', 'pdfs', 'zips', 'objectifs',
        'difficultes', 'perspectives',
    ];

    protected $casts = [
        'version' => 'float',
        'pdfs' => 'array',
        'zips' => 'array',
        'objectifs' => 'array',
        'difficultes' => 'array',
        'perspectives' => 'array',
    ];
}

<?php

namespace App\Models;

use Database\Factories\CahierFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @method static create(array $array)
 */
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
        'prosit' => 'array',
        'pdfs' => 'array',
        'zips' => 'array',
        'objectifs' => 'array',
        'difficultes' => 'array',
        'perspectives' => 'array',
    ];
}

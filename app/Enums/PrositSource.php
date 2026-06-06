<?php

namespace App\Enums;

enum PrositSource: string
{
    case MANUAL = 'manual';
    case UPLOADED = 'uploaded';
    case GENERATED = 'generated';
}

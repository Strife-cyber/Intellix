<?php

namespace App\Enums;

enum ResourceStatus: string
{
    case READY = 'ready';
    case FAILED = 'failed';
    case PROCESSING = 'processing';
}

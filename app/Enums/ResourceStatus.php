<?php

namespace App\Enums;

enum ResourceStatus: string
{
    case PENDING = 'pending';
    case READY = 'ready';
    case FAILED = 'failed';
    case PROCESSING = 'processing';
}

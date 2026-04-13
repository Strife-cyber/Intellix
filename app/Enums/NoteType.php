<?php

namespace App\Enums;

enum NoteType: string
{
    case NOTE = 'note';
    case COMMENT = 'comment';
    case ALLER = 'aller';
    case RETOUR = 'retour';
    case OTHER = 'other';
}

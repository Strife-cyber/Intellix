import type { BreadcrumbItem } from '@/types/navigation';

export type * from './auth';
export type * from './navigation';
export type * from './ui';

import type { Auth } from './auth';
import { useState } from 'react';

export type SharedData = {
    name: string;
    auth: Auth;
    sidebarOpen: boolean;
    [key: string]: unknown;
};

export type Resource = {
    id: string;
    original_name: string;
    mime_type: string;
    size_bytes: number;
    created_at: string;
    updated_at: string;
    pivot: {
        role: string;
    };
    s3_key: string;
};

export type Prosit = {
    id: string;
    chapter_id: string;
    mots_cles: string | null;
    contexte: string | null;
    besoin: string | null;
    problematique: string;
    generalisation: string | null;
    piste_de_solution: string | null;
    plan_d_action: string | null;
    texte: string | null;
    chapter: {
        id: string;
        title: string;
        course: { id: string; title: string };
    };
};

export type Chapter = {
    id: string;
    title: string;
    course: { id: string; title: string };
}

export type Question = {
    id: string;
    type: string;
    question_text: string;
    marks: number;
    difficulty: string | null;
    explanation: string;
    options: string[] | null;
    correct_option: string | null;
    correct_boolean: boolean | null;
    expected_answer: string | null;
    competence: { title: string; taxonomy_level: string } | null;
}

export type Exam = {
    id: string;
    prosit_id: string;
    generated_by_ai: boolean;
    total_marks: number;
    questions: Question[];
    prosit: Prosit;
}

export type Course = {
    id: string;
    title: string;
    description: string;
    cover_image: string | null;
    chapters: Chapter[];
}

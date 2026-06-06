<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Seo\SeoMeta;

class SeoMetaSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $ogImage = '/storage/brand/social-preview.svg';

        $seoData = [
            'home' => [
                'title' => 'IntelliX - AI-Powered Learning Platform for Deep Work & Academic Excellence',
                'description' => 'IntelliX is an AI-native learning operating system. Upload documents, generate spaced repetition flashcards, chat with your knowledge base, and ace your exams with our intelligent study platform.',
                'keywords' => 'AI learning platform, spaced repetition flashcards, study planner, document intelligence, PBA learning, academic tools, exam preparation, knowledge management',
                'canonical_url' => config('app.url', '/'),
                'og_title' => 'IntelliX - The AI-Native Learning Operating System',
                'og_description' => 'Upload documents. Generate smart flashcards with spaced repetition. Chat with your knowledge base. Ace your exams. The first AI-powered learning platform designed for deep work and academic rigor.',
                'og_image' => $ogImage,
                'twitter_title' => 'IntelliX - AI Learning Platform',
                'twitter_description' => 'Upload documents, generate flashcards, chat with your knowledge base. The AI-native learning OS for deep work.',
                'twitter_image' => $ogImage,
                'robots' => 'index, follow',
            ],
            'dashboard' => [
                'title' => 'Dashboard | IntelliX - AI Learning Platform',
                'description' => 'Your personal AI learning dashboard. Track your progress, review flashcards, manage documents, and monitor your study streaks.',
                'keywords' => 'learning dashboard, study tracker, AI study assistant, progress tracking',
                'canonical_url' => config('app.url') . '/dashboard',
                'og_title' => 'Dashboard - IntelliX',
                'og_description' => 'Your personal AI learning dashboard. Track study progress and manage materials.',
                'og_image' => $ogImage,
                'robots' => 'noindex, nofollow', // Auth-protected page
            ],
            'library' => [
                'title' => 'Document Library | IntelliX - AI Learning Platform',
                'description' => 'Browse and manage your uploaded documents. PDF, DOCX, EPUB, and web articles processed by AI for intelligent study.',
                'keywords' => 'document library, file management, study materials, PDF processing',
                'canonical_url' => config('app.url') . '/library',
                'og_title' => 'Document Library - IntelliX',
                'og_description' => 'Upload and manage documents for AI-powered study and flashcard generation.',
                'og_image' => $ogImage,
                'robots' => 'noindex, nofollow',
            ],
            'flashcards-page' => [
                'title' => 'Smart Flashcards | IntelliX - Spaced Repetition Learning',
                'description' => 'Master any subject with AI-powered flashcards featuring FSRS spaced repetition algorithm. Generate flashcards automatically from your documents.',
                'keywords' => 'flashcards, spaced repetition, FSRS algorithm, memory retention, active recall',
                'canonical_url' => config('app.url') . '/flashcards-page',
                'og_image' => $ogImage,
                'robots' => 'noindex, nofollow',
            ],
            'study-planner' => [
                'title' => 'Study Planner | IntelliX - Plan Your Learning Journey',
                'description' => 'Plan your study schedule with AI-powered recommendations. Track deadlines, manage flashcard reviews, and build consistent study habits.',
                'keywords' => 'study planner, schedule, exam preparation, time management, study habits',
                'canonical_url' => config('app.url') . '/study-planner',
                'og_image' => $ogImage,
                'robots' => 'noindex, nofollow',
            ],
            'upload' => [
                'title' => 'Upload Documents | IntelliX - AI Document Processing',
                'description' => 'Upload PDF, DOCX, EPUB, TXT files. Our AI processes your documents to generate flashcards, summaries, and interactive study materials.',
                'keywords' => 'upload documents, PDF processing, AI document analysis, file upload',
                'canonical_url' => config('app.url') . '/upload',
                'og_image' => $ogImage,
                'robots' => 'noindex, nofollow',
            ],
            'courses' => [
                'title' => 'PBA Learning Courses | IntelliX - Problem-Based Approach',
                'description' => 'Problem-Based Approach learning platform. Create structured courses with chapters, competencies, and prosits for deep understanding.',
                'keywords' => 'PBA learning, problem-based approach, courses, competency-based education',
                'canonical_url' => config('app.url') . '/courses',
                'og_image' => $ogImage,
                'robots' => 'noindex, nofollow',
            ],
            'exams' => [
                'title' => 'Exams & Assessments | IntelliX - AI-Powered Testing',
                'description' => 'Generate and take practice exams from your study materials. AI-powered assessments to evaluate your knowledge.',
                'keywords' => 'exams, assessments, practice tests, AI evaluation, exam preparation',
                'canonical_url' => config('app.url') . '/exams',
                'og_image' => $ogImage,
                'robots' => 'noindex, nofollow',
            ],
            'cers' => [
                'title' => 'CER Report Generation | IntelliX - Academic Documentation',
                'description' => 'Generate professional CER (Compte Rendu) reports from your prosits and course materials with AI-powered document generation.',
                'keywords' => 'CER, report generation, academic writing, documentation, prosits',
                'canonical_url' => config('app.url') . '/cers',
                'og_image' => $ogImage,
                'robots' => 'noindex, nofollow',
            ],
        ];

        foreach ($seoData as $pageName => $data) {
            $data['page_name'] = $pageName;
            SeoMeta::create($data);
        }
    }
}

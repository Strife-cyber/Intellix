<?php

namespace Database\Seeders;

use App\Models\Chapter;
use App\Models\Competence;
use App\Models\Course;
use App\Models\Prosit;
use App\Models\Resource;
use Illuminate\Database\Seeder;

class PbaPlatformSeeder extends Seeder
{
    public function run(): void
    {
        $course = Course::create([
            'title' => 'Software Engineering Lifecycle',
            'description' => 'A comprehensive course on modern software engineering paradigms, focusing on the Problem-Based Approach.',
        ]);

        $chapter = Chapter::create([
            'course_id' => $course->id,
            'title' => 'Foundations of Web Services',
            'description' => 'Understanding the core mechanisms of client-server architecture and API development.',
            'order_index' => 1,
            'estimated_duration' => 120, // 2 hours
        ]);

        $prosit = Prosit::create([
            'chapter_id' => $chapter->id,
            'mots_cles' => 'API, REST architecture, AI Integration, Security',
            'besoin' => 'Design an API that allows interaction with LM Studio, enforcing strict JSON output.',
            'problematique' => 'Your development team has been tasked with integrating a local AI model (LM Studio) into an existing Laravel application. You need to design the architecture, establish resilient API communication, and ensure the system respects strict JSON schemas for data ingestion.',
            'contexte' => 'The system currently uses standard MVC patterns but lacks any intelligent capabilities. You must act as the Lead Architect to bridge the Laravel backend and the Rust-based AI ingestion pipeline.',
            'generalisation' => 'AI System Architecture',
            'piste_de_solution' => '- What if we use gRPC instead of REST?\n- Could we offload generation to a queue?',
            'plan_d_action' => '- Step 1: Design REST structure\n- Step 2: Ensure schema validation\n- Step 3: Integrate with LM Studio',
            'texte' => 'This is the full descriptive text of the module... [Detailed specifications of Laravel backend integration with local LM Studio APIs].',
        ]);

        Competence::create([
            'prosit_id' => $prosit->id,
            'title' => 'API Design & Resilience',
            'description' => 'Ability to design and implement fault-tolerant API communication between distributed systems.',
            'taxonomy_level' => 'apply',
            'weight' => 50,
        ]);

        Competence::create([
            'prosit_id' => $prosit->id,
            'title' => 'Prompt Engineering Structure',
            'description' => 'Formulating precise system instructions for deterministic JSON extraction from LLMs.',
            'taxonomy_level' => 'create',
            'weight' => 50,
        ]);

        // Give the admin user a resource attached to this prosit
        $user = \App\Models\User::first();
        if ($user) {
            Resource::create([
                'user_id' => $user->id,
                'prosit_id' => $prosit->id,
                'original_name' => 'Restful_API_Guidelines.pdf',
                'mime_type' => 'application/pdf',
                'size_bytes' => 102400,
                's3_key' => 'dummy/path.pdf',
                'status' => 'ready',
                'type' => 'reference_material',
            ]);
        }
    }
}

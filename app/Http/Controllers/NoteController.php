<?php

namespace App\Http\Controllers;

use App\Enums\NoteType;
use App\Http\Requests\StoreNoteRequest;
use App\Http\Requests\UpdateNoteRequest;
use App\Models\Course;
use App\Models\Note;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class NoteController extends Controller
{
    use AuthorizesRequests;

    /**
     * Get shared sidebar data.
     */
    protected function getSidebarData(): array
    {
        return [
            'recent_notes' => Note::where('user_id', Auth::id())
                ->whereNull('parent_id')
                ->latest()
                ->take(5)
                ->get(),
            'courses' => Course::all(),
            'note_types' => NoteType::cases(),
        ];
    }

    /**
     * Display a listing of the user's notes.
     */
    public function index(Request $request): Response
    {
        $query = Note::where('user_id', Auth::id())
            ->whereNull('parent_id')
            ->with('versions');

        if ($request->has('course_id')) {
            $query->where('course_id', $request->input('course_id'));
        }

        return Inertia::render('notes/index', [
            'notes' => $query->latest()->paginate(15),
            ...$this->getSidebarData(),
        ]);
    }

    /**
     * Show the form for creating a new note.
     */
    public function create(): Response
    {
        return Inertia::render('notes/create', [
            ...$this->getSidebarData(),
        ]);
    }

    /**
     * Store a new note or a new version of a note.
     */
    public function store(StoreNoteRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $user = Auth::user();
        $version = 1;
        $parentId = $validated['parent_id'] ?? null;

        if ($validated['type'] === NoteType::RETOUR->value && $parentId) {
            $parentNote = Note::findOrFail($parentId);
            $this->authorize('update', $parentNote);

            $parentId = $parentNote->parent_id ?? $parentNote->id;
            $latestVersion = Note::where('parent_id', $parentId)->orWhere('id', $parentId)->max('version');
            $version = $latestVersion + 1;
        }

        $note = $user->notes()->create([
            'title' => $validated['title'],
            'slug' => Str::slug($validated['title']),
            'content' => json_decode($validated['content'], true),
            'type' => $validated['type'],
            'version' => $version,
            'parent_id' => $parentId,
            'course_id' => $validated['course_id'] ?? null,
        ]);

        return redirect()->route('notes.show', $note->id);
    }

    /**
     * Display the specified note.
     */
    public function show(Note $note): Response
    {
        $this->authorize('view', $note);
        
        $note->load(['parent.versions', 'versions', 'course']);

        // If it's a version, we want to show the full chain
        $rootNote = $note->parent_id ? $note->parent : $note;
        $allVersions = Note::where('id', $rootNote->id)
            ->orWhere('parent_id', $rootNote->id)
            ->orderBy('version', 'desc')
            ->get();

        return Inertia::render('notes/show', [
            'note' => $note,
            'root_note' => $rootNote,
            'all_versions' => $allVersions,
            ...$this->getSidebarData(),
        ]);
    }

    /**
     * Show the form for editing the specified note.
     */
    public function edit(Note $note): Response
    {
        $this->authorize('update', $note);
        
        $note->load(['course']);
        return Inertia::render('notes/edit', [
            'note' => $note,
            ...$this->getSidebarData(),
        ]);
    }

    /**
     * Update the specified note.
     */
    public function update(UpdateNoteRequest $request, Note $note): RedirectResponse
    {
        $this->authorize('update', $note);
        
        $validated = $request->validated();
        if (isset($validated['title'])) {
            $validated['slug'] = Str::slug($validated['title']);
        }

        if (isset($validated['content'])) {
            $validated['content'] = json_decode($validated['content'], true);
        }

        $note->update($validated);

        return redirect()->back();
    }

    /**
     * Remove the specified note from storage.
     */
    public function destroy(Note $note): RedirectResponse
    {
        $this->authorize('delete', $note);
        
        $note->delete();

        return redirect()->route('notes.index');
    }

    /**
     * Handle image uploads for the editor.
     */
    public function upload(Request $request)
    {
        $request->validate([
            'file' => 'required|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
        ]);

        $path = $request->file('file')->store('editor-uploads', 'public');

        return response()->json(['url' => Storage::url($path)]);
    }
}

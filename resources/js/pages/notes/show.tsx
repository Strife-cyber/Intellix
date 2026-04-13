import type { Block } from '@blocknote/core';
import { Head, useForm, Link } from '@inertiajs/react';
import { Save, History, ArrowLeft, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import NoteEditor from '@/components/notes/note-editor';
import AppLayout from '@/layouts/app-layout';
import * as notesRoutes from '@/routes/notes';
import { type BreadcrumbItem } from '@/types';

interface Note {
    id: number;
    title: string;
    content: never;
    type: string;
    version: number;
    parent_id: number | null;
    created_at: string;
}

interface Props {
    note: Note;
    root_note: Note;
    all_versions: Note[];
    recent_notes: Note[];
    note_types: string[];
}

const Show: React.FC<Props> = ({ note, root_note, all_versions }) => {
    const [isSaving, setIsSaving] = useState(false);

    // Form for updating CURRENT note
    const updateForm = useForm({
        content: JSON.stringify(note.content),
        title: note.title,
    });

    // Form for creating NEW version (Retour)
    const versionForm = useForm({
        title: `Retour: ${root_note.title} (v${all_versions.length + 1})`,
        content: JSON.stringify(note.content),
        type: 'retour',
        parent_id: root_note.id,
    });

    const handleNoteChange = (blocks: Block[]) => {
        const jsonContent = JSON.stringify(blocks);
        updateForm.setData('content', jsonContent);
        versionForm.setData('content', jsonContent);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        updateForm.put(notesRoutes.update(note.id).url, {
            onFinish: () => setIsSaving(false),
        });
    };

    const handleCreateVersion = () => {
        if (confirm('Create a new version (Retour) from current content?')) {
            versionForm.post(notesRoutes.store().url);
        }
    };

    const handleDelete = () => {
        if (confirm('Are you sure you want to delete this note?')) {
            updateForm.delete(notesRoutes.destroy(note.id).url);
        }
    }

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Notes', href: notesRoutes.index().url },
        { title: note.title, href: notesRoutes.show(note.id).url },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={note.title} />
            <div className="flex h-full overflow-hidden bg-background text-foreground">
                <main className="flex min-w-0 flex-1 flex-col">
                    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
                        <div className="flex items-center gap-4">
                            <Link
                                href={notesRoutes.index().url}
                                className="rounded-full p-2 transition-colors hover:bg-accent"
                            >
                                <ArrowLeft size={20} />
                            </Link>
                            <div>
                                <h1 className="text-lg leading-tight font-bold">
                                    {note.title}
                                </h1>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="capitalize">
                                        {note.type}
                                    </span>
                                    <span>•</span>
                                    <span>Version {note.version}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleCreateVersion}
                                disabled={versionForm.processing}
                                className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm transition-colors hover:bg-accent"
                            >
                                <History size={16} />
                                Create Retour (v{all_versions.length + 1})
                            </button>

                            <button
                                onClick={handleSave}
                                disabled={updateForm.processing || isSaving}
                                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                            >
                                <Save size={16} />
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>

                            <div className="mx-1 h-6 w-px bg-border" />

                            <button
                                onClick={handleDelete}
                                className="rounded-md p-2 transition-colors hover:bg-destructive/10 hover:text-destructive"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </header>

                    <div className="flex flex-1 overflow-hidden">
                        <div className="flex-1 overflow-y-auto bg-card p-12">
                            <div className="mx-auto max-w-4xl">
                                <NoteEditor
                                    initialContent={note.content}
                                    onChange={handleNoteChange}
                                    editable={true}
                                />
                            </div>
                        </div>

                        <aside className="flex w-64 flex-col border-l border-border bg-background">
                            <div className="flex items-center gap-2 border-b border-border p-4 text-sm font-semibold">
                                <History size={16} />
                                Version History
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                <ul className="divide-y divide-border">
                                    {all_versions.map((v) => (
                                        <li key={v.id}>
                                            <Link
                                                href={
                                                    notesRoutes.show(v.id).url
                                                }
                                                className={`block p-4 transition-colors hover:bg-accent/50 ${
                                                    v.id === note.id
                                                        ? 'border-l-2 border-primary bg-accent'
                                                        : ''
                                                }`}
                                            >
                                                <div className="mb-1 flex items-start justify-between">
                                                    <span className="text-sm font-medium">
                                                        Version {v.version}
                                                    </span>
                                                    <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] uppercase">
                                                        {v.type}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(
                                                        v.created_at,
                                                    ).toLocaleString()}
                                                </p>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </aside>
                    </div>
                </main>
            </div>
        </AppLayout>
    );
};

export default Show;

import { Head, useForm, Link } from '@inertiajs/react';
import { FileText, ArrowLeft } from 'lucide-react';
import React from 'react';
import NoteSidebar from '@/components/notes/note-sidebar';
import AppLayout from '@/layouts/app-layout';
import * as notesRoutes from '@/routes/notes';
import { type BreadcrumbItem } from '@/types';
import type { Course } from '@/types';

interface Note {
    id: number;
    title: string;
    type: string;
    course_id: number | null;
}

interface Props {
    note: Note;
    recent_notes: any[];
    courses: Course[];
    note_types: string[];
}

const Edit: React.FC<Props> = ({ note, recent_notes, courses, note_types }) => {
    const { data, setData, put, processing, errors } = useForm({
        title: note.title,
        type: note.type,
        course_id: note.course_id?.toString() || '',
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Notes', href: notesRoutes.index().url },
        { title: note.title, href: notesRoutes.show(note.id).url },
        { title: 'Edit Settings', href: notesRoutes.edit(note.id).url },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(notesRoutes.update(note.id).url);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit ${note.title}`} />
            <div className="flex h-full overflow-hidden bg-background text-foreground">
                <main className="flex min-w-0 flex-1 flex-col">
                    <header className="flex h-16 items-center gap-4 border-b border-border bg-card px-6">
                        <Link
                            href={notesRoutes.show(note.id).url}
                            className="rounded-full p-2 transition-colors hover:bg-accent"
                        >
                            <ArrowLeft size={20} />
                        </Link>
                        <h1 className="flex items-center gap-2 text-xl font-bold">
                            <FileText size={20} className="text-primary" />
                            Edit Note Settings
                        </h1>
                    </header>

                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="mx-auto max-w-2xl rounded-lg border border-border bg-card p-8 shadow-sm">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-muted-foreground">
                                        Title
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full rounded-md border border-input bg-background px-4 py-2 text-base outline-none focus:ring-2 focus:ring-primary/50"
                                        value={data.title}
                                        onChange={(e) =>
                                            setData('title', e.target.value)
                                        }
                                        placeholder="Note Title"
                                        required
                                    />
                                    {errors.title && (
                                        <p className="mt-1 text-xs text-red-500">
                                            {errors.title}
                                        </p>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-muted-foreground">
                                            Type
                                        </label>
                                        <select
                                            className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                                            value={data.type}
                                            onChange={(e) =>
                                                setData('type', e.target.value)
                                            }
                                        >
                                            {(note_types ?? []).map((type) => (
                                                <option key={type} value={type}>
                                                    {type
                                                        .charAt(0)
                                                        .toUpperCase() +
                                                        type.slice(1)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-muted-foreground">
                                            Course
                                        </label>
                                        <select
                                            className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                                            value={data.course_id}
                                            onChange={(e) =>
                                                setData(
                                                    'course_id',
                                                    e.target.value,
                                                )
                                            }
                                        >
                                            <option value="">None</option>
                                            {(courses ?? []).map((course) => (
                                                <option
                                                    key={course.id}
                                                    value={course.id}
                                                >
                                                    {course.title}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <Link
                                        href={notesRoutes.show(note.id).url}
                                        className="rounded-md border border-border px-6 py-2 text-sm font-medium transition-colors hover:bg-accent"
                                    >
                                        Cancel
                                    </Link>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                                    >
                                        {processing
                                            ? 'Saving...'
                                            : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </main>
                <NoteSidebar recentNotes={recent_notes ?? []} />
            </div>
        </AppLayout>
    );
};

export default Edit;

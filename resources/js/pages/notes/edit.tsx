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
            <div className="flex h-full bg-background text-foreground overflow-hidden">
                <main className="flex-1 flex flex-col min-w-0">
                    <header className="h-16 border-b border-border flex items-center px-6 bg-card gap-4">
                        <Link href={notesRoutes.show(note.id).url} className="p-2 hover:bg-accent rounded-full transition-colors">
                            <ArrowLeft size={20} />
                        </Link>
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            <FileText size={20} className="text-primary" />
                            Edit Note Settings
                        </h1>
                    </header>

                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="max-w-2xl mx-auto bg-card border border-border rounded-lg p-8 shadow-sm">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-muted-foreground">Title</label>
                                    <input
                                        type="text"
                                        className="w-full bg-background border border-input rounded-md px-4 py-2 outline-none focus:ring-2 focus:ring-primary/50 text-base"
                                        value={data.title}
                                        onChange={(e) => setData('title', e.target.value)}
                                        placeholder="Note Title"
                                        required
                                    />
                                    {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-muted-foreground">Type</label>
                                        <select
                                            className="w-full bg-background border border-input rounded-md px-4 py-2 outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                                            value={data.type}
                                            onChange={(e) => setData('type', e.target.value)}
                                        >
                                            {note_types.map((type) => (
                                                <option key={type} value={type}>
                                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-muted-foreground">Course</label>
                                        <select
                                            className="w-full bg-background border border-input rounded-md px-4 py-2 outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                                            value={data.course_id}
                                            onChange={(e) => setData('course_id', e.target.value)}
                                        >
                                            <option value="">None</option>
                                            {courses.map((course) => (
                                                <option key={course.id} value={course.id}>
                                                    {course.title}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end gap-3">
                                    <Link
                                        href={notesRoutes.show(note.id).url}
                                        className="px-6 py-2 border border-border rounded-md hover:bg-accent transition-colors text-sm font-medium"
                                    >
                                        Cancel
                                    </Link>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
                                    >
                                        {processing ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </main>
                <NoteSidebar recentNotes={recent_notes} />
            </div>
        </AppLayout>
    );
};

export default Edit;

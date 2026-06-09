import { Head, Link } from '@inertiajs/react';
import { Plus, Search, Filter, FileText, ChevronRight } from 'lucide-react';
import React from 'react';
import NoteSidebar from '@/components/notes/note-sidebar';
import AppLayout from '@/layouts/app-layout';
import * as notesRoutes from '@/routes/notes';
import type { Course } from '@/types';
import { type BreadcrumbItem } from '@/types';

interface Props {
    notes: {
        data: Array<{
            id: number;
            title: string;
            type: string;
            created_at: string;
            version: number;
        }>;
        links: any[];
    };
    recent_notes: any[];
    courses: Course[];
    note_types: string[];
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Notes',
        href: notesRoutes.index().url,
    },
];

const Index: React.FC<Props> = ({ notes, recent_notes }) => {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Engineering Notes" />
            <div className="flex h-full overflow-hidden bg-background text-foreground">
                <main className="flex min-w-0 flex-1 flex-col">
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="mx-auto max-w-4xl">
                            <div className="mb-6 flex items-center gap-4">
                                <div className="relative flex-1 text-sm">
                                    <Search
                                        className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
                                        size={16}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Search notes..."
                                        className="w-full rounded-md border border-input bg-card py-2 pr-4 pl-10 outline-none focus:ring-2 focus:ring-primary/50"
                                    />
                                </div>
                                <button className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm transition-colors hover:bg-accent">
                                    <Filter size={16} />
                                    Filter
                                </button>
                            </div>

                            <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
                                <ul className="divide-y divide-border">
                                    {(notes?.data ?? []).map((note) => (
                                        <li key={note.id}>
                                            <Link
                                                href={
                                                    notesRoutes.show(note.id)
                                                        .url
                                                }
                                                className="group flex items-center justify-between px-6 py-4 transition-colors hover:bg-accent/50"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                                                        <FileText size={20} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-lg leading-tight font-semibold">
                                                            {note.title}
                                                        </h3>
                                                        <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                                                            <span className="rounded bg-secondary px-2 py-0.5 text-[10px] font-medium tracking-wide capitalize">
                                                                {note.type}
                                                            </span>
                                                            <span>•</span>
                                                            <span className="text-xs">
                                                                Version{' '}
                                                                {note.version}
                                                            </span>
                                                            <span>•</span>
                                                            <span className="text-xs">
                                                                {new Date(
                                                                    note.created_at,
                                                                ).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <ChevronRight
                                                    className="text-muted-foreground transition-transform group-hover:translate-x-1"
                                                    size={18}
                                                />
                                            </Link>
                                        </li>
                                    ))}
                                    {(notes?.data ?? []).length === 0 && (
                                        <li className="px-6 py-12 text-center text-muted-foreground">
                                            <FileText
                                                className="mx-auto mb-4 opacity-20"
                                                size={48}
                                            />
                                            <p className="text-lg font-medium">
                                                No notes found
                                            </p>
                                            <p className="mb-4 text-sm">
                                                Create your first note to get
                                                started.
                                            </p>
                                            <Link
                                                href={notesRoutes.create().url}
                                                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                                            >
                                                <Plus size={16} />
                                                Create Note
                                            </Link>
                                        </li>
                                    )}
                                </ul>
                            </div>
                        </div>
                    </div>
                </main>
                <NoteSidebar recentNotes={recent_notes ?? []} />
            </div>
        </AppLayout>
    );
};

export default Index;

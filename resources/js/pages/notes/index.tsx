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
            <div className="flex h-full bg-background text-foreground overflow-hidden">
                <main className="flex-1 flex flex-col min-w-0">
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="max-w-4xl mx-auto">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="relative flex-1 text-sm">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search notes..."
                                        className="w-full bg-card border border-input rounded-md pl-10 pr-4 py-2 outline-none focus:ring-2 focus:ring-primary/50"
                                    />
                                </div>
                                <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors text-sm">
                                    <Filter size={16} />
                                    Filter
                                </button>
                            </div>

                            <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
                                <ul className="divide-y divide-border">
                                    {notes.data.map((note) => (
                                        <li key={note.id}>
                                            <Link
                                                href={notesRoutes.show(note.id).url}
                                                className="flex items-center justify-between px-6 py-4 hover:bg-accent/50 transition-colors group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                                        <FileText size={20} />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-lg leading-tight">{note.title}</h3>
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                                            <span className="capitalize px-2 py-0.5 bg-secondary rounded text-[10px] font-medium tracking-wide">{note.type}</span>
                                                            <span>•</span>
                                                            <span className="text-xs">Version {note.version}</span>
                                                            <span>•</span>
                                                            <span className="text-xs">{new Date(note.created_at).toLocaleDateString()}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <ChevronRight className="text-muted-foreground group-hover:translate-x-1 transition-transform" size={18} />
                                            </Link>
                                        </li>
                                    ))}
                                    {notes.data.length === 0 && (
                                        <li className="px-6 py-12 text-center text-muted-foreground">
                                            <FileText className="mx-auto mb-4 opacity-20" size={48} />
                                            <p className="text-lg font-medium">No notes found</p>
                                            <p className="text-sm">Create your first note to get started.</p>
                                        </li>
                                    )}
                                </ul>
                            </div>
                        </div>
                    </div>
                </main>
                <NoteSidebar recentNotes={recent_notes} />
            </div>
        </AppLayout>
    );
};

export default Index;

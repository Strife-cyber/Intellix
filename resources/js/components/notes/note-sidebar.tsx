import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import { PlusCircle, FileText, Clock } from 'lucide-react';
import * as notes from '@/routes/notes';

interface Note {
    id: number;
    title: string;
    type: string;
    created_at: string;
}

interface SidebarProps {
    recentNotes: Note[];
}

const NoteSidebar: React.FC<SidebarProps> = ({ recentNotes }) => {
    const { url } = usePage();

    return (
        <aside className="w-64 flex flex-col border-l border-border bg-card">
            <div className="p-4 border-b border-border">
                <Link
                    href={notes.create().url}
                    className="flex items-center gap-2 w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                    <PlusCircle size={18} />
                    <span className="font-medium">New Note</span>
                </Link>
            </div>

            <nav className="flex-1 overflow-y-auto p-4 space-y-6">
                <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Clock size={14} />
                        Recent Notes
                    </h3>
                    <ul className="space-y-1">
                        {recentNotes.map((note) => (
                            <li key={note.id}>
                                <Link
                                    href={notes.show(note.id).url}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                                        url.includes(`/notes/${note.id}`)
                                            ? 'bg-accent text-accent-foreground font-medium'
                                            : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
                                    }`}
                                >
                                    <FileText size={14} />
                                    <span className="truncate">{note.title}</span>
                                </Link>
                            </li>
                        ))}
                        {recentNotes.length === 0 && (
                            <li className="text-sm text-muted-foreground italic px-3 py-2">
                                No notes yet.
                            </li>
                        )}
                    </ul>
                </div>

                <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                        <FileText size={14} />
                        All Notes
                    </h3>
                    <Link
                        href={notes.index().url}
                        className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                            url === '/notes'
                                ? 'bg-accent text-accent-foreground font-medium'
                                : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
                        }`}
                    >
                        View All
                    </Link>
                </div>
            </nav>
        </aside>
    );
};

export default NoteSidebar;

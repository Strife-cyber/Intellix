import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import { LayoutGrid, Notebook, UploadCloud, Calendar, Layers2Icon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { dashboard, upload, flashcards } from '@/routes';
import notes from '@/routes/notes';
import studyPlanner from '@/routes/study-planner';

const navItems = [
    { title: 'Home', href: dashboard().url, icon: LayoutGrid },
    { title: 'Notes', href: notes.index().url, icon: Notebook },
    { title: 'Upload', href: upload().url, icon: UploadCloud },
    { title: 'Planner', href: studyPlanner.index().url, icon: Calendar },
    { title: 'Flashcards', href: flashcards().url, icon: Layers2Icon },
];

export const BottomNav: React.FC = () => {
    const url = usePage().url;

    return (
        <nav className="fixed inset-x-0 bottom-0 z-50 block border-t bg-background/95 backdrop-blur-lg supports-[backdrop-filter]:bg-background/80 md:hidden">
            <div className="flex items-center justify-around px-2 py-1">
                {navItems.map((item) => {
                    const isActive = url.startsWith(item.href);
                    return (
                        <Link
                            key={item.title}
                            href={item.href}
                            className={cn(
                                'flex flex-col items-center gap-0.5 px-3 py-2 text-[10px] font-medium transition-colors min-w-0',
                                isActive
                                    ? 'text-primary'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            <item.icon className="h-5 w-5" />
                            <span className="truncate">{item.title}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
};

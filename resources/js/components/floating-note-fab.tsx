import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { router } from '@inertiajs/react';
import * as notesRoutes from '@/routes/notes';

interface QuickCaptureModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const QuickCaptureModal: React.FC<QuickCaptureModalProps> = ({
    isOpen,
    onClose,
}) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        router.post(notesRoutes.store().url, {
            title,
            content,
            type: 'quick-capture',
        });

        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
            <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Quick Capture</h2>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label
                            htmlFor="title"
                            className="mb-1 block text-sm font-medium text-foreground"
                        >
                            Title
                        </label>
                        <input
                            id="title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-primary/50"
                            required
                        />
                    </div>
                    <div className="mb-6">
                        <label
                            htmlFor="content"
                            className="mb-1 block text-sm font-medium text-foreground"
                        >
                            Content
                        </label>
                        <textarea
                            id="content"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="h-32 w-full rounded-md border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-primary/50"
                            required
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-md border border-border px-4 py-2 text-sm transition-colors hover:bg-accent"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground transition-colors hover:bg-primary/90"
                        >
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const FloatingNoteFAB: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            setIsModalOpen(true);
        }
    };

    React.useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    return (
        <div className="group fixed right-6 bottom-6 z-40">
            {/* Tooltip hint */}
            <div className="absolute right-16 bottom-3 hidden animate-in items-center gap-2 rounded-lg border bg-popover px-3 py-1.5 text-xs font-medium text-popover-foreground shadow-md fade-in slide-in-from-right-2 group-hover:flex">
                <kbd className="rounded-md border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                    {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+K
                </kbd>
                Quick Note
            </div>

            <button
                onClick={() => setIsModalOpen(true)}
                className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-700 text-white shadow-lg shadow-violet-500/30 transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-violet-500/40 focus:ring-2 focus:ring-violet-500/50 focus:outline-none active:scale-95"
            >
                {/* Pulsing ring */}
                <span className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 opacity-30 blur-md transition-opacity duration-300 group-hover:opacity-50" />

                {/* Inner icon */}
                <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm transition-transform duration-300 group-hover:rotate-90">
                    <Plus className="h-5 w-5" />
                </span>
            </button>

            <QuickCaptureModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </div>
    );
};

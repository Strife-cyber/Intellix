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
        <div className="fixed right-8 bottom-8 z-40">
            <button
                onClick={() => setIsModalOpen(true)}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-colors hover:bg-primary/90 focus:ring-2 focus:ring-primary/50 focus:outline-none"
            >
                <Plus size={24} />
            </button>
            <QuickCaptureModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </div>
    );
};

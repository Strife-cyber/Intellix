import { useRef, useState, useCallback, useEffect } from 'react';
import {
    UploadCloud,
    FileUp,
    MousePointerClick,
    ClipboardPaste,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface UploadDropzoneProps {
    onFilesAdded: (files: File[]) => void;
    isUploading?: boolean;
}

export function UploadDropzone({
    onFilesAdded,
    isUploading,
}: UploadDropzoneProps) {
    const [isDragOver, setIsDragOver] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isUploading) setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        if (isUploading) return;

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            onFilesAdded(files);
        }
    };

    const handlePaste = useCallback(
        (e: ClipboardEvent) => {
            if (isUploading) return;

            const items = e.clipboardData?.items;
            if (!items) return;

            const files: File[] = [];
            for (let i = 0; i < items.length; i++) {
                if (items[i].kind === 'file') {
                    const file = items[i].getAsFile();
                    if (file) files.push(file);
                }
            }

            if (files.length > 0) {
                onFilesAdded(files);
            }
        },
        [onFilesAdded, isUploading],
    );

    useEffect(() => {
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [handlePaste]);

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isUploading && inputRef.current?.click()}
            className={cn(
                'group relative flex min-h-[300px] w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 ease-in-out',
                isDragOver
                    ? 'scale-[0.99] border-primary bg-primary/5 ring-4 ring-primary/10'
                    : 'border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/50',
                isUploading && 'cursor-not-allowed opacity-50',
            )}
        >
            <input
                ref={inputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) onFilesAdded(files);
                    e.target.value = ''; // Reset to allow adding same file again
                }}
            />

            <div className="flex flex-col items-center gap-6 p-10 text-center">
                <div
                    className={cn(
                        'relative flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3',
                        isDragOver && 'animate-bounce',
                    )}
                >
                    {isDragOver ? (
                        <FileUp className="h-10 w-10" />
                    ) : (
                        <UploadCloud className="h-10 w-10" />
                    )}

                    {/* Decorative elements */}
                    <div className="absolute -top-2 -right-2 flex h-6 w-6 scale-0 items-center justify-center rounded-full border-2 border-primary bg-background transition-transform delay-100 duration-300 group-hover:scale-100">
                        <MousePointerClick className="h-3 w-3 text-primary" />
                    </div>
                </div>

                <div className="max-w-sm space-y-2">
                    <h3 className="text-xl font-bold tracking-tight">
                        {isDragOver
                            ? 'Release to upload instantly'
                            : 'Drop files to upload instantly'}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                        Drag and drop your files here, or{' '}
                        <span className="font-medium text-primary">browse</span>
                        .
                        <br />
                        <span className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">
                            <ClipboardPaste className="h-3 w-3" /> Paste
                            (Ctrl+V) supported
                        </span>
                    </p>
                </div>

                <div className="mt-2 flex flex-wrap justify-center gap-3">
                    {['Images', 'Audio', 'PDFs', 'Docs'].map((type) => (
                        <span
                            key={type}
                            className="rounded-full border border-secondary bg-secondary/50 px-2 py-1 text-[11px] font-medium text-secondary-foreground"
                        >
                            {type}
                        </span>
                    ))}
                </div>
            </div>

            {/* Background patterns/glows */}
            <div className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                <div className="absolute top-1/2 left-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[100px]" />
            </div>
        </div>
    );
}

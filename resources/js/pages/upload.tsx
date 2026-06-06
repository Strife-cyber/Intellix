import { Head } from '@inertiajs/react';
import { PackageOpen, Plus, FileUp, X, Check, Loader2 } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileCard } from '@/components/uploader/file-card';
import { FilePreviewPanel } from '@/components/uploader/file-preview-panel';
import { UploadDropzone } from '@/components/uploader/upload-dropzone';
import { UploadToolbar } from '@/components/uploader/upload-toolbar';
import { useUploader } from '@/hooks/use-uploader';
import AppLayout from '@/layouts/app-layout';
import { upload } from '@/routes';
import type { BreadcrumbItem } from '@/types';
import { toast } from '@/components/ui/use-toast';

interface UploadProgressToastProps {
    file: File;
    progress: number;
    onCancel: () => void;
    onView: () => void;
}

const UploadProgressToast: React.FC<UploadProgressToastProps> = ({
    file,
    progress,
    onCancel,
    onView,
}) => (
    <div className="flex items-center gap-4">
        <div className="flex-1">
            <div className="flex justify-between">
                <span className="font-medium">{file.name}</span>
                <span className="text-sm text-muted-foreground">
                    {progress}% complete
                </span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-secondary">
                <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
        <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onView}>
                <FileUp className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onCancel}>
                <X className="h-4 w-4" />
            </Button>
        </div>
    </div>
);

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Upload', href: upload().url }];

export default function Upload() {
    const [isDraggingGlobal, setIsDraggingGlobal] = useState(false);
    const [dragCounter, setDragCounter] = useState(0);
    const {
        files,
        selectedFile,
        selectedFileId,
        setSelectedFileId,
        addFiles,
        removeFile,
        clearAll,
        uploadAll,
        removeCompleted,
        totalProgress,
        uploadingCount,
        completedCount,
    } = useUploader({
        maxFiles: 50,
        allowedTypes: [
            'image/*',
            'audio/*',
            'application/pdf',
            '.doc',
            '.docx',
            '.xls',
            '.xlsx',
            '.ppt',
            '.pptx',
            '.txt',
            '.csv',
        ],
    });

    const hasFiles = files.length > 0;

    const handleGlobalDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragCounter((prev) => prev + 1);
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setIsDraggingGlobal(true);
        }
    };

    const handleGlobalDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleGlobalDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const newCounter = dragCounter - 1;
        setDragCounter(newCounter);
        if (newCounter === 0) {
            setIsDraggingGlobal(false);
        }
    };

    const handleGlobalDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragCounter(0);
        setIsDraggingGlobal(false);
        addFiles(e.dataTransfer.files);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Enterprise Uploader" />

            <div
                className="relative flex h-[calc(100vh-4rem)] w-full flex-col gap-4 p-2 lg:p-4"
                onDragEnter={handleGlobalDragEnter}
                onDragOver={handleGlobalDragOver}
                onDragLeave={handleGlobalDragLeave}
                onDrop={handleGlobalDrop}
            >
                {/* Global Drag Overlay */}
                {isDraggingGlobal && (
                    <div className="pointer-events-none absolute inset-0 z-[100] animate-in p-4 duration-300 fade-in">
                        <div className="flex h-full w-full flex-col items-center justify-center gap-6 rounded-3xl border-4 border-dashed border-primary bg-primary/10 shadow-[0_0_100px_rgba(var(--primary),0.2)] backdrop-blur-sm">
                            <div className="flex h-24 w-24 animate-bounce items-center justify-center rounded-full bg-primary/20">
                                <FileUp className="h-12 w-12 text-primary" />
                            </div>
                            <div className="space-y-2 text-center">
                                <h2 className="text-4xl font-black tracking-tighter text-primary">
                                    Drop files to add
                                </h2>
                                <p className="font-medium text-foreground/60">
                                    Release to instantly add to your queue
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="min-h-0 flex-1">
                    {!hasFiles ? (
                        <Card className="flex h-full items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed bg-muted/5 p-8 shadow-sm transition-shadow hover:shadow-md">
                            <div className="w-full max-w-2xl">
                                <UploadDropzone onFilesAdded={addFiles} />
                            </div>
                        </Card>
                    ) : (
                        <div className="grid h-full animate-in grid-cols-1 gap-6 duration-700 fade-in slide-in-from-bottom-2 lg:grid-cols-12">
                            {/* LEFT SIDEBAR: File List */}
                            <div className="flex min-h-0 flex-col gap-4 lg:col-span-4">
                                <Card className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border bg-background/50 shadow-xl backdrop-blur-sm">
                                    <div className="flex items-center justify-between border-b bg-muted/5 p-2 px-4">
                                        <div className="flex items-center gap-2">
                                            <PackageOpen className="h-3 w-3 text-primary" />
                                            <span className="text-xs font-bold">
                                                Queue
                                            </span>
                                            <span className="rounded-md bg-primary/10 px-1 py-0.5 text-[9px] font-black text-primary">
                                                {files.length}
                                            </span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 rounded-full p-0"
                                            onClick={() =>
                                                document
                                                    .getElementById(
                                                        'add-more-input',
                                                    )
                                                    ?.click()
                                            }
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                        <input
                                            id="add-more-input"
                                            type="file"
                                            multiple
                                            hidden
                                            onChange={(e) =>
                                                addFiles(e.target.files!)
                                            }
                                        />
                                    </div>

                                    <ScrollArea className="flex-1">
                                        <div className="flex flex-col gap-2 p-3">
                                            {files.map((file) => (
                                                <FileCard
                                                    key={file.id}
                                                    file={file}
                                                    isSelected={
                                                        selectedFileId ===
                                                        file.id
                                                    }
                                                    onSelect={setSelectedFileId}
                                                    onRemove={(id, e) => {
                                                        e.stopPropagation();
                                                        removeFile(id);
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </ScrollArea>

                                    <div className="border-t bg-muted/10 p-4">
                                        <div className="mb-3 flex justify-between text-[10px] font-black tracking-widest text-muted-foreground uppercase">
                                            <span>Summary</span>
                                            <span>
                                                {completedCount} /{' '}
                                                {files.length} Done
                                            </span>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-muted-foreground">
                                                    Total Files
                                                </span>
                                                <span className="font-bold">
                                                    {files.length}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-muted-foreground">
                                                    Total Size
                                                </span>
                                                <span className="font-bold">
                                                    {(
                                                        files.reduce(
                                                            (acc, f) =>
                                                                acc +
                                                                f.file.size,
                                                            0,
                                                        ) /
                                                        1024 /
                                                        1024
                                                    ).toFixed(2)}{' '}
                                                    MB
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </div>

                            {/* RIGHT PANEL: Large Preview */}
                            <Card className="h-full overflow-hidden rounded-3xl border shadow-2xl transition-all duration-500 hover:shadow-primary/5 lg:col-span-8">
                                <FilePreviewPanel file={selectedFile} />
                            </Card>
                        </div>
                    )}
                </div>
            </div>

            <UploadToolbar
                totalFiles={files.length}
                uploadingCount={uploadingCount}
                completedCount={completedCount}
                totalProgress={totalProgress}
                onUploadAll={uploadAll}
                onClearAll={clearAll}
                onRemoveCompleted={removeCompleted}
            />
        </AppLayout>
    );
}

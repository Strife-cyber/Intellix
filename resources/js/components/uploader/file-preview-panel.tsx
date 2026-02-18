import {
    FileIcon,
    ImageIcon,
    MusicIcon,
    FileTextIcon,
    Download,
    RefreshCw,
    XCircle,
    Info,
    Maximize2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FileWithMetadata } from '@/hooks/use-uploader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface FilePreviewPanelProps {
    file: FileWithMetadata | null;
}

export function FilePreviewPanel({ file }: FilePreviewPanelProps) {
    if (!file) {
        return (
            <div className="flex h-full flex-col items-center justify-center border-l border-dashed bg-muted/20 p-10 text-muted-foreground">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <Info className="h-8 w-8 opacity-20" />
                </div>
                <p className="text-lg font-medium opacity-50">
                    Select a file to preview
                </p>
                <p className="text-sm opacity-40">
                    Choose from the list on the left
                </p>
            </div>
        );
    }

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        const sizes = ['B', 'KB', 'MB', 'GB'];
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const isImage = file.file.type.startsWith('image/');
    const isAudio = file.file.type.startsWith('audio/');
    const isPDF =
        file.file.type === 'application/pdf' || file.file.name.endsWith('.pdf');
    const isOffice =
        [
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ].includes(file.file.type) ||
        /\.(doc|docx|xls|xlsx|ppt|pptx)$/i.test(file.file.name);

    const renderPreview = () => {
        if (isImage && file.preview) {
            return (
                <div className="group relative flex h-full w-full items-center justify-center p-4">
                    <img
                        src={file.preview}
                        alt={file.file.name}
                        className="max-h-full max-w-full rounded-lg object-contain shadow-2xl transition-transform duration-500 group-hover:scale-[1.02]"
                    />
                    <div className="absolute top-6 right-6 flex gap-2 overflow-hidden opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                            variant="secondary"
                            size="icon"
                            className="h-10 w-10 rounded-full shadow-lg"
                        >
                            <Maximize2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            );
        }

        if (isAudio) {
            return (
                <div className="flex w-full max-w-lg flex-col items-center gap-8 rounded-3xl border bg-background p-10 shadow-xl">
                    <div className="flex h-24 w-24 animate-pulse items-center justify-center rounded-full bg-primary/10">
                        <MusicIcon className="h-10 w-10 text-primary" />
                    </div>
                    <div className="w-full space-y-4">
                        <div className="space-y-1 text-center">
                            <h4 className="truncate font-bold">
                                {file.file.name}
                            </h4>
                            <p className="text-xs tracking-widest text-muted-foreground uppercase">
                                {file.file.type}
                            </p>
                        </div>
                        <audio controls className="w-full">
                            <source
                                src={URL.createObjectURL(file.file)}
                                type={file.file.type}
                            />
                            Your browser does not support the audio element.
                        </audio>
                    </div>
                </div>
            );
        }

        if (isPDF) {
            return (
                <iframe
                    src={URL.createObjectURL(file.file)}
                    className="h-full w-full rounded-lg border shadow-sm"
                    title="PDF Preview"
                />
            );
        }

        if (isOffice) {
            // Note: Office viewer requires a public URL. Since this is local file, we show a card.
            // In a real app, once uploaded to S3/Cloud, we'd use the Office URL.
            return (
                <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-2xl border bg-background p-8 text-center shadow-lg">
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-50">
                        <FileTextIcon className="h-10 w-10 text-blue-500" />
                    </div>
                    <div className="space-y-2">
                        <Badge
                            variant="outline"
                            className="border-blue-200 bg-blue-50 text-blue-700"
                        >
                            Office Document
                        </Badge>
                        <h4 className="text-lg font-bold break-all">
                            {file.file.name}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                            Office files will be previewable after upload.
                        </p>
                    </div>
                    <Button variant="outline" className="w-full gap-2">
                        <Download className="h-4 w-4" /> Download Local Copy
                    </Button>
                </div>
            );
        }

        return (
            <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-2xl border bg-background p-10 text-center shadow-lg">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                    <FileIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                    <h4 className="font-bold">{file.file.name}</h4>
                    <p className="text-sm text-muted-foreground">
                        General File
                    </p>
                </div>
                <Badge variant="secondary" className="px-4 py-1">
                    {file.file.type || 'unknown type'}
                </Badge>
            </div>
        );
    };

    return (
        <div className="relative flex h-full flex-col overflow-hidden bg-muted/5">
            {/* Header info - Slimmed and overlaid for better view */}
            <div className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/80 p-2 px-4 backdrop-blur-md">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
                        {isImage && (
                            <ImageIcon className="h-4 w-4 text-blue-500" />
                        )}
                        {isAudio && (
                            <MusicIcon className="h-4 w-4 text-purple-500" />
                        )}
                        {isPDF && (
                            <FileTextIcon className="h-4 w-4 text-red-500" />
                        )}
                        {!isImage && !isAudio && !isPDF && (
                            <FileIcon className="h-4 w-4 text-gray-500" />
                        )}
                    </div>
                    <div className="min-w-0">
                        <h3 className="mb-0.5 truncate text-xs leading-none font-bold">
                            {file.file.name}
                        </h3>
                        <p className="text-[9px] font-medium tracking-tighter text-muted-foreground uppercase">
                            {formatSize(file.file.size)} •{' '}
                            {file.file.type.split('/')[1] || 'Unknown'}
                        </p>
                    </div>
                </div>

                <div className="flex gap-1">
                    {file.status === 'error' && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 border-destructive/20 px-2 text-[10px] text-destructive"
                        >
                            <RefreshCw className="h-3 w-3" /> Retry
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 px-2 text-[10px]"
                    >
                        <Download className="h-3 w-3" /> Download
                    </Button>
                </div>
            </div>

            {/* Content Area - Optimized for scrolling and size */}
            <div className="scrollbar-hide flex-1 overflow-auto bg-[radial-gradient(circle_at_center,_var(--color-muted)_0%,_transparent_100%)]">
                <div
                    className={cn(
                        'flex min-h-full w-full items-start justify-center',
                        !isPDF && !isOffice && 'p-8 lg:p-12',
                    )}
                >
                    <div
                        className={cn(
                            'flex w-full items-center justify-center transition-all duration-500',
                            isPDF && 'h-[1100px] min-h-screen', // Force A4-like length
                            isOffice && 'h-full py-20',
                            isImage && 'max-w-5xl',
                            !isPDF && !isImage && !isOffice && 'h-full py-10',
                        )}
                    >
                        {renderPreview()}
                    </div>
                </div>

                {file.status === 'error' && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-destructive/5 backdrop-blur-[2px]">
                        <div className="max-w-sm space-y-4 rounded-2xl border-2 border-destructive/20 bg-background p-6 text-center shadow-2xl">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                                <XCircle className="h-6 w-6 text-destructive" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="font-bold text-destructive">
                                    Upload Failed
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    {file.error ||
                                        'An unexpected error occurred while trying to upload this file.'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Metadata Footer - Slimmed */}
            <div className="grid grid-cols-2 gap-2 border-t bg-background p-2 px-4 text-[9px] font-bold tracking-tighter text-muted-foreground/60 uppercase lg:grid-cols-4">
                <div className="space-y-0.5">
                    <span className="block opacity-50">Dimensions</span>
                    <span className="text-foreground/80">
                        {file.metadata?.width && file.metadata?.height
                            ? `${file.metadata.width} × ${file.metadata.height}`
                            : 'N/A'}
                    </span>
                </div>
                <div className="space-y-0.5">
                    <span className="block opacity-50">File Extension</span>
                    <span className="text-foreground/80">
                        {file.file.name.split('.').pop()}
                    </span>
                </div>
                <div className="space-y-0.5">
                    <span className="block opacity-50">Status</span>
                    <span
                        className={cn(
                            'text-foreground/80',
                            file.status === 'success' && 'text-green-600',
                            file.status === 'uploading' && 'text-primary',
                            file.status === 'error' && 'text-destructive',
                        )}
                    >
                        {file.status}
                    </span>
                </div>
                <div className="space-y-0.5">
                    <span className="block opacity-50">MIME Type</span>
                    <span className="block truncate text-foreground/80">
                        {file.file.type}
                    </span>
                </div>
            </div>
        </div>
    );
}

import {
    FileIcon,
    ImageIcon,
    MusicIcon,
    FileTextIcon,
    X,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FileWithMetadata } from '@/hooks/use-uploader';
import { Progress } from '@/components/ui/progress';

interface FileCardProps {
    file: FileWithMetadata;
    isSelected?: boolean;
    onSelect: (id: string) => void;
    onRemove: (id: string, e: React.MouseEvent) => void;
}

export function FileCard({
    file,
    isSelected,
    onSelect,
    onRemove,
}: FileCardProps) {
    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const getIcon = () => {
        if (file.file.type.startsWith('image/'))
            return <ImageIcon className="h-5 w-5 text-blue-500" />;
        if (file.file.type.startsWith('audio/'))
            return <MusicIcon className="h-5 w-5 text-purple-500" />;
        if (file.file.type.includes('pdf'))
            return <FileTextIcon className="h-5 w-5 text-red-500" />;
        return <FileIcon className="h-5 w-5 text-gray-500" />;
    };

    return (
        <div
            onClick={() => onSelect(file.id)}
            className={cn(
                'group relative flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all select-none',
                isSelected
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-transparent hover:border-muted hover:bg-muted/50',
            )}
        >
            <div className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                {file.preview ? (
                    <img
                        src={file.preview}
                        alt=""
                        className="h-full w-full object-cover"
                    />
                ) : (
                    getIcon()
                )}

                {file.status === 'uploading' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Loader2 className="h-5 w-5 animate-spin text-white" />
                    </div>
                )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="truncate pr-6 text-sm font-semibold transition-colors group-hover:text-primary">
                    {file.file.name}
                </p>

                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                        {formatSize(file.file.size)}
                    </span>
                    <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />

                    {file.status === 'success' && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 uppercase">
                            <CheckCircle2 className="h-3 w-3" /> Done
                        </span>
                    )}
                    {file.status === 'error' && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-destructive uppercase">
                            <AlertCircle className="h-3 w-3" /> Error
                        </span>
                    )}
                    {file.status === 'uploading' && (
                        <span className="animate-pulse text-[10px] font-bold text-primary uppercase">
                            Uploading...
                        </span>
                    )}
                    {file.status === 'queued' && (
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">
                            Queued
                        </span>
                    )}
                </div>

                {file.status === 'uploading' && (
                    <Progress value={file.progress} className="mt-1 h-1" />
                )}
            </div>

            <button
                onClick={(e) => onRemove(file.id, e)}
                className="absolute top-2 right-2 rounded-full p-1 opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground"
            >
                <X className="h-3 w-3" />
            </button>
        </div>
    );
}

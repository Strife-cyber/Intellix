import { Trash2, Upload, X, CheckSquare, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface UploadToolbarProps {
    totalFiles: number;
    uploadingCount: number;
    completedCount: number;
    totalProgress: number;
    onUploadAll: () => void;
    onClearAll: () => void;
    onRemoveCompleted: () => void;
}

export function UploadToolbar({
    totalFiles,
    uploadingCount,
    completedCount,
    totalProgress,
    onUploadAll,
    onClearAll,
    onRemoveCompleted,
}: UploadToolbarProps) {
    if (totalFiles === 0) return null;

    const isUploading = uploadingCount > 0;
    const allDone = completedCount === totalFiles && totalFiles > 0;

    return (
        <div className="fixed bottom-8 left-1/2 z-50 w-full max-w-2xl -translate-x-1/2 animate-in px-6 duration-500 slide-in-from-bottom-5 fade-in">
            <div className="group relative flex flex-col gap-4 overflow-hidden rounded-3xl border-2 border-primary/20 bg-background/80 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.2)] backdrop-blur-xl">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-background to-primary/5 opacity-50" />

                <div className="relative flex items-center justify-between gap-6">
                    <div className="flex min-w-0 flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-black text-primary-foreground">
                                {totalFiles}
                            </span>
                            <h4 className="truncate text-sm font-bold">
                                {isUploading
                                    ? `Uploading ${uploadingCount} of ${totalFiles} files...`
                                    : allDone
                                      ? 'All files uploaded successfully!'
                                      : `${totalFiles} files ready for upload`}
                            </h4>
                        </div>
                        {isUploading && (
                            <p className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                <Loader2 className="h-3 w-3 animate-spin" />{' '}
                                Overall Progress: {Math.round(totalProgress)}%
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {completedCount > 0 && !isUploading && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onRemoveCompleted}
                                className="h-10 gap-2 rounded-xl border-green-500/20 text-green-700 hover:bg-green-500/10"
                            >
                                <CheckSquare className="h-4 w-4" /> Clear Done
                            </Button>
                        )}

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClearAll}
                            disabled={isUploading}
                            className="group/btn h-10 gap-2 rounded-xl hover:bg-destructive/10 hover:text-destructive"
                        >
                            <Trash2 className="h-4 w-4 transition-transform group-hover/btn:-rotate-12" />{' '}
                            Clear All
                        </Button>

                        {!allDone && (
                            <Button
                                size="sm"
                                onClick={onUploadAll}
                                disabled={isUploading}
                                className={cn(
                                    'h-10 gap-2 rounded-xl px-6 font-bold shadow-lg shadow-primary/20 transition-all duration-300',
                                    isUploading
                                        ? 'animate-pulse overflow-hidden px-10'
                                        : 'hover:scale-105',
                                )}
                            >
                                {isUploading ? (
                                    <>
                                        <div
                                            className="absolute inset-y-0 left-0 bg-primary-foreground/10 transition-all duration-300"
                                            style={{
                                                width: `${totalProgress}%`,
                                            }}
                                        />
                                        <Loader2 className="relative z-10 h-4 w-4 animate-spin" />
                                        <span className="relative z-10">
                                            Uploading...
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="h-4 w-4" /> Upload
                                        All
                                    </>
                                )}
                            </Button>
                        )}

                        {allDone && (
                            <Button
                                size="sm"
                                className="h-10 gap-2 rounded-xl bg-green-600 px-6 font-bold shadow-lg shadow-green-600/20 hover:bg-green-700"
                                onClick={onClearAll}
                            >
                                <X className="h-4 w-4" /> Finish
                            </Button>
                        )}
                    </div>
                </div>

                {isUploading && (
                    <Progress
                        value={totalProgress}
                        className="h-1 bg-primary/10"
                    />
                )}
            </div>
        </div>
    );
}

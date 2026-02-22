import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function FileViewer({
    url,
    mime,
    filename,
    isOpen,
    onClose,
    inline = false,
}: {
    url: string | null;
    mime: string;
    filename: string;
    isOpen: boolean;
    onClose: () => void;
    inline?: boolean;
}) {
    const isImage = mime.startsWith('image/');
    const isPdf = mime === 'application/pdf';
    const isText = mime.startsWith('text/') || mime === 'application/json';
    const isOffice =
        mime === 'application/msword' ||
        mime ===
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        mime === 'application/vnd.ms-excel' ||
        mime ===
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        mime === 'application/vnd.ms-powerpoint' ||
        mime ===
            'application/vnd.openxmlformats-officedocument.presentationml.presentation';

    const Content = (
        <div
            className={cn(
                'relative h-full w-full overflow-hidden bg-muted/10',
                inline ? 'rounded-xl border border-white/5' : '',
            )}
        >
            {!url ? (
                <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <>
                    {isImage && (
                        <div className="flex h-full w-full items-center justify-center bg-black/5 p-4">
                            <img
                                src={url}
                                alt={filename}
                                className="max-h-full max-w-full rounded object-contain shadow-sm"
                            />
                        </div>
                    )}

                    {(isPdf || isText) && (
                        <iframe
                            src={url}
                            className="h-full w-full border-none bg-white"
                            title={filename}
                        />
                    )}

                    {isOffice && (
                        <iframe
                            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
                                url,
                            )}`}
                            className="h-full w-full border-none bg-white"
                            title={filename}
                        />
                    )}

                    {!isImage && !isPdf && !isText && !isOffice && (
                        <div className="flex h-full flex-col items-center justify-center gap-4">
                            <p className="text-muted-foreground">
                                Preview not available for this file type.
                            </p>
                            <a
                                href={url}
                                download
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary hover:underline"
                            >
                                Download File
                            </a>
                        </div>
                    )}
                </>
            )}
        </div>
    );

    if (inline) return Content;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="flex h-[85vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-[85vw]">
                <DialogHeader className="shrink-0 border-b bg-muted/40 p-4">
                    <DialogTitle className="truncate pr-8">
                        {filename}
                    </DialogTitle>
                </DialogHeader>
                {Content}
            </DialogContent>
        </Dialog>
    );
}

import { cn } from '@/lib/utils';

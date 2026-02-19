
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
}: {
    url: string | null;
    mime: string;
    filename: string;
    isOpen: boolean;
    onClose: () => void;
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

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="h-[85vh] w-full sm:max-w-[85vw] p-0 flex flex-col gap-0 overflow-hidden">
                <DialogHeader className="p-4 border-b bg-muted/40 shrink-0">
                    <DialogTitle className="truncate pr-8">{filename}</DialogTitle>
                </DialogHeader>

                <div className=" w-full h-full bg-muted/10 relative overflow-hidden">
                    {!url ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <>
                            {isImage && (
                                <div className="w-full h-full flex items-center justify-center bg-black/5 p-4">
                                    <img
                                        src={url}
                                        alt={filename}
                                        className="max-w-full max-h-full object-contain rounded shadow-sm"
                                    />
                                </div>
                            )}

                            {(isPdf || isText) && (
                                <iframe
                                    src={url}
                                    className="w-full h-full border-none bg-white"
                                    title={filename}
                                />
                            )}

                            {isOffice && (
                                <iframe
                                    src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
                                        url
                                    )}`}
                                    className="w-full h-full border-none bg-white"
                                    title={filename}
                                />
                            )}

                            {!isImage && !isPdf && !isText && !isOffice && (
                                <div className="flex flex-col items-center justify-center h-full gap-4">
                                    <p className="text-muted-foreground">Preview not available for this file type.</p>
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
            </DialogContent>
        </Dialog>
    );
}

import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';

export type FileStatus =
    | 'queued'
    | 'uploading'
    | 'processing' // Added for background jobs
    | 'success'
    | 'error'
    | 'waiting';

export interface FileWithMetadata {
    id: string;
    file: File;
    status: FileStatus;
    progress: number;
    preview?: string;
    error?: string;
    resourceId?: string; // ID from the server
    statusUrl?: string; // Polling URL from server
    metadata?: {
        width?: number;
        height?: number;
        duration?: number;
        type: string;
    };
}

export interface UploaderOptions {
    maxSize?: number; // in bytes
    allowedTypes?: string[];
    maxFiles?: number;
}

export const useUploader = (options: UploaderOptions = {}) => {
    const {
        maxSize = 100 * 1024 * 1024, // 100MB default to match controller
        allowedTypes = [],
        maxFiles = 50,
    } = options;

    const [files, setFiles] = useState<FileWithMetadata[]>([]);
    const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

    const generateId = () => Math.random().toString(36).substring(2, 11);

    const validateFile = (file: File): string | null => {
        if (maxSize && file.size > maxSize) {
            return `File is too large (max ${Math.round(maxSize / 1024 / 1024)}MB)`;
        }

        if (allowedTypes.length > 0) {
            const isAllowed = allowedTypes.some((type) => {
                if (type.includes('*')) {
                    const [base] = type.split('/');
                    return file.type.startsWith(`${base}/`);
                }
                return file.type === type || file.name.endsWith(type);
            });
            if (!isAllowed) return 'File type not supported';
        }

        return null;
    };

    const addFiles = useCallback(
        async (newFileList: FileList | File[]) => {
            const fileArray = Array.from(newFileList);

            // Filter out duplicates
            const uniqueFiles = fileArray.filter((newFile) => {
                const isDuplicate = files.some(
                    (f) =>
                        f.file.name === newFile.name &&
                        f.file.size === newFile.size,
                );
                if (isDuplicate) {
                    console.warn(
                        `File ${newFile.name} is already in the queue`,
                    );
                }
                return !isDuplicate;
            });

            if (uniqueFiles.length === 0) return;

            if (files.length + uniqueFiles.length > maxFiles) {
                // Toast or alert would go here
                console.error(`Maximum ${maxFiles} files allowed`);
                return;
            }

            const newFiles: FileWithMetadata[] = await Promise.all(
                uniqueFiles.map(async (file) => {
                    const id = generateId();
                    const error = validateFile(file);

                    let preview: string | undefined;
                    let metadata: FileWithMetadata['metadata'] = {
                        type: file.type,
                    };

                    if (file.type.startsWith('image/')) {
                        preview = URL.createObjectURL(file);
                        // Get image dimensions
                        try {
                            const dimensions = await new Promise<{
                                width: number;
                                height: number;
                            }>((resolve, reject) => {
                                const img = new Image();
                                img.onload = () =>
                                    resolve({
                                        width: img.width,
                                        height: img.height,
                                    });
                                img.onerror = reject;
                                img.src = preview!;
                            });
                            metadata = { ...metadata, ...dimensions };
                        } catch (e) {
                            console.error('Failed to load image dimensions', e);
                        }
                    }

                    return {
                        id,
                        file,
                        status: error ? 'error' : 'queued',
                        progress: 0,
                        preview,
                        error: error || undefined,
                        metadata,
                    };
                }),
            );

            setFiles((prev) => [...prev, ...newFiles]);
            if (!selectedFileId && newFiles.length > 0) {
                setSelectedFileId(newFiles[0].id);
            }
        },
        [files, maxFiles, selectedFileId],
    );

    const removeFile = useCallback(
        (id: string) => {
            setFiles((prev) => {
                const fileToRemove = prev.find((f) => f.id === id);
                if (fileToRemove?.preview) {
                    URL.revokeObjectURL(fileToRemove.preview);
                }
                return prev.filter((f) => f.id !== id);
            });
            if (selectedFileId === id) {
                setSelectedFileId(null);
            }
        },
        [selectedFileId],
    );

    const clearAll = useCallback(() => {
        files.forEach((f) => {
            if (f.preview) URL.revokeObjectURL(f.preview);
        });
        setFiles([]);
        setSelectedFileId(null);
    }, [files]);

    const pollStatus = useCallback(async (id: string, statusUrl: string) => {
        const interval = setInterval(async () => {
            try {
                const response = await axios.get(statusUrl);
                const { status } = response.data;

                if (status === 'ready' || status === 'success') {
                    clearInterval(interval);
                    setFiles((prev) =>
                        prev.map((f) =>
                            f.id === id
                                ? { ...f, status: 'success', progress: 100 }
                                : f,
                        ),
                    );
                } else if (status === 'failed' || status === 'error') {
                    clearInterval(interval);
                    setFiles((prev) =>
                        prev.map((f) =>
                            f.id === id
                                ? { ...f, status: 'error', error: 'Processing failed on server' }
                                : f,
                        ),
                    );
                }
            } catch (error) {
                console.error('Error polling status:', error);
                clearInterval(interval);
            }
        }, 3000);
    }, []);

    const uploadFile = useCallback(async (id: string) => {
        const fileToUpload = files.find(f => f.id === id);
        if (!fileToUpload || fileToUpload.status === 'success') return;

        setFiles((prev) =>
            prev.map((f) =>
                f.id === id ? { ...f, status: 'uploading', progress: 0 } : f,
            ),
        );

        const formData = new FormData();
        formData.append('files[]', fileToUpload.file);

        try {
            const response = await axios.post('/v1/resources/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    const progress = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
                    setFiles((prev) =>
                        prev.map((f) => (f.id === id ? { ...f, progress } : f)),
                    );
                },
            });

            // The server returns an array because we sent 'files[]'
            const result = response.data[0];

            setFiles((prev) =>
                prev.map((f) =>
                    f.id === id
                        ? {
                            ...f,
                            status: 'processing',
                            progress: 100,
                            resourceId: result.resource_id,
                            statusUrl: result.status_url
                        }
                        : f,
                ),
            );

            if (result.status_url) {
                pollStatus(id, result.status_url);
            }

        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Upload failed';
            setFiles((prev) =>
                prev.map((f) =>
                    f.id === id
                        ? { ...f, status: 'error', error: errorMessage }
                        : f,
                ),
            );
        }
    }, [files, pollStatus]);

    const uploadAll = useCallback(async () => {
        const queuedFiles = files.filter(
            (f) => f.status === 'queued' || (f.status === 'error' && !f.error),
        );

        // We could send them all in one request since the controller supports it,
        // but parallel requests are better for individual progress tracking.
        // If we want to strictly follow the "multiple files" controller, we could 
        // implement a batchUpload function. For now, parallel is better UX.
        await Promise.all(queuedFiles.map(file => uploadFile(file.id)));
    }, [files, uploadFile]);

    const removeCompleted = useCallback(() => {
        setFiles((prev) => prev.filter((f) => f.status !== 'success'));
    }, []);

    const selectedFile = files.find((f) => f.id === selectedFileId) || null;

    return {
        files,
        selectedFile,
        selectedFileId,
        setSelectedFileId,
        addFiles,
        removeFile,
        clearAll,
        uploadAll,
        uploadFile,
        removeCompleted,
        totalProgress:
            files.length > 0
                ? files.reduce((acc, f) => acc + f.progress, 0) / files.length
                : 0,
        uploadingCount: files.filter((f) => f.status === 'uploading' || f.status === 'processing').length,
        completedCount: files.filter((f) => f.status === 'success').length,
        errorCount: files.filter((f) => f.status === 'error').length,
    };
};

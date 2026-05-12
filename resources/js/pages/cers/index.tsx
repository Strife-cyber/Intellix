import { router } from '@inertiajs/react';
import {
    FileText,
    LoaderCircle,
    Sparkles,
    Save,
    CheckCircle2,
} from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { UploadDropzone } from '@/components/uploader/upload-dropzone';

import AppLayout from '@/layouts/app-layout';
import cers from '@/routes/cers';

import type { BreadcrumbItem, CerSection } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'CER',
        href: cers.index.url(),
    },
];

export default function Cers() {
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);

    const [isProcessing, setIsProcessing] = useState(false);

    const [isSaving, setIsSaving] = useState(false);

    const [sections, setSections] = useState<CerSection[]>([]);

    const hasSections = sections.length > 0;

    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);

    const [saveForm, setSaveForm] = useState<{
        title: string;
        description: string;
        version: number;
    }>({
        title: '',
        description: '',
        version: 1,
    });

    const handleFilesAdded = (files: FileList) => {
        if (!files.length) return;

        const file = files[0];

        setUploadedFile(file);

        // Upload is triggered when the user clicks "Process CER".
    };

    const updateSection = (
        index: number,
        field: keyof CerSection,
        value: string,
    ) => {
        const updated = [...sections];

        updated[index] = {
            ...updated[index],
            [field]: value,
        };

        setSections(updated);
    };

    const handleSave = () => {
        if (!hasSections) return;

        setIsSaveDialogOpen(true);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="flex h-full w-full flex-col gap-6 p-6 lg:flex-row">

                <div className="flex-1 rounded-3xl border border-border bg-card p-6 shadow-sm">

                    {!uploadedFile && !hasSections && (
                        <div className="flex h-full min-h-125 flex-col items-center justify-center text-center">
                            <div className="mb-5 rounded-3xl bg-muted p-5">
                                <FileText className="h-10 w-10 text-muted-foreground" />
                            </div>

                            <h2 className="text-2xl font-bold">
                                No CER Processed Yet
                            </h2>

                            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                                Upload a CER document to automatically extract
                                and structure its sections.
                            </p>
                        </div>
                    )}

                    {uploadedFile && !hasSections && !isProcessing && (
                        <div className="flex h-full min-h-125 flex-col items-center justify-center text-center">
                            <div className="mb-5 rounded-3xl bg-primary/10 p-5">
                                <CheckCircle2 className="h-10 w-10 text-primary" />
                            </div>

                            <h2 className="text-2xl font-bold">
                                File Uploaded
                            </h2>

                            <p className="mt-3 text-sm font-medium">
                                {uploadedFile.name}
                            </p>

                            <p className="mt-1 text-sm text-muted-foreground">
                                {(
                                    uploadedFile.size /
                                    1024 /
                                    1024
                                ).toFixed(2)}{' '}
                                MB
                            </p>

                            <Button
                                className="mt-8 h-11 rounded-2xl px-6"
                                onClick={() => {
                                    if (!uploadedFile) return;

                                    const formData = new FormData();
                                    formData.append('file', uploadedFile);

                                    router.post('/cers/upload', formData, {
                                        forceFormData: true,
                                        preserveState: true,
                                        preserveScroll: true,

                                        onStart: () => {
                                            setIsProcessing(true);
                                        },

                                        onSuccess: (page) => {
                                            setIsProcessing(false);

                                            const extractedSections =
                                                (page as any)?.props
                                                    ?.sections ?? [];

                                            setSections(extractedSections);
                                        },

                                        onError: (error) => {
                                            console.error(error);
                                            setIsProcessing(false);
                                        },
                                    });
                                }}
                            >
                                <Sparkles className="mr-2 h-4 w-4" />
                                Process CER
                            </Button>
                        </div>
                    )}

                    {isProcessing && (
                        <div className="flex h-full min-h-125 flex-col items-center justify-center text-center">
                            <div className="mb-6 rounded-full border border-border bg-muted p-5">
                                <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
                            </div>

                            <h2 className="text-2xl font-bold">
                                Processing CER
                            </h2>

                            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                                Your document is being analyzed and split into
                                structured sections by the processing service.
                            </p>
                        </div>
                    )}

                    {hasSections && !isProcessing && (
                        <>
                            <div className="mb-8 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-2xl bg-muted p-3">
                                        <FileText className="h-5 w-5" />
                                    </div>

                                    <div>
                                        <h2 className="text-xl font-semibold">
                                            CER Sections
                                        </h2>

                                        <p className="text-sm text-muted-foreground">
                                            Review and edit extracted sections
                                        </p>
                                    </div>
                                </div>

                                <Button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="rounded-2xl"
                                >
                                    {isSaving ? (
                                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Save className="mr-2 h-4 w-4" />
                                    )}

                                    Save
                                </Button>
                            </div>

                            <Dialog
                                open={isSaveDialogOpen}
                                onOpenChange={setIsSaveDialogOpen}
                            >
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>
                                            Save as Cahier
                                        </DialogTitle>
                                    </DialogHeader>

                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();

                                            setIsSaving(true);

                                            router.post(
                                                '/cers/save',
                                                {
                                                    title:
                                                        saveForm.title,
                                                    description:
                                                        saveForm.description ||
                                                        null,
                                                    version:
                                                        Number(
                                                            saveForm.version,
                                                        ),
                                                    sections,
                                                },
                                                {
                                                    onStart: () => {
                                                        setIsSaving(true);
                                                    },
                                                    onSuccess: (page) => {
                                                        setIsSaving(false);
                                                        setIsSaveDialogOpen(false);

                                                        const nextSections =
                                                            (page as any)
                                                                ?.props
                                                                ?.sections ??
                                                            sections;

                                                        setSections(nextSections);
                                                    },
                                                    onError: (error) => {
                                                        console.error(
                                                            error,
                                                        );
                                                        setIsSaving(false);
                                                    },
                                                },
                                            );
                                        }}
                                        className="space-y-4"
                                    >
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">
                                                Title
                                            </label>
                                            <Input
                                                value={saveForm.title}
                                                onChange={(e) =>
                                                    setSaveForm((prev) => ({
                                                        ...prev,
                                                        title: e.target.value,
                                                    }))
                                                }
                                                required
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">
                                                Description
                                            </label>
                                            <Textarea
                                                value={
                                                    saveForm.description
                                                }
                                                onChange={(e) =>
                                                    setSaveForm((prev) => ({
                                                        ...prev,
                                                        description:
                                                            e.target.value,
                                                    }))
                                                }
                                                rows={3}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">
                                                Version
                                            </label>
                                            <Input
                                                type="number"
                                                value={saveForm.version}
                                                onChange={(e) =>
                                                    setSaveForm((prev) => ({
                                                        ...prev,
                                                        version: Number(
                                                            e.target.value,
                                                        ),
                                                    }))
                                                }
                                                required
                                            />
                                        </div>

                                        <DialogFooter>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() =>
                                                    setIsSaveDialogOpen(false)
                                                }
                                                disabled={isSaving}
                                            >
                                                Cancel
                                            </Button>
                                            <Button type="submit" disabled={isSaving}>
                                                {isSaving ? (
                                                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Save className="mr-2 h-4 w-4" />
                                                )}
                                                Save
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>

                            <div className="space-y-5">
                                {sections.map((part, index) => (
                                    <div
                                        key={index}
                                        className="rounded-2xl border border-border bg-background p-5"
                                    >
                                        <div className="mb-4 flex items-center justify-between">
                                            <input
                                                value={part.title}
                                                onChange={(e) =>
                                                    updateSection(
                                                        index,
                                                        'title',
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-full bg-transparent text-lg font-semibold outline-none"
                                            />

                                            <span className="ml-4 rounded-md bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                                                Section {index + 1}
                                            </span>
                                        </div>

                                        <Textarea
                                            value={part.content}
                                            onChange={(e) =>
                                                updateSection(
                                                    index,
                                                    'content',
                                                    e.target.value,
                                                )
                                            }
                                            className="min-h-35 resize-none rounded-2xl"
                                        />
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                <div className="w-[40%]">
                    <div className="sticky top-6 rounded-3xl border border-dashed border-border bg-card p-6 shadow-sm">
                        <div className="mb-5">
                            <h2 className="text-xl font-semibold">
                                Upload CER
                            </h2>

                            <p className="mt-1 text-sm text-muted-foreground">
                                Upload and process CER documents automatically
                            </p>
                        </div>

                        {!uploadedFile ? (
                            //@ts-expect-error files added error
                            <UploadDropzone onFilesAdded={handleFilesAdded} />
                        ) : (
                            <div className="rounded-2xl border border-border bg-muted/30 p-5">
                                <div className="flex items-start gap-4">
                                    <div className="rounded-xl bg-background p-3">
                                        <FileText className="h-5 w-5" />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium">
                                            {uploadedFile.name}
                                        </p>

                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {(
                                                uploadedFile.size /
                                                1024 /
                                                1024
                                            ).toFixed(2)}{' '}
                                            MB
                                        </p>
                                    </div>
                                </div>

                                <Button
                                    variant="outline"
                                    className="mt-5 w-full rounded-2xl"
                                    onClick={() => {
                                        setUploadedFile(null);
                                        setSections([]);
                                    }}
                                >
                                    Upload Another File
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

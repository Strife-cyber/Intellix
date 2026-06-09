import { router, usePage } from '@inertiajs/react';
import { FileText, LoaderCircle, Pencil, Trash2, Upload } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UploadDropzone } from '@/components/uploader/upload-dropzone';
import AppLayout from '@/layouts/app-layout';
import type { Prosit, StoredProsit } from '@/lib/cer-api';
import {
    formatSemicolonsToNewlines,
    PROSIT_SECTION_LABELS,
} from '@/lib/prosit-utils';
import cers from '@/routes/cers';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Bibliothèque PROSIT',
        href: cers.index().url,
    },
];

type CerFlash = { type: string; message: string };

type PageProps = {
    prosits: StoredProsit[];
    microserviceError: string | null;
    selectedPrositId: string | null;
    cerFlash: CerFlash | null;
};

function displayNameWithoutExt(filename: string): string {
    const dot = filename.lastIndexOf('.');
    return dot > 0 ? filename.slice(0, dot) : filename;
}

export default function CersLibrary() {
    const {
        prosits: serverProsits,
        microserviceError,
        selectedPrositId,
        cerFlash,
    } = usePage<PageProps>().props;

    const errors = usePage().props.errors as Record<string, string | undefined>;

    const prosits = useMemo(
        () =>
            [...(serverProsits ?? [])].sort(
                (a, b) =>
                    new Date(b.uploaded_at).getTime() -
                    new Date(a.uploaded_at).getTime(),
            ),
        [serverProsits],
    );

    const [selected, setSelected] = useState<StoredProsit | null>(null);

    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [uploadName, setUploadName] = useState('');
    const [uploading, setUploading] = useState(false);

    const [renameOpen, setRenameOpen] = useState(false);
    const [renameValue, setRenameValue] = useState('');

    useEffect(() => {
        if (!selectedPrositId) return;
        const match = prosits.find((p) => p.id === selectedPrositId);
        if (match) setSelected(match);
    }, [selectedPrositId, prosits]);

    const statusMessage =
        errors.prosit ?? (cerFlash?.message ? cerFlash.message : null);

    const handleFilesAdded = (files: FileList) => {
        if (!files.length) return;
        const file = files[0];
        setPendingFile(file);
        setUploadName(displayNameWithoutExt(file.name));
    };

    const confirmUpload = () => {
        if (!pendingFile) return;
        setUploading(true);

        const form = new FormData();
        form.append('file', pendingFile);
        if (uploadName.trim()) {
            form.append('filename', uploadName.trim());
        }

        router.post('/cers/prosits/import', form, {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => setUploading(false),
            onSuccess: () => {
                setPendingFile(null);
                setUploadName('');
            },
        });
    };

    const openRename = (item: StoredProsit) => {
        setSelected(item);
        setRenameValue(displayNameWithoutExt(item.filename));
        setRenameOpen(true);
    };

    const confirmRename = () => {
        if (!selected) return;
        router.patch(
            `/cers/prosits/${selected.id}`,
            { filename: renameValue },
            {
                preserveScroll: true,
                onSuccess: () => setRenameOpen(false),
            },
        );
    };

    const handleDelete = (item: StoredProsit) => {
        if (!confirm(`Supprimer « ${item.filename} » ?`)) return;
        router.delete(`/cers/prosits/${item.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                if (selected?.id === item.id) setSelected(null);
            },
        });
    };

    const renderSection = (
        key: keyof Prosit,
        label: string,
        prosit: Prosit,
    ) => {
        const val = prosit[key];
        if (Array.isArray(val)) {
            if (!val.length) {
                return (
                    <p className="text-sm text-muted-foreground italic">
                        — vide —
                    </p>
                );
            }
            return (
                <ul className="list-inside list-disc text-sm text-muted-foreground">
                    {val.map((line, i) => (
                        <li key={i}>{line}</li>
                    ))}
                </ul>
            );
        }
        if (typeof val === 'string' && val.trim()) {
            return (
                <p className="text-sm whitespace-pre-line text-muted-foreground">
                    {formatSemicolonsToNewlines(val)}
                </p>
            );
        }
        return <p className="text-sm text-muted-foreground italic">— vide —</p>;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Bibliothèque PROSIT
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Importez des documents, puis générez un CER depuis{' '}
                            <a
                                href="/cers/generate"
                                className="font-medium text-primary underline"
                            >
                                Générer un CER
                            </a>
                            .
                        </p>
                    </div>
                    <Button className="rounded-2xl" asChild>
                        <a href="/cers/generate">Générer un CER</a>
                    </Button>
                </div>

                {microserviceError && (
                    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                        {microserviceError}
                    </div>
                )}

                <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Importer un PROSIT</CardTitle>
                            <CardDescription>
                                .docx, .pdf, .odt, .txt — extraction via le
                                microservice CER
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {!pendingFile ? (
                                //@ts-expect-error files added error
                                <UploadDropzone
                                    onFilesAdded={handleFilesAdded}
                                />
                            ) : (
                                <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
                                    <p className="text-sm font-medium">
                                        {pendingFile.name}
                                    </p>
                                    <div className="space-y-2">
                                        <Label htmlFor="upload-filename">
                                            Nom affiché
                                        </Label>
                                        <Input
                                            id="upload-filename"
                                            value={uploadName}
                                            onChange={(e) =>
                                                setUploadName(e.target.value)
                                            }
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={confirmUpload}
                                            disabled={uploading}
                                        >
                                            {uploading ? (
                                                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <Upload className="mr-2 h-4 w-4" />
                                            )}
                                            Importer et extraire
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setPendingFile(null);
                                                setUploadName('');
                                            }}
                                            disabled={uploading}
                                        >
                                            Annuler
                                        </Button>
                                    </div>
                                </div>
                            )}
                            {statusMessage && (
                                <p
                                    className={`text-sm ${
                                        errors.prosit
                                            ? 'text-destructive'
                                            : 'text-muted-foreground'
                                    }`}
                                >
                                    {statusMessage}
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div>
                                <CardTitle>Fichiers enregistrés</CardTitle>
                                <CardDescription>
                                    Stockés dans le microservice (isolés par
                                    utilisateur).
                                </CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {prosits.length === 0 ? (
                                <p className="py-8 text-center text-sm text-muted-foreground">
                                    Aucun PROSIT enregistré.
                                </p>
                            ) : (
                                <ul className="max-h-80 space-y-2 overflow-y-auto">
                                    {prosits.map((item) => (
                                        <li
                                            key={item.id}
                                            className={`flex items-center justify-between gap-2 rounded-xl border p-3 transition-colors ${
                                                selected?.id === item.id
                                                    ? 'border-primary bg-primary/5'
                                                    : 'bg-background hover:bg-accent/40'
                                            }`}
                                        >
                                            <button
                                                type="button"
                                                className="min-w-0 flex-1 text-left"
                                                onClick={() =>
                                                    setSelected(item)
                                                }
                                            >
                                                <div className="truncate font-medium">
                                                    {item.filename}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {new Date(
                                                        item.uploaded_at,
                                                    ).toLocaleString()}
                                                </div>
                                            </button>
                                            <div className="flex shrink-0 gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() =>
                                                        openRename(item)
                                                    }
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() =>
                                                        handleDelete(item)
                                                    }
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {selected && (
                    <Card>
                        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
                            <div>
                                <CardTitle>
                                    Sections — {selected.filename}
                                </CardTitle>
                                <CardDescription>
                                    Aperçu des champs extraits par le
                                    microservice.
                                </CardDescription>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button variant="outline" asChild>
                                    <a
                                        href={`/cers/generate?prosit=${encodeURIComponent(selected.id)}`}
                                    >
                                        <FileText className="mr-2 h-4 w-4" />
                                        Générer le CER
                                    </a>
                                </Button>
                                <Button variant="outline" asChild>
                                    <a href={cers.all().url}>Cahiers générés</a>
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {(
                                    Object.entries(PROSIT_SECTION_LABELS) as [
                                        keyof Prosit,
                                        string,
                                    ][]
                                ).map(([key, label]) => (
                                    <div
                                        key={key}
                                        className="rounded-xl border bg-muted/20 p-4"
                                    >
                                        <h4 className="text-xs font-semibold tracking-wider text-primary uppercase">
                                            {label}
                                        </h4>
                                        <div className="mt-2">
                                            {renderSection(
                                                key,
                                                label,
                                                selected.prosit,
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Renommer le fichier</DialogTitle>
                    </DialogHeader>
                    <Input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                    />
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setRenameOpen(false)}
                        >
                            Annuler
                        </Button>
                        <Button onClick={confirmRename}>Enregistrer</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

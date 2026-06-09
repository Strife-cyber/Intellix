import { Head, Link } from '@inertiajs/react';
import { Download, FileText, FolderOpen } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { jobDownloadUrl } from '@/lib/cer-api';
import cers from '@/routes/cers';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Cahiers générés',
        href: cers.all().url,
    },
];

export type GeneratedCer = {
    id: string;
    title: string;
    description?: string;
    version?: number;
    theme?: string;
    status: string;
    created_at: string;
    finished_at?: string;
    pdf_ready: boolean;
    has_zip: boolean;
    has_latex: boolean;
};

type PageProps = {
    generatedCers: GeneratedCer[];
    microserviceError: string | null;
};

function formatDate(iso: string | undefined): string {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleString();
    } catch {
        return iso;
    }
}

export default function All({ generatedCers, microserviceError }: PageProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Cahiers générés" />

            <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Cahiers générés
                        </h1>
                        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                            Tous vos CER compilés : PDF final, LaTeX combiné
                            (tous les chapitres fusionnés en un seul fichier) et
                            archive ZIP des sources modulaires.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">
                            {(generatedCers ?? []).length} livrable
                            {(generatedCers ?? []).length !== 1 ? 's' : ''}
                        </Badge>
                        <Button className="rounded-2xl" asChild>
                            <Link href="/cers/generate">Générer un CER</Link>
                        </Button>
                    </div>
                </div>

                {microserviceError && (
                    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                        {microserviceError}
                    </div>
                )}

                {(generatedCers ?? []).length === 0 ? (
                    <div className="rounded-2xl border bg-card p-10 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <FolderOpen className="h-7 w-7" />
                        </div>
                        <h2 className="text-lg font-semibold">
                            Aucun CER généré pour l&apos;instant
                        </h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Importez un PROSIT, puis lancez une génération
                            depuis{' '}
                            <Link
                                href="/cers/generate"
                                className="font-medium text-primary underline"
                            >
                                Générer un CER
                            </Link>
                            . Les PDF et fichiers apparaîtront ici une fois la
                            compilation terminée.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {(generatedCers ?? []).map((cer) => (
                            <Card key={cer.id} className="flex h-full flex-col">
                                <CardHeader className="space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                                <FileText className="h-5 w-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <CardTitle className="truncate text-base">
                                                    {cer.title}
                                                </CardTitle>
                                                {cer.description && (
                                                    <CardDescription className="line-clamp-2">
                                                        {cer.description}
                                                    </CardDescription>
                                                )}
                                            </div>
                                        </div>
                                        {cer.version != null && (
                                            <Badge
                                                variant="secondary"
                                                className="shrink-0"
                                            >
                                                v{cer.version}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="font-mono text-xs text-muted-foreground">
                                        {cer.id}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {formatDate(
                                            cer.finished_at ?? cer.created_at,
                                        )}
                                        {cer.theme ? ` · ${cer.theme}` : ''}
                                    </p>
                                </CardHeader>
                                <CardContent className="mt-auto space-y-3 pt-0">
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            asChild
                                            size="sm"
                                            className="rounded-xl"
                                            disabled={!cer.pdf_ready}
                                        >
                                            <a
                                                href={jobDownloadUrl(
                                                    cer.id,
                                                    'pdf',
                                                )}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                <Download className="mr-1.5 h-3.5 w-3.5" />
                                                PDF
                                            </a>
                                        </Button>
                                        <Button
                                            asChild
                                            variant="outline"
                                            size="sm"
                                            className="rounded-xl"
                                            disabled={!cer.has_latex}
                                        >
                                            <a
                                                href={jobDownloadUrl(
                                                    cer.id,
                                                    'latex',
                                                )}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                <Download className="mr-1.5 h-3.5 w-3.5" />
                                                LaTeX combiné
                                            </a>
                                        </Button>
                                        <Button
                                            asChild
                                            variant="outline"
                                            size="sm"
                                            className="rounded-xl"
                                            disabled={!cer.has_zip}
                                        >
                                            <a
                                                href={jobDownloadUrl(
                                                    cer.id,
                                                    'zip',
                                                )}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                <Download className="mr-1.5 h-3.5 w-3.5" />
                                                ZIP sources
                                            </a>
                                        </Button>
                                    </div>
                                    {!cer.pdf_ready && (
                                        <p className="text-xs text-amber-700 dark:text-amber-400">
                                            PDF indisponible — utilisez le LaTeX
                                            combiné ou le ZIP.
                                        </p>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-full rounded-xl text-xs"
                                        asChild
                                    >
                                        <Link
                                            href={`/cers/jobs?jobId=${encodeURIComponent(cer.id)}`}
                                        >
                                            Voir le détail du job
                                        </Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

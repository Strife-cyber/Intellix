import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, FileText, FolderOpen } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import cers from '@/routes/cers';
import type { BreadcrumbItem, Cer, CerSection } from '@/types';

const breadcrumbs = (cahier: Cer): BreadcrumbItem[] => [
    { title: "All Cer's", href: cers.all().url },
    { title: cahier.title || `Cahier #${cahier.id}`, href: cers.show(cahier.id).url },
];

function parsePrositSections(cahier: Cer): CerSection[] {
    const raw = (cahier as unknown as { prosit?: unknown }).prosit;

    if (Array.isArray(raw)) return raw as CerSection[];

    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw) as unknown;
            return Array.isArray(parsed) ? (parsed as CerSection[]) : [];
        } catch {
            return [];
        }
    }

    return [];
}

function formatSemicolonsToNewlines(value: string): string {
    // CER payloads sometimes store multiple lines separated by `;`.
    // Converting them makes the UI much more readable.
    return value.replace(/;\s*/g, '\n');
}

export default function Show({ cahier }: { cahier: Cer }) {
    const prositSections = parsePrositSections(cahier);

    const pdfCount = Array.isArray(cahier.pdfs) ? cahier.pdfs.length : 0;
    const zipCount = Array.isArray(cahier.zips) ? cahier.zips.length : 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs(cahier)}>
            <Head title={`${cahier.title || `Cahier #${cahier.id}`}`} />

            <div className="space-y-6 p-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <Link
                            href={cers.all().url}
                            className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors hover:bg-accent"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to all
                        </Link>

                        <h1 className="mt-4 text-2xl font-bold tracking-tight">
                            {cahier.title || `Cahier #${cahier.id}`}
                        </h1>
                        <p className="mt-2 text-sm text-muted-foreground">
                            {cahier.description || 'No description yet.'}
                        </p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                        <Badge variant="secondary">v{Number(cahier.version)}</Badge>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <FileText className="h-4 w-4" />
                            {prositSections.length} sections
                        </div>
                    </div>
                </div>

                <Card>
                    <CardHeader className="space-y-2">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                    <FolderOpen className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle>Overview</CardTitle>
                                    <CardDescription>
                                        This page is a placeholder for the next CER workflow steps.
                                    </CardDescription>
                                </div>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        <div className="grid gap-3 md:grid-cols-3">
                            <div className="rounded-xl border bg-muted/20 p-4">
                                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Sections
                                </div>
                                <div className="mt-1 text-xl font-semibold">
                                    {prositSections.length}
                                </div>
                            </div>
                            <div className="rounded-xl border bg-muted/20 p-4">
                                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    PDFs
                                </div>
                                <div className="mt-1 text-xl font-semibold">
                                    {pdfCount}
                                </div>
                            </div>
                            <div className="rounded-xl border bg-muted/20 p-4">
                                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    ZIPs
                                </div>
                                <div className="mt-1 text-xl font-semibold">
                                    {zipCount}
                                </div>
                            </div>
                        </div>

                        {prositSections.length === 0 ? (
                            <div className="rounded-2xl border bg-card p-10 text-center">
                                <p className="text-sm font-medium text-muted-foreground">
                                    No extracted sections available yet.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-semibold">Extracted Sections</h2>
                                    <span className="text-sm text-muted-foreground">
                                        Showing {prositSections.length} items
                                    </span>
                                </div>

                                <div className="grid gap-3">
                                    {prositSections.map((section, idx) => (
                                        <div
                                            key={idx}
                                            className="rounded-xl border bg-background p-4"
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="min-w-0">
                                                    <div className="text-sm font-semibold">
                                                        {section.title || `Section ${idx + 1}`}
                                                    </div>
                                                    <div className="mt-1 whitespace-pre-line break-words text-sm text-muted-foreground">
                                                        {section.content
                                                            ? formatSemicolonsToNewlines(
                                                                  section.content,
                                                              )
                                                            : '—'}
                                                    </div>
                                                </div>
                                                <Badge variant="outline" className="shrink-0">
                                                    {idx + 1}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}


import { Link } from '@inertiajs/react';
import { FileText, Folder, ArrowRight } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import cers from '@/routes/cers';
import type { BreadcrumbItem, Cer } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: "All Cer's",
        href: cers.all().url,
    },
];

function getPrositSections(cahier: Cer): unknown[] {
    const raw = (cahier as unknown as { prosit?: unknown }).prosit;

    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    return [];
}

function formatSemicolonsToNewlines(value: string): string {
    // Sometimes description fields include `;` as a "line break" marker.
    return value.replace(/;\s*/g, '\n');
}

export default function All({ cahiers }: { cahiers: Cer[] }) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="space-y-6 p-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Cahiers</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Browse all your extracted CER cahiers.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Badge variant="secondary">{cahiers.length} total</Badge>
                    </div>
                </div>

                {cahiers.length === 0 ? (
                    <div className="rounded-2xl border bg-card p-10 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Folder className="h-7 w-7" />
                        </div>
                        <h2 className="text-lg font-semibold">No cahiers yet</h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Create one from the CER processor, then it will appear here.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {cahiers.map((cahier) => {
                            const title = cahier.title || `Cahier #${cahier.id}`;
                            const description =
                                cahier.description || 'No description';
                            const prositSections = getPrositSections(cahier);

                            return (
                                <Link
                                    key={cahier.id}
                                    href={cers.show(cahier.id).url}
                                    className="group block"
                                >
                                    <Card className="h-full transition-colors group-hover:bg-accent/30">
                                        <CardHeader className="space-y-2">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                                        <FileText className="h-5 w-5" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <CardTitle className="truncate">{title}</CardTitle>
                                                        <CardDescription className="whitespace-pre-line line-clamp-2">
                                                            {description
                                                                ? formatSemicolonsToNewlines(
                                                                      description,
                                                                  )
                                                                : '—'}
                                                        </CardDescription>
                                                    </div>
                                                </div>

                                                <Badge variant="secondary" className="shrink-0">
                                                    v{Number(cahier.version)}
                                                </Badge>
                                            </div>
                                        </CardHeader>

                                        <CardContent className="flex items-center justify-between gap-3 pt-0">
                                            <div className="text-sm text-muted-foreground">
                                                {prositSections.length} sections
                                            </div>
                                            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground group-hover:text-primary">
                                                Open
                                                <ArrowRight className="h-4 w-4" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

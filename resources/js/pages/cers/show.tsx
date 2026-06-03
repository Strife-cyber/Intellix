import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import {
    ArrowLeft,
    ExternalLink,
    FileText,
    FolderOpen,
    LoaderCircle,
} from 'lucide-react';

import { TagListField } from '@/components/cers/tag-list-field';
import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { listThemes } from '@/lib/cer-api';
import {
    cerSectionsToProsit,
    formatSemicolonsToNewlines,
} from '@/lib/prosit-utils';
import cers from '@/routes/cers';
import type { BreadcrumbItem, Cer, CerSection } from '@/types';

const breadcrumbs = (cahier: Cer): BreadcrumbItem[] => [
    { title: 'Cahiers générés', href: cers.all().url },
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

export default function Show({ cahier }: { cahier: Cer }) {
    const prositSections = parsePrositSections(cahier);
    const prositPayload = useMemo(
        () => cerSectionsToProsit(prositSections),
        [prositSections],
    );

    const [themes, setThemes] = useState<string[]>(['coffee']);
    const [selectedTheme, setSelectedTheme] = useState('coffee');
    const [cerTitle, setCerTitle] = useState(cahier.title || '');
    const [cerDescription, setCerDescription] = useState(cahier.description || '');
    const [cerVersion, setCerVersion] = useState(Number(cahier.version) || 1);
    const [objectifs, setObjectifs] = useState<string[]>(
        Array.isArray(cahier.objectifs) ? (cahier.objectifs as string[]) : [],
    );
    const [difficulties, setDifficulties] = useState<string[]>(
        Array.isArray(cahier.difficultes) ? (cahier.difficultes as string[]) : [],
    );
    const [perspectives, setPerspectives] = useState<string[]>(
        Array.isArray(cahier.perspectives)
            ? (cahier.perspectives as string[])
            : [],
    );

    const [isGenerating, setIsGenerating] = useState(false);
    const [jobError, setJobError] = useState<string | null>(null);

    useEffect(() => {
        void listThemes()
            .then((list) => {
                setThemes(list);
                if (list.length && !list.includes(selectedTheme)) {
                    setSelectedTheme(list.includes('coffee') ? 'coffee' : list[0]);
                }
            })
            .catch(() => {
                /* keep default */
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleGenerate = () => {
        if (!cerTitle.trim() || !cerDescription.trim()) {
            setJobError('Titre et description sont requis.');
            return;
        }

        setJobError(null);
        router.post(
            '/cers/generate',
            {
                prosit: prositPayload,
                title: cerTitle.trim(),
                description: cerDescription.trim(),
                version: cerVersion,
                theme: selectedTheme,
                template_id: 'default',
                objectifs,
                difficulties,
                perspectives,
            },
            {
                onStart: () => setIsGenerating(true),
                onFinish: () => setIsGenerating(false),
                onError: (page) => {
                    const errs = page.props.errors as Record<string, string>;
                    setJobError(errs.cer ?? errs.prosit ?? 'Échec de la génération CER.');
                },
            },
        );
    };

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
                            Cahiers générés
                        </Link>

                        <h1 className="mt-4 text-2xl font-bold tracking-tight">
                            {cahier.title || `Cahier #${cahier.id}`}
                        </h1>
                        <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                            {cahier.description
                                ? formatSemicolonsToNewlines(cahier.description)
                                : 'Aucune description.'}
                        </p>
                    </div>

                    <Badge variant="secondary">v{Number(cahier.version)}</Badge>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <FolderOpen className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle>Sections extraites</CardTitle>
                                <CardDescription>
                                    {prositSections.length} section(s) — utilisées
                                    pour le payload{' '}
                                    <code className="text-xs">prosit</code> du
                                    microservice.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {prositSections.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                Aucune section. Importez un PROSIT depuis la{' '}
                                <Link
                                    href={cers.index().url}
                                    className="font-medium text-primary underline"
                                >
                                    bibliothèque
                                </Link>{' '}
                                puis enregistrez un cahier.
                            </p>
                        ) : (
                            <div className="grid gap-3">
                                {prositSections.map((section, idx) => (
                                    <div
                                        key={idx}
                                        className="rounded-xl border bg-background p-4"
                                    >
                                        <div className="text-sm font-semibold">
                                            {section.title ||
                                                `Section ${idx + 1}`}
                                        </div>
                                        <div className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                                            {section.content
                                                ? formatSemicolonsToNewlines(
                                                      section.content,
                                                  )
                                                : '—'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Générer le CER (PDF / ZIP)</CardTitle>
                        <CardDescription>
                            Lance la compilation via le microservice CER (clés IA
                            injectées côté serveur). Vous serez redirigé vers{' '}
                            <Link href="/cers/jobs" className="underline">
                                Travaux en cours
                            </Link>
                            .
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="cer-title">Titre</Label>
                                <Input
                                    id="cer-title"
                                    value={cerTitle}
                                    onChange={(e) => setCerTitle(e.target.value)}
                                    disabled={isGenerating}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cer-version">Version</Label>
                                <Input
                                    id="cer-version"
                                    type="number"
                                    min={0.1}
                                    step={0.1}
                                    value={cerVersion}
                                    onChange={(e) =>
                                        setCerVersion(Number(e.target.value))
                                    }
                                    disabled={isGenerating}
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="cer-description">
                                    Description / résumé
                                </Label>
                                <Textarea
                                    id="cer-description"
                                    rows={3}
                                    value={cerDescription}
                                    onChange={(e) =>
                                        setCerDescription(e.target.value)
                                    }
                                    disabled={isGenerating}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cer-theme">Thème LaTeX</Label>
                                <select
                                    id="cer-theme"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={selectedTheme}
                                    onChange={(e) =>
                                        setSelectedTheme(e.target.value)
                                    }
                                    disabled={isGenerating}
                                >
                                    {themes.map((t) => (
                                        <option key={t} value={t}>
                                            {t}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                            <TagListField
                                label="Objectifs"
                                placeholder="Ajouter un objectif"
                                values={objectifs}
                                onChange={setObjectifs}
                            />
                            <TagListField
                                label="Difficultés"
                                placeholder="Ajouter une difficulté"
                                values={difficulties}
                                onChange={setDifficulties}
                            />
                        </div>
                        <TagListField
                            label="Perspectives"
                            placeholder="Ajouter une perspective"
                            values={perspectives}
                            onChange={setPerspectives}
                        />

                        <div className="flex flex-wrap items-center gap-3">
                            <Button
                                onClick={handleGenerate}
                                disabled={isGenerating || prositSections.length === 0}
                                className="rounded-2xl"
                            >
                                {isGenerating ? (
                                    <>
                                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                        Génération…
                                    </>
                                ) : (
                                    'Lancer la génération CER'
                                )}
                            </Button>
                            <Button
                                variant="outline"
                                className="rounded-2xl"
                                asChild
                            >
                                <Link href="/cers/jobs">
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    Travaux en cours
                                </Link>
                            </Button>
                        </div>

                        {jobError && (
                            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                                {jobError}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

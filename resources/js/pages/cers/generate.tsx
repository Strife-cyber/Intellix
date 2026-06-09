import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { LoaderCircle, Sparkles } from 'lucide-react';
import { useEffect, useMemo } from 'react';

import { TagListField } from '@/components/cers/tag-list-field';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import type { Prosit, StoredProsit } from '@/lib/cer-api';
import cers from '@/routes/cers';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Bibliothèque PROSIT', href: cers.index().url },
    { title: 'Générer un CER', href: '/cers/generate' },
];

type PageProps = {
    prosits: StoredProsit[];
    themes: string[];
    microserviceError: string | null;
    initialPrositId: string | null;
};

function displayNameWithoutExt(filename: string): string {
    const dot = filename.lastIndexOf('.');
    return dot > 0 ? filename.slice(0, dot) : filename;
}

export default function CerGeneratePage() {
    const { prosits, themes, microserviceError, initialPrositId } =
        usePage<PageProps>().props;

    const sortedProsits = useMemo(
        () =>
            [...(prosits ?? [])].sort(
                (a, b) =>
                    new Date(b.uploaded_at).getTime() -
                    new Date(a.uploaded_at).getTime(),
            ),
        [prosits],
    );

    const { data, setData, post, processing, errors } = useForm({
        prosit_id: initialPrositId ?? '',
        title: '',
        description: '',
        version: 1,
        theme: (themes ?? []).includes('coffee')
            ? 'coffee'
            : ((themes ?? [])[0] ?? 'coffee'),
        template_id: 'default',
        objectifs: [] as string[],
        difficulties: [] as string[],
        perspectives: [] as string[],
    });

    useEffect(() => {
        if (!data.prosit_id) return;
        const item = sortedProsits.find((p) => p.id === data.prosit_id);
        if (!item) return;
        if (!data.title.trim()) {
            setData('title', `CER — ${displayNameWithoutExt(item.filename)}`);
        }
    }, [data.prosit_id, sortedProsits, data.title, setData]);

    const selectedProsit = sortedProsits.find((p) => p.id === data.prosit_id);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!data.title.trim() || !data.description.trim()) {
            return;
        }
        post('/cers/generate', { preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Générer un CER" />

            <form onSubmit={handleSubmit} className="space-y-6 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Générer un CER
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Choisissez un PROSIT de la bibliothèque, renseignez
                            les métadonnées, puis lancez la compilation LaTeX →
                            PDF.
                        </p>
                    </div>
                    <Button variant="outline" className="rounded-2xl" asChild>
                        <Link href={cers.index().url}>Bibliothèque PROSIT</Link>
                    </Button>
                </div>

                {microserviceError && (
                    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                        {microserviceError}
                    </div>
                )}

                {(errors.prosit || errors.cer) && (
                    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                        {errors.prosit ?? errors.cer}
                    </div>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>Paramètres du CER</CardTitle>
                        <CardDescription>
                            Le contenu PROSIT est lu depuis le microservice
                            (isolé par utilisateur).
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="cer-prosit">PROSIT actif</Label>
                                <Select
                                    value={data.prosit_id || undefined}
                                    onValueChange={(v) =>
                                        setData('prosit_id', v)
                                    }
                                >
                                    <SelectTrigger id="cer-prosit">
                                        <SelectValue placeholder="— Choisir —" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sortedProsits.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.filename}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {sortedProsits.length === 0 && (
                                    <p className="text-xs text-muted-foreground">
                                        Aucun PROSIT —{' '}
                                        <Link
                                            href={cers.index().url}
                                            className="text-primary underline"
                                        >
                                            importez-en un
                                        </Link>
                                        .
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cer-theme">Thème LaTeX</Label>
                                <Select
                                    value={data.theme}
                                    onValueChange={(v) => setData('theme', v)}
                                >
                                    <SelectTrigger id="cer-theme">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(themes ?? []).map((t) => (
                                            <SelectItem key={t} value={t}>
                                                {t}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cer-title">Titre</Label>
                                <Input
                                    id="cer-title"
                                    value={data.title}
                                    onChange={(e) =>
                                        setData('title', e.target.value)
                                    }
                                    placeholder="CER — Mon sujet"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cer-version">Version</Label>
                                <Input
                                    id="cer-version"
                                    type="number"
                                    min={0.1}
                                    step={0.1}
                                    value={data.version}
                                    onChange={(e) =>
                                        setData(
                                            'version',
                                            Number(e.target.value),
                                        )
                                    }
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="cer-description">
                                Description / résumé
                            </Label>
                            <Textarea
                                id="cer-description"
                                rows={3}
                                value={data.description}
                                onChange={(e) =>
                                    setData('description', e.target.value)
                                }
                                placeholder="Courte description du cahier"
                                required
                            />
                        </div>

                        {selectedProsit && (
                            <p className="text-xs text-muted-foreground">
                                Sections extraites de{' '}
                                <span className="font-medium text-foreground">
                                    {selectedProsit.filename}
                                </span>{' '}
                                (
                                {
                                    Object.keys(selectedProsit.prosit as Prosit)
                                        .length
                                }{' '}
                                champs)
                            </p>
                        )}

                        <div className="grid gap-6 md:grid-cols-2">
                            <TagListField
                                label="Objectifs"
                                placeholder="Ajouter un objectif"
                                values={data.objectifs}
                                onChange={(v) => setData('objectifs', v)}
                            />
                            <TagListField
                                label="Difficultés"
                                placeholder="Ajouter une difficulté"
                                values={data.difficulties}
                                onChange={(v) => setData('difficulties', v)}
                            />
                        </div>

                        <TagListField
                            label="Perspectives"
                            placeholder="Ajouter une perspective"
                            values={data.perspectives}
                            onChange={(v) => setData('perspectives', v)}
                        />

                        <div className="flex flex-wrap items-center gap-4 border-t pt-6">
                            <Button
                                type="submit"
                                className="rounded-2xl"
                                disabled={
                                    processing ||
                                    !data.prosit_id ||
                                    !data.title.trim() ||
                                    !data.description.trim()
                                }
                            >
                                {processing ? (
                                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Sparkles className="mr-2 h-4 w-4" />
                                )}
                                Lancer la génération CER
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                className="rounded-2xl"
                                asChild
                            >
                                <Link href="/cers/jobs">Travaux en cours</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </AppLayout>
    );
}

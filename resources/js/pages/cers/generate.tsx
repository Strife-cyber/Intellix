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
import type { Auth } from '@/types/auth';
import cers from '@/routes/cers';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Bibliothèque PROSIT', href: cers.index().url },
    { title: 'Générer un CER', href: '/cers/generate' },
];

type TemplateInfo = {
    id: string;
    name: string;
    builtin?: boolean;
};

type PageProps = {
    prosits: StoredProsit[];
    themes: string[];
    templates: TemplateInfo[];
    microserviceError: string | null;
    initialPrositId: string | null;
};

function displayNameWithoutExt(filename: string): string {
    const dot = filename.lastIndexOf('.');
    return dot > 0 ? filename.slice(0, dot) : filename;
}

export default function CerGeneratePage() {
    const page = usePage<PageProps & { auth: Auth }>();
    const { prosits, themes, templates, microserviceError, initialPrositId } =
        page.props;

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
        // Optional document info fields
        author: page.props.auth?.user?.name ?? '',
        pilot: '',
        promotion: '',
        brand_label: '',
        copyright_owner: '',
        doc_title: '',
        doc_status: '',
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
                            <div className="space-y-2">
                                <Label htmlFor="cer-template">Template</Label>
                                <Select
                                    value={data.template_id}
                                    onValueChange={(v) =>
                                        setData('template_id', v)
                                    }
                                >
                                    <SelectTrigger
                                        id="cer-template"
                                        className="font-mono text-xs"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(templates ?? []).map((t) => (
                                            <SelectItem key={t.id} value={t.id}>
                                                <span className="font-medium">
                                                    {t.name}
                                                </span>
                                                <span className="ml-2 text-xs text-muted-foreground">
                                                    {t.id}
                                                    {t.builtin
                                                        ? ''
                                                        : ' • personnalisé'}
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
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

                        <details className="group rounded-lg border border-dashed border-muted-foreground/30 p-4">
                            <summary className="cursor-pointer text-sm font-medium text-muted-foreground transition hover:text-foreground">
                                Informations documentaires{' '}
                                <span className="text-xs text-muted-foreground/60">
                                    — optionnel
                                </span>
                            </summary>
                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="cer-author">
                                        Auteur{' '}
                                        <span className="text-xs text-muted-foreground/60">
                                            (optionnel)
                                        </span>
                                    </Label>
                                    <Input
                                        id="cer-author"
                                        value={data.author}
                                        onChange={(e) =>
                                            setData('author', e.target.value)
                                        }
                                        placeholder="Nom de l'auteur"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cer-pilot">
                                        Pilote{' '}
                                        <span className="text-xs text-muted-foreground/60">
                                            (optionnel)
                                        </span>
                                    </Label>
                                    <Input
                                        id="cer-pilot"
                                        value={data.pilot}
                                        onChange={(e) =>
                                            setData('pilot', e.target.value)
                                        }
                                        placeholder="Nom du pilote"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cer-promotion">
                                        Promotion{' '}
                                        <span className="text-xs text-muted-foreground/60">
                                            (optionnel)
                                        </span>
                                    </Label>
                                    <Input
                                        id="cer-promotion"
                                        value={data.promotion}
                                        onChange={(e) =>
                                            setData('promotion', e.target.value)
                                        }
                                        placeholder="e.g. 2025-2026"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cer-doc-status">
                                        Statut du document{' '}
                                        <span className="text-xs text-muted-foreground/60">
                                            (optionnel)
                                        </span>
                                    </Label>
                                    <Input
                                        id="cer-doc-status"
                                        value={data.doc_status}
                                        onChange={(e) =>
                                            setData(
                                                'doc_status',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="e.g. Version provisoire"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cer-doc-title">
                                        Titre du document{' '}
                                        <span className="text-xs text-muted-foreground/60">
                                            (optionnel)
                                        </span>
                                    </Label>
                                    <Input
                                        id="cer-doc-title"
                                        value={data.doc_title}
                                        onChange={(e) =>
                                            setData('doc_title', e.target.value)
                                        }
                                        placeholder="Si différent du titre du CER"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cer-brand-label">
                                        Label / Marque{' '}
                                        <span className="text-xs text-muted-foreground/60">
                                            (optionnel)
                                        </span>
                                    </Label>
                                    <Input
                                        id="cer-brand-label"
                                        value={data.brand_label}
                                        onChange={(e) =>
                                            setData(
                                                'brand_label',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="e.g. IUT de Metz"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cer-copyright-owner">
                                        Titulaire du copyright{' '}
                                        <span className="text-xs text-muted-foreground/60">
                                            (optionnel)
                                        </span>
                                    </Label>
                                    <Input
                                        id="cer-copyright-owner"
                                        value={data.copyright_owner}
                                        onChange={(e) =>
                                            setData(
                                                'copyright_owner',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="e.g. Université de Lorraine"
                                    />
                                </div>
                            </div>
                        </details>

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

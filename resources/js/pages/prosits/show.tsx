import { Head, Link, useForm, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    FileText,
    Target,
    FileStack,
    Sparkles,
    BrainCircuit,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { BreadcrumbItem } from '@/types';
import { useState } from 'react';

interface Resource {
    id: string;
    original_name: string;
    type: string | null;
}

interface Competence {
    id: string;
    title: string;
    description: string;
    taxonomy_level: string;
    weight: number;
}

interface Prosit {
    id: string;
    mots_cles: string | null;
    contexte: string | null;
    besoin: string | null;
    problematique: string;
    generalisation: string | null;
    piste_de_solution: string | null;
    plan_d_action: string | null;
    texte: string | null;
    resources: Resource[];
    competences: Competence[];
}

export default function PrositShow({
    course,
    prosit,
}: {
    course: any;
    prosit: Prosit;
}) {
    const [isGenerating, setIsGenerating] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Courses', href: '/courses' },
        { title: course.title, href: `/courses/${course.id}` },
        {
            title: prosit.generalisation || 'Prosit sans titre',
            href: `/courses/${course.id}/prosits/${prosit.id}`,
        },
    ];

    const handleGenerateExam = () => {
        setIsGenerating(true);
        router.post(
            `/prosits/${prosit.id}/generate-exam`,
            {},
            {
                onFinish: () => setIsGenerating(false),
                onError: (err) => {
                    console.error('Failed to generate exam:', err);
                    setIsGenerating(false);
                },
            },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Prosit: ${prosit.generalisation || 'Sans titre'}`} />
            <div className="mx-auto max-w-6xl space-y-6 p-6">
                <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-white/5 bg-card p-6 shadow-lg md:flex-row md:items-center">
                    <div>
                        <div className="mb-2 flex items-center gap-3">
                            <Badge
                                variant="outline"
                                className="border-primary/50 text-[10px] tracking-widest text-primary uppercase"
                            >
                                Problem-Based Approach
                            </Badge>
                        </div>
                        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
                            <FileText className="h-8 w-8 text-primary" />
                            {prosit.generalisation || 'Prosit sans titre'}
                        </h1>
                    </div>
                    <Button
                        size="lg"
                        onClick={handleGenerateExam}
                        disabled={
                            isGenerating || prosit.competences.length === 0
                        }
                        className="shrink-0 gap-2 rounded-full bg-gradient-to-r from-primary to-purple-600 px-8 shadow-xl shadow-primary/20 hover:from-primary/90 hover:to-purple-600/90"
                    >
                        {isGenerating ? (
                            <>
                                <Sparkles className="h-5 w-5 animate-pulse" />{' '}
                                Generating Exam...
                            </>
                        ) : (
                            <>
                                <BrainCircuit className="h-5 w-5" /> Generate AI
                                Exam
                            </>
                        )}
                    </Button>
                </div>

                {prosit.competences.length === 0 && (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-500">
                        Cannot generate an AI exam: This prosit has no mapped
                        competences. Please attach competences via the database
                        first.
                    </div>
                )}

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Main Problem statement column */}
                    <div className="space-y-6 lg:col-span-2">
                        <Card className="border-white/10 bg-black/20 shadow-lg backdrop-blur-sm">
                            <CardHeader className="border-b border-white/5 bg-white/5">
                                <CardTitle className="text-lg">
                                    Problématique
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="prose prose-invert max-w-none p-6 text-sm leading-relaxed text-muted-foreground">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {prosit.problematique}
                                </ReactMarkdown>

                                {prosit.texte && (
                                    <>
                                        <hr className="my-6 border-white/10" />
                                        <h4 className="mb-2 font-semibold text-white">Texte</h4>
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {prosit.texte}
                                        </ReactMarkdown>
                                    </>
                                )}

                                {prosit.contexte && (
                                    <>
                                        <hr className="my-6 border-white/10" />
                                        <h4 className="mb-2 font-semibold text-white">Contexte</h4>
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {prosit.contexte}
                                        </ReactMarkdown>
                                    </>
                                )}

                                {prosit.besoin && (
                                    <>
                                        <hr className="my-6 border-white/10" />
                                        <h4 className="mb-2 font-semibold text-white">Besoin</h4>
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {prosit.besoin}
                                        </ReactMarkdown>
                                    </>
                                )}

                                {prosit.generalisation && (
                                    <>
                                        <hr className="my-6 border-white/10" />
                                        <h4 className="mb-2 font-semibold text-white">Généralisation</h4>
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {prosit.generalisation}
                                        </ReactMarkdown>
                                    </>
                                )}

                                {prosit.piste_de_solution && (
                                    <>
                                        <hr className="my-6 border-white/10" />
                                        <h4 className="mb-2 font-semibold text-white">Piste de solution</h4>
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {prosit.piste_de_solution}
                                        </ReactMarkdown>
                                    </>
                                )}

                                {prosit.plan_d_action && (
                                    <>
                                        <hr className="my-6 border-white/10" />
                                        <h4 className="mb-2 font-semibold text-white">Plan d'action</h4>
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {prosit.plan_d_action}
                                        </ReactMarkdown>
                                    </>
                                )}

                                {prosit.mots_cles && (
                                    <>
                                        <hr className="my-6 border-white/10" />
                                        <h4 className="mb-2 font-semibold text-white">Mots Clés</h4>
                                        <p>{prosit.mots_cles}</p>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Meta column */}
                    <div className="space-y-6">
                        <Card className="border-white/10 bg-card/40 shadow-lg">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-sm font-bold tracking-wider text-muted-foreground uppercase">
                                    <Target className="h-4 w-4 text-primary" />
                                    Competences
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 pt-0">
                                {prosit.competences &&
                                    prosit.competences.length > 0 ? (
                                    prosit.competences.map((comp) => (
                                        <div
                                            key={comp.id}
                                            className="rounded-lg border border-white/5 bg-white/5 p-3"
                                        >
                                            <p className="mb-1 text-sm leading-tight font-semibold text-white">
                                                {comp.title}
                                            </p>
                                            <div className="flex gap-2">
                                                <Badge
                                                    variant="outline"
                                                    className="border-white/20 text-[10px] text-primary uppercase"
                                                >
                                                    {comp.taxonomy_level}
                                                </Badge>
                                                <Badge
                                                    variant="secondary"
                                                    className="text-[10px]"
                                                >
                                                    Weight: {comp.weight}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-muted-foreground italic">
                                        No competences mapped.
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border-white/10 bg-card/40 shadow-lg">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-sm font-bold tracking-wider text-muted-foreground uppercase">
                                    <FileStack className="h-4 w-4 text-primary" />
                                    Attached Resources
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 pt-0">
                                {prosit.resources &&
                                    prosit.resources.length > 0 ? (
                                    prosit.resources.map((res) => (
                                        <div
                                            key={res.id}
                                            className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/5 bg-white/5 p-3 transition-colors hover:bg-white/10"
                                        >
                                            <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/20 text-primary">
                                                <FileText className="h-4 w-4" />
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="truncate text-sm font-semibold text-white">
                                                    {res.original_name}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    {res.type || 'Document'}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-muted-foreground italic">
                                        No resources attached.
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

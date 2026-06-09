import { Head, Link, useForm, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    FileText,
    Target,
    FileStack,
    Sparkles,
    BrainCircuit,
    Plus,
    X,
    Paperclip,
    Trash2,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { BreadcrumbItem } from '@/types';
import { useState } from 'react';

interface Resource {
    id: string;
    original_name: string;
    type: string | null;
    mime_type: string;
    s3_key: string;
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
    allResources = [],
}: {
    course: any;
    prosit: Prosit;
    allResources: Resource[];
}) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0);
    const [generationStatus, setGenerationStatus] = useState('');
    const [currentJobIds, setCurrentJobIds] = useState<string[]>([]);
    const [isCompDialogOpen, setIsCompDialogOpen] = useState(false);
    const [isResDialogOpen, setIsResDialogOpen] = useState(false);
    const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
    const [questionCount, setQuestionCount] = useState(10);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Courses', href: '/courses' },
        { title: course.title, href: `/courses/${course.id}` },
        {
            title: prosit.generalisation || 'Prosit sans titre',
            href: `/courses/${course.id}/prosits/${prosit.id}`,
        },
    ];

    const {
        data: compData,
        setData: setCompData,
        post: compPost,
        processing: compProcessing,
        reset: compReset,
    } = useForm({
        competences: [
            {
                title: '',
                description: '',
                taxonomy_level: 'Connaissance',
                weight: 1,
            },
        ],
    });

    const addCompRow = () => {
        setCompData('competences', [
            ...compData.competences,
            {
                title: '',
                description: '',
                taxonomy_level: 'Connaissance',
                weight: 1,
            },
        ]);
    };

    const removeCompRow = (index: number) => {
        if (compData.competences.length > 1) {
            const newComps = [...compData.competences];
            newComps.splice(index, 1);
            setCompData('competences', newComps);
        }
    };

    const updateCompRow = (index: number, key: string, value: any) => {
        const newComps = [...compData.competences];
        (newComps[index] as any)[key] = value;
        setCompData('competences', newComps);
    };

    const {
        data: resData,
        setData: setResData,
        post: resPost,
        processing: resProcessing,
    } = useForm({
        resource_ids: [] as string[],
    });

    const handleGenerateExam = async (count: number = 10) => {
        setIsGenerating(true);
        setGenerationProgress(0);
        setGenerationStatus('Dispatching generation job...');

        try {
            // Dispatch the job
            const response = await window.axios.post(
                `/prosits/${prosit.id}/generate-exam`,
                {
                    total_questions: count,
                },
            );

            const jobId = response.data.job_id;
            setCurrentJobIds([jobId]);

            // Start polling for status
            setGenerationStatus('Generating exam questions...');
            pollJobStatus(jobId, count);
        } catch (error: any) {
            console.error('Failed to start exam generation:', error);
            setGenerationStatus('Failed to start generation');
            setIsGenerating(false);
        }
    };

    const pollJobStatus = async (jobId: string, totalQuestions: number) => {
        const pollInterval = setInterval(async () => {
            try {
                const response = await window.axios.get(
                    `/jobs/exam/${jobId}/status`,
                );
                const status = response.data.data;

                setGenerationProgress(status?.progress || 0);
                setGenerationStatus(status?.message || 'Processing...');

                if (status?.status === 'completed') {
                    clearInterval(pollInterval);
                    setGenerationProgress(100);
                    setGenerationStatus('Exam generation completed!');
                    setIsGenerating(false);
                    setIsGenerateDialogOpen(false);

                    // Redirect to exams page after a short delay
                    setTimeout(() => {
                        router.visit('/exams');
                    }, 2000);
                } else if (status?.status === 'failed') {
                    clearInterval(pollInterval);
                    setGenerationStatus('Exam generation failed');
                    setIsGenerating(false);
                }
            } catch (error) {
                console.error('Failed to poll job status:', error);
                clearInterval(pollInterval);
                setGenerationStatus('Failed to check status');
                setIsGenerating(false);
            }
        }, 2000); // Poll every 2 seconds

        // Stop polling after 15 minutes max
        setTimeout(
            () => {
                clearInterval(pollInterval);
                if (isGenerating) {
                    setGenerationStatus('Generation timeout');
                    setIsGenerating(false);
                }
            },
            15 * 60 * 1000,
        );
    };

    const handleAddCompetence = (e: React.FormEvent) => {
        e.preventDefault();
        compPost(`/prosits/${prosit.id}/competences`, {
            onSuccess: () => {
                setIsCompDialogOpen(false);
                compReset();
            },
        });
    };

    const handleDeleteCompetence = (id: string) => {
        if (confirm('Are you sure you want to remove this competence?')) {
            router.delete(`/competences/${id}`);
        }
    };

    const handleAttachResource = (e: React.FormEvent) => {
        e.preventDefault();
        resPost(`/prosits/${prosit.id}/resources/attach`, {
            onSuccess: () => {
                setIsResDialogOpen(false);
                setResData('resource_ids', []);
            },
        });
    };

    const toggleResourceSelection = (id: string) => {
        const current = [...resData.resource_ids];
        const index = current.indexOf(id);
        if (index > -1) {
            current.splice(index, 1);
        } else {
            current.push(id);
        }
        setResData('resource_ids', current);
    };

    const handleDetachResource = (id: string) => {
        if (confirm('Are you sure you want to detach this resource?')) {
            router.delete(`/resources/${id}/detach`);
        }
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
                        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-black dark:text-white">
                            <FileText className="h-8 w-8 text-primary" />
                            {prosit.generalisation || 'Prosit sans titre'}
                        </h1>
                    </div>
                    <Dialog
                        open={isGenerateDialogOpen}
                        onOpenChange={setIsGenerateDialogOpen}
                    >
                        <DialogTrigger asChild>
                            <Button
                                size="lg"
                                disabled={
                                    isGenerating ||
                                    (prosit?.competences ?? []).length === 0
                                }
                                className="shrink-0 gap-2 rounded-full bg-gradient-to-r from-primary to-purple-600 px-8 shadow-xl shadow-primary/20 hover:from-primary/90 hover:to-purple-600/90"
                            >
                                {isGenerating ? (
                                    <>
                                        <Sparkles className="h-5 w-5 animate-pulse" />{' '}
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <BrainCircuit className="h-5 w-5" />{' '}
                                        Generate AI Exam
                                    </>
                                )}
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>
                                    {isGenerating
                                        ? 'Generating AI Exam...'
                                        : 'Generate AI Exam'}
                                </DialogTitle>
                                <DialogDescription>
                                    {isGenerating
                                        ? 'Your exam is being generated in the background. This may take a few minutes.'
                                        : 'How many questions should the AI generate for this exam? Higher counts will be processed in batches to ensure quality.'}
                                </DialogDescription>
                            </DialogHeader>

                            {!isGenerating && (
                                <div className="py-4">
                                    <label className="mb-2 block text-sm font-medium">
                                        Number of Questions
                                    </label>
                                    <Select
                                        value={questionCount.toString()}
                                        onValueChange={(v) =>
                                            setQuestionCount(parseInt(v))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select quantity" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="10">
                                                10 Questions
                                            </SelectItem>
                                            <SelectItem value="20">
                                                20 Questions (2 batches)
                                            </SelectItem>
                                            <SelectItem value="30">
                                                30 Questions (3 batches)
                                            </SelectItem>
                                            <SelectItem value="40">
                                                40 Questions (4 batches)
                                            </SelectItem>
                                            <SelectItem value="50">
                                                50 Questions (5 batches)
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {isGenerating && (
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span>Progress</span>
                                            <span>{generationProgress}%</span>
                                        </div>
                                        <div className="h-2 w-full rounded-full bg-gray-200">
                                            <div
                                                className="h-2 rounded-full bg-primary transition-all duration-500"
                                                style={{
                                                    width: `${generationProgress}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {generationStatus}
                                    </div>
                                </div>
                            )}

                            <DialogFooter>
                                {!isGenerating ? (
                                    <Button
                                        onClick={() =>
                                            handleGenerateExam(questionCount)
                                        }
                                        disabled={isGenerating}
                                        className="w-full bg-gradient-to-r from-primary to-purple-600"
                                    >
                                        Start Generation
                                    </Button>
                                ) : (
                                    <Button
                                        disabled
                                        className="w-full bg-gradient-to-r from-primary to-purple-600"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                            Generating...
                                        </div>
                                    </Button>
                                )}
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                {(prosit?.competences ?? []).length === 0 && (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-500">
                        Cannot generate an AI exam: This prosit has no mapped
                        competences. Please add competences using the button
                        below.
                    </div>
                )}

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Main Problem statement column */}
                    <div className="space-y-6 lg:col-span-2">
                        <Card className="border-border bg-card shadow-lg">
                            <CardHeader className="border-b border-border">
                                <CardTitle className="text-lg">
                                    Problématique
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="prose prose-gray max-w-none p-6 text-sm leading-relaxed">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {prosit.problematique}
                                </ReactMarkdown>

                                {prosit.texte && (
                                    <>
                                        <hr className="my-6 border-border" />
                                        <h4 className="mb-2 font-semibold">
                                            Texte
                                        </h4>
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                        >
                                            {prosit.texte}
                                        </ReactMarkdown>
                                    </>
                                )}

                                {prosit.contexte && (
                                    <>
                                        <hr className="my-6 border-border" />
                                        <h4 className="mb-2 font-semibold">
                                            Contexte
                                        </h4>
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                        >
                                            {prosit.contexte}
                                        </ReactMarkdown>
                                    </>
                                )}

                                {prosit.besoin && (
                                    <>
                                        <hr className="my-6 border-border" />
                                        <h4 className="mb-2 font-semibold">
                                            Besoin
                                        </h4>
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                        >
                                            {prosit.besoin}
                                        </ReactMarkdown>
                                    </>
                                )}

                                {prosit.generalisation && (
                                    <>
                                        <hr className="my-6 border-border" />
                                        <h4 className="mb-2 font-semibold">
                                            Généralisation
                                        </h4>
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                        >
                                            {prosit.generalisation}
                                        </ReactMarkdown>
                                    </>
                                )}

                                {prosit.piste_de_solution && (
                                    <>
                                        <hr className="my-6 border-border" />
                                        <h4 className="mb-2 font-semibold">
                                            Piste de solution
                                        </h4>
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                        >
                                            {prosit.piste_de_solution}
                                        </ReactMarkdown>
                                    </>
                                )}

                                {prosit.plan_d_action && (
                                    <>
                                        <hr className="my-6 border-border" />
                                        <h4 className="mb-2 font-semibold">
                                            Plan d'action
                                        </h4>
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                        >
                                            {prosit.plan_d_action}
                                        </ReactMarkdown>
                                    </>
                                )}

                                {prosit.mots_cles && (
                                    <>
                                        <hr className="my-6 border-border" />
                                        <h4 className="mb-2 font-semibold">
                                            Mots Clés
                                        </h4>
                                        <p>{prosit.mots_cles}</p>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Meta column */}
                    <div className="space-y-6">
                        <Card className="border-border bg-card shadow-lg">
                            <CardHeader className="flex flex-row items-center justify-between pb-3">
                                <CardTitle className="flex items-center gap-2 text-sm font-bold tracking-wider text-muted-foreground uppercase">
                                    <Target className="h-4 w-4 text-primary" />
                                    Competences
                                </CardTitle>
                                <Dialog
                                    open={isCompDialogOpen}
                                    onOpenChange={setIsCompDialogOpen}
                                >
                                    <DialogTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-full border border-white/10 hover:bg-white/5"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[700px]">
                                        <form
                                            onSubmit={handleAddCompetence}
                                            className="space-y-4"
                                        >
                                            <DialogHeader>
                                                <DialogTitle>
                                                    Add Competences
                                                </DialogTitle>
                                                <DialogDescription>
                                                    Define what students should
                                                    master through this Prosit.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="max-h-[60vh] space-y-6 overflow-y-auto px-1 py-4">
                                                {compData.competences.map(
                                                    (comp, index) => (
                                                        <div
                                                            key={index}
                                                            className="relative space-y-4 rounded-xl border bg-muted p-4 transition-all hover:bg-muted/80"
                                                        >
                                                            {compData
                                                                .competences
                                                                .length > 1 && (
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() =>
                                                                        removeCompRow(
                                                                            index,
                                                                        )
                                                                    }
                                                                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white"
                                                                >
                                                                    <X className="h-3 w-3" />
                                                                </Button>
                                                            )}
                                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                                <div className="space-y-2">
                                                                    <label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                                                        Title
                                                                    </label>
                                                                    <Input
                                                                        value={
                                                                            comp.title
                                                                        }
                                                                        onChange={(
                                                                            e,
                                                                        ) =>
                                                                            updateCompRow(
                                                                                index,
                                                                                'title',
                                                                                e
                                                                                    .target
                                                                                    .value,
                                                                            )
                                                                        }
                                                                        placeholder="e.g., Master UML Modeling"
                                                                        className="bg-background"
                                                                        required
                                                                    />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                                                        Taxonomy
                                                                        Level
                                                                    </label>
                                                                    <Select
                                                                        value={
                                                                            comp.taxonomy_level
                                                                        }
                                                                        onValueChange={(
                                                                            v,
                                                                        ) =>
                                                                            updateCompRow(
                                                                                index,
                                                                                'taxonomy_level',
                                                                                v,
                                                                            )
                                                                        }
                                                                    >
                                                                        <SelectTrigger className="bg-background">
                                                                            <SelectValue placeholder="Select level" />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="Connaissance">
                                                                                Connaissance
                                                                            </SelectItem>
                                                                            <SelectItem value="Application">
                                                                                Application
                                                                            </SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                                                                <div className="space-y-2">
                                                                    <label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                                                        Weight
                                                                    </label>
                                                                    <Input
                                                                        type="number"
                                                                        value={
                                                                            comp.weight
                                                                        }
                                                                        onChange={(
                                                                            e,
                                                                        ) =>
                                                                            updateCompRow(
                                                                                index,
                                                                                'weight',
                                                                                parseInt(
                                                                                    e
                                                                                        .target
                                                                                        .value,
                                                                                ),
                                                                            )
                                                                        }
                                                                        min="1"
                                                                        className="bg-background"
                                                                        required
                                                                    />
                                                                </div>
                                                                <div className="space-y-2 md:col-span-3">
                                                                    <label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                                                        Description
                                                                    </label>
                                                                    <Input
                                                                        value={
                                                                            comp.description
                                                                        }
                                                                        onChange={(
                                                                            e,
                                                                        ) =>
                                                                            updateCompRow(
                                                                                index,
                                                                                'description',
                                                                                e
                                                                                    .target
                                                                                    .value,
                                                                            )
                                                                        }
                                                                        placeholder="Detailed goal..."
                                                                        className="bg-background"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ),
                                                )}
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={addCompRow}
                                                    className="w-full border-dashed py-6 hover:border-primary/50 hover:bg-primary/5"
                                                >
                                                    <Plus className="mr-2 h-4 w-4" />{' '}
                                                    Add Another Competence
                                                </Button>
                                            </div>
                                            <DialogFooter>
                                                <Button
                                                    type="submit"
                                                    disabled={compProcessing}
                                                    className="w-full bg-gradient-to-r from-primary to-purple-600"
                                                >
                                                    {compProcessing
                                                        ? 'Adding...'
                                                        : `Add ${compData.competences.length} Competence${compData.competences.length > 1 ? 's' : ''}`}
                                                </Button>
                                            </DialogFooter>
                                        </form>
                                    </DialogContent>
                                </Dialog>
                            </CardHeader>
                            <CardContent className="space-y-3 pt-0">
                                {(prosit?.competences ?? []).length > 0 ? (
                                    prosit.competences.map((comp) => (
                                        <div
                                            key={comp.id}
                                            className="group relative rounded-lg border border-white/5 bg-white/5 p-3"
                                        >
                                            <p className="mb-1 text-sm leading-tight font-semibold">
                                                {comp?.title ?? 'Untitled'}
                                            </p>
                                            <div className="flex gap-2">
                                                <Badge
                                                    variant="outline"
                                                    className="border-white/20 text-[10px] text-primary uppercase"
                                                >
                                                    {comp?.taxonomy_level ??
                                                        'N/A'}
                                                </Badge>
                                                <Badge
                                                    variant="secondary"
                                                    className="text-[10px]"
                                                >
                                                    Weight: {comp?.weight ?? 0}
                                                </Badge>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() =>
                                                    handleDeleteCompetence(
                                                        comp.id,
                                                    )
                                                }
                                                className="absolute top-2 right-2 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-500"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-muted-foreground italic">
                                        No competences mapped.
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border-border bg-card shadow-lg">
                            <CardHeader className="flex flex-row items-center justify-between pb-3">
                                <CardTitle className="flex items-center gap-2 text-sm font-bold tracking-wider text-muted-foreground uppercase">
                                    <FileStack className="h-4 w-4 text-primary" />
                                    Attached Resources
                                </CardTitle>
                                <Dialog
                                    open={isResDialogOpen}
                                    onOpenChange={setIsResDialogOpen}
                                >
                                    <DialogTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-full border border-white/10 hover:bg-white/5"
                                        >
                                            <Paperclip className="h-4 w-4" />
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[500px]">
                                        <form
                                            onSubmit={handleAttachResource}
                                            className="space-y-4"
                                        >
                                            <DialogHeader>
                                                <DialogTitle>
                                                    Attach Resources
                                                </DialogTitle>
                                                <DialogDescription>
                                                    Select existing resources to
                                                    link to this Prosit.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="max-h-[50vh] space-y-2 overflow-y-auto py-2">
                                                {(allResources ?? []).length >
                                                0 ? (
                                                    <div className="grid gap-2">
                                                        {allResources.map(
                                                            (res) => (
                                                                <div
                                                                    key={res.id}
                                                                    className="flex items-center space-x-3 rounded-lg border bg-muted p-3 transition-colors hover:bg-muted/80"
                                                                >
                                                                    <Checkbox
                                                                        id={`res-${res.id}`}
                                                                        checked={(
                                                                            resData?.resource_ids ??
                                                                            []
                                                                        ).includes(
                                                                            res.id,
                                                                        )}
                                                                        onCheckedChange={() =>
                                                                            toggleResourceSelection(
                                                                                res.id,
                                                                            )
                                                                        }
                                                                    />
                                                                    <label
                                                                        htmlFor={`res-${res.id}`}
                                                                        className="flex-1 cursor-pointer text-sm leading-none font-medium"
                                                                    >
                                                                        {
                                                                            res.original_name
                                                                        }
                                                                    </label>
                                                                    <Badge
                                                                        variant="outline"
                                                                        className={`text-[9px] uppercase ${res?.type === 'cer' ? 'border-purple-500/30 text-purple-500' : ''}`}
                                                                    >
                                                                        {res?.type ===
                                                                        'cer'
                                                                            ? 'CER'
                                                                            : res?.type ||
                                                                              'File'}
                                                                    </Badge>
                                                                </div>
                                                            ),
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4 text-center">
                                                        <p className="text-sm font-medium text-yellow-500">
                                                            No unattached
                                                            resources found.
                                                        </p>
                                                        <Link
                                                            href="/resources/upload"
                                                            className="text-xs text-muted-foreground underline hover:text-white"
                                                        >
                                                            Go to upload page
                                                        </Link>
                                                    </div>
                                                )}
                                            </div>
                                            <DialogFooter className="gap-2 sm:gap-0">
                                                <Button
                                                    type="submit"
                                                    disabled={
                                                        resProcessing ||
                                                        resData.resource_ids
                                                            .length === 0
                                                    }
                                                    className="w-full bg-gradient-to-r from-primary to-blue-600"
                                                >
                                                    {resProcessing
                                                        ? 'Attaching...'
                                                        : `Attach ${resData.resource_ids.length} Resource${resData.resource_ids.length > 1 ? 's' : ''}`}
                                                </Button>
                                            </DialogFooter>
                                        </form>
                                    </DialogContent>
                                </Dialog>
                            </CardHeader>
                            <CardContent className="space-y-2 pt-0">
                                {(prosit?.resources ?? []).length > 0 ? (
                                    prosit.resources.map((res) => (
                                        <div
                                            key={res.id}
                                            className="group relative flex cursor-pointer items-center gap-3 rounded-lg border bg-muted p-3 transition-colors hover:bg-muted/80"
                                        >
                                            <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/20 text-primary">
                                                <FileText className="h-4 w-4" />
                                            </div>
                                            <div className="overflow-hidden pr-8">
                                                <p className="truncate text-sm leading-none font-semibold">
                                                    {res?.original_name ??
                                                        'Unknown'}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground uppercase">
                                                    {res?.type === 'cer'
                                                        ? 'CER'
                                                        : res?.type ||
                                                          'Document'}
                                                </p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() =>
                                                    handleDetachResource(res.id)
                                                }
                                                className="absolute top-1/2 right-2 h-8 w-8 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-500"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
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

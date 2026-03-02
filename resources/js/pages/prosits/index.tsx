import { Head, Link, useForm, router } from '@inertiajs/react';
import {
    FileText,
    Plus,
    Edit2,
    Trash2,
    MoreVertical,
    LayoutGrid,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Chapter, Prosit } from '@/types';

export default function PrositsIndex({
    prosits,
    chapters,
}: {
    prosits: Prosit[];
    chapters: Chapter[];
}) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Prosits', href: '/prosits' },
    ];

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingProsit, setEditingProsit] = useState<Prosit | null>(null);

    const {
        data: createData,
        setData: setCreateData,
        post: createPost,
        processing: createProcessing,
        reset: createReset,
        errors: createErrors,
    } = useForm({
        chapter_id: '',
        mots_cles: '',
        contexte: '',
        besoin: '',
        problematique: '',
        generalisation: '',
        piste_de_solution: '',
        plan_d_action: '',
        texte: '',
        generate_with_ai: false,
    });

    const {
        data: editData,
        setData: setEditData,
        put: editPut,
        processing: editProcessing,
        reset: editReset,
        errors: editErrors,
    } = useForm({
        chapter_id: '',
        mots_cles: '',
        contexte: '',
        besoin: '',
        problematique: '',
        generalisation: '',
        piste_de_solution: '',
        plan_d_action: '',
        texte: '',
    });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createPost('/prosits', {
            onSuccess: () => {
                setIsCreateOpen(false);
                createReset();
            },
        });
    };

    const openEdit = (prosit: Prosit) => {
        setEditingProsit(prosit);
        setEditData({
            chapter_id: prosit.chapter_id,
            mots_cles: prosit.mots_cles || '',
            contexte: prosit.contexte || '',
            besoin: prosit.besoin || '',
            problematique: prosit.problematique,
            generalisation: prosit.generalisation || '',
            piste_de_solution: prosit.piste_de_solution || '',
            plan_d_action: prosit.plan_d_action || '',
            texte: prosit.texte || '',
        });
        setIsEditOpen(true);
    };

    const handleEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingProsit) return;
        editPut(`/prosits/${editingProsit.id}`, {
            onSuccess: () => {
                setIsEditOpen(false);
                setEditingProsit(null);
            },
        });
    };

    const handleDelete = (id: string) => {
        if (
            confirm(
                'Are you sure you want to delete this Prosit? Related resources and competences will be affected.',
            )
        ) {
            router.delete(`/prosits/${id}`);
        }
    };

    const groupedChapters = useMemo(() => {
        const groups: Record<string, Chapter[]> = {};
        for (const chap of chapters) {
            if (!groups[chap.course.title]) groups[chap.course.title] = [];
            groups[chap.course.title].push(chap);
        }
        return groups;
    }, [chapters]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Prosits Manager - PBA Learning" />
            <div className="space-y-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            Prosits
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Manage Problem-Based Approach modules.
                        </p>
                    </div>

                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="h-4 w-4" /> New Prosit
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px]">
                            <DialogHeader>
                                <DialogTitle>Create New Prosit</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">
                                        Link to Chapter
                                    </label>
                                    <Select
                                        value={createData.chapter_id}
                                        onValueChange={(v) =>
                                            setCreateData('chapter_id', v)
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a chapter..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(
                                                groupedChapters,
                                            ).map(
                                                ([
                                                    courseTitle,
                                                    courseChapters,
                                                ]) => (
                                                    <optgroup
                                                        key={courseTitle}
                                                        label={courseTitle}
                                                        className="p-1 font-semibold text-primary"
                                                    >
                                                        {courseChapters.map(
                                                            (c) => (
                                                                <SelectItem
                                                                    key={c.id}
                                                                    value={c.id}
                                                                    className="ml-2 font-normal text-foreground"
                                                                >
                                                                    {c.title}
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                    </optgroup>
                                                ),
                                            )}
                                        </SelectContent>
                                    </Select>
                                    {createErrors.chapter_id && (
                                        <p className="text-xs text-red-500">
                                            {createErrors.chapter_id}
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center space-x-2 rounded-lg border border-primary/20 bg-primary/5 p-4">
                                    <Checkbox
                                        id="generate_with_ai"
                                        checked={createData.generate_with_ai}
                                        onCheckedChange={(checked) => setCreateData('generate_with_ai', !!checked)}
                                    />
                                    <div className="grid gap-1.5 leading-none">
                                        <label
                                            htmlFor="generate_with_ai"
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                        >
                                            Generate with AI
                                        </label>
                                        <p className="text-muted-foreground text-xs">
                                            The AI will automatically structure the Prosit from your original text.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Original Prosit Text</label>
                                    <p className="text-muted-foreground text-xs italic">
                                        Paste the raw text of the problem or situation here.
                                    </p>
                                    <Textarea value={createData.texte} onChange={e => setCreateData('texte', e.target.value)} rows={6} required />
                                </div>

                                {!createData.generate_with_ai && (
                                    <>
                                        <div className="space-y-2 border-t pt-4">
                                            <label className="text-sm font-medium text-primary">Mots Clés (Keywords)</label>
                                            <p className="text-muted-foreground text-xs">Comma-separated key technical terms.</p>
                                            <Input value={createData.mots_cles} onChange={e => setCreateData('mots_cles', e.target.value)} placeholder="e.g. React, APIs, Authentication" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-primary">Contexte</label>
                                            <p className="text-muted-foreground text-xs">Short narrative setting the scene for the student.</p>
                                            <Textarea value={createData.contexte} onChange={e => setCreateData('contexte', e.target.value)} rows={2} placeholder="Dans le cadre de votre stage chez..." />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-primary">Besoin</label>
                                            <p className="text-muted-foreground text-xs">Precisely what the main character needs to achieve.</p>
                                            <Textarea value={createData.besoin} onChange={e => setCreateData('besoin', e.target.value)} rows={2} placeholder="Le client a besoin d'une interface robuste pour..." />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-primary">Problématique (Burning Question)</label>
                                            <p className="text-muted-foreground text-xs">The core question that drives the learning.</p>
                                            <Textarea value={createData.problematique} onChange={e => setCreateData('problematique', e.target.value)} rows={2} required placeholder="Comment pouvons-nous optimiser le chargement des..." />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-primary">Généralisation (Short Title)</label>
                                            <p className="text-muted-foreground text-xs">A punchy name for the module.</p>
                                            <Input value={createData.generalisation} onChange={e => setCreateData('generalisation', e.target.value)} placeholder="e.g. Performance Optimization" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-primary">Piste de solution</label>
                                            <p className="text-muted-foreground text-xs">Guiding questions or hints for research.</p>
                                            <Textarea value={createData.piste_de_solution} onChange={e => setCreateData('piste_de_solution', e.target.value)} rows={2} placeholder="- Qu'est-ce qu'un Service Worker?\n- Comment fonctionne le cache?" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-primary">Plan d'action</label>
                                            <p className="text-muted-foreground text-xs">High-level steps to solve the problem.</p>
                                            <Textarea value={createData.plan_d_action} onChange={e => setCreateData('plan_d_action', e.target.value)} rows={3} placeholder="1. Analyser les besoins\n2. Rechercher des solutions technologiques..." />
                                        </div>
                                    </>
                                )}
                                <DialogFooter>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setIsCreateOpen(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={
                                            createProcessing ||
                                            !createData.chapter_id
                                        }
                                    >
                                        Create
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {prosits.map((prosit) => (
                        <Card
                            key={prosit.id}
                            className="group relative overflow-hidden border-2 border-white/5 bg-card/30 backdrop-blur-md transition-all hover:border-primary/40"
                        >
                            <div className="absolute top-4 right-4 z-10 opacity-0 transition-opacity group-hover:opacity-100">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 hover:bg-white/10"
                                        >
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                            onClick={() => openEdit(prosit)}
                                        >
                                            <Edit2 className="mr-2 h-4 w-4" />{' '}
                                            Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="text-red-500 hover:text-red-600 focus:bg-red-500/10 focus:text-red-600"
                                            onClick={() =>
                                                handleDelete(prosit.id)
                                            }
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />{' '}
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            <CardHeader>
                                <div className="mb-2 flex items-start justify-between">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-sm">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                </div>
                                <CardTitle
                                    className="line-clamp-2 cursor-pointer pr-6 text-lg transition-colors hover:text-primary"
                                    onClick={() =>
                                        router.visit(
                                            `/courses/${prosit.chapter.course.id}/prosits/${prosit.id}`,
                                        )
                                    }
                                >
                                    {prosit.generalisation || 'Prosit sans titre'}
                                </CardTitle>
                                <CardDescription className="mt-1 flex items-center gap-1 text-xs">
                                    <LayoutGrid className="h-3 w-3" />{' '}
                                    {prosit.chapter?.course?.title} &gt;{' '}
                                    {prosit.chapter?.title}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="mb-4 flex items-center gap-2">
                                    <Badge variant="secondary" className="text-xs">
                                        Prosit
                                    </Badge>
                                </div>
                                <Link
                                    href={`/courses/${prosit.chapter?.course?.id}/prosits/${prosit.id}`}
                                >
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                    >
                                        View Details
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    ))}

                    {prosits.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-12 text-center opacity-70">
                            <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
                            <h3 className="text-lg font-bold">
                                No Prosits Found
                            </h3>
                            <p className="text-sm">
                                Create a prosit and link it to a chapter.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Edit Prosit</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEdit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Link to Chapter
                            </label>
                            <Select
                                value={editData.chapter_id}
                                onValueChange={(v) =>
                                    setEditData('chapter_id', v)
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a chapter..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(groupedChapters).map(
                                        ([courseTitle, courseChapters]) => (
                                            <optgroup
                                                key={courseTitle}
                                                label={courseTitle}
                                                className="p-1 font-semibold text-primary"
                                            >
                                                {courseChapters.map((c) => (
                                                    <SelectItem
                                                        key={c.id}
                                                        value={c.id}
                                                        className="ml-2 font-normal text-foreground"
                                                    >
                                                        {c.title}
                                                    </SelectItem>
                                                ))}
                                            </optgroup>
                                        ),
                                    )}
                                </SelectContent>
                            </Select>
                            {editErrors.chapter_id && (
                                <p className="text-xs text-red-500">
                                    {editErrors.chapter_id}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Texte (Original Text)</label>
                            <Textarea value={editData.texte} onChange={e => setEditData('texte', e.target.value)} rows={4} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Mots Clés (Keywords)</label>
                            <Input value={editData.mots_cles} onChange={e => setEditData('mots_cles', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Contexte</label>
                            <Textarea value={editData.contexte} onChange={e => setEditData('contexte', e.target.value)} rows={2} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Besoin</label>
                            <Textarea value={editData.besoin} onChange={e => setEditData('besoin', e.target.value)} rows={2} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Problématique (Question(s))</label>
                            <Textarea value={editData.problematique} onChange={e => setEditData('problematique', e.target.value)} rows={2} required />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Généralisation</label>
                            <Input value={editData.generalisation} onChange={e => setEditData('generalisation', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Piste de solution</label>
                            <Textarea value={editData.piste_de_solution} onChange={e => setEditData('piste_de_solution', e.target.value)} rows={2} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Plan d'action</label>
                            <Textarea value={editData.plan_d_action} onChange={e => setEditData('plan_d_action', e.target.value)} rows={3} />
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsEditOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={editProcessing}>
                                Save changes
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

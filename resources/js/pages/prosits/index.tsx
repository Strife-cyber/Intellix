import { Head, Link, useForm, router } from '@inertiajs/react';
import {
    FileText,
    Plus,
    Edit2,
    Trash2,
    MoreVertical,
    LayoutGrid,
    FolderOpen,
    Upload,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import DeleteResourceModal from '@/components/delete-resource-modal';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Chapter, Prosit } from '@/types';
import { toast } from 'sonner';

export default function PrositsIndex({
    prosits,
    chapters,
    unallocatedProsits,
}: {
    prosits: Prosit[];
    chapters: Chapter[];
    unallocatedProsits: Prosit[];
}) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Prosits', href: '/prosits' },
    ];

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isAllocateOpen, setIsAllocateOpen] = useState(false);
    const [allocatingProsit, setAllocatingProsit] = useState<Prosit | null>(
        null,
    );
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
        template_id: '',
    });

    const [templates, setTemplates] = useState([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);

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

    const {
        data: allocateData,
        setData: setAllocateData,
        put: allocatePut,
        processing: allocateProcessing,
        reset: allocateReset,
        errors: allocateErrors,
    } = useForm({
        chapter_id: '',
        problematique: '',
        generalisation: '',
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
            chapter_id: prosit.chapter_id || '',
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

    const openAllocate = (prosit: Prosit) => {
        setAllocatingProsit(prosit);
        setAllocateData({
            chapter_id: '',
            problematique: prosit.problematique || '',
            generalisation: prosit.generalisation || '',
        });
        setIsAllocateOpen(true);
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

    const handleAllocate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!allocatingProsit) return;
        allocatePut(`/prosits/${allocatingProsit.id}`, {
            onSuccess: () => {
                setIsAllocateOpen(false);
                setAllocatingProsit(null);
                allocateReset();
            },
        });
    };

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [resourceToDelete, setResourceToDelete] = useState<string | null>(
        null,
    );
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = (id: string) => {
        setResourceToDelete(id);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!resourceToDelete) return;

        setIsDeleting(true);
        try {
            await router.delete(`/prosits/${resourceToDelete}`);
        } catch (error) {
            console.error('Failed to delete prosit:', error);
            toast.error('Failed to delete prosit');
        } finally {
            setIsDeleting(false);
            setDeleteModalOpen(false);
            setResourceToDelete(null);
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

    // Fetch templates when component mounts
    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                setLoadingTemplates(true);
                const response = await window.axios.get('/api/templates');
                setTemplates(response.data.templates || []);
            } catch (error) {
                console.error('Failed to fetch templates:', error);
                toast.error('Failed to load templates');
            } finally {
                setLoadingTemplates(false);
            }
        };

        fetchTemplates();
    }, []);

    const sourceBadge = (prosit: Prosit) => {
        switch (prosit.source) {
            case 'uploaded':
                return (
                    <Badge
                        variant="secondary"
                        className="border-blue-500/20 bg-blue-500/10 text-[10px] text-blue-500"
                    >
                        Importé (CER)
                    </Badge>
                );
            case 'generated':
                return (
                    <Badge
                        variant="secondary"
                        className="border-purple-500/20 bg-purple-500/10 text-[10px] text-purple-500"
                    >
                        CER Généré
                    </Badge>
                );
            default:
                return (
                    <Badge variant="secondary" className="text-xs">
                        Prosit
                    </Badge>
                );
        }
    };

    const renderPrositCard = (prosit: Prosit) => (
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
                        <DropdownMenuItem onClick={() => openEdit(prosit)}>
                            <Edit2 className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-red-500 hover:text-red-600 focus:bg-red-500/10 focus:text-red-600"
                            onClick={() => handleDelete(prosit.id)}
                        >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
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
                        prosit.chapter
                            ? router.visit(
                                  `/courses/${prosit.chapter.course.id}/prosits/${prosit.id}`,
                              )
                            : openAllocate(prosit)
                    }
                >
                    {prosit.generalisation || 'Prosit sans titre'}
                </CardTitle>
                <CardDescription className="mt-1 flex items-center gap-1 text-xs">
                    {prosit.chapter ? (
                        <>
                            <LayoutGrid className="h-3 w-3" />{' '}
                            {prosit.chapter.course.title} &gt;{' '}
                            {prosit.chapter.title}
                        </>
                    ) : (
                        <span className="text-amber-500">
                            <FolderOpen className="mr-1 inline h-3 w-3" />
                            Non alloué — cliquer pour assigner
                        </span>
                    )}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="mb-4 flex items-center gap-2">
                    {sourceBadge(prosit)}
                </div>
                {prosit.chapter ? (
                    <Link
                        href={`/courses/${prosit.chapter.course.id}/prosits/${prosit.id}`}
                    >
                        <Button variant="outline" className="w-full">
                            View Details
                        </Button>
                    </Link>
                ) : (
                    <Button
                        variant="outline"
                        className="w-full border-amber-500/30 text-amber-500 hover:text-amber-400"
                        onClick={() => openAllocate(prosit)}
                    >
                        <Upload className="mr-2 h-4 w-4" /> Assigner au cours
                    </Button>
                )}
            </CardContent>
        </Card>
    );

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

                                {createData.generate_with_ai && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">
                                            Template
                                        </label>
                                        <Select
                                            value={createData.template_id}
                                            onValueChange={(value) =>
                                                setCreateData(
                                                    'template_id',
                                                    value,
                                                )
                                            }
                                            disabled={
                                                loadingTemplates ||
                                                templates.length === 0
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a template..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {loadingTemplates ? (
                                                    <SelectItem
                                                        value="loading"
                                                        disabled
                                                    >
                                                        Loading templates...
                                                    </SelectItem>
                                                ) : templates.length > 0 ? (
                                                    templates.map(
                                                        (template) => (
                                                            <SelectItem
                                                                key={
                                                                    template.id
                                                                }
                                                                value={
                                                                    template.id
                                                                }
                                                            >
                                                                {template.name}
                                                            </SelectItem>
                                                        ),
                                                    )
                                                ) : (
                                                    <SelectItem
                                                        value=""
                                                        disabled
                                                    >
                                                        No templates available
                                                    </SelectItem>
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">
                                            Choose a template to structure your
                                            Prosit generation
                                        </p>
                                    </div>
                                )}

                                <div className="flex items-center space-x-2 rounded-lg border border-primary/20 bg-primary/5 p-4">
                                    <Checkbox
                                        id="generate_with_ai"
                                        checked={createData.generate_with_ai}
                                        onCheckedChange={(checked) => {
                                            setCreateData(
                                                'generate_with_ai',
                                                !!checked,
                                            );
                                            // Reset template when AI generation is toggled off
                                            if (!checked) {
                                                setCreateData(
                                                    'template_id',
                                                    '',
                                                );
                                            }
                                        }}
                                    />
                                    <div className="grid gap-1.5 leading-none">
                                        <label
                                            htmlFor="generate_with_ai"
                                            className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                        >
                                            Generate with AI
                                        </label>
                                        <p className="text-xs text-muted-foreground">
                                            The AI will automatically structure
                                            the Prosit from your original text.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">
                                        Original Prosit Text
                                    </label>
                                    <p className="text-xs text-muted-foreground italic">
                                        Paste the raw text of the problem or
                                        situation here.
                                    </p>
                                    <Textarea
                                        value={createData.texte}
                                        onChange={(e) =>
                                            setCreateData(
                                                'texte',
                                                e.target.value,
                                            )
                                        }
                                        rows={6}
                                        required
                                    />
                                </div>

                                {!createData.generate_with_ai && (
                                    <>
                                        <div className="space-y-2 border-t pt-4">
                                            <label className="text-sm font-medium text-primary">
                                                Mots Clés (Keywords)
                                            </label>
                                            <p className="text-xs text-muted-foreground">
                                                Comma-separated key technical
                                                terms.
                                            </p>
                                            <Input
                                                value={createData.mots_cles}
                                                onChange={(e) =>
                                                    setCreateData(
                                                        'mots_cles',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="e.g. React, APIs, Authentication"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-primary">
                                                Contexte
                                            </label>
                                            <p className="text-xs text-muted-foreground">
                                                Short narrative setting the
                                                scene for the student.
                                            </p>
                                            <Textarea
                                                value={createData.contexte}
                                                onChange={(e) =>
                                                    setCreateData(
                                                        'contexte',
                                                        e.target.value,
                                                    )
                                                }
                                                rows={2}
                                                placeholder="Dans le cadre de votre stage chez..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-primary">
                                                Besoin
                                            </label>
                                            <p className="text-xs text-muted-foreground">
                                                Precisely what the main
                                                character needs to achieve.
                                            </p>
                                            <Textarea
                                                value={createData.besoin}
                                                onChange={(e) =>
                                                    setCreateData(
                                                        'besoin',
                                                        e.target.value,
                                                    )
                                                }
                                                rows={2}
                                                placeholder="Le client a besoin d'une interface robuste pour..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-primary">
                                                Problématique (Burning Question)
                                            </label>
                                            <p className="text-xs text-muted-foreground">
                                                The core question that drives
                                                the learning.
                                            </p>
                                            <Textarea
                                                value={createData.problematique}
                                                onChange={(e) =>
                                                    setCreateData(
                                                        'problematique',
                                                        e.target.value,
                                                    )
                                                }
                                                rows={2}
                                                required
                                                placeholder="Comment pouvons-nous optimiser le chargement des..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-primary">
                                                Généralisation (Short Title)
                                            </label>
                                            <p className="text-xs text-muted-foreground">
                                                A punchy name for the module.
                                            </p>
                                            <Input
                                                value={
                                                    createData.generalisation
                                                }
                                                onChange={(e) =>
                                                    setCreateData(
                                                        'generalisation',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="e.g. Performance Optimization"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-primary">
                                                Piste de solution
                                            </label>
                                            <p className="text-xs text-muted-foreground">
                                                Guiding questions or hints for
                                                research.
                                            </p>
                                            <Textarea
                                                value={
                                                    createData.piste_de_solution
                                                }
                                                onChange={(e) =>
                                                    setCreateData(
                                                        'piste_de_solution',
                                                        e.target.value,
                                                    )
                                                }
                                                rows={2}
                                                placeholder="- Qu'est-ce qu'un Service Worker?\n- Comment fonctionne le cache?"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-primary">
                                                Plan d'action
                                            </label>
                                            <p className="text-xs text-muted-foreground">
                                                High-level steps to solve the
                                                problem.
                                            </p>
                                            <Textarea
                                                value={createData.plan_d_action}
                                                onChange={(e) =>
                                                    setCreateData(
                                                        'plan_d_action',
                                                        e.target.value,
                                                    )
                                                }
                                                rows={3}
                                                placeholder="1. Analyser les besoins\n2. Rechercher des solutions technologiques..."
                                            />
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
                                        disabled={createProcessing}
                                    >
                                        Create
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                <Tabs defaultValue="allocated">
                    <TabsList>
                        <TabsTrigger value="allocated" className="gap-2">
                            <LayoutGrid className="h-4 w-4" />
                            Alloués ({prosits.length})
                        </TabsTrigger>
                        <TabsTrigger value="unallocated" className="gap-2">
                            <FolderOpen className="h-4 w-4" />
                            Non alloués ({unallocatedProsits.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="allocated" className="mt-6">
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {prosits.map(renderPrositCard)}
                            {prosits.length === 0 && (
                                <div className="col-span-full flex flex-col items-center justify-center py-12 text-center opacity-70">
                                    <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
                                    <h3 className="text-lg font-bold">
                                        No Allocated Prosits
                                    </h3>
                                    <p className="text-sm">
                                        Create a prosit or import one from the
                                        CER library.
                                    </p>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="unallocated" className="mt-6">
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {unallocatedProsits.map(renderPrositCard)}
                            {unallocatedProsits.length === 0 && (
                                <div className="col-span-full flex flex-col items-center justify-center py-12 text-center opacity-70">
                                    <FolderOpen className="mb-4 h-12 w-12 text-muted-foreground" />
                                    <h3 className="text-lg font-bold">
                                        No Unallocated Prosits
                                    </h3>
                                    <p className="text-sm">
                                        Import a prosit from the CER library and
                                        it will appear here.
                                    </p>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Edit dialog */}
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
                            <label className="text-sm font-medium">
                                Texte (Original Text)
                            </label>
                            <Textarea
                                value={editData.texte}
                                onChange={(e) =>
                                    setEditData('texte', e.target.value)
                                }
                                rows={4}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Mots Clés (Keywords)
                            </label>
                            <Input
                                value={editData.mots_cles}
                                onChange={(e) =>
                                    setEditData('mots_cles', e.target.value)
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Contexte
                            </label>
                            <Textarea
                                value={editData.contexte}
                                onChange={(e) =>
                                    setEditData('contexte', e.target.value)
                                }
                                rows={2}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Besoin
                            </label>
                            <Textarea
                                value={editData.besoin}
                                onChange={(e) =>
                                    setEditData('besoin', e.target.value)
                                }
                                rows={2}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Problématique (Question(s))
                            </label>
                            <Textarea
                                value={editData.problematique}
                                onChange={(e) =>
                                    setEditData('problematique', e.target.value)
                                }
                                rows={2}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Généralisation
                            </label>
                            <Input
                                value={editData.generalisation}
                                onChange={(e) =>
                                    setEditData(
                                        'generalisation',
                                        e.target.value,
                                    )
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Piste de solution
                            </label>
                            <Textarea
                                value={editData.piste_de_solution}
                                onChange={(e) =>
                                    setEditData(
                                        'piste_de_solution',
                                        e.target.value,
                                    )
                                }
                                rows={2}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Plan d'action
                            </label>
                            <Textarea
                                value={editData.plan_d_action}
                                onChange={(e) =>
                                    setEditData('plan_d_action', e.target.value)
                                }
                                rows={3}
                            />
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

            {/* Allocate dialog (for unallocated prosits) */}
            <Dialog open={isAllocateOpen} onOpenChange={setIsAllocateOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Assigner au cours</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAllocate} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Chapitre
                            </label>
                            <Select
                                value={allocateData.chapter_id}
                                onValueChange={(v) =>
                                    setAllocateData('chapter_id', v)
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionnez un chapitre..." />
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
                            {allocateErrors.chapter_id && (
                                <p className="text-xs text-red-500">
                                    {allocateErrors.chapter_id}
                                </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                                Le prosit sera lié à ce chapitre et deviendra
                                visible dans le cours.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Problématique
                            </label>
                            <Textarea
                                value={allocateData.problematique}
                                onChange={(e) =>
                                    setAllocateData(
                                        'problematique',
                                        e.target.value,
                                    )
                                }
                                rows={3}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Généralisation (titre court)
                            </label>
                            <Input
                                value={allocateData.generalisation}
                                onChange={(e) =>
                                    setAllocateData(
                                        'generalisation',
                                        e.target.value,
                                    )
                                }
                                placeholder="e.g. Performance Optimization"
                            />
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsAllocateOpen(false)}
                            >
                                Annuler
                            </Button>
                            <Button
                                type="submit"
                                disabled={
                                    allocateProcessing ||
                                    !allocateData.chapter_id
                                }
                            >
                                {allocateProcessing
                                    ? 'Assignation...'
                                    : 'Assigner au chapitre'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <DeleteResourceModal
                isOpen={deleteModalOpen}
                onClose={() => {
                    setDeleteModalOpen(false);
                    setResourceToDelete(null);
                }}
                onConfirm={confirmDelete}
                resourceName={
                    prosits.find((p) => p.id === resourceToDelete)?.title ||
                    'this resource'
                }
                isLoading={isDeleting}
            />
        </AppLayout>
    );
}

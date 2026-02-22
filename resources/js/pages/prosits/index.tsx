import { useState, useMemo } from 'react';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
import {
    FileText,
    Plus,
    Edit2,
    Trash2,
    MoreVertical,
    LayoutGrid,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { BreadcrumbItem } from '@/types';

interface Prosit {
    id: string;
    chapter_id: string;
    title: string;
    problem_statement: string;
    difficulty_level: string | null;
    chapter: {
        id: string;
        title: string;
        course: { id: string; title: string };
    };
}

interface Chapter {
    id: string;
    title: string;
    course: { id: string; title: string };
}

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
        title: '',
        problem_statement: '',
        difficulty_level: 'Beginner',
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
        title: '',
        problem_statement: '',
        difficulty_level: 'Beginner',
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
            title: prosit.title,
            problem_statement: prosit.problem_statement,
            difficulty_level: prosit.difficulty_level || 'Beginner',
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
            <div className="mx-auto max-w-7xl space-y-6 p-6">
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
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">
                                        Title
                                    </label>
                                    <Input
                                        value={createData.title}
                                        onChange={(e) =>
                                            setCreateData(
                                                'title',
                                                e.target.value,
                                            )
                                        }
                                        required
                                    />
                                    {createErrors.title && (
                                        <p className="text-xs text-red-500">
                                            {createErrors.title}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">
                                        Difficulty Level
                                    </label>
                                    <Select
                                        value={createData.difficulty_level}
                                        onValueChange={(v) =>
                                            setCreateData('difficulty_level', v)
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Beginner">
                                                Beginner
                                            </SelectItem>
                                            <SelectItem value="Intermediate">
                                                Intermediate
                                            </SelectItem>
                                            <SelectItem value="Advanced">
                                                Advanced
                                            </SelectItem>
                                            <SelectItem value="Expert">
                                                Expert
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">
                                        Problem Statement (supports Markdown)
                                    </label>
                                    <Textarea
                                        value={createData.problem_statement}
                                        onChange={(e) =>
                                            setCreateData(
                                                'problem_statement',
                                                e.target.value,
                                            )
                                        }
                                        rows={5}
                                        required
                                    />
                                </div>
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
                                    {prosit.title}
                                </CardTitle>
                                <CardDescription className="mt-1 flex items-center gap-1 text-xs">
                                    <LayoutGrid className="h-3 w-3" />{' '}
                                    {prosit.chapter?.course?.title} &gt;{' '}
                                    {prosit.chapter?.title}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="mb-4 flex items-center gap-2">
                                    <Badge
                                        variant="secondary"
                                        className="text-xs"
                                    >
                                        {prosit.difficulty_level || 'Unrated'}
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
                            <label className="text-sm font-medium">Title</label>
                            <Input
                                value={editData.title}
                                onChange={(e) =>
                                    setEditData('title', e.target.value)
                                }
                                required
                            />
                            {editErrors.title && (
                                <p className="text-xs text-red-500">
                                    {editErrors.title}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Difficulty Level
                            </label>
                            <Select
                                value={editData.difficulty_level}
                                onValueChange={(v) =>
                                    setEditData('difficulty_level', v)
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Beginner">
                                        Beginner
                                    </SelectItem>
                                    <SelectItem value="Intermediate">
                                        Intermediate
                                    </SelectItem>
                                    <SelectItem value="Advanced">
                                        Advanced
                                    </SelectItem>
                                    <SelectItem value="Expert">
                                        Expert
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Problem Statement
                            </label>
                            <Textarea
                                value={editData.problem_statement}
                                onChange={(e) =>
                                    setEditData(
                                        'problem_statement',
                                        e.target.value,
                                    )
                                }
                                rows={5}
                                required
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
        </AppLayout>
    );
}

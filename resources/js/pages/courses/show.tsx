import { useState } from 'react';
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
    Layers,
    FileText,
    ChevronRight,
    Plus,
    MoreVertical,
    Trash2,
} from 'lucide-react';
import type { BreadcrumbItem } from '@/types';

interface Prosit {
    id: string;
    title: string;
    difficulty_level: string | null;
}

interface Chapter {
    id: string;
    title: string;
    description: string;
    prosits: Prosit[];
}

interface Course {
    id: string;
    title: string;
    description: string;
    chapters: Chapter[];
}

export default function CourseShow({ course }: { course: Course }) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Courses', href: '/courses' },
        { title: course.title, href: `/courses/${course.id}` },
    ];

    const [isCreateChapterOpen, setIsCreateChapterOpen] = useState(false);

    const {
        data: chapterData,
        setData: setChapterData,
        post: chapterPost,
        processing: chapterProcessing,
        reset: chapterReset,
        errors: chapterErrors,
    } = useForm({
        title: '',
        description: '',
    });

    const handleCreateChapter = (e: React.FormEvent) => {
        e.preventDefault();
        chapterPost(`/courses/${course.id}/chapters`, {
            onSuccess: () => {
                setIsCreateChapterOpen(false);
                chapterReset();
            },
        });
    };

    const handleDeleteChapter = (id: string) => {
        if (
            confirm(
                'Are you sure you want to delete this chapter? All its prosits will be deleted.',
            )
        ) {
            router.delete(`/chapters/${id}`);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${course.title} - Overview`} />
            <div className="mx-auto max-w-5xl space-y-8 p-6">
                <div className="rounded-3xl border border-primary/20 bg-primary/10 p-8 backdrop-blur-sm">
                    <h1 className="mb-4 text-4xl font-bold tracking-tight text-white">
                        {course.title}
                    </h1>
                    <p className="max-w-3xl text-lg leading-relaxed text-white/80">
                        {course.description ||
                            'Course overview and learning objectives.'}
                    </p>
                </div>

                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="flex items-center gap-2 text-2xl font-semibold">
                            <Layers className="h-6 w-6 text-primary" />
                            Course Chapters
                        </h2>

                        <Dialog
                            open={isCreateChapterOpen}
                            onOpenChange={setIsCreateChapterOpen}
                        >
                            <DialogTrigger asChild>
                                <Button size="sm" className="gap-2">
                                    <Plus className="h-4 w-4" /> Add Chapter
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Add New Chapter</DialogTitle>
                                </DialogHeader>
                                <form
                                    onSubmit={handleCreateChapter}
                                    className="space-y-4"
                                >
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">
                                            Title
                                        </label>
                                        <Input
                                            value={chapterData.title}
                                            onChange={(e) =>
                                                setChapterData(
                                                    'title',
                                                    e.target.value,
                                                )
                                            }
                                            required
                                        />
                                        {chapterErrors.title && (
                                            <p className="text-xs text-red-500">
                                                {chapterErrors.title}
                                            </p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">
                                            Description
                                        </label>
                                        <Textarea
                                            value={chapterData.description}
                                            onChange={(e) =>
                                                setChapterData(
                                                    'description',
                                                    e.target.value,
                                                )
                                            }
                                            rows={3}
                                        />
                                    </div>
                                    <DialogFooter>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() =>
                                                setIsCreateChapterOpen(false)
                                            }
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={chapterProcessing}
                                        >
                                            Add Chapter
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {course.chapters && course.chapters.length > 0 ? (
                        <div className="space-y-4">
                            {course.chapters.map((chapter) => (
                                <Card
                                    key={chapter.id}
                                    className="group relative overflow-hidden border-white/10 bg-black/20 shadow-lg backdrop-blur-md"
                                >
                                    <div className="absolute top-4 right-4 z-10 opacity-0 transition-opacity group-hover:opacity-100">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-500 hover:bg-red-500/20"
                                            onClick={() =>
                                                handleDeleteChapter(chapter.id)
                                            }
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <CardHeader className="border-b border-white/5 bg-white/5 pr-14">
                                        <CardTitle className="text-xl">
                                            {chapter.title}
                                        </CardTitle>
                                        <CardDescription>
                                            {chapter.description}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <div className="mb-4 flex items-center justify-between">
                                            <h3 className="text-sm font-bold tracking-widest text-muted-foreground uppercase">
                                                Associated Prosits
                                            </h3>
                                            <Link href="/prosits">
                                                <Button
                                                    variant="link"
                                                    size="sm"
                                                    className="h-auto p-0 text-primary"
                                                >
                                                    Manage Prosits &rarr;
                                                </Button>
                                            </Link>
                                        </div>
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            {chapter.prosits &&
                                            chapter.prosits.length > 0 ? (
                                                chapter.prosits.map(
                                                    (prosit) => (
                                                        <Link
                                                            key={prosit.id}
                                                            href={`/courses/${course.id}/prosits/${prosit.id}`}
                                                        >
                                                            <div className="group/item flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 transition-all hover:border-primary/50 hover:bg-primary/20">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
                                                                        <FileText className="h-4 w-4" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-semibold transition-colors group-hover/item:text-primary">
                                                                            {
                                                                                prosit.title
                                                                            }
                                                                        </p>
                                                                        {prosit.difficulty_level && (
                                                                            <p className="text-xs text-muted-foreground">
                                                                                {
                                                                                    prosit.difficulty_level
                                                                                }
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover/item:translate-x-1 group-hover/item:text-primary" />
                                                            </div>
                                                        </Link>
                                                    ),
                                                )
                                            ) : (
                                                <p className="col-span-full text-sm text-muted-foreground italic">
                                                    No prosits defined for this
                                                    chapter. Create one in the
                                                    Prosits view.
                                                </p>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-white/20 bg-black/20 p-12 text-center">
                            <Layers className="mx-auto mb-4 h-10 w-10 text-muted-foreground opacity-50" />
                            <h3 className="text-lg font-bold">
                                No Chapters Found
                            </h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Add a chapter to start building your course.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}

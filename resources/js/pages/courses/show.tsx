import { Head, Link, useForm, router } from '@inertiajs/react';
import {
    ChevronRight,
    Plus,
    MoreVertical,
} from 'lucide-react';
import { useState } from 'react';
import {
    Button,
} from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

interface Prosit {
    id: string;
    title: string;
    generalisation: string;
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
                'Deleting this chapter will permanently remove all associated prosits. Continue?',
            )
        ) {
            router.delete(`/chapters/${id}`);
        }
    };

    const totalProsits =
        course.chapters?.reduce(
            (acc, chapter) => acc + (chapter.prosits?.length || 0),
            0,
        ) || 0;

    console.log(course);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${course.title} - Overview`} />

            <div className="min-h-screen bg-background">

                {/* Course Header */}
                <div className="border-b px-6 py-8">
                    <div className="max-w-5xl">
                        <p className="text-xs uppercase tracking-widest text-muted-foreground">
                            Course
                        </p>
                        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                            {course.title}
                        </h1>
                        <p className="mt-4 max-w-3xl text-muted-foreground">
                            {course.description ||
                                'Course overview and learning objectives.'}
                        </p>
                    </div>
                </div>

                {/* Stats Bar */}
                <div className="border-b px-6 py-4 text-sm text-muted-foreground">
                    <div className="flex gap-8">
                        <span>{course.chapters?.length || 0} Chapters</span>
                        <span>{totalProsits} Prosits</span>
                    </div>
                </div>

                {/* Content */}
                <div className="px-6 py-10 space-y-10 max-w-6xl">

                    {/* Section Header */}
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">
                            Chapters
                        </h2>

                        <Dialog
                            open={isCreateChapterOpen}
                            onOpenChange={setIsCreateChapterOpen}
                        >
                            <DialogTrigger asChild>
                                <Button size="sm" className="gap-2">
                                    <Plus className="h-4 w-4" />
                                    Add Chapter
                                </Button>
                            </DialogTrigger>

                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>
                                        Create Chapter
                                    </DialogTitle>
                                </DialogHeader>

                                <form
                                    onSubmit={handleCreateChapter}
                                    className="space-y-5"
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
                                            <p className="text-xs text-red-600">
                                                {chapterErrors.title}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">
                                            Description
                                        </label>
                                        <Textarea
                                            rows={3}
                                            value={chapterData.description}
                                            onChange={(e) =>
                                                setChapterData(
                                                    'description',
                                                    e.target.value,
                                                )
                                            }
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
                                            Create
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {/* Chapters List */}
                    {course.chapters && course.chapters.length > 0 ? (
                        <div className="space-y-6">

                            {course.chapters.map((chapter) => (
                                <div
                                    key={chapter.id}
                                    className="rounded-lg border bg-card shadow-sm"
                                >
                                    {/* Chapter Header */}
                                    <div className="flex items-start justify-between border-b px-6 py-4">
                                        <div>
                                            <h3 className="text-lg font-semibold">
                                                {chapter.title}
                                            </h3>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                {chapter.description}
                                            </p>
                                        </div>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                >
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        handleDeleteChapter(
                                                            chapter.id,
                                                        )
                                                    }
                                                    className="text-red-600"
                                                >
                                                    Delete Chapter
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    {/* Prosits List */}
                                    <div className="divide-y">
                                        {chapter.prosits &&
                                        chapter.prosits.length > 0 ? (
                                            chapter.prosits.map((prosit) => (
                                                <Link
                                                    key={prosit.id}
                                                    href={`/courses/${course.id}/prosits/${prosit.id}`}
                                                    className="flex items-center justify-between px-6 py-3 hover:bg-muted/40 transition-colors"
                                                >
                                                    <div>
                                                        <p className="text-sm font-medium">
                                                            {prosit.generalisation}
                                                        </p>
                                                        {prosit.difficulty_level && (
                                                            <p className="text-xs text-muted-foreground">
                                                                {
                                                                    prosit.difficulty_level
                                                                }
                                                            </p>
                                                        )}
                                                    </div>

                                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                </Link>
                                            ))
                                        ) : (
                                            <div className="px-6 py-6 text-sm text-muted-foreground">
                                                No prosits defined for this chapter.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-lg border p-12 text-center">
                            <h3 className="text-base font-medium">
                                No chapters yet
                            </h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Create your first chapter to structure this course.
                            </p>
                            <Button
                                className="mt-4"
                                onClick={() =>
                                    setIsCreateChapterOpen(true)
                                }
                            >
                                Add Chapter
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}

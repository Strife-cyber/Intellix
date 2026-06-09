import { Head, Link, useForm, router } from '@inertiajs/react';
import {
    BookOpen,
    FolderOpen,
    Plus,
    Edit2,
    Trash2,
    MoreVertical,
} from 'lucide-react';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
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
import type { BreadcrumbItem, Course } from '@/types';

export default function CoursesIndex({ courses = [] }: { courses?: Course[] }) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Courses', href: '/courses' },
    ];

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);

    const {
        data: createData,
        setData: setCreateData,
        post: createPost,
        processing: createProcessing,
        reset: createReset,
        errors: createErrors,
    } = useForm({
        title: '',
        description: '',
    });

    const {
        data: editData,
        setData: setEditData,
        put: editPut,
        processing: editProcessing,
        reset: editReset,
        errors: editErrors,
    } = useForm({
        title: '',
        description: '',
    });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createPost('/courses', {
            onSuccess: () => {
                setIsCreateOpen(false);
                createReset();
            },
        });
    };

    const openEdit = (course: Course) => {
        setEditingCourse(course);
        setEditData({
            title: course.title,
            description: course.description || '',
        });
        setIsEditOpen(true);
    };

    const handleEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCourse) return;
        editPut(`/courses/${editingCourse.id}`, {
            onSuccess: () => {
                setIsEditOpen(false);
                setEditingCourse(null);
            },
        });
    };

    const handleDelete = (id: string) => {
        if (
            confirm(
                'Are you sure you want to delete this course? All associated chapters and prosits will be deleted.',
            )
        ) {
            router.delete(`/courses/${id}`);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Courses - PBA Learning" />
            <div className="space-y-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            Courses
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Select a course to explore chapters and Prosits.
                        </p>
                    </div>

                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="h-4 w-4" /> New Course
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create New Course</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleCreate} className="space-y-4">
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
                                        Description
                                    </label>
                                    <Textarea
                                        value={createData.description}
                                        onChange={(e) =>
                                            setCreateData(
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

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {courses.map((course) => (
                        <Card
                            key={course.id}
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
                                            onClick={() => openEdit(course)}
                                        >
                                            <Edit2 className="mr-2 h-4 w-4" />{' '}
                                            Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="text-red-500 hover:text-red-600 focus:bg-red-500/10 focus:text-red-600"
                                            onClick={() =>
                                                handleDelete(course.id)
                                            }
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />{' '}
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            <CardHeader
                                className="cursor-pointer"
                                onClick={() =>
                                    router.visit(`/courses/${course.id}`)
                                }
                            >
                                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-lg transition-transform group-hover:scale-110">
                                    <BookOpen className="h-6 w-6" />
                                </div>
                                <CardTitle className="pr-6 text-xl transition-colors group-hover:text-primary">
                                    {course.title}
                                </CardTitle>
                                <CardDescription className="mt-2 line-clamp-2">
                                    {course.description ||
                                        'No description provided.'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                                    <FolderOpen className="h-4 w-4" />
                                    {course.chapters?.length || 0} Chapters
                                </div>
                                <Link href={`/courses/${course.id}`}>
                                    <Button className="w-full">
                                        View Course
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    ))}

                    {courses.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-12 text-center opacity-70">
                            <BookOpen className="mb-4 h-12 w-12 text-muted-foreground" />
                            <h3 className="text-lg font-bold">
                                No Courses Found
                            </h3>
                            <p className="text-sm">
                                Create a course to get started.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Course</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEdit} className="space-y-4">
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
                                Description
                            </label>
                            <Textarea
                                value={editData.description}
                                onChange={(e) =>
                                    setEditData('description', e.target.value)
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
        </AppLayout>
    );
}

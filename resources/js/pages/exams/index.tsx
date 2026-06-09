import { Head, Link } from '@inertiajs/react';
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
import { BrainCircuit, Clock, FileText, CheckCircle2 } from 'lucide-react';
import type { BreadcrumbItem } from '@/types';

interface Exam {
    id: string;
    prosit_id: string;
    generated_by_ai: boolean;
    total_marks: number;
    duration: number | null;
    difficulty_level: string | null;
    created_at: string;
    prosit: {
        id: string;
        title: string;
        chapter: {
            id: string;
            title: string;
            course: { id: string; title: string };
        } | null;
    } | null;
}

export default function ExamsIndex({ exams }: { exams: Exam[] }) {
    const breadcrumbs: BreadcrumbItem[] = [{ title: 'Exams', href: '/exams' }];

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Exams Overview - PBA Learning" />
            <div className="mx-auto max-w-7xl space-y-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            Practice Exams
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Review your generated exams from different Prosits.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {(exams ?? []).map((exam) => (
                        <Card
                            key={exam.id}
                            className="group flex flex-col overflow-hidden border-2 border-white/5 bg-card/30 backdrop-blur-md transition-all hover:border-primary/40"
                        >
                            <CardHeader className="relative pb-3">
                                {exam.generated_by_ai && (
                                    <div
                                        className="absolute top-4 right-4 text-primary opacity-60"
                                        title="AI Generated"
                                    >
                                        <BrainCircuit className="h-5 w-5" />
                                    </div>
                                )}
                                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-sm">
                                    <CheckCircle2 className="h-5 w-5" />
                                </div>
                                <CardTitle
                                    className="line-clamp-1 cursor-pointer pr-6 text-lg transition-colors hover:text-primary"
                                    title={exam.prosit?.title}
                                >
                                    {exam.prosit?.title || 'Unknown Prosit'}{' '}
                                    Exam
                                </CardTitle>
                                <CardDescription className="mt-1 flex items-center gap-1 truncate text-xs">
                                    <FileText className="h-3 w-3 shrink-0" />{' '}
                                    {exam.prosit?.chapter?.course?.title}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-1 flex-col justify-end">
                                <div className="mb-5 flex flex-wrap gap-2">
                                    <Badge
                                        variant="outline"
                                        className="border-primary/20 text-xs text-primary"
                                    >
                                        {exam.total_marks} Marks
                                    </Badge>
                                    <Badge
                                        variant="secondary"
                                        className="text-xs"
                                    >
                                        {exam.difficulty_level || 'Standard'}
                                    </Badge>
                                    <Badge
                                        variant="outline"
                                        className="flex items-center gap-1 border-white/10 text-[10px] text-muted-foreground"
                                    >
                                        <Clock className="h-3 w-3" />{' '}
                                        {formatDate(exam.created_at)}
                                    </Badge>
                                </div>
                                <Link href={`/exams/${exam.id}`}>
                                    <Button className="w-full gap-2">
                                        Take Exam{' '}
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    ))}

                    {(exams ?? []).length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-12 text-center opacity-70">
                            <CheckCircle2 className="mb-4 h-12 w-12 text-muted-foreground" />
                            <h3 className="text-lg font-bold">
                                No Exams Found
                            </h3>
                            <p className="text-sm">
                                Generate your first exam from a Prosit Details
                                page.
                            </p>
                            <Link href="/courses" className="mt-4">
                                <Button variant="outline">
                                    Browse Courses
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}

function ChevronRight({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="m9 18 6-6-6-6" />
        </svg>
    );
}

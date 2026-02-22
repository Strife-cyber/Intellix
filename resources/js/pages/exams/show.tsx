import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
    CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    CheckCircle2,
    ChevronRight,
    HelpCircle,
    FileSignature,
    BrainCircuit,
    Sparkles,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { BreadcrumbItem } from '@/types';
import { useState } from 'react';

interface Question {
    id: string;
    type: string;
    question_text: string;
    marks: number;
    difficulty: string | null;
    explanation: string;
    options: string[] | null;
    correct_option: string | null;
    correct_boolean: boolean | null;
    expected_answer: string | null;
    competence: { title: string; taxonomy_level: string } | null;
}

interface Exam {
    id: string;
    prosit_id: string;
    generated_by_ai: boolean;
    total_marks: number;
    questions: Question[];
    prosit: { title: string; id: string };
}

export default function ExamShow({ exam }: { exam: Exam }) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Courses', href: '/courses' },
        { title: 'Exams', href: '#' },
        { title: 'Practice Generated Exam', href: `/exams/${exam.id}` },
    ];

    const [revealed, setRevealed] = useState<Record<string, boolean>>({});

    const toggleReveal = (id: string) => {
        setRevealed((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const renderMCQ = (q: Question) => (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {q.options &&
                    q.options.map((opt, i) => {
                        const isRevealed = revealed[q.id];
                        const isCorrect =
                            isRevealed && opt === q.correct_option;
                        const isWrongHighlight = isRevealed && !isCorrect;

                        return (
                            <div
                                key={i}
                                className={`flex items-center gap-3 rounded-xl border p-4 transition-all ${isCorrect ? 'border-green-500/50 bg-green-500/10 text-green-500' : isWrongHighlight ? 'border-white/5 bg-black/20 opacity-50' : 'border-white/10 bg-white/5 hover:border-primary/50'}`}
                            >
                                <div
                                    className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold ${isCorrect ? 'border-green-500 bg-green-500 text-white' : 'border-white/20'}`}
                                >
                                    {String.fromCharCode(65 + i)}
                                </div>
                                <span className="text-sm leading-relaxed">
                                    {opt}
                                </span>
                            </div>
                        );
                    })}
            </div>
        </div>
    );

    const renderTrueFalse = (q: Question) => (
        <div className="flex gap-4">
            {['True', 'False'].map((opt) => {
                const isRevealed = revealed[q.id];
                const boolValue = opt === 'True';
                const isCorrect = isRevealed && boolValue === q.correct_boolean;
                const isWrongHighlight = isRevealed && !isCorrect;

                return (
                    <div
                        key={opt}
                        className={`flex-1 rounded-xl border p-4 text-center font-bold tracking-wide transition-all ${isCorrect ? 'border-green-500/50 bg-green-500/10 text-green-500' : isWrongHighlight ? 'border-white/5 bg-black/20 opacity-50' : 'border-white/10 bg-white/5 hover:border-primary/50'}`}
                    >
                        {opt}
                    </div>
                );
            })}
        </div>
    );

    const renderStructured = (q: Question) => (
        <div className="space-y-4">
            <div className="mb-4 min-h-[120px] rounded-xl border border-white/5 bg-black/40 p-4 shadow-inner">
                <p className="text-sm text-muted-foreground italic">
                    Write your analytical answer here...
                </p>
            </div>
            {revealed[q.id] && (
                <div className="animate-in rounded-2xl border border-primary/20 bg-primary/10 p-5 duration-300 fade-in">
                    <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-primary">
                        <CheckCircle2 className="h-4 w-4" /> Ideal Solution /
                        Expected Answer
                    </h4>
                    <div className="prose prose-invert text-sm text-foreground/90">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {q.expected_answer ||
                                'No expected answer provided.'}
                        </ReactMarkdown>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Generated Exam - ${exam.prosit?.title}`} />
            <div className="mx-auto max-w-5xl space-y-8 p-6">
                {/* Header */}
                <div className="relative flex flex-col items-start justify-between gap-6 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-card to-background p-8 shadow-xl md:flex-row">
                    {exam.generated_by_ai && (
                        <div className="pointer-events-none absolute top-0 right-0 p-4 opacity-10">
                            <BrainCircuit className="h-48 w-48 text-primary" />
                        </div>
                    )}
                    <div className="relative z-10">
                        <Badge className="mb-4 flex w-fit items-center gap-2 bg-primary text-white shadow-lg">
                            <Sparkles className="h-3 w-3" /> AI Generated Exam
                        </Badge>
                        <h1 className="mb-2 text-3xl font-bold tracking-tight">
                            PBA Practice Exam
                        </h1>
                        <p className="flex items-center gap-2 text-lg text-muted-foreground">
                            Based on:{' '}
                            <Link
                                href={`/courses/1/prosits/${exam.prosit_id}`}
                                className="text-primary hover:underline"
                            >
                                {exam.prosit?.title}
                            </Link>
                        </p>
                    </div>
                    <div className="relative z-10 flex min-w-[150px] flex-col gap-2 rounded-2xl border border-white/5 bg-black/40 p-4 text-center">
                        <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                            Total Marks
                        </p>
                        <p className="text-4xl font-extrabold text-white">
                            {exam.total_marks}
                        </p>
                    </div>
                </div>

                {/* Questions */}
                <div className="space-y-6">
                    {exam.questions && exam.questions.length > 0 ? (
                        exam.questions.map((q, index) => (
                            <Card
                                key={q.id}
                                className="overflow-hidden border-white/10 bg-card/40 shadow-lg backdrop-blur-sm transition-all hover:border-white/20"
                            >
                                <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-white/5 bg-black/20 p-5">
                                    <div className="space-y-1">
                                        <div className="mb-2 flex items-center gap-2">
                                            <Badge
                                                variant="secondary"
                                                className="text-[10px] font-bold tracking-widest uppercase"
                                            >
                                                Question {index + 1}
                                            </Badge>
                                            <Badge
                                                variant="outline"
                                                className="border-white/20 text-[10px] text-muted-foreground"
                                            >
                                                {q.type.replace('_', ' ')}
                                            </Badge>
                                            <span className="text-xs font-semibold text-primary/80">
                                                {q.marks} Marks
                                            </span>
                                        </div>
                                        <CardTitle className="text-lg leading-relaxed">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                            >
                                                {q.question_text}
                                            </ReactMarkdown>
                                        </CardTitle>
                                    </div>
                                </CardHeader>

                                <CardContent className="p-6">
                                    {q.type === 'mcq' && renderMCQ(q)}
                                    {q.type === 'true_false' &&
                                        renderTrueFalse(q)}
                                    {q.type === 'structured' &&
                                        renderStructured(q)}
                                </CardContent>

                                <CardFooter className="flex flex-col items-center justify-between gap-4 border-t border-white/5 bg-black/40 p-4 sm:flex-row">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <HelpCircle className="h-4 w-4 text-primary/60" />
                                        <span>
                                            Tests{' '}
                                            <strong>
                                                {q.competence?.taxonomy_level}
                                            </strong>
                                            : {q.competence?.title}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {revealed[q.id] && q.explanation && (
                                            <div className="max-w-sm rounded-lg bg-white/5 px-4 py-2 text-xs text-muted-foreground italic">
                                                <span className="mr-2 font-bold text-white">
                                                    Explanation:
                                                </span>
                                                {q.explanation}
                                            </div>
                                        )}
                                        <Button
                                            variant={
                                                revealed[q.id]
                                                    ? 'secondary'
                                                    : 'default'
                                            }
                                            onClick={() => toggleReveal(q.id)}
                                            className="shrink-0"
                                        >
                                            {revealed[q.id]
                                                ? 'Hide Answer'
                                                : 'Reveal Answer'}
                                            {!revealed[q.id] && (
                                                <ChevronRight className="ml-1 h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </CardFooter>
                            </Card>
                        ))
                    ) : (
                        <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-12 text-center">
                            <HelpCircle className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
                            <p className="text-muted-foreground">
                                No questions found for this exam.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}

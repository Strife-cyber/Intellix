import { Head, Link } from '@inertiajs/react';
import {
    BrainCircuit,
    Sparkles,
    CheckCircle2,
    XCircle,
    ArrowRight,
    ArrowLeft,
    Trophy
} from 'lucide-react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardFooter,
} from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Exam } from '@/types';

export default function ExamShow({ exam }: { exam: Exam }) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Courses', href: '/courses' },
        { title: 'Exams', href: '#' },
        { title: 'Practice Generated Exam', href: `/exams/${exam.id}` },
    ];

    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [submitted, setSubmitted] = useState(false);

    const currentQuestion = exam.questions[currentIndex];
    const progressPercentage = ((currentIndex + 1) / exam.questions.length) * 100;

    const handleAnswer = (value: any) => {
        if (submitted) return;
        setAnswers((prev) => ({
            ...prev,
            [currentQuestion.id]: value,
        }));
    };

    const nextQuestion = () => {
        if (currentIndex < exam.questions.length - 1) {
            setCurrentIndex((prev) => prev + 1);
        }
    };

    const prevQuestion = () => {
        if (currentIndex > 0) {
            setCurrentIndex((prev) => prev - 1);
        }
    };

    const calculateScore = () => {
        let score = 0;
        exam.questions.forEach((q) => {
            const userAnswer = answers[q.id];
            if (isCorrect(q, userAnswer)) score += q.marks;
        });
        return score;
    };

    const isCorrect = (q: Question, userAnswer: any) => {
        if (!userAnswer) return false;
        if (q.type === 'true_false') return userAnswer === q.correct_boolean;
        if (q.type === 'mcq') {
            // Check if user answer matches the correct option text or the letter index
            if (userAnswer === q.correct_option) return true;
            
            // If correct_option is a letter (A, B, C...)
            const optionIndex = q.options?.indexOf(userAnswer);
            if (optionIndex !== -1 && optionIndex !== undefined) {
                const letter = String.fromCharCode(65 + optionIndex);
                if (letter === q.correct_option) return true;
            }
        }
        return false;
    };

    const getFormattedAnswer = (q: Question, value: any) => {
        if (value === undefined || value === null || value === '') return 'Skipped';
        if (q.type === 'true_false') return value ? 'True' : 'False';
        if (q.type === 'mcq') {
            const index = q.options?.indexOf(value);
            if (index !== -1 && index !== undefined) {
                return `${String.fromCharCode(65 + index)}. ${value}`;
            }
            return value;
        }
        return value;
    };

    const getCorrectFormattedAnswer = (q: Question) => {
        if (q.type === 'true_false') return q.correct_boolean ? 'True' : 'False';
        if (q.type === 'mcq') {
            // Find the option text if correct_option is a letter
            if (q.correct_option?.length === 1) {
                const charCode = q.correct_option.toUpperCase().charCodeAt(0);
                const index = charCode - 65;
                if (index >= 0 && index < (q.options?.length || 0)) {
                    return `${q.correct_option}. ${q.options![index]}`;
                }
            }
            
            // If correct_option is already the full text, find its letter
            const index = q.options?.indexOf(q.correct_option!);
            if (index !== -1 && index !== undefined) {
                return `${String.fromCharCode(65 + index)}. ${q.correct_option}`;
            }

            return q.correct_option;
        }
        return q.expected_answer;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Generated Exam - ${exam.prosit?.generalisation}`} />

            <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
                {/* Compact Header during Exam / Results */}
                <div className="flex items-center justify-between gap-4 rounded-2xl border bg-card p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <BrainCircuit className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-sm font-semibold sm:text-base line-clamp-1">
                                {exam.prosit?.generalisation || 'Practice Exam'}
                            </h1>
                            <p className="text-xs text-muted-foreground">
                                {submitted ? 'Results' : `Question ${currentIndex + 1} of ${exam.questions.length}`}
                            </p>
                        </div>
                    </div>
                    
                    {!submitted && (
                        <div className="flex items-center gap-2">
                             <div className="hidden text-right sm:block">
                                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Progress</div>
                                <div className="text-sm font-bold">{Math.round(progressPercentage)}%</div>
                            </div>
                            <Button 
                                variant="destructive" 
                                size="sm" 
                                className="h-8 rounded-lg"
                                onClick={() => window.confirm('Are you sure you want to quit? Your progress will be lost.') && window.history.back()}
                            >
                                Quit
                            </Button>
                        </div>
                    )}
                </div>

                {/* Active Question Card */}
                {!submitted && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        {/* Question Navigation Grid */}
                        <div className="flex flex-wrap gap-2 justify-center py-2">
                            {exam.questions.map((q, idx) => (
                                <button
                                    key={q.id}
                                    onClick={() => setCurrentIndex(idx)}
                                    className={`h-10 w-10 rounded-lg border-2 text-sm font-medium transition-all ${
                                        currentIndex === idx
                                            ? 'border-primary bg-primary text-primary-foreground shadow-md scale-110'
                                            : answers[q.id]
                                            ? 'border-primary/30 bg-primary/5 text-primary'
                                            : 'border-muted bg-background text-muted-foreground hover:border-muted-foreground/30'
                                    }`}
                                >
                                    {idx + 1}
                                </button>
                            ))}
                        </div>

                        <Card className="shadow-lg border-2 transition-all">
                            <CardHeader className="bg-muted/30 pb-8">
                                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                                    <Badge variant="outline" className="bg-background shrink-0">
                                        Question {currentIndex + 1}
                                    </Badge>
                                    {currentQuestion.competence && (
                                        <Badge variant="secondary" className="max-w-[300px] truncate" title={currentQuestion.competence.title}>
                                            {currentQuestion.competence.title}
                                        </Badge>
                                    )}
                                </div>
                                <CardTitle className="text-xl leading-relaxed sm:text-2xl">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {currentQuestion.question_text}
                                    </ReactMarkdown>
                                </CardTitle>
                            </CardHeader>

                            <CardContent className="p-6 sm:p-8">
                                {/* MCQ Options */}
                                {currentQuestion.type === 'mcq' && (
                                    <div className="grid gap-3">
                                        {currentQuestion.options?.map((opt, i) => {
                                            const selected = answers[currentQuestion.id] === opt;
                                            return (
                                                <button
                                                    key={i}
                                                    onClick={() => handleAnswer(opt)}
                                                    className={`group relative flex w-full items-center justify-between rounded-xl border-2 p-4 text-left transition-all hover:bg-muted ${
                                                        selected
                                                            ? 'border-primary bg-primary/5 hover:bg-primary/5'
                                                            : 'border-muted bg-transparent'
                                                    }`}
                                                >
                                                    <span className={`text-base font-medium ${selected ? 'text-primary' : ''}`}>
                                                        {opt}
                                                    </span>
                                                    {selected && <CheckCircle2 className="h-5 w-5 text-primary" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* TRUE/FALSE Options */}
                                {currentQuestion.type === 'true_false' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        {[true, false].map((val) => {
                                            const selected = answers[currentQuestion.id] === val;
                                            return (
                                                <button
                                                    key={val.toString()}
                                                    onClick={() => handleAnswer(val)}
                                                    className={`flex flex-col items-center justify-center rounded-xl border-2 p-8 transition-all hover:bg-muted ${
                                                        selected
                                                            ? 'border-primary bg-primary/5 text-primary hover:bg-primary/5'
                                                            : 'border-muted bg-transparent'
                                                    }`}
                                                >
                                                    <span className="text-xl font-bold uppercase tracking-wider">
                                                        {val ? 'True' : 'False'}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Structured/Text Input */}
                                {currentQuestion.type === 'structured' && (
                                    <div className="space-y-4">
                                        <textarea
                                            value={answers[currentQuestion.id] || ''}
                                            onChange={(e) => handleAnswer(e.target.value)}
                                            placeholder="Type your answer here..."
                                            className="min-h-[200px] w-full rounded-xl border-2 border-muted bg-transparent p-4 text-base focus:border-primary focus:outline-none transition-colors"
                                        />
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground italic">
                                            <Sparkles className="h-3 w-3" />
                                            Structured answers will be compared against the expected solution.
                                        </div>
                                    </div>
                                )}
                            </CardContent>

                            <CardFooter className="flex items-center justify-between border-t bg-muted/20 p-6">
                                <Button
                                    onClick={prevQuestion}
                                    disabled={currentIndex === 0}
                                    variant="outline"
                                    className="gap-2"
                                >
                                    <ArrowLeft className="h-4 w-4" /> Previous
                                </Button>

                                {currentIndex === exam.questions.length - 1 ? (
                                    <Button
                                        onClick={() => setSubmitted(true)}
                                        className="gap-2"
                                        variant={Object.keys(answers).length === exam.questions.length ? 'default' : 'secondary'}
                                    >
                                        Finish Exam <CheckCircle2 className="h-4 w-4" />
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={nextQuestion}
                                        className="gap-2"
                                    >
                                        Next <ArrowRight className="h-4 w-4" />
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    </div>
                )}

                {/* Results Screen */}
                {submitted && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <Card className="overflow-hidden border-2 border-primary/20 bg-primary/5 shadow-lg">
                            <CardContent className="p-8 sm:p-12 text-center">
                                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
                                    <Trophy className="h-10 w-10" />
                                </div>
                                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Exam Completed!</h2>
                                <p className="mt-3 text-muted-foreground text-lg">
                                    Great job on finishing the practice exam for <span className="font-semibold text-foreground">{exam.prosit?.generalisation}</span>.
                                </p>
                                
                                <div className="mt-8 flex flex-col items-center justify-center gap-4">
                                    <div className="inline-flex items-baseline gap-2 rounded-2xl bg-background px-8 py-4 shadow-sm border-2 border-primary/10">
                                        <span className="text-5xl font-black text-primary">{calculateScore()}</span>
                                        <span className="text-xl font-medium text-muted-foreground">/ {exam.total_marks}</span>
                                    </div>
                                    <p className="text-sm font-medium text-muted-foreground">
                                        Score based on MCQ and True/False questions only.
                                    </p>
                                </div>

                                <div className="mt-10 flex flex-wrap justify-center gap-4">
                                    <Button asChild size="lg" className="rounded-xl px-8">
                                        <Link href="/exams">
                                            <ArrowLeft className="mr-2 h-5 w-5" /> Back to Exams
                                        </Link>
                                    </Button>
                                    <Button variant="outline" size="lg" className="rounded-xl px-8" onClick={() => window.print()}>
                                        Print Results
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-2xl font-bold tracking-tight">Detailed Correction</h3>
                                <Badge variant="secondary" className="px-4 py-1">
                                    {exam.questions.length} Questions Reviewed
                                </Badge>
                            </div>
                            {exam.questions.map((q, index) => {
                                const userAnswer = answers[q.id];
                                const correct = isCorrect(q, userAnswer);

                                return (
                                    <Card key={q.id} className={`border-l-4 shadow-sm overflow-hidden ${correct ? 'border-l-green-500 bg-green-50/30' : (q.type === 'structured' ? 'border-l-blue-500 bg-blue-50/30' : 'border-l-destructive bg-destructive/5')}`}>
                                        <CardHeader className="p-5 pb-2">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                        <span>Question {index + 1}</span>
                                                        <span>•</span>
                                                        <span>{q.marks} Marks</span>
                                                        {q.competence && (
                                                            <>
                                                                <span>•</span>
                                                                <span className="text-primary">{q.competence.title}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    <div className="text-base font-semibold leading-relaxed">
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                            {q.question_text}
                                                        </ReactMarkdown>
                                                    </div>
                                                </div>
                                                {q.type !== 'structured' && (
                                                    correct ? (
                                                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 shrink-0 gap-1">
                                                            <CheckCircle2 className="h-3 w-3" /> Correct
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 shrink-0 gap-1">
                                                            <XCircle className="h-3 w-3" /> Incorrect
                                                        </Badge>
                                                    )
                                                )}
                                                {q.type === 'structured' && (
                                                    <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 shrink-0 gap-1">
                                                        Self-Review
                                                    </Badge>
                                                )}
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-5 pt-2 space-y-4">
                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <div className="rounded-xl border bg-background p-4 shadow-sm">
                                                    <span className="text-muted-foreground block text-xs font-bold uppercase tracking-wider mb-2">Your Answer</span>
                                                    <div className={`text-sm ${q.type === 'structured' ? 'italic' : (correct ? 'text-green-600 font-bold' : 'text-destructive font-bold')}`}>
                                                        {getFormattedAnswer(q, userAnswer)}
                                                    </div>
                                                </div>
                                                
                                                <div className="rounded-xl border border-green-200 bg-green-50/50 p-4 shadow-sm">
                                                    <span className="text-green-700 dark:text-green-400 block text-xs font-bold uppercase tracking-wider mb-2">
                                                        {q.type === 'structured' ? 'Expected Answer' : 'Correct Answer'}
                                                    </span>
                                                    <div className="text-sm text-green-800 dark:text-green-300 font-medium">
                                                        {getCorrectFormattedAnswer(q)}
                                                    </div>
                                                </div>
                                            </div>

                                            {q.explanation && (
                                                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <BrainCircuit className="h-4 w-4 text-primary" />
                                                        <span className="text-xs font-bold uppercase tracking-wider text-primary">Explanation</span>
                                                    </div>
                                                    <div className="text-sm leading-relaxed text-foreground/80">
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                            {q.explanation}
                                                        </ReactMarkdown>
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

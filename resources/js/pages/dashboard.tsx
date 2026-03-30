import { Head, Link } from '@inertiajs/react';
import {
    Calendar,
    Clock,
    Target,
    TrendingUp,
    BookOpen,
    Brain,
    Award,
    BarChart3,
    CheckCircle,
    Circle,
    Plus,
    Play,
    Pause,
    RotateCcw,
    Timer,
    Flame,
    Users,
    Library,
    Lightbulb,
    AlertCircle,
    FileText,
    Upload,
    CalendarDays,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { dashboard, upload, library, flashcards } from '@/routes';
import type { BreadcrumbItem, Resource } from '@/types';

interface DashboardProps {
    resources: Resource[];
    stats: {
        resources_count: number;
        flashcards_count: number;
        flashcards_due_today: number;
        courses_count: number;
    };
    recent_resources: Array<{
        id: string;
        name: string;
        status: string;
        created_at: string;
    }>;
}

interface StudySession {
    id: string;
    subject: string;
    duration: number;
    completed: boolean;
    date: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
];

export default function Dashboard({ resources, stats, recent_resources }: DashboardProps) {
    const [activeSession, setActiveSession] = useState<StudySession | null>(null);
    const [sessionTime, setSessionTime] = useState(0);
    const [isStudying, setIsStudying] = useState(false);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isStudying && activeSession) {
            interval = setInterval(() => {
                setSessionTime(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isStudying, activeSession]);

    const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const startStudySession = () => {
        const newSession: StudySession = {
            id: Date.now().toString(),
            subject: 'Study Session',
            duration: 0,
            completed: false,
            date: new Date().toISOString().split('T')[0],
        };
        setActiveSession(newSession);
        setIsStudying(true);
        setSessionTime(0);
    };

    const pauseStudySession = () => {
        setIsStudying(false);
    };

    const resumeStudySession = () => {
        setIsStudying(true);
    };

    const completeStudySession = () => {
        if (activeSession) {
            setActiveSession(null);
            setIsStudying(false);
            setSessionTime(0);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 text-green-800';
            case 'processing':
                return 'bg-yellow-100 text-yellow-800';
            case 'failed':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle className="w-4 h-4" />;
            case 'processing':
                return <Clock className="w-4 h-4" />;
            case 'failed':
                return <AlertCircle className="w-4 h-4" />;
            default:
                return <FileText className="w-4 h-4" />;
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Study Dashboard" />
            <div className="flex flex-col flex-1 gap-6 p-6 h-full overflow-x-auto">
                {/* Header Stats */}
                <div className="gap-4 grid md:grid-cols-4 auto-rows-min">
                    <Card>
                        <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
                            <CardTitle className="font-medium text-sm">Resources</CardTitle>
                            <FileText className="w-4 h-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="font-bold text-2xl">{stats.resources_count}</div>
                            <p className="text-muted-foreground text-xs">
                                Total study materials
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
                            <CardTitle className="font-medium text-sm">Flashcards</CardTitle>
                            <Brain className="w-4 h-4 text-purple-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="font-bold text-2xl">{stats.flashcards_count}</div>
                            <p className="text-muted-foreground text-xs">
                                {stats.flashcards_due_today} due today
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
                            <CardTitle className="font-medium text-sm">Courses</CardTitle>
                            <BookOpen className="w-4 h-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="font-bold text-2xl">{stats.courses_count}</div>
                            <p className="text-muted-foreground text-xs">
                                Available courses
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
                            <CardTitle className="font-medium text-sm">Due Today</CardTitle>
                            <Target className="w-4 h-4 text-orange-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="font-bold text-2xl">{stats.flashcards_due_today}</div>
                            <p className="text-muted-foreground text-xs">
                                Flashcards to review
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <div className="gap-6 grid md:grid-cols-3 auto-rows-min">
                    {/* Active Study Session */}
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Brain className="w-5 h-5" />
                                Active Study Session
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {activeSession ? (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h3 className="font-semibold">{activeSession.subject}</h3>
                                            <p className="text-muted-foreground text-sm">
                                                Session started recently
                                            </p>
                                        </div>
                                        <div className="font-mono text-3xl">
                                            {formatTime(sessionTime)}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {isStudying ? (
                                            <Button onClick={pauseStudySession} variant="outline" size="sm">
                                                <Pause className="mr-2 w-4 h-4" />
                                                Pause
                                            </Button>
                                        ) : (
                                            <Button onClick={resumeStudySession} variant="outline" size="sm">
                                                <Play className="mr-2 w-4 h-4" />
                                                Resume
                                            </Button>
                                        )}
                                        <Button onClick={completeStudySession} size="sm">
                                            <CheckCircle className="mr-2 w-4 h-4" />
                                            Complete
                                        </Button>
                                        <Button onClick={() => setActiveSession(null)} variant="destructive" size="sm">
                                            <RotateCcw className="mr-2 w-4 h-4" />
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-8 text-center">
                                    <Brain className="mx-auto mb-4 w-12 h-12 text-muted-foreground" />
                                    <h3 className="mb-2 font-semibold">No active session</h3>
                                    <p className="mb-4 text-muted-foreground text-sm">
                                        Start a study session to track your progress
                                    </p>
                                    <Button onClick={startStudySession}>
                                        <Play className="mr-2 w-4 h-4" />
                                        Start Studying
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Lightbulb className="w-5 h-5" />
                                Quick Actions
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Link href="/study-planner">
                                <Button className="justify-start w-full" variant="outline">
                                    <CalendarDays className="mr-2 w-4 h-4" />
                                    Study Planner
                                </Button>
                            </Link>
                            <Link href={upload().url}>
                                <Button className="justify-start w-full" variant="outline">
                                    <Upload className="mr-2 w-4 h-4" />
                                    Upload Material
                                </Button>
                            </Link>
                            <Link href={library().url}>
                                <Button className="justify-start w-full" variant="outline">
                                    <Library className="mr-2 w-4 h-4" />
                                    Study Library
                                </Button>
                            </Link>
                            <Link href={flashcards().url}>
                                <Button className="justify-start w-full" variant="outline">
                                    <Brain className="mr-2 w-4 h-4" />
                                    Practice Flashcards
                                </Button>
                            </Link>
                            <Button className="justify-start w-full" variant="outline" disabled>
                                <BookOpen className="mr-2 w-4 h-4" />
                                Browse Courses
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <div className="gap-6 grid md:grid-cols-2 auto-rows-min">
                    {/* Recent Resources */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                Recent Resources
                            </CardTitle>
                            <CardDescription>
                                Your latest study materials
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-64">
                                <div className="space-y-3">
                                    {recent_resources.length > 0 ? (
                                        recent_resources.map((resource) => (
                                            <div
                                                key={resource.id}
                                                className="flex justify-between items-center p-3 border rounded-lg"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <FileText className="w-5 h-5 text-muted-foreground" />
                                                    <div>
                                                        <h4 className="max-w-50 font-medium truncate">
                                                            {resource.name}
                                                        </h4>
                                                        <p className="text-muted-foreground text-sm">
                                                            {resource.created_at}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Badge 
                                                    variant="outline" 
                                                    className={cn("flex items-center gap-1", getStatusColor(resource.status))}
                                                >
                                                    {getStatusIcon(resource.status)}
                                                    {resource.status}
                                                </Badge>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-8 text-center">
                                            <FileText className="mx-auto mb-4 w-12 h-12 text-muted-foreground" />
                                            <h4 className="mb-2 font-medium">No resources yet</h4>
                                            <p className="mb-4 text-muted-foreground text-sm">
                                                Upload your first study material to get started
                                            </p>
                                            <Link href={upload().url}>
                                                <Button size="sm">
                                                    <Upload className="mr-2 w-4 h-4" />
                                                    Upload Material
                                                </Button>
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    {/* Study Overview */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BarChart3 className="w-5 h-5" />
                                Study Overview
                            </CardTitle>
                            <CardDescription>
                                Your learning progress at a glance
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium text-sm">Resources Progress</span>
                                        <span className="text-muted-foreground text-sm">
                                            {stats.resources_count} files
                                        </span>
                                    </div>
                                    <Progress value={Math.min((stats.resources_count / 10) * 100, 100)} />
                                </div>
                                
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium text-sm">Flashcard Mastery</span>
                                        <span className="text-muted-foreground text-sm">
                                            {stats.flashcards_count} cards
                                        </span>
                                    </div>
                                    <Progress value={Math.min((stats.flashcards_count / 100) * 100, 100)} />
                                </div>

                                <div className="gap-4 grid grid-cols-2 pt-4">
                                    <div className="p-4 border rounded-lg text-center">
                                        <div className="font-bold text-blue-600 text-2xl">
                                            {stats.flashcards_due_today}
                                        </div>
                                        <p className="text-muted-foreground text-sm">Due Today</p>
                                    </div>
                                    <div className="p-4 border rounded-lg text-center">
                                        <div className="font-bold text-green-600 text-2xl">
                                            {stats.courses_count}
                                        </div>
                                        <p className="text-muted-foreground text-sm">Courses</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}

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
                return <CheckCircle className="h-4 w-4" />;
            case 'processing':
                return <Clock className="h-4 w-4" />;
            case 'failed':
                return <AlertCircle className="h-4 w-4" />;
            default:
                return <FileText className="h-4 w-4" />;
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Study Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto p-6">
                {/* Header Stats */}
                <div className="grid auto-rows-min gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Resources</CardTitle>
                            <FileText className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.resources_count}</div>
                            <p className="text-xs text-muted-foreground">
                                Total study materials
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Flashcards</CardTitle>
                            <Brain className="h-4 w-4 text-purple-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.flashcards_count}</div>
                            <p className="text-xs text-muted-foreground">
                                {stats.flashcards_due_today} due today
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Courses</CardTitle>
                            <BookOpen className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.courses_count}</div>
                            <p className="text-xs text-muted-foreground">
                                Available courses
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Due Today</CardTitle>
                            <Target className="h-4 w-4 text-orange-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.flashcards_due_today}</div>
                            <p className="text-xs text-muted-foreground">
                                Flashcards to review
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid auto-rows-min gap-6 md:grid-cols-3">
                    {/* Active Study Session */}
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Brain className="h-5 w-5" />
                                Active Study Session
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {activeSession ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-semibold">{activeSession.subject}</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Session started recently
                                            </p>
                                        </div>
                                        <div className="text-3xl font-mono">
                                            {formatTime(sessionTime)}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {isStudying ? (
                                            <Button onClick={pauseStudySession} variant="outline" size="sm">
                                                <Pause className="h-4 w-4 mr-2" />
                                                Pause
                                            </Button>
                                        ) : (
                                            <Button onClick={resumeStudySession} variant="outline" size="sm">
                                                <Play className="h-4 w-4 mr-2" />
                                                Resume
                                            </Button>
                                        )}
                                        <Button onClick={completeStudySession} size="sm">
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            Complete
                                        </Button>
                                        <Button onClick={() => setActiveSession(null)} variant="destructive" size="sm">
                                            <RotateCcw className="h-4 w-4 mr-2" />
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                    <h3 className="font-semibold mb-2">No active session</h3>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Start a study session to track your progress
                                    </p>
                                    <Button onClick={startStudySession}>
                                        <Play className="h-4 w-4 mr-2" />
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
                                <Lightbulb className="h-5 w-5" />
                                Quick Actions
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Link href={upload().url}>
                                <Button className="w-full justify-start" variant="outline">
                                    <Upload className="h-4 w-4 mr-2" />
                                    Upload Material
                                </Button>
                            </Link>
                            <Link href={library().url}>
                                <Button className="w-full justify-start" variant="outline">
                                    <Library className="h-4 w-4 mr-2" />
                                    Study Library
                                </Button>
                            </Link>
                            <Link href={flashcards().url}>
                                <Button className="w-full justify-start" variant="outline">
                                    <Brain className="h-4 w-4 mr-2" />
                                    Practice Flashcards
                                </Button>
                            </Link>
                            <Button className="w-full justify-start" variant="outline" disabled>
                                <BookOpen className="h-4 w-4 mr-2" />
                                Browse Courses
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid auto-rows-min gap-6 md:grid-cols-2">
                    {/* Recent Resources */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
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
                                                className="flex items-center justify-between p-3 rounded-lg border"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <FileText className="h-5 w-5 text-muted-foreground" />
                                                    <div>
                                                        <h4 className="font-medium truncate max-w-50">
                                                            {resource.name}
                                                        </h4>
                                                        <p className="text-sm text-muted-foreground">
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
                                        <div className="text-center py-8">
                                            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                            <h4 className="font-medium mb-2">No resources yet</h4>
                                            <p className="text-sm text-muted-foreground mb-4">
                                                Upload your first study material to get started
                                            </p>
                                            <Link href={upload().url}>
                                                <Button size="sm">
                                                    <Upload className="h-4 w-4 mr-2" />
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
                                <BarChart3 className="h-5 w-5" />
                                Study Overview
                            </CardTitle>
                            <CardDescription>
                                Your learning progress at a glance
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">Resources Progress</span>
                                        <span className="text-sm text-muted-foreground">
                                            {stats.resources_count} files
                                        </span>
                                    </div>
                                    <Progress value={Math.min((stats.resources_count / 10) * 100, 100)} />
                                </div>
                                
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">Flashcard Mastery</span>
                                        <span className="text-sm text-muted-foreground">
                                            {stats.flashcards_count} cards
                                        </span>
                                    </div>
                                    <Progress value={Math.min((stats.flashcards_count / 100) * 100, 100)} />
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-4">
                                    <div className="text-center p-4 border rounded-lg">
                                        <div className="text-2xl font-bold text-blue-600">
                                            {stats.flashcards_due_today}
                                        </div>
                                        <p className="text-sm text-muted-foreground">Due Today</p>
                                    </div>
                                    <div className="text-center p-4 border rounded-lg">
                                        <div className="text-2xl font-bold text-green-600">
                                            {stats.courses_count}
                                        </div>
                                        <p className="text-sm text-muted-foreground">Courses</p>
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

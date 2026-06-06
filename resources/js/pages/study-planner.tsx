import { Head, Link } from '@inertiajs/react';
import {
    Calendar as CalendarIcon,
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
    ChevronLeft,
    ChevronRight,
    CalendarDays,
    Activity,
    Zap,
    Target as TargetIcon,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { dashboard, upload, library, flashcards } from '@/routes';
import type { BreadcrumbItem, Resource } from '@/types';

interface StudyPlannerProps {
    schedule?: Array<{
        date: string;
        due_count: number;
        flashcards: Array<{
            id: number;
            front: string;
            resource_title: string;
            interval_days: number;
            difficulty: number;
        }>;
        total_study_time: number;
    }>;
    stats?: {
        total_due: number;
        overdue_count: number;
        due_today: number;
        total_flashcards: number;
    };
    study_streak?: {
        current: number;
        longest: number;
        last_study_date: string;
    };
    recommendations?: Array<{
        resource_id: string;
        resource_title: string;
        cards: Array<{
            id: number;
            front: string;
        }>;
        estimated_time: number;
        priority: 'high' | 'medium' | 'low';
        date: string;
    }>;
    plan?: Array<{
        date: string;
        day_name: string;
        sessions: Array<{
            resource_id: string;
            resource_title: string;
            cards_count: number;
            estimated_time: number;
        }>;
        total_time: number;
        is_today: boolean;
        is_weekend: boolean;
    }>;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
    {
        title: 'Study Planner',
        href: '/study-planner',
    },
];

interface TodaysFocusProps {
    title: string;
    cards: number;
    time: number;
    action: {
        label: string;
        href: string;
    };
}

const TodaysFocus: React.FC<TodaysFocusProps> = ({
    title,
    cards,
    time,
    action,
}) => (
    <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                Today's Focus
            </CardTitle>
        </CardHeader>
        <CardContent>
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold">{title}</h3>
                        <p className="text-sm text-muted-foreground">
                            {cards} cards • {time} min
                        </p>
                    </div>
                    <Link href={action.href}>
                        <Button size="sm">
                            <Play className="mr-2 h-4 w-4" />
                            {action.label}
                        </Button>
                    </Link>
                </div>
                <Progress value={(time / 25) * 100} className="h-2" />
            </div>
        </CardContent>
    </Card>
);

export default function StudyPlanner({
    schedule = [],
    stats,
    study_streak,
    recommendations = [],
    plan = [],
}: StudyPlannerProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [view, setView] = useState<'calendar' | 'plan' | 'recommendations'>(
        'calendar',
    );
    const [recommendationsData, setRecommendationsData] =
        useState(recommendations);
    const [planData, setPlanData] = useState(plan);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];

        // Add empty cells for days before month starts
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }

        // Add days of the month
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }

        return days;
    };

    const formatDate = (date: Date) => {
        return date.toISOString().split('T')[0];
    };

    const getScheduleForDate = (date: Date) => {
        const dateStr = formatDate(date);
        return schedule.find((s) => s.date === dateStr);
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'medium':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'low':
                return 'bg-green-100 text-green-800 border-green-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getPriorityIcon = (priority: string) => {
        switch (priority) {
            case 'high':
                return <AlertCircle className={cn('w-3', 'h-3')} />;
            case 'medium':
                return <Clock className={cn('w-3', 'h-3')} />;
            case 'low':
                return <CheckCircle className={cn('w-3', 'h-3')} />;
            default:
                return <Circle className={cn('w-3', 'h-3')} />;
        }
    };

    const navigateMonth = (direction: 'prev' | 'next') => {
        setCurrentMonth((prev) => {
            const newDate = new Date(prev);
            if (direction === 'prev') {
                newDate.setMonth(prev.getMonth() - 1);
            } else {
                newDate.setMonth(prev.getMonth() + 1);
            }
            return newDate;
        });
    };

    // Fetch recommendations when switching to recommendations view
    useEffect(() => {
        if (view === 'recommendations' && recommendationsData.length === 0) {
            fetchRecommendations();
        }
    }, [view]);

    // Fetch study plan when switching to plan view
    useEffect(() => {
        if (view === 'plan' && planData.length === 0) {
            fetchStudyPlan();
        }
    }, [view]);

    const fetchRecommendations = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await window.axios.get(
                '/study-planner/recommendations',
            );
            setRecommendationsData(res.data.recommendations || []);
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            setError(
                e?.response?.data?.message ?? 'Failed to load recommendations.',
            );
        } finally {
            setLoading(false);
        }
    };

    const fetchStudyPlan = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await window.axios.get('/study-planner/generate-plan');
            setPlanData(res.data.plan || []);
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            setError(
                e?.response?.data?.message ?? 'Failed to generate study plan.',
            );
        } finally {
            setLoading(false);
        }
    };

    const monthYear = currentMonth.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
    });

    const days = getDaysInMonth(currentMonth);
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Study Planner" />
            <div
                className={cn(
                    'flex',
                    'flex-col',
                    'flex-1',
                    'gap-6',
                    'p-4',
                    'pb-20',
                    'sm:p-6',
                    'sm:pb-6',
                    'h-full',
                    'overflow-x-auto',
                )}
            >
                {/* Header Stats */}
                {stats && (
                    <div
                        className={cn(
                            'gap-4',
                            'grid',
                            'md:grid-cols-4',
                            'auto-rows-min',
                        )}
                    >
                        <Card>
                            <CardHeader
                                className={cn(
                                    'flex',
                                    'flex-row',
                                    'justify-between',
                                    'items-center',
                                    'space-y-0',
                                    'pb-2',
                                )}
                            >
                                <CardTitle
                                    className={cn('font-medium', 'text-sm')}
                                >
                                    Study Streak
                                </CardTitle>
                                <Flame
                                    className={cn(
                                        'w-4',
                                        'h-4',
                                        'text-orange-500',
                                    )}
                                />
                            </CardHeader>
                            <CardContent>
                                <div className={cn('font-bold', 'text-2xl')}>
                                    {study_streak?.current || 0} days
                                </div>
                                <p
                                    className={cn(
                                        'text-muted-foreground',
                                        'text-xs',
                                    )}
                                >
                                    Longest: {study_streak?.longest || 0} days
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader
                                className={cn(
                                    'flex',
                                    'flex-row',
                                    'justify-between',
                                    'items-center',
                                    'space-y-0',
                                    'pb-2',
                                )}
                            >
                                <CardTitle
                                    className={cn('font-medium', 'text-sm')}
                                >
                                    Due Today
                                </CardTitle>
                                <Target
                                    className={cn(
                                        'w-4',
                                        'h-4',
                                        'text-blue-500',
                                    )}
                                />
                            </CardHeader>
                            <CardContent>
                                <div className={cn('font-bold', 'text-2xl')}>
                                    {stats.due_today}
                                </div>
                                <p
                                    className={cn(
                                        'text-muted-foreground',
                                        'text-xs',
                                    )}
                                >
                                    {stats.overdue_count} overdue
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader
                                className={cn(
                                    'flex',
                                    'flex-row',
                                    'justify-between',
                                    'items-center',
                                    'space-y-0',
                                    'pb-2',
                                )}
                            >
                                <CardTitle
                                    className={cn('font-medium', 'text-sm')}
                                >
                                    Total Due
                                </CardTitle>
                                <CalendarDays
                                    className={cn(
                                        'w-4',
                                        'h-4',
                                        'text-green-500',
                                    )}
                                />
                            </CardHeader>
                            <CardContent>
                                <div className={cn('font-bold', 'text-2xl')}>
                                    {stats.total_due}
                                </div>
                                <p
                                    className={cn(
                                        'text-muted-foreground',
                                        'text-xs',
                                    )}
                                >
                                    This month
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader
                                className={cn(
                                    'flex',
                                    'flex-row',
                                    'justify-between',
                                    'items-center',
                                    'space-y-0',
                                    'pb-2',
                                )}
                            >
                                <CardTitle
                                    className={cn('font-medium', 'text-sm')}
                                >
                                    Total Cards
                                </CardTitle>
                                <Brain
                                    className={cn(
                                        'w-4',
                                        'h-4',
                                        'text-purple-500',
                                    )}
                                />
                            </CardHeader>
                            <CardContent>
                                <div className={cn('font-bold', 'text-2xl')}>
                                    {stats.total_flashcards}
                                </div>
                                <p
                                    className={cn(
                                        'text-muted-foreground',
                                        'text-xs',
                                    )}
                                >
                                    In your collection
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Today's Focus */}
                {recommendationsData.length > 0 && (
                    <div className={cn('gap-4', 'grid', 'md:grid-cols-3')}>
                        {recommendationsData.slice(0, 3).map((rec, idx) => (
                            <TodaysFocus
                                key={idx}
                                title={rec.resource_title}
                                cards={rec.cards.length}
                                time={rec.estimated_time}
                                action={{
                                    label: 'Start',
                                    href: flashcards().url,
                                }}
                            />
                        ))}
                    </div>
                )}

                {stats &&
                    stats.due_today > 0 &&
                    recommendationsData.length === 0 && (
                        <TodaysFocus
                            title="Review Due Flashcards"
                            cards={stats.due_today}
                            time={Math.ceil(stats.due_today * 0.5)}
                            action={{
                                label: 'Start Session',
                                href: flashcards().url,
                            }}
                        />
                    )}

                {/* View Toggle */}
                <div className={cn('flex', 'gap-2')}>
                    <Button
                        variant={view === 'calendar' ? 'default' : 'outline'}
                        onClick={() => setView('calendar')}
                    >
                        <CalendarIcon className={cn('mr-2', 'w-4', 'h-4')} />
                        Calendar
                    </Button>
                    <Button
                        variant={view === 'plan' ? 'default' : 'outline'}
                        onClick={() => setView('plan')}
                    >
                        <TargetIcon className={cn('mr-2', 'w-4', 'h-4')} />
                        Study Plan
                    </Button>
                    <Button
                        variant={
                            view === 'recommendations' ? 'default' : 'outline'
                        }
                        onClick={() => setView('recommendations')}
                    >
                        <Lightbulb className={cn('mr-2', 'w-4', 'h-4')} />
                        Recommendations
                    </Button>
                </div>

                {/* Calendar View */}
                {view === 'calendar' && (
                    <div
                        className={cn(
                            'gap-6',
                            'grid',
                            'md:grid-cols-3',
                            'auto-rows-min',
                        )}
                    >
                        <Card className="md:col-span-2">
                            <CardHeader>
                                <div
                                    className={cn(
                                        'flex',
                                        'justify-between',
                                        'items-center',
                                    )}
                                >
                                    <CardTitle
                                        className={cn(
                                            'flex',
                                            'items-center',
                                            'gap-2',
                                        )}
                                    >
                                        <CalendarIcon
                                            className={cn('w-5', 'h-5')}
                                        />
                                        Study Calendar
                                    </CardTitle>
                                    <div
                                        className={cn(
                                            'flex',
                                            'items-center',
                                            'gap-2',
                                        )}
                                    >
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                navigateMonth('prev')
                                            }
                                        >
                                            <ChevronLeft
                                                className={cn('w-4', 'h-4')}
                                            />
                                        </Button>
                                        <span className="font-medium">
                                            {monthYear}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                navigateMonth('next')
                                            }
                                        >
                                            <ChevronRight
                                                className={cn('w-4', 'h-4')}
                                            />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div
                                    className={cn(
                                        'gap-1',
                                        'grid',
                                        'grid-cols-7',
                                        'mb-2',
                                    )}
                                >
                                    {weekDays.map((day) => (
                                        <div
                                            key={day}
                                            className={cn(
                                                'p-2',
                                                'font-medium',
                                                'text-sm',
                                                'text-center',
                                            )}
                                        >
                                            {day}
                                        </div>
                                    ))}
                                </div>
                                <div
                                    className={cn(
                                        'gap-1',
                                        'grid',
                                        'grid-cols-7',
                                    )}
                                >
                                    {days.map((day, index) => {
                                        if (!day) {
                                            return (
                                                <div
                                                    key={`empty-${index}`}
                                                    className="p-2"
                                                />
                                            );
                                        }

                                        const daySchedule =
                                            getScheduleForDate(day);
                                        const isToday =
                                            day.toDateString() ===
                                            new Date().toDateString();
                                        const isSelected =
                                            selectedDate?.toDateString() ===
                                            day.toDateString();

                                        return (
                                            <div
                                                key={day.toISOString()}
                                                className={cn(
                                                    'cursor-pointer rounded-lg border p-2 transition-colors',
                                                    isToday &&
                                                        'border-blue-200 bg-blue-50 dark:border-blue-700 dark:bg-blue-900',
                                                    isSelected &&
                                                        'border-purple-200 bg-purple-50 dark:border-purple-700 dark:bg-purple-900',
                                                    !isToday &&
                                                        !isSelected &&
                                                        'hover:border-gray-300 hover:bg-gray-100 dark:hover:border-gray-700 dark:hover:bg-gray-800',
                                                    daySchedule &&
                                                        daySchedule.due_count >
                                                            0 &&
                                                        'font-semibold',
                                                )}
                                                onClick={() =>
                                                    setSelectedDate(day)
                                                }
                                            >
                                                <div className="text-sm">
                                                    {day.getDate()}
                                                </div>
                                                {daySchedule &&
                                                    daySchedule.due_count >
                                                        0 && (
                                                        <div
                                                            className={cn(
                                                                'flex',
                                                                'justify-center',
                                                                'mt-1',
                                                            )}
                                                        >
                                                            <Badge
                                                                variant="secondary"
                                                                className="text-xs"
                                                            >
                                                                {
                                                                    daySchedule.due_count
                                                                }
                                                            </Badge>
                                                        </div>
                                                    )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Selected Date Details */}
                        <Card>
                            <CardHeader>
                                <CardTitle
                                    className={cn(
                                        'flex',
                                        'items-center',
                                        'gap-2',
                                    )}
                                >
                                    <Activity className={cn('w-5', 'h-5')} />
                                    {selectedDate
                                        ? selectedDate.toLocaleDateString()
                                        : 'Select a Date'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {selectedDate ? (
                                    <div className="space-y-4">
                                        {(() => {
                                            const daySchedule =
                                                getScheduleForDate(
                                                    selectedDate,
                                                );
                                            if (
                                                !daySchedule ||
                                                daySchedule.due_count === 0
                                            ) {
                                                return (
                                                    <div
                                                        className={cn(
                                                            'py-8',
                                                            'text-center',
                                                        )}
                                                    >
                                                        <CalendarIcon
                                                            className={cn(
                                                                'mx-auto',
                                                                'mb-4',
                                                                'w-12',
                                                                'h-12',
                                                                'text-muted-foreground',
                                                            )}
                                                        />
                                                        <h4
                                                            className={cn(
                                                                'mb-2',
                                                                'font-medium',
                                                            )}
                                                        >
                                                            No study sessions
                                                        </h4>
                                                        <p
                                                            className={cn(
                                                                'text-muted-foreground',
                                                                'text-sm',
                                                            )}
                                                        >
                                                            Enjoy your break!
                                                        </p>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div className="space-y-3">
                                                    <div
                                                        className={cn(
                                                            'flex',
                                                            'justify-between',
                                                            'items-center',
                                                        )}
                                                    >
                                                        <span
                                                            className={cn(
                                                                'font-medium',
                                                                'text-sm',
                                                            )}
                                                        >
                                                            Due Cards
                                                        </span>
                                                        <Badge variant="outline">
                                                            {
                                                                daySchedule.due_count
                                                            }
                                                        </Badge>
                                                    </div>
                                                    <div
                                                        className={cn(
                                                            'flex',
                                                            'justify-between',
                                                            'items-center',
                                                        )}
                                                    >
                                                        <span
                                                            className={cn(
                                                                'font-medium',
                                                                'text-sm',
                                                            )}
                                                        >
                                                            Est. Time
                                                        </span>
                                                        <span
                                                            className={cn(
                                                                'text-muted-foreground',
                                                                'text-sm',
                                                            )}
                                                        >
                                                            {
                                                                daySchedule.total_study_time
                                                            }{' '}
                                                            min
                                                        </span>
                                                    </div>
                                                    <Separator />
                                                    <ScrollArea className="h-48">
                                                        <div className="space-y-2">
                                                            {daySchedule.flashcards.map(
                                                                (card) => (
                                                                    <div
                                                                        key={
                                                                            card.id
                                                                        }
                                                                        className={cn(
                                                                            'p-2',
                                                                            'border',
                                                                            'rounded',
                                                                        )}
                                                                    >
                                                                        <h5
                                                                            className={cn(
                                                                                'font-medium',
                                                                                'text-sm',
                                                                                'truncate',
                                                                            )}
                                                                        >
                                                                            {
                                                                                card.resource_title
                                                                            }
                                                                        </h5>
                                                                        <p
                                                                            className={cn(
                                                                                'text-muted-foreground',
                                                                                'text-xs',
                                                                                'truncate',
                                                                            )}
                                                                        >
                                                                            {
                                                                                card.front
                                                                            }
                                                                        </p>
                                                                        <div
                                                                            className={cn(
                                                                                'flex',
                                                                                'items-center',
                                                                                'gap-2',
                                                                                'mt-1',
                                                                            )}
                                                                        >
                                                                            <Badge
                                                                                variant="outline"
                                                                                className="text-xs"
                                                                            >
                                                                                Interval:{' '}
                                                                                {
                                                                                    card.interval_days
                                                                                }

                                                                                d
                                                                            </Badge>
                                                                            <Badge
                                                                                variant="outline"
                                                                                className="text-xs"
                                                                            >
                                                                                Difficulty:{' '}
                                                                                {card.difficulty?.toFixed(
                                                                                    1,
                                                                                ) ??
                                                                                    'N/A'}
                                                                            </Badge>
                                                                        </div>
                                                                    </div>
                                                                ),
                                                            )}
                                                        </div>
                                                    </ScrollArea>
                                                    <Link
                                                        href={flashcards().url}
                                                    >
                                                        <Button className="w-full">
                                                            <Play
                                                                className={cn(
                                                                    'mr-2',
                                                                    'w-4',
                                                                    'h-4',
                                                                )}
                                                            />
                                                            Start Session
                                                        </Button>
                                                    </Link>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                ) : (
                                    <div className={cn('py-8', 'text-center')}>
                                        <CalendarIcon
                                            className={cn(
                                                'mx-auto',
                                                'mb-4',
                                                'w-12',
                                                'h-12',
                                                'text-muted-foreground',
                                            )}
                                        />
                                        <h4
                                            className={cn(
                                                'mb-2',
                                                'font-medium',
                                            )}
                                        >
                                            Select a date
                                        </h4>
                                        <p
                                            className={cn(
                                                'text-muted-foreground',
                                                'text-sm',
                                            )}
                                        >
                                            Click on any date to see study
                                            details
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Study Plan View */}
                {view === 'plan' && (
                    <Card>
                        <CardHeader>
                            <CardTitle
                                className={cn('flex', 'items-center', 'gap-2')}
                            >
                                <TargetIcon className={cn('w-5', 'h-5')} />
                                Generated Study Plan
                            </CardTitle>
                            <CardDescription>
                                Optimized study schedule for the next week
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className={cn('py-8', 'text-center')}>
                                    <div
                                        className={cn(
                                            'mx-auto',
                                            'mb-4',
                                            'border-primary',
                                            'border-b-2',
                                            'rounded-full',
                                            'w-8',
                                            'h-8',
                                            'animate-spin',
                                        )}
                                    ></div>
                                    <p
                                        className={cn(
                                            'text-muted-foreground',
                                            'text-sm',
                                        )}
                                    >
                                        Generating study plan...
                                    </p>
                                </div>
                            ) : error ? (
                                <div className={cn('py-8', 'text-center')}>
                                    <AlertCircle
                                        className={cn(
                                            'mx-auto',
                                            'mb-4',
                                            'w-12',
                                            'h-12',
                                            'text-red-500',
                                        )}
                                    />
                                    <h4
                                        className={cn(
                                            'mb-2',
                                            'font-medium',
                                            'text-red-500',
                                        )}
                                    >
                                        Error
                                    </h4>
                                    <p
                                        className={cn(
                                            'mb-4',
                                            'text-muted-foreground',
                                            'text-sm',
                                        )}
                                    >
                                        {error}
                                    </p>
                                    <Button
                                        onClick={fetchStudyPlan}
                                        variant="outline"
                                    >
                                        Try Again
                                    </Button>
                                </div>
                            ) : planData.length > 0 ? (
                                <div className="space-y-4">
                                    {planData.map((day) => (
                                        <div
                                            key={day.date}
                                            className={cn(
                                                'rounded-lg border p-4',
                                                day.is_today &&
                                                    'border-blue-200 bg-blue-50 dark:border-purple-800 dark:bg-gray-950',
                                                day.is_weekend &&
                                                    'bg-gray-50 dark:bg-gray-900',
                                            )}
                                        >
                                            <div
                                                className={cn(
                                                    'flex',
                                                    'justify-between',
                                                    'items-center',
                                                    'mb-3',
                                                )}
                                            >
                                                <div>
                                                    <h4 className="font-semibold">
                                                        {day.day_name}
                                                    </h4>
                                                    <p
                                                        className={cn(
                                                            'text-muted-foreground',
                                                            'text-sm',
                                                        )}
                                                    >
                                                        {day.date}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <Badge variant="outline">
                                                        {day.sessions.length}{' '}
                                                        sessions
                                                    </Badge>
                                                    <p
                                                        className={cn(
                                                            'mt-1',
                                                            'text-muted-foreground',
                                                            'text-sm',
                                                        )}
                                                    >
                                                        {day.total_time} minutes
                                                    </p>
                                                </div>
                                            </div>
                                            <div
                                                className={cn('gap-2', 'grid')}
                                            >
                                                {day.sessions.map(
                                                    (session, idx) => (
                                                        <div
                                                            key={idx}
                                                            className={cn(
                                                                'flex',
                                                                'justify-between',
                                                                'items-center',
                                                                'p-2',
                                                                'border',
                                                                'rounded',
                                                            )}
                                                        >
                                                            <div>
                                                                <h5
                                                                    className={cn(
                                                                        'font-medium',
                                                                        'text-sm',
                                                                    )}
                                                                >
                                                                    {
                                                                        session.resource_title
                                                                    }
                                                                </h5>
                                                                <p
                                                                    className={cn(
                                                                        'text-muted-foreground',
                                                                        'text-xs',
                                                                    )}
                                                                >
                                                                    {
                                                                        session.cards_count
                                                                    }{' '}
                                                                    cards
                                                                </p>
                                                            </div>
                                                            <Badge variant="secondary">
                                                                {
                                                                    session.estimated_time
                                                                }{' '}
                                                                min
                                                            </Badge>
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className={cn('py-8', 'text-center')}>
                                    <TargetIcon
                                        className={cn(
                                            'mx-auto',
                                            'mb-4',
                                            'w-12',
                                            'h-12',
                                            'text-muted-foreground',
                                        )}
                                    />
                                    <h4 className={cn('mb-2', 'font-medium')}>
                                        No study plan generated
                                    </h4>
                                    <p
                                        className={cn(
                                            'mb-4',
                                            'text-muted-foreground',
                                            'text-sm',
                                        )}
                                    >
                                        No upcoming cards found for study plan
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Recommendations View */}
                {view === 'recommendations' && (
                    <Card>
                        <CardHeader>
                            <CardTitle
                                className={cn('flex', 'items-center', 'gap-2')}
                            >
                                <Lightbulb className={cn('w-5', 'h-5')} />
                                Study Recommendations
                            </CardTitle>
                            <CardDescription>
                                AI-powered suggestions for optimal study timing
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className={cn('py-8', 'text-center')}>
                                    <div
                                        className={cn(
                                            'mx-auto',
                                            'mb-4',
                                            'border-primary',
                                            'border-b-2',
                                            'rounded-full',
                                            'w-8',
                                            'h-8',
                                            'animate-spin',
                                        )}
                                    ></div>
                                    <p
                                        className={cn(
                                            'text-muted-foreground',
                                            'text-sm',
                                        )}
                                    >
                                        Loading recommendations...
                                    </p>
                                </div>
                            ) : error ? (
                                <div className={cn('py-8', 'text-center')}>
                                    <AlertCircle
                                        className={cn(
                                            'mx-auto',
                                            'mb-4',
                                            'w-12',
                                            'h-12',
                                            'text-red-500',
                                        )}
                                    />
                                    <h4
                                        className={cn(
                                            'mb-2',
                                            'font-medium',
                                            'text-red-500',
                                        )}
                                    >
                                        Error
                                    </h4>
                                    <p
                                        className={cn(
                                            'mb-4',
                                            'text-muted-foreground',
                                            'text-sm',
                                        )}
                                    >
                                        {error}
                                    </p>
                                    <Button
                                        onClick={fetchRecommendations}
                                        variant="outline"
                                    >
                                        Try Again
                                    </Button>
                                </div>
                            ) : recommendationsData.length > 0 ? (
                                <div className="space-y-4">
                                    {recommendationsData.map((rec, idx) => (
                                        <div
                                            key={idx}
                                            className={cn(
                                                'p-4',
                                                'border',
                                                'rounded-lg',
                                            )}
                                        >
                                            <div
                                                className={cn(
                                                    'flex',
                                                    'justify-between',
                                                    'items-center',
                                                    'mb-3',
                                                )}
                                            >
                                                <div>
                                                    <h4 className="font-semibold">
                                                        {rec.resource_title}
                                                    </h4>
                                                    <p
                                                        className={cn(
                                                            'text-muted-foreground',
                                                            'text-sm',
                                                        )}
                                                    >
                                                        {rec.date}
                                                    </p>
                                                </div>
                                                <Badge
                                                    className={cn(
                                                        'flex items-center gap-1',
                                                        getPriorityColor(
                                                            rec.priority,
                                                        ),
                                                    )}
                                                >
                                                    {getPriorityIcon(
                                                        rec.priority,
                                                    )}
                                                    {rec.priority}
                                                </Badge>
                                            </div>
                                            <div
                                                className={cn(
                                                    'flex',
                                                    'justify-between',
                                                    'items-center',
                                                )}
                                            >
                                                <div>
                                                    <p
                                                        className={cn(
                                                            'text-muted-foreground',
                                                            'text-sm',
                                                        )}
                                                    >
                                                        {rec.cards.length} cards
                                                        to review
                                                    </p>
                                                    <p
                                                        className={cn(
                                                            'text-muted-foreground',
                                                            'text-xs',
                                                        )}
                                                    >
                                                        {rec.cards
                                                            .slice(0, 3)
                                                            .map((c) => c.front)
                                                            .join(', ')}
                                                        {rec.cards.length > 3 &&
                                                            '...'}
                                                    </p>
                                                </div>
                                                <Badge variant="secondary">
                                                    {rec.estimated_time} min
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className={cn('py-8', 'text-center')}>
                                    <Lightbulb
                                        className={cn(
                                            'mx-auto',
                                            'mb-4',
                                            'w-12',
                                            'h-12',
                                            'text-muted-foreground',
                                        )}
                                    />
                                    <h4 className={cn('mb-2', 'font-medium')}>
                                        No recommendations available
                                    </h4>
                                    <p
                                        className={cn(
                                            'mb-4',
                                            'text-muted-foreground',
                                            'text-sm',
                                        )}
                                    >
                                        No upcoming cards found for
                                        recommendations
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}

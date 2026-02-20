import { Head } from '@inertiajs/react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
    Send,
    Sparkles,
    FileText,
    FileImage,
    FileCode2,
    File,
    Check,
    User,
    Bot,
    Trash2,
    Clock,
    History,
    MessageSquare,
    ChevronRight,
    Search,
} from 'lucide-react';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import FileViewer from '@/components/file-viewer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import AppLayout from '@/layouts/app-layout';
import { db, type ChatMessage } from '@/lib/db';
import { cn } from '@/lib/utils';
import { library } from '@/routes';
import type { BreadcrumbItem, Resource } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Library',
        href: library().url,
    },
];

export default function Library({ resources }: { resources: Resource[] }) {
    const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [selectedResources, setSelectedResources] = useState<Resource[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const scrollRef = useRef<HTMLDivElement>(null);

    // Queries from IndexedDB
    const sessions =
        useLiveQuery(() =>
            db.sessions.orderBy('updatedAt').reverse().toArray(),
        ) || [];
    const liveMessages = useLiveQuery(
        () =>
            activeSessionId
                ? db.messages
                    .where('sessionId')
                    .equals(activeSessionId)
                    .sortBy('createdAt')
                : Promise.resolve([] as ChatMessage[]),
        [activeSessionId],
    );

    const messages = useMemo(
        () => liveMessages || ([] as ChatMessage[]),
        [liveMessages],
    );

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isTyping]);

    // Preview state
    const [previewResource, setPreviewResource] = useState<Resource | null>(
        null,
    );
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const filteredResources = useMemo(() => {
        if (!searchQuery) return resources;
        return resources.filter((res) =>
            res.original_name.toLowerCase().includes(searchQuery.toLowerCase()),
        );
    }, [resources, searchQuery]);

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getFileIcon = (mime: string) => {
        if (mime.includes('image')) return <FileImage className="h-5 w-5" />;
        if (mime.includes('pdf') || mime.includes('text'))
            return <FileText className="h-5 w-5" />;
        if (
            mime.includes('json') ||
            mime.includes('javascript') ||
            mime.includes('typescript')
        )
            return <FileCode2 className="h-5 w-5" />;
        return <File className="h-5 w-5" />;
    };

    const handlePreview = async (resource: Resource) => {
        setPreviewResource(resource);
        setPreviewUrl(null);
        try {
            const response = await fetch(`/files/preview/${resource.s3_key}`);
            if (!response.ok) {
                console.error('Failed to fetch preview URL:', response.statusText);
                return;
            }
            const data = await response.json();
            setPreviewUrl(data.url);
        } catch (error) {
            console.error('Error fetching preview URL:', error);
        }
    };

    const closePreview = () => {
        setPreviewResource(null);
        setPreviewUrl(null);
    };

    const startSessionForResource = async (resource: Resource) => {
        const existing = await db.sessions
            .where('resourceId')
            .equals(resource.id.toString())
            .first();
        if (existing) {
            setActiveSessionId(existing.id!);
        } else {
            const newId = await db.sessions.add({
                resourceId: resource.id.toString(),
                title: resource.original_name,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
            setActiveSessionId(newId as number);
        }
    };

    const toggleContext = (e: React.MouseEvent, resource: Resource) => {
        e.stopPropagation();
        const alreadySelected = selectedResources.find(
            (r) => r.id === resource.id,
        );

        if (alreadySelected) {
            setSelectedResources((prev) =>
                prev.filter((r) => r.id !== resource.id),
            );
            if (selectedResources.length === 1) setActiveSessionId(null);
        } else {
            setSelectedResources([resource]);
            startSessionForResource(resource).catch((err) =>
                console.error('Failed to start session:', err),
            );
        }
    };

    const sendMessage = async () => {
        if (!input.trim() || isTyping || !activeSessionId) return;

        const userMsg = input.trim();
        const timestamp = Date.now();

        await db.messages.add({
            sessionId: activeSessionId,
            role: 'user',
            content: userMsg,
            createdAt: timestamp,
        });

        await db.sessions.update(activeSessionId, { updatedAt: timestamp });

        setInput('');
        setIsTyping(true);

        const resourceId = selectedResources[0]?.id;

        try {
            const response = await window.axios.post('/ai/chat', {
                message: userMsg,
                resource_id: resourceId,
            });

            if (response.data.answer) {
                await db.messages.add({
                    sessionId: activeSessionId,
                    role: 'assistant',
                    content: response.data.answer,
                    reasoning: response.data.reasoning,
                    createdAt: Date.now(),
                });
            } else {
                await db.messages.add({
                    sessionId: activeSessionId,
                    role: 'assistant',
                    content: "I'm sorry, I couldn't generate a response.",
                    createdAt: Date.now(),
                });
            }
        } catch (error) {
            console.error('AI Chat Error:', error);
            await db.messages.add({
                sessionId: activeSessionId,
                role: 'system',
                content:
                    'Error connection to AI service. Please verify LM Studio status.',
                createdAt: Date.now(),
            });
        } finally {
            setIsTyping(false);
        }
    };

    const clearChat = async () => {
        if (activeSessionId) {
            await db.messages
                .where('sessionId')
                .equals(activeSessionId)
                .delete();
        }
    };

    const deleteSession = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        await db.messages.where('sessionId').equals(id).delete();
        await db.sessions.delete(id);
        if (activeSessionId === id) {
            setActiveSessionId(null);
            setSelectedResources([]);
        }
    };

    const getFileColor = (mime: string) => {
        if (mime.includes('image'))
            return 'text-purple-600 bg-purple-100 dark:bg-purple-900/20';
        if (mime.includes('pdf'))
            return 'text-red-600 bg-red-100 dark:bg-red-900/20';
        if (mime.includes('sheet') || mime.includes('excel'))
            return 'text-green-600 bg-green-100 dark:bg-green-900/20';
        if (
            mime.includes('text') ||
            mime.includes('code') ||
            mime.includes('json')
        )
            return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
        return 'text-gray-600 bg-gray-100 dark:bg-gray-800';
    };

    const HistoryList = ({ className = '' }: { className?: string }) => (
        <div className={cn('flex h-full flex-col gap-4', className)}>
            <div className="flex items-center justify-between px-1">
                <h2 className="flex items-center gap-2 text-xs font-bold tracking-widest text-muted-foreground uppercase">
                    <History className="h-3.5 w-3.5" /> Personal History
                </h2>
            </div>

            <ScrollArea className="flex-1 overflow-hidden rounded-2xl border bg-card/30 shadow-inner backdrop-blur-sm">
                <div className="flex flex-col gap-1 p-2">
                    {sessions.length === 0 ? (
                        <div className="p-8 text-center">
                            <MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-10" />
                            <p className="text-[10px] text-muted-foreground italic">
                                No local sessions yet
                            </p>
                        </div>
                    ) : (
                        sessions.map((s) => (
                            <button
                                key={s.id}
                                onClick={() => {
                                    setActiveSessionId(s.id!);
                                    const res = resources.find(
                                        (r) => r.id.toString() === s.resourceId,
                                    );
                                    if (res) setSelectedResources([res]);
                                }}
                                className={cn(
                                    'group relative w-full rounded-xl border border-transparent p-3 text-left transition-all',
                                    activeSessionId === s.id
                                        ? 'border-primary/20 bg-primary/10 shadow-sm'
                                        : 'hover:bg-white/5',
                                )}
                            >
                                <div className="truncate pr-6 text-xs font-semibold transition-colors group-hover:text-primary">
                                    {s.title}
                                </div>
                                <div className="mt-1 flex items-center gap-1 text-[9px] text-muted-foreground opacity-60">
                                    <Clock className="h-2.5 w-2.5" />
                                    {new Date(s.updatedAt).toLocaleTimeString(
                                        [],
                                        { hour: '2-digit', minute: '2-digit' },
                                    )}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-1/2 right-2 h-5 w-5 -translate-y-1/2 opacity-0 transition-all group-hover:opacity-100 hover:text-destructive"
                                    onClick={(e) => deleteSession(e, s.id!)}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </button>
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Intellix AI - Workspace" />

            <div className="relative flex h-[calc(100vh-160px)] flex-col p-4">
                {/* Global History Trigger - Top Left */}
                <div className="absolute top-0 left-0 z-40">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="group h-10 w-10 rounded-xl border border-white/10 bg-background/50 shadow-sm backdrop-blur transition-all hover:scale-105 active:scale-95"
                            >
                                <History className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent
                            side="right"
                            className="flex w-[300px] flex-col border-l border-white/10 bg-background/95 p-6 backdrop-blur-xl"
                        >
                            <SheetHeader className="mb-6 flex-shrink-0">
                                <SheetTitle className="flex items-center gap-2 text-xs font-bold tracking-[0.2em] uppercase">
                                    <Sparkles className="h-3.5 w-3.5 text-primary" />{' '}
                                    Archives
                                </SheetTitle>
                            </SheetHeader>
                            <div className="flex-1 overflow-hidden">
                                <HistoryList />
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>

                <div className="grid h-full grid-cols-1 gap-6 pt-12 lg:grid-cols-[300px_1fr] lg:pt-0">
                    {/* LEFT PANEL — RESOURCE GRID (Shifted to Left) */}
                    <div className="flex h-full flex-col gap-4 overflow-hidden">
                        <div className="group relative flex-shrink-0">
                            <Search className="absolute top-1/2 left-3.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                            <Input
                                placeholder="Search library..."
                                className="h-10 rounded-xl border-white/10 bg-background/40 pl-10 backdrop-blur-sm focus:ring-primary/20"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <ScrollArea className="flex-1 pr-2">
                            <div className="grid grid-cols-1 gap-3">
                                {filteredResources.map((resource) => {
                                    const isSelected = selectedResources.some(
                                        (r) => r.id === resource.id,
                                    );
                                    return (
                                        <Card
                                            key={resource.id}
                                            className={cn(
                                                'group relative cursor-pointer overflow-hidden border-2 transition-all duration-300',
                                                'hover:-translate-y-0.5 hover:shadow-lg',
                                                isSelected
                                                    ? 'border-primary/40 bg-primary/5 shadow-[0_0_20px_rgba(var(--primary),0.05)]'
                                                    : 'border-white/5 bg-card/30 backdrop-blur-md',
                                            )}
                                        >
                                            <div
                                                className="flex items-center gap-3 p-3"
                                                onClick={() =>
                                                    handlePreview(resource)
                                                }
                                            >
                                                <div
                                                    className={cn(
                                                        'flex flex-shrink-0 items-center justify-center rounded-xl p-2.5 transition-all group-hover:rotate-6',
                                                        getFileColor(
                                                            resource.mime_type,
                                                        ),
                                                    )}
                                                >
                                                    {getFileIcon(
                                                        resource.mime_type,
                                                    )}
                                                </div>

                                                <div className="flex min-w-0 flex-1 flex-col">
                                                    <span className="mb-1 truncate text-xs leading-none font-bold transition-colors group-hover:text-primary">
                                                        {resource.original_name}
                                                    </span>
                                                    <span className="text-[9px] font-medium text-muted-foreground uppercase opacity-60">
                                                        {formatBytes(
                                                            resource.size_bytes,
                                                        )}
                                                    </span>
                                                </div>

                                                <Button
                                                    size="icon"
                                                    variant={
                                                        isSelected
                                                            ? 'default'
                                                            : 'ghost'
                                                    }
                                                    className={cn(
                                                        'h-7 w-7 flex-shrink-0 rounded-lg transition-all',
                                                        !isSelected &&
                                                        'opacity-0 group-hover:opacity-100',
                                                    )}
                                                    onClick={(e) =>
                                                        toggleContext(
                                                            e,
                                                            resource,
                                                        )
                                                    }
                                                >
                                                    {isSelected ? (
                                                        <Check className="h-3.5 w-3.5" />
                                                    ) : (
                                                        <MessageSquare className="h-3.5 w-3.5" />
                                                    )}
                                                </Button>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* RIGHT PANEL — AI CHAT (Takes remaining space) */}
                    <div className="flex h-full min-w-0 flex-col">
                        <Card className="relative flex h-full flex-col overflow-hidden rounded-3xl border-white/10 bg-gradient-to-b from-background/80 to-background/40 shadow-2xl backdrop-blur-xl">
                            <div className="pointer-events-none absolute inset-0 bg-primary/5" />

                            <CardHeader className="z-10 border-b border-white/5 pb-3">
                                <CardTitle className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/30 bg-primary/20">
                                            <Bot className="h-6 w-6 animate-pulse text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold tracking-tight">
                                                Intellix AI
                                            </h3>
                                            <Badge
                                                variant="outline"
                                                className="h-4 border-primary/20 bg-primary/5 px-1.5 text-[9px] font-bold text-primary uppercase"
                                            >
                                                Encrypted Session
                                            </Badge>
                                        </div>
                                    </div>
                                    {activeSessionId && (
                                        <div className="flex gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={clearChat}
                                                title="Clear Session"
                                                className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() =>
                                                    setActiveSessionId(null)
                                                }
                                                title="Close Chat"
                                                className="h-8 w-8 rounded-lg hover:bg-white/10"
                                            >
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </CardTitle>
                            </CardHeader>

                            <CardContent className="relative z-10 flex flex-1 flex-col gap-0 overflow-hidden p-0">
                                <div className="relative flex-1">
                                    <ScrollArea className="h-full">
                                        <div className="flex flex-col gap-6 p-6">
                                            {!activeSessionId ? (
                                                <div className="flex h-[400px] flex-col items-center justify-center px-10 text-center">
                                                    <div className="relative mb-6">
                                                        <div className="absolute -inset-4 animate-pulse rounded-full bg-primary/20 blur-2xl" />
                                                        <Sparkles className="relative h-12 w-12 text-primary" />
                                                    </div>
                                                    <h3 className="mb-2 text-xl font-bold">
                                                        Private Knowledge
                                                        Workspace
                                                    </h3>
                                                    <p className="max-w-[280px] text-sm text-muted-foreground">
                                                        Select a file from the
                                                        library to start an
                                                        encrypted analysis
                                                        session.
                                                    </p>
                                                </div>
                                            ) : (
                                                <>
                                                    {messages.length === 0 && (
                                                        <div className="py-10 text-center text-[10px] tracking-widest uppercase italic opacity-30">
                                                            Session established.
                                                            Analyzing local
                                                            context...
                                                        </div>
                                                    )}
                                                    {messages.map((msg, i) => (
                                                        <div
                                                            key={i}
                                                            className={cn(
                                                                'flex w-full flex-col gap-2',
                                                                msg.role ===
                                                                    'user'
                                                                    ? 'items-end'
                                                                    : 'items-start',
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-2 px-1 text-[9px] font-bold tracking-[0.2em] text-muted-foreground/50 uppercase">
                                                                {msg.role ===
                                                                    'assistant' ? (
                                                                    <>
                                                                        <Bot className="h-3 w-3 text-primary/70" />{' '}
                                                                        Intellix
                                                                    </>
                                                                ) : msg.role ===
                                                                    'user' ? (
                                                                    <>
                                                                        <User className="h-3 w-3" />{' '}
                                                                        User
                                                                    </>
                                                                ) : (
                                                                    <>System</>
                                                                )}
                                                            </div>
                                                            <div
                                                                className={cn(
                                                                    'group max-w-[95%] rounded-2xl shadow-sm transition-all duration-300',
                                                                    msg.role ===
                                                                        'assistant'
                                                                        ? 'rounded-tl-none border border-white/10 bg-card p-4 text-foreground'
                                                                        : msg.role ===
                                                                            'user'
                                                                            ? 'rounded-tr-none bg-primary px-4 py-2.5 text-primary-foreground shadow-lg shadow-primary/10'
                                                                            : 'mx-auto rounded-lg border-none bg-muted/20 px-3 py-1 text-[10px] text-muted-foreground italic',
                                                                )}
                                                            >
                                                                {msg.reasoning && (
                                                                    <details className="mb-4 overflow-hidden rounded-xl border border-primary/10 bg-primary/5 p-3 text-[11px]">
                                                                        <summary className="mb-1 flex cursor-pointer items-center gap-2 font-bold transition-colors hover:text-primary">
                                                                            <Sparkles className="animate-spin-slow h-3 w-3" />
                                                                            Thinking
                                                                            Process
                                                                        </summary>
                                                                        <div className="mt-2 border-l-2 border-primary/20 pl-3 font-serif leading-relaxed whitespace-pre-wrap italic opacity-60">
                                                                            {
                                                                                msg.reasoning
                                                                            }
                                                                        </div>
                                                                    </details>
                                                                )}
                                                                <div
                                                                    className={cn(
                                                                        'prose prose-sm dark:prose-invert prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/5 max-w-none',
                                                                        msg.role ===
                                                                        'user' &&
                                                                        'prose-p:text-primary-foreground prose-strong:text-white prose-code:text-white',
                                                                    )}
                                                                >
                                                                    <ReactMarkdown
                                                                        remarkPlugins={[
                                                                            remarkGfm,
                                                                        ]}
                                                                    >
                                                                        {
                                                                            msg.content
                                                                        }
                                                                    </ReactMarkdown>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </>
                                            )}
                                            {isTyping && (
                                                <div className="flex w-full animate-in flex-col items-start gap-2 fade-in slide-in-from-bottom-2">
                                                    <div className="flex items-center gap-2 px-1 text-[9px] font-bold tracking-[0.2em] text-muted-foreground/50 uppercase">
                                                        <Bot className="h-3 w-3 text-primary/70" />{' '}
                                                        Intellix
                                                    </div>
                                                    <div className="flex min-w-[140px] flex-col gap-2 rounded-2xl rounded-tl-none border border-white/10 bg-card p-5 shadow-xl">
                                                        <div className="flex items-center gap-4">
                                                            <div className="flex gap-1.5">
                                                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]"></span>
                                                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]"></span>
                                                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary"></span>
                                                            </div>
                                                            <span className="animate-pulse text-[10px] font-bold tracking-widest text-primary uppercase">
                                                                Analyzing...
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            <div
                                                ref={scrollRef}
                                                className="h-4"
                                            />
                                        </div>
                                    </ScrollArea>
                                </div>

                                {/* Floating Input Area */}
                                <div className="border-t border-white/5 bg-background/60 p-4 backdrop-blur-md">
                                    <div className="relative flex items-end gap-2">
                                        <div className="group relative flex-1">
                                            <textarea
                                                placeholder={
                                                    !activeSessionId
                                                        ? 'Initiate a session to query...'
                                                        : 'Ask about your document...'
                                                }
                                                rows={1}
                                                value={input}
                                                onChange={(e) =>
                                                    setInput(e.target.value)
                                                }
                                                onKeyDown={(e) => {
                                                    if (
                                                        e.key === 'Enter' &&
                                                        !e.shiftKey
                                                    ) {
                                                        e.preventDefault();
                                                        sendMessage().catch(
                                                            (err) =>
                                                                console.error(
                                                                    'Failed to send message:',
                                                                    err,
                                                                ),
                                                        );
                                                    }
                                                }}
                                                disabled={
                                                    !activeSessionId || isTyping
                                                }
                                                className={cn(
                                                    'scrollbar-hide max-h-[150px] min-h-[48px] w-full resize-none overflow-y-auto rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm shadow-inner transition-all outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/40',
                                                    (!activeSessionId ||
                                                        isTyping) &&
                                                    'cursor-not-allowed opacity-50',
                                                )}
                                            />
                                        </div>
                                        <Button
                                            onClick={() =>
                                                sendMessage().catch((err) =>
                                                    console.error(
                                                        'Failed to send message:',
                                                        err,
                                                    ),
                                                )
                                            }
                                            size="icon"
                                            disabled={
                                                !input.trim() ||
                                                isTyping ||
                                                !activeSessionId
                                            }
                                            className="h-12 w-12 shrink-0 rounded-2xl bg-primary shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                                        >
                                            <Send
                                                className={cn(
                                                    'h-5 w-5',
                                                    isTyping && 'animate-pulse',
                                                )}
                                            />
                                        </Button>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between px-1">
                                        <p className="text-[8px] font-bold tracking-[0.2em] text-muted-foreground/30 uppercase">
                                            Private IndexedDB Storage Active
                                        </p>
                                        <p className="text-[8px] font-bold tracking-[0.2em] text-muted-foreground/30 uppercase">
                                            Secure Session Ready
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* File Viewer Dialog */}
            {previewResource && (
                <FileViewer
                    isOpen={!!previewResource}
                    onClose={closePreview}
                    url={previewUrl}
                    mime={previewResource.mime_type}
                    filename={previewResource.original_name}
                />
            )}
        </AppLayout>
    );
}

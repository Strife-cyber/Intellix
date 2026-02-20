import { Head } from '@inertiajs/react';
import {
    Send,
    Sparkles,
    FileText,
    FileImage,
    FileCode2,
    File,
    Plus,
    Check,
    User,
    Bot,
    Trash2,
    Calendar,
    Clock,
    History,
    MessageSquare,
    ChevronRight,
    Search,
    PanelLeftClose,
    PanelLeftOpen,
    Menu
} from 'lucide-react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { useState, useRef, useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { library } from '@/routes';
import type { BreadcrumbItem, Resource } from '@/types';
import FileViewer from '@/components/file-viewer';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { db, type ChatMessage, type ChatSession } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Library',
        href: library().url,
    },
];

export default function Library({
    resources,
}: {
    resources: Resource[];
}) {
    const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [selectedResources, setSelectedResources] = useState<Resource[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const scrollRef = useRef<HTMLDivElement>(null);

    // Queries from IndexedDB
    const sessions = useLiveQuery(() => db.sessions.orderBy('updatedAt').reverse().toArray()) || [];
    const messages = useLiveQuery(
        () => activeSessionId ? db.messages.where('sessionId').equals(activeSessionId).sortBy('createdAt') : Promise.resolve([]),
        [activeSessionId]
    ) || [];

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isTyping]);

    // Preview state
    const [previewResource, setPreviewResource] = useState<Resource | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);

    const filteredResources = useMemo(() => {
        if (!searchQuery) return resources;
        return resources.filter(res =>
            res.original_name.toLowerCase().includes(searchQuery.toLowerCase())
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
        if (mime.includes('pdf') || mime.includes('text')) return <FileText className="h-5 w-5" />;
        if (mime.includes('json') || mime.includes('javascript') || mime.includes('typescript'))
            return <FileCode2 className="h-5 w-5" />;
        return <File className="h-5 w-5" />;
    };

    const handlePreview = async (resource: Resource) => {
        setPreviewResource(resource);
        setPreviewUrl(null);
        setIsLoadingPreview(true);
        try {
            const response = await fetch(`/files/preview/${resource.s3_key}`);
            if (!response.ok) throw new Error('Failed to fetch preview URL');
            const data = await response.json();
            setPreviewUrl(data.url);
        } catch (error) {
            console.error("Error fetching preview URL:", error);
        } finally {
            setIsLoadingPreview(false);
        }
    };

    const closePreview = () => {
        setPreviewResource(null);
        setPreviewUrl(null);
    };

    const startSessionForResource = async (resource: Resource) => {
        const existing = await db.sessions.where('resourceId').equals(resource.id.toString()).first();
        if (existing) {
            setActiveSessionId(existing.id!);
        } else {
            const newId = await db.sessions.add({
                resourceId: resource.id.toString(),
                title: resource.original_name,
                createdAt: Date.now(),
                updatedAt: Date.now()
            });
            setActiveSessionId(newId as number);
        }
    };

    const toggleContext = (e: React.MouseEvent, resource: Resource) => {
        e.stopPropagation();
        const alreadySelected = selectedResources.find((r) => r.id === resource.id);

        if (alreadySelected) {
            setSelectedResources((prev) => prev.filter(r => r.id !== resource.id));
            if (selectedResources.length === 1) setActiveSessionId(null);
        } else {
            setSelectedResources([resource]);
            startSessionForResource(resource);
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
            createdAt: timestamp
        });

        await db.sessions.update(activeSessionId, { updatedAt: timestamp });

        setInput('');
        setIsTyping(true);

        const resourceId = selectedResources[0]?.id;

        try {
            const response = await window.axios.post('/ai/chat', {
                message: userMsg,
                resource_id: resourceId
            });

            if (response.data.answer) {
                await db.messages.add({
                    sessionId: activeSessionId,
                    role: 'assistant',
                    content: response.data.answer,
                    reasoning: response.data.reasoning,
                    createdAt: Date.now()
                });
            } else {
                await db.messages.add({
                    sessionId: activeSessionId,
                    role: 'assistant',
                    content: "I'm sorry, I couldn't generate a response.",
                    createdAt: Date.now()
                });
            }
        } catch (error) {
            console.error("AI Chat Error:", error);
            await db.messages.add({
                sessionId: activeSessionId,
                role: 'system',
                content: "Error connection to AI service. Please verify LM Studio status.",
                createdAt: Date.now()
            });
        } finally {
            setIsTyping(false);
        }
    };

    const clearChat = async () => {
        if (activeSessionId) {
            await db.messages.where('sessionId').equals(activeSessionId).delete();
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
        if (mime.includes('image')) return 'text-purple-600 bg-purple-100 dark:bg-purple-900/20';
        if (mime.includes('pdf')) return 'text-red-600 bg-red-100 dark:bg-red-900/20';
        if (mime.includes('sheet') || mime.includes('excel')) return 'text-green-600 bg-green-100 dark:bg-green-900/20';
        if (mime.includes('text') || mime.includes('code') || mime.includes('json')) return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
        return 'text-gray-600 bg-gray-100 dark:bg-gray-800';
    };

    const HistoryList = ({ className = "" }: { className?: string }) => (
        <div className={cn("flex flex-col gap-4 h-full", className)}>
            <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <History className="h-3.5 w-3.5" /> Personal History
                </h2>
            </div>

            <ScrollArea className="flex-1 rounded-2xl border bg-card/30 backdrop-blur-sm shadow-inner overflow-hidden">
                <div className="p-2 flex flex-col gap-1">
                    {sessions.length === 0 ? (
                        <div className="p-8 text-center">
                            <MessageSquare className="h-8 w-8 mx-auto opacity-10 mb-2" />
                            <p className="text-[10px] text-muted-foreground italic">No local sessions yet</p>
                        </div>
                    ) : (
                        sessions.map((s) => (
                            <button
                                key={s.id}
                                onClick={() => {
                                    setActiveSessionId(s.id!);
                                    const res = resources.find(r => r.id.toString() === s.resourceId);
                                    if (res) setSelectedResources([res]);
                                }}
                                className={cn(
                                    "w-full text-left p-3 rounded-xl transition-all group relative border border-transparent",
                                    activeSessionId === s.id
                                        ? "bg-primary/10 border-primary/20 shadow-sm"
                                        : "hover:bg-white/5"
                                )}
                            >
                                <div className="font-semibold text-xs truncate pr-6 transition-colors group-hover:text-primary">{s.title}</div>
                                <div className="text-[9px] text-muted-foreground flex items-center gap-1 mt-1 opacity-60">
                                    <Clock className="h-2.5 w-2.5" />
                                    {new Date(s.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
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

            <div className="relative flex flex-col h-[calc(100vh-140px)]">
                {/* Global History Trigger - Top Left */}
                <div className="absolute top-0 left-0 z-40">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 rounded-xl bg-background/50 backdrop-blur border border-white/10 shadow-sm hover:scale-105 active:scale-95 transition-all group"
                            >
                                <History className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-[300px] bg-background/95 backdrop-blur-xl border-l border-white/10 p-6 flex flex-col">
                            <SheetHeader className="mb-6 flex-shrink-0">
                                <SheetTitle className="text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Sparkles className="h-3.5 w-3.5 text-primary" /> Archives
                                </SheetTitle>
                            </SheetHeader>
                            <div className="flex-1 overflow-hidden">
                                <HistoryList />
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>

                <div className="grid h-full gap-6 grid-cols-1 lg:grid-cols-[300px_1fr] pt-12 lg:pt-0">

                    {/* LEFT PANEL — RESOURCE GRID (Shifted to Left) */}
                    <div className="flex flex-col gap-4 overflow-hidden h-full">
                        <div className="relative group flex-shrink-0">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input
                                placeholder="Search library..."
                                className="pl-10 h-10 bg-background/40 border-white/10 rounded-xl focus:ring-primary/20 backdrop-blur-sm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <ScrollArea className="flex-1 pr-2">
                            <div className="grid grid-cols-1 gap-3">
                                {filteredResources.map((resource) => {
                                    const isSelected = selectedResources.some((r) => r.id === resource.id);
                                    return (
                                        <Card
                                            key={resource.id}
                                            className={cn(
                                                'group cursor-pointer transition-all duration-300 border-2 relative overflow-hidden',
                                                'hover:shadow-lg hover:-translate-y-0.5',
                                                isSelected
                                                    ? 'border-primary/40 shadow-[0_0_20px_rgba(var(--primary),0.05)] bg-primary/5'
                                                    : 'border-white/5 bg-card/30 backdrop-blur-md'
                                            )}
                                        >
                                            <div className="flex items-center gap-3 p-3" onClick={() => handlePreview(resource)}>
                                                <div className={cn(
                                                    "rounded-xl p-2.5 flex items-center justify-center transition-all group-hover:rotate-6 flex-shrink-0",
                                                    getFileColor(resource.mime_type)
                                                )}>
                                                    {getFileIcon(resource.mime_type)}
                                                </div>

                                                <div className="flex flex-1 flex-col min-w-0">
                                                    <span className="truncate text-xs font-bold leading-none mb-1 group-hover:text-primary transition-colors">
                                                        {resource.original_name}
                                                    </span>
                                                    <span className="text-[9px] text-muted-foreground uppercase opacity-60 font-medium">
                                                        {formatBytes(resource.size_bytes)}
                                                    </span>
                                                </div>

                                                <Button
                                                    size="icon"
                                                    variant={isSelected ? "default" : "ghost"}
                                                    className={cn(
                                                        "h-7 w-7 rounded-lg transition-all flex-shrink-0",
                                                        !isSelected && "opacity-0 group-hover:opacity-100"
                                                    )}
                                                    onClick={(e) => toggleContext(e, resource)}
                                                >
                                                    {isSelected ? <Check className="h-3.5 w-3.5" /> : <MessageSquare className="h-3.5 w-3.5" />}
                                                </Button>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* RIGHT PANEL — AI CHAT (Takes remaining space) */}
                    <div className="h-full flex flex-col min-w-0">
                        <Card className="flex h-full flex-col rounded-3xl border-white/10 bg-gradient-to-b from-background/80 to-background/40 shadow-2xl backdrop-blur-xl overflow-hidden relative">
                            <div className="absolute inset-0 bg-primary/5 pointer-events-none" />

                            <CardHeader className="pb-3 border-b border-white/5 z-10">
                                <CardTitle className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30">
                                            <Bot className="h-6 w-6 text-primary animate-pulse" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold tracking-tight">Intellix AI</h3>
                                            <Badge variant="outline" className="text-[9px] uppercase px-1.5 h-4 border-primary/20 bg-primary/5 text-primary font-bold">Encrypted Session</Badge>
                                        </div>
                                    </div>
                                    {activeSessionId && (
                                        <div className="flex gap-2">
                                            <Button variant="ghost" size="icon" onClick={clearChat} title="Clear Session" className="h-8 w-8 hover:text-destructive hover:bg-destructive/10 rounded-lg">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => setActiveSessionId(null)} title="Close Chat" className="h-8 w-8 hover:bg-white/10 rounded-lg">
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </CardTitle>
                            </CardHeader>

                            <CardContent className="flex flex-1 flex-col gap-0 p-0 overflow-hidden relative z-10">
                                <div className="flex-1 relative">
                                    <ScrollArea className="h-full">
                                        <div className="flex flex-col gap-6 p-6">
                                            {!activeSessionId ? (
                                                <div className="h-[400px] flex flex-col items-center justify-center text-center px-10">
                                                    <div className="relative mb-6">
                                                        <div className="absolute -inset-4 bg-primary/20 blur-2xl rounded-full animate-pulse" />
                                                        <Sparkles className="h-12 w-12 text-primary relative" />
                                                    </div>
                                                    <h3 className="text-xl font-bold mb-2">Private Knowledge Workspace</h3>
                                                    <p className="text-sm text-muted-foreground max-w-[280px]">
                                                        Select a file from the library to start an encrypted analysis session.
                                                    </p>
                                                </div>
                                            ) : (
                                                <>
                                                    {messages.length === 0 && (
                                                        <div className="text-center py-10 opacity-30 italic text-[10px] tracking-widest uppercase">
                                                            Session established. Analyzing local context...
                                                        </div>
                                                    )}
                                                    {messages.map((msg, i) => (
                                                        <div
                                                            key={i}
                                                            className={cn(
                                                                "flex w-full flex-col gap-2",
                                                                msg.role === 'user' ? "items-end" : "items-start"
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-2 px-1 text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
                                                                {msg.role === 'assistant' ? (
                                                                    <><Bot className="h-3 w-3 text-primary/70" /> Intellix</>
                                                                ) : msg.role === 'user' ? (
                                                                    <><User className="h-3 w-3" /> User</>
                                                                ) : (
                                                                    <>System</>
                                                                )}
                                                            </div>
                                                            <div
                                                                className={cn(
                                                                    "max-w-[95%] group rounded-2xl shadow-sm transition-all duration-300",
                                                                    msg.role === 'assistant'
                                                                        ? "bg-card border border-white/10 text-foreground rounded-tl-none p-4"
                                                                        : msg.role === 'user'
                                                                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/10 rounded-tr-none py-2.5 px-4"
                                                                            : "mx-auto bg-muted/20 text-muted-foreground text-[10px] italic rounded-lg border-none px-3 py-1"
                                                                )}
                                                            >
                                                                {msg.reasoning && (
                                                                    <details className="mb-4 rounded-xl bg-primary/5 p-3 text-[11px] border border-primary/10 overflow-hidden">
                                                                        <summary className="cursor-pointer font-bold hover:text-primary transition-colors flex items-center gap-2 mb-1">
                                                                            <Sparkles className="h-3 w-3 animate-spin-slow" />
                                                                            Thinking Process
                                                                        </summary>
                                                                        <div className="mt-2 whitespace-pre-wrap leading-relaxed opacity-60 italic font-serif border-l-2 border-primary/20 pl-3">
                                                                            {msg.reasoning}
                                                                        </div>
                                                                    </details>
                                                                )}
                                                                <div className={cn(
                                                                    "prose prose-sm dark:prose-invert max-w-none prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/5",
                                                                    msg.role === 'user' && "prose-p:text-primary-foreground prose-strong:text-white prose-code:text-white"
                                                                )}>
                                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                                        {msg.content}
                                                                    </ReactMarkdown>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </>
                                            )}
                                            {isTyping && (
                                                <div className="flex w-full flex-col items-start gap-2 animate-in fade-in slide-in-from-bottom-2">
                                                    <div className="flex items-center gap-2 px-1 text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
                                                        <Bot className="h-3 w-3 text-primary/70" /> Intellix
                                                    </div>
                                                    <div className="flex flex-col gap-2 rounded-2xl bg-card border border-white/10 p-5 shadow-xl rounded-tl-none min-w-[140px]">
                                                        <div className="flex items-center gap-4">
                                                            <div className="flex gap-1.5">
                                                                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></span>
                                                                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></span>
                                                                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce"></span>
                                                            </div>
                                                            <span className="text-[10px] font-bold text-primary animate-pulse tracking-widest uppercase">Analyzing...</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            <div ref={scrollRef} className="h-4" />
                                        </div>
                                    </ScrollArea>
                                </div>

                                {/* Floating Input Area */}
                                <div className="p-4 border-t border-white/5 bg-background/60 backdrop-blur-md">
                                    <div className="flex items-end gap-2 relative">
                                        <div className="flex-1 relative group">
                                            <textarea
                                                placeholder={
                                                    !activeSessionId
                                                        ? "Initiate a session to query..."
                                                        : "Ask about your document..."
                                                }
                                                rows={1}
                                                value={input}
                                                onChange={(e) => setInput(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" && !e.shiftKey) {
                                                        e.preventDefault();
                                                        sendMessage();
                                                    }
                                                }}
                                                disabled={!activeSessionId || isTyping}
                                                className={cn(
                                                    "w-full max-h-[150px] min-h-[48px] bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary/50 outline-none transition-all resize-none overflow-y-auto scrollbar-hide shadow-inner",
                                                    (!activeSessionId || isTyping) && "opacity-50 cursor-not-allowed"
                                                )}
                                            />
                                        </div>
                                        <Button
                                            onClick={sendMessage}
                                            size="icon"
                                            disabled={!input.trim() || isTyping || !activeSessionId}
                                            className="h-12 w-12 rounded-2xl bg-primary hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20 shrink-0"
                                        >
                                            <Send className={cn("h-5 w-5", isTyping && "animate-pulse")} />
                                        </Button>
                                    </div>
                                    <div className="flex justify-between items-center mt-3 px-1">
                                        <p className="text-[8px] text-muted-foreground/30 font-bold tracking-[0.2em] uppercase">
                                            Private IndexedDB Storage Active
                                        </p>
                                        <p className="text-[8px] text-muted-foreground/30 font-bold tracking-[0.2em] uppercase">
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

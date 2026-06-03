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
    ChevronLeft,
    Settings,
    X,
    UserPlus,
    MoreVertical,
    Shield,
    Trash,
    Edit2,
} from 'lucide-react';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import FileViewer from '@/components/file-viewer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardFooter,
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { db, type ChatMessage } from '@/lib/db';
import { cn } from '@/lib/utils';
import { library } from '@/routes';
import type { BreadcrumbItem, Resource } from '@/types';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Library',
        href: library().url,
    },
];

/* ═════════════════════════════════════════════════════════════════════════
   Access Management Component
 ═══════════════════════════════════════════════════════════════════════════ */
function AccessManagement({ resource }: { resource: Resource }) {
    const [users, setUsers] = useState<any[]>([]);
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('viewer');
    const [loading, setLoading] = useState(false);

    const fetchAccess = async () => {
        try {
            const res = await window.axios.get(
                `/resources/${resource.id}/access`,
            );
            setUsers(res.data.data);
        } catch (err) {
            console.error('Failed to fetch access:', err);
        }
    };

    const handleInvite = async () => {
        if (!email) return;
        setLoading(true);
        try {
            await window.axios.post(`/resources/${resource.id}/access`, {
                email,
                role,
            });
            toast.success(`Access granted to ${email}`);
            setEmail('');
            fetchAccess();
        } catch (err: any) {
            toast.error(
                err.response?.data?.message || 'Failed to grant access',
            );
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async (userId: number) => {
        try {
            await window.axios.delete(
                `/resources/${resource.id}/access/${userId}`,
            );
            toast.success('Access revoked');
            fetchAccess();
        } catch (err) {
            toast.error('Failed to revoke access');
        }
    };

    const handleUpdateRole = async (userId: number, newRole: string) => {
        try {
            await window.axios.put(
                `/resources/${resource.id}/access/${userId}`,
                { role: newRole },
            );
            toast.success('Role updated');
            fetchAccess();
        } catch (err) {
            toast.error('Failed to update role');
        }
    };

    useEffect(() => {
        fetchAccess();
    }, [resource.id]);

    return (
        <div className="space-y-6 py-4">
            <div className="space-y-4">
                <h4 className="font-semibold text-sm">Share with others</h4>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <UserPlus className="top-1/2 left-3 absolute w-4 h-4 text-muted-foreground -translate-y-1/2" />
                        <Input
                            placeholder="user@example.com"
                            className="pl-9"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <Select value={role} onValueChange={setRole}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="viewer">Viewer</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button onClick={handleInvite} disabled={loading}>
                        {loading ? 'Adding...' : 'Add'}
                    </Button>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="font-semibold text-sm">People with access</h4>
                <div className="space-y-3">
                    {users.map((u) => (
                        <div
                            key={u.id}
                            className="flex justify-between items-center bg-white/5 p-3 border border-white/5 rounded-lg"
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex justify-center items-center bg-primary/20 rounded-full w-8 h-8 font-bold text-[10px]">
                                    {u.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-semibold text-xs">
                                        {u.name}{' '}
                                        {u.role === 'owner' && (
                                            <Badge className="ml-1 px-1 h-3 text-[8px]">
                                                Owner
                                            </Badge>
                                        )}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                        {u.email}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {u.role !== 'owner' && (
                                    <>
                                        <Select
                                            value={u.role}
                                            onValueChange={(val) =>
                                                handleUpdateRole(u.id, val)
                                            }
                                        >
                                            <SelectTrigger className="w-[90px] h-7 text-[10px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="viewer">
                                                    Viewer
                                                </SelectItem>
                                                <SelectItem value="editor">
                                                    Editor
                                                </SelectItem>
                                                <SelectItem value="admin">
                                                    Admin
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="w-7 h-7 text-destructive"
                                            onClick={() => handleRemove(u.id)}
                                        >
                                            <X className="w-3 h-3" />
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function Library({ resources }: { resources: Resource[] }) {
    const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [selectedResources, setSelectedResources] = useState<Resource[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isChatMinimized, setIsChatMinimized] = useState(true);

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

    // Management state
    const [manageResource, setManageResource] = useState<Resource | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('preview');

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
        if (mime.includes('image')) return <FileImage className="w-5 h-5" />;
        if (mime.includes('pdf') || mime.includes('text'))
            return <FileText className="w-5 h-5" />;
        if (
            mime.includes('json') ||
            mime.includes('javascript') ||
            mime.includes('typescript')
        )
            return <FileCode2 className="w-5 h-5" />;
        return <File className="w-5 h-5" />;
    };

    const handleManage = async (
        resource: Resource,
        tab: string = 'preview',
    ) => {
        setManageResource(resource);
        setActiveTab(tab);
        if (tab === 'preview') {
            setPreviewUrl(null);
            try {
                const response = await window.axios.get(
                    `/files/preview/${resource.s3_key}`,
                );
                setPreviewUrl(response.data.url);
            } catch (error) {
                console.error('Error fetching preview URL:', error);
            }
        }
    };

    const closeManage = () => {
        setManageResource(null);
        setPreviewUrl(null);
    };

    const handleResourceDelete = async (resourceId: string) => {
        if (
            !confirm(
                'Are you sure you want to delete this resource? This cannot be undone.',
            )
        )
            return;
        try {
            await window.axios.delete(`/resources/${resourceId}`);
            toast.success('Resource deleted successfully');
            closeManage();
            // Refresh page to update resources list
            window.location.reload();
        } catch (error) {
            toast.error('Failed to delete resource');
            console.error('Delete error:', error);
        }
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
        setIsChatMinimized(false);
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

        // Get recent conversation history for memory (last 10 messages)
        const recentMessages = (
            await db.messages
                .where('sessionId')
                .equals(activeSessionId)
                .sortBy('createdAt')
        ).slice(-10);

        try {
            const response = await window.axios.post('/ai/chat', {
                message: userMsg,
                resource_id: resourceId,
                session_id: activeSessionId,
                conversation_history: recentMessages, // Send conversation history
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
        } catch (error: unknown) {
            console.error('AI Chat Error:', error);
            const err = error as {
                response?: {
                    data?: { details?: string; error?: string; message?: string };
                };
                message?: string;
            };
            const serverMessage =
                err.response?.data?.details ??
                err.response?.data?.error ??
                err.response?.data?.message;
            await db.messages.add({
                sessionId: activeSessionId,
                role: 'system',
                content:
                    serverMessage ??
                    err.message ??
                    'Could not reach the AI provider. Check Settings → Chat AI.',
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
        <div className={cn('flex flex-col gap-4 h-full', className)}>
            <div className="flex justify-between items-center px-1">
                <h2 className="flex items-center gap-2 font-bold text-muted-foreground text-xs uppercase tracking-widest">
                    <History className="w-3.5 h-3.5" /> Personal History
                </h2>
            </div>

            <ScrollArea className="flex-1 bg-card/30 shadow-inner backdrop-blur-sm border rounded-2xl h-full overflow-hidden">
                <div className="flex flex-col gap-1 p-2">
                    {sessions.length === 0 ? (
                        <div className="p-8 text-center">
                            <MessageSquare className="opacity-10 mx-auto mb-2 w-8 h-8" />
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
                                    setIsChatMinimized(false);
                                }}
                                className={cn(
                                    'group relative p-3 border border-transparent rounded-xl w-full text-left transition-all',
                                    activeSessionId === s.id
                                        ? 'border-primary/20 bg-primary/10 shadow-sm'
                                        : 'hover:bg-white/5',
                                )}
                            >
                                <div className="pr-6 font-semibold group-hover:text-primary text-xs truncate transition-colors">
                                    {s.title}
                                </div>
                                <div className="flex items-center gap-1 opacity-60 mt-1 text-[9px] text-muted-foreground">
                                    <Clock className="w-2.5 h-2.5" />
                                    {new Date(s.updatedAt).toLocaleTimeString(
                                        [],
                                        { hour: '2-digit', minute: '2-digit' },
                                    )}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="top-1/2 right-2 absolute opacity-0 group-hover:opacity-100 w-5 h-5 hover:text-destructive transition-all -translate-y-1/2"
                                    onClick={(e) => deleteSession(e, s.id!)}
                                >
                                    <Trash2 className="w-3 h-3" />
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

            <div className="relative flex flex-row gap-6 p-6 h-[calc(100vh-160px)]">
                {/* ── Main Library Content ────────────────────────────────── */}
                <div className="flex flex-col flex-1 gap-6 min-h-0 overflow-hidden">
                    <div className="flex flex-row justify-between items-center">
                        <div className="space-y-1">
                            <h2 className="font-bold text-2xl tracking-tight">
                                Resource Library
                            </h2>
                            <p className="opacity-60 font-medium text-muted-foreground text-xs uppercase tracking-widest">
                                Managed multi-tenant storage
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="group relative w-64">
                                <Search className="top-1/2 left-3.5 absolute w-3.5 h-3.5 text-muted-foreground group-focus-within:text-primary transition-colors -translate-y-1/2" />
                                <Input
                                    placeholder="Search library..."
                                    className="bg-background/40 backdrop-blur-sm pl-10 border-white/10 rounded-xl focus:ring-primary/20 h-10"
                                    value={searchQuery}
                                    onChange={(e) =>
                                        setSearchQuery(e.target.value)
                                    }
                                />
                            </div>

                            <Sheet>
                                <SheetTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="bg-background/50 border-white/10 rounded-xl w-10 h-10"
                                    >
                                        <History className="w-4 h-4" />
                                    </Button>
                                </SheetTrigger>
                                <SheetContent className="w-[300px]">
                                    <SheetHeader className="mb-6">
                                        <SheetTitle className="font-bold text-xs uppercase tracking-[0.2em]">
                                            Session Archives
                                        </SheetTitle>
                                    </SheetHeader>
                                    <HistoryList />
                                </SheetContent>
                            </Sheet>

                            {isChatMinimized && (
                                <Button
                                    onClick={() => setIsChatMinimized(false)}
                                    className="gap-2 bg-primary shadow-lg shadow-primary/20 rounded-xl h-10"
                                >
                                    <Bot className="w-4 h-4" />
                                    <span>AI Assistant</span>
                                </Button>
                            )}
                        </div>
                    </div>

                    <ScrollArea className="flex-1 pr-4 h-full">
                        <div className="gap-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                            {filteredResources.map((resource) => {
                                const isSelected = selectedResources.some(
                                    (r) => r.id === resource.id,
                                );
                                return (
                                    <Card
                                        key={resource.id}
                                        className={cn(
                                            'group relative flex flex-col border-2 h-48 overflow-hidden transition-all duration-300',
                                            'cursor-pointer hover:-translate-y-1 hover:shadow-xl',
                                            isSelected
                                                ? 'border-primary/40 bg-primary/5'
                                                : 'border-white/5 bg-card/30 backdrop-blur-md',
                                        )}
                                        onClick={() =>
                                            handleManage(resource, 'preview')
                                        }
                                    >
                                        <div className="top-3 right-3 z-10 absolute flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="secondary"
                                                size="icon"
                                                className="bg-black/40 hover:bg-primary shadow-xl border border-white/10 rounded-lg w-8 h-8 hover:text-white transition-all"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleManage(
                                                        resource,
                                                        'access',
                                                    );
                                                }}
                                                title="Edit Access / Sharing"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </Button>

                                            <Button
                                                variant={
                                                    isSelected
                                                        ? 'default'
                                                        : 'secondary'
                                                }
                                                size="icon"
                                                className={cn(
                                                    'bg-black/40 hover:bg-primary shadow-xl border border-white/10 rounded-lg w-8 h-8 hover:text-white transition-all',
                                                    isSelected &&
                                                        'border-primary bg-primary',
                                                )}
                                                onClick={(e) =>
                                                    toggleContext(e, resource)
                                                }
                                                title="Chat with AI"
                                            >
                                                <Bot className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>

                                        <CardContent className="flex flex-col flex-1 justify-center items-center gap-4 p-6">
                                            <div
                                                className={cn(
                                                    'flex justify-center items-center shadow-lg p-4 rounded-2xl w-16 h-16 group-hover:rotate-3 group-hover:scale-110 transition-all',
                                                    getFileColor(
                                                        resource.mime_type,
                                                    ),
                                                )}
                                            >
                                                {getFileIcon(
                                                    resource.mime_type,
                                                )}
                                            </div>

                                            <div className="w-full text-center">
                                                <h4 className="mb-1 font-bold group-hover:text-primary text-sm truncate transition-colors">
                                                    {resource.original_name}
                                                </h4>
                                                <div className="flex justify-center items-center gap-2">
                                                    <span className="opacity-40 font-bold text-[10px] text-muted-foreground italic uppercase">
                                                        {formatBytes(
                                                            resource.size_bytes,
                                                        )}
                                                    </span>
                                                    <Badge
                                                        variant="outline"
                                                        className="px-1 border-white/10 h-3 text-[8px] text-muted-foreground uppercase"
                                                    >
                                                        {resource.pivot?.role ||
                                                            'VIEWER'}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </ScrollArea>
                </div>

                {/* ── Collapsible AI Chat Sidebar ─────────────────────────── */}
                {!isChatMinimized && (
                    <div className="slide-in-from-right flex w-[380px] h-full animate-in duration-300">
                        <Card className="flex flex-col bg-gradient-to-b from-background/90 to-background/50 shadow-2xl backdrop-blur-2xl border-white/10 rounded-3xl ring-1 ring-white/10 w-full h-full overflow-hidden">
                            <CardHeader className="py-4 border-white/5 border-b">
                                <CardTitle className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="flex justify-center items-center bg-primary/20 rounded-xl w-8 h-8 text-primary">
                                            <Bot className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-sm">
                                                AI Assistant
                                            </h3>
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                                                Active Context
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={clearChat}
                                            className="rounded-lg w-8 h-8 hover:text-destructive"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() =>
                                                setIsChatMinimized(true)
                                            }
                                            className="rounded-lg w-8 h-8"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </CardTitle>
                            </CardHeader>

                            <CardContent className="flex flex-col flex-1 gap-0 p-0 min-h-0 overflow-hidden">
                                <ScrollArea className="flex-1 h-full">
                                    <div className="flex flex-col gap-6 p-4">
                                        {!activeSessionId ? (
                                            <div className="flex flex-col justify-center items-center p-8 h-[400px] text-center">
                                                <MessageSquare className="mb-4 w-8 h-8 text-muted-foreground/20" />
                                                <p className="font-medium text-muted-foreground text-xs">
                                                    Select a resource to begin a
                                                    session.
                                                </p>
                                            </div>
                                        ) : (
                                            messages.map((msg, i) => (
                                                <div
                                                    key={i}
                                                    className={cn(
                                                        'flex flex-col gap-2',
                                                        msg.role === 'user'
                                                            ? 'items-end'
                                                            : 'items-start',
                                                    )}
                                                >
                                                    <div className="opacity-40 px-1 font-bold text-[9px] uppercase tracking-widest">
                                                        {msg.role ===
                                                        'assistant'
                                                            ? 'Intellix'
                                                            : 'You'}
                                                    </div>
                                                    <div
                                                        className={cn(
                                                            'shadow-sm p-3 rounded-2xl max-w-[95%] text-xs leading-relaxed',
                                                            msg.role ===
                                                                'assistant'
                                                                ? 'rounded-tl-none border border-white/10 bg-white/5'
                                                                : 'rounded-tr-none bg-primary text-primary-foreground',
                                                        )}
                                                    >
                                                        <ReactMarkdown
                                                            remarkPlugins={[
                                                                remarkGfm,
                                                                remarkMath,
                                                            ]}
                                                            rehypePlugins={[
                                                                rehypeKatex,
                                                            ]}
                                                        >
                                                            {msg.content}
                                                        </ReactMarkdown>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                        {isTyping && (
                                            <div className="flex flex-col items-start gap-2">
                                                <div className="flex gap-1 bg-white/5 p-3 border border-white/10 rounded-2xl rounded-tl-none">
                                                    <span className="bg-primary rounded-full w-1 h-1 animate-bounce [animation-delay:-0.3s]"></span>
                                                    <span className="bg-primary rounded-full w-1 h-1 animate-bounce [animation-delay:-0.15s]"></span>
                                                    <span className="bg-primary rounded-full w-1 h-1 animate-bounce"></span>
                                                </div>
                                            </div>
                                        )}
                                        <div ref={scrollRef} className="h-2" />
                                    </div>
                                </ScrollArea>

                                <div className="bg-black/20 p-4 border-white/5 border-t">
                                    <div className="relative flex items-center gap-2">
                                        <textarea
                                            placeholder="Ask anything..."
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
                                                    sendMessage();
                                                }
                                            }}
                                            disabled={
                                                !activeSessionId || isTyping
                                            }
                                            className="bg-white/5 disabled:opacity-50 px-3 py-2.5 border border-white/10 rounded-xl outline-none focus:ring-1 focus:ring-primary/40 w-full h-10 text-xs resize-none"
                                        />
                                        <Button
                                            onClick={sendMessage}
                                            size="icon"
                                            disabled={
                                                !input.trim() ||
                                                isTyping ||
                                                !activeSessionId
                                            }
                                            className="bg-primary rounded-xl w-10 h-10 shrink-0"
                                        >
                                            <Send className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>

            {/* ── Resource Management Dialog ─────────────────────────── */}
            <Dialog open={!!manageResource} onOpenChange={closeManage}>
                <DialogContent
                    className={cn(
                        'flex flex-col bg-card p-0 border-white/10 sm:max-w-none overflow-hidden',
                        activeTab === 'preview'
                            ? 'h-[95vh] w-[95vw]'
                            : 'h-[80vh] w-full max-w-4xl',
                    )}
                >
                    {activeTab === 'preview' ? (
                        <div className="flex flex-col flex-1 overflow-hidden">
                            {/* Visually Hidden for Accessibility */}
                            <div className="sr-only">
                                <DialogTitle>
                                    {manageResource?.original_name}
                                </DialogTitle>
                                <DialogDescription>
                                    Previewing document:{' '}
                                    {manageResource?.original_name}
                                </DialogDescription>
                            </div>

                            {/* Standard Top Bar for Preview */}
                            <div className="flex justify-between items-center bg-black/40 p-3 px-6 border-white/5 border-b stretch-0">
                                <div className="flex items-center gap-3">
                                    <div
                                        className={cn(
                                            'p-1.5 rounded-lg',
                                            manageResource &&
                                                getFileColor(
                                                    manageResource.mime_type,
                                                ),
                                        )}
                                    >
                                        {manageResource &&
                                            getFileIcon(
                                                manageResource.mime_type,
                                            )}
                                    </div>
                                    <h3 className="max-w-[500px] font-bold text-white text-sm truncate">
                                        {manageResource?.original_name}
                                    </h3>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={closeManage}
                                    className="hover:bg-white/10 rounded-full w-8 h-8"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="flex-1 w-full min-h-0 overflow-hidden">
                                {previewUrl && manageResource ? (
                                    <FileViewer
                                        isOpen={true}
                                        onClose={closeManage}
                                        url={previewUrl}
                                        mime={manageResource.mime_type}
                                        filename={manageResource.original_name}
                                        inline
                                    />
                                ) : (
                                    <div className="flex justify-center items-center bg-black/20 h-full">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="border-2 border-primary border-t-transparent rounded-full w-8 h-8 animate-spin" />
                                            <p className="text-muted-foreground text-xs animate-pulse">
                                                Loading Secure Preview...
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <>
                            <DialogHeader className="bg-black/20 p-6 border-white/5 border-b shrink-0">
                                <div className="flex items-center gap-4">
                                    <div
                                        className={cn(
                                            'p-3 rounded-xl',
                                            manageResource &&
                                                getFileColor(
                                                    manageResource.mime_type,
                                                ),
                                        )}
                                    >
                                        {manageResource &&
                                            getFileIcon(
                                                manageResource.mime_type,
                                            )}
                                    </div>
                                    <div className="text-left">
                                        <DialogTitle className="font-bold text-xl">
                                            {manageResource?.original_name}
                                        </DialogTitle>
                                        <DialogDescription className="opacity-60 font-bold text-xs uppercase tracking-widest">
                                            Resource Management & Sharing
                                        </DialogDescription>
                                    </div>
                                </div>
                            </DialogHeader>

                            <Tabs
                                value={activeTab}
                                onValueChange={setActiveTab}
                                className="flex flex-col flex-1 w-full overflow-hidden"
                            >
                                <TabsList className="justify-start bg-transparent px-6 border-white/5 border-b rounded-none w-full h-12 shrink-0">
                                    <TabsTrigger
                                        value="access"
                                        className="data-[state=active]:bg-transparent border-transparent data-[state=active]:border-primary border-b-2 rounded-none"
                                    >
                                        Access Management
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="settings"
                                        className="data-[state=active]:bg-transparent border-transparent data-[state=active]:border-primary border-b-2 rounded-none"
                                    >
                                        Settings
                                    </TabsTrigger>
                                </TabsList>

                                <div className="flex-1 p-6 overflow-hidden">
                                    <TabsContent
                                        value="access"
                                        className="mt-0 focus-visible:ring-0 ring-offset-0 h-full overflow-y-auto"
                                    >
                                        {manageResource && (
                                            <AccessManagement
                                                resource={manageResource}
                                            />
                                        )}
                                    </TabsContent>

                                    <TabsContent
                                        value="settings"
                                        className="mt-0 focus-visible:ring-0 ring-offset-0 h-full overflow-y-auto"
                                    >
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center bg-destructive/5 p-4 border border-destructive/20 rounded-xl">
                                                <div>
                                                    <h4 className="font-bold text-destructive text-sm">
                                                        Danger Zone
                                                    </h4>
                                                    <p className="text-[10px] text-muted-foreground">
                                                        Permanently delete this
                                                        resource and all its
                                                        data.
                                                    </p>
                                                </div>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    className="gap-2"
                                                    onClick={() =>
                                                        manageResource &&
                                                        handleResourceDelete(
                                                            manageResource.id,
                                                        )
                                                    }
                                                >
                                                    <Trash className="w-3.5 h-3.5" />
                                                    Delete Resource
                                                </Button>
                                            </div>
                                        </div>
                                    </TabsContent>
                                </div>
                            </Tabs>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

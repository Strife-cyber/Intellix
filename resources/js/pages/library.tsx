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
                <h4 className="text-sm font-semibold">Share with others</h4>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <UserPlus className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                <h4 className="text-sm font-semibold">People with access</h4>
                <div className="space-y-3">
                    {users.map((u) => (
                        <div
                            key={u.id}
                            className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-3"
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold">
                                    {u.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-xs font-semibold">
                                        {u.name}{' '}
                                        {u.role === 'owner' && (
                                            <Badge className="ml-1 h-3 px-1 text-[8px]">
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
                                            <SelectTrigger className="h-7 w-[90px] text-[10px]">
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
                                            className="h-7 w-7 text-destructive"
                                            onClick={() => handleRemove(u.id)}
                                        >
                                            <X className="h-3 w-3" />
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

            <ScrollArea className="h-full flex-1 overflow-hidden rounded-2xl border bg-card/30 shadow-inner backdrop-blur-sm">
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
                                    setIsChatMinimized(false);
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

            <div className="relative flex h-[calc(100vh-160px)] flex-row gap-6 p-6">
                {/* ── Main Library Content ────────────────────────────────── */}
                <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
                    <div className="flex flex-row items-center justify-between">
                        <div className="space-y-1">
                            <h2 className="text-2xl font-bold tracking-tight">
                                Resource Library
                            </h2>
                            <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase opacity-60">
                                Managed multi-tenant storage
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="group relative w-64">
                                <Search className="absolute top-1/2 left-3.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                                <Input
                                    placeholder="Search library..."
                                    className="h-10 rounded-xl border-white/10 bg-background/40 pl-10 backdrop-blur-sm focus:ring-primary/20"
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
                                        className="h-10 w-10 rounded-xl border-white/10 bg-background/50"
                                    >
                                        <History className="h-4 w-4" />
                                    </Button>
                                </SheetTrigger>
                                <SheetContent className="w-[300px]">
                                    <SheetHeader className="mb-6">
                                        <SheetTitle className="text-xs font-bold tracking-[0.2em] uppercase">
                                            Session Archives
                                        </SheetTitle>
                                    </SheetHeader>
                                    <HistoryList />
                                </SheetContent>
                            </Sheet>

                            {isChatMinimized && (
                                <Button
                                    onClick={() => setIsChatMinimized(false)}
                                    className="h-10 gap-2 rounded-xl bg-primary shadow-lg shadow-primary/20"
                                >
                                    <Bot className="h-4 w-4" />
                                    <span>AI Assistant</span>
                                </Button>
                            )}
                        </div>
                    </div>

                    <ScrollArea className="h-full flex-1 pr-4">
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                            {filteredResources.map((resource) => {
                                const isSelected = selectedResources.some(
                                    (r) => r.id === resource.id,
                                );
                                return (
                                    <Card
                                        key={resource.id}
                                        className={cn(
                                            'group relative flex h-48 flex-col overflow-hidden border-2 transition-all duration-300',
                                            'cursor-pointer hover:-translate-y-1 hover:shadow-xl',
                                            isSelected
                                                ? 'border-primary/40 bg-primary/5'
                                                : 'border-white/5 bg-card/30 backdrop-blur-md',
                                        )}
                                        onClick={() =>
                                            handleManage(resource, 'preview')
                                        }
                                    >
                                        <div className="absolute top-3 right-3 z-10 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                                            <Button
                                                variant="secondary"
                                                size="icon"
                                                className="h-8 w-8 rounded-lg border border-white/10 bg-black/40 shadow-xl transition-all hover:bg-primary hover:text-white"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleManage(
                                                        resource,
                                                        'access',
                                                    );
                                                }}
                                                title="Edit Access / Sharing"
                                            >
                                                <Edit2 className="h-3.5 w-3.5" />
                                            </Button>

                                            <Button
                                                variant={
                                                    isSelected
                                                        ? 'default'
                                                        : 'secondary'
                                                }
                                                size="icon"
                                                className={cn(
                                                    'h-8 w-8 rounded-lg border border-white/10 bg-black/40 shadow-xl transition-all hover:bg-primary hover:text-white',
                                                    isSelected &&
                                                        'border-primary bg-primary',
                                                )}
                                                onClick={(e) =>
                                                    toggleContext(e, resource)
                                                }
                                                title="Chat with AI"
                                            >
                                                <Bot className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>

                                        <CardContent className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
                                            <div
                                                className={cn(
                                                    'flex h-16 w-16 items-center justify-center rounded-2xl p-4 shadow-lg transition-all group-hover:scale-110 group-hover:rotate-3',
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
                                                <h4 className="mb-1 truncate text-sm font-bold transition-colors group-hover:text-primary">
                                                    {resource.original_name}
                                                </h4>
                                                <div className="flex items-center justify-center gap-2">
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase italic opacity-40">
                                                        {formatBytes(
                                                            resource.size_bytes,
                                                        )}
                                                    </span>
                                                    <Badge
                                                        variant="outline"
                                                        className="h-3 border-white/10 px-1 text-[8px] text-muted-foreground uppercase"
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
                    <div className="flex h-full w-[380px] animate-in duration-300 slide-in-from-right">
                        <Card className="flex h-full w-full flex-col overflow-hidden rounded-3xl border-white/10 bg-gradient-to-b from-background/90 to-background/50 shadow-2xl ring-1 ring-white/10 backdrop-blur-2xl">
                            <CardHeader className="border-b border-white/5 py-4">
                                <CardTitle className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/20 text-primary">
                                            <Bot className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold">
                                                AI Assistant
                                            </h3>
                                            <p className="text-[10px] tracking-widest text-muted-foreground uppercase">
                                                Active Context
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={clearChat}
                                            className="h-8 w-8 rounded-lg hover:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() =>
                                                setIsChatMinimized(true)
                                            }
                                            className="h-8 w-8 rounded-lg"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardTitle>
                            </CardHeader>

                            <CardContent className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden p-0">
                                <ScrollArea className="h-full flex-1">
                                    <div className="flex flex-col gap-6 p-4">
                                        {!activeSessionId ? (
                                            <div className="flex h-[400px] flex-col items-center justify-center p-8 text-center">
                                                <MessageSquare className="mb-4 h-8 w-8 text-muted-foreground/20" />
                                                <p className="text-xs font-medium text-muted-foreground">
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
                                                    <div className="px-1 text-[9px] font-bold tracking-widest uppercase opacity-40">
                                                        {msg.role ===
                                                        'assistant'
                                                            ? 'Intellix'
                                                            : 'You'}
                                                    </div>
                                                    <div
                                                        className={cn(
                                                            'max-w-[95%] rounded-2xl p-3 text-xs leading-relaxed shadow-sm',
                                                            msg.role ===
                                                                'assistant'
                                                                ? 'rounded-tl-none border border-white/10 bg-white/5'
                                                                : 'rounded-tr-none bg-primary text-primary-foreground',
                                                        )}
                                                    >
                                                        <ReactMarkdown
                                                            remarkPlugins={[
                                                                remarkGfm,
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
                                                <div className="flex gap-1 rounded-2xl rounded-tl-none border border-white/10 bg-white/5 p-3">
                                                    <span className="h-1 w-1 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]"></span>
                                                    <span className="h-1 w-1 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]"></span>
                                                    <span className="h-1 w-1 animate-bounce rounded-full bg-primary"></span>
                                                </div>
                                            </div>
                                        )}
                                        <div ref={scrollRef} className="h-2" />
                                    </div>
                                </ScrollArea>

                                <div className="border-t border-white/5 bg-black/20 p-4">
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
                                            className="h-10 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs outline-none focus:ring-1 focus:ring-primary/40 disabled:opacity-50"
                                        />
                                        <Button
                                            onClick={sendMessage}
                                            size="icon"
                                            disabled={
                                                !input.trim() ||
                                                isTyping ||
                                                !activeSessionId
                                            }
                                            className="h-10 w-10 shrink-0 rounded-xl bg-primary"
                                        >
                                            <Send className="h-4 w-4" />
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
                        'flex flex-col overflow-hidden border-white/10 bg-card p-0 sm:max-w-none',
                        activeTab === 'preview'
                            ? 'h-[95vh] w-[95vw]'
                            : 'h-[80vh] w-full max-w-4xl',
                    )}
                >
                    {activeTab === 'preview' ? (
                        <div className="flex flex-1 flex-col overflow-hidden">
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
                            <div className="stretch-0 flex items-center justify-between border-b border-white/5 bg-black/40 p-3 px-6">
                                <div className="flex items-center gap-3">
                                    <div
                                        className={cn(
                                            'rounded-lg p-1.5',
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
                                    <h3 className="max-w-[500px] truncate text-sm font-bold text-white">
                                        {manageResource?.original_name}
                                    </h3>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={closeManage}
                                    className="h-8 w-8 rounded-full hover:bg-white/10"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="min-h-0 w-full flex-1 overflow-hidden">
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
                                    <div className="flex h-full items-center justify-center bg-black/20">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                            <p className="animate-pulse text-xs text-muted-foreground">
                                                Loading Secure Preview...
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <>
                            <DialogHeader className="shrink-0 border-b border-white/5 bg-black/20 p-6">
                                <div className="flex items-center gap-4">
                                    <div
                                        className={cn(
                                            'rounded-xl p-3',
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
                                        <DialogTitle className="text-xl font-bold">
                                            {manageResource?.original_name}
                                        </DialogTitle>
                                        <DialogDescription className="text-xs font-bold tracking-widest uppercase opacity-60">
                                            Resource Management & Sharing
                                        </DialogDescription>
                                    </div>
                                </div>
                            </DialogHeader>

                            <Tabs
                                value={activeTab}
                                onValueChange={setActiveTab}
                                className="flex w-full flex-1 flex-col overflow-hidden"
                            >
                                <TabsList className="h-12 w-full shrink-0 justify-start rounded-none border-b border-white/5 bg-transparent px-6">
                                    <TabsTrigger
                                        value="access"
                                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                                    >
                                        Access Management
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="settings"
                                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                                    >
                                        Settings
                                    </TabsTrigger>
                                </TabsList>

                                <div className="flex-1 overflow-hidden p-6">
                                    <TabsContent
                                        value="access"
                                        className="mt-0 h-full overflow-y-auto ring-offset-0 focus-visible:ring-0"
                                    >
                                        {manageResource && (
                                            <AccessManagement
                                                resource={manageResource}
                                            />
                                        )}
                                    </TabsContent>

                                    <TabsContent
                                        value="settings"
                                        className="mt-0 h-full overflow-y-auto ring-offset-0 focus-visible:ring-0"
                                    >
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                                                <div>
                                                    <h4 className="text-sm font-bold text-destructive">
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
                                                    <Trash className="h-3.5 w-3.5" />
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

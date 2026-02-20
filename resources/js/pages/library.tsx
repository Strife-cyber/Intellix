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
    Trash2
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
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
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant' | 'system'; content: string }[]>([
        { role: 'assistant', content: 'Hi 👋 Upload a file and I will help you analyze it.' },
    ]);
    const [input, setInput] = useState('');
    const [selectedResources, setSelectedResources] = useState<Resource[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    // Preview state
    const [previewResource, setPreviewResource] = useState<Resource | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return (
            parseFloat((bytes / Math.pow(k, i)).toFixed(2)) +
            ' ' +
            sizes[i]
        );
    };

    const getFileIcon = (mime: string) => {
        if (mime.includes('image'))
            return <FileImage className="h-5 w-5" />;
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
        setPreviewUrl(null); // Reset URL while loading
        setIsLoadingPreview(true);

        try {
            // Using fetch to get the signed URL from our backend
            const response = await fetch(`/files/preview/${resource.s3_key}`);
            if (!response.ok) throw new Error('Failed to fetch preview URL');
            const data = await response.json();
            setPreviewUrl(data.url);
        } catch (error) {
            console.error("Error fetching preview URL:", error);
            // Optionally handle error state
        } finally {
            setIsLoadingPreview(false);
        }
    };

    const closePreview = () => {
        setPreviewResource(null);
        setPreviewUrl(null);
    };

    const toggleContext = (e: React.MouseEvent, resource: Resource) => {
        e.stopPropagation(); // Prevent opening preview

        const alreadySelected = selectedResources.find(
            (r) => r.id === resource.id,
        );

        if (alreadySelected) {
            setSelectedResources((prev) => prev.filter(r => r.id !== resource.id));
        } else {
            setSelectedResources((prev) => [...prev, resource]);
            setMessages((prev) => [
                ...prev,
                { role: 'system', content: `Added "${resource.original_name}" to AI context` },
            ]);
        }
    };

    const sendMessage = async () => {
        if (!input.trim()) return;

        const userMsg = input.trim();
        setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
        setInput('');

        if (selectedResources.length === 0) {
            setMessages((prev) => [...prev, { role: 'assistant', content: "Please select a file to provide context." }]);
            return;
        }

        // For now, we take the first selected resource as context, 
        // consistent with "maintains only the context of the file we choose"
        const resourceId = selectedResources[0].id;

        try {
            const response = await window.axios.post('/ai/chat', {
                message: userMsg,
                resource_id: resourceId
            });

            if (response.data.answer) {
                setMessages((prev) => [...prev, { role: 'assistant', content: response.data.answer }]);
            } else {
                setMessages((prev) => [...prev, { role: 'assistant', content: "I couldn't generate a response." }]);
            }

        } catch (error) {
            console.error("AI Chat Error:", error);
            setMessages((prev) => [...prev, { role: 'system', content: "Sorry, I encountered an error while processing your request." }]);
        }
    };

    const clearChat = () => {
        setMessages([{ role: 'assistant', content: 'Chat history cleared. How can I help you further?' }]);
    };

    const getFileColor = (mime: string) => {
        if (mime.includes('image')) return 'text-purple-600 bg-purple-100 dark:bg-purple-900/20';
        if (mime.includes('pdf')) return 'text-red-600 bg-red-100 dark:bg-red-900/20';
        if (mime.includes('sheet') || mime.includes('excel')) return 'text-green-600 bg-green-100 dark:bg-green-900/20';
        if (mime.includes('presentation')) return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20';
        if (mime.includes('text') || mime.includes('code') || mime.includes('json')) return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
        return 'text-gray-600 bg-gray-100 dark:bg-gray-800';
    };

    const getFileExtension = (mime: string, filename: string) => {
        const ext = filename.split('.').pop();
        if (ext && ext.length < 5) return ext.toUpperCase();
        if (mime.includes('pdf')) return 'PDF';
        if (mime.includes('image')) return 'IMG';
        if (mime.includes('sheet') || mime.includes('excel')) return 'XLSX';
        if (mime.includes('word') || mime.includes('document')) return 'DOCX';
        return 'FILE';
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Library" />

            <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-2">
                {/* LEFT SIDE — RESOURCE GRID */}
                <div className="flex h-full flex-col gap-4 overflow-y-auto rounded-xl p-4">
                    <h1 className="text-xl font-bold">
                        My Library
                    </h1>
                    <p className="text-xs text-muted-foreground">
                        Tap a file to view it. Use the checkbox to add to AI context.
                    </p>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {resources.map((resource) => {
                            const isSelected =
                                selectedResources.some(
                                    (r) =>
                                        r.id === resource.id,
                                );

                            return (
                                <Card
                                    key={resource.id}
                                    onClick={() => handlePreview(resource)}
                                    className={cn(
                                        'group cursor-pointer transition-all duration-200 border-2 relative overflow-hidden',
                                        'hover:shadow-md hover:border-primary/50',
                                        isSelected
                                            ? 'border-primary ring-1 ring-primary/20 bg-primary/5'
                                            : 'border-transparent bg-card shadow-sm'
                                    )}
                                >
                                    {/* Selection Toggle */}
                                    <div className="absolute top-2 right-2 z-10">
                                        <Button
                                            size="icon"
                                            variant={isSelected ? "default" : "secondary"}
                                            className={cn(
                                                "h-7 w-7 rounded-full shadow-sm transition-all duration-200",
                                                isSelected
                                                    ? "opacity-100 scale-100"
                                                    : "opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100"
                                            )}
                                            onClick={(e) => toggleContext(e, resource)}
                                        >
                                            {isSelected ? (
                                                <Check className="h-3.5 w-3.5" />
                                            ) : (
                                                <Plus className="h-3.5 w-3.5" />
                                            )}
                                        </Button>
                                    </div>

                                    <div className="flex items-start gap-4 p-4">
                                        <div className={cn(
                                            "rounded-xl p-3 flex items-center justify-center transition-colors",
                                            getFileColor(resource.mime_type)
                                        )}>
                                            {getFileIcon(resource.mime_type)}
                                        </div>

                                        <div className="flex flex-1 flex-col min-w-0 gap-1">
                                            <span className="truncate text-sm font-semibold text-foreground/90">
                                                {resource.original_name}
                                            </span>

                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider">
                                                    {getFileExtension(resource.mime_type, resource.original_name)}
                                                </span>
                                                <span>•</span>
                                                <span>{formatBytes(resource.size_bytes)}</span>
                                            </div>

                                            <div className="mt-2 flex items-center justify-between border-t pt-2">
                                                <span className="text-[10px] text-muted-foreground">
                                                    {new Date(resource.created_at).toLocaleDateString(undefined, {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric'
                                                    })}
                                                </span>
                                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                                    {resource.pivot.role}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </div>

                {/* RIGHT SIDE — AI CHAT */}
                <Card className="flex h-full max-h-[80vh] flex-col rounded-2xl border bg-background/60 shadow-xl backdrop-blur">
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center justify-between text-lg font-semibold tracking-tight">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-primary" />
                                AI Assistant
                            </div>
                            {messages.length > 1 && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                    onClick={clearChat}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </CardTitle>
                        <CardDescription className="text-sm text-muted-foreground">
                            Ask questions about your selected files.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="flex flex-1 flex-col gap-4 overflow-hidden">

                        {/* Selected Context Preview */}
                        {selectedResources.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {selectedResources.map((res) => (
                                    <span
                                        key={res.id}
                                        className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                                    >
                                        {res.original_name}
                                        <button
                                            onClick={(e) => toggleContext(e as any, res)}
                                            className="ml-1 transition-colors hover:text-destructive"
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Messages */}
                        <div className="relative flex-1 overflow-hidden rounded-xl border bg-muted/20">
                            <ScrollArea className="h-full">
                                <div className="flex flex-col gap-4 p-4">
                                    {messages.map((msg, i) => (
                                        <div
                                            key={i}
                                            className={cn(
                                                "flex w-full flex-col gap-1.5",
                                                msg.role === 'user' ? "items-end" : "items-start"
                                            )}
                                        >
                                            <div className="flex items-center gap-2 px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                                {msg.role === 'assistant' ? (
                                                    <><Bot className="h-3 w-3" /> Assistant</>
                                                ) : msg.role === 'user' ? (
                                                    <><User className="h-3 w-3" /> You</>
                                                ) : (
                                                    <>System</>
                                                )}
                                            </div>
                                            <div
                                                className={cn(
                                                    "max-w-[90%] rounded-2xl px-4 py-2.5 text-sm transition-all duration-200",
                                                    msg.role === 'assistant'
                                                        ? "bg-background border shadow-sm text-foreground rounded-tl-none"
                                                        : msg.role === 'user'
                                                            ? "bg-primary text-primary-foreground shadow-md rounded-tr-none"
                                                            : "mx-auto bg-muted/50 text-muted-foreground text-[11px] italic rounded-lg border-none"
                                                )}
                                            >
                                                {msg.content}
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={scrollRef} />
                                </div>
                            </ScrollArea>
                        </div>

                        {/* Input */}
                        <div className="flex items-center gap-2 border-t pt-3">
                            <Input
                                placeholder={
                                    selectedResources.length === 0
                                        ? "Select a file to start chatting..."
                                        : "Ask anything about your files..."
                                }
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                                disabled={
                                    selectedResources.length === 0 && messages.length <= 1
                                }
                                className="flex-1"
                            />
                            <Button
                                onClick={sendMessage}
                                size="icon"
                                disabled={!input.trim()}
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
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

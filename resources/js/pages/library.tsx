import { Head, router } from '@inertiajs/react';
import {
    Send,
    Sparkles,
    FileText,
    FileImage,
    FileCode2,
    File,
} from 'lucide-react';
import { useState } from 'react';
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
    const [messages, setMessages] = useState<string[]>([
        'Hi 👋 Upload a file and I will help you analyze it.',
    ]);
    const [input, setInput] = useState('');
    const [selectedResources, setSelectedResources] = useState<Resource[]>([]);

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

    const getFilePreviewUrl = async (path: string) => {
        const url = await router.get(`/files/preview/${path}`)
    }

    const addToContext = (resource: Resource) => {
        const alreadySelected = selectedResources.find(
            (r) => r.id === resource.id,
        );
        if (alreadySelected) return;

        setSelectedResources((prev) => [...prev, resource]);

        setMessages((prev) => [
            ...prev,
            `📎 Added "${resource.original_name}" to AI context`,
        ]);
    };

    const sendMessage = () => {
        if (!input) return;
        setMessages((prev) => [...prev, input]);
        setInput('');
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
                        Click a file to include it in AI chat context.
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
                                    onClick={() =>
                                        addToContext(resource)
                                    }
                                    className={cn(
                                        'cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg',
                                        isSelected &&
                                        'ring-2 ring-primary',
                                    )}
                                >
                                    <CardContent className="flex items-start gap-3 p-4">
                                        <div className="rounded-lg bg-muted p-2">
                                            {getFileIcon(
                                                resource.mime_type,
                                            )}
                                        </div>

                                        <div className="flex flex-1 flex-col">
                                            <span className="truncate text-sm font-medium">
                                                {
                                                    resource.original_name
                                                }
                                            </span>

                                            <span className="text-xs text-muted-foreground">
                                                {formatBytes(
                                                    resource.size_bytes,
                                                )}
                                            </span>

                                            <span className="text-xs text-muted-foreground">
                                                {new Date(
                                                    resource.created_at,
                                                ).toLocaleDateString()}
                                            </span>

                                            <span className="mt-1 text-[10px] uppercase text-primary">
                                                {
                                                    resource.pivot
                                                        .role
                                                }
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>

                {/* RIGHT SIDE — AI CHAT */}
                <Card className="flex h-full flex-col rounded-2xl border bg-background/60 shadow-xl backdrop-blur">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <Sparkles className="h-5 w-5" /> AI Assistant
                        </CardTitle>
                        <CardDescription>
                            Ask questions about your uploaded
                            files.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="flex flex-1 flex-col gap-4">
                        {/* Selected Context Preview */}
                        {selectedResources.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {selectedResources.map(
                                    (res) => (
                                        <span
                                            key={res.id}
                                            className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary"
                                        >
                                            {res.original_name}
                                        </span>
                                    ),
                                )}
                            </div>
                        )}

                        <ScrollArea className="flex-1 pr-4">
                            <div className="space-y-3">
                                {messages.map((msg, i) => (
                                    <div
                                        key={i}
                                        className={cn(
                                            'w-fit max-w-[85%] rounded-xl px-4 py-2 text-sm',
                                            i % 2 === 0
                                                ? 'bg-muted'
                                                : 'ml-auto bg-primary text-primary-foreground',
                                        )}
                                    >
                                        {msg}
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>

                        <div className="flex gap-2">
                            <Input
                                placeholder="Ask anything about your files..."
                                value={input}
                                onChange={(e) =>
                                    setInput(
                                        e.target.value,
                                    )
                                }
                                onKeyDown={(e) =>
                                    e.key === 'Enter' &&
                                    sendMessage()
                                }
                            />
                            <Button
                                onClick={sendMessage}
                                size="icon"
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

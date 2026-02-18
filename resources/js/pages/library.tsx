import { Head } from '@inertiajs/react';
import { Send, Sparkles } from 'lucide-react';
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

export default function Library({ resources }: { resources: Resource[]}) {
    const [messages, setMessages] = useState<string[]>([
        'Hi 👋 Upload a file and I will help you analyze it.',
    ]);
    const [input, setInput] = useState('');

    const sendMessage = () => {
        if (!input) return;
        setMessages((prev) => [...prev, input]);
        setInput('');
    };

    console.log(resources[0])

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Library" />
            <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                    <h1 className="text-xl font-bold">My Library</h1>
                    <p className="text-xs">
                        Manage your uploaded materials and AI-indexed study
                        resources.
                    </p>
                </div>

                <Card className="flex h-full flex-col rounded-2xl border bg-background/60 shadow-xl backdrop-blur">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <Sparkles className="h-5 w-5" /> AI Assistant
                        </CardTitle>
                        <CardDescription>
                            Ask questions about your uploaded files.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="flex flex-1 flex-col gap-4">
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
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) =>
                                    e.key === 'Enter' && sendMessage()
                                }
                            />
                            <Button onClick={sendMessage} size="icon">
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

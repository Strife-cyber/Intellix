import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Trash2, MessageSquare, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export default function AiChat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const breadcrumbs = [
        {
            title: 'Ask AI',
            href: '/ai/chat',
        },
    ];

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isLoading]);

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { role: 'user', content: input };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        try {
            const response = await axios.post(route('ai.chat'), {
                message: input,
                conversation_history: messages,
            });

            const assistantMessage: Message = {
                role: 'assistant',
                content: response.data.answer,
            };
            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error: any) {
            console.error('AI Chat Error:', error);
            const errorMessage: Message = {
                role: 'assistant',
                content: `Error: ${error.response?.data?.details || 'Something went wrong. Please try again later.'}`,
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const clearChat = () => {
        setMessages([]);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Ask AI - Intellix" />

            <div className="flex flex-col p-4 md:p-6 h-[calc(100vh-140px)] max-w-5xl mx-auto w-full">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Ask AI</h1>
                        <p className="text-sm text-muted-foreground">General assistant for your studies and questions.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={clearChat} disabled={messages.length === 0} className="gap-2">
                        <Trash2 className="w-4 h-4" />
                        Clear Chat
                    </Button>
                </div>

                <Card className="flex flex-col flex-1 overflow-hidden bg-background/50 backdrop-blur-sm border-white/10 shadow-xl rounded-2xl">
                    <ScrollArea className="flex-1 p-4 md:p-6">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-[400px] text-center space-y-4">
                                <div className="p-4 bg-primary/10 rounded-full">
                                    <Sparkles className="w-8 h-8 text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold">How can I help you today?</h3>
                                    <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                                        Ask me anything about your courses, general knowledge, or help with your studies.
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
                                    {[
                                        "Explain quantum entanglement simply",
                                        "Help me structure a study plan",
                                        "How do I write a good conclusion?",
                                        "Summarize the main points of my last note"
                                    ].map((suggestion) => (
                                        <button
                                            key={suggestion}
                                            onClick={() => setInput(suggestion)}
                                            className="text-xs p-3 text-left bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-colors"
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {messages.map((msg, index) => (
                                    <div
                                        key={index}
                                        className={cn(
                                            "flex gap-4 max-w-[85%] md:max-w-[80%]",
                                            msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                                            msg.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground border border-white/10"
                                        )}>
                                            {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                        </div>
                                        <div className={cn(
                                            "flex flex-col space-y-1",
                                            msg.role === 'user' ? "items-end" : "items-start"
                                        )}>
                                            <div className="text-[10px] font-bold uppercase tracking-widest opacity-50 px-1">
                                                {msg.role === 'user' ? 'You' : 'Intellix AI'}
                                            </div>
                                            <div className={cn(
                                                "p-3 md:p-4 rounded-2xl text-sm leading-relaxed shadow-sm",
                                                msg.role === 'user' 
                                                    ? "bg-primary text-primary-foreground rounded-tr-none" 
                                                    : "bg-white/5 border border-white/10 rounded-tl-none prose prose-invert max-w-none"
                                            )}>
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkGfm, remarkMath]}
                                                    rehypePlugins={[rehypeKatex]}
                                                >
                                                    {msg.content}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="flex gap-4 mr-auto">
                                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 border border-white/10">
                                            <Bot className="w-4 h-4 text-muted-foreground" />
                                        </div>
                                        <div className="flex flex-col space-y-1">
                                            <div className="text-[10px] font-bold uppercase tracking-widest opacity-50 px-1">
                                                Intellix AI
                                            </div>
                                            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl rounded-tl-none">
                                                <div className="flex gap-1">
                                                    <span className="bg-primary/50 rounded-full w-1.5 h-1.5 animate-bounce [animation-delay:-0.3s]"></span>
                                                    <span className="bg-primary/50 rounded-full w-1.5 h-1.5 animate-bounce [animation-delay:-0.15s]"></span>
                                                    <span className="bg-primary/50 rounded-full w-1.5 h-1.5 animate-bounce"></span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={scrollRef} className="h-4" />
                            </div>
                        )}
                    </ScrollArea>

                    <div className="p-4 border-t border-white/10 bg-black/20">
                        <div className="relative flex items-center gap-2">
                            <textarea
                                placeholder="Type your message..."
                                rows={1}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        sendMessage();
                                    }
                                }}
                                disabled={isLoading}
                                className="bg-white/5 disabled:opacity-50 px-4 py-3 border border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 w-full min-h-[50px] max-h-[200px] text-sm resize-none transition-all"
                            />
                            <Button
                                onClick={sendMessage}
                                size="icon"
                                disabled={!input.trim() || isLoading}
                                className={cn(
                                    "rounded-xl w-12 h-12 shrink-0 transition-all",
                                    input.trim() ? "bg-primary scale-100" : "bg-muted scale-95"
                                )}
                            >
                                <Send className="w-5 h-5" />
                            </Button>
                        </div>
                        <p className="mt-2 text-[10px] text-center text-muted-foreground">
                            AI can make mistakes. Check important info.
                        </p>
                    </div>
                </Card>
            </div>
        </AppLayout>
    );
}

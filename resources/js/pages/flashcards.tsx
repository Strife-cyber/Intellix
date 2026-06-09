import { Head } from '@inertiajs/react';
import {
    BookOpen,
    Brain,
    Check,
    ChevronLeft,
    ChevronRight,
    Edit2,
    Eye,
    EyeOff,
    Loader2,
    Plus,
    RefreshCw,
    Sparkles,
    Star,
    Trash2,
    X,
    Zap,
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { flashcards as flashcardsRoute } from '@/routes';
import type { BreadcrumbItem, Resource } from '@/types';

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface FlashCard {
    id: number;
    resource_id: string;
    front: string;
    back: string;
    interval_days: number;
    stability: number | null;
    difficulty: number | null;
    next_review: string | null;
    last_reviewed_at: string | null;
    created_at: string;
}

interface ApiResponse {
    data: FlashCard[];
    can_edit: boolean;
}

type ReviewRating = 1 | 2 | 3 | 4;

/* ─── Breadcrumbs ────────────────────────────────────────────────────────── */
const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Flashcards', href: flashcardsRoute().url },
];

/* ─── Rating config ──────────────────────────────────────────────────────── */
const RATINGS: {
    label: string;
    value: ReviewRating;
    color: string;
    icon: React.ReactNode;
}[] = [
    {
        label: 'Again',
        value: 1,
        color: 'bg-red-500/20   border-red-500/40   text-red-400   hover:bg-red-500/30',
        icon: <RefreshCw className="h-4 w-4" />,
    },
    {
        label: 'Hard',
        value: 2,
        color: 'bg-orange-500/20 border-orange-500/40 text-orange-400 hover:bg-orange-500/30',
        icon: <Brain className="h-4 w-4" />,
    },
    {
        label: 'Good',
        value: 3,
        color: 'bg-green-500/20  border-green-500/40  text-green-400  hover:bg-green-500/30',
        icon: <Check className="h-4 w-4" />,
    },
    {
        label: 'Easy',
        value: 4,
        color: 'bg-blue-500/20   border-blue-500/40   text-blue-400   hover:bg-blue-500/30',
        icon: <Star className="h-4 w-4" />,
    },
];

/* ═══════════════════════════════════════════════════════════════════════════
   Main Page
═══════════════════════════════════════════════════════════════════════════ */
export default function Flashcards({ resources }: { resources?: Resource[] }) {
    const [selectedResource, setSelectedResource] = useState<Resource | null>(
        null,
    );
    const [cards, setCards] = useState<FlashCard[]>([]);
    const [canEdit, setCanEdit] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // UI modes
    const [mode, setMode] = useState<'list' | 'review'>('list');

    /* ── Load cards when a resource is selected ── */
    const loadCards = useCallback(async (resource: Resource) => {
        setLoading(true);
        setError(null);
        try {
            const res = await window.axios.get<ApiResponse>('/flashcards', {
                params: { resource_id: resource.id },
            });
            setCards(res.data.data);
            setCanEdit(res.data.can_edit);
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            setError(
                e?.response?.data?.message ?? 'Failed to load flashcards.',
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (selectedResource) {
            void loadCards(selectedResource);
        }
    }, [selectedResource, loadCards]);

    const handleSelectResource = (resource: Resource) => {
        setSelectedResource(resource);
        setMode('list');
        setCards([]);
    };

    /* ── Due cards for review ── */
    // Due cards for review
    const dueCards = (cards ?? []).filter((c) => {
        if (!c.next_review) return false;
        return new Date(c.next_review) <= new Date();
    });

    /* ─────────────────────────────────────────────────────────────────────── */
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Flashcards — Intellix" />

            <div className="flex h-[calc(100vh-160px)] gap-6 p-4">
                {/* ── LEFT: Resource selector ── */}
                <div className="flex w-72 flex-shrink-0 flex-col gap-4">
                    <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-primary" />
                        <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                            Resources
                        </h2>
                    </div>

                    <ScrollArea className="flex-1 rounded-2xl border border-white/10 bg-card/30 backdrop-blur-sm">
                        <div className="flex flex-col gap-1 p-2">
                            {!resources || resources.length === 0 ? (
                                <div className="p-8 text-center text-xs text-muted-foreground italic">
                                    No resources yet. Upload a file first.
                                </div>
                            ) : (
                                resources.map((r) => (
                                    <button
                                        key={r.id}
                                        onClick={() => handleSelectResource(r)}
                                        className={cn(
                                            'group w-full rounded-xl border border-transparent p-3 text-left transition-all',
                                            selectedResource?.id === r.id
                                                ? 'border-primary/30 bg-primary/10 text-primary'
                                                : 'hover:bg-white/5 hover:text-primary',
                                        )}
                                    >
                                        <div className="truncate text-xs font-semibold">
                                            {r.original_name}
                                        </div>
                                        <div className="mt-0.5 text-[10px] text-muted-foreground opacity-60">
                                            {(
                                                (r.size_bytes ?? 0) / 1024
                                            ).toFixed(0)}{' '}
                                            KB
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </div>

                {/* ── RIGHT: Card panel ── */}
                <div className="flex flex-1 flex-col gap-4 overflow-hidden">
                    {!selectedResource ? (
                        <EmptyState />
                    ) : (
                        <>
                            {/* Header */}
                            <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h1 className="text-lg font-bold">
                                        {selectedResource.original_name}
                                    </h1>
                                    <p className="text-xs text-muted-foreground">
                                        {(cards ?? []).length} card
                                        {(cards ?? []).length !== 1 ? 's' : ''}
                                        {(dueCards ?? []).length > 0 && (
                                            <span className="ml-2 font-semibold text-amber-400">
                                                · {(dueCards ?? []).length} due
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {(dueCards ?? []).length > 0 &&
                                        mode === 'list' && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="gap-1.5 border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                                                onClick={() =>
                                                    setMode('review')
                                                }
                                            >
                                                <Zap className="h-3.5 w-3.5" />
                                                Review {(dueCards ?? []).length}
                                            </Button>
                                        )}
                                    {mode === 'review' && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setMode('list')}
                                        >
                                            <X className="mr-1 h-3.5 w-3.5" />{' '}
                                            Exit Review
                                        </Button>
                                    )}
                                    {canEdit && mode === 'list' && (
                                        <>
                                            <GenerateButton
                                                resource={selectedResource}
                                                onGenerated={(newCards) => {
                                                    setCards((prev) => [
                                                        ...prev,
                                                        ...newCards,
                                                    ]);
                                                }}
                                            />
                                            <CreateCardButton
                                                resource={selectedResource}
                                                onCreated={(card) =>
                                                    setCards((prev) => [
                                                        ...prev,
                                                        card,
                                                    ])
                                                }
                                            />
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Content */}
                            {loading ? (
                                <div className="flex flex-1 items-center justify-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                                </div>
                            ) : error ? (
                                <div className="flex flex-1 items-center justify-center">
                                    <p className="text-sm text-destructive">
                                        {error}
                                    </p>
                                </div>
                            ) : mode === 'review' ? (
                                <ReviewMode
                                    cards={dueCards}
                                    onExit={() => {
                                        setMode('list');
                                        void loadCards(selectedResource);
                                    }}
                                />
                            ) : (
                                <CardListPanel
                                    cards={cards}
                                    canEdit={canEdit}
                                    onUpdate={(updated) =>
                                        setCards((prev) =>
                                            prev.map((c) =>
                                                c.id === updated.id
                                                    ? updated
                                                    : c,
                                            ),
                                        )
                                    }
                                    onDelete={(id) =>
                                        setCards((prev) =>
                                            prev.filter((c) => c.id !== id),
                                        )
                                    }
                                />
                            )}
                        </>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Empty State
═══════════════════════════════════════════════════════════════════════════ */
function EmptyState() {
    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <div className="relative">
                <div className="absolute -inset-6 animate-pulse rounded-full bg-primary/10 blur-2xl" />
                <Brain className="relative h-14 w-14 text-primary/60" />
            </div>
            <h2 className="text-xl font-bold">Active Learning</h2>
            <p className="max-w-xs text-sm text-muted-foreground">
                Select a resource from the left to manage its flashcards,
                generate new cards with AI, or start a review session.
            </p>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Card List Panel
═══════════════════════════════════════════════════════════════════════════ */
function CardListPanel({
    cards,
    canEdit,
    onUpdate,
    onDelete,
}: {
    cards: FlashCard[];
    canEdit: boolean;
    onUpdate: (card: FlashCard) => void;
    onDelete: (id: number) => void;
}) {
    const [editingCard, setEditingCard] = useState<FlashCard | null>(null);

    if ((cards ?? []).length === 0) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 text-center">
                <BookOpen className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                    No flashcards yet.
                </p>
                {canEdit && (
                    <p className="text-xs text-muted-foreground/60">
                        Use "Generate with AI" or add cards manually.
                    </p>
                )}
            </div>
        );
    }

    return (
        <>
            <ScrollArea className="flex-1">
                <div className="grid grid-cols-1 gap-3 pr-2 sm:grid-cols-2 xl:grid-cols-3">
                    {cards.map((card) => (
                        <CardTile
                            key={card.id}
                            card={card}
                            canEdit={canEdit}
                            onEdit={() => setEditingCard(card)}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            </ScrollArea>

            {/* Edit modal */}
            {editingCard && (
                <EditCardDialog
                    card={editingCard}
                    onClose={() => setEditingCard(null)}
                    onSaved={(updated) => {
                        onUpdate(updated);
                        setEditingCard(null);
                    }}
                />
            )}
        </>
    );
}

/* ─── Individual Card Tile ─────────────────────────────────────────────── */
function CardTile({
    card,
    canEdit,
    onEdit,
    onDelete,
}: {
    card: FlashCard;
    canEdit: boolean;
    onEdit: () => void;
    onDelete: (id: number) => void;
}) {
    const [flipped, setFlipped] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const isDue = card?.next_review
        ? new Date(card.next_review) <= new Date()
        : false;

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await window.axios.delete(`/flashcards/${card.id}`);
            onDelete(card.id);
        } catch {
            setDeleting(false);
            setConfirmDelete(false);
        }
    };

    return (
        <div
            className={cn(
                'group relative flex min-h-[160px] cursor-pointer flex-col overflow-hidden rounded-2xl border p-4 transition-all duration-300',
                'bg-card/40 backdrop-blur-sm hover:-translate-y-0.5 hover:shadow-lg',
                flipped
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-white/8 hover:border-white/15',
            )}
            onClick={() => setFlipped((f) => !f)}
        >
            {/* Status badges */}
            <div className="mb-2 flex items-center gap-1.5">
                <Badge
                    variant="outline"
                    className="h-4 border-white/10 px-1.5 text-[9px] font-bold uppercase"
                >
                    {flipped ? 'Back' : 'Front'}
                </Badge>
                {isDue && (
                    <Badge className="h-4 border-0 bg-amber-500/20 px-1.5 text-[9px] font-bold text-amber-400 uppercase">
                        Due
                    </Badge>
                )}
                {card.interval_days > 0 && (
                    <Badge
                        variant="outline"
                        className="h-4 border-white/10 px-1.5 text-[9px] font-bold text-muted-foreground uppercase"
                    >
                        {card.interval_days}d
                    </Badge>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 text-sm leading-relaxed">
                {flipped ? card.back : card.front}
            </div>

            {/* Flip indicator */}
            <div className="mt-3 flex items-center gap-1 text-[10px] text-muted-foreground/40">
                {flipped ? (
                    <EyeOff className="h-3 w-3" />
                ) : (
                    <Eye className="h-3 w-3" />
                )}
                Click to {flipped ? 'show front' : 'reveal back'}
            </div>

            {/* Action buttons */}
            {canEdit && (
                <div
                    className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                >
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 rounded-lg hover:bg-primary/20 hover:text-primary"
                        onClick={onEdit}
                    >
                        <Edit2 className="h-3 w-3" />
                    </Button>

                    {confirmDelete ? (
                        <div className="flex gap-1">
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 rounded-lg hover:bg-destructive/20 hover:text-destructive"
                                onClick={handleDelete}
                                disabled={deleting}
                            >
                                {deleting ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                    <Check className="h-3 w-3" />
                                )}
                            </Button>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 rounded-lg"
                                onClick={() => setConfirmDelete(false)}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </div>
                    ) : (
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 rounded-lg hover:bg-destructive/20 hover:text-destructive"
                            onClick={() => setConfirmDelete(true)}
                        >
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Edit Card Dialog
═══════════════════════════════════════════════════════════════════════════ */
function EditCardDialog({
    card,
    onClose,
    onSaved,
}: {
    card: FlashCard;
    onClose: () => void;
    onSaved: (card: FlashCard) => void;
}) {
    const [front, setFront] = useState(card.front);
    const [back, setBack] = useState(card.back);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        if (!front.trim() || !back.trim()) return;
        setSaving(true);
        setError(null);
        try {
            const res = await window.axios.put<{ data: FlashCard }>(
                `/flashcards/${card.id}`,
                { front: front.trim(), back: back.trim() },
            );
            onSaved(res.data.data);
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            setError(e?.response?.data?.message ?? 'Save failed.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-lg rounded-2xl border border-white/10 bg-background/95 p-6 backdrop-blur-xl">
                <DialogHeader>
                    <DialogTitle className="mb-4 text-sm font-bold tracking-widest text-muted-foreground uppercase">
                        Edit Flashcard
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Update the question and answer for this flashcard.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-3">
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase">
                            Front (Question / Term)
                        </label>
                        <textarea
                            className="min-h-[80px] w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/30"
                            value={front}
                            onChange={(e) => setFront(e.target.value)}
                            maxLength={2000}
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase">
                            Back (Answer / Definition)
                        </label>
                        <textarea
                            className="min-h-[100px] w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/30"
                            value={back}
                            onChange={(e) => setBack(e.target.value)}
                            maxLength={2000}
                        />
                    </div>
                    {error && (
                        <p className="text-xs text-destructive">{error}</p>
                    )}
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={saving || !front.trim() || !back.trim()}
                        >
                            {saving ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            Save
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Create Card Button + Inline Form
═══════════════════════════════════════════════════════════════════════════ */
function CreateCardButton({
    resource,
    onCreated,
}: {
    resource: Resource;
    onCreated: (card: FlashCard) => void;
}) {
    const [open, setOpen] = useState(false);
    const [front, setFront] = useState('');
    const [back, setBack] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCreate = async () => {
        if (!front.trim() || !back.trim()) return;
        setSaving(true);
        setError(null);
        try {
            const res = await window.axios.post<{ data: FlashCard }>(
                '/flashcards',
                {
                    resource_id: resource.id,
                    front: front.trim(),
                    back: back.trim(),
                },
            );
            onCreated(res.data.data);
            setFront('');
            setBack('');
            setOpen(false);
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            setError(e?.response?.data?.message ?? 'Create failed.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> Add Card
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-lg rounded-2xl border border-white/10 bg-background/95 p-6 backdrop-blur-xl">
                    <DialogHeader>
                        <DialogTitle className="mb-4 text-sm font-bold tracking-widest text-muted-foreground uppercase">
                            New Flashcard
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Add a new manual flashcard to this resource.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-3">
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase">
                                Front
                            </label>
                            <textarea
                                className="min-h-[80px] w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/30"
                                placeholder="Question or term..."
                                value={front}
                                onChange={(e) => setFront(e.target.value)}
                                maxLength={2000}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase">
                                Back
                            </label>
                            <textarea
                                className="min-h-[100px] w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/30"
                                placeholder="Answer or definition..."
                                value={back}
                                onChange={(e) => setBack(e.target.value)}
                                maxLength={2000}
                            />
                        </div>
                        {error && (
                            <p className="text-xs text-destructive">{error}</p>
                        )}
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="ghost"
                                onClick={() => setOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreate}
                                disabled={
                                    saving || !front.trim() || !back.trim()
                                }
                            >
                                {saving ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Plus className="mr-2 h-4 w-4" />
                                )}
                                Create
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Generate Button
═══════════════════════════════════════════════════════════════════════════ */
function GenerateButton({
    resource,
    onGenerated,
}: {
    resource: Resource;
    onGenerated: (cards: FlashCard[]) => void;
}) {
    const [open, setOpen] = useState(false);
    const [count, setCount] = useState('10');
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        setGenerating(true);
        setError(null);
        try {
            const res = await window.axios.post<{ data: FlashCard[] }>(
                `/resources/${resource.id}/flashcards/generate`,
                { count: parseInt(count, 10) || 10 },
            );
            onGenerated(res.data.data);
            setOpen(false);
        } catch (err: unknown) {
            const e = err as {
                response?: { data?: { error?: string; message?: string } };
            };
            setError(
                e?.response?.data?.error ??
                    e?.response?.data?.message ??
                    'Generation failed. Ensure the resource has been processed.',
            );
        } finally {
            setGenerating(false);
        }
    };

    return (
        <>
            <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                onClick={() => setOpen(true)}
            >
                <Sparkles className="h-3.5 w-3.5" />
                Generate with AI
            </Button>

            <Dialog
                open={open}
                onOpenChange={(v) => {
                    if (!generating) setOpen(v);
                }}
            >
                <DialogContent className="max-w-sm rounded-2xl border border-white/10 bg-background/95 p-6 backdrop-blur-xl">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/20">
                            <Sparkles className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <DialogTitle className="text-sm font-bold">
                                Generate Flashcards
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                                AI will extract key concepts
                            </DialogDescription>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-muted-foreground uppercase">
                                Number of cards
                            </label>
                            <Input
                                type="number"
                                min={1}
                                max={50}
                                value={count}
                                onChange={(e) => setCount(e.target.value)}
                                className="h-10 rounded-xl border-white/10 bg-white/5"
                            />
                        </div>
                        {error && (
                            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
                                {error}
                            </p>
                        )}
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="ghost"
                                onClick={() => setOpen(false)}
                                disabled={generating}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleGenerate}
                                disabled={generating}
                            >
                                {generating ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Sparkles className="mr-2 h-4 w-4" />
                                )}
                                {generating ? 'Generating...' : 'Generate'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Review Mode — FSRS spaced repetition session
═══════════════════════════════════════════════════════════════════════════ */
function ReviewMode({
    cards,
    onExit,
}: {
    cards: FlashCard[];
    onExit: () => void;
}) {
    const [queue, setQueue] = useState<FlashCard[]>([...cards]);
    const [current, setCurrent] = useState(0);
    const [revealed, setRevealed] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);
    const startTimeRef = useRef<number>(Date.now());

    useEffect(() => {
        startTimeRef.current = Date.now();
        setRevealed(false);
        setError(null);
    }, [current]);

    const handleRating = async (rating: ReviewRating) => {
        const card = queue[current];
        const durationMs = Date.now() - startTimeRef.current;
        setSubmitting(true);
        setError(null);

        try {
            await window.axios.post(`/flashcards/${card.id}/review`, {
                rating,
                duration_ms: durationMs,
            });

            if (current + 1 >= queue.length) {
                setDone(true);
            } else {
                setCurrent((c) => c + 1);
            }
        } catch (err: unknown) {
            const e = err as { response?: { data?: { error?: string } } };
            setError(e?.response?.data?.error ?? 'Review submission failed.');
        } finally {
            setSubmitting(false);
        }
    };

    if (done) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
                <div className="relative">
                    <div className="absolute -inset-8 animate-ping rounded-full bg-green-500/10" />
                    <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20">
                        <Check className="h-10 w-10 text-green-400" />
                    </div>
                </div>
                <div>
                    <h2 className="text-2xl font-bold">Session Complete!</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Reviewed {queue.length} card
                        {queue.length !== 1 ? 's' : ''}.
                    </p>
                </div>
                <Button onClick={onExit} className="mt-2">
                    <ChevronLeft className="mr-2 h-4 w-4" /> Back to cards
                </Button>
            </div>
        );
    }

    const card = queue[current];
    const progress = (current / queue.length) * 100;

    return (
        <div className="flex flex-1 flex-col gap-4">
            {/* Progress bar */}
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
                <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${progress}%` }}
                />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground/60">
                <span>
                    {current} / {queue.length} reviewed
                </span>
                <span>{queue.length - current} remaining</span>
            </div>

            {/* Card face */}
            <div className="relative flex flex-1 flex-col">
                <div
                    className={cn(
                        'relative flex flex-1 cursor-pointer flex-col items-center justify-center rounded-3xl border p-10 text-center transition-all duration-300',
                        revealed
                            ? 'border-primary/30 bg-primary/5'
                            : 'border-white/10 bg-card/50 backdrop-blur hover:border-white/20',
                    )}
                    onClick={() => !revealed && setRevealed(true)}
                >
                    <Badge
                        variant="outline"
                        className="absolute top-4 left-4 border-white/10 text-[10px] uppercase"
                    >
                        {revealed ? 'Answer' : 'Question'}
                    </Badge>

                    {/* Difficulty badge */}
                    {card.interval_days > 0 && (
                        <Badge
                            variant="outline"
                            className="absolute top-4 right-4 border-white/10 text-[10px] text-muted-foreground uppercase"
                        >
                            {card.interval_days}d interval
                        </Badge>
                    )}

                    <div className="max-w-2xl text-lg leading-relaxed font-medium">
                        {revealed ? card.back : card.front}
                    </div>

                    {!revealed && (
                        <div className="mt-8 flex items-center gap-2 text-xs text-muted-foreground/40">
                            <Eye className="h-3.5 w-3.5" />
                            Click to reveal answer
                        </div>
                    )}
                </div>

                {/* Rating buttons */}
                {revealed && (
                    <div className="mt-4 flex animate-in flex-col gap-3 fade-in slide-in-from-bottom-2">
                        <p className="text-center text-xs font-bold tracking-widest text-muted-foreground/60 uppercase">
                            How well did you know this?
                        </p>
                        <div className="grid grid-cols-4 gap-2">
                            {RATINGS.map((r) => (
                                <button
                                    key={r.value}
                                    disabled={submitting}
                                    onClick={() => void handleRating(r.value)}
                                    className={cn(
                                        'flex flex-col items-center gap-1.5 rounded-2xl border p-4 text-xs font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50',
                                        r.color,
                                    )}
                                >
                                    {submitting ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        r.icon
                                    )}
                                    {r.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {error && (
                    <p className="mt-2 text-center text-xs text-destructive">
                        {error}
                    </p>
                )}
            </div>
        </div>
    );
}

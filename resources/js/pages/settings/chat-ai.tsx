import { Transition } from '@headlessui/react';
import { Head, router, useForm } from '@inertiajs/react';
import {
    Pencil,
    Plus,
    Star,
    Trash2,
    LoaderCircle,
    AlertTriangle,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import {
    catalogToMap,
    getProviderMeta,
    type ProviderCatalogEntry,
} from '@/lib/ai-provider-fields';
import type { BreadcrumbItem } from '@/types';

type AiSettingRow = {
    id: number;
    provider_type: string;
    endpoint: string | null;
    model: string | null;
    temperature: number;
    is_default: boolean;
    has_api_key: boolean;
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Chat AI',
        href: '/settings/ai/chat',
    },
];

const emptyForm = {
    provider_type: '',
    endpoint: '',
    model: '',
    temperature: '0.7',
    api_key: '',
    is_default: false as boolean,
};

function ProviderSummary({
    row,
    catalogMap,
}: {
    row: AiSettingRow;
    catalogMap: Record<string, ProviderCatalogEntry>;
}) {
    const meta = getProviderMeta(row.provider_type, catalogMap);
    const parts: string[] = [];

    if (meta.fields.model && row.model) {
        parts.push(row.model);
    }
    if (meta.fields.endpoint && row.endpoint) {
        parts.push(row.endpoint);
    }
    if (meta.fields.apiKey && row.has_api_key) {
        parts.push('API key saved');
    }
    if (meta.fields.temperature) {
        parts.push(`Temperature ${row.temperature}`);
    }

    return (
        <CardDescription className="mt-1 space-y-0.5">
            <span className="block text-xs">{meta.summary}</span>
            {parts.length > 0 ? (
                <span className="block text-xs text-muted-foreground">
                    {parts.join(' ┬╖ ')}
                </span>
            ) : (
                <span className="block text-xs text-muted-foreground italic">
                    Default settings
                </span>
            )}
        </CardDescription>
    );
}

export default function AiSettings({
    settings,
    providerCatalog,
    status,
}: {
    settings: AiSettingRow[];
    providerCatalog: ProviderCatalogEntry[];
    status?: string;
}) {
    const catalogMap = useMemo(
        () => catalogToMap(providerCatalog),
        [providerCatalog],
    );
    const [editingId, setEditingId] = useState<number | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    const editing = useMemo(
        () => settings.find((s) => s.id === editingId) ?? null,
        [settings, editingId],
    );

    const availableProviderTypes = useMemo(() => {
        const used = new Set(settings.map((s) => s.provider_type));
        if (editing) {
            used.delete(editing.provider_type);
        }
        return providerCatalog.map((p) => p.type).filter((t) => !used.has(t));
    }, [settings, providerCatalog, editing]);

    const form = useForm({
        ...emptyForm,
        provider_type:
            availableProviderTypes[0] ?? providerCatalog[0]?.type ?? '',
    });

    const activeType = editing?.provider_type ?? form.data.provider_type;
    const activeMeta = getProviderMeta(activeType, catalogMap);

    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [loadingModels, setLoadingModels] = useState(false);
    const [modelsError, setModelsError] = useState<string | null>(null);

    // Fetch available models when provider/endpoint/api_key changes
    useEffect(() => {
        if (!form.data.provider_type || !activeMeta.fields.model) {
            setAvailableModels([]);
            return;
        }

        const fetchModels = async () => {
            setLoadingModels(true);
            setModelsError(null);

            try {
                const csrfToken = document.cookie
                    .split('; ')
                    .find((row) => row.startsWith('XSRF-TOKEN='))
                    ?.split('=')[1];

                const res = await fetch('/api/ai/list-models', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        Accept: 'application/json',
                        ...(csrfToken
                            ? { 'X-XSRF-TOKEN': decodeURIComponent(csrfToken) }
                            : {}),
                    },
                    body: JSON.stringify({
                        provider_type: form.data.provider_type,
                        endpoint: form.data.endpoint || null,
                        api_key: form.data.api_key || null,
                    }),
                    credentials: 'same-origin',
                });

                if (!res.ok) {
                    const err = await res.json().catch(() => null);
                    throw new Error(
                        err?.error || `Failed to list models (${res.status})`,
                    );
                }

                const result = await res.json();
                if (!result.success) {
                    throw new Error(result.error || 'Failed to list models');
                }

                setAvailableModels(result.models || []);
            } catch (e) {
                setModelsError(
                    e instanceof Error ? e.message : 'Failed to fetch models',
                );
                setAvailableModels([]);
            } finally {
                setLoadingModels(false);
            }
        };

        const timer = setTimeout(fetchModels, 500);
        return () => clearTimeout(timer);
    }, [form.data.provider_type, form.data.endpoint, form.data.api_key]);

    const openAddModal = () => {
        setEditingId(null);
        form.clearErrors();
        form.setData({
            ...emptyForm,
            provider_type: availableProviderTypes[0] ?? '',
            is_default: settings.length === 0,
        });
        setModalOpen(true);
    };

    const openEditModal = (row: AiSettingRow) => {
        setEditingId(row.id);
        form.clearErrors();
        form.setData({
            provider_type: row.provider_type,
            endpoint: row.endpoint ?? '',
            model: row.model ?? '',
            temperature: String(row.temperature),
            api_key: '',
            is_default: row.is_default,
        });
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingId(null);
        form.reset();
        form.clearErrors();
    };

    useEffect(() => {
        if (settings.length === 0 && availableProviderTypes.length > 0) {
            openAddModal();
        }
        // Only on first mount when list is empty
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const submitForm = (e: React.FormEvent) => {
        e.preventDefault();

        const meta = getProviderMeta(
            editing?.provider_type ?? form.data.provider_type,
            catalogMap,
        );

        const payload: Record<string, unknown> = {
            is_default: form.data.is_default,
        };

        if (meta.fields.endpoint) {
            payload.endpoint = form.data.endpoint || null;
        }
        if (meta.fields.model) {
            payload.model = form.data.model || null;
        }
        if (meta.fields.temperature) {
            payload.temperature = Number(form.data.temperature);
        }
        if (meta.fields.apiKey && form.data.api_key) {
            payload.api_key = form.data.api_key;
        }

        if (editing) {
            form.transform(() => payload);
            form.put(`/settings/ai/chat/${editing.id}`, {
                preserveScroll: true,
                onSuccess: closeModal,
            });
        } else {
            form.transform(() => ({
                ...payload,
                provider_type: form.data.provider_type,
            }));
            form.post('/settings/ai/chat', {
                preserveScroll: true,
                onSuccess: closeModal,
            });
        }
    };

    const setDefault = (row: AiSettingRow) => {
        router.post(
            `/settings/ai/chat/${row.id}/default`,
            {},
            { preserveScroll: true },
        );
    };

    const deleteProvider = (row: AiSettingRow) => {
        if (
            !confirm(
                `Remove the ┬½ ${getProviderMeta(row.provider_type, catalogMap).label} ┬╗ configuration?`,
            )
        ) {
            return;
        }
        router.delete(`/settings/ai/chat/${row.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                if (editingId === row.id) {
                    closeModal();
                }
            },
        });
    };

    const statusMessage =
        status === 'chat-ai-settings-saved'
            ? 'Saved.'
            : status === 'chat-ai-settings-deleted'
              ? 'Provider removed.'
              : status === 'chat-ai-settings-default-changed'
                ? 'Default provider updated.'
                : null;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Chat Chat AI Settings" />

            <h1 className="sr-only">Chat AI Settings</h1>

            <SettingsLayout>
                <div className="space-y-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <Heading
                            variant="small"
                            title="Chat AI providers"
                            description="Connect the AI services you use. Only the fields required for each provider are shown."
                        />
                        {availableProviderTypes.length > 0 && (
                            <Button
                                type="button"
                                size="sm"
                                onClick={openAddModal}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Add provider
                            </Button>
                        )}
                    </div>

                    {statusMessage && (
                        <p className="text-sm text-muted-foreground">
                            {statusMessage}
                        </p>
                    )}

                    {settings.length > 0 ? (
                        <ul className="space-y-3">
                            {settings.map((row) => {
                                const meta = getProviderMeta(
                                    row.provider_type,
                                    catalogMap,
                                );
                                return (
                                    <li key={row.id}>
                                        <Card>
                                            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-2">
                                                <div className="min-w-0">
                                                    <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                                                        <span>
                                                            {meta.label}
                                                        </span>
                                                        {row.is_default && (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                                                <Star className="h-3 w-3 fill-current" />
                                                                Default
                                                            </span>
                                                        )}
                                                    </CardTitle>
                                                    <ProviderSummary
                                                        row={row}
                                                        catalogMap={catalogMap}
                                                    />
                                                </div>
                                                <div className="flex shrink-0 flex-wrap gap-2">
                                                    {!row.is_default && (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() =>
                                                                setDefault(row)
                                                            }
                                                        >
                                                            Set default
                                                        </Button>
                                                    )}
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            openEditModal(row)
                                                        }
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            deleteProvider(row)
                                                        }
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </CardHeader>
                                        </Card>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            No providers yet. Use <strong>Add provider</strong>{' '}
                            to get started.
                        </p>
                    )}

                    {availableProviderTypes.length === 0 &&
                        settings.length > 0 && (
                            <p className="text-sm text-muted-foreground">
                                All provider types are configured. Edit or
                                remove one to add another.
                            </p>
                        )}
                </div>
            </SettingsLayout>

            <Dialog
                open={modalOpen}
                onOpenChange={(open) => {
                    if (!open) closeModal();
                    else setModalOpen(true);
                }}
            >
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {editing
                                ? `Edit ${activeMeta.label}`
                                : 'Add provider'}
                        </DialogTitle>
                        <DialogDescription>
                            {activeMeta.summary}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submitForm} className="space-y-4">
                        {!editing && availableProviderTypes.length > 0 && (
                            <div className="grid gap-2">
                                <Label htmlFor="provider_type">Provider</Label>
                                <select
                                    id="provider_type"
                                    value={form.data.provider_type}
                                    onChange={(e) =>
                                        form.setData(
                                            'provider_type',
                                            e.target.value,
                                        )
                                    }
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                >
                                    {availableProviderTypes.map((type) => (
                                        <option key={type} value={type}>
                                            {
                                                getProviderMeta(
                                                    type,
                                                    catalogMap,
                                                ).label
                                            }
                                        </option>
                                    ))}
                                </select>
                                <InputError
                                    message={form.errors.provider_type}
                                />
                            </div>
                        )}

                        {activeMeta.fields.apiKey && (
                            <div className="grid gap-2">
                                <Label htmlFor="api_key">
                                    API key
                                    {activeMeta.fields.apiKeyRequired && (
                                        <span className="text-destructive">
                                            {' '}
                                            *
                                        </span>
                                    )}
                                </Label>
                                <Input
                                    id="api_key"
                                    type="password"
                                    autoComplete="off"
                                    value={form.data.api_key}
                                    onChange={(e) =>
                                        form.setData('api_key', e.target.value)
                                    }
                                    placeholder={
                                        editing && editing.has_api_key
                                            ? 'Leave blank to keep existing key'
                                            : activeMeta.placeholders.apiKey
                                    }
                                />
                                {activeMeta.hints.apiKey && (
                                    <p className="text-xs text-muted-foreground">
                                        {activeMeta.hints.apiKey}
                                    </p>
                                )}
                                <InputError message={form.errors.api_key} />
                            </div>
                        )}

                        {activeMeta.fields.endpoint && (
                            <div className="grid gap-2">
                                <Label htmlFor="endpoint">Server URL</Label>
                                <Input
                                    id="endpoint"
                                    value={form.data.endpoint}
                                    onChange={(e) =>
                                        form.setData('endpoint', e.target.value)
                                    }
                                    placeholder={
                                        activeMeta.placeholders.endpoint
                                    }
                                />
                                {activeMeta.hints.endpoint && (
                                    <p className="text-xs text-muted-foreground">
                                        {activeMeta.hints.endpoint}
                                    </p>
                                )}
                                <InputError message={form.errors.endpoint} />
                            </div>
                        )}

                        {activeMeta.fields.model && (
                            <div className="grid gap-2">
                                <Label htmlFor="model">Model</Label>
                                {availableModels.length > 0 ? (
                                    <Select
                                        value={form.data.model}
                                        onValueChange={(value) =>
                                            form.setData('model', value)
                                        }
                                    >
                                        <SelectTrigger id="model">
                                            <SelectValue placeholder="Select a model..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableModels.map((model) => (
                                                <SelectItem
                                                    key={model}
                                                    value={model}
                                                >
                                                    {model}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <Input
                                        id="model"
                                        value={form.data.model}
                                        onChange={(e) =>
                                            form.setData(
                                                'model',
                                                e.target.value,
                                            )
                                        }
                                        placeholder={
                                            activeMeta.placeholders.model
                                        }
                                    />
                                )}
                                {loadingModels && (
                                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <LoaderCircle className="h-3 w-3 animate-spin" />
                                        Loading available models...
                                    </p>
                                )}
                                {modelsError && (
                                    <p className="flex items-center gap-1 text-xs text-red-500">
                                        <AlertTriangle className="h-3 w-3" />
                                        {modelsError}
                                    </p>
                                )}
                                {activeMeta.hints.model &&
                                    !loadingModels &&
                                    !modelsError && (
                                        <p className="text-xs text-muted-foreground">
                                            {activeMeta.hints.model}
                                        </p>
                                    )}
                                <InputError message={form.errors.model} />
                            </div>
                        )}

                        {activeMeta.fields.temperature && (
                            <div className="grid gap-2">
                                <Label htmlFor="temperature">
                                    Temperature{' '}
                                    <span className="font-normal text-muted-foreground">
                                        (optional)
                                    </span>
                                </Label>
                                <Input
                                    id="temperature"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="2"
                                    value={form.data.temperature}
                                    onChange={(e) =>
                                        form.setData(
                                            'temperature',
                                            e.target.value,
                                        )
                                    }
                                />
                                {activeMeta.hints.temperature && (
                                    <p className="text-xs text-muted-foreground">
                                        {activeMeta.hints.temperature}
                                    </p>
                                )}
                                <InputError message={form.errors.temperature} />
                            </div>
                        )}

                        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3">
                            <Checkbox
                                id="is_default"
                                checked={form.data.is_default}
                                onCheckedChange={(checked) =>
                                    form.setData('is_default', checked === true)
                                }
                            />
                            <Label
                                htmlFor="is_default"
                                className="cursor-pointer font-normal"
                            >
                                Use as default for CER and chat
                            </Label>
                        </div>
                        <InputError message={form.errors.is_default} />

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeModal}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={form.processing}>
                                {editing ? 'Save' : 'Add'}
                            </Button>
                        </DialogFooter>

                        <Transition
                            show={form.recentlySuccessful}
                            enter="transition ease-in-out"
                            enterFrom="opacity-0"
                            leave="transition ease-in-out"
                            leaveTo="opacity-0"
                        >
                            <p className="text-center text-sm text-muted-foreground">
                                Saved.
                            </p>
                        </Transition>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

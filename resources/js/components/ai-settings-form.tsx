import { Transition } from '@headlessui/react';
import { useForm } from '@inertiajs/react';
import { CheckCircle, LoaderCircle, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    catalogToMap,
    getProviderMeta,
    type ProviderCatalogEntry,
} from '@/lib/ai-provider-fields';

type SavedSetting = {
    provider_type: string;
    endpoint: string | null;
    model: string | null;
    temperature?: number;
    embedding_dimensions?: number | null;
    has_api_key: boolean;
};

type TestResult = {
    success: boolean;
    vector_size?: number;
    model?: string;
    error?: string;
};

type AiSettingsFormProps = {
    setting: SavedSetting | null;
    providerCatalog: ProviderCatalogEntry[];
    submitUrl: string;
    status?: string;
    savedMessage: string;
    showTemperature?: boolean;
    /** 'embedding' or 'chat' — used for the test endpoint */
    type?: 'embedding' | 'chat';
};

export default function AiSettingsForm({
    setting,
    providerCatalog,
    submitUrl,
    status,
    savedMessage,
    showTemperature = false,
    type = 'embedding',
}: AiSettingsFormProps) {
    const catalogMap = useMemo(
        () => catalogToMap(providerCatalog),
        [providerCatalog],
    );

    const defaultType =
        setting?.provider_type ?? providerCatalog[0]?.type ?? '';

    const { data, setData, put, processing, errors, recentlySuccessful } =
        useForm({
            provider_type: defaultType,
            endpoint: setting?.endpoint ?? '',
            model: setting?.model ?? '',
            api_key: '',
            temperature: String(setting?.temperature ?? 0.7),
        });

    const [testResult, setTestResult] = useState<TestResult | null>(null);
    const [testLoading, setTestLoading] = useState(false);

    useEffect(() => {
        if (setting) {
            setData({
                provider_type: setting.provider_type,
                endpoint: setting.endpoint ?? '',
                model: setting.model ?? '',
                api_key: '',
                temperature: String(setting.temperature ?? 0.7),
            });
        }
    }, [setting?.provider_type]);

    const meta = getProviderMeta(data.provider_type, catalogMap);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setTestResult(null);
        put(submitUrl);
    };

    const handleTest = async () => {
        setTestLoading(true);
        setTestResult(null);

        try {
            const res = await fetch('/settings/ai/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    type,
                    provider_type: data.provider_type,
                    endpoint: data.endpoint || null,
                    model: data.model || null,
                    api_key: data.api_key || null,
                }),
                credentials: 'same-origin',
            });

            const result: TestResult = await res.json();
            setTestResult(result);
        } catch (e) {
            setTestResult({
                success: false,
                error: e instanceof Error ? e.message : 'Network error',
            });
        } finally {
            setTestLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="provider_type">Provider</Label>
                <Select
                    value={data.provider_type}
                    onValueChange={(value) => {
                        setData('provider_type', value);
                        setTestResult(null);
                    }}
                >
                    <SelectTrigger id="provider_type">
                        <SelectValue placeholder="Choose provider" />
                    </SelectTrigger>
                    <SelectContent>
                        {providerCatalog.map((entry) => (
                            <SelectItem key={entry.type} value={entry.type}>
                                {entry.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">{meta.summary}</p>
                <InputError message={errors.provider_type} />
            </div>

            {meta.fields.endpoint && (
                <div className="space-y-2">
                    <Label htmlFor="endpoint">Endpoint</Label>
                    <Input
                        id="endpoint"
                        value={data.endpoint}
                        onChange={(e) => setData('endpoint', e.target.value)}
                        placeholder={meta.placeholders.endpoint}
                    />
                    {meta.hints.endpoint && (
                        <p className="text-xs text-muted-foreground">
                            {meta.hints.endpoint}
                        </p>
                    )}
                    <InputError message={errors.endpoint} />
                </div>
            )}

            {meta.fields.apiKey && (
                <div className="space-y-2">
                    <Label htmlFor="api_key">
                        API key
                        {meta.fields.apiKeyRequired ? ' *' : ''}
                    </Label>
                    <Input
                        id="api_key"
                        type="password"
                        value={data.api_key}
                        onChange={(e) => setData('api_key', e.target.value)}
                        placeholder={
                            setting?.has_api_key
                                ? 'Leave blank to keep saved key'
                                : meta.placeholders.apiKey
                        }
                        autoComplete="off"
                    />
                    {meta.hints.apiKey && (
                        <p className="text-xs text-muted-foreground">
                            {meta.hints.apiKey}
                        </p>
                    )}
                    <InputError message={errors.api_key} />
                </div>
            )}

            {meta.fields.model && (
                <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <Input
                        id="model"
                        value={data.model}
                        onChange={(e) => setData('model', e.target.value)}
                        placeholder={meta.placeholders.model}
                    />
                    {meta.hints.model && (
                        <p className="text-xs text-muted-foreground">
                            {meta.hints.model}
                        </p>
                    )}
                    <InputError message={errors.model} />
                </div>
            )}

            {showTemperature && meta.fields.temperature && (
                <div className="space-y-2">
                    <Label htmlFor="temperature">Temperature</Label>
                    <Input
                        id="temperature"
                        type="number"
                        min={0}
                        max={2}
                        step={0.1}
                        value={data.temperature}
                        onChange={(e) => setData('temperature', e.target.value)}
                    />
                    <InputError message={errors.temperature} />
                </div>
            )}

            {setting?.embedding_dimensions != null && (
                <p className="text-sm text-muted-foreground">
                    Detected vector size: {setting.embedding_dimensions}{' '}
                    dimensions (saved after first embed).
                </p>
            )}

            {testResult && (
                <div
                    className={`rounded-xl border p-4 text-sm ${
                        testResult.success
                            ? 'border-green-500/30 bg-green-500/5 text-green-600 dark:text-green-400'
                            : 'border-destructive/30 bg-destructive/5 text-destructive'
                    }`}
                >
                    {testResult.success ? (
                        <div className="flex items-start gap-3">
                            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0" />
                            <div>
                                <p className="font-medium">Connexion reussie</p>
                                <p className="mt-1 text-xs opacity-80">
                                    Modele : <strong>{testResult.model}</strong>
                                    {testResult.vector_size != null && (
                                        <>
                                            {' '}
                                            | Dimensions :{' '}
                                            <strong>
                                                {testResult.vector_size}
                                            </strong>
                                        </>
                                    )}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-start gap-3">
                            <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
                            <div>
                                <p className="font-medium">
                                    Echec de la connexion
                                </p>
                                <p className="mt-1 text-xs opacity-80">
                                    {testResult.error}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="flex flex-wrap items-center gap-4">
                <Button type="submit" disabled={processing}>
                    {processing ? 'Saving...' : 'Save'}
                </Button>

                <Button
                    type="button"
                    variant="outline"
                    onClick={handleTest}
                    disabled={testLoading}
                    className="gap-2"
                >
                    {testLoading ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                        <span className="text-lg leading-none">🧪</span>
                    )}
                    {testLoading ? 'Testing...' : 'Test connection'}
                </Button>

                <Transition
                    show={recentlySuccessful || status === savedMessage}
                    enter="transition ease-in-out"
                    enterFrom="opacity-0"
                    leave="transition ease-in-out"
                    leaveTo="opacity-0"
                >
                    <p className="text-sm text-neutral-600">Saved</p>
                </Transition>
            </div>
        </form>
    );
}

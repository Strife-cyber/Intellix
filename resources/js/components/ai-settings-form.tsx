import { Transition } from '@headlessui/react';
import { useForm } from '@inertiajs/react';
import { useEffect, useMemo } from 'react';

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

type AiSettingsFormProps = {
    setting: SavedSetting | null;
    providerCatalog: ProviderCatalogEntry[];
    submitUrl: string;
    status?: string;
    savedMessage: string;
    showTemperature?: boolean;
};

export default function AiSettingsForm({
    setting,
    providerCatalog,
    submitUrl,
    status,
    savedMessage,
    showTemperature = false,
}: AiSettingsFormProps) {
    const catalogMap = useMemo(
        () => catalogToMap(providerCatalog),
        [providerCatalog],
    );

    const defaultType = setting?.provider_type ?? providerCatalog[0]?.type ?? '';

    const { data, setData, put, processing, errors, recentlySuccessful } =
        useForm({
            provider_type: defaultType,
            endpoint: setting?.endpoint ?? '',
            model: setting?.model ?? '',
            api_key: '',
            temperature: String(setting?.temperature ?? 0.7),
        });

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
        put(submitUrl);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="provider_type">Provider</Label>
                <Select
                    value={data.provider_type}
                    onValueChange={(value) =>
                        setData('provider_type', value)
                    }
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
                <p className="text-sm text-muted-foreground">
                    {meta.summary}
                </p>
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
                        onChange={(e) =>
                            setData('temperature', e.target.value)
                        }
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

            <div className="flex items-center gap-4">
                <Button type="submit" disabled={processing}>
                    Save
                </Button>
                <Transition
                    show={
                        recentlySuccessful || status === savedMessage
                    }
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

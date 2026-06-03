import { Head } from '@inertiajs/react';

import Heading from '@/components/heading';
import AiSettingsForm from '@/components/ai-settings-form';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import type { ProviderCatalogEntry } from '@/lib/ai-provider-fields';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Embeddings AI',
        href: '/settings/ai/embeddings',
    },
];

type SavedSetting = {
    provider_type: string;
    endpoint: string | null;
    model: string | null;
    embedding_dimensions: number | null;
    has_api_key: boolean;
};

export default function EmbeddingAiSettings({
    setting,
    providerCatalog,
    status,
}: {
    setting: SavedSetting | null;
    providerCatalog: ProviderCatalogEntry[];
    status?: string;
}) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Embeddings AI settings" />
            <SettingsLayout>
                <div className="space-y-6">
                    <Heading
                        title="Embeddings AI"
                        description="Indexes uploaded documents in Qdrant for library search and flashcards. Can differ from your chat provider."
                    />
                    <AiSettingsForm
                        setting={setting}
                        providerCatalog={providerCatalog}
                        submitUrl="/settings/ai/embeddings"
                        status={status}
                        savedMessage="embedding-ai-settings-saved"
                    />
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}

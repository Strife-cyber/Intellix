import { Head, usePage } from '@inertiajs/react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
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

type PageProps = {
    setting: SavedSetting | null;
    providerCatalog: ProviderCatalogEntry[];
    status?: string;
    hasIndexedDocs: boolean;
    model_changed?: boolean;
    needs_reindex?: boolean;
};

export default function EmbeddingAiSettings() {
    const {
        setting,
        providerCatalog,
        status,
        hasIndexedDocs,
        model_changed,
        needs_reindex,
    } = usePage<PageProps>().props;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Embeddings AI settings" />
            <SettingsLayout>
                <div className="space-y-6">
                    <Heading
                        title="Embeddings AI"
                        description="Indexes uploaded documents in Qdrant for library search and flashcards. Can differ from your chat provider."
                    />

                    {needs_reindex && (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                                <div>
                                    <p className="font-medium">
                                        Modele d&apos;embedding modifie
                                    </p>
                                    <p className="mt-1 opacity-80">
                                        Vous avez change de modele alors que des
                                        documents sont deja indexes. Les anciens
                                        vecteurs ne sont plus compatibles.
                                    </p>
                                    <p className="mt-1 opacity-80">
                                        Lancez la reindexation depuis le
                                        terminal :
                                    </p>
                                    <pre className="mt-2 rounded-lg bg-amber-950/20 p-3 text-xs">
                                        php artisan resources:reindex --user=
                                        {setting?.provider_type
                                            ? '{your_user_id}'
                                            : '<user_id>'}
                                    </pre>
                                    <p className="mt-2 text-xs opacity-60">
                                        Cela supprimera les anciens vecteurs et
                                        re-indexera tous vos documents avec le
                                        nouveau modele.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {hasIndexedDocs && !needs_reindex && (
                        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-sm text-blue-700 dark:text-blue-300">
                            <div className="flex items-start gap-3">
                                <RefreshCcw className="mt-0.5 h-5 w-5 shrink-0" />
                                <div>
                                    <p className="font-medium">
                                        Documents indexes : {hasIndexedDocs}
                                    </p>
                                    <p className="mt-1 opacity-80">
                                        Si vous changez de modele
                                        d&apos;embedding, vous devrez re-indexer
                                        vos documents.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <AiSettingsForm
                        setting={setting}
                        providerCatalog={providerCatalog}
                        submitUrl="/settings/ai/embeddings"
                        status={status}
                        savedMessage="embedding-ai-settings-saved"
                        type="embedding"
                    />
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}

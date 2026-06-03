export type ProviderFieldFlags = {
    apiKey: boolean;
    apiKeyRequired: boolean;
    endpoint: boolean;
    model: boolean;
    temperature: boolean;
};

export type ProviderCatalogEntry = {
    type: string;
    label: string;
    summary: string;
    fields: ProviderFieldFlags;
    placeholders: {
        endpoint?: string;
        model?: string;
        apiKey?: string;
    };
    hints: {
        endpoint?: string;
        model?: string;
        apiKey?: string;
        temperature?: string;
    };
};

export function catalogToMap(
    catalog: ProviderCatalogEntry[],
): Record<string, ProviderCatalogEntry> {
    return Object.fromEntries(catalog.map((entry) => [entry.type, entry]));
}

export function getProviderMeta(
    type: string,
    catalogMap: Record<string, ProviderCatalogEntry>,
): ProviderCatalogEntry {
    return (
        catalogMap[type] ?? {
            type,
            label: type,
            summary: 'AI provider',
            fields: {
                apiKey: true,
                apiKeyRequired: false,
                endpoint: false,
                model: true,
                temperature: false,
            },
            placeholders: {},
            hints: {},
        }
    );
}

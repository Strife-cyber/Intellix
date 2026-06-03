export type Prosit = {
    keywords?: string[];
    context?: string;
    needs?: string[];
    constraints?: string[];
    problems?: string[];
    generalisation?: string;
    pistes?: string[];
    plan?: string[];
};

export type StoredProsit = {
    id: string;
    filename: string;
    uploaded_at: string;
    prosit: Prosit;
};

export type CerJob = {
    id: string;
    kind: string;
    status: 'queued' | 'running' | 'completed' | 'failed';
    progress?: string;
    error?: string;
    result?: {
        pdf_ready?: boolean;
        pdf_path?: string | null;
        zip_path?: string | null;
        combined_latex_path?: string | null;
        compile_log?: string;
    };
};

export async function listThemes(): Promise<string[]> {
    const data = await request<{ themes: string[] }>('/api/themes');
    return data.themes ?? [];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(path, {
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...(init?.headers as Record<string, string> | undefined),
        },
        ...init,
    });

    if (!res.ok) {
        const text = await res.text();
        let message = text || res.statusText;
        try {
            const json = JSON.parse(text) as {
                message?: string;
                error?: string;
            };
            message = json.message ?? json.error ?? message;
        } catch {
            /* plain text body */
        }
        throw new Error(message);
    }

    if (res.status === 204) {
        return undefined as T;
    }

    return res.json() as Promise<T>;
}

export async function getJob(id: string): Promise<CerJob> {
    return request<CerJob>(`/cers/jobs/${encodeURIComponent(id)}/status`);
}

export function jobDownloadUrl(
    id: string,
    kind: 'zip' | 'pdf' | 'latex',
): string {
    const suffix = kind === 'zip' ? 'download' : kind;
    return `/cers/jobs/${encodeURIComponent(id)}/${suffix}`;
}

export const LAST_CER_JOB_KEY = 'cer:lastJobId';

export function rememberJobId(jobId: string): void {
    sessionStorage.setItem(LAST_CER_JOB_KEY, jobId);
}

export function readLastJobId(): string | null {
    return sessionStorage.getItem(LAST_CER_JOB_KEY);
}

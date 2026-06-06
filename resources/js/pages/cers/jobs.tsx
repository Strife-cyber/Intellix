import { Head, Link } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle, Download, LoaderCircle, RefreshCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import {
    getJob,
    jobDownloadUrl,
    readLastJobId,
    rememberJobId,
    type CerJob,
} from '@/lib/cer-api';
import cers from '@/routes/cers';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Bibliothèque PROSIT', href: cers.index().url },
    { title: 'Travaux en cours', href: '/cers/jobs' },
];

/**
 * Save a completed CER job's PDF as a Resource linked to the local prosit.
 */
async function saveCerResource(
    jobId: string,
    prositId: string,
): Promise<boolean> {
    try {
        const res = await fetch(
            `/cers/jobs/${encodeURIComponent(jobId)}/save-resource`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    Accept: 'application/json',
                },
                body: JSON.stringify({ prosit_id: prositId }),
                credentials: 'same-origin',
            },
        );
        if (!res.ok) {
            console.warn('Failed to save CER resource:', await res.text());
            return false;
        }
        return true;
    } catch (e) {
        console.warn('Failed to save CER resource:', e);
        return false;
    }
}

export default function JobsPage() {
    const [jobId, setJobId] = useState('');
    const [job, setJob] = useState<CerJob | null>(null);
    const [status, setStatus] = useState<
        'idle' | 'loading' | 'failed' | 'polling'
    >('idle');
    const [error, setError] = useState<string | null>(null);
    const [resourceSaved, setResourceSaved] = useState(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const prositIdRef = useRef<string | null>(null);

    const stopPolling = useCallback(() => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
    }, []);

    const applyJob = useCallback((data: CerJob) => {
        setJob(data);
        if (data.id) {
            rememberJobId(data.id);
        }
    }, []);

    const fetchJob = useCallback(
        async (id: string, options?: { startPoll?: boolean }) => {
            const trimmed = id.trim();
            if (!trimmed) return;

            setError(null);
            setStatus('loading');
            stopPolling();

            try {
                const data = await getJob(trimmed);
                applyJob(data);
                setJobId(trimmed);

                if (
                    options?.startPoll &&
                    data.status !== 'completed' &&
                    data.status !== 'failed'
                ) {
                    setStatus('polling');
                    pollRef.current = setInterval(async () => {
                        try {
                            const polled = await getJob(trimmed);
                            applyJob(polled);
                            if (
                                polled.status === 'completed' ||
                                polled.status === 'failed'
                            ) {
                                stopPolling();
                                setStatus('idle');

                                // Auto-save the PDF as a Resource when completed
                                if (
                                    polled.status === 'completed' &&
                                    prositIdRef.current &&
                                    polled.result?.pdf_ready
                                ) {
                                    const saved = await saveCerResource(
                                        trimmed,
                                        prositIdRef.current,
                                    );
                                    setResourceSaved(saved);
                                }
                            }
                        } catch {
                            stopPolling();
                            setStatus('failed');
                        }
                    }, 2000);
                } else {
                    setStatus('idle');

                    // If the job was already completed when loaded, try to save the resource
                    if (
                        data.status === 'completed' &&
                        prositIdRef.current &&
                        data.result?.pdf_ready
                    ) {
                        const saved = await saveCerResource(
                            trimmed,
                            prositIdRef.current,
                        );
                        setResourceSaved(saved);
                    }
                }
            } catch (e) {
                setStatus('failed');
                setError(
                    e instanceof Error
                        ? e.message
                        : 'Impossible de charger le job.',
                );
            }
        },
        [applyJob, stopPolling],
    );

    useEffect(() => {
        const url = new URL(window.location.href);
        const fromQuery = url.searchParams.get('jobId');
        const fromStorage = readLastJobId();
        const prositId = url.searchParams.get('prositId');
        prositIdRef.current = prositId;

        const initial = fromQuery || fromStorage || '';

        if (initial) {
            setJobId(initial);
            void fetchJob(initial, { startPoll: true });
        }

        return () => stopPolling();
    }, [fetchJob, stopPolling]);

    const isActive =
        job?.status === 'queued' ||
        job?.status === 'running' ||
        status === 'polling';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Travaux en cours — CER" />

            <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Travaux en cours
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Suivi des compilations CER. Le dernier job lancé est
                            chargé automatiquement.
                        </p>
                    </div>
                    <Button variant="outline" className="rounded-2xl" asChild>
                        <Link href={cers.index().url}>Bibliothèque PROSIT</Link>
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Job CER</CardTitle>
                        <CardDescription>
                            Collez un identifiant ou lancez une génération
                            depuis un cahier — vous serez redirigé ici
                            automatiquement.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                            <div className="w-full sm:flex-1">
                                <label className="mb-2 block text-sm font-medium">
                                    Job ID
                                </label>
                                <Input
                                    value={jobId}
                                    onChange={(e) => setJobId(e.target.value)}
                                    placeholder="UUID du job micro-cer"
                                    disabled={status === 'loading'}
                                />
                            </div>
                            <Button
                                onClick={() =>
                                    void fetchJob(jobId, { startPoll: true })
                                }
                                disabled={status === 'loading' || !jobId.trim()}
                                className="rounded-2xl"
                            >
                                {status === 'loading' ? (
                                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <RefreshCcw className="mr-2 h-4 w-4" />
                                )}
                                Charger / actualiser
                            </Button>
                        </div>

                        {error && (
                            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                                {error}
                            </div>
                        )}

                        {resourceSaved && (
                            <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4 text-sm text-green-600 dark:text-green-400">
                                <CheckCircle className="mr-2 inline h-4 w-4" />
                                PDF enregistré dans les ressources du Prosit.
                            </div>
                        )}

                        {!job && status === 'idle' && !error && (
                            <p className="text-sm text-muted-foreground">
                                Aucun travail actif. Lancez une génération
                                depuis{' '}
                                <Link
                                    href="/cers/generate"
                                    className="font-medium text-primary underline"
                                >
                                    Générer un CER
                                </Link>{' '}
                                ou consultez{' '}
                                <Link
                                    href={cers.all().url}
                                    className="font-medium text-primary underline"
                                >
                                    Cahiers générés
                                </Link>
                                .
                            </p>
                        )}

                        {job && (
                            <div className="space-y-4 rounded-xl border bg-card p-4">
                                <div className="flex flex-wrap items-center gap-3">
                                    <code className="rounded-md bg-muted px-2 py-1 text-xs">
                                        {job.id}
                                    </code>
                                    <span
                                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                                            job.status === 'completed'
                                                ? 'bg-green-500/10 text-green-700'
                                                : job.status === 'failed'
                                                  ? 'bg-destructive/10 text-destructive'
                                                  : 'bg-primary/10 text-primary'
                                        }`}
                                    >
                                        {job.status}
                                        {isActive && (
                                            <LoaderCircle className="ml-1 inline h-3 w-3 animate-spin" />
                                        )}
                                    </span>
                                </div>

                                {(job.progress || job.error) && (
                                    <p className="text-sm text-muted-foreground">
                                        {job.progress || job.error}
                                    </p>
                                )}

                                {job.status === 'completed' && job.id && (
                                    <div className="space-y-3">
                                        {!job.result?.pdf_ready && (
                                            <p className="text-sm text-amber-700 dark:text-amber-400">
                                                PDF non disponible — utilisez
                                                LaTeX ou ZIP.
                                            </p>
                                        )}
                                        <div className="flex flex-wrap gap-3">
                                            <Button
                                                asChild
                                                variant="outline"
                                                className="rounded-2xl"
                                                disabled={
                                                    !job.result?.pdf_ready
                                                }
                                            >
                                                <a
                                                    href={jobDownloadUrl(
                                                        job.id,
                                                        'pdf',
                                                    )}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    <Download className="mr-2 h-4 w-4" />
                                                    PDF
                                                </a>
                                            </Button>
                                            <Button
                                                asChild
                                                variant="outline"
                                                className="rounded-2xl"
                                            >
                                                <a
                                                    href={jobDownloadUrl(
                                                        job.id,
                                                        'zip',
                                                    )}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    <Download className="mr-2 h-4 w-4" />
                                                    ZIP
                                                </a>
                                            </Button>
                                            <Button
                                                asChild
                                                variant="outline"
                                                className="rounded-2xl"
                                            >
                                                <a
                                                    href={jobDownloadUrl(
                                                        job.id,
                                                        'latex',
                                                    )}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    <Download className="mr-2 h-4 w-4" />
                                                    LaTeX
                                                </a>
                                            </Button>
                                        </div>
                                        {job.result?.compile_log && (
                                            <pre className="max-h-64 overflow-auto rounded-xl bg-muted p-4 text-xs">
                                                {job.result.compile_log}
                                            </pre>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

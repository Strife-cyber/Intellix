const API = '/api';

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

export type Job = {
  id: string;
  kind: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress?: string;
  error?: string;
  result?: {
    prosit?: Prosit;
    output_dir?: string;
    zip_path?: string;
    combined_latex_path?: string;
    pdf_path?: string;
    pdf_ready?: boolean;
    compile_log?: string;
  };
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function listProsits(): Promise<StoredProsit[]> {
  const data = await request<{ prosits: StoredProsit[] }>('/prosits');
  return data.prosits ?? [];
}

export async function uploadProsit(file: File, displayName?: string): Promise<StoredProsit> {
  const form = new FormData();
  form.append('file', file);
  if (displayName?.trim()) {
    form.append('filename', displayName.trim());
  }
  return request<StoredProsit>('/prosits', { method: 'POST', body: form });
}

export async function renameProsit(id: string, filename: string): Promise<StoredProsit> {
  return request<StoredProsit>(`/prosits/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename }),
  });
}

export async function getProsit(id: string): Promise<StoredProsit> {
  return request<StoredProsit>(`/prosits/${id}`);
}

export async function deleteProsit(id: string): Promise<void> {
  await request<void>(`/prosits/${id}`, { method: 'DELETE' });
}

export async function listThemes(): Promise<string[]> {
  const data = await request<{ themes: string[] }>('/themes');
  return data.themes ?? [];
}

export async function startCERJob(body: Record<string, unknown>): Promise<Job> {
  return request<Job>('/jobs/cer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function getJob(id: string): Promise<Job> {
  return request<Job>(`/jobs/${id}`);
}

export function jobDownloadUrl(id: string, kind: 'zip' | 'pdf' | 'latex'): string {
  const suffix = kind === 'zip' ? 'download' : kind;
  return `${API}/jobs/${id}/${suffix}`;
}

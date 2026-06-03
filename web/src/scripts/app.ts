import {
  getJob,
  getProsit,
  jobDownloadUrl,
  listProsits,
  listThemes,
  renameProsit,
  startCERJob,
  uploadProsit,
  type Job,
  type Prosit,
  type StoredProsit,
} from '../lib/api';

const SECTION_LABELS: Record<string, string> = {
  keywords: 'Mots clés',
  context: 'Contexte',
  needs: 'Besoins',
  constraints: 'Contraintes',
  problems: 'Problématique',
  generalisation: 'Généralisation',
  pistes: 'Pistes de solutions',
  plan: "Plan d'action",
};

let selectedProsit: StoredProsit | null = null;
let activeJobId: string | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let pendingUploadFile: File | null = null;
let renameTargetId: string | null = null;

const lists = {
  objectifs: [] as string[],
  difficulties: [] as string[],
  perspectives: [] as string[],
};

function $(id: string) {
  return document.getElementById(id)!;
}

function setStatus(
  elId: string,
  text: string,
  kind: 'default' | 'error' | 'success' | 'info' | 'warn' = 'default',
) {
  const el = $(elId);
  el.textContent = text;
  el.classList.remove('error', 'success', 'info', 'warn');
  if (kind !== 'default') el.classList.add(kind);
}

function displayNameWithoutExt(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot > 0 ? filename.slice(0, dot) : filename;
}

function showTab(name: string) {
  document.querySelectorAll('.tab').forEach((t) => {
    t.classList.toggle('active', (t as HTMLElement).dataset.tab === name);
  });
  document.querySelectorAll('.panel').forEach((p) => {
    p.classList.toggle('active', p.id === `panel-${name}`);
  });
}

function renderSections(prosit: Prosit, filename: string) {
  const card = $('sections-card');
  card.classList.remove('hidden');
  $('sections-filename').textContent = filename;
  const grid = $('sections-grid');
  grid.innerHTML = '';

  for (const [key, label] of Object.entries(SECTION_LABELS)) {
    const val = prosit[key as keyof Prosit];
    const block = document.createElement('div');
    block.className = 'section-block';
    block.innerHTML = `<h4>${label}</h4>`;
    if (Array.isArray(val) && val.length) {
      const ul = document.createElement('ul');
      val.forEach((item) => {
        const li = document.createElement('li');
        li.textContent = item;
        ul.appendChild(li);
      });
      block.appendChild(ul);
    } else if (typeof val === 'string' && val.trim()) {
      const p = document.createElement('p');
      p.textContent = val;
      block.appendChild(p);
    } else {
      const p = document.createElement('p');
      p.className = 'empty';
      p.textContent = '— vide —';
      block.appendChild(p);
    }
    grid.appendChild(block);
  }
}

function openRenameModal(p: StoredProsit) {
  renameTargetId = p.id;
  ($('rename-filename') as HTMLInputElement).value = displayNameWithoutExt(p.filename);
  $('rename-modal').classList.remove('hidden');
  ($('rename-filename') as HTMLInputElement).focus();
  ($('rename-filename') as HTMLInputElement).select();
}

function closeRenameModal() {
  renameTargetId = null;
  $('rename-modal').classList.add('hidden');
}

function buildPrositListItem(p: StoredProsit): HTMLLIElement {
  const li = document.createElement('li');
  li.className =
    'prosit-item' + (selectedProsit?.id === p.id ? ' selected active' : '');

  const body = document.createElement('div');
  body.className = 'prosit-item-body';
  const name = document.createElement('div');
  name.className = 'prosit-item-name';
  name.textContent = p.filename;
  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.textContent = new Date(p.uploaded_at).toLocaleString('fr-FR');
  body.append(name, meta);

  const actions = document.createElement('div');
  actions.className = 'prosit-item-actions';

  const renameBtn = document.createElement('button');
  renameBtn.type = 'button';
  renameBtn.className = 'btn btn-ghost btn-icon';
  renameBtn.setAttribute('aria-label', 'Renommer');
  renameBtn.title = 'Renommer';
  renameBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
  renameBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openRenameModal(p);
  });

  actions.append(renameBtn);
  li.append(body, actions);
  li.addEventListener('click', () => void selectStored(p));
  return li;
}

async function refreshPrositList() {
  const list = $('prosit-list');
  list.innerHTML = '';
  try {
    const prosits = await listProsits();
    const select = $('cer-prosit') as HTMLSelectElement;
    const current = select.value;
    select.innerHTML = '<option value="">— Choisir —</option>';
    prosits.sort(
      (a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime(),
    );
    if (prosits.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'prosit-list-empty';
      empty.textContent = 'Aucun fichier — importez un PROSIT pour commencer.';
      list.appendChild(empty);
    } else {
      for (const p of prosits) {
        list.appendChild(buildPrositListItem(p));
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.filename;
        select.appendChild(opt);
      }
    }
    if (current) select.value = current;
  } catch (e) {
    const err = document.createElement('li');
    err.className = 'prosit-list-empty';
    err.style.color = 'var(--danger)';
    err.textContent = (e as Error).message;
    list.appendChild(err);
  }
}

async function selectStored(p: StoredProsit) {
  selectedProsit = await getProsit(p.id);
  renderSections(selectedProsit.prosit, selectedProsit.filename);
  ($('cer-prosit') as HTMLSelectElement).value = p.id;
  await refreshPrositList();
}

function showUploadDialog(file: File) {
  pendingUploadFile = file;
  const input = $('upload-filename') as HTMLInputElement;
  input.value = displayNameWithoutExt(file.name);
  $('upload-dialog').classList.remove('hidden');
  input.focus();
  input.select();
}

function hideUploadDialog() {
  pendingUploadFile = null;
  $('upload-dialog').classList.add('hidden');
  ($('file-input') as HTMLInputElement).value = '';
  ($('upload-filename') as HTMLInputElement).value = '';
  setStatus('upload-status', '');
}

async function handleUpload(file: File, displayName: string) {
  hideUploadDialog();
  setStatus('upload-status', 'Extraction en cours…', 'info');
  try {
    const stored = await uploadProsit(file, displayName);
    setStatus('upload-status', `Enregistré : ${stored.filename}`, 'success');
    await selectStored(stored);
    await refreshPrositList();
  } catch (e) {
    setStatus('upload-status', (e as Error).message, 'error');
  }
}

function setupDropzone() {
  const dz = $('dropzone');
  const input = $('file-input') as HTMLInputElement;

  dz.addEventListener('click', () => input.click());
  dz.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      input.click();
    }
  });

  input.addEventListener('change', () => {
    const f = input.files?.[0];
    if (f) showUploadDialog(f);
  });

  dz.addEventListener('dragover', (e) => {
    e.preventDefault();
    dz.classList.add('dragover');
  });
  dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
  dz.addEventListener('drop', (e) => {
    e.preventDefault();
    dz.classList.remove('dragover');
    const f = e.dataTransfer?.files?.[0];
    if (f) showUploadDialog(f);
  });

  $('btn-upload-confirm').addEventListener('click', () => {
    if (!pendingUploadFile) return;
    const name = ($('upload-filename') as HTMLInputElement).value.trim();
    void handleUpload(pendingUploadFile, name || pendingUploadFile.name);
  });

  $('btn-upload-cancel').addEventListener('click', hideUploadDialog);
}

function setupRenameModal() {
  $('btn-rename-cancel').addEventListener('click', closeRenameModal);
  $('rename-modal').addEventListener('click', (e) => {
    if (e.target === $('rename-modal')) closeRenameModal();
  });

  $('btn-rename-save').addEventListener('click', async () => {
    if (!renameTargetId) return;
    const name = ($('rename-filename') as HTMLInputElement).value.trim();
    if (!name) return;
    try {
      const updated = await renameProsit(renameTargetId, name);
      if (selectedProsit?.id === updated.id) {
        selectedProsit = updated;
        renderSections(updated.prosit, updated.filename);
      }
      closeRenameModal();
      await refreshPrositList();
      const sel = $('cer-prosit') as HTMLSelectElement;
      if (sel.value === updated.id) {
        sel.querySelector(`option[value="${updated.id}"]`)!.textContent = updated.filename;
      }
    } catch (e) {
      alert((e as Error).message);
    }
  });

  ($('rename-filename') as HTMLInputElement).addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('btn-rename-save').click();
    if (e.key === 'Escape') closeRenameModal();
  });
}

function renderTagList(key: keyof typeof lists, containerId: string) {
  const el = $(containerId);
  el.innerHTML = '';
  lists[key].forEach((text, i) => {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.innerHTML = `${text} <button type="button" aria-label="Supprimer">×</button>`;
    tag.querySelector('button')!.addEventListener('click', () => {
      lists[key].splice(i, 1);
      renderTagList(key, containerId);
    });
    el.appendChild(tag);
  });
}

function setupListInputs() {
  document.querySelectorAll('[data-add]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = (btn as HTMLElement).dataset.add as keyof typeof lists;
      const inputId =
        key === 'objectifs'
          ? 'input-objectif'
          : key === 'difficulties'
            ? 'input-difficulty'
            : 'input-perspective';
      const input = $(inputId) as HTMLInputElement;
      const v = input.value.trim();
      if (!v) return;
      lists[key].push(v);
      input.value = '';
      renderTagList(
        key,
        key === 'objectifs'
          ? 'list-objectifs'
          : key === 'difficulties'
            ? 'list-difficulties'
            : 'list-perspectives',
      );
    });
  });

  ['input-objectif', 'input-difficulty', 'input-perspective'].forEach((id) => {
    $(id).addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const map: Record<string, string> = {
        'input-objectif': 'objectifs',
        'input-difficulty': 'difficulties',
        'input-perspective': 'perspectives',
      };
      const key = map[id] as keyof typeof lists;
      document.querySelector(`[data-add="${key}"]`)?.dispatchEvent(new Event('click'));
    });
  });
}

async function loadThemes() {
  const sel = $('cer-theme') as HTMLSelectElement;
  try {
    const themes = await listThemes();
    themes.sort();
    sel.innerHTML = themes.map((t) => `<option value="${t}">${t}</option>`).join('');
    sel.value = themes.includes('coffee') ? 'coffee' : themes[0];
  } catch {
    sel.innerHTML = '<option value="coffee">coffee</option>';
  }
}

async function resolvePrositForCER(): Promise<Prosit | null> {
  const id = ($('cer-prosit') as HTMLSelectElement).value;
  if (id) {
    const s = await getProsit(id);
    return s.prosit;
  }
  return selectedProsit?.prosit ?? null;
}

function showJob(job: Job) {
  $('no-job').classList.add('hidden');
  $('job-detail').classList.remove('hidden');
  $('job-id').textContent = job.id;
  const pill = $('job-status');
  pill.textContent = job.status;
  pill.className = 'status-pill status-' + job.status;
  setStatus('job-progress', job.progress || job.error || '');

  const actions = $('job-actions');
  const logBox = $('compile-log');

  if (job.status === 'completed' && job.result) {
    actions.classList.remove('hidden');
    ($('dl-zip') as HTMLAnchorElement).href = jobDownloadUrl(job.id, 'zip');
    ($('dl-latex') as HTMLAnchorElement).href = jobDownloadUrl(job.id, 'latex');
    ($('dl-pdf') as HTMLAnchorElement).href = jobDownloadUrl(job.id, 'pdf');

    if (job.result.pdf_ready) {
      setStatus('pdf-hint', '');
      ($('dl-pdf') as HTMLAnchorElement).classList.remove('hidden');
      ($('dl-pdf') as HTMLAnchorElement).style.opacity = '';
    } else {
      setStatus(
        'pdf-hint',
        'PDF non généré (pdflatex absent ou erreurs LaTeX). Téléchargez le LaTeX combiné ou le ZIP.',
        'warn',
      );
      ($('dl-pdf') as HTMLAnchorElement).style.opacity = '0.5';
    }
    if (job.result.compile_log) {
      logBox.classList.remove('hidden');
      logBox.textContent = job.result.compile_log;
    }
  } else {
    actions.classList.add('hidden');
    setStatus('pdf-hint', '');
    logBox.classList.add('hidden');
  }
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function startPolling(jobId: string) {
  activeJobId = jobId;
  stopPolling();
  showTab('jobs');
  pollTimer = setInterval(async () => {
    try {
      const job = await getJob(jobId);
      showJob(job);
      if (job.status === 'completed' || job.status === 'failed') {
        stopPolling();
      }
    } catch {
      stopPolling();
    }
  }, 2000);
  void getJob(jobId).then(showJob);
}

async function generateCER() {
  const prosit = await resolvePrositForCER();
  if (!prosit) {
    setStatus('generate-status', 'Choisissez ou importez un PROSIT.', 'error');
    return;
  }
  const title = ($('cer-title') as HTMLInputElement).value.trim();
  const description = ($('cer-description') as HTMLTextAreaElement).value.trim();
  if (!title || !description) {
    setStatus('generate-status', 'Titre et description requis.', 'error');
    return;
  }

  $('btn-generate').setAttribute('disabled', 'true');
  setStatus('generate-status', "Mise en file d'attente…", 'info');

  try {
    const job = await startCERJob({
      prosit,
      title,
      description,
      version: parseFloat(($('cer-version') as HTMLInputElement).value) || 1,
      theme: ($('cer-theme') as HTMLSelectElement).value,
      template_id: 'default',
      objectifs: lists.objectifs,
      difficulties: lists.difficulties,
      perspectives: lists.perspectives,
    });
    setStatus('generate-status', `Job ${job.id} démarré.`, 'success');
    startPolling(job.id);
  } catch (e) {
    setStatus('generate-status', (e as Error).message, 'error');
  } finally {
    $('btn-generate').removeAttribute('disabled');
  }
}

function setupTabs() {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      showTab((tab as HTMLElement).dataset.tab!);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  setupDropzone();
  setupRenameModal();
  setupListInputs();
  void loadThemes();
  void refreshPrositList();
  $('btn-generate').addEventListener('click', () => void generateCER());

  ($('cer-prosit') as HTMLSelectElement).addEventListener('change', async () => {
    const id = ($('cer-prosit') as HTMLSelectElement).value;
    if (id) {
      const s = await getProsit(id);
      await selectStored(s);
    }
  });
});

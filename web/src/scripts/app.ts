import {
  deleteProsit,
  getJob,
  getProsit,
  jobDownloadUrl,
  listProsits,
  listThemes,
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

const lists = {
  objectifs: [] as string[],
  difficulties: [] as string[],
  perspectives: [] as string[],
};

function $(id: string) {
  return document.getElementById(id)!;
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
      p.style.color = 'var(--muted)';
      p.textContent = '— vide —';
      block.appendChild(p);
    }
    grid.appendChild(block);
  }
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
    for (const p of prosits) {
      const li = document.createElement('li');
      li.className =
        'prosit-item' + (selectedProsit?.id === p.id ? ' selected' : '');
      li.innerHTML = `<div><strong>${p.filename}</strong><div class="meta">${new Date(p.uploaded_at).toLocaleString('fr-FR')}</div></div>`;
      li.addEventListener('click', () => selectStored(p));
      list.appendChild(li);

      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.filename;
      select.appendChild(opt);
    }
    if (current) select.value = current;
  } catch (e) {
    list.innerHTML = `<li style="color:var(--danger)">${(e as Error).message}</li>`;
  }
}

async function selectStored(p: StoredProsit) {
  selectedProsit = await getProsit(p.id);
  renderSections(selectedProsit.prosit, selectedProsit.filename);
  ($('cer-prosit') as HTMLSelectElement).value = p.id;
  await refreshPrositList();
}

async function handleUpload(file: File) {
  $('upload-status').textContent = 'Extraction en cours…';
  try {
    const stored = await uploadProsit(file);
    $('upload-status').textContent = `Enregistré : ${stored.filename}`;
    await selectStored(stored);
    await refreshPrositList();
  } catch (e) {
    $('upload-status').textContent = (e as Error).message;
    $('upload-status').style.color = 'var(--danger)';
  }
}

function setupDropzone() {
  const dz = $('dropzone');
  const input = $('file-input') as HTMLInputElement;
  dz.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    const f = input.files?.[0];
    if (f) void handleUpload(f);
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
    if (f) void handleUpload(f);
  });
}

function renderTagList(key: keyof typeof lists, containerId: string) {
  const el = $(containerId);
  el.innerHTML = '';
  lists[key].forEach((text, i) => {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.innerHTML = `${text} <button type="button" aria-label="remove">×</button>`;
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
}

async function loadThemes() {
  const sel = $('cer-theme') as HTMLSelectElement;
  try {
    const themes = await listThemes();
    themes.sort();
    sel.innerHTML = themes
      .map((t) => `<option value="${t}">${t}</option>`)
      .join('');
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
  $('job-progress').textContent = job.progress || job.error || '';

  const actions = $('job-actions');
  const logBox = $('compile-log');
  const hint = $('pdf-hint');

  if (job.status === 'completed' && job.result) {
    actions.classList.remove('hidden');
    ($('dl-zip') as HTMLAnchorElement).href = jobDownloadUrl(job.id, 'zip');
    ($('dl-latex') as HTMLAnchorElement).href = jobDownloadUrl(job.id, 'latex');
    ($('dl-pdf') as HTMLAnchorElement).href = jobDownloadUrl(job.id, 'pdf');

    if (job.result.pdf_ready) {
      hint.textContent = '';
      ($('dl-pdf') as HTMLAnchorElement).classList.remove('hidden');
    } else {
      hint.textContent =
        'PDF non généré (pdflatex absent ou erreurs LaTeX). Téléchargez le LaTeX combiné ou le ZIP.';
      ($('dl-pdf') as HTMLAnchorElement).style.opacity = '0.5';
    }
    if (job.result.compile_log) {
      logBox.classList.remove('hidden');
      logBox.textContent = job.result.compile_log;
    }
  } else {
    actions.classList.add('hidden');
    hint.textContent = '';
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
    $('generate-status').textContent = 'Choisissez ou importez un PROSIT.';
    return;
  }
  const title = ($('cer-title') as HTMLInputElement).value.trim();
  const description = ($('cer-description') as HTMLTextAreaElement).value.trim();
  if (!title || !description) {
    $('generate-status').textContent = 'Titre et description requis.';
    return;
  }

  $('btn-generate').setAttribute('disabled', 'true');
  $('generate-status').textContent = 'Mise en file d\'attente…';

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
    $('generate-status').textContent = `Job ${job.id} démarré.`;
    startPolling(job.id);
  } catch (e) {
    $('generate-status').textContent = (e as Error).message;
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

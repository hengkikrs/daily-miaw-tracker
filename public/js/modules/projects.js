// Tracker Daily — projects
// Dipisah dari public/app.js (refactor modular; tidak ada identifier yang di-rename).
// Classic script — urutan load: lihat <script> di public/index.html.
'use strict';


/* ============ MODUL PROJECT (proyek mandiri: task, notes, files) ============ */
const PROJ_STORE_KEY = 'miaw-tracker.projects.v1';
// Namespace lama (pra-penyelarasan). Dibaca sebagai fallback, lalu disalin ke kunci baru sekali.
const PROJ_STORE_LEGACY_KEY = 'proj-' + 'tracker.projects.v1';
const PROJ_STATUS = {
  planning: { label: 'Planning', color: 'var(--st-planning)' },
  active: { label: 'Active', color: 'var(--st-active)' },
  onhold: { label: 'On Hold', color: 'var(--st-onhold)' },
  completed: { label: 'Completed', color: 'var(--st-completed)' },
  archived: { label: 'Archived', color: 'var(--st-archived)' },
};
const PROJ_ICONS = ['🧩', '🚀', '🏗️', '💻', '📣', '🎨', '📚', '🏠', '💼', '🌱'];
// Palet warna project (disimpan per project) — keluarga warna hangat.
const PROJ_COLORS = ['#16A34A', '#475569', '#D97706', '#22C55E', '#64748B', '#94A3B8', '#15803D', '#CBD5E1'];
// Warna lama (pra ui61) dipetakan ke palet baru agar data tersimpan tetap senada.
const PROJ_COLOR_LEGACY = {
  '#3f9d63': '#16A34A', '#ea8a2f': '#D97706', '#2f8fbf': '#475569', '#8b7bb8': '#64748B',
  '#d4576b': '#64748B', '#3f9a8f': '#22C55E', '#9a8452': '#94A3B8', '#9a917f': '#94A3B8',
};
function projColor(project) {
  const c = (project && project.color) || PROJ_COLORS[0];
  return PROJ_COLOR_LEGACY[c] || c;
}
const PROJ_FILTERS = [
  { key: 'all', label: 'Semua' },
  { key: 'active', label: 'Aktif' },
  { key: 'completed', label: 'Selesai' },
  { key: 'archived', label: 'Diarsipkan' },
];
const PROJ_TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'task', label: 'Task' },
  { key: 'notes', label: 'Notes' },
  { key: 'files', label: 'Files' },
];
let projPage = 'list';
let projFilter = 'all';
let projSearch = '';
let projDetailId = null;
let projTab = 'overview';
let projTaskFilter = 'all';
let projMenuOpen = false;
let projFormId = null;         // null = tambah baru, id = edit
let projFormSel = { status: 'active', icon: '🧩', color: '#16A34A' };
let projFormSelId = null;      // project yang sedang diinisialisasi pilihan form-nya
let projTaskEditId = null;     // id project task yang sedang diubah inline
let projFormDraft = { name: '', description: '', category: '', start: '', deadline: '', goalId: '', err: '' };
let projTaskAdding = false;
let projNoteAdding = false;
let projFileAdding = false;
let projFileErr = '';

function projSeed() {
  const today = taskTodayIso();
  const y = today.slice(0, 4);
  const m = today.slice(5, 7);
  const day = (n) => `${y}-${m}-${String(n).padStart(2, '0')}`;
  return [
    { id: 'p1', name: 'Marketing Batu Bata', icon: '📣', color: '#D97706', category: 'Bisnis', status: 'active', goalId: 'g1',
      start: day(1), deadline: day(20), createdAt: day(1),
      description: 'Kampanye pemasaran digital untuk toko batu bata: landing page, iklan, dan follow-up pelanggan.',
      milestones: [
        { id: 'pm1', text: 'Riset pasar & kompetitor', done: true },
        { id: 'pm2', text: 'Landing page online', done: true },
        { id: 'pm3', text: 'Iklan jalan konsisten', done: false },
        { id: 'pm4', text: 'Evaluasi ROI kampanye', done: false },
      ],
      notes: [
        { id: 'pn1', text: 'CTA utama pakai tombol WhatsApp, harga nego dibuka.', at: Date.now() - 2 * 86400000 },
        { id: 'pn2', text: 'Follow-up maksimal H+1 setelah leads masuk.', at: Date.now() - 5 * 3600000 },
      ],
      files: [
        { id: 'pf1', name: 'Brief kampanye v2.pdf', url: 'https://example.com/brief-kampanye.pdf' },
        { id: 'pf2', name: 'Desain banner (Figma)', url: 'https://figma.com/file/batu-bata-banner' },
      ],
      activity: [] },
    { id: 'p2', name: 'Website Toko Online', icon: '💻', color: '#475569', category: 'Teknis', status: 'active', goalId: 'g1',
      start: day(5), deadline: day(28), createdAt: day(5),
      description: 'Bangun website toko online lengkap dengan katalog, keranjang, dan pembayaran.',
      milestones: [
        { id: 'pm5', text: 'Struktur & database katalog', done: true },
        { id: 'pm6', text: 'Halaman checkout', done: false },
        { id: 'pm7', text: 'Integrasi pembayaran', done: false },
      ],
      notes: [{ id: 'pn3', text: 'Pakai domain .co.id, hosting di VPS lama.', at: Date.now() - 86400000 }],
      files: [{ id: 'pf3', name: 'Arsitektur sistem.md', url: 'https://example.com/arsitektur.md' }],
      activity: [] },
    { id: 'p3', name: 'Renovasi Dapur', icon: '🏠', color: '#16A34A', category: 'Rumah', status: 'onhold', goalId: 'g3',
      start: day(2), deadline: `${y}-${m}-25`, createdAt: day(2),
      description: 'Perbaikan kabinet, keramik, dan sirkulasi udara dapur.',
      milestones: [
        { id: 'pm8', text: 'Kontraktor & RAB disetujui', done: true },
        { id: 'pm9', text: 'Bongkar kabinet lama', done: false },
      ],
      notes: [], files: [], activity: [] },
    { id: 'p4', name: 'Skripsi Data Science', icon: '📚', color: '#94A3B8', category: 'Pendidikan', status: 'planning', goalId: 'g2',
      start: day(15), deadline: `${y}-12-15`, createdAt: today,
      description: 'Penelitian prediksi harga komoditas dengan machine learning.',
      milestones: [
        { id: 'pm10', text: 'Judul & proposal disetujui', done: false },
        { id: 'pm11', text: 'Pengumpulan dataset', done: false },
      ],
      notes: [{ id: 'pn4', text: 'Konsultasi dosen pembimbing tiap Selasa.', at: Date.now() - 3 * 86400000 }],
      files: [], activity: [] },
    { id: 'p5', name: 'Otomasi Laporan Bulanan', icon: '🤖', color: '#22C55E', category: 'Produktivitas', status: 'completed', goalId: 'g2',
      start: day(1), deadline: day(8), createdAt: day(1),
      description: 'Script Python yang menyusun laporan penjualan otomatis tiap awal bulan.',
      milestones: [
        { id: 'pm12', text: 'Ekstrak data penjualan', done: true },
        { id: 'pm13', text: 'Template PDF otomatis', done: true },
        { id: 'pm14', text: 'Jadwal cron jalan', done: true },
      ],
      notes: [], files: [{ id: 'pf4', name: 'repo: laporan-bot', url: 'https://github.com/contoh/laporan-bot' }], activity: [] },
    { id: 'p6', name: 'Event Workshop 2025', icon: '🎨', color: '#64748B', category: 'Acara', status: 'archived', goalId: 'g4',
      start: `${y}-06-01`, deadline: `${y}-07-30`, createdAt: today,
      description: 'Workshop desain untuk komunitas lokal (sudah selesai,arsip).',
      milestones: [], notes: [], files: [], activity: [] },
  ];
}

function loadProjects() {
  // Migrasi lunak: bila kunci baru belum ada tapi kunci namespace lama ada, salin sekali.
  try {
    const nk = scopedKey(PROJ_STORE_KEY);
    const lk = scopedKey(PROJ_STORE_LEGACY_KEY);
    if (!localStorage.getItem(nk) && localStorage.getItem(lk)) {
      localStorage.setItem(nk, localStorage.getItem(lk));
    }
  } catch { /* ignore */ }

  let raw = null;
  try {
    raw = JSON.parse(localStorage.getItem(scopedKey(PROJ_STORE_KEY)) || 'null');
  } catch { raw = null; }

  if (Array.isArray(raw) && raw.length) {
    // Penautan otomatis goal lama. Blok ini dipisah try/catch SENDIRI: kalau gagal
    // (mis. goals.js belum dimuat), data pengguna tetap dikembalikan apa adanya —
    // sebelumnya kegagalan di sini jatuh ke cabang seed dan MENIMPA seluruh data project.
    try {
      let changed = false;
      const goals = loadGoals();
      raw.forEach((p) => {
        if (!p.goalId) {
          const guess = goals.find((g) => (g.project || '').toLowerCase() === p.name.toLowerCase()) || goals.find((g) => g.status === 'aktif');
          if (guess) { p.goalId = guess.id; changed = true; }
        }
      });
      if (changed) localStorage.setItem(scopedKey(PROJ_STORE_KEY), JSON.stringify(raw));
    } catch { /* biarkan data tersimpan tanpa penautan */ }
    return raw;
  }
  if (!demoSeedEnabled()) return [];
  const seed = projSeed();
  try { localStorage.setItem(scopedKey(PROJ_STORE_KEY), JSON.stringify(seed)); } catch { /* ignore */ }
  return seed;
}

function goalTitleOf(id) { const g = loadGoals().find((x) => x.id === id); return g ? g.title : ''; }

function saveProjects(list) {
  try { localStorage.setItem(scopedKey(PROJ_STORE_KEY), JSON.stringify(list)); } catch { /* ignore */ }
  if (typeof queueRemoteSave === 'function') queueRemoteSave();
}

function projTasks(name) {
  return loadTasks().filter((t) => (t.project || '').trim().toLowerCase() === name.trim().toLowerCase());
}

function projProgress(p) {
  const ts = projTasks(p.name);
  if (ts.length) {
    const done = ts.filter((t) => t.done === true || t.status === 'done' || t.status === 'selesai').length;
    return { done, total: ts.length, pct: Math.round((done / ts.length) * 100), from: 'task' };
  }
  const ms = p.milestones || [];
  const done = ms.filter((x) => x.done).length;
  return { done, total: ms.length, pct: ms.length ? Math.round((done / ms.length) * 100) : (p.status === 'completed' ? 100 : 0), from: 'milestone' };
}

function projDaysLeft(p) {
  if (!p.deadline) return null;
  const d = new Date(`${p.deadline}T23:59:59`);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

function projLog(p, text) {
  p.activity = p.activity || [];
  p.activity.unshift({ text, at: Date.now() });
  if (p.activity.length > 30) p.activity.length = 30;
}

function projTimeAgo(at) {
  const diff = Date.now() - at;
  if (diff < 3600000) return `${Math.max(1, Math.round(diff / 60000))} mnt lalu`;
  if (diff < 86400000) return `${Math.round(diff / 3600000)} jam lalu`;
  if (diff < 7 * 86400000) return `${Math.round(diff / 86400000)} hari lalu`;
  return taskDateRead(new Date(at).toISOString().slice(0, 10));
}

function projDeadlineLabel(p) {
  const left = projDaysLeft(p);
  if (left === null) return '<span class="proj-dl none">Tanpa deadline</span>';
  if (p.status === 'completed' || p.status === 'archived') return `<span class="proj-dl done">Selesai · ${escapeHtml(taskDateRead(p.deadline))}</span>`;
  if (left < 0) return `<span class="proj-dl late">Lewat ${Math.abs(left)} hari</span>`;
  if (left === 0) return '<span class="proj-dl soon">Deadline hari ini</span>';
  if (left <= 7) return `<span class="proj-dl soon">${left} hari lagi</span>`;
  return `<span class="proj-dl">Sampai ${escapeHtml(taskDateRead(p.deadline))}</span>`;
}

function projStatusChip(status) {
  const s = PROJ_STATUS[status] || PROJ_STATUS.planning;
  return `<span class="proj-status" style="--pc:${s.color}">${s.label}</span>`;
}

function projNameOptions(selected) {
  const ps = loadProjects().filter((p) => p.status !== 'archived');
  const names = ps.map((p) => p.name);
  let opts = names.map((n) => `<option value="${escapeHtml(n)}" ${n === selected ? 'selected' : ''}>${escapeHtml(n)}</option>`).join('');
  if (selected && !names.includes(selected)) opts = `<option value="${escapeHtml(selected)}" selected>${escapeHtml(selected)} (lama)</option>` + opts;
  return opts;
}
function firstProjName() { const ps = loadProjects().filter((p) => p.status !== 'archived'); return ps.length ? ps[0].name : ''; }

function projCardHtml(p) {
  const pr = projProgress(p);
  const gt = goalTitleOf(p.goalId);
  return `<button type="button" class="proj-card" data-proj-open="${p.id}">
      <span class="proj-ico" style="--pc:${projColor(p)}">${p.icon || '🧩'}</span>
      <span class="proj-card-main">
        <span class="proj-card-head"><span class="proj-card-title">${escapeHtml(p.name)}</span>${projStatusChip(p.status)}</span>
        <span class="proj-card-desc">${gt ? `🎯 ${escapeHtml(gt)} · ` : ''}${escapeHtml(p.description || 'Tanpa deskripsi')}</span>
        <span class="goal-bar"><span style="width:${pr.pct}%;background:${projColor(p)}"></span></span>
        <span class="proj-card-sub"><span>${pr.done}/${pr.total} ${pr.from === 'task' ? 'task' : 'milestone'} · ${pr.pct}%</span>${projDeadlineLabel(p)}</span>
      </span>
      <span class="goal-chev">›</span>
    </button>`;
}

function renderProjectListPage() {
  const all = loadProjects();
  const active = all.filter((p) => p.status === 'active').length;
  const done = all.filter((p) => p.status === 'completed').length;
  const soon = all.filter((p) => { const l = projDaysLeft(p); return p.status === 'active' && l !== null && l >= 0 && l <= 7; }).length;
  let list = all.filter((p) => (projFilter === 'all' ? p.status !== 'archived' : p.status === projFilter));
  const q = projSearch.trim().toLowerCase();
  if (q) list = list.filter((p) => `${p.name} ${p.description || ''} ${p.category || ''}`.toLowerCase().includes(q));
  const chips = PROJ_FILTERS.map((f) => `<button type="button" class="goal-chip${projFilter === f.key ? ' on' : ''}" data-proj-filter="${f.key}">${f.label}</button>`).join('');
  const cards = list.length
    ? list.map(projCardHtml).join('')
    : `<div class="proj-empty"><span>${q ? '🔍' : '🗂️'}</span><b>${q ? 'Project tidak ditemukan' : 'Belum ada project'}</b><p>${q ? 'Coba kata kunci lain atau ubah filter.' : 'Tekan tombol + untuk membuat project pertamamu.'}</p></div>`;
  return `<div class="goals-page">
      <div class="proj-stat-row">
        <div class="proj-stat"><b>${active}</b><span>Project Aktif</span></div>
        <div class="proj-stat ok"><b>${done}</b><span>Selesai</span></div>
        <div class="proj-stat warn"><b>${soon}</b><span>Mendekati Deadline</span></div>
      </div>
      <label class="task-search proj-search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input type="search" data-proj-search placeholder="Cari project…" value="${escapeHtml(projSearch)}" autocomplete="off" /></label>
      <div class="goal-chips">${chips}</div>
      <div class="proj-list">${cards}</div>
      <button type="button" class="goal-add-btn" data-proj-add>+ Tambah Project</button>
    </div>`;
}

function renderProjectDetailPage() {
  const p = loadProjects().find((x) => x.id === projDetailId);
  if (!p) { projPage = 'list'; return renderProjectListPage(); }
  const pr = projProgress(p);
  const tabs = PROJ_TABS.map((t) => `<button type="button" class="jadwal-seg-btn proj-tab-btn${projTab === t.key ? ' active' : ''}" data-proj-tab="${t.key}">${t.label}</button>`).join('');
  let body = '';
  if (projTab === 'overview') {
    const left = projDaysLeft(p);
    const stats = `<div class="proj-stat-row">
        <div class="proj-stat"><b>${pr.pct}%</b><span>Progress</span></div>
        <div class="proj-stat ok"><b>${pr.done}/${pr.total}</b><span>Task selesai</span></div>
        <div class="proj-stat warn"><b>${left === null ? '—' : (left < 0 ? `${Math.abs(left)} lewat` : `${left} hr`)}</b><span>Sisa waktu</span></div>
      </div>`;
    const ms = (p.milestones || []).length
      ? `<div class="goal-detail-card proj-blk"><h4>Milestone</h4>${p.milestones.map((m) => `<label class="goal-ms${m.done ? ' done' : ''}"><input type="checkbox" data-proj-ms="${p.id}:${m.id}"${m.done ? ' checked' : ''} /><span>${escapeHtml(m.text)}</span></label>`).join('')}</div>`
      : `<div class="goal-detail-card proj-blk"><h4>Milestone</h4><p class="proj-hint">Belum ada milestone. Tambahkan lewat menu ⋮ → Edit, atau biarkan progress dihitung dari task.</p></div>`;
    const acts = (p.activity || []).length
      ? `<div class="goal-detail-card proj-blk"><h4>Aktivitas Terbaru</h4><div class="proj-act">${p.activity.slice(0, 8).map((a) => `<div class="proj-act-row"><span>${escapeHtml(a.text)}</span><em>${projTimeAgo(a.at)}</em></div>`).join('')}</div></div>`
      : `<div class="goal-detail-card proj-blk"><h4>Aktivitas Terbaru</h4><p class="proj-hint">Aktivitas akan tercatat saat kamu menambah task, catatan, atau menandai milestone.</p></div>`;
    body = `${stats}
      <div class="goal-detail-card proj-blk"><h4>Deskripsi</h4><p>${escapeHtml(p.description || '—')}</p></div>
      ${ms}${acts}`;
  } else if (projTab === 'task') {
    const ts = projTasks(p.name);
    const flt = projTaskFilter === 'done' ? ts.filter((t) => t.done) : projTaskFilter === 'open' ? ts.filter((t) => !t.done) : ts;
    const sub = `<div class="goal-chips">
        <button type="button" class="goal-chip${projTaskFilter === 'all' ? ' on' : ''}" data-proj-tfilter="all">Semua (${ts.length})</button>
        <button type="button" class="goal-chip${projTaskFilter === 'open' ? ' on' : ''}" data-proj-tfilter="open">Belum (${ts.filter((t) => !t.done).length})</button>
        <button type="button" class="goal-chip${projTaskFilter === 'done' ? ' on' : ''}" data-proj-tfilter="done">Selesai (${ts.filter((t) => t.done).length})</button>
      </div>`;
    const rows = flt.length
      ? flt.map((t) => `<div class="pt-row">${t.id === projTaskEditId ? ptEditFormHtml(t) : `<label class="proj-task${t.done ? ' done' : ''}"><input type="checkbox" data-proj-task="${t.id}"${t.done ? ' checked' : ''} /><span class="proj-task-main"><span class="proj-task-title">${escapeHtml(t.title)}</span><span class="proj-task-meta">${escapeHtml(taskDateRead(t.date || ''))}${ptBadge(t.priority)}</span></span></label><span class="dt-row-tools">${ptToolsHtml(t.id)}</span>`}</div>`).join('')
      : `<p class="proj-hint">${ts.length ? 'Tidak ada task pada filter ini.' : 'Belum ada task yang terhubung ke project ini.'}</p>`;
    const add = projTaskAdding
      ? `<form class="proj-inline" id="projTaskForm"><input name="title" placeholder="Judul task baru" required maxlength="90" /><input name="date" type="date" value="${taskTodayIso()}" /><button type="submit" class="proj-inline-go">Tambah</button></form>`
      : `<button type="button" class="goal-add-btn ghost" data-proj-task-add>+ Tambah Task</button>`;
    body = `${sub}<div class="goal-detail-card proj-blk">${rows}</div>${add}`;
  } else if (projTab === 'notes') {
    const notes = p.notes || [];
    const rows = notes.length
      ? notes.map((n) => `<div class="proj-note"><div class="goal-detail-card proj-blk note"><p>${escapeHtml(n.text)}</p><em>${projTimeAgo(n.at)}</em></div><button type="button" class="proj-del" data-proj-note-del="${n.id}" aria-label="Hapus catatan">×</button></div>`).join('')
      : '<p class="proj-hint">Belum ada catatan untuk project ini.</p>';
    const add = projNoteAdding
      ? `<form class="proj-inline col" id="projNoteForm"><textarea name="text" placeholder="Tulis catatan…" required maxlength="600" rows="3"></textarea><button type="submit" class="proj-inline-go">Simpan Catatan</button></form>`
      : `<button type="button" class="goal-add-btn ghost" data-proj-note-add>+ Tambah Catatan</button>`;
    body = `<div>${rows}</div>${add}`;
  } else {
    const files = p.files || [];
    const rows = files.length
      ? files.map((f) => `<div class="proj-file"><span class="proj-file-ico">🔗</span><a href="${escapeHtml(f.url || '#')}" target="_blank" rel="noopener">${escapeHtml(f.name)}</a><button type="button" class="proj-del" data-proj-file-del="${f.id}" aria-label="Hapus file">×</button></div>`).join('')
      : '<p class="proj-hint">Belum ada file atau link terkait.</p>';
    const add = projFileAdding
      ? `<div>${projFileErr ? `<p class="proj-err">${escapeHtml(projFileErr)}</p>` : ''}<form class="proj-inline col" id="projFileForm"><input name="name" placeholder="Nama file / link" required maxlength="80" /><input name="url" placeholder="https://…" required /><button type="submit" class="proj-inline-go">Simpan Link</button></form></div>`
      : `<button type="button" class="goal-add-btn ghost" data-proj-file-add>+ Tambah File/Link</button>`;
    body = `<div class="goal-detail-card proj-blk">${rows}</div>${add}`;
  }
  const menu = projMenuOpen
    ? `<div class="proj-menu"><button type="button" data-proj-edit="${p.id}">✏️ Edit Project</button><button type="button" data-proj-archive="${p.id}">${p.status === 'archived' ? '♻️ Pulihkan' : '🗄️ Arsipkan'}</button><button type="button" class="danger" data-proj-del="${p.id}">🗑️ Hapus</button></div>`
    : '';
  return `<div class="goals-page">
      <div class="task-detail-top">
        <button type="button" class="task-back" data-proj-back aria-label="Kembali">←</button>
        <span class="proj-ico lg" style="--pc:${p.color}">${p.icon || '🧩'}</span>
        <span class="proj-detail-title"><b>${escapeHtml(p.name)}</b><span>${projStatusChip(p.status)} ${p.category ? escapeHtml(p.category) : ''}</span></span>
        <button type="button" class="icon-button proj-menu-btn" data-proj-menu aria-label="Menu aksi">⋮</button>
      </div>
      ${menu}
      <div class="proj-meta-row"><span>📅 Mulai ${escapeHtml(taskDateRead(p.start || p.createdAt || ''))}</span><span>⏳ ${p.deadline ? escapeHtml(taskDateRead(p.deadline)) : '—'}</span><span>✅ ${pr.done}/${pr.total}</span></div>
      <div class="proj-status-row">
        <span class="proj-status-row-label">Status:</span>
        ${Object.entries(PROJ_STATUS).map(([k, s]) => `<button type="button" class="goal-cat-chip${p.status === k ? ' on' : ''}" data-proj-setstatus="${k}" title="Ubah status project"><span class="goal-cat-dot" style="background:${s.color}"></span>${s.label}</button>`).join('')}
      </div>
      ${p.goalId ? `<div class="proj-goal-row">🎯 Goal: <button type="button" class="goal-proj-chip link" data-goal-from-proj="${p.goalId}">${escapeHtml(goalTitleOf(p.goalId) || 'Goal (terhapus)')}</button></div>` : '<div class="proj-goal-row">🎯 Belum terhubung ke goal — edit project untuk memilih goal.</div>'}
      <div class="goal-bar big"><span style="width:${pr.pct}%;background:${projColor(p)}"></span></div>
      <div class="jadwal-seg proj-tabs">${tabs}</div>
      ${body}
    </div>`;
}

function renderProjectFormPage() {
  const editing = projFormId ? loadProjects().find((x) => x.id === projFormId) : null;
  // hanya inisialisasi sekali per project: kalau tidak, pilihan status/ikon/warna yang
  // baru diklik akan ter-reset setiap render (sebab status tidak bisa diubah).
  if (editing && projFormSelId !== editing.id) {
    projFormSel = { status: editing.status, icon: editing.icon || '🧩', color: editing.color || '#16A34A' };
    projFormSelId = editing.id;
  }
  const d = editing ? { name: editing.name, description: editing.description || '', category: editing.category || '', start: editing.start || '', deadline: editing.deadline || '', goalId: editing.goalId || '', err: '' } : projFormDraft;
  if (!editing) projFormDraft = d;
  const goals = loadGoals();
  const goalOptions = goals.map((g) => `<option value="${g.id}" ${d.goalId === g.id ? 'selected' : ''}>${escapeHtml(g.title)} · ${GOAL_TERMS[goalTermOf(g)].label}</option>`).join('');
  const icons = PROJ_ICONS.map((i) => `<button type="button" class="goal-cat-chip${projFormSel.icon === i ? ' on' : ''}" data-proj-icon="${i}" style="font-size:17px">${i}</button>`).join('');
  const colors = PROJ_COLORS.map((c) => `<button type="button" class="proj-color${projFormSel.color === c ? ' on' : ''}" data-proj-color="${c}" style="--cc:${c}" aria-label="warna ${c}"></button>`).join('');
  const statuses = Object.entries(PROJ_STATUS).map(([k, s]) => `<button type="button" class="goal-cat-chip${projFormSel.status === k ? ' on' : ''}" data-proj-status="${k}"><span class="goal-cat-dot" style="background:${s.color}"></span>${s.label}</button>`).join('');
  return `<div class="goals-page"><button type="button" class="goal-back-btn" data-proj-form-back>← Kembali</button>
    <div class="goal-add-card">
      <h3>${editing ? 'Edit Project' : 'Tambah Project'}</h3>
      ${d.err ? `<p class="proj-err">${escapeHtml(d.err)}</p>` : ''}
      <form id="projForm" novalidate>
        ${goals.length ? '<label class="goal-field"><span>Goals *</span><select name="goalId" required><option value="">— Pilih goal —</option>' + goalOptions + '</select></label>' : '<p class="proj-err">Belum ada Goals. Project tidak bisa dibuat tanpa goal — buat goal dulu di menu Goals.</p>'}
        <label class="goal-field"><span>Nama Project *</span><input name="name" required maxlength="70" value="${escapeHtml(d.name)}" placeholder="cth. Website Toko Online" /></label>
        <label class="goal-field"><span>Deskripsi</span><textarea name="description" rows="3" maxlength="400" placeholder="Ringkasan singkat project…">${escapeHtml(d.description)}</textarea></label>
        <div class="proj-form-grid"><label class="goal-field"><span>Tanggal Mulai</span><input name="start" type="date" value="${escapeHtml(d.start)}" /></label>
        <label class="goal-field"><span>Deadline</span><input name="deadline" type="date" value="${escapeHtml(d.deadline)}" /></label></div>
        <label class="goal-field"><span>Kategori</span><input name="category" maxlength="30" value="${escapeHtml(d.category)}" placeholder="cth. Bisnis, Belajar…" list="projCats" /><datalist id="projCats"><option value="Bisnis"></option><option value="Teknis"></option><option value="Pendidikan"></option><option value="Rumah"></option><option value="Acara"></option><option value="Keuangan"></option></datalist></label>
        <div class="goal-field"><span>Icon</span><div class="goal-cat-row">${icons}</div></div>
        <div class="goal-field"><span>Warna</span><div class="proj-colors">${colors}</div></div>
        <div class="goal-field"><span>Status</span><div class="goal-cat-row">${statuses}</div></div>
        <button type="submit" class="primary-button goal-save" ${goals.length ? '' : 'disabled'}>${editing ? 'Simpan Perubahan' : 'Simpan Project'}</button>
      </form>
    </div></div>`;
}

function renderProjectView() {
  if (projPage === 'form') return renderProjectFormPage();
  if (projPage === 'detail' && projDetailId) return renderProjectDetailPage();
  return renderProjectListPage();
}

function renderProjectTaskView() {
  const projects = loadProjects().filter((p) => p.status !== 'archived');
  const tasks = loadTasks();
  const nameOf = (t) => (t.project || '').trim();
  const groups = projects.map((p) => {
    const ts = tasks.filter((t) => nameOf(t).toLowerCase() === p.name.trim().toLowerCase());
    return { p, ts, done: ts.filter((t) => t.done).length };
  });
  const noProj = tasks.filter((t) => !nameOf(t) || !groups.some((g) => g.p.name.trim().toLowerCase() === nameOf(t).toLowerCase()));
  const row = (t) => (t.id === projTaskEditId
    ? `<div class="pt-row">${ptEditFormHtml(t)}</div>`
    : `<div class="pt-row">
    <label class="proj-task${t.done ? ' done' : ''}">
      <input type="checkbox" data-task-toggle="${t.id}"${t.done ? ' checked' : ''} />
      <span class="proj-task-main">
        <span class="proj-task-title">${escapeHtml(t.title)}</span>
        <span class="proj-task-meta">${escapeHtml(taskDateRead(t.date || ''))}${t.time ? ` · ⏱ ${escapeHtml(t.time)}` : ''}${ptBadge(t.priority)}</span>
      </span>
    </label>
    <span class="dt-row-tools">${ptToolsHtml(t.id)}</span>
  </div>`);
  const cards = groups.map((g) => {
    const pct = g.ts.length ? Math.round((g.done / g.ts.length) * 100) : 0;
    const gt = goalTitleOf(g.p.goalId);
    return `<section class="proj-blk goal-detail-card pt-group">
      <header class="pt-group-head">
        <span class="pt-group-icon" style="background:${escapeHtml(g.p.color || '#16A34A')}">${g.p.icon || '🧩'}</span>
        <div class="pt-group-title">
          <strong>${escapeHtml(g.p.name)}</strong>
          <span class="pt-group-sub">${gt ? `🎯 ${escapeHtml(gt)} · ` : ''}${g.done}/${g.ts.length} selesai · ${pct}%</span>
        </div>
        <span class="pt-group-actions">
          <button type="button" class="ghost-button" data-pt-add-task="${g.p.id}">+ Task</button>
          <button type="button" class="ghost-button" data-proj-open="${g.p.id}">Buka Project</button>
        </span>
      </header>
      ${g.ts.length ? g.ts.map(row).join('') : '<p class="proj-hint">Belum ada task di project ini.</p>'}
    </section>`;
  }).join('');
  const orphan = noProj.length ? `<section class="proj-blk goal-detail-card pt-group pt-orphan">
      <header class="pt-group-head">
        <span class="pt-group-icon" style="background:var(--muted)">⚠️</span>
        <div class="pt-group-title"><strong>Belum ada Project</strong><span class="pt-group-sub">Semua task harus berdasarkan project — pindahkan di bawah</span></div>
      </header>
      ${noProj.map((t) => `<div class="pt-orphan-row">
        <label class="proj-task${t.done ? ' done' : ''}">
          <input type="checkbox" data-task-toggle="${t.id}"${t.done ? ' checked' : ''} />
          <span class="proj-task-main"><span class="proj-task-title">${escapeHtml(t.title)}</span></span>
        </label>
        <select data-pt-move="${t.id}"><option value="">Pindahkan ke…</option>${projNameOptions('')}</select>
      </div>`).join('')}
    </section>` : '';
  const totalTasks = groups.reduce((a, g) => a + g.ts.length, 0);
  const totalDone = groups.reduce((a, g) => a + g.done, 0);
  const empty = !projects.length
    ? '<p class="task-empty">Belum ada project. Buat dulu lewat menu Goals and Habit → Project.</p>'
    : (!totalTasks && !noProj.length ? '<p class="task-empty">Belum ada task yang terhubung ke project.</p>' : '');
  return `<section class="task-page pt-page">
    <div class="task-card task-progress-card">
      <div class="task-progress-head">
        <strong>${totalDone} / ${totalTasks + noProj.length} task selesai</strong>
        <span class="task-pct">${totalTasks + noProj.length ? Math.round((totalDone / (totalTasks + noProj.length)) * 100) : 0}%</span>
      </div>
      <div class="task-bar"><span style="width:${totalTasks + noProj.length ? Math.round((totalDone / (totalTasks + noProj.length)) * 100) : 0}%"></span></div>
    </div>
    ${empty}${cards}${orphan}
  </section>`;
}

/* Tombol ubah/hapus task project — dipakai di daftar Project Task & tab Task project. */
function ptToolsHtml(id) {
  return `<button class="dt-tool edit" type="button" data-pt-edit="${id}" aria-label="Ubah task" title="Ubah task">✎</button><button class="dt-tool" type="button" data-pt-del="${id}" aria-label="Hapus task" title="Hapus task">✕</button>`;
}

function ptBadge(p) {
  const map = { high: ' · 🔴 Tinggi', med: ' · 🟡 Sedang', low: ' · 🟢 Rendah' };
  return map[p] || '';
}

function ptEditFormHtml(t) {
  return `<form class="proj-inline pt-edit-form" id="ptEditForm" data-pt-edit-id="${t.id}">
      <input name="title" value="${escapeHtml(t.title)}" maxlength="90" required placeholder="Judul task" />
      <input name="date" type="date" value="${escapeHtml(t.date || taskTodayIso())}" />
      <select name="priority" aria-label="Prioritas">
        <option value="low"${(t.priority || 'med') === 'low' ? ' selected' : ''}>🟢 Rendah</option>
        <option value="med"${(t.priority || 'med') === 'med' ? ' selected' : ''}>🟡 Sedang</option>
        <option value="high"${t.priority === 'high' ? ' selected' : ''}>🔴 Tinggi</option>
      </select>
      <input name="time" type="time" value="${escapeHtml(t.time || '')}" />
      <div class="pt-edit-btns"><button type="submit" class="proj-inline-go">Simpan</button><button type="button" class="secondary-button" data-pt-edit-cancel>Batal</button></div>
    </form>`;
}

function projFormValues(form) {
  return { name: form.querySelector('[name=name]').value.trim(), description: form.querySelector('[name=description]').value.trim(), category: form.querySelector('[name=category]').value.trim(), start: form.querySelector('[name=start]').value, deadline: form.querySelector('[name=deadline]').value, goalId: form.querySelector('[name=goalId]')?.value || '' };
}

function submitProjectForm(form) {
  const v = projFormValues(form);
  if (!loadGoals().length) { projFormDraft = { ...v, err: 'Project tidak bisa dibuat tanpa Goals. Buat goal dulu di menu Goals.' }; renderShell(); return; }
  if (!v.goalId) { projFormDraft = { ...v, err: 'Pilih Goals terlebih dahulu — project harus mengikuti goal.' }; renderShell(); return; }
  if (!v.name) { projFormDraft = { ...v, err: 'Nama project wajib diisi.' }; renderShell(); return; }
  if (v.start && v.deadline && v.deadline < v.start) { projFormDraft = { ...v, err: 'Deadline tidak boleh sebelum tanggal mulai.' }; renderShell(); return; }
  const items = loadProjects();
  if (projFormId) {
    const p = items.find((x) => x.id === projFormId);
    projFormSelId = null;
    if (p) { Object.assign(p, { name: v.name, description: v.description, category: v.category, start: v.start || p.start, deadline: v.deadline, goalId: v.goalId || p.goalId, status: projFormSel.status, icon: projFormSel.icon, color: projFormSel.color }); projLog(p, 'Detail project diperbarui'); }
    saveProjects(items);
    projFormId = null;
    projPage = 'detail';
    showToast('Project diperbarui.');
    renderShell();
    return;
  }
  const p = { id: `p${Date.now()}`, ...v, status: projFormSel.status, icon: projFormSel.icon, color: projFormSel.color, createdAt: taskTodayIso(), milestones: [], notes: [], files: [], activity: [] };
  projLog(p, 'Project dibuat');
  items.push(p);
  saveProjects(items);
  projFormDraft = { name: '', description: '', category: '', start: '', deadline: '', goalId: '', err: '' };
  projPage = 'list';
  renderShell();
}

function handleProjectAction(btn) {
  if (btn.matches('[data-proj-add]')) { projFormId = null; projFormSelId = null; projTaskEditId = null; projFormDraft = { name: '', description: '', category: '', start: taskTodayIso(), deadline: '', goalId: '', err: '' }; projFormSel = { status: 'active', icon: '🧩', color: '#16A34A' }; projPage = 'form'; renderShell(); setTimeout(() => document.querySelector('#projForm [name=name]')?.focus(), 30); return true; }
  if (btn.matches('[data-proj-form-back]')) { projPage = projFormId ? 'detail' : 'list'; renderShell(); return true; }
  if (btn.matches('[data-proj-filter]')) { projFilter = btn.dataset.projFilter; renderShell(); return true; }
  if (btn.matches('[data-proj-open]')) { projDetailId = btn.dataset.projOpen; projPage = 'detail'; projTab = 'overview'; projMenuOpen = false; projTaskAdding = projNoteAdding = projFileAdding = false; activeView = 'project'; state.selectedView = 'project'; renderShell(); return true; }
  if (btn.matches('[data-proj-back]')) { projPage = 'list'; projMenuOpen = false; renderShell(); return true; }
  if (btn.matches('[data-proj-tab]')) { projTab = btn.dataset.projTab; projMenuOpen = false; renderShell(); return true; }
  if (btn.matches('[data-proj-tfilter]')) { projTaskFilter = btn.dataset.projTfilter; renderShell(); return true; }
  if (btn.matches('[data-proj-menu]')) { projMenuOpen = !projMenuOpen; renderShell(); return true; }
  if (btn.matches('[data-proj-icon]')) { captureProjForm(); projFormSel.icon = btn.dataset.projIcon; renderShell(); return true; }
  if (btn.matches('[data-proj-color]')) { captureProjForm(); projFormSel.color = btn.dataset.projColor; renderShell(); return true; }
  if (btn.matches('[data-proj-status]')) { captureProjForm(); projFormSel.status = btn.dataset.projStatus; renderShell(); return true; }
  if (btn.matches('[data-proj-edit]')) {
    const pj = loadProjects().find((x) => x.id === btn.dataset.projEdit);
    // inisialisasi pilihan form dari project sekali saja; render berikutnya (klik chip) tidak boleh menimpanya
    if (pj) projFormSel = { status: pj.status, icon: pj.icon || '🧩', color: pj.color || '#16A34A' };
    projFormSelId = btn.dataset.projEdit;
    projFormId = btn.dataset.projEdit;
    projFormDraft = { name: '', description: '', category: '', start: '', deadline: '', goalId: '', err: '' };
    projPage = 'form';
    renderShell();
    return true;
  }
  if (btn.matches('[data-proj-archive]')) {
    const items = loadProjects(); const p = items.find((x) => x.id === btn.dataset.projArchive);
    if (p) { p.status = p.status === 'archived' ? 'active' : 'archived'; projLog(p, p.status === 'archived' ? 'Project diarsipkan' : 'Project dipulihkan'); saveProjects(items); projMenuOpen = false; renderShell(); }
    return true;
  }
  if (btn.matches('[data-proj-del]')) {
    const items = loadProjects(); const p = items.find((x) => x.id === btn.dataset.projDel);
    if (p && window.confirm(`Hapus project "${p.name}"? Task yang terhubung tidak ikut terhapus.`)) {
      saveProjects(items.filter((x) => x.id !== p.id));
      projMenuOpen = false; projPage = 'list'; renderShell();
    } else { projMenuOpen = false; renderShell(); }
    return true;
  }
  if (btn.matches('[data-proj-task-add]')) { projTaskAdding = true; renderShell(); setTimeout(() => document.querySelector('#projTaskForm [name=title]')?.focus(), 30); return true; }
  if (btn.matches('[data-proj-note-add]')) { projNoteAdding = true; renderShell(); setTimeout(() => document.querySelector('#projNoteForm [name=text]')?.focus(), 30); return true; }
  if (btn.matches('[data-proj-file-add]')) { projFileAdding = true; renderShell(); setTimeout(() => document.querySelector('#projFileForm [name=name]')?.focus(), 30); return true; }
  if (btn.matches('[data-proj-note-del]')) {
    const items = loadProjects(); const p = items.find((x) => x.id === projDetailId);
    if (p) { p.notes = (p.notes || []).filter((n) => n.id !== btn.dataset.projNoteDel); saveProjects(items); renderShell(); }
    return true;
  }
  if (btn.matches('[data-proj-file-del]')) {
    const items = loadProjects(); const p = items.find((x) => x.id === projDetailId);
    if (p) { p.files = (p.files || []).filter((f) => f.id !== btn.dataset.projFileDel); projLog(p, 'File/link dihapus'); saveProjects(items); renderShell(); }
    return true;
  }
  if (btn.matches('[data-goal-from-proj]')) { goalsDetailId = btn.dataset.goalFromProj; goalsPage = 'detail'; activeView = 'goals'; state.selectedView = 'goals'; saveState(); renderShell(); return true; }
  if (btn.matches('[data-proj-setstatus]')) {
    const items = loadProjects();
    const p = items.find((x) => x.id === projDetailId);
    const key = btn.dataset.projSetstatus;
    if (p && PROJ_STATUS[key] && p.status !== key) {
      p.status = key;
      projLog(p, `Status diubah ke ${PROJ_STATUS[key].label}`);
      saveProjects(items);
      projMenuOpen = false;
      showToast(`Status project: ${PROJ_STATUS[key].label}`);
      renderShell();
    }
    return true;
  }
  if (btn.matches('[data-pt-edit]')) {
    projTaskEditId = btn.dataset.ptEdit;
    renderShell();
    setTimeout(() => document.querySelector('#ptEditForm [name=title]')?.focus(), 40);
    return true;
  }
  if (btn.matches('[data-pt-edit-cancel]')) { projTaskEditId = null; renderShell(); return true; }
  if (btn.matches('[data-pt-del]')) {
    const id = btn.dataset.ptDel;
    const tasks = loadTasks();
    const idx = tasks.findIndex((x) => x.id === id);
    if (idx >= 0) {
      const t = tasks[idx];
      const projName = t.project || '';
      tasks.splice(idx, 1);
      saveTasks();
      const items = loadProjects();
      const p = items.find((x) => x.name === projName) || items.find((x) => x.id === projDetailId);
      if (p) { projLog(p, `🗑️ Task "${t.title}" dihapus`); saveProjects(items); }
      if (projTaskEditId === id) projTaskEditId = null;
      showToast(`Task "${t.title}" dihapus.`);
      renderShell();
    }
    return true;
  }
  if (btn.matches('[data-pt-add-task]')) { activeView = 'project'; state.selectedView = 'project'; projDetailId = btn.dataset.ptAddTask; projPage = 'detail'; projTab = 'tasks'; projTaskAdding = true; saveState(); renderShell(); setTimeout(() => document.querySelector('#projTaskForm [name=title]')?.focus(), 60); return true; }
  return false;
}

function captureProjForm() {
  const form = document.querySelector('#projForm');
  if (form && !projFormId) projFormDraft = { ...projFormValues(form), err: '' };
}

function handleProjectChange(el) {
  if (el.matches('[data-proj-ms]')) {
    const [pid, mid] = el.dataset.projMs.split(':');
    const items = loadProjects(); const p = items.find((x) => x.id === pid);
    const m = p && (p.milestones || []).find((x) => x.id === mid);
    if (m) { m.done = el.checked; projLog(p, `${m.done ? '✓' : '↺'} Milestone "${m.text}" ${m.done ? 'selesai' : 'dibuka lagi'}`); saveProjects(items); renderShell(); }
    return true;
  }
  if (el.matches('[data-proj-task]')) {
    const tasks = loadTasks(); const t = tasks.find((x) => x.id === el.dataset.projTask);
    if (t) { t.done = el.checked; saveTasks(); const items = loadProjects(); const p = items.find((x) => x.id === projDetailId); if (p) { projLog(p, `${el.checked ? '✓' : '↺'} Task "${t.title}" ${el.checked ? 'selesai' : 'dibuka lagi'}`); saveProjects(items); } renderShell(); }
    return true;
  }
  if (el.matches('[data-proj-search]')) {
    projSearch = el.value;
    const list = dom.content.querySelector('.proj-list');
    if (list) {
      const all = loadProjects();
      const q = projSearch.trim().toLowerCase();
      const filtered = all.filter((p) => (projFilter === 'all' ? p.status !== 'archived' : p.status === projFilter))
        .filter((p) => !q || `${p.name} ${p.description || ''} ${p.category || ''}`.toLowerCase().includes(q));
      list.innerHTML = filtered.length
        ? filtered.map(projCardHtml).join('')
        : `<div class="proj-empty"><span>🔍</span><b>Project tidak ditemukan</b><p>Coba kata kunci lain atau ubah filter.</p></div>`;
    }
    return true;
  }
  return false;
}

function submitProjectSubForm(form) {
  if (form.id === 'ptEditForm') {
    // edit task project — dikerjakan lebih dulu karena projDetailId boleh kosong
    const id = form.dataset.ptEditId;
    const tasks = loadTasks();
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    const title = form.querySelector('[name=title]').value.trim();
    if (!title) return;
    t.title = title;
    t.date = form.querySelector('[name=date]').value || t.date;
    t.priority = form.querySelector('[name=priority]').value || t.priority;
    t.time = form.querySelector('[name=time]').value || '';
    saveTasks();
    const itemsAll = loadProjects();
    const pj = itemsAll.find((x) => x.name === (t.project || '')) || itemsAll.find((x) => x.id === projDetailId);
    if (pj) { projLog(pj, `✏️ Task "${title}" diubah`); saveProjects(itemsAll); }
    projTaskEditId = null;
    showToast('Task diperbarui.');
    renderShell();
    return;
  }
  const items = loadProjects();
  const p = items.find((x) => x.id === projDetailId);
  if (!p) return;
  if (form.id === 'projTaskForm') {
    const title = form.querySelector('[name=title]').value.trim();
    const date = form.querySelector('[name=date]').value || taskTodayIso();
    if (!title) return;
    const tasks = loadTasks();
    tasks.push({ id: `t${Date.now()}`, title, project: p.name, tag: '', time: '', priority: 'med', date, done: false });
    saveTasks();
    projLog(p, `＋ Task "${title}" ditambahkan`);
    saveProjects(items);
    projTaskAdding = false;
    renderShell();
  } else if (form.id === 'projNoteForm') {
    const text = form.querySelector('[name=text]').value.trim();
    if (!text) return;
    p.notes = p.notes || [];
    p.notes.unshift({ id: `pn${Date.now()}`, text, at: Date.now() });
    projLog(p, '📝 Catatan baru ditambahkan');
    saveProjects(items);
    projNoteAdding = false;
    renderShell();
  } else if (form.id === 'projFileForm') {
    const name = form.querySelector('[name=name]').value.trim();
    const url = form.querySelector('[name=url]').value.trim();
    if (!name || !url) { projFileErr = 'Nama dan URL wajib diisi.'; renderShell(); return; }
    if (!/^https?:\/\/.+/i.test(url)) { projFileErr = 'URL harus diawali http:// atau https://'; renderShell(); return; }
    p.files = p.files || [];
    p.files.push({ id: `pf${Date.now()}`, name, url });
    projLog(p, `🔗 Link "${name}" ditambahkan`);
    saveProjects(items);
    projFileAdding = false;
    projFileErr = '';
    renderShell();
  }
}

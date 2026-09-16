// Tracker Daily — schedule
// Dipisah dari public/app.js (refactor modular; tidak ada identifier yang di-rename).
// Classic script — urutan load: lihat <script> di public/index.html.
'use strict';


/* ============ MODUL JADWAL (kalender + agenda harian) ============ */
const JADWAL_STORE_KEY = 'miaw-tracker.jadwal.v1';
// Warna kategori agenda memakai token tema (theme.css: --jv-*).
const JADWAL_COLORS = {
  kantor: 'var(--jv-kantor)', sales: 'var(--jv-sales)', marketing: 'var(--jv-marketing)', konten: 'var(--jv-konten)',
  keuangan: 'var(--jv-keuangan)', pribadi: 'var(--jv-pribadi)', belajar: 'var(--jv-belajar)',
};
let jadwalMode = 'kalender';           // 'kalender' | 'daftar'
let jadwalSelIso = taskTodayIso();
let jadwalMonthOffset = 0;             // offset bulan dari bulan ini
let jadwalAdding = false;
let jadwalEditingId = null;

function jadwalCatColor(cat) {
  return JADWAL_COLORS[String(cat || '').toLowerCase()] || '#94A3B8';
}

function loadJadwalEvents() {
  try {
    const raw = JSON.parse(localStorage.getItem(scopedKey(JADWAL_STORE_KEY)) || 'null');
    if (Array.isArray(raw)) return raw;
  } catch { /* seed ulang */ }
  if (!demoSeedEnabled()) return [];
  const seed = [
    { id: 'j1', date: '2026-09-07', time: '19:30', title: 'Live shopping', category: 'Konten', kind: 'event' },
    { id: 'j2', date: '2026-09-10', time: '09:00', title: 'Meeting tim', category: 'Kantor', kind: 'event' },
    { id: 'j3', date: '2026-09-10', time: '11:00', title: 'Follow up pelanggan', category: 'Sales', kind: 'event' },
    { id: 'j4', date: '2026-09-10', time: '19:00', title: 'Upload konten', category: 'Konten', kind: 'event' },
    { id: 'j5', date: '2026-09-11', time: '08:00', title: 'Setoran harian', category: 'Keuangan', kind: 'event' },
    { id: 'j6', date: '2026-09-11', time: '16:00', title: 'Rapat vendor', category: 'Pribadi', kind: 'event' },
    { id: 'j7', date: '2026-09-16', time: '13:00', title: 'Kelas desain', category: 'Belajar', kind: 'event' },
    { id: 'j8', date: '2026-09-25', time: '10:00', title: 'Kumpul keluarga', category: 'Pribadi', kind: 'event' },
    { id: 'j9', date: '2026-09-27', time: '09:00', title: 'Bayar pajak', category: 'Keuangan', kind: 'event' },
  ];
  try { localStorage.setItem(scopedKey(JADWAL_STORE_KEY), JSON.stringify(seed)); } catch { /* ignore */ }
  return seed;
}

function saveJadwalEvents(list) {
  try { localStorage.setItem(scopedKey(JADWAL_STORE_KEY), JSON.stringify(list)); } catch { /* ignore */ }
  if (typeof queueRemoteSave === 'function') queueRemoteSave();
}

function jadwalItems(iso) {
  const items = loadJadwalEvents()
    .filter((e) => e.date === iso)
    .map((e) => ({ srcId: e.id, jadwalEv: true, time: e.time || '', title: e.title, sub: e.category || '', color: jadwalCatColor(e.category), kind: e.kind === 'task' ? 'task' : 'event', done: !!e.done }));
  loadTasks().forEach((t) => {
    if (t.date === iso) items.push({ srcId: t.id, jadwalEv: false, time: t.time || '', title: t.title, sub: [t.project, t.tag].filter(Boolean).join(' · ') || 'Task', color: jadwalCatColor(t.tag || t.project), kind: 'task', done: !!t.done });
  });
  // deadline goal ikut tampil di kalender
  loadGoals().forEach((g) => {
    if (g.deadline === iso) items.push({ srcId: g.id, jadwalEv: false, goalDue: true, time: '', title: g.title, sub: 'Deadline goal', color: goalCatColor(g.category), kind: 'goal', done: g.status === 'selesai' });
  });
  items.sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
  return items;
}

function jadwalMonthGrid() {
  const now = new Date();
  const view = new Date(now.getFullYear(), now.getMonth() + jadwalMonthOffset, 1);
  const y = view.getFullYear();
  const m = view.getMonth();
  const days = new Date(y, m + 1, 0).getDate();
  const firstDow = (new Date(y, m, 1).getDay() + 6) % 7; // Senin = 0
  const cells = [];
  for (let i = 0; i < firstDow; i += 1) cells.push(null);
  for (let d = 1; d <= days; d += 1) cells.push(`${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  return { y, m, cells };
}

function jadwalDayTitle(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function jadwalRowHtml(it) {
  const dot = it.kind === 'task'
    ? `<span class="jadwal-dot ring" style="--jc:${it.color}"></span>`
    : it.kind === 'goal'
      ? `<span class="jadwal-dot goal" style="--jc:${it.color}"></span>`
      : `<span class="jadwal-dot" style="background:${it.color}"></span>`;
  const isTask = it.kind === 'task';
  const check = isTask
    ? `<label class="task-check-wrap" title="Tandai selesai"><input class="task-check" type="checkbox" ${it.done ? 'checked' : ''} data-jadwal-check="${it.srcId}" data-src="${it.jadwalEv ? 'j' : 't'}" /></label>`
    : '';
  const open = it.goalDue
    ? `data-jadwal-goal="${it.srcId}"`
    : it.jadwalEv
      ? `data-jadwal-ev="${it.srcId}"`
      : `data-jadwal-task="${it.srcId}"`;
  return `<div class="jadwal-row${it.done ? ' done' : ''}" ${open} role="button" tabindex="0" aria-label="Buka ${escapeHtml(it.title)}">
      <span class="jadwal-time">${escapeHtml(it.time || '—')}</span>
      ${dot}
      <span class="jadwal-info"><span class="jadwal-title">${escapeHtml(it.title)}</span><span class="jadwal-sub">${escapeHtml(it.sub)}</span></span>
      ${check}
      <span class="jadwal-chev">›</span>
    </div>`;
}

function renderJadwalView() {
  const { y, m, cells } = jadwalMonthGrid();
  const monthLabel = `${MONTHS[m]} ${y}`;
  const seg = `<div class="jadwal-seg" role="tablist">
      <button type="button" class="jadwal-seg-btn${jadwalMode === 'kalender' ? ' active' : ''}" data-jadwal-mode="kalender">Kalender</button>
      <button type="button" class="jadwal-seg-btn${jadwalMode === 'daftar' ? ' active' : ''}" data-jadwal-mode="daftar">Daftar</button>
    </div>`;

  const addForm = jadwalAdding ? `
    <form class="jadwal-add-card" id="jadwalAddForm">
      <div class="jadwal-add-head"><span>${jadwalEditingId ? 'Edit Jadwal' : 'Tambah Jadwal'}</span><button type="button" class="task-add-x" data-jadwal-cancel aria-label="Batal">×</button></div>
      <input name="title" type="text" maxlength="80" placeholder="Judul jadwal…" autocomplete="off" required value="${jadwalEditingId ? escapeHtml((loadJadwalEvents().find((x) => x.id === jadwalEditingId) || {}).title || '') : ''}" />
      <div class="jadwal-add-grid">
        <label><span>Tanggal</span><input name="date" type="date" value="${escapeHtml(jadwalSelIso)}" /></label>
        <label><span>Jam</span><input name="time" type="time" value="${jadwalEditingId ? escapeHtml((loadJadwalEvents().find((x) => x.id === jadwalEditingId) || {}).time || '09:00') : '09:00'}" /></label>
        <label><span>Kategori</span><input name="category" type="text" maxlength="24" placeholder="Kantor" autocomplete="off" list="jadwalCats" value="${jadwalEditingId ? escapeHtml((loadJadwalEvents().find((x) => x.id === jadwalEditingId) || {}).category || '') : ''}" /></label>
        <label><span>Tipe</span><select name="kind"><option value="event" ${jadwalEditingId && (loadJadwalEvents().find((x) => x.id === jadwalEditingId) || {}).kind !== 'task' ? 'selected' : ''}>Event</option><option value="task" ${jadwalEditingId && (loadJadwalEvents().find((x) => x.id === jadwalEditingId) || {}).kind === 'task' ? 'selected' : ''}>Task</option></select></label>
      </div>
      <datalist id="jadwalCats">${Object.keys(JADWAL_COLORS).map((c) => `<option value="${c}"></option>`).join('')}</datalist>
      <button class="primary-button jadwal-add-save" type="submit">Simpan</button>
    </form>` : '';

  let body = '';
  if (jadwalMode === 'kalender') {
    const week = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
    const grid = cells.map((iso) => {
      if (!iso) return '<span class="jadwal-cell empty"></span>';
      const items = jadwalItems(iso);
      const dots = items.slice(0, 3).map((it) => (it.kind === 'task'
        ? `<span class="jadwal-mdot ring" style="--jc:${it.color}" title="Task"></span>`
        : it.kind === 'goal'
          ? `<span class="jadwal-mdot goal" style="--jc:${it.color}" title="Deadline goal"></span>`
          : `<span class="jadwal-mdot" style="background:${it.color}" title="Agenda"></span>`)).join('');
      const sel = iso === jadwalSelIso ? ' sel' : '';
      const today = iso === taskTodayIso() ? ' today' : '';
      return `<button type="button" class="jadwal-cell${sel}${today}" data-jadwal-day="${iso}"><span>${Number(iso.slice(8))}</span><span class="jadwal-mdots">${dots}</span></button>`;
    }).join('');
    body = `
      <div class="jadwal-legend">
        <span><i class="jadwal-mdot ring" style="--jc:var(--blue)"></i> Task</span>
        <span><i class="jadwal-mdot goal" style="--jc:var(--violet)"></i> Deadline goal</span>
        <span><i class="jadwal-mdot" style="background:var(--orange)"></i> Agenda</span>
      </div>
      <div class="jadwal-card">
        <div class="jadwal-month-head">
          <span class="jadwal-month-label">${monthLabel}</span>
          <span class="jadwal-month-nav">
            <button type="button" class="jadwal-navbtn" data-jadwal-prev aria-label="Bulan sebelumnya">‹</button>
            <button type="button" class="jadwal-navbtn" data-jadwal-next aria-label="Bulan berikutnya">›</button>
          </span>
        </div>
        <div class="jadwal-week">${week.map((w) => `<span>${w}</span>`).join('')}</div>
        <div class="jadwal-grid">${grid}</div>
      </div>
      <h2 class="jadwal-day-title">${jadwalDayTitle(jadwalSelIso)}</h2>
      <div class="jadwal-card jadwal-list">
        ${jadwalItems(jadwalSelIso).length ? jadwalItems(jadwalSelIso).map(jadwalRowHtml).join('') : '<p class="task-empty">Tidak ada jadwal pada hari ini.</p>'}
      </div>`;
  } else {
    const today = taskTodayIso();
    const isoSet = new Set();
    loadJadwalEvents().forEach((e) => { if (e.date >= today) isoSet.add(e.date); });
    loadTasks().forEach((t) => { if (t.date && t.date >= today) isoSet.add(t.date); });
    const isos = [...isoSet].sort();
    body = `<div class="jadwal-card jadwal-list">
        ${isos.length ? isos.map((iso) => `
          <div class="jadwal-group">${jadwalDayTitle(iso)}</div>
          ${jadwalItems(iso).map(jadwalRowHtml).join('')}`).join('') : '<p class="task-empty">Belum ada jadwal mendatang.</p>'}
      </div>`;
  }

  return `<div class="jadwal-page">
      ${seg}
      ${addForm}
      ${body}
      <button class="task-fab" type="button" data-jadwal-add aria-label="Tambah jadwal baru">+</button>
    </div>`;
}

function handleJadwalAction(btn) {
  if (btn.matches('[data-jadwal-goal]')) {
    // deadline goal di kalender → buka detail goal
    goalsPage = 'detail';
    goalsDetailId = btn.dataset.jadwalGoal;
    activeView = 'goals';
    state.selectedView = 'goals';
    saveState();
    renderShell();
    return true;
  }
  if (btn.matches('[data-jadwal-mode]')) {
    jadwalMode = btn.dataset.jadwalMode;
    renderShell();
    return true;
  }
  if (btn.matches('[data-jadwal-prev]')) { jadwalMonthOffset -= 1; renderShell(); return true; }
  if (btn.matches('[data-jadwal-next]')) { jadwalMonthOffset += 1; renderShell(); return true; }
  if (btn.matches('[data-jadwal-day]')) {
    jadwalSelIso = btn.dataset.jadwalDay;
    renderShell();
    return true;
  }
  if (btn.matches('[data-jadwal-add]')) { jadwalAdding = true; renderShell(); setTimeout(() => document.querySelector('#jadwalAddForm [name=title]')?.focus(), 30); return true; }
  if (btn.matches('[data-jadwal-cancel]')) { jadwalAdding = false; jadwalEditingId = null; renderShell(); return true; }
  if (btn.matches('[data-jadwal-check]')) {
    // checkbox di baris jadwal: tandai selesai (task rutin) / tandai event selesai (log jadwal)
    const id = btn.dataset.jadwalCheck;
    if (btn.dataset.src === 't') {
      const t = loadTasks().find((x) => x.id === id);
      if (t) { t.done = btn.checked; saveTasks(); }
    } else {
      const evs = loadJadwalEvents();
      const ev = evs.find((x) => x.id === id);
      if (ev) { ev.done = btn.checked; saveJadwalEvents(evs); }
    }
    renderShell();
    return true;
  }
  if (btn.matches('[data-jadwal-ev]')) {
    // event jadwal: buka form edit terisi (hapus+buat ulang sederhana via prompt-free edit form)
    jadwalEditingId = btn.dataset.jadwalEv;
    jadwalAdding = true;
    renderShell();
    setTimeout(() => document.querySelector('#jadwalAddForm [name=title]')?.focus(), 30);
    return true;
  }
  if (btn.matches('[data-jadwal-task]')) {
    // task project (dari modul task lama) → detail task
    taskDetailId = btn.dataset.jadwalTask;
    activeView = 'task';
    state.selectedView = 'task';
    saveState();
    renderShell();
    return true;
  }
  return false;
}

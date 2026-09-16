// Tracker Daily — tasks
// Dipisah dari public/app.js (refactor modular; tidak ada identifier yang di-rename).
// Classic script — urutan load: lihat <script> di public/index.html.
'use strict';


/* ============ MODUL TASK (daftar tugas personal) ============ */
const TASK_STORE_KEY = 'miaw-tracker.tasks.v1';
const TASK_FILTERS = [
  { key: 'today', label: 'Hari Ini' },
  { key: 'upcoming', label: 'Mendatang' },
  { key: 'inbox', label: 'Inbox' },
  { key: 'all', label: 'Semua' },
];
let taskFilter = 'today';
let taskAdding = false;
let taskDetailId = null;
let taskEditing = false;
let taskPageAdding = false;
let taskAddOptions = false;
const taskAddDefaults = () => ({ title: '', date: taskTodayIso(), time: '19:00', priority: 'high', project: firstProjName(), category: 'Marketing', notes: '', memo: '', deadline: '', reminder: '', tag: '', recurring: '', estimate: '', checklist: [], attachments: [] });
let taskAddDraft = taskAddDefaults();
let focusTaskId = null;
let focusInterval = null;

function taskSeed() {
  const today = taskTodayIso();
  const later = taskDateOffset(1);
  return [
    { id: 't1', title: 'Buat landing page', project: 'Marketing Batu Bata', tag: '', time: '19:00', priority: 'high', date: today, done: false,
      notes: 'Bangun landing page satu halaman yang sederhana dan cepat untuk menarik pembeli batu bata dari Google dan Facebook.',
      memo: 'Pakai template satu kolom. CTA utama: tombol WhatsApp. Target publish sebelum akhir pekan.',
      estimate: 120,
      actual: 75,
      checklist: [
        { id: 'c1', text: 'Riset kompetitor', done: true },
        { id: 'c2', text: 'Buat struktur landing page', done: true },
        { id: 'c3', text: 'Tulis copywriting', done: true },
        { id: 'c4', text: 'Publish', done: false },
      ],
      attachments: ['landing-wireframe.png', 'copy-v1.docx'],
      activity: [
        { text: 'Checklist "Tulis copywriting" selesai', at: Date.now() - 40 * 60000 },
        { text: 'Sesi fokus 45 mnt selesai', at: Date.now() - 55 * 60000 },
        { text: 'Task dibuat', at: Date.now() - 26 * 3600000 },
      ] },
    { id: 't2', title: 'Follow up pelanggan', project: 'Marketing Batu Bata', tag: '', time: '20:00', priority: 'high', date: today, done: false },
    { id: 't3', title: 'Laporan keuangan', project: 'Otomasi Laporan Bulanan', tag: '', time: '21:00', priority: 'med', date: today, done: false },
    { id: 't4', title: 'Edit video promosi', project: 'Marketing Batu Bata', tag: '', time: '22:00', priority: 'low', date: today, done: false },
    { id: 't5', title: 'Riset keyword', project: 'Website Toko Online', tag: '', time: '10:30', priority: 'med', date: today, done: true },
    { id: 't6', title: 'Cek stok bahan', project: 'Marketing Batu Bata', tag: '', time: '14:00', priority: 'low', date: today, done: true },
    { id: 't7', title: 'Susun konten minggu depan', project: 'Marketing Batu Bata', tag: '', time: '', priority: 'med', date: later, done: false },
  ];
}

function taskTodayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function taskDateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function loadTasks() {
  if (!state.tasks || !Array.isArray(state.tasks)) {
    state.tasks = demoSeedEnabled() ? taskSeed() : [];
  }
  // lengkapi field demo yang belum ada pada task lama (id cocok dengan seed)
  const seedById = new Map(taskSeed().map((s) => [s.id, s]));
  state.tasks.forEach((t) => {
    const s = seedById.get(t.id);
    if (!s) return;
    ['notes', 'memo', 'estimate', 'actual', 'checklist', 'attachments', 'activity'].forEach((k) => {
      if (t[k] === undefined && s[k] !== undefined) t[k] = s[k];
    });
  });
  return state.tasks;
}

function saveTasks() {
  saveState();
  if (typeof scheduleCloudSync === 'function') scheduleCloudSync();
}

function taskMatchKey(t, key, todayIso) {
  if (key === 'all') return true;
  if (key === 'today') return t.date === todayIso;
  if (key === 'upcoming') return t.date > todayIso;
  return t.date > todayIso || !t.date; // inbox = mendatang + tanpa tanggal
}

function taskMatchFilter(t, todayIso) {
  return taskMatchKey(t, taskFilter, todayIso);
}

function taskDeadlineLabel(t) {
  const iso = t.deadlineDate || t.date;
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  const label = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  return t.time ? `${label}&nbsp;·&nbsp;${escapeHtml(t.time)}` : label;
}

function taskMinutesLabel(mins) {
  const m = Math.max(0, Math.round(mins || 0));
  const h = Math.floor(m / 60);
  return h ? `${h} jam ${m % 60 ? `${m % 60} mnt` : ''}`.trim() : `${m} mnt`;
}

function taskRelTime(ts) {
  const diff = Date.now() - ts;
  const m = Math.round(diff / 60000);
  if (m < 1) return 'baru saja';
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.round(h / 24)} hari lalu`;
}

function taskFocusElapsedMin(t) {
  return t && t.focusAt ? focusElapsedMs(t) / 60000 : 0;
}

function focusElapsedMs(t) {
  if (!t || !t.focusAt) return 0;
  let ms = Date.now() - t.focusAt - (t.focusPauseAccum || 0);
  if (t.focusPausedSince) ms -= Date.now() - t.focusPausedSince;
  return Math.max(0, ms);
}

function focusSecondsLabel(ms) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = `${m}`.padStart(2, '0');
  const ss = `${s}`.padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function logTaskActivity(t, text) {
  if (!Array.isArray(t.activity)) t.activity = [];
  t.activity.push({ at: Date.now(), text });
  if (t.activity.length > 30) t.activity = t.activity.slice(-30);
}

function focusTask() {
  return focusTaskId ? loadTasks().find((x) => x.id === focusTaskId) : null;
}

function startFocus() {
  if (focusTaskId) return;
  const t = loadTasks().find((x) => x.id === taskDetailId);
  if (!t) return;
  t.actual = (t.actual || 0) + taskFocusElapsedMin(t);
  t.focusAt = Date.now();
  t.focusPausedSince = null;
  t.focusPauseAccum = 0;
  logTaskActivity(t, 'Sesi fokus dimulai.');
  saveTasks();
  focusTaskId = t.id;
  if (!focusInterval) focusInterval = setInterval(tickFocusDisplay, 1000);
}

function pauseFocus() {
  const t = focusTask();
  if (!t || !t.focusAt || t.focusPausedSince) return;
  t.focusPausedSince = Date.now();
  logTaskActivity(t, 'Fokus dijeda.');
  saveTasks();
}

function resumeFocus() {
  const t = focusTask();
  if (!t || !t.focusPausedSince) return;
  t.focusPauseAccum = (t.focusPauseAccum || 0) + (Date.now() - t.focusPausedSince);
  t.focusPausedSince = null;
  logTaskActivity(t, 'Fokus dilanjutkan.');
  saveTasks();
}

function stopFocus() {
  const t = focusTask();
  if (t) {
    t.actual = (t.actual || 0) + taskFocusElapsedMin(t);
    t.focusAt = null;
    t.focusPausedSince = null;
    t.focusPauseAccum = 0;
    logTaskActivity(t, 'Sesi fokus dihentikan.');
    saveTasks();
  }
  focusTaskId = null;
  if (focusInterval) { clearInterval(focusInterval); focusInterval = null; }
}

function tickFocusDisplay() {
  const t = focusTask();
  if (!t || !t.focusAt) return;
  const ms = focusElapsedMs(t);
  const running = !t.focusPausedSince;
  const txt = focusSecondsLabel(ms);
  document.querySelectorAll('[data-focus-live]').forEach((el) => { el.textContent = txt; });
  const pauseBtn = document.querySelector('[data-task-focus-pause]');
  if (pauseBtn) pauseBtn.textContent = t.focusPausedSince ? 'Lanjut' : 'Jeda';
  const line = document.querySelector('.task-focus-state');
  if (line) line.textContent = running ? 'Sesi fokus berjalan' : 'Fokus dijeda';
}

function renderTaskDetail() {
  const t = loadTasks().find((x) => x.id === taskDetailId);
  if (!t) return '';
  const prio = { high: ['Prioritas Tinggi', 'high'], med: ['Prioritas Sedang', 'med'], low: ['Prioritas Rendah', 'low'] }[t.priority || 'low'];
  const status = t.done ? ['Selesai', 'done'] : ['In Progres', 'prog'];
  const projLabel = [t.project, t.tag].filter(Boolean).join(' ');
  const deadline = taskDeadlineLabel(t);
  const desc = t.notes ? `<p class="task-detail-desc">${escapeHtml(t.notes)}</p>` : '';

  if (taskEditing) {
    return `
  <section class="task-page task-detail">
    <div class="task-detail-top">
      <button class="icon-button task-back" type="button" data-task-back aria-label="Kembali">←</button>
      <strong>Edit Task</strong>
    </div>
    <form class="task-card task-edit-form" id="taskEditForm">
      <label>Judul<input name="title" type="text" maxlength="120" required value="${escapeHtml(t.title)}" /></label>
      <label>Project<select name="project" required><option value="">— Pilih project —</option>${projNameOptions(t.project || '')}</select></label>
      <div class="task-edit-row">
        <label>Deadline<input name="date" type="date" value="${t.date || ''}" /></label>
        <label>Jam<input name="time" type="time" value="${t.time || ''}" /></label>
      </div>
      <label>Prioritas
        <select name="priority">
          <option value="high" ${t.priority === 'high' ? 'selected' : ''}>Tinggi</option>
          <option value="med" ${t.priority === 'med' ? 'selected' : ''}>Sedang</option>
          <option value="low" ${t.priority === 'low' ? 'selected' : ''}>Rendah</option>
        </select>
      </label>
      <label>Deskripsi<textarea name="notes" rows="3" maxlength="400">${escapeHtml(t.notes || '')}</textarea></label>
      <div class="task-composer-actions">
        <button type="button" class="ghost-button" data-task-cancel-edit>Batal</button>
        <button type="submit" class="primary-button">Simpan</button>
      </div>
    </form>
  </section>`;
  }

  const cl = Array.isArray(t.checklist) ? t.checklist : [];
  const clDone = cl.filter((c) => c.done).length;
  const clPct = cl.length ? Math.round((clDone / cl.length) * 100) : 0;
  const clItems = cl.length ? cl.map((c) => `
      <label class="task-sub ${c.done ? 'done' : ''}">
        <input class="task-check" type="checkbox" ${c.done ? 'checked' : ''} data-task-sub="${t.id}" data-sub-id="${c.id}" />
        <span>${escapeHtml(c.text)}</span>
      </label>`).join('') : '<p class="task-empty">Belum ada subtask.</p>';
  const atts = Array.isArray(t.attachments) ? t.attachments : [];
  const acts = Array.isArray(t.activity) ? [...t.activity].sort((a, b) => b.at - a.at) : [];
  const menu = `
      <div class="task-menu">
        <button class="icon-button task-menu-btn" type="button" data-task-menu aria-label="Menu">⋮</button>
        <div class="task-menu-pop" hidden>
          <button type="button" data-task-edit>Edit Task</button>
          <button type="button" class="danger" data-task-delete="${t.id}">Delete</button>
        </div>
      </div>`;
  return `
  <section class="task-page task-detail">
    <div class="task-detail-top">
      <button class="icon-button task-back" type="button" data-task-back aria-label="Kembali">←</button>
      <strong>Detail Task</strong>
      ${menu}
    </div>
    <div class="task-card task-detail-head">
      <div class="task-detail-chips">
        <span class="task-chip prio ${prio[1]}">${prio[0]}</span>
        <span class="task-chip status ${status[1]}">${status[0]}</span>
      </div>
      <h2 class="task-detail-title">${escapeHtml(t.title)}</h2>
    </div>
    <div class="task-card task-detail-info">
      <div class="task-info-grid">
        <div class="task-info-cell">
          <span class="task-info-label">Project</span>
          <span class="task-info-value">${escapeHtml(projLabel || '—')}</span>
        </div>
        <div class="task-info-cell">
          <span class="task-info-label">Deadline</span>
          <span class="task-info-value">${deadline || '—'}</span>
        </div>
      </div>
      <div class="task-info-grid">
        <div class="task-info-cell">
          <span class="task-info-label">Estimasi</span>
          <span class="task-info-value">${taskMinutesLabel(t.estimate)}</span>
        </div>
        <div class="task-info-cell">
          <span class="task-info-label">Aktual</span>
          <span class="task-info-value">${focusTaskId === t.id && t.focusAt ? '<span class="task-actual-live" data-focus-live></span>' : taskMinutesLabel(t.actual)}</span>
        </div>
      </div>
    </div>
    ${t.notes ? `
    <section class="task-card task-detail-sec">
      <h3>Deskripsi</h3>
      ${desc}
    </section>` : ''}
    <section class="task-card task-detail-sec">
      <div class="task-sec-head">
        <h3>Checklist</h3>
        ${cl.length ? `<span class="task-sec-meta">${clDone} / ${cl.length} selesai</span>` : ''}
      </div>
      ${cl.length ? `<div class="task-bar slim"><span style="width:${clPct}%"></span></div>` : ''}
      <div class="task-sub-list">${clItems}</div>
    </section>
    <section class="task-card task-detail-sec">
      <h3>Catatan</h3>
      <p class="task-detail-desc">${t.memo ? escapeHtml(t.memo) : 'Belum ada catatan tambahan.'}</p>
    </section>
    <section class="task-card task-detail-sec">
      <h3>Attachment</h3>
      <div class="task-attach-list">
        ${atts.length ? atts.map((a) => `<span class="task-chip att">📎 ${escapeHtml(String(a))}</span>`).join('') : '<p class="task-empty">Belum ada lampiran.</p>'}
      </div>
    </section>
    <div class="task-detail-actions">
      ${t.done ? `<button class="primary-button" type="button" data-task-toggle="${t.id}">Tandai Belum Selesai</button>`
    : focusTaskId === t.id && t.focusAt ? `
      <div class="task-focus-timer-card">
        <div class="task-focus-timer ${t.focusPausedSince ? 'paused' : ''}"><span class="task-focus-dotpulse"></span><span class="task-focus-state">${t.focusPausedSince ? 'Fokus dijeda' : 'Sesi fokus berjalan'}</span><strong data-focus-live>${focusSecondsLabel(focusElapsedMs(t))}</strong></div>
        <div class="task-focus-btns">
          <button class="secondary-button" type="button" data-task-focus-pause>${t.focusPausedSince ? 'Lanjut' : 'Jeda'}</button>
          <button class="primary-button" type="button" data-task-focus="${t.id}">Stop</button>
        </div>
      </div>`
    : `<button class="primary-button task-focus-btn" type="button" data-task-focus="${t.id}">Mulai Fokus</button>`}
    </div>
    <section class="task-card task-detail-sec">
      <h3>Activity</h3>
      <ul class="task-activity">
        ${acts.length ? acts.map((a) => `<li><span>${escapeHtml(a.text)}</span><time>${taskRelTime(a.at)}</time></li>`).join('') : '<li class="task-empty">Belum ada aktivitas.</li>'}
      </ul>
    </section>
  </section>`;
}

function renderTaskView() {
  if (taskPageAdding) return renderTaskAddPage();
  if (taskDetailId) {
    const detail = renderTaskDetail();
    if (detail) return detail;
    taskDetailId = null;
  }
  const tasks = loadTasks();
  const todayIso = taskTodayIso();
  const visible = tasks.filter((t) => taskMatchFilter(t, todayIso));
  const active = visible.filter((t) => !t.done);
  const done = visible.filter((t) => t.done);
  const todayAll = tasks.filter((t) => t.date === todayIso);
  const doneCount = todayAll.filter((t) => t.done).length;
  const totalCount = todayAll.length;
  const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;
  const now = new Date();
  const dateLabel = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const h = now.getHours();
  const greet = h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 19 ? 'Selamat sore' : 'Selamat malam';

  const pills = TASK_FILTERS.map((f) => {
    const n = tasks.filter((t) => taskMatchKey(t, f.key, todayIso)).length;
    return `<button class="task-pill ${taskFilter === f.key ? 'active' : ''}" type="button" data-task-filter="${f.key}">${f.label}<span>${n}</span></button>`;
  }).join('');

  const chip = (text, cls) => (text ? `<span class="task-chip ${cls || ''}">${escapeHtml(text)}</span>` : '');
  const row = (t) => `
    <div class="task-row ${t.done ? 'done' : ''}" data-task-id="${t.id}">
      <span class="task-prio p-${t.priority || 'low'}" aria-label="Prioritas"></span>
      <label class="task-check-wrap">
        <input class="task-check" type="checkbox" ${t.done ? 'checked' : ''} data-task-toggle="${t.id}" />
      </label>
      <span class="task-main" data-task-open="${t.id}" role="button" tabindex="0" aria-label="Buka detail ${escapeHtml(t.title)}">
        <span class="task-name">${escapeHtml(t.title)}</span>
        <span class="task-meta">${chip(t.project)}${t.tag ? chip(t.tag, 'tag') : ''}${t.time ? `<span class="task-time">⏱ ${escapeHtml(t.time)}</span>` : ''}</span>
      </span>
      <button class="task-del icon-button" type="button" data-task-delete="${t.id}" aria-label="Hapus task">✕</button>
    </div>`;

  const composer = taskAdding ? `
    <form class="task-composer" id="taskComposer">
      <input id="taskQuickInput" type="text" maxlength="120" placeholder="Nama task…" autocomplete="off" />
      <input id="taskQuickWhen" type="date" value="${todayIso}" />
      <select id="taskQuickProj"><option value="">— Project —</option>${projNameOptions(taskAddDraft.project)}</select>
      <div class="task-composer-actions">
        <button type="button" class="ghost-button" data-task-cancel>Batal</button>
        <button type="submit" class="primary-button">Simpan</button>
      </div>
    </form>` : '';

  return `
  <section class="task-page">
    <div class="task-date"><strong>${greet}</strong> · ${escapeHtml(dateLabel)}</div>
    <div class="task-card task-progress-card">
      <div class="task-progress-head">
        <strong>${doneCount} / ${totalCount} selesai</strong>
        <span class="task-pct">${pct}%</span>
      </div>
      <div class="task-bar"><span style="width:${pct}%"></span></div>
    </div>
    <div class="task-pills" role="tablist">${pills}</div>
    ${composer}
    <section class="task-card task-section">
      <h3>Fokus Hari Ini</h3>
      <div class="task-list">
        ${active.length ? active.map(row).join('') : '<p class="task-empty">Belum ada task di sini. Tambah satu lewat tombol +.</p>'}
      </div>
    </section>
    ${done.length ? `
    <section class="task-card task-section">
      <h3>Selesai</h3>
      <div class="task-list">${done.map(row).join('')}</div>
    </section>` : ''}
    <button class="task-fab" type="button" data-task-add aria-label="Tambah task baru">+</button>
  </section>`;
}

function taskDateRead(iso) {
  if (!iso) return 'Pilih tanggal';
  if (iso === taskTodayIso()) return 'Hari ini';
  const [y, m, d] = iso.split('-').map(Number);
  const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${d} ${bulan[(m || 1) - 1]} ${y}`;
}

function taskTimeRead(v) {
  return v || 'Pilih jam';
}

function renderTaskAddPage() {
  const todayIso = taskTodayIso();
  const d = taskAddDraft;
  const prio = { high: 'High', med: 'Medium', low: 'Low' }[d.priority] || 'Low';
  const row = (icon, label, valueHtml, extra = '') => `
      <div class="task-add-row" ${extra}>
        <span class="task-add-ico">${icon}</span>
        <span class="task-add-label">${label}</span>
        <span class="task-add-value">${valueHtml}</span>
        <span class="task-add-chev">›</span>
      </div>`;
  const cal = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/></svg>';
  const clock = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>';
  const prioIco = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3.5l8.5 8.5L12 20.5 3.5 12z"/></svg>';
  const board = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="16" height="16" rx="3.5"/><path d="M10 4v16"/></svg>';
  const grid = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/></svg>';
  const optRows = taskAddOptions ? `
      <div class="task-add-opt-sep"></div>
      <label class="task-add-row task-add-desk">
        <span class="task-add-label">Deskripsi</span>
        <textarea name="opt-notes" rows="2" maxlength="400" placeholder="Jelaskan task ini… (opsional)">${escapeHtml(d.notes)}</textarea>
      </label>
      <label class="task-add-row task-add-desk">
        <span class="task-add-label">Catatan</span>
        <textarea name="opt-memo" rows="2" maxlength="400" placeholder="Catatan singkat (opsional)">${escapeHtml(d.memo)}</textarea>
      </label>
      <div class="task-add-row">
        <span class="task-add-label">Deadline</span>
        <span class="task-add-value"><input name="opt-deadline" type="date" value="${escapeHtml(d.deadline)}" /></span>
      </div>
      <div class="task-add-row">
        <span class="task-add-label">Estimasi</span>
        <span class="task-add-value"><select name="opt-estimate">
          <option value="">Tanpa estimasi</option>
          <option value="30" ${d.estimate === '30' ? 'selected' : ''}>30 menit</option>
          <option value="60" ${d.estimate === '60' ? 'selected' : ''}>1 jam</option>
          <option value="90" ${d.estimate === '90' ? 'selected' : ''}>1 jam 30 mnt</option>
          <option value="120" ${d.estimate === '120' ? 'selected' : ''}>2 jam</option>
          <option value="240" ${d.estimate === '240' ? 'selected' : ''}>4 jam</option>
        </select></span>
      </div>
      <div class="task-add-row">
        <span class="task-add-label">Reminder</span>
        <span class="task-add-value"><select name="opt-reminder">
          <option value="">Tidak ada</option>
          <option value="30" ${d.reminder === '30' ? 'selected' : ''}>30 menit sebelum</option>
          <option value="60" ${d.reminder === '60' ? 'selected' : ''}>1 jam sebelum</option>
          <option value="1440" ${d.reminder === '1440' ? 'selected' : ''}>1 hari sebelum</option>
        </select></span>
      </div>
      <div class="task-add-row">
        <span class="task-add-label">Tag</span>
        <span class="task-add-value"><input name="opt-tag" type="text" maxlength="24" placeholder="mis. promosi" value="${escapeHtml(d.tag)}" /></span>
      </div>
      <div class="task-add-row">
        <span class="task-add-label">Recurring</span>
        <span class="task-add-value"><select name="opt-recurring">
          <option value="">Tidak berulang</option>
          <option value="daily" ${d.recurring === 'daily' ? 'selected' : ''}>Harian</option>
          <option value="weekly" ${d.recurring === 'weekly' ? 'selected' : ''}>Mingguan</option>
          <option value="monthly" ${d.recurring === 'monthly' ? 'selected' : ''}>Bulanan</option>
        </select></span>
      </div>
      <div class="task-add-block">
        <div class="task-add-block-head"><span>Checklist Subtask</span>${d.checklist.length ? `<em>${d.checklist.length} item</em>` : ''}</div>
        ${d.checklist.map((c, i) => `<div class="task-add-block-row"><span>${escapeHtml(c.text)}</span><button type="button" class="task-add-x" data-task-sub-del="${i}" aria-label="Hapus subtask">×</button></div>`).join('')}
        <div class="task-add-inline">
          <input name="opt-sub-new" type="text" maxlength="60" placeholder="Tambah subtask…" autocomplete="off" />
          <button type="button" class="task-add-mini" data-task-sub-add>Tambah</button>
        </div>
      </div>
      <div class="task-add-block">
        <div class="task-add-block-head"><span>Attachment</span></div>
        ${d.attachments.length ? `<div class="task-add-att-chips">${d.attachments.map((a, i) => `<span class="task-chip att">📎 ${escapeHtml(a.text || '')}<button type="button" class="task-add-x" data-task-att-del="${i}" aria-label="Hapus lampiran">×</button></span>`).join('')}</div>` : '<p class="task-empty">Belum ada lampiran.</p>'}
        <div class="task-add-inline">
          <input name="opt-att-new" type="text" maxlength="60" placeholder="Nama file / link…" autocomplete="off" />
          <button type="button" class="task-add-mini" data-task-att-add>Tambah</button>
        </div>
      </div>` : '';
  return `
  <section class="task-page task-add-page">
    <div class="task-detail-top">
      <button class="icon-button task-back" type="button" data-task-add-close aria-label="Kembali">←</button>
      <strong>Tambah Task</strong>
    </div>
    <form class="task-add-form" id="taskAddForm">
      <div class="task-card task-add-title-card">
        <input id="taskAddTitle" name="title" type="text" maxlength="120" placeholder="Apa yang ingin dikerjakan?" autocomplete="off" value="${escapeHtml(d.title)}" />
        <div class="task-add-hint">Contoh: Buat konten promosi batu bata</div>
      </div>
      <div class="task-card task-add-rows">
        ${row(cal, 'Tanggal', `<span class="task-add-native-wrap"><span class="task-add-read">${taskDateRead(d.date)}</span><input name="date" type="date" value="${escapeHtml(d.date)}" data-add-sync="date" /></span>`)}
        ${row(clock, 'Jam', `<span class="task-add-native-wrap"><span class="task-add-read">${taskTimeRead(d.time)}</span><input name="time" type="time" value="${d.time}" data-add-sync="time" /></span>`)}
        ${row(`<span class="task-add-ico prio">${prioIco}</span>`, 'Prioritas', `<span class="task-dot dot-red"></span><select name="priority"><option value="high" ${d.priority === 'high' ? 'selected' : ''}>High</option><option value="med" ${d.priority === 'med' ? 'selected' : ''}>Medium</option><option value="low" ${d.priority === 'low' ? 'selected' : ''}>Low</option></select>`)}
        ${row(board, 'Project', `<span class="task-dot dot-red"></span><select name="project" required><option value="">— Pilih project —</option>${projNameOptions(d.project)}</select>`)}
        ${row(grid, 'Kategori', `<span class="task-dot dot-ring"></span><input name="category" type="text" maxlength="24" value="${escapeHtml(d.category)}" list="taskAddCats" />`)}
        <datalist id="taskAddCats"><option value="Marketing"></option><option value="Operasional"></option><option value="Keuangan"></option><option value="Konten"></option></datalist>
        <button class="task-add-row task-add-more" type="button" data-task-options>
          <span class="task-add-label" style="font-weight:800; color:var(--text)">Opsi Lainnya</span>
          <span class="task-add-chev ${taskAddOptions ? 'open' : ''}">⌄</span>
        </button>
        ${optRows}
      </div>
      <div class="task-add-actions">
        <button type="submit" class="primary-button">Simpan</button>
        <button type="button" class="secondary-button" data-task-add-again>Simpan &amp; Tambah Lagi</button>
      </div>
    </form>
  </section>`;
}

function taskAddCollect(form) {
  const el = (n) => form.querySelector(`[name=${n}]`);
  const val = (n) => el(n)?.value.trim() || '';
  const data = {
    title: val('title'),
    date: val('date') || taskTodayIso(),
    time: val('time'),
    priority: el('priority')?.value || 'low',
    project: val('project'),
    category: val('category'),
  };
  // Field opsional hanya ikut terkumpul saat ada di DOM (section terbuka);
  // kalau tidak ada, jangan timpa draft — cegah reset saat collapse.
  if (el('opt-tag')) data.tag = val('opt-tag');
  if (el('opt-notes')) data.notes = val('opt-notes');
  if (el('opt-memo')) data.memo = val('opt-memo');
  if (el('opt-reminder')) data.reminder = val('opt-reminder');
  if (el('opt-recurring')) data.recurring = val('opt-recurring');
  if (el('opt-deadline')) data.deadline = val('opt-deadline');
  if (el('opt-estimate')) data.estimate = el('opt-estimate').value.trim();
  return data;
}

// Simpan seluruh nilai form ke draft supaya tidak hilang saat form dirender ulang
function taskAddSyncDraft(form) {
  if (!form) return;
  Object.entries(taskAddCollect(form)).forEach(([k, v]) => { taskAddDraft[k] = v; });
  taskAddDraft.checklist.forEach((c) => { if (c._live) c.text = c._live.value.trim() || c.text; });
  taskAddDraft.attachments.forEach((a) => { if (a._live) a.text = String(a._live.value).trim() || a.text; });
  taskAddDraft.checklist = taskAddDraft.checklist.filter((c) => c.text);
  taskAddDraft.attachments = taskAddDraft.attachments.filter((a) => a.text);
}

function submitTaskAdd(form, again) {
  taskAddSyncDraft(form);
  const data = taskAddDraft;
  if (!data.title) {
    const el = form.querySelector('#taskAddTitle');
    el.focus();
    return false;
  }
  if (!data.project) { showToast('Pilih project terlebih dahulu — semua task harus berdasarkan project.', true); return false; }
  const checklist = taskAddDraft.checklist.map((c, i) => ({ id: `s${Date.now()}${i}`, text: c.text, done: false }));
  const attachments = taskAddDraft.attachments.map((a) => a.text);
  loadTasks().push({
    id: `t${Date.now()}`, title: data.title, project: data.project, tag: data.tag || data.category, time: data.time, priority: data.priority, date: data.date, done: false,
    notes: data.notes || undefined,
    memo: data.memo || (data.reminder ? `Reminder: ${data.reminder === '30' ? '30 mnt' : data.reminder === '60' ? '1 jam' : '1 hari'} sebelum deadline` : undefined),
    estimate: data.estimate ? Number(data.estimate) : undefined,
    deadlineDate: data.deadline || undefined,
    recurring: data.recurring || undefined,
    checklist: checklist.length ? checklist : undefined,
    attachments: attachments.length ? attachments : undefined,
  });
  saveTasks();
  const keep = { time: data.time || '19:00', priority: data.priority, project: data.project || firstProjName(), category: data.category || 'Marketing', date: data.date };
  taskAddDraft = Object.assign(taskAddDefaults(), again ? keep : {});
  return true;
}

function logActivityLastTask(text) {
  const tasks = loadTasks();
  const t = tasks[tasks.length - 1];
  if (t) logTaskActivity(t, text);
}

function mountTaskSearch() {
  const input = document.querySelector('#taskSearchInput');
  if (!input || input.dataset.taskBound === '1') return;
  input.dataset.taskBound = '1';
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    document.querySelectorAll('.task-page .task-row').forEach((el) => {
      const text = el.textContent.toLowerCase();
      el.style.display = !q || text.includes(q) ? '' : 'none';
    });
  });
}

function handleTaskAction(actionButton) {
  if (actionButton.matches('[data-task-open]')) {
    taskDetailId = actionButton.dataset.taskOpen;
    renderShell();
    return true;
  }
  if (actionButton.matches('[data-task-back]')) {
    if (taskEditing) { taskEditing = false; renderShell(); return true; }
    taskDetailId = null;
    renderShell();
    return true;
  }
  if (actionButton.matches('[data-task-add-close]')) {
    taskPageAdding = false;
    renderShell();
    return true;
  }
  if (actionButton.matches('[data-task-options]')) {
    taskAddSyncDraft(document.querySelector('#taskAddForm'));
    taskAddOptions = !taskAddOptions;
    renderShell();
    return true;
  }
  if (actionButton.matches('[data-task-sub-add]')) {
    const form = actionButton.closest('#taskAddForm');
    taskAddSyncDraft(form);
    const el = form.querySelector('[name=opt-sub-new]');
    const v = el ? el.value.trim() : '';
    if (v) { taskAddDraft.checklist.push({ text: v }); renderShell(); setTimeout(() => document.querySelector('[name=opt-sub-new]')?.focus(), 30); }
    else { el?.focus(); }
    return true;
  }
  if (actionButton.matches('[data-task-sub-del]')) {
    const form = actionButton.closest('#taskAddForm');
    taskAddSyncDraft(form);
    taskAddDraft.checklist.splice(Number(actionButton.dataset.taskSubDel), 1);
    renderShell();
    return true;
  }
  if (actionButton.matches('[data-task-att-add]')) {
    const form = actionButton.closest('#taskAddForm');
    taskAddSyncDraft(form);
    const el = form.querySelector('[name=opt-att-new]');
    const v = el ? el.value.trim() : '';
    if (v) { taskAddDraft.attachments.push({ text: v }); renderShell(); setTimeout(() => document.querySelector('[name=opt-att-new]')?.focus(), 30); }
    else { el?.focus(); }
    return true;
  }
  if (actionButton.matches('[data-task-att-del]')) {
    const form = actionButton.closest('#taskAddForm');
    taskAddSyncDraft(form);
    taskAddDraft.attachments.splice(Number(actionButton.dataset.taskAttDel), 1);
    renderShell();
    return true;
  }
  if (actionButton.matches('[data-task-add-again]')) {
    const form = document.querySelector('#taskAddForm');
    if (form && submitTaskAdd(form, true)) {
      logActivityLastTask('Task dibuat');
      taskAddOptions = false;
      renderShell();
      setTimeout(() => document.querySelector('#taskAddTitle')?.focus(), 50);
    }
    return true;
  }
  if (actionButton.matches('[data-task-menu]')) {
    const pop = actionButton.parentElement.querySelector('.task-menu-pop');
    if (pop) pop.hidden = !pop.hidden;
    return true;
  }
  if (actionButton.matches('[data-task-edit]')) {
    taskEditing = true;
    renderShell();
    return true;
  }
  if (actionButton.matches('[data-task-cancel-edit]')) {
    taskEditing = false;
    renderShell();
    return true;
  }
  if (actionButton.matches('[data-task-sub]')) {
    const t = loadTasks().find((x) => x.id === actionButton.dataset.taskSub);
    const c = t && Array.isArray(t.checklist) ? t.checklist.find((y) => y.id === actionButton.dataset.subId) : null;
    if (c) {
      c.done = !c.done;
      logTaskActivity(t, c.done ? `Checklist "${c.text}" selesai` : `Checklist "${c.text}" dibuka kembali`);
      saveTasks();
      renderShell();
    }
    return true;
  }
  if (actionButton.matches('[data-task-focus]')) {
    if (focusTaskId) stopFocus(); else startFocus();
    renderShell();
    return true;
  }
  if (actionButton.matches('[data-task-focus-pause]')) {
    const t = focusTask();
    if (t) { if (t.focusPausedSince) resumeFocus(); else pauseFocus(); }
    renderShell();
    setTimeout(tickFocusDisplay, 0);
    return true;
  }
  if (actionButton.matches('[data-task-filter]')) {
    taskFilter = actionButton.dataset.taskFilter;
    renderShell();
    return true;
  }
  if (actionButton.matches('[data-task-toggle]')) {
    const t = loadTasks().find((x) => x.id === actionButton.dataset.taskToggle);
    if (t) {
      t.done = !t.done;
      logTaskActivity(t, t.done ? 'Task ditandai selesai' : 'Task dibuka kembali');
      saveTasks();
      renderShell();
    }
    return true;
  }
  if (actionButton.matches('[data-task-delete]')) {
    const id = actionButton.dataset.taskDelete;
    state.tasks = loadTasks().filter((x) => x.id !== id);
    saveTasks();
    if (taskDetailId === id) { taskDetailId = null; taskEditing = false; }
    renderShell();
    return true;
  }
  if (actionButton.matches('[data-task-add]')) {
    taskPageAdding = true;
    taskAddOptions = false;
    renderShell();
    setTimeout(() => document.querySelector('#taskAddTitle')?.focus(), 60);
    return true;
  }
  if (actionButton.matches('[data-task-cancel]')) {
    taskAdding = false;
    renderShell();
    return true;
  }
  return false;
}

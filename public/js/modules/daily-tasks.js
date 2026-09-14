// Tracker Daily — daily-tasks
// Dipisah dari public/app.js (refactor modular; tidak ada identifier yang di-rename).
// Classic script — urutan load: lihat <script> di public/index.html.
'use strict';


/* ============ DAILY TASK (kegiatan rutin non-project) ============ */
const DAILY_TASK_STORE_KEY = 'miaw-tracker.daily-tasks.v1';
const DAILY_ROUTINES = [
  { id: 'r1', title: 'Olahraga 30 menit', time: '06:30', icon: '🏃', priority: 'med', days: 'everyday', note: '' },
  { id: 'r2', title: 'Baca buku / artikel', time: '20:30', icon: '📚', priority: 'low', days: 'everyday', note: '' },
  { id: 'r3', title: 'Cek & balas pesan pelanggan', time: '09:00', icon: '💬', priority: 'high', days: 'weekdays', note: '' },
  { id: 'r4', title: 'Setoran & catat keuangan', time: '17:00', icon: '🧾', priority: 'med', days: 'weekdays', note: '' },
  { id: 'r5', title: 'Planning mingguan', time: '07:00', icon: '🗓️', priority: 'med', days: 'monday', note: '' },
  { id: 'r6', title: 'Bersih-bersih rumah', time: '08:00', icon: '🧹', priority: 'low', days: 'sunday', note: '' },
];
const DAILY_ROUTINE_DAYS = [
  ['everyday', 'Setiap hari'],
  ['weekdays', 'Senin–Jumat'],
  ['weekend', 'Sabtu & Minggu'],
  ['monday', 'Setiap Senin'],
  ['sunday', 'Setiap Minggu'],
];
let dailyTab = 'today';        // today | rutin | selesai
let dailyAdding = false;
let dailyDraft = null;
let dailyDetailId = null;
let dailyEditingRoutineId = null;   // id rutinitas yang sedang diubah (null = tambah baru)
let dailyEditingTaskId = null;      // id kegiatan sekali (agenda hari ini) yang sedang diubah
let dailyAddKind = 'rutin';         // rutin | sekali  (jenis yang ditambahkan form)
let dailyFocusKey = null;           // `${kind}:${id}` item daily yang sesi fokusnya berjalan
let dailyFocusInterval = null;

function dailyTodayIso() { return taskTodayIso(); }

function dailyDowOf(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1).getDay(); // 0=Min
}

function dailyRoutineApplies(r, iso) {
  const dow = dailyDowOf(iso);
  if (r.days === 'everyday') return true;
  if (r.days === 'weekdays') return dow >= 1 && dow <= 5;
  if (r.days === 'weekend') return dow === 0 || dow === 6;
  if (r.days === 'monday') return dow === 1;
  if (r.days === 'sunday') return dow === 0;
  return true;
}

function loadDailyTasks() {
  let list = null;
  try {
    const raw = JSON.parse(localStorage.getItem(scopedKey(DAILY_TASK_STORE_KEY)) || 'null');
    if (Array.isArray(raw)) list = raw;
  } catch { /* seed */ }
  if (!Array.isArray(list)) {
    list = [
      { id: 'dt1', title: 'Minum 8 gelas air', icon: '💧', time: '', priority: 'low', date: dailyTodayIso(), done: false, routine: false, activity: [{ text: 'Rutinitas dibuat', at: Date.now() - 86400000 }] },
      { id: 'dt2', title: 'Kirim invoice klien', icon: '📮', time: '13:00', priority: 'high', date: dailyTodayIso(), done: false, routine: false, activity: [] },
      { id: 'dt3', title: 'Belanja sayur', icon: '🥬', time: '16:00', priority: 'med', date: taskDateOffset(1), done: false, routine: false, activity: [] },
      { id: 'dt4', title: 'Rapat komunitas', icon: '👥', time: '19:30', priority: 'low', date: taskDateOffset(2), done: false, routine: false, activity: [] },
    ];
  }
  // skor streak/riwayat rutinitas dibangun dari log harian
  if (!list.__dailyLog) {
    try {
      const raw = JSON.parse(localStorage.getItem(scopedKey(`${DAILY_TASK_STORE_KEY}.log`)) || '{}');
      list.__dailyLog = (raw && typeof raw === 'object') ? raw : {};
    } catch { list.__dailyLog = {}; }
  }
  // daftar rutinitas kustom (bila pengguna pernah menambah/mengubah/menghapus).
  // Disimpan di kunci terpisah karena saveDailyTasks() menulis hasil filter() — properti array tidak ikut tersimpan.
  try {
    const rawR = JSON.parse(localStorage.getItem(scopedKey(`${DAILY_TASK_STORE_KEY}.routines`)) || 'null');
    if (Array.isArray(rawR)) { list.__routines = rawR; list.__hasRoutines = true; }
  } catch { /* abaikan */ }
  return list;
}

function saveDailyTasks(list) {
  const plain = list.filter((x) => x && x.id);
  const log = list.__dailyLog || {};
  const routines = Array.isArray(list.__routines) ? list.__routines : null;
  try {
    localStorage.setItem(scopedKey(DAILY_TASK_STORE_KEY), JSON.stringify(plain));
    localStorage.setItem(scopedKey(`${DAILY_TASK_STORE_KEY}.log`), JSON.stringify(log));
    if (routines) localStorage.setItem(scopedKey(`${DAILY_TASK_STORE_KEY}.routines`), JSON.stringify(routines));
  } catch { /* ignore */ }
  if (typeof queueRemoteSave === 'function') queueRemoteSave();
}

function dailyRoutineDoneKey(r, iso) { return `${iso}:${r.id}`; }

/* ── Rutinitas tersimpan (store) ─────────────────────────────────────────────
   Daftar rutinitas bawaan (DAILY_ROUTINES) hanya menjadi benih. Begitu pengguna
   menambah/mengubah/menghapus, daftar lengkapnya disimpan di properti
   `__routines` pada store daily-tasks (pola sama seperti `__dailyLog`), sehingga
   id rutinitas bawaan tetap sama dan riwayat/streak tidak hilang. */
function loadDailyRoutines() {
  const store = loadDailyTasks();
  const list = Array.isArray(store.__routines) ? store.__routines : null;
  if (Array.isArray(list)) return list.filter((r) => r && r.id && r.title);
  return DAILY_ROUTINES;
}

function saveDailyRoutines(routines) {
  const store = loadDailyTasks();
  store.__routines = (routines || []).map((r) => {
    const out = {
      id: r.id,
      title: r.title,
      icon: r.icon || '📌',
      time: r.time || '',
      priority: r.priority || 'med',
      days: r.days || 'everyday',
      note: r.note || '',
    };
    if (r.category) out.category = r.category;
    // jejak sesi fokus + aktivitas harus ikut tersimpan saat rutinitas diubah
    if (Array.isArray(r.activity) && r.activity.length) out.activity = r.activity.slice(-30);
    if (r.actual) out.actual = r.actual;
    if (r.focusAt) out.focusAt = r.focusAt;
    if (r.focusPausedSince) out.focusPausedSince = r.focusPausedSince;
    if (r.focusPauseAccum) out.focusPauseAccum = r.focusPauseAccum;
    return out;
  });
  saveDailyTasks(store);
}

function dailyRoutineById(id) {
  return loadDailyRoutines().find((r) => r.id === id) || null;
}

function dailyRoutineNewId() {
  return `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

/* Hapus jejak log (streak/riwayat) milik rutinitas yang dihapus. */
function dailyPurgeRoutineLog(id) {
  const store = loadDailyTasks();
  const log = store.__dailyLog || {};
  Object.keys(log).forEach((k) => { if (k.endsWith(`:${id}`)) delete log[k]; });
  store.__dailyLog = log;
  saveDailyTasks(store);
}

/* Dipanggil dari submit handler di events/20-bind-events.js. */
function dailySubmitAdd(form) {
  const val = (n) => form.querySelector(`[name=${n}]`)?.value.trim() || '';
  const title = val('title');
  if (!title) return;
  const icon = val('icon') || '📌';
  const time = val('time');
  const priority = val('priority') || 'med';
  const category = val('category') || 'Umum';
  const kind = val('kind') === 'sekali' ? 'sekali' : 'rutin';

  if (kind === 'rutin') {
    const list = loadDailyRoutines().slice();
    const days = val('days') || 'everyday';
    if (dailyEditingRoutineId) {
      const idx = list.findIndex((r) => r.id === dailyEditingRoutineId);
      if (idx >= 0) list[idx] = { ...list[idx], title, icon, time, priority, days, category };
      saveDailyRoutines(list);
      showToast('Rutinitas diperbarui.');
    } else {
      list.push({ id: dailyRoutineNewId(), title, icon, time, priority, days, category, note: '' });
      saveDailyRoutines(list);
      showToast('Rutinitas ditambahkan.');
    }
  } else if (dailyEditingTaskId) {
    // ubah kegiatan sekali (agenda hari ini / mendatang) — tanggal tidak diubah
    const store = loadDailyTasks();
    const t = store.find((x) => x.id === dailyEditingTaskId);
    if (t) {
      t.title = title;
      t.icon = icon;
      t.time = time;
      t.priority = priority;
      t.category = category;
      logTaskActivity(t, 'Detail kegiatan diperbarui');
      saveDailyTasks(store);
      showToast('Kegiatan diperbarui.');
    }
  } else {
    const store = loadDailyTasks();
    store.push({
      id: `dt${Date.now()}`,
      title,
      icon,
      time,
      priority,
      category,
      date: dailyTodayIso(),
      done: false,
      routine: false,
      activity: [{ text: 'Kegiatan ditambahkan', at: Date.now() }],
    });
    store.__dailyLog = store.__dailyLog || {};
    saveDailyTasks(store);
    showToast('Kegiatan hari ini ditambahkan.');
  }

  dailyAdding = false;
  dailyDraft = null;
  dailyEditingRoutineId = null;
  dailyEditingTaskId = null;
  dailyAddKind = kind;
  renderShell();
}
function dailyIsRoutineDone(r, iso) {
  const tasks = loadDailyTasks();
  const log = tasks.__dailyLog || {};
  return Boolean(log[dailyRoutineDoneKey(r, iso)]);
}
function dailySetRoutineDone(r, iso, done) {
  const tasks = loadDailyTasks();
  const log = tasks.__dailyLog || {};
  if (done) log[dailyRoutineDoneKey(r, iso)] = true; else delete log[dailyRoutineDoneKey(r, iso)];
  tasks.__dailyLog = log;
  saveDailyTasks(tasks);
}

function dailyRoutineStats(r) {
  // streak + 14 hari terakhir
  const log = (loadDailyTasks().__dailyLog || {});
  let streak = 0;
  for (let i = 0; i < 90; i += 1) {
    const iso = taskDateOffset(-i);
    if (!dailyRoutineApplies(r, iso)) continue;
    if (log[dailyRoutineDoneKey(r, iso)]) streak += 1;
    else if (i > 0) break;
  }
  const hist = [];
  for (let i = 13; i >= 0; i -= 1) {
    const iso = taskDateOffset(-i);
    hist.push({ iso, on: dailyRoutineApplies(r, iso) && Boolean(log[dailyRoutineDoneKey(r, iso)]), skip: !dailyRoutineApplies(r, iso) });
  }
  return { streak, hist };
}

function dailyDayList(iso) {
  const items = loadJadwalEvents()
    .filter((e) => e.date === iso)
    .map((e) => ({ id: e.id, jadwal: true, time: e.time || '', title: e.title, sub: e.category || '', color: jadwalCatColor(e.category), kind: e.kind === 'task' ? 'task' : 'event', done: false }));
  loadDailyTasks().forEach((t) => {
    if (t.date === iso) items.push({ id: t.id, jadwal: false, time: t.time || '', title: t.title, sub: t.category || 'Kegiatan', color: t.priority === 'high' ? '#d96a6a' : t.priority === 'med' ? '#e8a33d' : '#8a9a5b', kind: 'task', done: !!t.done });
  });
  items.sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
  return items;
}

const DAILY_CATEGORIES = ['Umum', 'Pekerjaan', 'Pribadi', 'Kesehatan', 'Belajar', 'Rumah', 'Keuangan'];

function dailyAddDraftDefaults() {
  return { title: '', icon: '📌', time: '', priority: 'med', category: 'Umum', date: dailyTodayIso() };
}

function renderDailyTaskView() {
  const todayIso = dailyTodayIso();
  const tasks = loadDailyTasks();
  const log = tasks.__dailyLog || {};
  const allTasks = tasks.filter((t) => t && t.id);
  const doneToday = allTasks.filter((t) => t.date === todayIso && t.done).length;
  const openToday = allTasks.filter((t) => t.date === todayIso && !t.done);
  const todayAll = allTasks.filter((t) => t.date === todayIso);
  const routines = loadDailyRoutines();
  const routinesToday = routines.filter((r) => dailyRoutineApplies(r, todayIso));
  const totalToday = todayAll.length + routinesToday.length;
  const doneTotal = doneToday + routinesToday.filter((r) => dailyIsRoutineDone(r, todayIso)).length;
  const pct = totalToday ? Math.round((doneTotal / totalToday) * 100) : 0;
  const routinesDone = routinesToday.filter((r) => dailyIsRoutineDone(r, todayIso)).length;
  const now = new Date();
  const dateLabel = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const h = now.getHours();
  const greet = h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 19 ? 'Selamat sore' : 'Selamat malam';

  const chip = (text, cls) => (text ? `<span class="task-chip ${cls || ''}">${escapeHtml(text)}</span>` : '');
  const prioDot = (p) => `<span class="task-prio p-${p || 'low'}" aria-label="Prioritas"></span>`;

  // tab rutin
  let body = '';
  if (dailyTab === 'rutin') {
    const cards = routines.map((r) => {
      const st = dailyRoutineStats(r);
      const daysLabel = { everyday: 'Setiap hari', weekdays: 'Senin–Jumat', weekend: 'Sabtu & Minggu', monday: 'Setiap Senin', sunday: 'Setiap Minggu' }[r.days] || 'Terjadwal';
      const doneTodayR = dailyIsRoutineDone(r, todayIso);
      return `
        <section class="dt-card">
          <div class="dt-card-head">
            <span class="dt-ico">${r.icon}</span>
            <span class="dt-title" data-daily-open="r:${r.id}" role="button" tabindex="0" title="Lihat detail rutinitas">
              <strong>${escapeHtml(r.title)}</strong>
              <small>${daysLabel}${r.time ? ` · ⏰ ${escapeHtml(r.time)}` : ''} · 🔥 streak ${st.streak} hari</small>
              ${r.category ? `<span class="dt-tags"><span class="task-chip tag">${escapeHtml(r.category)}</span></span>` : ''}
            </span>
            <label class="task-check-wrap" title="${doneTodayR ? 'Sudah dilakukan hari ini' : 'Tandai selesai hari ini'}">
              <input class="task-check" type="checkbox" ${doneTodayR ? 'checked' : ''} data-daily-rt="${r.id}" data-iso="${todayIso}" />
            </label>
          </div>
          <div class="dt-hist" aria-hidden="true">
            ${st.hist.map((hh) => `<span class="dt-h ${hh.skip ? 'skip' : hh.on ? 'on' : ''}" title="${hh.iso}"></span>`).join('')}
          </div>
          <div class="dt-card-tools">
            <button class="dt-tool edit" type="button" data-daily-rtedit="${r.id}" aria-label="Ubah rutinitas" title="Ubah rutinitas">✎</button>
            <button class="dt-tool" type="button" data-daily-rtdel="${r.id}" aria-label="Hapus rutinitas" title="Hapus rutinitas">✕</button>
          </div>
        </section>`;
    }).join('');
    body = `<div class="dt-cards">${cards}</div>`;
  } else if (dailyTab === 'selesai') {
    const doneRows = allTasks.filter((t) => t.done).sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 30);
    body = `<section class="task-card task-section">
      <h3>Riwayat selesai</h3>
      <div class="task-list">
        ${doneRows.length ? doneRows.map((t) => `
          <div class="task-row done" data-daily-id="${t.id}">
            ${prioDot(t.priority)}
            <label class="task-check-wrap"><input class="task-check" type="checkbox" checked data-daily-toggle="${t.id}" /></label>
            <span class="task-main" data-daily-open="${t.id}" role="button" tabindex="0">
              <span class="task-name">${t.icon ? `${t.icon} ` : ''}${escapeHtml(t.title)}</span>
              <span class="task-meta">${chip(taskDateRead(t.date), 'tag')}${t.time ? `<span class="task-time">⏱ ${escapeHtml(t.time)}</span>` : ''}</span>
            </span>
            <button class="task-del icon-button" type="button" data-daily-delete="${t.id}" aria-label="Hapus">✕</button>
          </div>`).join('') : '<p class="task-empty">Belum ada riwayat.</p>'}
      </div>
    </section>`;
  } else {
    // HARI INI: daftar terpadu jadwal + rutinitas + task rutin
    const agenda = dailyDayList(todayIso);
    const agendaRows = agenda.map((it) => {
      const check = it.jadwal
        ? ''
        : `<label class="task-check-wrap"><input class="task-check" type="checkbox" ${it.done ? 'checked' : ''} data-daily-toggle="${it.id}" /></label>`;
      const open = it.jadwal
        ? `<span class="task-main" data-daily-jadwal="${it.id}" role="button" tabindex="0"><span class="task-name">${it.kind === 'task' ? '<span class="jadwal-dot ring" style="--jc:' + it.color + '"></span>' : '<span class="jadwal-dot" style="background:' + it.color + '"></span>'} ${escapeHtml(it.title)}</span><span class="task-meta">${chip(it.sub, 'tag')}</span></span>`
        : `<span class="task-main" data-daily-open="${it.id}" role="button" tabindex="0"><span class="task-name">${escapeHtml(it.title)}</span><span class="task-meta">${chip(it.sub, 'tag')}${it.time ? `<span class="task-time">⏱ ${escapeHtml(it.time)}</span>` : ''}</span></span>`;
      const rowTools = it.jadwal
        ? ''
        : `<span class="dt-row-tools"><button class="dt-tool edit" type="button" data-daily-edit="${it.id}" aria-label="Ubah kegiatan" title="Ubah kegiatan">✎</button></span>`;
      return `<div class="task-row ${it.done ? 'done' : ''}">
          ${it.jadwal ? prioDot(it.kind === 'task' ? 'med' : 'low') : prioDot(loadDailyTasks().find((x) => x.id === it.id)?.priority)}
          ${check}
          ${open}
          ${rowTools}
        </div>`;
    }).join('');
    const later = allTasks.filter((t) => t.date > todayIso && !t.done).sort((a, b) => String(a.date).localeCompare(String(b.date))).slice(0, 6);
    body = `
      <section class="task-card task-section">
        <div class="task-sec-head"><h3>Agenda hari ini</h3><span class="task-sec-meta">${routinesDone}/${routinesToday.length} rutinitas</span></div>
        <div class="task-list">${agenda.length ? agendaRows : '<p class="task-empty">Tidak ada agenda. Tenang sebentar.</p>'}</div>
      </section>
      ${later.length ? `
      <section class="task-card task-section">
        <h3>Mendatang</h3>
        <div class="task-list">${later.map((t) => `
          <div class="task-row" data-daily-id="${t.id}">
            ${prioDot(t.priority)}
            <label class="task-check-wrap"><input class="task-check" type="checkbox" data-daily-toggle="${t.id}" /></label>
            <span class="task-main" data-daily-open="${t.id}" role="button" tabindex="0">
              <span class="task-name">${t.icon ? `${t.icon} ` : ''}${escapeHtml(t.title)}</span>
              <span class="task-meta">${chip(taskDateRead(t.date), 'tag')}${chip(t.category || '', 'tag')}${t.time ? `<span class="task-time">⏱ ${escapeHtml(t.time)}</span>` : ''}</span>
            </span>
            <span class="dt-row-tools"><button class="dt-tool edit" type="button" data-daily-edit="${t.id}" aria-label="Ubah kegiatan" title="Ubah kegiatan">✎</button></span>
          </div>`).join('')}</div>
      </section>` : ''}`;
  }

  const tabs = `
    <div class="dt-tabs" role="tablist">
      <button type="button" class="dt-tab ${dailyTab === 'today' ? 'on' : ''}" data-daily-tab="today">Hari Ini</button>
      <button type="button" class="dt-tab ${dailyTab === 'rutin' ? 'on' : ''}" data-daily-tab="rutin">Rutinitas</button>
      <button type="button" class="dt-tab ${dailyTab === 'selesai' ? 'on' : ''}" data-daily-tab="selesai">Selesai</button>
    </div>`;

  const draft = dailyDraft || dailyAddDraftDefaults();
  const addForm = dailyAdding ? `
    <form class="dt-add-card" id="dailyAddForm">
      <div class="jadwal-add-head"><span>${dailyEditingRoutineId ? 'Ubah Rutinitas' : dailyEditingTaskId ? 'Ubah Kegiatan' : 'Tambah Kegiatan'}</span><button type="button" class="task-add-x" data-daily-cancel aria-label="Batal">×</button></div>
      <input name="title" type="text" maxlength="90" placeholder="Nama kegiatan…" autocomplete="off" required value="${escapeHtml(draft.title || '')}" />
      <div class="jadwal-add-grid">
        <label><span>Ikon</span><select name="icon">${['📌','💧','🏃','📚','🧘','🛒','🐶','🎸','🧹','📮'].map((ic) => `<option value="${ic}" ${draft.icon === ic ? 'selected' : ''}>${ic}</option>`).join('')}</select></label>
        <label><span>Jam</span><input name="time" type="time" value="${escapeHtml(draft.time || '')}" /></label>
        <label><span>Prioritas</span><select name="priority">
          <option value="low" ${draft.priority === 'low' ? 'selected' : ''}>Rendah</option>
          <option value="med" ${draft.priority === 'med' ? 'selected' : ''}>Sedang</option>
          <option value="high" ${draft.priority === 'high' ? 'selected' : ''}>Tinggi</option>
        </select></label>
        <label><span>Jenis</span><select name="kind" ${dailyEditingRoutineId || dailyEditingTaskId ? 'disabled' : ''}>
          <option value="rutin" ${(draft.kind || 'rutin') === 'rutin' ? 'selected' : ''}>Rutinitas (berulang)</option>
          <option value="sekali" ${draft.kind === 'sekali' ? 'selected' : ''}>Sekali (hari ini)</option>
        </select></label>
        <label><span>Jadwal</span><select name="days" ${dailyEditingRoutineId || dailyEditingTaskId ? 'disabled' : ''}>
          ${DAILY_ROUTINE_DAYS.map(([v, label]) => `<option value="${v}" ${(draft.days || 'everyday') === v ? 'selected' : ''}>${label}</option>`).join('')}
        </select></label>
        <label><span>Kategori</span><input name="category" maxlength="24" list="dailyCats" value="${escapeHtml(draft.category || 'Umum')}" placeholder="cth. Pekerjaan" /></label>
      </div>
      <datalist id="dailyCats">${DAILY_CATEGORIES.map((c) => `<option value="${c}"></option>`).join('')}</datalist>
      <p class="dt-add-hint">Jenis <b>Rutinitas</b> menyimpan di daftar Rutinitas (berulang sesuai Jadwal). <b>Sekali</b> hanya menambah kegiatan untuk hari ini. <b>Kategori</b> tampil di samping nama pada Agenda hari ini.</p>
      <button class="primary-button jadwal-add-save" type="submit">Simpan</button>
    </form>` : '';

  return `
  <section class="task-page dt-page">
    <div class="task-date"><strong>${greet}</strong> · ${escapeHtml(dateLabel)}</div>
    <div class="task-card task-progress-card">
      <div class="task-progress-head">
        <strong>${doneTotal} / ${totalToday} kegiatan hari ini</strong>
        <span class="task-pct">${pct}%</span>
      </div>
      <div class="task-bar"><span style="width:${pct}%"></span></div>
      <div class="dt-progress-sub">${openToday.length} kegiatan + ${routinesToday.length - routinesDone} rutinitas belum selesai</div>
    </div>
    ${tabs}
    ${addForm}
    ${body}
    <button class="task-fab" type="button" data-daily-add aria-label="Tambah kegiatan rutin">+</button>
  </section>`;
}

function dailyDetailOf(id) {
  return loadDailyTasks().find((x) => x.id === id) || null;
}

/* Detail daily bisa membuka kegiatan sekali (id langsung) atau rutinitas (`r:<id>`). */
function dailyDetailKind(id) { return String(id || '').indexOf('r:') === 0 ? 'rutin' : 'task'; }
function dailyDetailRawId(id) { return dailyDetailKind(id) === 'rutin' ? String(id).slice(2) : id; }
function dailyDetailItem(id) {
  return dailyDetailKind(id) === 'rutin' ? dailyRoutineById(dailyDetailRawId(id)) : dailyDetailOf(id);
}

function dailyFocusLoad(kind, id) {
  return kind === 'rutin' ? dailyRoutineById(id) : dailyDetailOf(id);
}

function dailyFocusSave(kind, item) {
  if (kind === 'rutin') {
    saveDailyRoutines(loadDailyRoutines().map((r) => (r.id === item.id ? { ...r, ...item } : r)));
    return;
  }
  const store = loadDailyTasks();
  const idx = store.findIndex((x) => x.id === item.id);
  if (idx >= 0) store[idx] = { ...store[idx], ...item };
  store.__dailyLog = store.__dailyLog || {};
  saveDailyTasks(store);
}

function dailyFocusItem() {
  if (!dailyFocusKey) return null;
  const cut = dailyFocusKey.indexOf(':');
  const kind = dailyFocusKey.slice(0, cut);
  const id = dailyFocusKey.slice(cut + 1);
  const item = dailyFocusLoad(kind, id);
  return item && item.focusAt ? { kind, id, item } : null;
}

function dailyStartFocus(kind, id) {
  const t = dailyFocusLoad(kind, id);
  if (!t || t.focusAt) return;
  if (dailyFocusKey) dailyStopFocus();
  t.actual = (t.actual || 0) + (t.focusAt ? focusElapsedMs(t) / 60000 : 0);
  t.focusAt = Date.now();
  t.focusPausedSince = null;
  t.focusPauseAccum = 0;
  logTaskActivity(t, 'Sesi fokus dimulai.');
  dailyFocusSave(kind, t);
  dailyFocusKey = `${kind}:${id}`;
  if (!dailyFocusInterval) dailyFocusInterval = setInterval(dailyTickFocus, 1000);
  showToast('Sesi fokus dimulai.');
  renderShell();
}

function dailyPauseFocus() {
  const f = dailyFocusItem();
  if (!f || f.item.focusPausedSince) return;
  f.item.focusPausedSince = Date.now();
  logTaskActivity(f.item, 'Fokus dijeda.');
  dailyFocusSave(f.kind, f.item);
  dailyTickFocus();
}

function dailyResumeFocus() {
  const f = dailyFocusItem();
  if (!f || !f.item.focusPausedSince) return;
  f.item.focusPauseAccum = (f.item.focusPauseAccum || 0) + (Date.now() - f.item.focusPausedSince);
  f.item.focusPausedSince = null;
  logTaskActivity(f.item, 'Fokus dilanjutkan.');
  dailyFocusSave(f.kind, f.item);
  dailyTickFocus();
}

function dailyStopFocus() {
  const f = dailyFocusItem();
  if (f) {
    f.item.actual = (f.item.actual || 0) + focusElapsedMs(f.item) / 60000;
    f.item.focusAt = null;
    f.item.focusPausedSince = null;
    f.item.focusPauseAccum = 0;
    logTaskActivity(f.item, 'Sesi fokus dihentikan.');
    dailyFocusSave(f.kind, f.item);
  }
  dailyFocusKey = null;
  if (dailyFocusInterval) { clearInterval(dailyFocusInterval); dailyFocusInterval = null; }
  renderShell();
}

function dailyTickFocus() {
  const f = dailyFocusItem();
  if (!f) return;
  const txt = focusSecondsLabel(focusElapsedMs(f.item));
  document.querySelectorAll('[data-daily-focus-live]').forEach((el) => { el.textContent = txt; });
  const pauseBtn = document.querySelector('[data-daily-focus-pause]');
  if (pauseBtn) pauseBtn.textContent = f.item.focusPausedSince ? 'Lanjut' : 'Jeda';
  const line = document.querySelector('.dt-focus-state');
  if (line) line.textContent = f.item.focusPausedSince ? 'Fokus dijeda' : 'Sesi fokus berjalan';
}

/* Kontrol sesi fokus — sengaja sebaris dengan tombol Tandai Selesai. */
function dailyFocusActionHtml(kind, id, item) {
  const key = `${kind}:${id}`;
  if (item.focusAt && dailyFocusKey === key) {
    return `<span class="dt-focus-inline${item.focusPausedSince ? ' paused' : ''}">
        <span class="task-focus-dotpulse"></span>
        <span class="dt-focus-state">${item.focusPausedSince ? 'Dijeda' : 'Fokus'}</span>
        <strong data-daily-focus-live>${focusSecondsLabel(focusElapsedMs(item))}</strong>
        <button class="secondary-button" type="button" data-daily-focus-pause>${item.focusPausedSince ? 'Lanjut' : 'Jeda'}</button>
        <button class="secondary-button danger" type="button" data-daily-focus-stop>Stop</button>
      </span>`;
  }
  return `<button class="secondary-button task-focus-btn" type="button" data-daily-focus-start="${key}">${item.actual ? '▶ Fokus Lagi' : '▶ Mulai Fokus'}</button>`;
}

function dailyActivityHtml(item) {
  const acts = Array.isArray(item.activity) ? [...item.activity].sort((a, b) => b.at - a.at) : [];
  return `<section class="task-card task-detail-sec">
      <h3>Activity</h3>
      <ul class="task-activity">
        ${acts.length ? acts.map((a) => `<li><span>${escapeHtml(a.text)}</span><time>${taskRelTime(a.at)}</time></li>`).join('') : '<li class="task-empty">Belum ada aktivitas.</li>'}
      </ul>
    </section>`;
}

function renderDailyDetail() {
  const kind = dailyDetailKind(dailyDetailId);
  const id = dailyDetailRawId(dailyDetailId);
  const item = dailyDetailItem(dailyDetailId);
  if (!item) return '';
  const actsBlock = dailyActivityHtml(item);

  if (kind === 'rutin') {
    const st = dailyRoutineStats(item);
    const daysLabel = DAILY_ROUTINE_DAYS.filter(([v]) => v === item.days).map(([, l]) => l)[0] || 'Setiap hari';
    const doneTodayR = dailyIsRoutineDone(item, dailyTodayIso());
    return `
    <section class="task-page task-detail">
      <div class="task-detail-top">
        <button class="icon-button task-back" type="button" data-daily-back aria-label="Kembali">←</button>
        <strong>Detail Rutinitas</strong>
        <span></span>
      </div>
      <div class="task-card task-detail-head">
        <div class="task-detail-chips">
          <span class="task-chip status ${doneTodayR ? 'done' : 'prog'}">${doneTodayR ? 'Sudah hari ini' : 'Belum hari ini'}</span>
          <span class="task-chip tag">${escapeHtml(item.category || 'Umum')}</span>
        </div>
        <h2 class="task-detail-title">${item.icon ? `${item.icon} ` : ''}${escapeHtml(item.title)}</h2>
      </div>
      <div class="task-card task-detail-info">
        <div class="task-info-grid">
          <div class="task-info-cell"><span class="task-info-label">Jadwal</span><span class="task-info-value">${daysLabel}</span></div>
          <div class="task-info-cell"><span class="task-info-label">Jam</span><span class="task-info-value">${item.time || '—'}</span></div>
          <div class="task-info-cell"><span class="task-info-label">Streak</span><span class="task-info-value">🔥 ${st.streak} hari</span></div>
          <div class="task-info-cell"><span class="task-info-label">Total selesai</span><span class="task-info-value">${st.total || 0}x</span></div>
          ${item.actual ? `<div class="task-info-cell"><span class="task-info-label">Total fokus</span><span class="task-info-value">${Math.round(item.actual)} menit</span></div>` : ''}
        </div>
        <div class="dt-hist" aria-hidden="true">
          ${st.hist.map((hh) => `<span class="dt-h ${hh.skip ? 'skip' : hh.on ? 'on' : ''}" title="${hh.iso}"></span>`).join('')}
        </div>
      </div>
      <div class="task-detail-actions dt-actions-main">
        <button class="primary-button" type="button" data-daily-rt-toggle="${item.id}">${doneTodayR ? 'Batalkan Hari Ini' : 'Tandai Selesai Hari Ini'}</button>
        ${dailyFocusActionHtml('rutin', item.id, item)}
      </div>
      <div class="task-detail-actions dt-actions-sub">
        <button class="secondary-button" type="button" data-daily-rtedit="${item.id}">Ubah</button>
        <button class="secondary-button danger" type="button" data-daily-rtdel="${item.id}">Hapus</button>
      </div>
      ${actsBlock}
    </section>`;
  }

  const t = item;
  const prio = { high: ['Prioritas Tinggi', 'high'], med: ['Prioritas Sedang', 'med'], low: ['Prioritas Rendah', 'low'] }[t.priority || 'low'];
  return `
  <section class="task-page task-detail">
    <div class="task-detail-top">
      <button class="icon-button task-back" type="button" data-daily-back aria-label="Kembali">←</button>
      <strong>Detail Kegiatan</strong>
      <span></span>
    </div>
    <div class="task-card task-detail-head">
      <div class="task-detail-chips">
        <span class="task-chip prio ${prio[1]}">${prio[0]}</span>
        <span class="task-chip status ${t.done ? 'done' : 'prog'}">${t.done ? 'Selesai' : 'In Progres'}</span>
        <span class="task-chip tag">${escapeHtml(t.category || 'Umum')}</span>
      </div>
      <h2 class="task-detail-title">${t.icon ? `${t.icon} ` : ''}${escapeHtml(t.title)}</h2>
    </div>
    <div class="task-card task-detail-info">
      <div class="task-info-grid">
        <div class="task-info-cell"><span class="task-info-label">Tanggal</span><span class="task-info-value">${taskDateRead(t.date)}</span></div>
        <div class="task-info-cell"><span class="task-info-label">Jam</span><span class="task-info-value">${t.time || '—'}</span></div>
        <div class="task-info-cell"><span class="task-info-label">Kategori</span><span class="task-info-value">${escapeHtml(t.category || 'Kegiatan')}</span></div>
        <div class="task-info-cell"><span class="task-info-label">Total fokus</span><span class="task-info-value">${Math.round(t.actual || 0)} menit</span></div>
      </div>
    </div>
    <div class="task-detail-actions dt-actions-main">
      <button class="primary-button" type="button" data-daily-toggle="${t.id}">${t.done ? 'Tandai Belum Selesai' : 'Tandai Selesai'}</button>
      ${dailyFocusActionHtml('task', t.id, t)}
    </div>
    <div class="task-detail-actions dt-actions-sub">
      <button class="secondary-button" type="button" data-daily-edit="${t.id}">Ubah</button>
      <button class="secondary-button danger" type="button" data-daily-delete="${t.id}">Hapus</button>
    </div>
    ${actsBlock}
  </section>`;
}

function handleDailyAction(btn) {
  if (btn.matches('[data-daily-tab]')) { dailyTab = btn.dataset.dailyTab; renderShell(); return true; }
  if (btn.matches('[data-daily-add]')) {
    dailyAdding = true;
    dailyEditingRoutineId = null;
    dailyAddKind = dailyTab === 'rutin' ? 'rutin' : 'sekali';
    dailyDraft = { ...dailyAddDraftDefaults(), kind: dailyAddKind, days: 'everyday' };
    renderShell(); setTimeout(() => document.querySelector('#dailyAddForm [name=title]')?.focus(), 30);
    return true;
  }
  if (btn.matches('[data-daily-cancel]')) { dailyAdding = false; dailyDraft = null; dailyEditingRoutineId = null; dailyEditingTaskId = null; renderShell(); return true; }
  if (btn.matches('[data-daily-rtedit]')) {
    const r = dailyRoutineById(btn.dataset.dailyRtedit);
    if (r) {
      dailyTab = 'rutin';
      dailyEditingRoutineId = r.id;
      dailyAddKind = 'rutin';
      dailyAdding = true;
      dailyDraft = { title: r.title, icon: r.icon || '📌', time: r.time || '', priority: r.priority || 'med', kind: 'rutin', days: r.days || 'everyday' };
      renderShell(); setTimeout(() => document.querySelector('#dailyAddForm [name=title]')?.focus(), 30);
    }
    return true;
  }
  if (btn.matches('[data-daily-rtdel]')) {
    const id = btn.dataset.dailyRtdel;
    const target = dailyRoutineById(id);
    if (target) {
      saveDailyRoutines(loadDailyRoutines().filter((r) => r.id !== id));
      dailyPurgeRoutineLog(id);
      if (dailyEditingRoutineId === id) { dailyEditingRoutineId = null; dailyAdding = false; dailyDraft = null; }
      if (dailyFocusKey === `rutin:${id}`) dailyStopFocus();
      showToast(`Rutinitas "${target.title}" dihapus.`);
      renderShell();
    }
    return true;
  }
  if (btn.matches('[data-daily-rt]')) {
    // checkbox: toggle selesai-hari-ini rutinitas
    const r = dailyRoutineById(btn.dataset.dailyRt);
    if (r) { dailySetRoutineDone(r, btn.dataset.iso || dailyTodayIso(), btn.checked); renderShell(); }
    return true;
  }
  if (btn.matches('[data-daily-toggle]')) {
    const list = loadDailyTasks();
    const t = list.find((x) => x.id === btn.dataset.dailyToggle);
    if (t) {
      t.done = !t.done;
      t.activity = Array.isArray(t.activity) ? t.activity : [];
      t.activity.push({ text: t.done ? 'Kegiatan ditandai selesai' : 'Kegiatan dibuka kembali', at: Date.now() });
      saveDailyTasks(list);
      renderShell();
    }
    return true;
  }
  if (btn.matches('[data-daily-open]')) { dailyDetailId = btn.dataset.dailyOpen; renderShell(); return true; }
  if (btn.matches('[data-daily-jadwal]')) {
    // dari agenda → menuju jadwal (hari terpilih = tanggal agenda ini)
    const ev = loadJadwalEvents().find((x) => x.id === btn.dataset.dailyJadwal);
    if (ev) { jadwalSelIso = ev.date; activeView = 'jadwal'; state.selectedView = 'jadwal'; saveState(); renderShell(); }
    return true;
  }
  if (btn.matches('[data-daily-delete]')) {
    const list = loadDailyTasks();
    const plain = list.filter((x) => x && x.id !== btn.dataset.dailyDelete);
    plain.__dailyLog = list.__dailyLog || {};
    saveDailyTasks(plain);
    if (dailyDetailId === btn.dataset.dailyDelete) dailyDetailId = null;
    if (dailyFocusKey === `task:${btn.dataset.dailyDelete}`) dailyStopFocus();
    renderShell();
    return true;
  }
  if (btn.matches('[data-daily-back]')) { dailyDetailId = null; renderShell(); return true; }
  if (btn.matches('[data-daily-edit]')) {
    const t = dailyDetailOf(btn.dataset.dailyEdit);
    if (t) {
      dailyTab = 'today';
      dailyEditingTaskId = t.id;
      dailyEditingRoutineId = null;
      dailyAddKind = 'sekali';
      dailyAdding = true;
      dailyDraft = {
        title: t.title, icon: t.icon || '📌', time: t.time || '', priority: t.priority || 'med',
        category: t.category || 'Umum', kind: 'sekali', days: 'everyday',
      };
      renderShell();
      setTimeout(() => document.querySelector('#dailyAddForm [name=title]')?.focus(), 30);
    }
    return true;
  }
  if (btn.matches('[data-daily-rt-toggle]')) {
    const r = dailyRoutineById(btn.dataset.dailyRtToggle);
    if (r) {
      const iso = dailyTodayIso();
      const next = !dailyIsRoutineDone(r, iso);
      dailySetRoutineDone(r, iso, next);
      showToast(next ? `Rutinitas "${r.title}" selesai hari ini.` : `Rutinitas "${r.title}" dibatalkan.`);
      renderShell();
    }
    return true;
  }
  if (btn.matches('[data-daily-focus-start]')) {
    const parts = String(btn.dataset.dailyFocusStart).split(':');
    if (parts.length >= 2) dailyStartFocus(parts[0], parts.slice(1).join(':'));
    return true;
  }
  if (btn.matches('[data-daily-focus-pause]')) {
    const f = dailyFocusItem();
    if (f) { if (f.item.focusPausedSince) dailyResumeFocus(); else dailyPauseFocus(); }
    return true;
  }
  if (btn.matches('[data-daily-focus-stop]')) { dailyStopFocus(); return true; }
  return false;
}

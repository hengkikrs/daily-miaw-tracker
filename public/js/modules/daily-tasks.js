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
let dailyTab = 'today';        // today | rutin | selesai
let dailyAdding = false;
let dailyDraft = null;
let dailyDetailId = null;

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
  return list;
}

function saveDailyTasks(list) {
  const plain = list.filter((x) => x && x.id);
  const log = list.__dailyLog || {};
  try {
    localStorage.setItem(scopedKey(DAILY_TASK_STORE_KEY), JSON.stringify(plain));
    localStorage.setItem(scopedKey(`${DAILY_TASK_STORE_KEY}.log`), JSON.stringify(log));
  } catch { /* ignore */ }
  if (typeof queueRemoteSave === 'function') queueRemoteSave();
}

function dailyRoutineDoneKey(r, iso) { return `${iso}:${r.id}`; }
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
    if (t.date === iso) items.push({ id: t.id, jadwal: false, time: t.time || '', title: t.title, sub: t.icon ? `${t.icon} rutinitas` : 'rutinitas', color: t.priority === 'high' ? '#d96a6a' : t.priority === 'med' ? '#e8a33d' : '#8a9a5b', kind: 'task', done: !!t.done });
  });
  items.sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
  return items;
}

function dailyAddDraftDefaults() {
  return { title: '', icon: '📌', time: '', priority: 'med', date: dailyTodayIso() };
}

function renderDailyTaskView() {
  const todayIso = dailyTodayIso();
  const tasks = loadDailyTasks();
  const log = tasks.__dailyLog || {};
  const allTasks = tasks.filter((t) => t && t.id);
  const doneToday = allTasks.filter((t) => t.date === todayIso && t.done).length;
  const openToday = allTasks.filter((t) => t.date === todayIso && !t.done);
  const todayAll = allTasks.filter((t) => t.date === todayIso);
  const totalToday = todayAll.length + DAILY_ROUTINES.filter((r) => dailyRoutineApplies(r, todayIso)).length;
  const doneTotal = doneToday + DAILY_ROUTINES.filter((r) => dailyRoutineApplies(r, todayIso) && dailyIsRoutineDone(r, todayIso)).length;
  const pct = totalToday ? Math.round((doneTotal / totalToday) * 100) : 0;
  const routinesToday = DAILY_ROUTINES.filter((r) => dailyRoutineApplies(r, todayIso));
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
    const cards = DAILY_ROUTINES.map((r) => {
      const st = dailyRoutineStats(r);
      const daysLabel = { everyday: 'Setiap hari', weekdays: 'Senin–Jumat', weekend: 'Sabtu & Minggu', monday: 'Setiap Senin', sunday: 'Setiap Minggu' }[r.days] || 'Terjadwal';
      const doneTodayR = dailyIsRoutineDone(r, todayIso);
      return `
        <section class="dt-card">
          <div class="dt-card-head">
            <span class="dt-ico">${r.icon}</span>
            <span class="dt-title">
              <strong>${escapeHtml(r.title)}</strong>
              <small>${daysLabel}${r.time ? ` · ⏰ ${escapeHtml(r.time)}` : ''} · 🔥 streak ${st.streak} hari</small>
            </span>
            <label class="task-check-wrap" title="${doneTodayR ? 'Sudah dilakukan hari ini' : 'Tandai selesai hari ini'}">
              <input class="task-check" type="checkbox" ${doneTodayR ? 'checked' : ''} data-daily-rt="${r.id}" data-iso="${todayIso}" />
            </label>
          </div>
          <div class="dt-hist" aria-hidden="true">
            ${st.hist.map((hh) => `<span class="dt-h ${hh.skip ? 'skip' : hh.on ? 'on' : ''}" title="${hh.iso}"></span>`).join('')}
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
      return `<div class="task-row ${it.done ? 'done' : ''}">
          ${it.jadwal ? prioDot(it.kind === 'task' ? 'med' : 'low') : prioDot(loadDailyTasks().find((x) => x.id === it.id)?.priority)}
          ${check}
          ${open}
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
              <span class="task-meta">${chip(taskDateRead(t.date), 'tag')}${t.time ? `<span class="task-time">⏱ ${escapeHtml(t.time)}</span>` : ''}</span>
            </span>
          </div>`).join('')}</div>
      </section>` : ''}`;
  }

  const tabs = `
    <div class="dt-tabs" role="tablist">
      <button type="button" class="dt-tab ${dailyTab === 'today' ? 'on' : ''}" data-daily-tab="today">Hari Ini</button>
      <button type="button" class="dt-tab ${dailyTab === 'rutin' ? 'on' : ''}" data-daily-tab="rutin">Rutinitas</button>
      <button type="button" class="dt-tab ${dailyTab === 'selesai' ? 'on' : ''}" data-daily-tab="selesai">Selesai</button>
    </div>`;

  const addForm = dailyAdding ? `
    <form class="dt-add-card" id="dailyAddForm">
      <div class="jadwal-add-head"><span>Tambah Kegiatan</span><button type="button" class="task-add-x" data-daily-cancel aria-label="Batal">×</button></div>
      <input name="title" type="text" maxlength="90" placeholder="Nama kegiatan rutin…" autocomplete="off" required value="${escapeHtml((dailyDraft || {}).title || '')}" />
      <div class="jadwal-add-grid">
        <label><span>Ikun</span><select name="icon">${['📌','💧','🏃','📚','🧘','🛒','🐶','🎸','🧹','📮'].map((ic) => `<option value="${ic}" ${((dailyDraft || {}).icon) === ic ? 'selected' : ''}>${ic}</option>`).join('')}</select></label>
        <label><span>Jam</span><input name="time" type="time" value="${escapeHtml((dailyDraft || {}).time || '')}" /></label>
        <label><span>Prioritas</span><select name="priority">
          <option value="low" ${((dailyDraft || {}).priority) === 'low' ? 'selected' : ''}>Rendah</option>
          <option value="med" ${((dailyDraft || {}).priority) === 'med' ? 'selected' : ''}>Sedang</option>
          <option value="high" ${((dailyDraft || {}).priority) === 'high' ? 'selected' : ''}>Tinggi</option>
        </select></label>
      </div>
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

function renderDailyDetail() {
  const t = dailyDetailOf(dailyDetailId);
  if (!t) return '';
  const prio = { high: ['Prioritas Tinggi', 'high'], med: ['Prioritas Sedang', 'med'], low: ['Prioritas Rendah', 'low'] }[t.priority || 'low'];
  const acts = Array.isArray(t.activity) ? [...t.activity].sort((a, b) => b.at - a.at) : [];
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
      </div>
      <h2 class="task-detail-title">${t.icon ? `${t.icon} ` : ''}${escapeHtml(t.title)}</h2>
    </div>
    <div class="task-card task-detail-info">
      <div class="task-info-grid">
        <div class="task-info-cell"><span class="task-info-label">Tanggal</span><span class="task-info-value">${taskDateRead(t.date)}</span></div>
        <div class="task-info-cell"><span class="task-info-label">Jam</span><span class="task-info-value">${t.time || '—'}</span></div>
      </div>
    </div>
    <div class="task-detail-actions">
      <button class="primary-button" type="button" data-daily-toggle="${t.id}">${t.done ? 'Tandai Belum Selesai' : 'Tandai Selesai'}</button>
      <button class="secondary-button" type="button" data-daily-delete="${t.id}">Hapus</button>
    </div>
    <section class="task-card task-detail-sec">
      <h3>Activity</h3>
      <ul class="task-activity">
        ${acts.length ? acts.map((a) => `<li><span>${escapeHtml(a.text)}</span><time>${taskRelTime(a.at)}</time></li>`).join('') : '<li class="task-empty">Belum ada aktivitas.</li>'}
      </ul>
    </section>
  </section>`;
}

function handleDailyAction(btn) {
  if (btn.matches('[data-daily-tab]')) { dailyTab = btn.dataset.dailyTab; renderShell(); return true; }
  if (btn.matches('[data-daily-add]')) {
    dailyAdding = true; dailyDraft = dailyDraft || dailyAddDraftDefaults();
    renderShell(); setTimeout(() => document.querySelector('#dailyAddForm [name=title]')?.focus(), 30);
    return true;
  }
  if (btn.matches('[data-daily-cancel]')) { dailyAdding = false; dailyDraft = null; renderShell(); return true; }
  if (btn.matches('[data-daily-rt]')) {
    // checkbox: toggle selesai-hari-ini rutinitas
    const r = DAILY_ROUTINES.find((x) => x.id === btn.dataset.dailyRt);
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
    renderShell();
    return true;
  }
  if (btn.matches('[data-daily-back]')) { dailyDetailId = null; renderShell(); return true; }
  return false;
}

// Tracker Daily — goals
// Dipisah dari public/app.js (refactor modular; tidak ada identifier yang di-rename).
// Classic script — urutan load: lihat <script> di public/index.html.
'use strict';


/* ============ MODUL GOALS (target & milestone) ============ */
const GOALS_STORE_KEY = 'miaw-tracker.goals.v1';
// Warna kategori memakai token tema (theme.css: --cat-*) agar ikut light/dark.
const GOAL_CATS = {
  Karier: 'var(--cat-karier)', Keuangan: 'var(--cat-keuangan)', Kesehatan: 'var(--cat-kesehatan)',
  Pendidikan: 'var(--cat-pendidikan)', Personal: 'var(--cat-personal)', Lainnya: 'var(--cat-lainnya)',
};
const GOAL_ICONS = { Karier: '💼', Keuangan: '💰', Kesehatan: '💚', Pendidikan: '🎓', Personal: '🌸', Lainnya: '📌' };
const GOAL_TERMS = {
  pendek: { label: 'Jangka Pendek', hint: '≤ 3 bulan', color: 'var(--cat-kesehatan)' },
  menengah: { label: 'Jangka Menengah', hint: '3–12 bulan', color: 'var(--cat-keuangan)' },
  panjang: { label: 'Jangka Panjang', hint: '> 12 bulan', color: 'var(--orange-strong)' },
};
function goalTermOf(g) {
  if (g.term && GOAL_TERMS[g.term]) return g.term;
  const dl = g.deadline || '';
  const days = dl ? Math.ceil((new Date(`${dl}T23:59:59`).getTime() - Date.now()) / 86400000) : 90;
  return days <= 90 ? 'pendek' : days <= 365 ? 'menengah' : 'panjang';
}
let goalsFilter = 'all';        // all | aktif | selesai
let goalsPage = 'list';         // list | detail | add | calendar
let goalsDetailId = null;
let goalsMonthOffset = 0;
let goalsAddCat = 'Karier';
let goalsAddTerm = 'pendek';
let goalsAddDraft = { title: '', description: '', deadline: '' };
function captureGoalAdd() {
  const f = document.querySelector('#goalAddForm');
  if (!f) return;
  goalsAddDraft = { title: f.querySelector('[name=title]').value, description: f.querySelector('[name=description]').value, deadline: f.querySelector('[name=deadline]').value };
}
let goalsCalSel = null;
let goalsEditId = null;      // id goal yang sedang diubah (null = tambah baru)
let goalsMsAdding = false;   // form sub goal inline
let goalsConfirmDel = false; // konfirmasi hapus goal 2 langkah (tanpa window.confirm)

function loadGoals() {
  try {
    const raw = JSON.parse(localStorage.getItem(scopedKey(GOALS_STORE_KEY)) || 'null');
    if (Array.isArray(raw) && raw.length) return raw;
  } catch { /* seed ulang */ }
  const today = taskTodayIso();
  const y = today.slice(0, 4);
  const m = today.slice(5, 7);
  const day = (n) => `${y}-${m}-${String(n).padStart(2, '0')}`;
  const seed = [
    {
      id: 'g1', title: 'Bangun bisnis online', category: 'Karier', project: 'Marketing Batu Bata', term: 'menengah',
      deadline: day(30), description: 'Luncurkan toko online dan raih 100 pelanggan pertama.',
      status: 'aktif', createdAt: today,
      milestones: [
        { id: 'm1', text: 'Riset pasar & kompetitor', target: day(12), done: true },
        { id: 'm2', text: 'Buat website toko', target: day(15), done: true },
        { id: 'm3', text: 'Siapkan katalog produk', target: day(18), done: true },
        { id: 'm4', text: 'Mulai iklan berbayar', target: day(24), done: false },
        { id: 'm5', text: 'Evaluasi & optimasi', target: day(28), done: false },
      ],
    },
    {
      id: 'g2', title: 'Meningkatkan skill digital', category: 'Pendidikan', project: 'Pengembangan Diri', term: 'pendek',
      deadline: day(27), description: 'Selesaikan kelas desain & analitik data bulan ini.',
      status: 'aktif', createdAt: today,
      milestones: [
        { id: 'm6', text: 'Pilih kursus online', target: day(8), done: true },
        { id: 'm7', text: 'Selesaikan modul 1-3', target: day(16), done: false },
        { id: 'm8', text: 'Buat portofolio kecil', target: day(22), done: false },
        { id: 'm9', text: 'Ikuti webinar industri', target: day(25), done: false },
      ],
    },
    {
      id: 'g3', title: 'Menjaga kesehatan', category: 'Kesehatan', project: 'Rutinitas Harian', term: 'pendek',
      deadline: day(28), description: 'Konsisten olahraga & pola makan sehat 4 minggu.',
      status: 'aktif', createdAt: today,
      milestones: [
        { id: 'm10', text: 'Jogging 3x seminggu', target: day(14), done: false },
        { id: 'm11', text: 'Cek kesehatan rutin', target: day(20), done: false },
        { id: 'm12', text: 'Kurangi gula & gorengan', target: day(24), done: false },
        { id: 'm13', text: 'Tidur sebelum jam 23:00', target: day(26), done: false },
      ],
    },
    {
      id: 'g4', title: 'Dana darurat 3 bulan', category: 'Keuangan', project: 'Keuangan Pribadi', term: 'panjang',
      deadline: `${y}-12-20`, description: 'Sisihkan 10% penghasilan tiap bulan sampai tercapai.',
      status: 'selesai', createdAt: today,
      milestones: [
        { id: 'm14', text: 'Buka rekening khusus', target: day(5), done: true },
        { id: 'm15', text: 'Autodebet bulanan', target: day(6), done: true },
        { id: 'm16', text: 'Capai target 3 bulan', target: day(10), done: true },
      ],
    },
  ];
  try { localStorage.setItem(scopedKey(GOALS_STORE_KEY), JSON.stringify(seed)); } catch { /* ignore */ }
  return seed;
}

function saveGoals(list) {
  try { localStorage.setItem(scopedKey(GOALS_STORE_KEY), JSON.stringify(list)); } catch { /* ignore */ }
  if (typeof queueRemoteSave === 'function') queueRemoteSave();
}

function goalProgress(g) {
  const ms = g.milestones || [];
  const done = ms.filter((x) => x.done).length;
  return { done, total: ms.length, pct: ms.length ? Math.round((done / ms.length) * 100) : 0 };
}

function goalCatColor(c) { return GOAL_CATS[c] || GOAL_CATS.Lainnya; }
function goalCatIcon(c) { return GOAL_ICONS[c] || GOAL_ICONS.Lainnya; }

function goalCardHtml(g) {
  const p = goalProgress(g);
  const term = goalTermOf(g);
  return `<button type="button" class="goal-card" data-goal-open="${g.id}">
      <span class="goal-ico" style="--gc:${goalCatColor(g.category)}">${goalCatIcon(g.category)}</span>
      <span class="goal-card-main">
        <span class="goal-card-title">${escapeHtml(g.title)}</span>
        <span class="goal-card-meta"><span class="goal-term-chip t-${term}" style="--tc:${GOAL_TERMS[term].color}">${GOAL_TERMS[term].label}</span> Deadline ${escapeHtml(taskDateRead(g.deadline || ''))} · ${escapeHtml(g.category)}</span>
        <span class="goal-bar"><span style="width:${p.pct}%"></span></span>
        <span class="goal-card-sub">${p.done}/${p.total} milestone${p.pct ? ` · ${p.pct}%` : ''}</span>
      </span>
      <span class="goal-chev">›</span>
    </button>`;
}

function renderGoalsView() {
  if (goalsPage === 'add') return renderGoalAddPage();
  if (goalsPage === 'detail' && goalsDetailId) return renderGoalDetailPage();
  if (goalsPage === 'calendar') return renderGoalCalendarPage();
  const all = loadGoals();
  const filtered = all.filter((g) => (goalsFilter === 'all' ? true : g.status === goalsFilter));
  const totalMs = all.reduce((s, g) => s + goalProgress(g).total, 0);
  const doneMs = all.reduce((s, g) => s + goalProgress(g).done, 0);
  const pctAll = totalMs ? Math.round((doneMs / totalMs) * 100) : 0;
  const summary = `<div class="goal-summary">
      <span class="goal-summary-label">${doneMs}/${totalMs} milestone selesai</span>
      <span class="goal-summary-pct">${pctAll}%</span>
    </div>
    <div class="goal-bar big"><span style="width:${pctAll}%"></span></div>`;
  const chips = ['all', 'aktif', 'selesai'].map((f) => `<button type="button" class="goal-chip${goalsFilter === f ? ' on' : ''}" data-goal-filter="${f}">${f === 'all' ? 'Semua' : f === 'aktif' ? 'Aktif' : 'Selesai'}</button>`).join('');
  const shown = filtered;
  const sec = (key) => {
    const items = shown.filter((g) => goalTermOf(g) === key);
    if (!items.length) return '';
    return `<div class="goal-term-sec"><h3 class="goal-term-head" style="--tc:${GOAL_TERMS[key].color}">${GOAL_TERMS[key].label}<span class="goal-term-hint">${GOAL_TERMS[key].hint} · ${items.length} goal</span></h3>${items.map(goalCardHtml).join('')}</div>`;
  };
  const grouped = ['pendek', 'menengah', 'panjang'].map(sec).join('') || '<p class="task-empty">Tidak ada goal pada filter ini.</p>';
  return `<div class="goals-page">
      <p class="goal-foundation-note">🎯 Goals adalah pondasi: hasil besar yang ingin diwujudkan. Project dan Task mengikuti goal di atasnya.</p>
      ${summary}
      <div class="goal-chips">${chips}</div>
      ${grouped}
      <button class="goal-add-btn" type="button" data-goal-add>+ Tambah Goal</button>
      <button class="goal-cal-link" type="button" data-goal-cal-page>📅 Kalender Goal</button>
    </div>`;
}

function renderGoalDetailPage() {
  const g = loadGoals().find((x) => x.id === goalsDetailId);
  if (!g) { goalsPage = 'list'; return renderGoalsView(); }
  const p = goalProgress(g);
  const rows = (g.milestones || []).map((mi) => `
      <div class="goal-ms-row">
        <label class="goal-ms${mi.done ? ' done' : ''}">
          <input type="checkbox" class="task-check" data-goal-ms="${g.id}:${mi.id}" ${mi.done ? 'checked' : ''} />
          <span class="goal-ms-text">${escapeHtml(mi.text)}</span>
          <span class="goal-ms-date">${escapeHtml(taskDateRead(mi.target || ''))}</span>
        </label>
        <button type="button" class="dt-tool" data-goal-ms-del="${g.id}:${mi.id}" aria-label="Hapus sub goal" title="Hapus sub goal">✕</button>
      </div>`).join('');
  const msForm = goalsMsAdding
    ? `<form class="goal-ms-form" id="goalMsForm">
        <input name="text" type="text" maxlength="90" placeholder="Nama sub goal / milestone…" required />
        <input name="target" type="date" value="${escapeHtml(g.deadline || taskTodayIso())}" />
        <div class="goal-ms-form-btns"><button type="submit" class="primary-button">Simpan</button><button type="button" class="secondary-button" data-goal-ms-cancel>Batal</button></div>
      </form>`
    : '<button class="goal-ms-add" type="button" data-goal-ms-add>+ Tambah Sub Goal</button>';
  return `<div class="goals-page">
      <button class="goal-back-btn" type="button" data-goal-back>← Kembali</button>
      <div class="goal-detail-card proj-blk">
        <div class="goal-detail-head">
          <span class="goal-ico big" style="--gc:${goalCatColor(g.category)}">${goalCatIcon(g.category)}</span>
          <span class="goal-detail-titlewrap">
            <span class="goal-detail-title">${escapeHtml(g.title)}</span>
            <span class="goal-chip-status ${g.status === 'selesai' ? 'fin' : 'act'}">${g.status === 'selesai' ? 'Selesai' : 'Aktif'}</span>
          </span>
        </div>
        <div class="goal-detail-meta"><span class="goal-term-chip t-${goalTermOf(g)}" style="--tc:${GOAL_TERMS[goalTermOf(g)].color}">${GOAL_TERMS[goalTermOf(g)].label}</span> Deadline <strong>${escapeHtml(taskDateRead(g.deadline || ''))}</strong> · ${escapeHtml(g.category)}</div>
        <div class="goal-bar big"><span style="width:${p.pct}%"></span></div>
        <div class="goal-detail-sub">${p.done}/${p.total} sub goal · ${p.pct}%</div>
        <div class="goal-detail-sec">Deskripsi</div>
        <p class="goal-detail-desc">${escapeHtml(g.description || '—')}</p>
        <div class="goal-detail-sec">Project di goal ini</div>
        ${(() => { const linked = loadProjects().filter((p) => p.goalId === g.id); return linked.length ? linked.map((p) => `<button type="button" class="goal-proj-chip link" data-proj-open="${p.id}">${p.icon || '🧩'} ${escapeHtml(p.name)} ${projStatusChip(p.status)}</button>`).join(' ') : '<span class="goal-proj-chip">Belum ada project — buat lewat menu Project</span>'; })()}
        <div class="goal-detail-sec">Sub Goal / Milestone</div>
        <div class="goal-ms-list">${rows || '<p class="task-empty">Belum ada sub goal.</p>'}</div>
        ${msForm}
        ${goalsConfirmDel ? `<div class="goal-del-confirm"><span>Hapus goal ini beserta ${(g.milestones || []).length} sub goal?</span><button type="button" class="danger-button" data-goal-del-confirm="${g.id}">Ya, hapus</button><button type="button" class="secondary-button" data-goal-del-cancel>Batal</button></div>` : ''}
        <div class="goal-detail-actions">
          <button class="secondary-button" type="button" data-goal-edit="${g.id}">✏️ Edit Goal</button>
          <button class="secondary-button danger" type="button" data-goal-del="${g.id}">🗑️ Hapus Goal</button>
        </div>
      </div>
    </div>`;
}

/* GOALS-PART2 */
function renderGoalAddPage() {
  const editing = goalsEditId ? loadGoals().find((x) => x.id === goalsEditId) : null;
  const cats = Object.keys(GOAL_CATS);
  const chips = cats.map((c) => `<button type="button" class="goal-cat-chip${goalsAddCat === c ? ' on' : ''}" data-goal-cat="${c}"><span class="goal-cat-dot" style="background:${GOAL_CATS[c]}"></span>${c}</button>`).join('');
  const terms = Object.entries(GOAL_TERMS).map(([k, t]) => `<button type="button" class="goal-cat-chip${goalsAddTerm === k ? ' on' : ''}" data-goal-term="${k}"><span class="goal-cat-dot" style="background:${t.color}"></span>${t.label}<em class="goal-term-mini">${t.hint}</em></button>`).join('');
  return `<div class="goals-page">
      <form class="goal-add-card" id="goalAddForm">
        <h3 class="goal-form-title">${editing ? 'Edit Goal' : 'Tambah Goal'}</h3>
        <label class="goal-field"><span>Judul</span><input name="title" type="text" maxlength="90" placeholder="Raih tujuan besar…" required value="${escapeHtml(goalsAddDraft.title)}" /></label>
        <label class="goal-field"><span>Deskripsi</span><textarea name="description" rows="3" maxlength="240" placeholder="Ceritakan goal ini…">${escapeHtml(goalsAddDraft.description)}</textarea></label>
        <div class="goal-field"><span>Jangka Waktu</span><div class="goal-cat-row">${terms}</div></div>
        <label class="goal-field"><span>Deadline</span><input name="deadline" type="date" value="${escapeHtml(goalsAddDraft.deadline || taskTodayIso())}" /></label>
        <div class="goal-field"><span>Kategori</span><div class="goal-cat-row">${chips}</div></div>
        <p class="goal-form-hint">💡 Project dibuat menyusul: di halaman Project, pilih goal ini sebagai induknya (Goals → Project → Task → Subtask).</p>
        <button class="primary-button goal-save" type="submit">${editing ? 'Simpan Perubahan' : 'Simpan'}</button>
        ${editing ? '' : '<button class="secondary-button goal-save2" type="button" data-goal-add-again>Simpan &amp; Tambah Lagi</button>'}
      </form>
    </div>`;
}

function renderGoalCalendarPage() {
  const now = new Date();
  const view = new Date(now.getFullYear(), now.getMonth() + goalsMonthOffset, 1);
  const y = view.getFullYear();
  const m = view.getMonth();
  const days = new Date(y, m + 1, 0).getDate();
  const firstDow = (new Date(y, m, 1).getDay() + 6) % 7;
  const cells = [];
  for (let i = 0; i < firstDow; i += 1) cells.push(null);
  for (let d = 1; d <= days; d += 1) cells.push(`${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  const all = loadGoals();
  const itemsOn = (iso) => {
    const out = [];
    all.forEach((g) => {
      if (g.deadline === iso) out.push({ color: goalCatColor(g.category), text: `Deadline: ${g.title}`, kind: '1deadline' });
      (g.milestones || []).forEach((mi) => { if (mi.target === iso) out.push({ color: goalCatColor(g.category), text: `${mi.done ? '✓' : '•'} ${mi.text} (${g.title})`, kind: '2ms' }); });
    });
    return out.sort((a, b) => a.kind.localeCompare(b.kind));
  };
  const selIso = goalsCalSel || taskTodayIso();
  const dayItems = itemsOn(selIso);
  const grid = cells.map((iso) => {
    if (!iso) return '<span class="jadwal-cell empty"></span>';
    const dots = itemsOn(iso).slice(0, 3).map((x) => `<span class="jadwal-mdot" style="background:${x.color}"></span>`).join('');
    return `<button type="button" class="jadwal-cell${iso === selIso ? ' sel' : iso === taskTodayIso() ? ' today' : ''}" data-goal-cal-day="${iso}"><span>${Number(iso.slice(8))}</span><span class="jadwal-mdots">${dots}</span></button>`;
  }).join('');
  return `<div class="goals-page">
      <div class="jadwal-card">
        <div class="jadwal-month-head">
          <span class="jadwal-month-label">${MONTHS[m]} ${y}</span>
          <span class="jadwal-month-nav">
            <button type="button" class="jadwal-navbtn" data-goal-cal-prev aria-label="Bulan sebelumnya">‹</button>
            <button type="button" class="jadwal-navbtn" data-goal-cal-next aria-label="Bulan berikutnya">›</button>
          </span>
        </div>
        <div class="jadwal-week">${['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((w) => `<span>${w}</span>`).join('')}</div>
        <div class="jadwal-grid">${grid}</div>
      </div>
      <h3 class="jadwal-day-title">${jadwalDayTitle(selIso)}</h3>
      <div class="jadwal-card jadwal-list">
        ${dayItems.length ? dayItems.map((x) => `<div class="jadwal-row"><span class="jadwal-dot" style="background:${x.color}"></span><span class="jadwal-info"><span class="jadwal-title">${escapeHtml(x.text)}</span><span class="jadwal-sub">${x.kind === '1deadline' ? 'Deadline goal' : 'Target milestone'}</span></span></div>`).join('') : '<p class="task-empty">Tidak ada deadline/milestone pada tanggal ini.</p>'}
      </div>
      <button class="goal-back-btn" type="button" data-goal-back>← Kembali ke daftar goal</button>
    </div>`;
}

function handleGoalAction(btn) {
  if (btn.matches('[data-goal-add]')) {
    goalsPage = 'add';
    goalsEditId = null;
    goalsMsAdding = false;
    goalsConfirmDel = false;
    goalsAddCat = 'Karier';
    goalsAddTerm = 'pendek';
    goalsAddDraft = { title: '', description: '', deadline: '' };
    renderShell();
    setTimeout(() => document.querySelector('#goalAddForm [name=title]')?.focus(), 30);
    return true;
  }
  if (btn.matches('[data-goal-back]')) { goalsPage = 'list'; renderShell(); return true; }
  if (btn.matches('[data-goal-cal-page]')) { goalsPage = 'calendar'; goalsCalSel = null; goalsMonthOffset = 0; renderShell(); return true; }
  if (btn.matches('[data-goal-filter]')) { goalsFilter = btn.dataset.goalFilter; renderShell(); return true; }
  if (btn.matches('[data-goal-open]')) { goalsDetailId = btn.dataset.goalOpen; goalsPage = 'detail'; renderShell(); return true; }
  if (btn.matches('[data-goal-cat]')) { captureGoalAdd(); goalsAddCat = btn.dataset.goalCat; renderShell(); return true; }
  if (btn.matches('[data-goal-term]')) { captureGoalAdd(); goalsAddTerm = btn.dataset.goalTerm; renderShell(); return true; }
  if (btn.matches('[data-goal-add-again]')) { submitGoalForm(document.querySelector('#goalAddForm'), true); return true; }
  if (btn.matches('[data-goal-ms-add]')) {
    goalsMsAdding = true;
    renderShell();
    setTimeout(() => document.querySelector('#goalMsForm [name=text]')?.focus(), 30);
    return true;
  }
  if (btn.matches('[data-goal-ms-cancel]')) { goalsMsAdding = false; renderShell(); return true; }
  if (btn.matches('[data-goal-ms-del]')) {
    const parts = String(btn.dataset.goalMsDel).split(':');
    const items = loadGoals();
    const g = items.find((x) => x.id === parts[0]);
    if (g) {
      g.milestones = (g.milestones || []).filter((m) => m.id !== parts.slice(1).join(':'));
      saveGoals(items);
      showToast('Sub goal dihapus.');
      renderShell();
    }
    return true;
  }
  if (btn.matches('[data-goal-edit]')) {
    const g = loadGoals().find((x) => x.id === btn.dataset.goalEdit);
    if (g) {
      goalsEditId = g.id;
      goalsPage = 'add';
      goalsMsAdding = false;
      goalsConfirmDel = false;
      goalsAddCat = g.category || 'Karier';
      goalsAddTerm = goalTermOf(g);
      goalsAddDraft = { title: g.title, description: g.description || '', deadline: g.deadline || '' };
      renderShell();
      setTimeout(() => document.querySelector('#goalAddForm [name=title]')?.focus(), 30);
    }
    return true;
  }
  if (btn.matches('[data-goal-del]')) { goalsConfirmDel = true; renderShell(); return true; }
  if (btn.matches('[data-goal-del-cancel]')) { goalsConfirmDel = false; renderShell(); return true; }
  if (btn.matches('[data-goal-del-confirm]')) {
    const id = btn.dataset.goalDelConfirm;
    saveGoals(loadGoals().filter((g) => g.id !== id));
    const projs = loadProjects();
    let changed = false;
    projs.forEach((p) => { if (p.goalId === id) { p.goalId = ''; changed = true; } });
    if (changed) saveProjects(projs);
    goalsConfirmDel = false;
    goalsDetailId = null;
    goalsPage = 'list';
    showToast('Goal dihapus.');
    renderShell();
    return true;
  }
  if (btn.matches('[data-goal-cal-prev]')) { goalsMonthOffset -= 1; renderShell(); return true; }
  if (btn.matches('[data-goal-cal-next]')) { goalsMonthOffset += 1; renderShell(); return true; }
  if (btn.matches('[data-goal-cal-day]')) { goalsCalSel = btn.dataset.goalCalDay; renderShell(); return true; }
  if (btn.matches('[data-goal-proj]')) { projDetailId = btn.dataset.goalProj; projPage = 'detail'; projTab = 'overview'; projMenuOpen = false; activeView = 'project'; state.selectedView = 'project'; saveState(); renderShell(); return true; }
  return false;
}

function submitGoalForm(form, again) {
  if (!form) return;
  const val = (n) => form.querySelector(`[name=${n}]`)?.value.trim() || '';
  const title = val('title');
  if (!title) return;
  const items = loadGoals();                       // satu kali baca → objek yang sama disimpan

  if (goalsEditId) {
    // mode edit: perbarui goal yang ada (sub goal & status tidak diubah)
    const g = items.find((x) => x.id === goalsEditId);
    if (g) {
      g.title = title;
      g.description = val('description');
      g.deadline = val('deadline') || g.deadline;
      g.category = goalsAddCat;
      g.term = goalsAddTerm;
      saveGoals(items);
      showToast('Goal diperbarui.');
    }
    goalsEditId = null;
    goalsDetailId = g ? g.id : null;
    goalsPage = goalsDetailId ? 'detail' : 'list';
    renderShell();
    return;
  }

  const item = {
    id: `g${Date.now()}`, title, description: val('description'), deadline: val('deadline') || taskTodayIso(),
    term: goalsAddTerm, project: '', category: goalsAddCat, status: 'aktif', createdAt: taskTodayIso(), milestones: [],
  };
  items.push(item);
  saveGoals(items);
  if (again) {
    renderShell();
    setTimeout(() => document.querySelector('#goalAddForm [name=title]')?.focus(), 30);
  } else {
    goalsPage = 'list';
    renderShell();
  }
}

/* Simpan sub goal inline (pengganti prompt lama yang kehilangan data karena
   saveGoals(loadGoals()) memuat ulang store sebelum mutasi disimpan). */
function submitGoalMsForm(form) {
  if (!form) return;
  const text = form.querySelector('[name=text]')?.value.trim() || '';
  if (!text) return;
  const target = form.querySelector('[name=target]')?.value || '';
  const items = loadGoals();
  const g = items.find((x) => x.id === goalsDetailId);
  if (!g) return;
  g.milestones = g.milestones || [];
  g.milestones.push({ id: `m${Date.now()}`, text, target: target || g.deadline || taskTodayIso(), done: false });
  saveGoals(items);
  goalsMsAdding = false;
  showToast('Sub goal ditambahkan.');
  renderShell();
}

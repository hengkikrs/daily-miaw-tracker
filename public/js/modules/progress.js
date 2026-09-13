// Tracker Daily — progress
// Dipisah dari public/app.js (refactor modular; tidak ada identifier yang di-rename).
// Classic script — urutan load: lihat <script> di public/index.html.
'use strict';


function progTaskDone(t) { return t.done === true || t.status === 'done' || t.status === 'selesai'; }

function progHabitStats() {
  const month = ensureMonth(activeYear, activeMonth);
  const habits = getAllHabits(month, true);
  let done = 0;
  let total = 0;
  let earned = 0;
  let possible = 0;
  const byCat = { daily: { e: 0, p: 0, label: 'Harian' }, weekly: { e: 0, p: 0, label: 'Mingguan' }, specificWeekly: { e: 0, p: 0, label: 'Mingguan khusus' }, monthly: { e: 0, p: 0, label: 'Bulanan' } };
  habits.forEach((h) => {
    const st = calculateHabitProgress(h, h.categoryKey, activeYear, activeMonth);
    done += st.checkedSlots;
    total += st.totalSlots;
    earned += st.earnedPoints;
    possible += st.possiblePoints;
    if (byCat[h.categoryKey]) {
      byCat[h.categoryKey].e += st.earnedPoints;
      byCat[h.categoryKey].p += st.possiblePoints;
    }
  });
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  // streak harian: hitung berturut-turut dari hari terakhir yang ada datanya
  const daily = habits.filter((h) => h.categoryKey === 'daily');
  const dim = daysInMonth(activeYear, activeMonth);
  let streak = 0;
  for (let day = Math.min(dim, new Date().getDate()); day >= 1; day -= 1) {
    if (daily.length && daily.every((h) => h.slots[day - 1])) streak += 1;
    else break;
  }
  return { pct, done, total, earned, possible, byCat, streak, count: habits.length };
}

function progGoalStats() {
  const goals = loadGoals();
  let msTotal = 0;
  let msDone = 0;
  const byCat = {};
  goals.forEach((g) => {
    (g.milestones || []).forEach((m) => {
      msTotal += 1;
      if (m.done) msDone += 1;
    });
    byCat[g.category] = (byCat[g.category] || 0) + 1;
  });
  return {
    count: goals.length,
    active: goals.filter((g) => g.status === 'aktif').length,
    done: goals.filter((g) => g.status === 'selesai').length,
    pct: msTotal === 0 ? 0 : Math.round((msDone / msTotal) * 100),
    msTotal,
    msDone,
    byCat,
  };
}

function progTaskStats() {
  const tasks = loadTasks();
  const done = tasks.filter(progTaskDone);
  let estMin = 0;
  let actMin = 0;
  done.forEach((t) => {
    const m = String(t.actual || '').match(/(\d+)\s*menit/);
    if (m) actMin += Number(m[1]);
    const e = String(t.estimate || '').match(/(\d+)\s*menit|(\d+)\s*jam/);
    if (e) estMin += e[1] ? Number(e[1]) : Number(e[2]) * 60;
  });
  const prio = { high: 0, medium: 0, low: 0 };
  done.forEach((t) => { const k = String(t.priority || 'medium').toLowerCase().slice(0, 6); prio[k in prio ? k : 'medium'] += 1; });
  return {
    total: tasks.length,
    done: done.length,
    pct: tasks.length === 0 ? 0 : Math.round((done.length / tasks.length) * 100),
    estMin,
    actMin,
    prio,
  };
}

function progDonut(segments, size) {
  const r = size / 2 - 9;
  const c = 2 * Math.PI * r;
  const sum = segments.reduce((a, s) => a + s.value, 0) || 1;
  let off = 0;
  const arcs = segments.filter((s) => s.value > 0).map((s) => {
    const frac = s.value / sum;
    const el = `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${s.color}" stroke-width="14" stroke-linecap="round" stroke-dasharray="${Math.max(frac * c - 3, 0.1)} ${c}" stroke-dashoffset="${-off * c}" transform="rotate(-90 ${size / 2} ${size / 2})"></circle>`;
    off += frac;
    return el;
  }).join('');
  return `<svg viewBox="0 0 ${size} ${size}" class="prog-donut" width="${size}" height="${size}">${el0(c, r)}${arcs}</svg>`;
  function el0(cc, rr) { return `<circle cx="${size / 2}" cy="${size / 2}" r="${rr}" fill="none" stroke="color-mix(in srgb, var(--muted) 14%, transparent)" stroke-width="14"></circle>`; }
}

function progRing(pct, size, color, centerLabel) {
  const r = size / 2 - 9;
  const c = 2 * Math.PI * r;
  const dash = Math.max((clamp(pct, 0, 100) / 100) * c - 2, 0.1);
  return `<div class="prog-ring-wrap"><svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="color-mix(in srgb, var(--muted) 14%, transparent)" stroke-width="14"></circle><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="14" stroke-linecap="round" stroke-dasharray="${dash} ${c}" transform="rotate(-90 ${size / 2} ${size / 2})"></circle></svg><div class="prog-ring-center"><b>${pct}%</b><span>${escapeHtml(centerLabel)}</span></div></div>`;
}

function progBars(data, color) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return `<div class="prog-bars">${data.map((d) => `<div class="prog-bar-col"><span class="prog-bar-num">${d.value > 0 ? d.value : ''}</span><span class="prog-bar-stick"><i style="height:${Math.round((d.value / max) * 100)}%;background:${color}"></i></span><span class="prog-bar-lbl">${escapeHtml(d.label)}</span></div>`).join('')}</div>`;
}

function renderProgressView() {
  const H = progHabitStats();
  const T = progTaskStats();
  const G = progGoalStats();
  const overall = Math.round((H.pct + T.pct + G.pct) / 3);

  // grafik 7 hari: kebiasaan tercentang + task selesai per hari
  const days = [];
  const month = ensureMonth(activeYear, activeMonth);
  const dailyHabits = getAllHabits(month).filter((h) => h.categoryKey === 'daily');
  const tasksAll = loadTasks();
  const DAYNAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const dim = daysInMonth(activeYear, activeMonth);
  const todayD = activeYear === new Date().getFullYear() && activeMonth === new Date().getMonth() ? new Date().getDate() : dim;
  for (let i = 6; i >= 0; i -= 1) {
    const dt = new Date(activeYear, activeMonth, todayD - i);
    const valid = dt.getMonth() === activeMonth && dt.getDate() >= 1;
    const dayIdx = dt.getDate() - 1;
    const hCount = valid ? dailyHabits.reduce((a, h) => a + (h.slots[dayIdx] ? 1 : 0), 0) : 0;
    const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    const tCount = tasksAll.filter((t) => progTaskDone(t) && (t.completedAt ? String(t.completedAt).slice(0, 10) === iso : (t.date || '') === iso)).length;
    days.push({ label: DAYNAMES[dt.getDay()], value: hCount + tCount });
  }

  // tren bulanan goal+task selesai (6 bulan terakhir)
  const MONTHS_S = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const months = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(activeYear, activeMonth - i, 1);
    const m = ensureMonth(d.getFullYear(), d.getMonth());
    const hs = getAllHabits(m, true).reduce((a, h) => { const st = calculateHabitProgress(h, h.categoryKey, d.getFullYear(), d.getMonth()); return a + st.checkedSlots; }, 0);
    const mIso = String(d.getMonth() + 1).padStart(2, '0');
    const ts = tasksAll.filter((t) => progTaskDone(t) && String(t.completedAt || t.date || '').startsWith(`${d.getFullYear()}-${mIso}`)).length;
    months.push({ label: MONTHS_S[d.getMonth()], value: hs + ts });
  }

  const catSegs = Object.keys(GOAL_CATS).filter((c) => G.byCat[c]).map((c) => ({ color: GOAL_CATS[c], value: G.byCat[c], label: c }));
  const legend = catSegs.map((s) => `<div class="prog-legend-row"><span class="task-dot" style="background:${s.color}"></span><b style="flex:1">${escapeHtml(s.label)}</b><span style="color:var(--muted);font-weight:700">${Math.round((s.value / (catSegs.reduce((a, x) => a + x.value, 0) || 1)) * 100)}%</span><span style="width:26px;text-align:right;font-weight:800">${s.value}</span></div>`).join('');

  const habitCatRows = ['daily', 'weekly', 'monthly'].map((k) => {
    const c = H.byCat[k];
    const pct = c.p === 0 ? 0 : Math.round((c.e / c.p) * 100);
    const lbl = k === 'daily' ? 'Harian' : k === 'weekly' ? 'Mingguan' : 'Bulanan';
    return `<div class="prog-habit-row"><b>${lbl}</b><span class="goal-bar"><i style="width:${pct}%;display:block;height:100%;border-radius:999px;background:${['#3b82f6', '#ea8a2f', '#8b5cf6'][k === 'daily' ? 0 : k === 'weekly' ? 1 : 2]}"></i></span><em>${c.e}/${c.p} pts</em></div>`;
  }).join('');

  const prioTotal = (T.prio.high + T.prio.medium + T.prio.low) || 1;
  const prioRows = [['Tinggi', T.prio.high, '#ef4444'], ['Sedang', T.prio.medium, '#f59e0b'], ['Rendah', T.prio.low, '#3b82f6']].map(([lbl, v, col]) => `<div class="prog-legend-row"><span class="task-dot" style="background:${col}"></span><b style="flex:1">${lbl}</b><span style="width:26px;text-align:right;font-weight:800">${v}</span></div>`).join('');

  return `<div class="goals-page">
      <div class="prog-hero">
        ${progRing(overall, 130, '#3f9d63', 'Skor')}
        <div class="prog-hero-stats">
          <div class="prog-stat"><span class="prog-stat-num">${H.pct}%</span><span class="prog-stat-lbl">Kebiasaan</span></div>
          <div class="prog-stat"><span class="prog-stat-num">${T.pct}%</span><span class="prog-stat-lbl">Task selesai</span></div>
          <div class="prog-stat"><span class="prog-stat-num">${G.pct}%</span><span class="prog-stat-lbl">Goals</span></div>
        </div>
      </div>

      <div class="prog-kpis">
        <div class="prog-kpi"><span>🔥</span><b>${H.streak > 0 ? H.streak + ' hari' : '—'}</b><em>Streak harian</em></div>
        <div class="prog-kpi"><span>✅</span><b>${T.done}</b><em>Task done</em></div>
        <div class="prog-kpi"><span>🎯</span><b>${G.msDone}/${G.msTotal}</b><em>Milestone</em></div>
        <div class="prog-kpi"><span>⭐</span><b>${H.earned}</b><em>Poin kebiasaan</em></div>
      </div>

      <section class="panel" style="padding:14px 16px">
        <div class="prog-card-head"><h3>Aktivitas 7 Hari</h3><span class="prog-card-sub">kebiasaan ✓ + task selesai</span></div>
        ${progBars(days, '#3f9d63')}
      </section>

      <section class="panel" style="padding:14px 16px">
        <div class="prog-card-head"><h3>Tren 6 Bulan</h3><span class="prog-card-sub">total penyelesaian</span></div>
        ${progBars(months, '#7d685c')}
      </section>

      <section class="panel" style="padding:14px 16px">
        <div class="prog-card-head"><h3>Goal per Kategori</h3><span class="prog-card-sub">${G.count} goal</span></div>
        <div class="prog-donut-row">
          ${progDonut(catSegs.length ? catSegs : [{ color: '#d9d3c7', value: 1 }], 120)}
          <div class="prog-legend">${legend || '<div class="prog-legend-row">Belum ada goal</div>'}</div>
        </div>
        <div class="prog-two">
          <div class="prog-mini"><b>${G.active}</b><span>Aktif</span></div>
          <div class="prog-mini"><b>${G.done}</b><span>Selesai</span></div>
          <div class="prog-mini"><b>${Math.max(G.count - G.active - G.done, 0)}</b><span>Tertunda</span></div>
        </div>
      </section>

      <section class="panel" style="padding:14px 16px">
        <div class="prog-card-head"><h3>Kebiasaan ${MONTHS_S[activeMonth]}</h3><span class="prog-card-sub">${H.done}/${H.total} slot · ${H.count} habit</span></div>
        ${habitCatRows}
      </section>

      <section class="panel" style="padding:14px 16px">
        <div class="prog-card-head"><h3>Waktu & Prioritas Task</h3><span class="prog-card-sub">${T.done} task selesai</span></div>
        <div class="prog-two">
          <div class="prog-mini"><b>${T.estMin >= 60 ? (T.estMin / 60).toFixed(1) + ' jam' : T.estMin + ' mnt'}</b><span>Estimasi</span></div>
          <div class="prog-mini"><b>${T.actMin >= 60 ? (T.actMin / 60).toFixed(1) + ' jam' : T.actMin + ' mnt'}</b><span>Aktual</span></div>
        </div>
        <div class="prog-legend" style="margin-top:8px">${prioTotal ? prioRows : ''}</div>
      </section>
    </div>`;
}

function handleProgressAction(btn) {
  if (btn.matches('[data-progress-tab]')) { progressTab = btn.dataset.progressTab; renderShell(); return true; }
  return false;
}

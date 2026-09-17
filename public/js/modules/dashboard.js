// Tracker Daily — dashboard
// Dipisah dari public/app.js (refactor modular; tidak ada identifier yang di-rename).
// Classic script — urutan load: lihat <script> di public/index.html.
'use strict';


/* ============ DASHBOARD BARU (statistik lintas modul: Activity, Goals & Habit, Organization, Finance) ============ */
function dashRp(n) { return `Rp ${Math.abs(Math.round(Number(n) || 0)).toLocaleString('id-ID')}`; }
// Progres per-goal: delegasi ke sumber kebenaran tunggal di goals.js (goalProgress).
function goalPctOf(g) { return goalProgress(g).pct; }
function dashCompact(n) {
  n = Math.round(Math.abs(Number(n) || 0));
  if (n >= 1e9) return `${(n / 1e9).toFixed(1).replace('.', ',')} M`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace('.', ',')} jt`;
  if (n >= 1e3) return `${Math.round(n / 1e3)} rb`;
  return String(n);
}
function dashSparkline(values, W, H, color) {
  if (!values.length) return '';
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => [values.length === 1 ? W / 2 : (i / (values.length - 1)) * (W - 8) + 4, H - 4 - (v / max) * (H - 10)]);
  const path = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${pts[0][0].toFixed(1)},${H - 2} ${path} ${pts[pts.length - 1][0].toFixed(1)},${H - 2}`;
  return `<svg viewBox="0 0 ${W} ${H}" class="dash-spark" aria-hidden="true"><polygon points="${area}" fill="${color}" opacity="0.12"/><path d="${path}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"/></svg>`;
}

function dashCompute() {
  const todayIso = taskTodayIso();
  const monthKey = txMonthNow();
  const y = activeYear;
  // ACTIVITY — sumber "hari ini" disamakan dgn halaman Daily Task (kegiatan + rutinitas).
  ensureYear(y);
  const tasks = loadTasks(); // project task (untuk daftar "akan datang")
  const dailyItems = loadDailyTasks().filter((t) => t && t.id);
  const tasksToday = dailyItems.filter((t) => t.date === todayIso);
  const doneToday = tasksToday.filter((t) => t.done).length;
  const monthTasks = dailyItems.filter((t) => (t.date || '').slice(0, 7) === monthKey);
  const doneMonth = monthTasks.filter((t) => t.done).length;
  const schedToday = loadJadwalEvents().filter((e) => e.date === todayIso);
  // Rutinitas aktif dari store (bukan konstanta seed) agar rutinitas kustom ikut terhitung.
  const rt = loadDailyRoutines().filter((r) => dailyRoutineApplies(r, todayIso));
  const rtDone = rt.filter((r) => dailyIsRoutineDone(r, todayIso)).length;
  const activityPct = tasksToday.length + rt.length ? Math.round(((doneToday + rtDone) / (tasksToday.length + rt.length)) * 100) : 0;
  // GOALS & HABIT
  const goals = loadGoals();
  // Agregat milestone — sama persis dengan angka di halaman Goals & Progress.
  const avgGoal = goalProgressAll(goals).pct;
  const projects = loadProjects();
  const projActive = projects.filter((p) => p.status === 'active').length;
  const monthStats = calculateMonthStats(y, activeMonth);
  const habitAvg = Math.round(monthStats.average);
  const habitMonths = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(y, activeMonth - (5 - i), 1);
    return calculateMonthStats(d.getFullYear(), d.getMonth()).average;
  });
  // ORGANIZATION
  ensureDocStore();
  const notes = loadNotes().filter((n) => !n.archived);
  const docs = docList();
  const notesThis = notes.filter((n) => txIso(new Date(Number(n.updated) || 0)).slice(0, 7) === monthKey).length;
  const docsThis = docs.filter((d) => txIso(new Date(Number(d.createdAt) || 0)).slice(0, 7) === monthKey).length;
  // FINANCE
  ensureTxStore();
  ensureSaveStore();
  const flows = repFlow(repMonths(6));
  const fCur = flows[flows.length - 1];
  const balance = repSum(txList().filter((t) => t.type === 'in')) - repSum(txList().filter((t) => t.type === 'out'));
  const savedTotal = saveList().reduce((a, s) => a + (Number(s.balance) || 0), 0);
  const svTargets = saveList().filter((s) => !s.archived);
  const savingsPct = svTargets.length ? Math.round(svTargets.reduce((a, s) => a + Math.min(100, saveCalc(s).pctReal), 0) / svTargets.length) : 0;
  const buds = budList().filter((b) => b.period === monthKey);
  const budSum = buds.reduce((a, b) => a + (Number(b.amount) || 0), 0);
  const budSpent = buds.reduce((a, b) => a + budCalc(b).spent, 0);
  return { todayIso, monthKey, tasks, tasksToday, doneToday, monthTasks, doneMonth, schedToday, rt, rtDone, activityPct, goals, avgGoal, projects, projActive, monthStats, habitAvg, habitMonths, notes, docs, notesThis, docsThis, flows, fCur, balance, savedTotal, savingsPct, buds, budSum, budSpent };
}

function dashGoTo(view) {
  activeView = view; state.selectedView = view; saveState(); renderShell(); closeSidebar();
}

function dashCard({ icon, title, pct, tone, stats, cta, view }) {
  return `
    <article class="dash-mod tone-${tone}">
      <header class="dash-mod-head">
        <span class="dash-mod-ico">${icon}</span>
        <h2>${title}</h2>
        <span class="dash-mod-pct">${pct}<small>%</small></span>
      </header>
      <div class="dash-mod-bar"><span style="width:${clamp(pct, 0, 100)}%"></span></div>
      <div class="dash-mod-stats">${stats}</div>
      <button type="button" class="dash-mod-cta" data-dash-go="${view}">${cta} →</button>
    </article>`;
}

function renderDashboard(year) {
  const d = dashCompute();
  const focusMonthData = ensureMonth(year, activeMonth);
  const focusDailyRates = calculateDailyRates(focusMonthData, year, activeMonth);
  const yearStats = calculateYearStats(year);
  const bestMonth = yearStats.bestMonth;
  const todayPoints = dailyPointSummary(focusDailyRates, year, activeMonth);

  // ===== kartu modul (ringkas) =====
  const activityCard = dashCard({
    icon: '⚡', title: 'Activity', pct: d.activityPct, tone: 'activity', view: 'task', cta: 'Buka Daily Task',
    stats: `
      <div class="dash-stat"><span>Kegiatan hari ini</span><b>${d.doneToday}/${d.tasksToday.length}</b></div>
      <div class="dash-stat"><span>Rutinitas</span><b>${d.rtDone}/${d.rt.length}</b></div>
      <div class="dash-stat"><span>Selesai bulan ini</span><b>${d.doneMonth}/${d.monthTasks.length}</b></div>
      <div class="dash-stat"><span>Agenda hari ini</span><b>${d.schedToday.length}</b></div>`,
  });
  const goalsCard = dashCard({
    icon: '🎯', title: 'Goals & Habit', pct: Math.round((d.avgGoal + d.habitAvg) / 2), tone: 'goals', view: 'goals', cta: 'Buka Goals',
    stats: `
      <div class="dash-stat"><span>Progress goals</span><b>${d.avgGoal}%</b></div>
      <div class="dash-stat"><span>Habit ${MONTHS[activeMonth]}</span><b>${d.habitAvg}%</b></div>
      <div class="dash-stat"><span>Goals aktif</span><b>${d.goals.filter((g) => g.status !== 'selesai').length}</b></div>
      <div class="dash-stat"><span>Project aktif</span><b>${d.projActive}</b></div>`,
  });
  const orgCard = dashCard({
    icon: '🗂️', title: 'Organization', pct: clamp(Math.round(((d.notes.length + d.docs.length) / 30) * 100), 0, 100), tone: 'org', view: 'catatan', cta: 'Buka Catatan',
    stats: `
      <div class="dash-stat"><span>Catatan aktif</span><b>${d.notes.length}</b></div>
      <div class="dash-stat"><span>Dokumen</span><b>${d.docs.length}</b></div>
      <div class="dash-stat"><span>Catatan bulan ini</span><b>${d.notesThis}</b></div>
      <div class="dash-stat"><span>Dokumen baru</span><b>${d.docsThis}</b></div>`,
  });
  const financePct = d.fCur.inc > 0 ? clamp(Math.round((d.fCur.net / d.fCur.inc) * 100), 0, 100) : 0;
  // skor gabungan: rata-rata activity, habit, dan separuh (goals + kas)
  const score = clamp(Math.round((d.activityPct + d.habitAvg + Math.round((d.avgGoal + financePct) / 2)) / 3), 0, 100);
  const financeCard = dashCard({
    icon: '💰', title: 'Finance', pct: financePct, tone: 'finance', view: 'laporan-keuangan', cta: 'Buka Laporan Keuangan',
    stats: `
      <div class="dash-stat"><span>Arus kas bersih</span><b class="${d.fCur.net >= 0 ? 'green' : 'coral'}">${dashCompact(d.fCur.net)}</b></div>
      <div class="dash-stat"><span>Saldo kas</span><b>${dashCompact(d.balance)}</b></div>
      <div class="dash-stat"><span>Tabungan</span><b>${d.savingsPct}%</b></div>
      <div class="dash-stat"><span>Budget terpakai</span><b>${d.budSum ? Math.round((d.budSpent / d.budSum) * 100) : 0}%</b></div>`,
  });

  // ===== grafik =====
  const trend = renderTrendChart(yearStats.months);
  const financeChart = repBarChartSvg(d.flows, 640, 190);
  const cats = repSpendByCat(d.monthKey);
  const catTotal = repSum(cats.map((c) => ({ amount: c.amt })));
  const catLegend = cats.slice(0, 5).map((it, i) => {
    const COL = chartPalette();
    return `<div class="rep-lg"><i style="background:${COL[i % COL.length]}"></i><b>${escapeHtml(it.cat)}</b><small>${catTotal ? Math.round((it.amt / catTotal) * 100) : 0}%</small><span>${txRp(it.amt)}</span></div>`;
  }).join('');

  // habit per kategori bulan fokus
  const catRows = calculateCategoryBreakdown(focusMonthData, year, activeMonth)
    .filter((c) => c.totalHabits > 0)
    .map((c) => `
      <div class="dash-cat">
        <span>${CATEGORY_CONFIG[c.categoryKey].shortLabel}</span>
        <div class="dash-cat-bar"><span style="width:${clamp(c.average, 0, 100)}%"></span></div>
        <b>${roundPercent(c.average)}%</b>
      </div>`).join('');

  // goals teratas
  const topGoals = [...d.goals]
    .sort((a, b) => (a.status === 'selesai' ? 1 : 0) - (b.status === 'selesai' ? 1 : 0))
    .slice(0, 4)
    .map((g) => {
      const p = goalPctOf(g);
      return `<div class="dash-goal" data-dash-go="goals" role="button" tabindex="0">
          <span class="dash-goal-name">${escapeHtml(g.title)}</span>
          <div class="dash-cat-bar"><span style="width:${p}%"></span></div>
          <b>${p}%</b>
        </div>`;
    }).join('');

  const agenda = dailyDayList(taskTodayIso()).slice(0, 5);
  const agendaRows = agenda.map((it) => `
    <div class="dash-agenda-row" data-dash-go="jadwal" role="button" tabindex="0">
      <span class="jadwal-dot ${it.kind === 'task' ? 'ring' : ''}" style="--jc:${it.color}${it.kind === 'task' ? '' : ';background:' + it.color}"></span>
      <b>${it.time || '—'}</b>
      <span class="dash-agenda-title">${escapeHtml(it.title)}</span>
      <small>${escapeHtml(it.sub)}</small>
    </div>`).join('');

  const upcoming = d.tasks.filter((t) => !t.done && t.date > d.todayIso).sort((a, b) => String(a.date).localeCompare(String(b.date))).slice(0, 5);



  // Ranking habit bulan berjalan: 5 paling sering & 5 paling jarang dikerjakan.
  const rankRows = (d.monthStats.rows || [])
    .slice()
    .sort((a, b) => b.checkedSlots - a.checkedSlots || b.progress - a.progress);
  const pctOf = (r) => (r.totalSlots ? Math.round((r.checkedSlots / r.totalSlots) * 100) : 0);
  const barOf = (r) => `<i class="dhb-bar"><b style="width:${pctOf(r)}%"></b></i>`;
  const rowHtml = (r) => `<div class="dh-row"><span class="dh-name">${escapeHtml(r.name)}</span><span class="dh-val"><b class="dh-n">${r.checkedSlots}<small>/${r.totalSlots}</small></b>${barOf(r)}</span></div>`;
  let habitRankRows;
  if (!rankRows.length) {
    habitRankRows = '<p class="task-empty">Belum ada habit. Centang mulai dari halaman Habit.</p>';
  } else if (rankRows.length <= 5) {
    habitRankRows = `<div class="dh-list">${rankRows.map((r) => rowHtml(r)).join('')}</div>`;
  } else {
    const top5 = rankRows.slice(0, 5);
    const topIds = new Set(top5.map((r) => r.id));
    const rare5 = rankRows.filter((r) => !topIds.has(r.id)).slice(-5).reverse();
    habitRankRows = `<div class="dh-cols">
      <div><h2 class="dh-h good">Paling sering</h2>${top5.map((r) => rowHtml(r)).join('')}</div>
      <div><h2 class="dh-h faint">Paling jarang</h2>${rare5.map((r) => rowHtml(r)).join('')}</div>
    </div>`;
  }

  return `
    <div class="dash-page">
      <section class="dash-hero">
        <div class="dash-hero-main">
          <span class="kicker">Ringkasan ${MONTHS[activeMonth]} ${year}</span>
          <h2>Pantau semuanya dari satu tempat</h2>
          <div class="dash-hero-chips">
            <span class="dash-chip" data-sec="activity">✅ ${d.doneToday}/${d.tasksToday.length} kegiatan hari ini</span>
            <span class="dash-chip" data-sec="activity">🔥 ${d.rtDone}/${d.rt.length} rutinitas</span>
            <span class="dash-chip" data-sec="goals">🎯 ${d.avgGoal}% goals</span>
            <span class="dash-chip" data-sec="goals">💚 ${d.habitAvg}% habit</span>
            <span class="dash-chip ${d.fCur.net >= 0 ? '' : 'bad'}" data-sec="finance">💰 ${d.fCur.net >= 0 ? '+' : '−'}${dashCompact(Math.abs(d.fCur.net))} kas</span>
          </div>
        </div>
        <aside class="dash-hero-ring ${scoreClass(score)}" role="img" aria-label="Skor gabungan ${score} persen">
          <div class="dash-ring-wrap">
            <svg viewBox="0 0 120 120" class="dash-ring" aria-hidden="true">
              <defs>
                <linearGradient id="dashRingGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stop-color="currentColor" stop-opacity="0.72"/>
                  <stop offset="100%" stop-color="currentColor" stop-opacity="1"/>
                </linearGradient>
              </defs>
              <circle cx="60" cy="60" r="50" fill="none" stroke="var(--line)" stroke-width="13"/>
              <circle class="dash-ring-arc" cx="60" cy="60" r="50" fill="none" stroke="url(#dashRingGrad)" stroke-width="13" stroke-linecap="round"
                stroke-dasharray="${(score / 100 * 314).toFixed(1)} 314"
                transform="rotate(-90 60 60)"/>
            </svg>
            <div class="dash-ring-copy">
              <b class="dash-ring-num">${score}<small>%</small></b>
              <span class="dash-ring-sub">skor gabungan</span>
            </div>
          </div>
          <p class="dash-ring-note">Activity ${d.activityPct}% · Goals ${d.avgGoal}% · Habit ${d.habitAvg}% · Kas ${financePct}%</p>
        </aside>
      </section>

      <section class="panel dash-hab-rank">
        <div class="rep-card-head"><h2>Habit ${MONTHS[activeMonth]}</h2><small>ranking centang bulan ini</small></div>
        ${habitRankRows}
      </section>

      <div class="dash-grid-4">
        ${activityCard}
        ${goalsCard}
        ${orgCard}
        ${financeCard}
      </div>

      <div class="dash-two">
        <section class="panel dash-chart-card">
          <div class="rep-card-head"><h2>Tren Habit ${year}</h2><small>rata-rata poin per bulan</small></div>
          ${trend}
        </section>
        <section class="panel dash-chart-card">
          <div class="rep-card-head"><h2>Cashflow 6 Bulan</h2><span class="rep-legend"><i class="lg-in"></i>Masuk <i class="lg-out"></i>Keluar</span></div>
          ${financeChart}
          <div class="rep-flow-nums">${d.flows.map((f) => `<div><span>${repMonthLabel(f.m)}</span><b class="${f.net >= 0 ? 'green' : 'coral'}">${f.net >= 0 ? '+' : '−'}${dashCompact(Math.abs(f.net))}</b></div>`).join('')}</div>
        </section>
      </div>

      <div class="dash-two">
        <section class="panel dash-chart-card">
          <div class="rep-card-head"><h2>Habit per Kategori</h2><small>${MONTHS[activeMonth]} ${year}</small></div>
          <div class="dash-cats">${catRows || '<p class="task-empty">Belum ada habit aktif.</p>'}</div>
          <div class="dash-strip-wrap">${renderDailyPercentStrip(focusDailyRates, year, activeMonth)}</div>
        </section>
        <section class="panel dash-chart-card">
          <div class="rep-card-head"><h2>Pengeluaran per Kategori</h2><small>${repMonthLabel(d.monthKey)}</small></div>
          ${cats.length ? `<div class="rep-donut-wrap">${repDonutSvg(cats, catTotal)}<div class="rep-legend-list">${catLegend}</div></div>` : '<p class="task-empty">Belum ada pengeluaran bulan ini.</p>'}
        </section>
      </div>

      <div class="dash-two">
        <section class="panel dash-chart-card">
          <div class="rep-card-head"><h2>Goals Teratas</h2><small>${d.goals.length} goals</small></div>
          <div class="dash-goals">${topGoals || '<p class="task-empty">Belum ada goals.</p>'}</div>
          <div class="dash-mini-kpis">
            <div><span>Project aktif</span><b>${d.projActive}</b></div>
            <div><span>Kegiatan bulan ini</span><b>${d.monthTasks.length}</b></div>
            <div><span>Poin bulan</span><b>${pointScore(d.monthStats.average)}</b></div>
            <div><span>Bulan terbaik</span><b>${bestMonth ? bestMonth.monthName.slice(0, 3) : '-'}</b></div>
          </div>
        </section>
        <section class="panel dash-chart-card">
          <div class="rep-card-head"><h2>Agenda Hari Ini</h2><small>${agenda.length ? `${agenda.length} jadwal` : 'kosong'}</small></div>
          <div class="dash-agenda">${agendaRows || '<p class="task-empty">Tidak ada jadwal hari ini.</p>'}</div>
          <div class="rep-card-head" style="margin-top:10px"><h2>Tugas Mendatang</h2></div>
          ${upcoming.length ? `<div class="dash-agenda">${upcoming.map((t) => `
            <div class="dash-agenda-row" data-dash-go="task" role="button" tabindex="0">
              <span class="task-prio p-${t.priority || 'low'}"></span>
              <b>${taskDateRead(t.date)}</b>
              <span class="dash-agenda-title">${escapeHtml(t.title)}</span>
              <small>${escapeHtml(t.project || '')}</small>
            </div>`).join('')}</div>` : '<p class="task-empty">Tidak ada task mendatang.</p>'}
        </section>
      </div>

      <section class="panel dash-chart-card">
        <div class="rep-card-head"><h2>Detail Bulan ${MONTHS[activeMonth]}</h2><small>ringkasan habit</small></div>
        <div class="dash-mini-kpis">
          <div><span>Habit aktif</span><b>${d.monthStats.totalHabits}</b></div>
          <div><span>Slot terisi</span><b>${d.monthStats.checkedSlots}/${d.monthStats.totalSlots}</b></div>
          <div><span>Poin didapat</span><b>${d.monthStats.earnedPoints}/${d.monthStats.possiblePoints}</b></div>
          <div><span>Poin hari ini</span><b>${todayPoints.earnedPoints}/${todayPoints.possiblePoints}</b></div>
        </div>
        <div class="dash-links">
          <button type="button" class="dash-mod-cta" data-dash-go="habits">Buka Habit →</button>
          <button type="button" class="dash-mod-cta" data-dash-go="project">Buka Project →</button>
          <button type="button" class="dash-mod-cta" data-dash-go="transaksi">Buka Transaksi →</button>
          <button type="button" class="dash-mod-cta" data-dash-go="reports">Buka Laporan →</button>
        </div>
      </section>

      <section class="panel dash-progress-embed">
        <div class="rep-card-head"><h2>Goals and Habit Progress</h2><small>skor keseluruhan, aktivitas, dan tren</small></div>
        ${renderProgressView()}
      </section>
    </div>
  `;
}

function handleDashAction(btn) {
  if (btn.matches('[data-dash-go]')) { dashGoTo(btn.dataset.dashGo); return true; }
  return false;
}

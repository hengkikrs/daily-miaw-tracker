// Tracker Daily — laporan-export
// Dipisah dari public/app.js (refactor modular; tidak ada identifier yang di-rename).
// Classic script — urutan load: lihat <script> di public/index.html.
'use strict';


function lapPad(n) { return String(n).padStart(2, '0'); }
function lapRp(n) { return `Rp ${Math.abs(Math.round(Number(n) || 0)).toLocaleString('id-ID')}`; }
function lapPct(n) { return `${Math.round(Number(n) || 0)}%`; }
function lapMonthKey(pair) { return `${pair.y}-${lapPad(pair.m + 1)}`; }
function lapDateId(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime()) || d.getFullYear() < 2000) return '-';
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}
function lapShortMonth(pair) { return `${MONTHS[pair.m].slice(0, 3)} ${pair.y}`; }

function lapPeriod() {
  const y = activeYear;
  const m = activeMonth;
  let months = [];
  if (lapPeriodMode === 'bulan') {
    months = [{ y, m }];
  } else if (lapPeriodMode === 'tiga') {
    for (let i = 2; i >= 0; i -= 1) {
      const d = new Date(y, m - i, 1);
      months.push({ y: d.getFullYear(), m: d.getMonth() });
    }
  } else {
    months = Array.from({ length: 12 }, (_, i) => ({ y, m: i }));
  }
  const first = months[0];
  const last = months[months.length - 1];
  const from = `${lapMonthKey(first)}-01`;
  const to = `${lapMonthKey(last)}-${lapPad(daysInMonth(last.y, last.m))}`;
  const label = lapPeriodMode === 'bulan'
    ? `${MONTHS[m]} ${y}`
    : lapPeriodMode === 'tiga'
      ? `${MONTHS[first.m].slice(0, 3)} - ${MONTHS[last.m].slice(0, 3)} ${last.y}`
      : `Tahun ${y}`;
  return { months, from, to, label, keys: months.map(lapMonthKey), mode: lapPeriodMode };
}

function lapInRange(iso, p) { return Boolean(iso) && iso >= p.from && iso <= p.to; }

/* ---------- aggregasi data per modul (semua angka dihitung saat render) ---------- */
function lapActivityBlocks(p) {
  const tasks = loadTasks().filter((t) => lapInRange(t.date, p));
  const done = tasks.filter((t) => t.done).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const perProj = new Map();
  tasks.forEach((t) => {
    const key = (t.project || 'Tanpa project').trim() || 'Tanpa project';
    const cur = perProj.get(key) || { total: 0, done: 0 };
    cur.total += 1;
    if (t.done) cur.done += 1;
    perProj.set(key, cur);
  });
  const projRows = [...perProj.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 8)
    .map(([name, v]) => [name, String(v.total), String(v.done), `${Math.round((v.done / v.total) * 100)}%`]);
  const events = loadJadwalEvents().filter((e) => lapInRange(e.date, p))
    .sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
  const eventRows = events.slice(0, 10).map((e) => [e.date, e.time || '-', e.title, e.category || '-']);
  const catCount = new Map();
  events.forEach((e) => catCount.set(e.category || 'Lainnya', (catCount.get(e.category || 'Lainnya') || 0) + 1));
  const highOpen = tasks.filter((t) => !t.done && t.priority === 'high');
  const blocks = [
    {
      type: 'kpi',
      items: [
        { label: 'Total tugas', value: String(tasks.length), note: `${p.label}` },
        { label: 'Selesai', value: `${done} (${pct}%)`, note: `${tasks.length - done} belum selesai` },
        { label: 'Prioritas tinggi', value: String(highOpen.length), note: 'belum selesai' },
        { label: 'Agenda jadwal', value: String(events.length), note: `${catCount.size} kategori` },
      ],
    },
    { type: 'table', head: [{ t: 'Project', w: 0.4 }, { t: 'Tugas', w: 0.14, a: 'r' }, { t: 'Selesai', w: 0.16, a: 'r' }, { t: 'Progres', w: 0.3, a: 'r' }], rows: projRows, empty: 'Belum ada tugas pada periode ini.' },
    { type: 'table', head: [{ t: 'Tanggal', w: 0.16 }, { t: 'Waktu', w: 0.12 }, { t: 'Agenda', w: 0.5 }, { t: 'Kategori', w: 0.22 }], rows: eventRows, empty: 'Belum ada agenda jadwal pada periode ini.' },
  ];
  const priorityOpen = ['high', 'med', 'low'].map((pr) => {
    const list = tasks.filter((t) => !t.done && (t.priority || 'low') === pr);
    return list.length ? `${pr === 'high' ? 'Prioritas tinggi' : pr === 'med' ? 'Prioritas sedang' : 'Prioritas rendah'}: ${list.length} tugas (${list.slice(0, 3).map((t) => t.title).join(', ')}${list.length > 3 ? ', ...' : ''})` : '';
  }).filter(Boolean);
  if (priorityOpen.length) blocks.push({ type: 'list', title: 'Tugas yang masih terbuka', items: priorityOpen });
  return { blocks, kpi: { tasks: tasks.length, done, pct } };
}

function lapGoalsBlocks(p) {
  const goals = loadGoals();
  const active = goals.filter((g) => g.status !== 'selesai');
  const avgGoal = goalProgressAll(goals).pct; // agregat milestone (sumber kebenaran tunggal)
  const goalRows = goals
    .slice()
    .sort((a, b) => (a.status === 'selesai' ? 1 : 0) - (b.status === 'selesai' ? 1 : 0) || String(a.deadline || '').localeCompare(String(b.deadline || '')))
    .slice(0, 10)
    .map((g) => [g.title, g.category || '-', (GOAL_TERMS[goalTermOf(g)] || {}).label || '-', g.deadline || 'tanpa deadline', `${goalPctOf(g)}%`, g.status === 'selesai' ? 'Selesai' : 'Aktif']);
  const projects = loadProjects();
  const projRows = projects
    .slice()
    .sort((a, b) => String(a.deadline || '').localeCompare(String(b.deadline || '')))
    .slice(0, 10)
    .map((pr) => {
      const g = goals.find((x) => x.id === pr.goalId);
      const pg = projProgress(pr);
      return [pr.name || pr.title || '-', g ? g.title : 'tanpa goals', pr.deadline || '-', `${pg.pct}%`, pr.status === 'completed' ? 'Selesai' : pr.status === 'archived' ? 'Arsip' : 'Aktif'];
    });
  const habitMonths = p.months.map((mo) => {
    const st = calculateMonthStats(mo.y, mo.m);
    return { key: lapMonthKey(mo), label: lapShortMonth(mo), st };
  });
  const habitAvg = habitMonths.length ? Math.round(habitMonths.reduce((s, h) => s + h.st.average, 0) / habitMonths.length) : 0;
  const habitRows = habitMonths.map((h) => [h.label, String(h.st.totalHabits), `${h.st.checkedSlots}/${h.st.totalSlots}`, `${Math.round(h.st.average)}%`]);
  const lastMonth = p.months[p.months.length - 1];
  const habitDetail = getAllHabits(ensureMonth(lastMonth.y, lastMonth.m)).map((h) => {
    const hp = calculateHabitProgress(h, h.categoryKey, lastMonth.y, lastMonth.m);
    return { name: h.name, cat: h.categoryKey, pct: Math.round(hp.progress), checked: hp.checkedSlots, total: hp.totalSlots };
  }).sort((a, b) => b.pct - a.pct);
  const best = habitDetail.slice(0, 3);
  const worst = habitDetail.slice().reverse().slice(0, 3);
  const blocks = [
    {
      type: 'kpi',
      items: [
        { label: 'Goals aktif', value: String(active.length), note: `${goals.length} total goals` },
        { label: 'Progress goals', value: `${avgGoal}%`, note: 'progres milestone' },
        { label: 'Project', value: String(projects.length), note: `${projects.filter((x) => x.status === 'active').length} aktif` },
        { label: 'Capaian habit', value: `${habitAvg}%`, note: habitMonths.length > 1 ? `rata-rata ${habitMonths.length} bulan` : lastMonth ? lapShortMonth(lastMonth) : '-' },
      ],
    },
    { type: 'table', head: [{ t: 'Goals', w: 0.34 }, { t: 'Kategori', w: 0.14 }, { t: 'Jangka', w: 0.16 }, { t: 'Deadline', w: 0.16 }, { t: 'Progres', w: 0.1, a: 'r' }, { t: 'Status', w: 0.1 }], rows: goalRows, empty: 'Belum ada goals.' },
    { type: 'table', head: [{ t: 'Project', w: 0.34 }, { t: 'Goals', w: 0.28 }, { t: 'Deadline', w: 0.16 }, { t: 'Progres', w: 0.1, a: 'r' }, { t: 'Status', w: 0.12 }], rows: projRows, empty: 'Belum ada project.' },
    { type: 'table', head: [{ t: 'Bulan', w: 0.34 }, { t: 'Habit aktif', w: 0.22, a: 'r' }, { t: 'Centang', w: 0.22, a: 'r' }, { t: 'Capaian', w: 0.22, a: 'r' }], rows: habitRows, empty: 'Belum ada data habit.' },
  ];
  if (best.length) {
    blocks.push({
      type: 'list',
      title: `Kebiasaan paling konsisten (${lapShortMonth(lastMonth)})`,
      items: best.map((h) => `${h.name} — ${h.pct}% (${h.checked}/${h.total} slot)`),
    });
    blocks.push({
      type: 'list',
      title: 'Kebiasaan yang perlu perhatian',
      items: worst.map((h) => `${h.name} — ${h.pct}% (${h.checked}/${h.total} slot)`),
    });
  }
  return { blocks, kpi: { activeGoals: active.length, avgGoal, habitAvg } };
}

function lapOrgBlocks(p) {
  const notes = loadNotes().filter((n) => !n.archived && lapInRange(txIso(new Date(Number(n.updated) || 0)), p));
  const allNotes = loadNotes().filter((n) => !n.archived);
  const noteCats = new Map();
  allNotes.forEach((n) => noteCats.set(n.category || 'Lainnya', (noteCats.get(n.category || 'Lainnya') || 0) + 1));
  const noteRows = notes.slice().sort((a, b) => (Number(b.updated) || 0) - (Number(a.updated) || 0)).slice(0, 8)
    .map((n) => [n.title, n.category || '-', lapDateId(new Date(Number(n.updated) || 0))]);
  ensureDocStore();
  const docs = docList().filter((d) => lapInRange(txIso(new Date(Number(d.createdAt) || 0)), p));
  const allDocs = docList();
  const docsByCat = new Map();
  allDocs.forEach((d) => docsByCat.set(d.category || 'Lainnya', (docsByCat.get(d.category || 'Lainnya') || 0) + 1));
  const files = allDocs.filter((d) => d.kind === 'file');
  const docRows = docs.slice().sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0)).slice(0, 8)
    .map((d) => [d.name, d.category || '-', d.kind === 'file' ? 'File' : 'Link', lapDateId(new Date(Number(d.createdAt) || 0))]);
  const blocks = [
    {
      type: 'kpi',
      items: [
        { label: 'Catatan dibuat', value: String(notes.length), note: `${allNotes.length} catatan total` },
        { label: 'Kategori catatan', value: String(noteCats.size), note: [...noteCats.keys()].slice(0, 3).join(', ') || '-' },
        { label: 'Dokumen masuk', value: String(docs.length), note: `${allDocs.length} total` },
        { label: 'File tersimpan', value: String(files.length), note: 'berkas di Document Hub' },
      ],
    },
    { type: 'table', head: [{ t: 'Judul catatan', w: 0.52 }, { t: 'Kategori', w: 0.24 }, { t: 'Diperbarui', w: 0.24 }], rows: noteRows, empty: 'Belum ada catatan pada periode ini.' },
    { type: 'table', head: [{ t: 'Dokumen', w: 0.52 }, { t: 'Kategori', w: 0.24 }, { t: 'Tipe', w: 0.12 }, { t: 'Ditambahkan', w: 0.24 }], rows: docRows, empty: 'Belum ada dokumen pada periode ini.' },
  ];
  return { blocks, kpi: { notes: notes.length, docs: docs.length } };
}

function lapFinanceBlocks(p) {
  const txs = txList().filter((t) => lapInRange(t.date, p));
  const income = txs.filter((t) => t.type === 'in').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const expense = txs.filter((t) => t.type === 'out').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const net = income - expense;
  const perMonth = p.keys.map((k, i) => {
    const list = txList().filter((t) => (t.date || '').slice(0, 7) === k);
    const inSum = list.filter((t) => t.type === 'in').reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const outSum = list.filter((t) => t.type === 'out').reduce((s, t) => s + (Number(t.amount) || 0), 0);
    return [lapShortMonth(p.months[i]), lapRp(inSum), lapRp(outSum), lapRp(inSum - outSum)];
  }).filter((r, i) => p.mode === 'tahun' || txList().some((t) => (t.date || '').slice(0, 7) === p.keys[i]));
  const byCat = new Map();
  txs.filter((t) => t.type === 'out').forEach((t) => byCat.set(t.cat || 'Lainnya', (byCat.get(t.cat || 'Lainnya') || 0) + (Number(t.amount) || 0)));
  const catRows = [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([cat, val]) => [cat, lapRp(val), expense ? `${Math.round((val / expense) * 100)}%` : '0%']);
  ensureBudStore();
  const budMonth = p.keys[p.keys.length - 1];
  const buds = budList().filter((b) => b.period === budMonth);
  const budRows = buds.map((b) => {
    const c = budCalc(b);
    return [b.name, lapRp(b.amount), lapRp(c.spent), lapRp(c.left), budStatusText(c.status)];
  });
  const budTotal = buds.reduce((s, b) => s + (Number(b.amount) || 0), 0);
  const budSpent = buds.reduce((s, b) => s + budCalc(b).spent, 0);
  ensureSaveStore();
  const savings = (state.savings || []).filter((s) => !s.archived);
  const svRows = savings.slice(0, 8).map((s) => {
    const c = saveCalc(s);
    return [s.name, lapRp(s.target), lapRp(s.balance), `${Math.round(c.pctReal)}%`, s.deadline || 'tanpa deadline'];
  });
  const savedTotal = savings.reduce((s, x) => s + (Number(x.balance) || 0), 0);
  const targetTotal = savings.reduce((s, x) => s + (Number(x.target) || 0), 0);
  const deposits = (state.savingsTx || []).filter((t) => lapInRange(t.date, p) && t.kind === 'deposit')
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const biggest = txs.filter((t) => t.type === 'out').sort((a, b) => b.amount - a.amount).slice(0, 3);
  const blocks = [
    {
      type: 'kpi',
      items: [
        { label: 'Pemasukan', value: lapRp(income), note: `${txs.filter((t) => t.type === 'in').length} transaksi` },
        { label: 'Pengeluaran', value: lapRp(expense), note: `${txs.filter((t) => t.type === 'out').length} transaksi` },
        { label: 'Arus kas bersih', value: lapRp(net), note: net >= 0 ? 'surplus' : 'defisit' },
        { label: 'Saldo tabungan', value: lapRp(savedTotal), note: `${targetTotal ? Math.round((savedTotal / targetTotal) * 100) : 0}% dari ${lapRp(targetTotal)}` },
      ],
    },
    { type: 'table', head: [{ t: 'Periode', w: 0.28 }, { t: 'Masuk', w: 0.24, a: 'r' }, { t: 'Keluar', w: 0.24, a: 'r' }, { t: 'Net', w: 0.24, a: 'r' }], rows: perMonth, empty: 'Belum ada transaksi pada periode ini.' },
    { type: 'table', head: [{ t: 'Kategori pengeluaran', w: 0.5 }, { t: 'Total', w: 0.28, a: 'r' }, { t: 'Porsi', w: 0.22, a: 'r' }], rows: catRows, empty: 'Belum ada pengeluaran tercatat.' },
    { type: 'table', head: [{ t: `Budget ${lapShortMonth(p.months[p.months.length - 1])}`, w: 0.34 }, { t: 'Anggaran', w: 0.2, a: 'r' }, { t: 'Terpakai', w: 0.2, a: 'r' }, { t: 'Sisa', w: 0.16, a: 'r' }, { t: 'Status', w: 0.18 }], rows: budRows, empty: 'Belum ada budget pada periode ini.' },
    { type: 'table', head: [{ t: 'Target tabungan', w: 0.36 }, { t: 'Target', w: 0.2, a: 'r' }, { t: 'Saldo', w: 0.2, a: 'r' }, { t: 'Progres', w: 0.12, a: 'r' }, { t: 'Deadline', w: 0.16 }], rows: svRows, empty: 'Belum ada target tabungan.' },
  ];
  const notes = [];
  if (budTotal > 0) notes.push(`Budget periode ini ${lapRp(budTotal)} dengan terpakai ${lapRp(budSpent)} (${Math.round((budSpent / budTotal) * 100)}%).`);
  if (income > 0) notes.push(`Rasio tabungan ${Math.round((Math.max(0, net) / income) * 100)}% dari pemasukan, setoran tabungan periode ini ${lapRp(deposits)}.`);
  if (biggest.length) notes.push(`Pengeluaran terbesar: ${biggest.map((b) => `${b.note || b.cat} ${lapRp(b.amount)}`).join('; ')}.`);
  if (notes.length) blocks.push({ type: 'list', title: 'Catatan keuangan', items: notes });
  return { blocks, kpi: { income, expense, net, savedTotal } };
}

function lapAiBlocks(text) {
  const lines = String(text || '').split('\n');
  const blocks = [];
  let list = null;
  const inline = (s) => s.replace(/\*\*([^*\n]+)\*\*/g, '$1').replace(/`([^`\n]+)`/g, '$1');
  lines.forEach((raw) => {
    const ln = raw.trim();
    let m;
    if (!ln) { if (list) { blocks.push({ type: 'list', items: list }); list = null; } return; }
    if ((m = ln.match(/^#{1,4}\s+(.*)$/))) {
      if (list) { blocks.push({ type: 'list', items: list }); list = null; }
      blocks.push({ type: 'h', text: inline(m[1]) });
    } else if ((m = ln.match(/^[-•*]\s+(.*)$/)) || (m = ln.match(/^\d+[.)]\s+(.*)$/))) {
      if (!list) list = [];
      list.push(inline(m[1]));
    } else {
      if (list) { blocks.push({ type: 'list', items: list }); list = null; }
      blocks.push({ type: 'para', text: inline(ln) });
    }
  });
  if (list) blocks.push({ type: 'list', items: list });
  return blocks;
}

function lapBuildModel() {
  const p = lapPeriod();
  const sections = [];
  const agg = {};
  if (lapSections.has('activity')) { const r = lapActivityBlocks(p); sections.push({ key: 'activity', title: 'Activity', blocks: r.blocks }); agg.activity = r.kpi; }
  if (lapSections.has('goals')) { const r = lapGoalsBlocks(p); sections.push({ key: 'goals', title: 'Goals & Habit', blocks: r.blocks }); agg.goals = r.kpi; }
  if (lapSections.has('org')) { const r = lapOrgBlocks(p); sections.push({ key: 'org', title: 'Organization', blocks: r.blocks }); agg.org = r.kpi; }
  if (lapSections.has('finance')) { const r = lapFinanceBlocks(p); sections.push({ key: 'finance', title: 'Finance', blocks: r.blocks }); agg.finance = r.kpi; }
  if (lapAiText.trim()) sections.push({ key: 'ai', title: `Analisis AI (MiawAI${lapAiMeta && lapAiMeta.model ? ` · ${lapAiMeta.model}` : ''})`, blocks: lapAiBlocks(lapAiText) });
  const now = new Date();
  const kpis = [
    { label: 'Tugas selesai', value: agg.activity ? `${agg.activity.done}/${agg.activity.tasks}` : '-', note: agg.activity ? `${agg.activity.pct}% dari tugas periode ini` : 'Activity tidak disertakan' },
    { label: 'Capaian habit', value: agg.goals ? `${agg.goals.habitAvg}%` : '-', note: agg.goals ? `${agg.goals.activeGoals} goals aktif` : 'Goals & Habit tidak disertakan' },
    { label: 'Catatan & dokumen', value: `${agg.org ? agg.org.notes : 0}/${agg.org ? agg.org.docs : 0}`, note: agg.org ? 'catatan baru / dokumen baru' : 'Organization tidak disertakan' },
    { label: 'Arus kas bersih', value: agg.finance ? lapRp(agg.finance.net) : '-', note: agg.finance ? `${lapRp(agg.finance.income)} masuk · ${lapRp(agg.finance.expense)} keluar` : 'Finance tidak disertakan' },
  ];
  return {
    title: 'Laporan Miaw Tracker',
    subtitle: `Periode ${p.label}`,
    stamp: now.toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    generatedAt: now.getTime(),
    period: p,
    kpis,
    sections,
    ai: lapAiText.trim() ? { text: lapAiText, meta: lapAiMeta } : null,
  };
}

function lapAiDigest(model) {
  const p = model.period || {};
  // Prompt harus RINGKAS: provider melambat drastis pada prompt panjang (>1,4k char sering timeout 60s).
  const head = [
    'Analisis laporan tracker ini. Balas: 1 paragraf ringkasan (maks 4 kalimat), baris "## Temuan" + 3 bullet, baris "## Rekomendasi" + 3 bullet aksi. Bahasa Indonesia, pakai angka dari data, tanpa basa-basi.',
    `PERIODE: ${p.label || '-'}`,
    `RINGKASAN: ${(model.kpis || []).map((k) => `${k.label}=${k.value}`).join('; ')}`,
  ];
  const secs = [];
  model.sections.forEach((sec) => {
    if (sec.key === 'ai') return;
    const bits = [];
    sec.blocks.forEach((b) => {
      if (b.type === 'kpi') bits.push(b.items.map((i) => `${i.label}=${i.value}`).join('; '));
      else if (b.type === 'table' && b.rows && b.rows.length) bits.push(`${b.head[0].t}: ${b.rows.slice(0, 3).map((r) => r.join(' ')).join(' / ')}`);
      else if (b.type === 'list' && b.items.length) bits.push(b.items.slice(0, 2).join(' / '));
    });
    if (bits.length) secs.push(`${sec.title.toUpperCase()}: ${bits.join(' | ').slice(0, 110)}`);
  });
  return head.concat(secs).join('\n');
}

async function lapRunAi() {
  if (lapAiBusy) return;
  lapAiBusy = true;
  lapNotice = '';
  renderShell();
  const model = lapBuildModel();
  try {
    const res = await fetch('/api/miawai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: lapAiModel, messages: [{ role: 'user', content: lapAiDigest(model) }] }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data || !data.reply) {
      lapAiText = '';
      const code = String((data && data.error) || '');
      const friendly = code === 'timeout'
        ? 'Server AI melebihi batas waktu (data terlalu besar). Coba lagi sebentar lagi.'
        : code === 'too_many_requests'
          ? 'Terlalu banyak permintaan ke AI. Tunggu 1 menit lalu coba lagi.'
          : code || 'Analisis AI gagal dibuat. Coba lagi.';
      lapNotice = `⚠️ ${friendly}`;
    } else {
      lapAiText = String(data.reply);
      lapAiMeta = { model: data.model || lapAiModel, at: Date.now() };
      lapNotice = '✅ Analisis AI siap dan ikut disertakan pada PDF/DOC.';
    }
  } catch (e) {
    lapNotice = '⚠️ Gagal terhubung ke MiawAI. Periksa koneksi lalu coba lagi.';
  }
  lapAiBusy = false;
  renderShell();
}

/* ---------- preview HTML (sumber blok yang sama dengan PDF/DOC) ---------- */
function lapBlocksHtml(blocks) {
  return blocks.map((b) => {
    if (b.type === 'kpi') {
      return `<div class="lap-kpis">${b.items.map((i) => `<div class="lap-kpi"><span>${escapeHtml(i.label)}</span><b>${escapeHtml(i.value)}</b><small>${escapeHtml(i.note || '')}</small></div>`).join('')}</div>`;
    }
    if (b.type === 'h') return `<h4 class="lap-h">${escapeHtml(b.text)}</h4>`;
    if (b.type === 'para') return `<p class="lap-para">${escapeHtml(b.text)}</p>`;
    if (b.type === 'list') {
      return `${b.title ? `<div class="lap-sub">${escapeHtml(b.title)}</div>` : ''}<ul class="lap-list">${b.items.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul>`;
    }
    if (b.type === 'table') {
      if (!b.rows || !b.rows.length) return `<div class="lap-empty">${escapeHtml(b.empty || 'Tidak ada data.')}</div>`;
      const head = b.head.map((h) => `<th class="${h.a === 'r' ? 'r' : ''}">${escapeHtml(h.t)}</th>`).join('');
      const rows = b.rows.map((r) => `<tr>${r.map((c, i) => `<td class="${(b.head[i] || {}).a === 'r' ? 'r' : ''}">${escapeHtml(c)}</td>`).join('')}</tr>`).join('');
      return `<div class="lap-tablewrap"><table class="lap-table"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
    }
    return '';
  }).join('');
}

function renderLaporanView() {
  const model = lapBuildModel();
  const modeChips = Object.keys(LAP_MODE_LABEL).map((k) => `<button type="button" class="lap-seg-btn ${lapPeriodMode === k ? 'on' : ''}" data-lap-mode="${k}">${LAP_MODE_LABEL[k]}</button>`).join('');
  const sectionChips = LAP_SECTIONS.map((s) => `<button type="button" class="lap-chip ${lapSections.has(s.key) ? 'on' : ''}" data-lap-sec="${s.key}"><b>${s.label}</b><span>${s.desc}</span></button>`).join('');
  const allOn = lapSections.size === LAP_SECTIONS.length;
  const modelOpts = MIAW_MODELS.map((m) => `<option value="${m.id}" ${m.id === lapAiModel ? 'selected' : ''}>${m.label}</option>`).join('');
  const aiBody = lapAiBusy
    ? '<div class="lap-ai-wait"><span class="miaw-typing"><i></i><i></i><i></i></span><span>Menyusun analisis dari data laporan…</span></div>'
    : (lapAiText.trim()
      ? `<div class="lap-ai-body">${miawSimpleMarkdown(lapAiText)}</div>${lapAiMeta ? `<div class="lap-ai-meta">Model ${escapeHtml(lapAiMeta.model)} · ${escapeHtml(new Date(lapAiMeta.at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }))}</div>` : ''}`
      : '<div class="lap-empty">Belum ada analisis AI. Klik “Buat analisis AI” untuk merangkum temuan penting + rekomendasi dari data periode ini.</div>');
  const sectionsHtml = model.sections.map((sec) => `
    <section class="panel lap-card">
      <div class="lap-card-head">
        <h3><span class="lap-dot"></span>${escapeHtml(sec.title)}</h3>
        <small>${sec.blocks.length} blok data</small>
      </div>
      ${lapBlocksHtml(sec.blocks)}
    </section>`).join('');
  return `
    <div class="lap-page">
      <section class="panel lap-hero">
        <div class="lap-hero-top">
          <div>
            <h2>Laporan lengkap</h2>
            <small>Activity · Goals &amp; Habit · Organization · Finance — siap diunduh PDF/DOC</small>
          </div>
          <div class="lap-seg">${modeChips}</div>
        </div>
        <div class="lap-chips">
          <button type="button" class="lap-toggle ${allOn ? 'on' : ''}" data-lap-all="1">${allOn ? 'Semua modul aktif' : `${lapSections.size}/${LAP_SECTIONS.length} modul`}</button>
          ${sectionChips}
        </div>
        <div class="lap-kpis lap-kpis-hero">${model.kpis.map((k) => `<div class="lap-kpi"><span>${escapeHtml(k.label)}</span><b>${escapeHtml(k.value)}</b><small>${escapeHtml(k.note)}</small></div>`).join('')}</div>
        <div class="lap-actions">
          <button type="button" class="lap-btn" data-lap-dl="pdf">⬇️ Unduh PDF</button>
          <button type="button" class="lap-btn ghost" data-lap-dl="doc">⬇️ Unduh DOC</button>
          <span class="lap-hint">Isi laporan mengikuti data tiap menu pada periode ${escapeHtml(model.period.label)}.</span>
        </div>
      </section>

      <section class="panel lap-card lap-ai">
        <div class="lap-card-head">
          <h3><span class="lap-dot ai"></span>Analisis AI</h3>
          <div class="lap-ai-tools">
            <select id="lapAiModel" class="lap-select" aria-label="Model AI">${modelOpts}</select>
            <button type="button" class="lap-btn small" data-lap-ai="1" ${lapAiBusy ? 'disabled' : ''}>${lapAiBusy ? 'Menyusun…' : (lapAiText.trim() ? '🔄 Perbarui analisis' : '✨ Buat analisis AI')}</button>
          </div>
        </div>
        ${lapNotice ? `<div class="lap-note">${escapeHtml(lapNotice)}</div>` : ''}
        ${aiBody}
      </section>

      ${sectionsHtml || '<section class="panel lap-card"><div class="lap-empty">Pilih minimal satu modul untuk menyusun laporan.</div></section>'}
    </div>
  `;
}

/* == LAPORAN PDF ENGINE START (self-contained, ASCII-only, no deps) == */
const LAP_PDF_W_REG = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
const LAP_PDF_W_BOLD = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584];

function lapPdfAscii(value) {
  return String(value == null ? '' : value)
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u2033]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/\u00A0/g, ' ')
    .replace(/[\u2022\u25CF\u25AA\u00B7]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[\u2264]/g, '<=')
    .replace(/[\u2265]/g, '>=')
    .replace(/[\u00D7]/g, 'x')
    .replace(/[\u2192\u27A1]/g, '->')
    .replace(/[\u00B0]/g, 'deg')
    .replace(/[\u20AC]/g, 'EUR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E\n]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function lapPdfBytes(model) {
  const PW = 595.28;
  const PH = 841.89;
  const M = 44;
  const CW = PW - M * 2;
  const C = {
    ink: [0.16, 0.13, 0.11], esp: [0.404, 0.337, 0.29], espL: [0.55, 0.47, 0.41],
    cream: [0.976, 0.965, 0.945], soft: [0.949, 0.933, 0.906], line: [0.86, 0.83, 0.78],
    mut: [0.47, 0.435, 0.40], white: [1, 1, 1], org: [0.918, 0.541, 0.184],
    grn: [0.239, 0.604, 0.373], red: [0.878, 0.353, 0.298], creamTxt: [0.94, 0.92, 0.88],
  };
  const FW = { F1: LAP_PDF_W_REG, F2: LAP_PDF_W_BOLD };
  const nf = (n) => (Math.round(Number(n) * 100) / 100).toString();
  const esc = (s) => lapPdfAscii(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const sw = (s, f, size) => {
    const t = lapPdfAscii(s);
    let w = 0;
    for (let i = 0; i < t.length; i += 1) {
      const code = t.charCodeAt(i);
      w += (code >= 32 && code <= 126) ? FW[f][code - 32] : 500;
    }
    return (w / 1000) * size;
  };
  const wrap = (s, f, size, maxW) => {
    const words = lapPdfAscii(s).split(' ').filter(Boolean);
    const out = [];
    let cur = '';
    words.forEach((wd) => {
      const cand = cur ? `${cur} ${wd}` : wd;
      if (!cur || sw(cand, f, size) <= maxW) cur = cand;
      else { out.push(cur); cur = wd; }
    });
    out.push(cur);
    return out.length ? out : [''];
  };
  const clip = (s, f, size, maxW) => {
    let t = lapPdfAscii(s);
    if (sw(t, f, size) <= maxW) return t;
    let r = '';
    for (let i = 0; i < t.length; i += 1) {
      if (sw(`${r}${t[i]}...`, f, size) > maxW) break;
      r += t[i];
    }
    return `${r}...`;
  };
  let pages = [];
  let ops = [];
  let y = 0;
  const col = (c, fill) => `${nf(c[0])} ${nf(c[1])} ${nf(c[2])} ${fill ? 'rg' : 'RG'}`;
  const rect = (x, yy, w, h, c) => ops.push(`${col(c, true)} ${nf(x)} ${nf(yy)} ${nf(w)} ${nf(h)} re f`);
  const rrect = (x, yy, w, h, r, c) => {
    const k = 0.5523 * r;
    ops.push([
      col(c, true),
      `${nf(x + r)} ${nf(yy)} m`,
      `${nf(x + w - r)} ${nf(yy)} l`,
      `${nf(x + w - r + k)} ${nf(yy)} ${nf(x + w)} ${nf(yy + r - k)} ${nf(x + w)} ${nf(yy + r)} c`,
      `${nf(x + w)} ${nf(yy + h - r)} ${nf(x + w - r + k)} ${nf(yy + h)} ${nf(x + w - r)} ${nf(yy + h)} c`,
      `${nf(x + r)} ${nf(yy + h)} ${nf(x)} ${nf(yy + h - r + k)} ${nf(x)} ${nf(yy + h - r)} c`,
      `${nf(x)} ${nf(yy + r)} ${nf(x + r - k)} ${nf(yy)} ${nf(x + r)} ${nf(yy)} c`,
      'f',
    ].join(' '));
  };
  const line = (x1, y1, x2, y2, c, w) => ops.push(`${col(c, false)} ${nf(w)} w ${nf(x1)} ${nf(y1)} m ${nf(x2)} ${nf(y2)} l S`);
  const text = (x, yy, s, o) => {
    const opt = o || {};
    const t = lapPdfAscii(s);
    if (!t) return;
    const f = opt.font || 'F1';
    const size = opt.size || 9.5;
    let xx = x;
    if (opt.right) xx = opt.right - sw(t, f, size);
    if (opt.center) xx = opt.center - sw(t, f, size) / 2;
    ops.push(`BT ${col(opt.color || C.ink, true)} /${f} ${nf(size)} Tf ${nf(xx)} ${nf(yy)} Td (${esc(t)}) Tj ET`);
  };
  const newPage = () => {
    if (ops.length) pages.push(ops.join('\n'));
    ops = [];
    if (!pages.length) {
      rect(0, PH - 104, PW, 104, C.esp);
      rect(0, PH - 108, PW, 4, C.org);
      text(M, PH - 44, 'Miaw Tracker', { font: 'F2', size: 20, color: C.white });
      text(M, PH - 62, model.subtitle, { font: 'F1', size: 10.5, color: C.creamTxt });
      text(M, PH - 80, `Dibuat otomatis pada ${model.stamp}`, { font: 'F1', size: 8.5, color: C.creamTxt });
      text(0, PH - 46, 'LAPORAN', { font: 'F2', size: 20, color: C.white, right: PW - M });
      y = PH - 134;
    } else {
      rect(0, PH - 32, PW, 32, C.esp);
      rect(0, PH - 35, PW, 3, C.org);
      text(M, PH - 21, `Miaw Tracker - ${model.subtitle}`, { font: 'F1', size: 8.5, color: C.white });
      text(0, PH - 21, 'Laporan', { font: 'F2', size: 8.5, color: C.white, right: PW - M });
      y = PH - 56;
    }
  };
  const ensure = (h) => { if (y - h < M + 30) newPage(); };
  const gap = (h) => { y -= (h || 8); };

  const drawKpi = (items) => {
    const n = Math.max(1, items.length);
    const g = 8;
    const w = (CW - g * (n - 1)) / n;
    const h = 50;
    ensure(h);
    items.forEach((it, i) => {
      const x = M + i * (w + g);
      rrect(x, y - h, w, h, 7, C.soft);
      line(x, y - h, x + w, y - h, C.line, 0.6);
      text(x + 9, y - 15, String(it.label).toUpperCase(), { size: 7.2, color: C.mut, font: 'F2' });
      const val = clip(it.value, 'F2', 12.5, w - 18);
      text(x + 9, y - 30, val, { size: 12.5, font: 'F2', color: C.esp });
      if (it.note) text(x + 9, y - 41, clip(it.note, 'F1', 7.6, w - 18), { size: 7.6, color: C.mut });
    });
    y -= h + 14;
  };

  const drawTable = (block) => {
    const head = block.head || [];
    const widths = head.map((h) => (h.w || 1 / head.length) * CW);
    const rows = block.rows || [];
    const drawHead = () => {
      ensure(26);
      rect(M, y - 18, CW, 18, C.esp);
      let x = M;
      head.forEach((h, i) => {
        const t = clip(h.t, 'F2', 8.2, widths[i] - 12);
        if (h.a === 'r') text(0, y - 12.5, t, { size: 8.2, font: 'F2', color: C.white, right: x + widths[i] - 6 });
        else text(x + 6, y - 12.5, t, { size: 8.2, font: 'F2', color: C.white });
        x += widths[i];
      });
      y -= 18;
    };
    if (!rows.length) {
      ensure(20);
      text(M + 2, y - 12, lapPdfAscii(block.empty || 'Tidak ada data.'), { size: 8.6, color: C.mut });
      y -= 22;
      return;
    }
    drawHead();
    rows.forEach((row, ri) => {
      const cells = row.map((c, i) => wrap(c, 'F1', 8.4, widths[i] - 12).slice(0, 3));
      const lines = Math.max(...cells.map((c) => c.length));
      const rowH = lines * 10.6 + 7;
      if (y - rowH < M + 30) { newPage(); drawHead(); }
      if (ri % 2 === 1) rect(M, y - rowH, CW, rowH, C.cream);
      let x = M;
      cells.forEach((cl, i) => {
        cl.forEach((ln, li) => {
          const yy = y - 11 - li * 10.6;
          if ((head[i] || {}).a === 'r') text(0, yy, ln, { size: 8.4, color: C.ink, right: x + widths[i] - 6 });
          else text(x + 6, yy, ln, { size: 8.4, color: C.ink });
        });
        x += widths[i];
      });
      line(M, y - rowH, M + CW, y - rowH, C.line, 0.4);
      y -= rowH;
    });
    y -= 14;
  };

  const drawPara = (block) => {
    const lines = wrap(block.text, 'F1', 9, CW);
    lines.forEach((ln) => { ensure(13); text(M, y - 9, ln, { size: 9, color: C.ink }); y -= 12.4; });
    y -= 4;
  };

  const drawH = (block) => {
    ensure(18);
    text(M, y - 11, block.text, { size: 10, font: 'F2', color: C.esp });
    y -= 18;
  };

  const drawList = (block) => {
    if (block.title) {
      ensure(18);
      text(M, y - 10, block.title, { size: 8.8, font: 'F2', color: C.espL });
      y -= 15;
    }
    (block.items || []).forEach((it) => {
      const lines = wrap(it, 'F1', 8.8, CW - 12);
      ensure(lines.length * 12 + 2);
      text(M, y - 9, '-', { size: 8.8, color: C.org, font: 'F2' });
      lines.forEach((ln, li) => text(M + 12, y - 9 - li * 11.6, ln, { size: 8.8, color: C.ink }));
      y -= lines.length * 11.6 + 3;
    });
    y -= 6;
  };

  const drawSection = (sec) => {
    ensure(40);
    gap(4);
    rect(M, y - 13, 3.4, 13, C.org);
    text(M + 11, y - 11, sec.title, { size: 12, font: 'F2', color: C.esp });
    y -= 24;
    (sec.blocks || []).forEach((b) => {
      if (b.type === 'kpi') drawKpi(b.items || []);
      else if (b.type === 'table') drawTable(b);
      else if (b.type === 'para') drawPara(b);
      else if (b.type === 'h') drawH(b);
      else if (b.type === 'list') drawList(b);
    });
  };

  newPage();
  text(M, y - 10, 'Ringkasan periode', { size: 11, font: 'F2', color: C.esp });
  text(0, y - 10, model.period && model.period.label ? model.period.label : '', { size: 9, color: C.mut, right: PW - M });
  y -= 22;
  drawKpi(model.kpis || []);
  (model.sections || []).forEach(drawSection);
  ensure(20);
  y -= 8;
  if (ops.length) pages.push(ops.join('\n'));

  pages = pages.map((content, i) => {
    const foot = [
      `${col(C.line, false)} 0.7 w ${nf(M)} ${nf(M + 14)} m ${nf(PW - M)} ${nf(M + 14)} l S`,
      `BT ${col(C.mut, true)} /F1 7.6 Tf ${nf(M)} ${nf(M + 2)} Td (${esc('Laporan otomatis Miaw Tracker - data diambil dari modul Activity, Goals & Habit, Organization, dan Finance.')}) Tj ET`,
      `BT ${col(C.mut, true)} /F2 7.6 Tf ${nf(PW - M - 60)} ${nf(M + 2)} Td (${esc(`Halaman ${i + 1} dari ${pages.length}`)}) Tj ET`,
    ].join('\n');
    return `${content}\n${foot}`;
  });

  const objs = [];
  const n = pages.length;
  objs.push('<< /Type /Catalog /Pages 2 0 R >>');
  const kids = pages.map((_, i) => `${3 + i * 2} 0 R`).join(' ');
  objs.push(`<< /Type /Pages /Kids [${kids}] /Count ${n} >>`);
  const f1 = 3 + n * 2;
  const f2 = f1 + 1;
  pages.forEach((content, i) => {
    const contentObj = 4 + i * 2;
    objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${contentObj} 0 R >>`);
    objs.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });
  objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objs.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((off) => { pdf += `${String(off).padStart(10, '0')} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i += 1) bytes[i] = pdf.charCodeAt(i) & 0xff;
  return bytes;
}
/* == LAPORAN PDF ENGINE END == */

/* == LAPORAN DOC ENGINE START == */
function lapDocHtml(model) {
  const esc = (s) => escapeHtml(String(s == null ? '' : s));
  const kpiHtml = (items) => `<table style="width:100%;border-collapse:separate;border-spacing:6px 0;margin:6px 0 14px"><tr>${items.map((i) => `<td style="width:${Math.floor(100 / items.length)}%;background:#f4f0e9;border:1px solid #e7e0d4;border-radius:8px;padding:8px 10px;vertical-align:top"><div style="font-size:8.5pt;color:#8a7c6d;text-transform:uppercase;letter-spacing:.4px">${esc(i.label)}</div><div style="font-size:14pt;font-weight:bold;color:#67564a">${esc(i.value)}</div><div style="font-size:8pt;color:#8a7c6d">${esc(i.note || '')}</div></td>`).join('')}</tr></table>`;
  const tableHtml = (b) => {
    if (!b.rows || !b.rows.length) return `<p style="color:#8a7c6d;font-style:italic;font-size:9.5pt;margin:4px 0 14px">${esc(b.empty || 'Tidak ada data.')}</p>`;
    const th = b.head.map((h) => `<th style="background:#67564a;color:#ffffff;font-size:9pt;text-align:${h.a === 'r' ? 'right' : 'left'};padding:6px 8px;border:1px solid #67564a">${esc(h.t)}</th>`).join('');
    const trs = b.rows.map((r, i) => `<tr>${r.map((c, ci) => `<td style="font-size:9pt;padding:5px 8px;border:1px solid #e7e0d4;background:${i % 2 ? '#faf7f1' : '#ffffff'};text-align:${(b.head[ci] || {}).a === 'r' ? 'right' : 'left'}">${esc(c)}</td>`).join('')}</tr>`).join('');
    return `<table style="width:100%;border-collapse:collapse;margin:4px 0 14px"><tr>${th}</tr>${trs}</table>`;
  };
  const body = model.sections.map((sec) => `
    <h2 style="font-size:13pt;color:#67564a;border-left:4px solid #ea8a2f;padding-left:8px;margin:18px 0 8px">${esc(sec.title)}</h2>
    ${sec.blocks.map((b) => {
      if (b.type === 'kpi') return kpiHtml(b.items);
      if (b.type === 'table') return tableHtml(b);
      if (b.type === 'h') return `<h3 style="font-size:11pt;color:#8a6f5c;margin:10px 0 4px">${esc(b.text)}</h3>`;
      if (b.type === 'para') return `<p style="font-size:10pt;line-height:1.55;margin:4px 0 10px">${esc(b.text)}</p>`;
      if (b.type === 'list') return `${b.title ? `<p style="font-size:10pt;font-weight:bold;color:#8a6f5c;margin:8px 0 2px">${esc(b.title)}</p>` : ''}<ul style="margin:2px 0 12px;padding-left:18px">${b.items.map((t) => `<li style="font-size:10pt;line-height:1.5">${esc(t)}</li>`).join('')}</ul>`;
      return '';
    }).join('')}`).join('');
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${esc(model.title)} - ${esc(model.subtitle)}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>
@page { size: A4; margin: 1.6cm 1.5cm; }
body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; color: #2b2318; font-size: 10pt; }
h1 { font-size: 19pt; margin: 0 0 2px; color: #67564a; }
table { mso-table-lspace: 0; mso-table-rspace: 0; }
</style></head>
<body>
<div style="background:#67564a;color:#ffffff;padding:16px 18px;border-radius:10px">
  <h1 style="color:#ffffff">${esc(model.title)}</h1>
  <div style="font-size:11pt">${esc(model.subtitle)}</div>
  <div style="font-size:8.5pt;color:#e6ddd2;margin-top:4px">Dibuat otomatis pada ${esc(model.stamp)}</div>
</div>
<h2 style="font-size:13pt;color:#67564a;border-left:4px solid #ea8a2f;padding-left:8px;margin:18px 0 8px">Ringkasan periode</h2>
${kpiHtml(model.kpis || [])}
${body}
<p style="font-size:8.5pt;color:#8a7c6d;border-top:1px solid #e7e0d4;padding-top:8px;margin-top:18px">Laporan dibuat otomatis oleh Miaw Tracker dari data modul Activity, Goals &amp; Habit, Organization, dan Finance.</p>
</body></html>`;
}
/* == LAPORAN DOC ENGINE END == */

function lapFileName(ext) {
  const p = lapPeriod();
  const slug = p.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const d = new Date();
  return `laporan-miaw-tracker-${slug}-${d.getFullYear()}${lapPad(d.getMonth() + 1)}${lapPad(d.getDate())}.${ext}`;
}

function lapDownload(kind) {
  try {
    const model = lapBuildModel();
    let blob;
    let name;
    if (kind === 'pdf') {
      const bytes = lapPdfBytes(model);
      blob = new Blob([bytes], { type: 'application/pdf' });
      name = lapFileName('pdf');
    } else {
      blob = new Blob(['\ufeff', lapDocHtml(model)], { type: 'application/msword' });
      name = lapFileName('doc');
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    showToast(`${kind === 'pdf' ? 'PDF' : 'DOC'} laporan dibuat — cek folder unduhan.`);
  } catch (e) {
    showToast(`Gagal membuat ${kind.toUpperCase()}: ${e && e.message ? e.message : 'error'}`, true);
  }
}

function handleLaporanAction(btn) {
  if (btn.matches('[data-lap-mode]')) {
    lapPeriodMode = btn.dataset.lapMode;
    renderShell();
    return true;
  }
  if (btn.matches('[data-lap-sec]')) {
    const key = btn.dataset.lapSec;
    if (lapSections.has(key)) lapSections.delete(key); else lapSections.add(key);
    renderShell();
    return true;
  }
  if (btn.matches('[data-lap-all]')) {
    lapSections = lapSections.size === LAP_SECTIONS.length ? new Set() : new Set(LAP_SECTIONS.map((s) => s.key));
    renderShell();
    return true;
  }
  if (btn.matches('[data-lap-ai]')) { lapRunAi(); return true; }
  if (btn.matches('[data-lap-dl]')) { lapDownload(btn.dataset.lapDl); return true; }
  return false;
}

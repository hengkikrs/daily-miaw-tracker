// Tracker Daily — finance-reports-legacy
// Dipisah dari public/app.js (refactor modular; tidak ada identifier yang di-rename).
// Classic script — urutan load: lihat <script> di public/index.html.
'use strict';


/* ============ MODUL LAPORAN KEUANGAN (rekap kas + budget + tabungan) ============ */
function repMonthKey(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
function repMonths(n) { // n bulan terakhir, tua -> baru
  const out = [];
  const t = new Date();
  for (let i = n - 1; i >= 0; i--) { const d = new Date(t.getFullYear(), t.getMonth() - i, 1); out.push(repMonthKey(d)); }
  return out;
}
function repMonthLabel(key) { const [y, m] = key.split('-'); return `${MONTHS[Number(m) - 1].slice(0, 3)} ${y.slice(2)}`; }
function repSum(list) { return list.reduce((a, t) => a + (Number(t.amount) || 0), 0); }

// seed riwayat kas 6 bulan (sekali) supaya grafik laporan hidup; hanya bulan yang benar-benar kosong
function ensureRepHistory() {
  if (!Array.isArray(state.transactions)) state.transactions = [];
  if (state.repHistSeeded) return;
  state.repHistSeeded = true;
  const now = new Date();
  const has = new Set(txList().map((t) => (t.date || '').slice(0, 7)));
  const rnd = (seed) => { let x = seed; return () => { x = (x * 9301 + 49297) % 233280; return x / 233280; }; };
  for (let back = 1; back <= 5; back++) {
    const d0 = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const key = repMonthKey(d0);
    if (has.has(key)) continue;
    const dim = new Date(d0.getFullYear(), d0.getMonth() + 1, 0).getDate();
    const R = rnd(back * 7919);
    const iso = (day) => key + '-' + String(Math.max(1, Math.min(dim, day))).padStart(2, '0');
    const push = (day, type, amount, cat, note) => state.transactions.push({ id: uid('tx'), type, amount, cat, note, date: iso(day), ts: new Date(d0.getFullYear(), d0.getMonth(), Math.max(1, Math.min(dim, day))).getTime(), hist: true });
    push(Math.min(5, dim), 'in', 2500000 + Math.round(R() * 800) * 1000, 'Gaji', 'Gaji bulanan');
    if (R() > 0.55) push(Math.min(18, dim), 'in', 400000 + Math.round(R() * 900) * 1000, 'Jual Barang', 'Proyek / preloved');
    if (R() > 0.8) push(Math.min(24, dim), 'in', 150000 + Math.round(R() * 400) * 500, 'Lainnya', 'Cashback & hadiah');
    push(Math.min(2, dim), 'out', 400000 + Math.round(R() * 90) * 1000, 'Tagihan', 'Listrik + internet');
    push(Math.min(10, dim), 'out', 550000 + Math.round(R() * 300) * 1000, 'Belanja', 'Belanja bulanan');
    const nFood = 8 + Math.floor(R() * 5);
    for (let i = 0; i < nFood; i++) push(Math.floor(R() * dim) + 1, 'out', 15000 + Math.round(R() * 70) * 1000, 'Makanan', 'Makan harian');
    const nTr = 4 + Math.floor(R() * 3);
    for (let i = 0; i < nTr; i++) push(Math.floor(R() * dim) + 1, 'out', 20000 + Math.round(R() * 40) * 1000, 'Transportasi', 'Bensin / parkir');
    const nFun = 2 + Math.floor(R() * 3);
    for (let i = 0; i < nFun; i++) push(Math.floor(R() * dim) + 1, 'out', 25000 + Math.round(R() * 75) * 1000, 'Hiburan', 'Kopi / nonton');
    if (R() > 0.6) push(Math.floor(R() * dim) + 1, 'out', 50000 + Math.round(R() * 150) * 1000, 'Kesehatan', 'Vitamin / apotek');
    if (R() > 0.75) push(Math.floor(R() * dim) + 1, 'out', 100000 + Math.round(R() * 200) * 1000, 'Pendidikan', 'Buku / kursus');
  }
  state.transactions.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  saveState();
}

function repFlow(months) {
  return months.map((m) => {
    const txs = txList().filter((t) => (t.date || '').slice(0, 7) === m);
    const inc = repSum(txs.filter((t) => t.type === 'in'));
    const exp = repSum(txs.filter((t) => t.type === 'out'));
    return { m, inc, exp, net: inc - exp, count: txs.length };
  });
}
function repSpendByCat(monthKey) {
  const map = new Map();
  txList().filter((t) => t.type === 'out' && (t.date || '').slice(0, 7) === monthKey)
    .forEach((t) => map.set(t.cat || 'Lainnya', (map.get(t.cat || 'Lainnya') || 0) + (Number(t.amount) || 0)));
  return [...map.entries()].map(([cat, amt]) => ({ cat, amt })).sort((a, b) => b.amt - a.amt);
}

function repBarChartSvg(flows, W, H) {
  const max = Math.max(1, ...flows.flatMap((f) => [f.inc, f.exp]));
  const pad = { l: 8, r: 8, t: 18, b: 22 };
  const gw = (W - pad.l - pad.r) / flows.length;
  const bw = Math.min(16, gw * 0.28);
  let bars = '';
  let netPts = [];
  flows.forEach((f, i) => {
    const cx = pad.l + gw * i + gw / 2;
    const hi = Math.max(2, (f.inc / max) * (H - pad.t - pad.b));
    const ho = Math.max(2, (f.exp / max) * (H - pad.t - pad.b));
    bars += `<rect x="${(cx - bw - 2).toFixed(1)}" y="${(H - pad.b - hi).toFixed(1)}" width="${bw.toFixed(1)}" height="${hi.toFixed(1)}" rx="3" fill="var(--green)"><title>Masuk ${txRp(f.inc)}</title></rect>`;
    bars += `<rect x="${(cx + 2).toFixed(1)}" y="${(H - pad.b - ho).toFixed(1)}" width="${bw.toFixed(1)}" height="${ho.toFixed(1)}" rx="3" fill="var(--orange)"><title>Keluar ${txRp(f.exp)}</title></rect>`;
    const ny = H - pad.b - Math.max(0, Math.min(1, (f.net + max * 0.15) / (max * 1.15))) * (H - pad.t - pad.b);
    netPts.push([cx, ny]);
    bars += `<text x="${cx}" y="${H - 7}" text-anchor="middle" font-size="9.5" fill="var(--muted)">${repMonthLabel(f.m)}</text>`;
  });
  const path = netPts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const dots = netPts.map(([x, y], i) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="var(--text)"><title>Net ${txRp(flows[i].net)}</title></circle>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="rep-svg" role="img" aria-label="Grafik kasflow 6 bulan">${bars}<path d="${path}" fill="none" stroke="var(--text)" stroke-width="1.6" stroke-dasharray="3 3" opacity=".55"/>${dots}</svg>`;
}
function repDonutSvg(items, total) {
  const COL = chartPalette(9);
  const R = 52, C = 2 * Math.PI * R;
  let acc = 0;
  const arcs = items.map((it, i) => {
    const frac = total > 0 ? it.amt / total : 0;
    const seg = `<circle cx="70" cy="70" r="${R}" fill="none" stroke="${COL[i % COL.length]}" stroke-width="17" stroke-dasharray="${(frac * C - 1.5).toFixed(2)} ${C.toFixed(2)}" stroke-dashoffset="${(-acc * C).toFixed(2)}" transform="rotate(-90 70 70)" stroke-linecap="round"><title>${escapeHtml(it.cat)} ${txRp(it.amt)}</title></circle>`;
    acc += frac;
    return seg;
  }).join('');
  return `<svg viewBox="0 0 140 140" class="rep-donut" role="img" aria-label="Donut pengeluaran per kategori"><circle cx="70" cy="70" r="${R}" fill="none" stroke="var(--panel-soft)" stroke-width="17"/>${arcs}<text x="70" y="66" text-anchor="middle" font-size="10" fill="var(--muted)">Total</text><text x="70" y="82" text-anchor="middle" font-size="13.5" font-weight="700" fill="var(--text)">${total >= 1e6 ? (total / 1e6).toFixed(1).replace('.', ',') + ' jt' : Math.round(total / 1000) + ' rb'}</text></svg>`;
}

function renderReportView() {
  ensureRepHistory();
  const months = repMonths(6);
  const cur = months[months.length - 1];
  const flows = repFlow(months);
  const fCur = flows[flows.length - 1];
  const fPrev = flows.length > 1 ? flows[flows.length - 2] : null;
  const balance = repSum(txList().filter((t) => t.type === 'in')) - repSum(txList().filter((t) => t.type === 'out'));
  const savedTotal = saveList().reduce((a, s) => a + (Number(s.balance) || 0), 0);
  const netWorth = balance + savedTotal;
  const rate = fCur.inc > 0 ? (fCur.net / fCur.inc) * 100 : 0;
  const expDelta = fPrev && fPrev.exp > 0 ? ((fCur.exp - fPrev.exp) / fPrev.exp) * 100 : null;
  const cats = repSpendByCat(cur);
  const catTotal = repSum(cats.map((c) => ({ amount: c.amt })));
  // budget bulan aktif
  const buds = budList().filter((b) => b.period === cur);
  const budSum = buds.reduce((a, b) => a + (Number(b.amount) || 0), 0);
  const budRows = buds.map((b) => ({ b, c: budCalc(b) })).sort((x, y) => y.c.pct - x.c.pct);
  const budOver = budRows.filter((r) => r.c.status === 'over');
  // tabungan
  const svActive = saveList().filter((s) => !s.archived && s.balance < s.target);
  const svDone = saveList().filter((s) => !s.archived && s.balance >= s.target);
  // outlook: rata2 pengeluaran 3 bulan -> proyeksi bulan depan, dana darurat cover
  const recent3 = flows.slice(-4, -1).filter((f) => f.count > 0);
  const avgExp = recent3.length ? repSum(recent3.map((f) => ({ amount: f.exp }))) / recent3.length : fCur.exp;
  const ddMonths = avgExp > 0 ? savedTotal / avgExp : 0;
  const nextBudgetGap = budSum > 0 ? budSum - fCur.exp : null;
  const svDue = svActive.filter((s) => s.deadline && saveDaysLeft(s.deadline) > 0)
    .map((s) => ({ s, left: saveCalc(s).left, dl: saveDaysLeft(s.deadline) })).filter((x) => x.left > 0)
    .sort((a, b) => (a.left / a.dl) - (b.left / b.dl));
  const pctTxt = (n) => (n >= 0 ? '+' : '') + n.toFixed(0) + '%';
  return `<div class="rep-page">
    <div class="panel rep-hero">
      <div class="rep-hero-top"><h2>📊 Kondisi Finansialmu</h2><small>${repMonthLabel(cur)} · data 6 bulan terakhir</small></div>
      <div class="rep-nums">
        <div><span>Saldo Kas</span><b class="${balance >= 0 ? 'green' : 'coral'}">${txRp(balance)}</b></div>
        <div><span>Nilai Bersih*</span><b>${txRp(netWorth)}</b></div>
        <div><span>Pemasukan</span><b class="green">${txRp(fCur.inc)}</b></div>
        <div><span>Pengeluaran</span><b class="coral">${txRp(fCur.exp)}</b></div>
        <div><span>Sisa Bulan Ini</span><b class="${fCur.net >= 0 ? 'green' : 'coral'}">${txRp(fCur.net)}</b></div>
      </div>
      <div class="rep-chips">
        <span class="rep-chip">💼 Menabung <b class="${rate >= 20 ? 'green' : rate >= 0 ? 'amber' : 'coral'}">${rate.toFixed(0)}%</b> dari pemasukan</span>
        ${expDelta == null ? '' : `<span class="rep-chip">📉 Ekspending vs bulan lalu <b class="${expDelta <= 0 ? 'green' : 'coral'}">${pctTxt(expDelta)}</b></span>`}
        <span class="rep-chip">🪙 Terkumpul di tabungan <b>${txRp(savedTotal)}</b></span>
      </div>
      <p class="rep-fineprint">* Saldo kas + total terkumpul di target tabungan.</p>
    </div>

    <div class="panel rep-card">
      <div class="rep-card-head"><h3>Cashflow 6 Bulan</h3><span class="rep-legend"><i class="lg-in"></i>Masuk <i class="lg-out"></i>Keluar <i class="lg-net"></i>Selisih</span></div>
      ${repBarChartSvg(flows, 640, 210)}
      <div class="rep-flow-nums">${flows.map((f) => `<div><span>${repMonthLabel(f.m)}</span><b class="${f.net >= 0 ? 'green' : 'coral'}">${f.net >= 0 ? '+' : '−'}${saveCompact(Math.abs(f.net))}</b></div>`).join('')}</div>
    </div>

    <div class="rep-two">
      <div class="panel rep-card">
        <div class="rep-card-head"><h3>Spending per Kategori</h3><small>${repMonthLabel(cur)}</small></div>
        ${cats.length === 0 ? '<p class="muted rep-empty-line">Belum ada pengeluaran bulan ini.</p>' : `<div class="rep-donut-wrap">${repDonutSvg(cats, catTotal)}
          <div class="rep-legend-list">${cats.slice(0, 6).map((it, i) => { const COL = chartPalette(9); const share = catTotal ? (it.amt / catTotal) * 100 : 0; return `<div class="rep-lg"><i style="background:${COL[i % COL.length]}"></i><b>${escapeHtml(it.cat)}</b><small>${share.toFixed(0)}%</small><span>${txRp(it.amt)}</span></div>`; }).join('')}</div></div>`}
      </div>
      <div class="panel rep-card">
        <div class="rep-card-head"><h3>🔭 Outlook</h3><small>proyeksi bulan depan</small></div>
        <div class="rep-out">
          <div><span>Perkiraan pengeluaran</span><b>${txRp(Math.round(avgExp / 1000) * 1000)}</b><small>rata-rata ${recent3.length || 1} bln terakhir</small></div>
          ${nextBudgetGap == null ? '' : `<div><span>Pos anggaran tersisa</span><b class="${nextBudgetGap >= 0 ? 'green' : 'coral'}">${txRp(nextBudgetGap)}</b><small>dari pagu ${txRp(budSum)}</small></div>`}
          <div><span>Dana darurat</span><b class="${ddMonths >= 3 ? 'green' : ddMonths >= 1 ? 'amber' : 'coral'}">${ddMonths.toFixed(1)} bln</b><small>cover pengeluaran · target 3–6 bln</small></div>
          ${svDue.length ? `<div><span>Setoran harian</span><b>${txRp(Math.ceil((svDue[0].left / svDue[0].dl) / 1000) * 1000)}/hari</b><small>agar "${escapeHtml(svDue[0].s.name)}" tepat waktu · ${svDue[0].dl} hari lagi</small></div>` : ''}
        </div>
        ${budOver.length ? `<p class="rep-warn">⚠️ ${budOver.length} pos budget melebihi anggaran bulan ini — cek halaman Budget.</p>` : (svActive.length ? `<p class="rep-tip">💡 ${svActive.length} target masih berjalan; setoran rutin ${recent3.length ? txRp(Math.round((recent3.length ? avgExp : fCur.exp) * 0.1 / 1000) * 1000) : 'kecil tapi rutin'}/bln bisa menambah ${saveCompact((recent3.length ? avgExp : fCur.exp) * 0.1)} ke tabungan.</p>` : '')}
      </div>
    </div>

    <div class="panel rep-card">
      <div class="rep-card-head"><h3>🧾 Rekap Budget ${repMonthLabel(cur)}</h3><small>${buds.length} pos · pagu ${txRp(budSum)}</small></div>
      ${budRows.length === 0 ? '<p class="muted rep-empty-line">Belum ada budget untuk bulan ini — buat di halaman Budget.</p>' : budRows.map(({ b, c }) => {
        const cls = c.status === 'over' ? 'over' : c.status === 'warn' ? 'warn' : 'ok';
        return `<div class="rep-row">
          <span class="rep-row-name"><i>${(BUD_CATS.find((x) => x.name === b.cat) || { icon: '📦' }).icon}</i>${escapeHtml(b.name)}</span>
          <div class="rep-row-bar"><span class="rep-rb-${cls}" style="width:${Math.min(100, c.pct).toFixed(1)}%"></span></div>
          <b class="${cls === 'over' ? 'coral' : cls === 'warn' ? 'amber' : ''}">${c.pct.toFixed(0)}%</b>
          <span class="rep-row-amt">${saveCompact(c.spent)}/${saveCompact(b.amount)}</span>
        </div>`; }).join('')}
    </div>

    <div class="panel rep-card">
      <div class="rep-card-head"><h3>🪙 Rekap Tabungan</h3><small>${svActive.length + svDone.length} target aktif/selesai · ${svDone.length} tercapai</small></div>
      ${saveList().length === 0 ? '<p class="muted rep-empty-line">Belum ada target tabungan.</p>' : saveList().map((s) => {
        const c = saveCalc(s);
        return `<div class="rep-row">
          <span class="rep-row-name"><i>${saveCatIcon(s)}</i>${escapeHtml(s.name)}</span>
          <div class="rep-row-bar"><span class="${c.done ? 'rep-rb-done' : c.pct >= 50 ? 'rep-rb-ok' : 'rep-rb-soft'}" style="width:${c.pct.toFixed(1)}%"></span></div>
          <b>${c.pctReal.toFixed(0)}%</b>
          <span class="rep-row-amt">${saveCompact(s.balance)}/${saveCompact(s.target)}</span>
        </div>`; }).join('')}
    </div>

    <div class="panel rep-card">
      <div class="rep-card-head"><h3>Transaksi Terbaru</h3><small>5 terakhir dari kas</small></div>
      ${txList().length === 0 ? '<p class="muted rep-empty-line">Belum ada transaksi.</p>' : [...txList()].sort((a, b) => String(b.date).localeCompare(String(a.date)) || (b.ts || 0) - (a.ts || 0)).slice(0, 5).map((t) => `<div class="rep-txline">
        <span class="rep-tx-ic">${t.type === 'in' ? '↑' : '↓'}</span>
        <div><b>${escapeHtml(t.note || t.cat || 'Transaksi')}</b><small>${budGroupDate(t.date)} · ${escapeHtml(t.cat || 'Umum')}</small></div>
        <span class="${t.type === 'in' ? 'green' : 'coral'}">${t.type === 'in' ? '+' : '−'}${txRp(t.amount)}</span>
      </div>`).join('')}
      <div class="rep-links"><a class="rep-link" data-rep-goto="transaksi">Ke Transaksi →</a><a class="rep-link" data-rep-goto="budget">Ke Budget →</a><a class="rep-link" data-rep-goto="tabungan">Ke Tabungan →</a></div>
    </div>
  </div>`;
}

function handleRepAction(btn) {
  if (btn.matches('[data-rep-goto]')) {
    activeView = btn.dataset.repGoto; state.selectedView = activeView; saveState(); renderShell();
    return true;
  }
  return false;
}

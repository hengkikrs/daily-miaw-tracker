// Tracker Daily — finance-transactions
// Dipisah dari public/app.js (refactor modular; tidak ada identifier yang di-rename).
// Classic script — urutan load: lihat <script> di public/index.html.
'use strict';


/* ============ MODUL TRANSAKSI (kas harian + kalender PnL) ============ */
const TX_CATS_OUT = ['Makanan', 'Transportasi', 'Belanja', 'Tagihan', 'Hiburan', 'Lainnya'];
const TX_CATS_IN = ['Gaji', 'Jual Barang', 'Bonus', 'Hadiah', 'Lainnya'];
let txFilter = 'all';        // daftar: all | in | out
let txMonth = '';            // kalender: 'YYYY-MM' ('' = bulan berjalan)
let txDaySel = '';           // hari terpilih di kalender: 'YYYY-MM-DD' | ''
let txFormType = 'out';      // form aktif: 'in' | 'out'
let txEditingId = null;
let txFormDraft = null;

function txTodayIso() { return txIso(new Date()); }
function txIso(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function txMonthNow() { return txTodayIso().slice(0, 7); }
function txMonthLabel(m) { const [y, mo] = m.split('-').map(Number); return `${MONTHS[mo - 1]} ${y}`; }
function txMonthShift(m, delta) { const [y, mo] = m.split('-').map(Number); const d = new Date(y, mo - 1 + delta, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }

function ensureTxStore() {
  if (!Array.isArray(state.transactions)) { state.transactions = []; }
  if (!state.txSeeded) {
    state.txSeeded = true;
    if (state.transactions.length === 0 && demoSeedEnabled()) { state.transactions = txSeedList(); }
    saveState();
  }
}

function txSeedList() {
  const day = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return txIso(d); };
  return [
    { id: uid('tx'), type: 'out', amount: 22000, note: 'Bubur ayam pagi', cat: 'Makanan', date: day(0), ts: Date.now() - 28800000 },
    { id: uid('tx'), type: 'out', amount: 15000, note: 'Kopi di workspace', cat: 'Hiburan', date: day(0), ts: Date.now() - 18000000 },
    { id: uid('tx'), type: 'in', amount: 150000, note: 'Invoice proyek website', cat: 'Jual Barang', date: day(1), ts: Date.now() - 90000000 },
    { id: uid('tx'), type: 'out', amount: 68000, note: 'Belanja bulanan', cat: 'Belanja', date: day(1), ts: Date.now() - 100000000 },
    { id: uid('tx'), type: 'out', amount: 40000, note: 'Bensin motor', cat: 'Transportasi', date: day(2), ts: Date.now() - 180000000 },
    { id: uid('tx'), type: 'in', amount: 2500000, note: 'Gaji freelancer', cat: 'Gaji', date: day(3), ts: Date.now() - 260000000 },
    { id: uid('tx'), type: 'out', amount: 350000, note: 'Token listrik + internet', cat: 'Tagihan', date: day(4), ts: Date.now() - 350000000 },
    { id: uid('tx'), type: 'out', amount: 30000, note: 'Makan siang', cat: 'Makanan', date: day(5), ts: Date.now() - 435000000 },
    { id: uid('tx'), type: 'in', amount: 75000, note: 'Jual buku kuliah', cat: 'Jual Barang', date: day(8), ts: Date.now() - 700000000 },
    { id: uid('tx'), type: 'out', amount: 120000, note: 'Servis AC', cat: 'Lainnya', date: day(12), ts: Date.now() - 1040000000 },
  ];
}

function txList() { return Array.isArray(state.transactions) ? state.transactions : []; }
function txFind(id) { return txList().find((t) => t.id === id) || null; }

function txParseAmount(raw) {
  let s = String(raw || '').toLowerCase().replace(/\s/g, '');
  let mult = 1;
  if (/(jt|juta)$/.test(s)) { mult = 1000000; s = s.replace(/(jt|juta)$/, ''); }
  else if (/(rb|ribu)$/.test(s)) { mult = 1000; s = s.replace(/(rb|ribu)$/, ''); }
  let t = s.replace(/[^0-9.,]/g, '');
  if (t.includes(',') && t.includes('.')) {
    t = t.replace(/\./g, '').replace(',', '.');
  } else {
    const m = t.match(/^(\d+)([.,])(\d+)$/);
    if (m && m[3].length === 3) t = m[1] + m[3];
    else if (m && m[3].length <= 2) t = `${m[1]}.${m[3]}`;
    else t = t.replace(/[.,]/g, '');
  }
  const n = Math.round(parseFloat(t) * mult);
  return isFinite(n) && n > 0 ? n : 0;
}
function txRp(n) { return `Rp\u00A0${Math.abs(Math.round(n || 0)).toLocaleString('id-ID')}`; }
function txCompact(n) {
  const a = Math.abs(Math.round(n || 0));
  if (a >= 1000000) return `${(a / 1000000).toFixed(a >= 10000000 ? 0 : 1).replace('.', ',')}jt`;
  if (a >= 1000) return `${Math.round(a / 1000)}rb`;
  return String(a);
}
function txByDay(month) {
  const map = {};
  txList().forEach((t) => {
    if (t.date && t.date.startsWith(month)) map[t.date] = (map[t.date] || 0) + (t.type === 'in' ? t.amount : -t.amount);
  });
  return map;
}
function txMonthTotals(month) {
  let inn = 0; let out = 0; let cnt = 0;
  txList().forEach((t) => { if (t.date && t.date.startsWith(month)) { cnt += 1; if (t.type === 'in') inn += t.amount; else out += t.amount; } });
  return { inn, out, net: inn - out, cnt };
}
function txFiltered() {
  let list = txList().filter((t) => {
    if (txFilter !== 'all' && t.type !== txFilter) return false;
    if (txDaySel && t.date !== txDaySel) return false;
    return true;
  });
  return [...list].sort((a, b) => (a.date === b.date ? (b.ts || 0) - (a.ts || 0) : a.date < b.date ? 1 : -1));
}
function txGroupLabel(dateStr) {
  if (dateStr === txTodayIso()) return 'Hari Ini';
  const y = new Date(); y.setDate(y.getDate() - 1);
  if (dateStr === txIso(y)) return 'Kemarin';
  const [yy, mm, dd] = dateStr.split('-').map(Number);
  return `${dd} ${MONTHS[mm - 1]} ${yy}`;
}

function ensureTxFormDefaults() {
  const today = txTodayIso();
  const inCats = txFormType === 'in' ? TX_CATS_IN : TX_CATS_OUT;
  const cat = txFormDraft && inCats.includes(txFormDraft.cat) ? txFormDraft.cat : inCats[0];
  return {
    amount: txFormDraft && txFormDraft.type === txFormType ? txFormDraft.amount : '',
    note: txFormDraft && txFormDraft.type === txFormType ? txFormDraft.note : '',
    date: (txFormDraft && txFormDraft.date) || today,
    cat,
  };
}

function txStatsHtml(month) {
  const tot = txMonthTotals(month);
  const today = txTodayIso();
  let tin = 0; let tout = 0; let tc = 0;
  txList().forEach((t) => { if (t.date === today) { tc += 1; if (t.type === 'in') tin += t.amount; else tout += t.amount; } });
  const netToday = tin - tout;
  const cards = [
    { v: txRp(tot.inn), l: `Masuk · ${txMonthLabel(month)}`, c: 'green', i: '↑' },
    { v: txRp(tot.out), l: `Keluar · ${txMonthLabel(month)}`, c: 'coral', i: '↓' },
    { v: `${tot.net < 0 ? '−' : ''}${txRp(tot.net)}`, l: 'Saldo Bulan Ini', c: tot.net >= 0 ? 'green' : 'coral', i: tot.net >= 0 ? '📈' : '📉' },
    { v: `${netToday < 0 ? '−' : '+'}${txRp(netToday)}`, l: `Hari Ini · ${tc} transaksi`, c: netToday >= 0 ? 'green' : 'coral', i: '💸' },
  ];
  return `<div class="tx-stats">${cards.map((c) => `<div class="tx-stat ${c.c}"><span class="tx-stat-ic">${c.i}</span><div><b>${c.v}</b><span>${c.l}</span></div></div>`).join('')}</div>`;
}

function txFormHtml() {
  const d = ensureTxFormDefaults();
  const editing = txEditingId ? txFind(txEditingId) : null;
  const cats = txFormType === 'in' ? TX_CATS_IN : TX_CATS_OUT;
  return `<div class="panel tx-form-card">
    <div class="tx-form-head"><h2>${editing ? '✏️ Edit Transaksi' : '➕ Catat Transaksi'}</h2>
      ${editing ? '<button type="button" class="btn tiny" data-tx-canceledit>Batal</button>' : ''}</div>
    <form id="txForm" class="tx-form">
      <div class="tx-type-toggle" role="group">
        <button type="button" class="tx-type-btn in ${txFormType === 'in' ? 'on' : ''}" data-tx-ftype-btn="in">↑ Masuk</button>
        <button type="button" class="tx-type-btn out ${txFormType === 'out' ? 'on' : ''}" data-tx-ftype-btn="out">↓ Keluar</button>
      </div>
      <div class="tx-form-grid">
        <label class="field"><span>Nominal</span><input name="txAmount" inputmode="numeric" autocomplete="off" placeholder="cth: 50rb / 120.000" value="${escapeHtml(String(d.amount))}" /></label>
        <label class="field"><span>Keterangan</span><input name="txNote" maxlength="80" autocomplete="off" placeholder="cth: makan siang" value="${escapeHtml(String(d.note))}" /></label>
        <label class="field"><span>Kategori</span><select name="txCat">${cats.map((c) => `<option value="${c}" ${c === d.cat ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
        <label class="field"><span>Tanggal</span><input type="date" name="txDate" value="${d.date}" /></label>
      </div>
      <div class="tx-form-actions"><button type="submit" class="btn primary">${editing ? 'Simpan Perubahan' : '+ Tambah Data'}</button></div>
    </form>
  </div>`;
}

function txCalendarHtml(month) {
  const byDay = txByDay(month);
  const [y, mo] = month.split('-').map(Number);
  const days = new Date(y, mo, 0).getDate();
  const firstOffset = (new Date(y, mo - 1, 1).getDay() + 6) % 7;
  const nets = Object.values(byDay);
  const maxAbs = Math.max(100000, ...nets.map((n) => Math.abs(n)));
  const lvl = (n) => { const a = Math.abs(n); if (a === 0) return 0; const r = a / maxAbs; return r < 0.34 ? 1 : r < 0.67 ? 2 : 3; };
  const todayStr = txTodayIso();
  let cells = '';
  for (let i = 0; i < firstOffset; i += 1) cells += '<div class="tx-cel empty"></div>';
  for (let dd = 1; dd <= days; dd += 1) {
    const iso = `${month}-${String(dd).padStart(2, '0')}`;
    const net = byDay[iso];
    const has = typeof net === 'number';
    const cls = has ? (net > 0 ? `ok${lvl(net)}` : net < 0 ? `bad${lvl(net)}` : 'zero') : 'none';
    const sel = txDaySel === iso ? ' sel' : '';
    const isToday = iso === todayStr ? ' today' : '';
    const amt = has && net !== 0 ? `<span class="tx-cel-amt">${net > 0 ? '+' : '−'}${txCompact(net)}</span>` : '<span class="tx-cel-amt dim">·</span>';
    cells += `<button type="button" class="tx-cel ${cls}${sel}${isToday}" data-tx-day="${iso}" title="${dd} ${MONTHS[mo - 1]}${has ? ` — ${net < 0 ? '−' : ''}${txRp(net)}` : ' — belum ada transaksi'}"><b>${dd}</b>${amt}</button>`;
  }
  let best = null; let worst = null;
  Object.entries(byDay).forEach(([dstr, n]) => { if (!best || n > best[1]) best = [dstr, n]; if (!worst || n < worst[1]) worst = [dstr, n]; });
  const profitDays = nets.filter((n) => n > 0).length;
  const lossDays = nets.filter((n) => n < 0).length;
  const isCur = month === txMonthNow();
  return `<div class="panel tx-cal-card">
    <div class="tx-cal-head">
      <h2>📊 Kalender Cashflow</h2>
      <div class="tx-cal-nav">
        <button type="button" class="btn tiny" data-tx-mprev aria-label="Bulan sebelumnya">‹</button>
        <b>${txMonthLabel(month)}</b>
        <button type="button" class="btn tiny" data-tx-mnext aria-label="Bulan berikutnya">›</button>
        ${isCur ? '' : '<button type="button" class="btn tiny" data-tx-mtoday>Bulan ini</button>'}
      </div>
    </div>
    <div class="tx-cal-dow">${['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((d) => `<span>${d}</span>`).join('')}</div>
    <div class="tx-cal-grid">${cells}</div>
    <div class="tx-cal-foot">
      <div class="tx-legend"><span class="tx-lg bad3"></span><span class="tx-lg bad2"></span><span class="tx-lg bad1"></span><span class="rugi">Keluar</span><span class="tx-lg zero"></span><span class="tx-lg ok1"></span><span class="tx-lg ok2"></span><span class="tx-lg ok3"></span><span class="profit">Masuk</span></div>
      <div class="tx-cal-sum">${profitDays} hari masuk · ${lossDays} hari keluar${best && best[1] > 0 ? ` · terbesar ${txGroupLabel(best[0])} <b class="pos">+${txCompact(best[1])}</b>` : ''}${worst && worst[1] < 0 ? ` · terbesar ${txGroupLabel(worst[0])} <b class="neg">−${txCompact(worst[1])}</b>` : ''}</div>
      ${txDaySel ? `<button type="button" class="btn tiny" data-tx-dayclear>✕ Lepas pilihan hari (${txGroupLabel(txDaySel)})</button>` : ''}
    </div>
  </div>`;
}

function txListHtml() {
  const rows = txFiltered();
  const tabs = [['all', 'Semua'], ['in', '↑ Masuk'], ['out', '↓ Keluar']];
  if (!rows.length) {
    return `<div class="panel tx-list-card"><div class="tx-list-head"><h2>🧾 Riwayat Transaksi</h2><div class="tx-tabs">${tabs.map(([k, l]) => `<button type="button" class="tx-tab ${txFilter === k ? 'on' : ''}" data-tx-ftype="${k}">${l}</button>`).join('')}</div></div>
      <div class="tx-empty"><span>💸</span><b>${txList().length ? 'Tidak ada hasil' : 'Belum ada transaksi'}</b>
      <p>${txList().length ? 'Ubah filter atau pilih hari lain di kalender.' : 'Mulai catat uang masuk & keluar pertamamu.'}</p>
      <button type="button" class="btn primary" data-tx-focus>+ Tambah Data</button></div></div>`;
  }
  let html = ''; let lastDate = '';
  rows.forEach((t) => {
    if (t.date !== lastDate) {
      lastDate = t.date;
      const dayNet = txList().filter((x) => x.date === t.date).reduce((s, x) => s + (x.type === 'in' ? x.amount : -x.amount), 0);
      html += `<div class="tx-group-head"><b>${escapeHtml(txGroupLabel(t.date))}</b><span class="${dayNet >= 0 ? 'pos' : 'neg'}">${dayNet >= 0 ? '+' : '−'}${txRp(dayNet)}</span></div>`;
    }
    const isIn = t.type === 'in';
    const time = t.ts ? new Date(t.ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
    html += `<div class="tx-row" data-tx-id="${t.id}">
      <span class="tx-row-ic ${isIn ? 'in' : 'out'}">${isIn ? '↑' : '↓'}</span>
      <div class="tx-row-mid"><b>${escapeHtml(t.note || t.cat || (isIn ? 'Pemasukan' : 'Pengeluaran'))}</b>
        <span>${escapeHtml(t.cat || '')}${time ? ` · ${time}` : ''}</span></div>
      <div class="tx-row-amt ${isIn ? 'pos' : 'neg'}">${isIn ? '+' : '−'}${txRp(t.amount)}</div>
      <div class="tx-row-act">
        <button type="button" class="tx-icobtn" data-tx-edit="${t.id}" title="Edit">✏️</button>
        <button type="button" class="tx-icobtn danger" data-tx-del="${t.id}" title="Hapus">🗑</button>
      </div></div>`;
  });
  return `<div class="panel tx-list-card"><div class="tx-list-head"><h2>🧾 Riwayat Transaksi</h2><div class="tx-tabs">${tabs.map(([k, l]) => `<button type="button" class="tx-tab ${txFilter === k ? 'on' : ''}" data-tx-ftype="${k}">${l}</button>`).join('')}</div></div>${html}</div>`;
}

function renderTxView() {
  const month = txMonth || txMonthNow();
  return `<div class="tx-page">${txStatsHtml(month)}${txFormHtml()}${txCalendarHtml(month)}${txListHtml()}</div>`;
}

function submitTxForm(form) {
  const amount = txParseAmount(form.txAmount.value);
  if (!amount) { showToast('Nominal tidak valid — isi angka, cth: 50rb atau 120.000.'); form.txAmount.focus(); return; }
  const note = form.txNote.value.trim().slice(0, 80);
  const cat = form.txCat.value;
  const date = form.txDate.value || txTodayIso();
  if (date > txTodayIso()) { showToast('Tanggal belum terjadi — pilih hari ini atau sebelumnya.'); return; }
  if (txEditingId) {
    const t = txFind(txEditingId);
    if (t) { t.type = txFormType; t.amount = amount; t.note = note || cat; t.cat = cat; t.date = date; t.ts = t.ts || Date.now(); showToast('Transaksi diperbarui.'); }
    txEditingId = null; txFormDraft = null;
  } else {
    state.transactions = txList().concat([{ id: uid('tx'), type: txFormType, amount, note: note || cat, cat, date, ts: Date.now() }]);
    showToast(txFormType === 'in' ? `Masuk ${txRp(amount)} tercatat ✅` : `Keluar ${txRp(amount)} tercatat ✅`);
    txFormDraft = null;
  }
  saveState();
  renderShell();
}

function handleTxAction(btn) {
  if (btn.matches('[data-tx-ftype]')) { txFilter = btn.dataset.txFtype; renderShell(); return true; }
  if (btn.matches('[data-tx-ftype-btn]')) {
    const form = dom.content.querySelector('#txForm');
    if (form) txFormDraft = { type: txFormType, amount: form.txAmount.value, note: form.txNote.value, cat: form.txCat.value, date: form.txDate.value };
    txFormType = btn.dataset.txFtypeBtn; renderShell();
    const el = dom.content.querySelector('#txForm [name=txAmount]'); if (el) el.focus();
    return true;
  }
  if (btn.matches('[data-tx-mprev]')) { txMonth = txMonthShift(txMonth || txMonthNow(), -1); renderShell(); return true; }
  if (btn.matches('[data-tx-mnext]')) { txMonth = txMonthShift(txMonth || txMonthNow(), 1); renderShell(); return true; }
  if (btn.matches('[data-tx-mtoday]')) { txMonth = txMonthNow(); renderShell(); return true; }
  if (btn.matches('[data-tx-day]')) { const d = btn.dataset.txDay; txDaySel = txDaySel === d ? '' : d; renderShell(); return true; }
  if (btn.matches('[data-tx-dayclear]')) { txDaySel = ''; renderShell(); return true; }
  if (btn.matches('[data-tx-focus]')) {
    const el = dom.content.querySelector('#txForm [name=txAmount]');
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => el.focus(), 350); }
    return true;
  }
  if (btn.matches('[data-tx-canceledit]')) { txEditingId = null; txFormDraft = null; renderShell(); return true; }
  if (btn.matches('[data-tx-edit]')) {
    const t = txFind(btn.dataset.txEdit);
    if (!t) return true;
    txEditingId = t.id; txFormType = t.type;
    txFormDraft = { type: t.type, amount: t.amount, note: t.note, cat: t.cat, date: t.date };
    renderShell();
    const el = dom.content.querySelector('#txForm'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return true;
  }
  if (btn.matches('[data-tx-del]')) {
    const t = txFind(btn.dataset.txDel);
    if (!t) return true;
    if (!window.confirm(`Hapus transaksi "${t.note || t.cat}" (${txRp(t.amount)})?`)) return true;
    state.transactions = txList().filter((x) => x.id !== t.id);
    if (txEditingId === t.id) { txEditingId = null; txFormDraft = null; }
    saveState(); showToast('Transaksi dihapus.'); renderShell();
    return true;
  }
  return false;
}

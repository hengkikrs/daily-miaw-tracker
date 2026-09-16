// Tracker Daily — finance-budget
// Dipisah dari public/app.js (refactor modular; tidak ada identifier yang di-rename).
// Classic script — urutan load: lihat <script> di public/index.html.
'use strict';


/* ============ MODUL BUDGET (finansial: anggaran per kategori) ============ */
const BUD_CATS = [
  { name: 'Kebutuhan Pokok', icon: '🛒' },
  { name: 'Makan & Minum', icon: '🍜' },
  { name: 'Transportasi', icon: '🛵' },
  { name: 'Tagihan', icon: '🧾' },
  { name: 'Hiburan', icon: '🎮' },
  { name: 'Kesehatan', icon: '💊' },
  { name: 'Pendidikan', icon: '📚' },
  { name: 'Tabungan', icon: '🏦' },
  { name: 'Lainnya', icon: '📦' },
];
// pemetaan kategori kas (transaksi) -> kategori budget, agar progress dihitung dari transaksi nyata
const BUD_TX_MAP = {
  'Makanan': 'Makan & Minum',
  'Transportasi': 'Transportasi',
  'Belanja': 'Kebutuhan Pokok',
  'Tagihan': 'Tagihan',
  'Hiburan': 'Hiburan',
  'Kesehatan': 'Kesehatan',
  'Pendidikan': 'Pendidikan',
  'Lainnya': 'Lainnya',
};
let budMonth = '';        // 'YYYY-MM' terpilih ('' = bulan ini)
let budFilter = 'all';    // all | ok | warn | over
let budDetailId = null;   // halaman detail budget
let budFormOpen = false;  // form tambah/edit terbuka
let budEditingId = null;
let budDraft = null;      // { name, cat, amount, note }

function budPeriod() { return budMonth || txMonthNow(); }
function budIcon(cat) { const c = BUD_CATS.find((x) => x.name === cat); return c ? c.icon : '📦'; }
function budMonthLabel(p) { const [y, m] = p.split('-').map(Number); return `${MONTHS[m - 1]} ${y}`; }

function ensureBudStore() {
  ensureTxStore(); // progress budget dihitung dari transaksi kas — pastikan ada datanya
  if (!Array.isArray(state.budgets)) state.budgets = [];
  if (!state.budSeeded) {
    state.budSeeded = true;
    if (state.budgets.length === 0) state.budgets = budSeedList();
    saveState();
  }
}
function budSeedList() {
  const p = txMonthNow();
  return [
    { id: uid('bud'), name: 'Belanja dapur', cat: 'Kebutuhan Pokok', period: p, amount: 600000, note: 'Stok mingguan + bulanan', createdAt: Date.now() - 86400000 * 12 },
    { id: uid('bud'), name: 'Makan harian', cat: 'Makan & Minum', period: p, amount: 900000, note: 'Masak + warkop', createdAt: Date.now() - 86400000 * 12 },
    { id: uid('bud'), name: 'Bensin & parkir', cat: 'Transportasi', period: p, amount: 300000, note: '', createdAt: Date.now() - 86400000 * 10 },
    { id: uid('bud'), name: 'Listrik, internet, pulsa', cat: 'Tagihan', period: p, amount: 450000, note: 'Jatuh tempo tanggal 10', createdAt: Date.now() - 86400000 * 9 },
    { id: uid('bud'), name: 'Nongkrong & langganan', cat: 'Hiburan', period: p, amount: 200000, note: 'Kopi + streaming', createdAt: Date.now() - 86400000 * 8 },
    { id: uid('bud'), name: 'Kesehatan', cat: 'Kesehatan', period: p, amount: 150000, note: 'Vitamin & darurat', createdAt: Date.now() - 86400000 * 7 },
  ];
}
function budList() { return Array.isArray(state.budgets) ? state.budgets : []; }
function budFind(id) { return budList().find((b) => b.id === id) || null; }

// transaksi keluar yang terkait budget: kategori terpetakan + tanggal dalam periode
function budTxFor(cat, period) {
  return txList().filter((t) => t.type === 'out' && t.date && t.date.slice(0, 7) === period && BUD_TX_MAP[t.cat] === cat);
}
function budCalc(b) {
  const txs = budTxFor(b.cat, b.period);
  const spent = txs.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0;
  const status = pct > 100 ? 'over' : pct >= 80 ? 'warn' : 'ok';
  return { spent, pct, status, count: txs.length, left: b.amount - spent };
}
function budStatusText(s) { return s === 'over' ? 'Melebihi Anggaran' : s === 'warn' ? 'Mendekati Batas' : 'Normal'; }
function budProgressHtml(pct, status, cls) {
  const w = Math.min(100, Math.max(0, pct));
  return `<div class="${cls}"><span class="bud-pb-${status}" style="width:${w.toFixed(1)}%"></span></div>`;
}

function renderBudgetView() {
  if (budDetailId) {
    const d = budFind(budDetailId);
    if (d) return renderBudDetail(d);
    budDetailId = null;
  }
  const period = budPeriod();
  const items = budList().filter((b) => b.period === period).map((b) => ({ b, c: budCalc(b) }));
  const total = items.reduce((s, x) => s + x.b.amount, 0);
  const spent = items.reduce((s, x) => s + x.c.spent, 0);
  const pct = total > 0 ? (spent / total) * 100 : 0;
  const status = pct > 100 ? 'over' : pct >= 80 ? 'warn' : 'ok';
  const filtered = items.filter((x) => budFilter === 'all' || (budFilter === 'over' ? x.c.status === 'over' : budFilter === 'warn' ? x.c.status === 'warn' : x.c.status === 'ok'));
  const recentTx = txList().filter((t) => t.type === 'out' && t.date && t.date.slice(0, 7) === period && BUD_TX_MAP[t.cat])
    .sort((a, b) => (b.date + String(b.ts || 0)).localeCompare(a.date + String(a.ts || 0))).slice(0, 5);

  const tabs = [['all', 'Semua'], ['ok', 'Normal'], ['warn', 'Mendekati'], ['over', 'Melebihi']];
  return `<div class="bud-page">
    <div class="panel bud-hero">
      <div class="bud-period">
        <button type="button" class="btn tiny" data-bud-mprev aria-label="Bulan sebelumnya">‹</button>
        <b>${budMonthLabel(period)}</b>
        <button type="button" class="btn tiny" data-bud-mnext aria-label="Bulan berikutnya">›</button>
        ${period === txMonthNow() ? '' : '<button type="button" class="btn tiny" data-bud-mtoday>Bulan ini</button>'}
      </div>
      <div class="bud-nums">
        <div><span>Total Anggaran</span><b>${txRp(total)}</b></div>
        <div><span>Terpakai</span><b class="coral">${txRp(spent)}</b></div>
        <div><span>Sisa</span><b class="${spent > total ? 'coral' : 'green'}">${spent > total ? '−' : ''}${txRp(Math.abs(total - spent))}</b></div>
        <div><span>Penggunaan</span><b class="${status === 'ok' ? 'green' : status === 'warn' ? 'amber' : 'coral'}">${pct.toFixed(0)}%</b></div>
      </div>
      <div class="bud-bar-wrap">${budProgressHtml(pct, status, 'bud-bar bud-bar-lg')}<em>${budStatusText(status)} · ${items.length} pos anggaran</em></div>
      <div class="bud-hero-actions">
        <button type="button" class="btn primary" data-bud-new>+ Tambah Budget</button>
        <button type="button" class="btn" data-bud-newtx>+ Tambah Transaksi</button>
      </div>
    </div>

    ${budFormOpen ? renderBudForm() : ''}
    ${budTxQuickAdd ? budTxFormHtml() : ''}

    <div class="bud-tabs" role="tablist">${tabs.map(([k, l]) => `<button type="button" class="bud-tab ${budFilter === k ? 'on' : ''}" data-bud-filter="${k}">${l}</button>`).join('')}</div>

    ${filtered.length === 0 ? `<div class="panel bud-empty">
      <div class="bud-empty-ic">🗂️</div>
      <h2>${items.length === 0 ? `Belum ada budget untuk ${budMonthLabel(period)}` : 'Tidak ada budget pada filter ini'}</h2>
      <p>Atur batas belanja per kategori, lalu pantau dari sini — angka terpakai dihitung otomatis dari Transaksi kas.</p>
      <div><button type="button" class="btn primary" data-bud-new>+ Tambah Budget</button>${items.length === 0 && budFilter !== 'all' ? '<button type="button" class="btn" data-bud-filter="all">Lihat Semua</button>' : ''}</div>
    </div>` : `<div class="bud-grid">${filtered.map(({ b, c }) => `
      <button type="button" class="panel bud-card ${c.status}" data-bud-open="${b.id}">
        <div class="bud-card-top"><span class="bud-ic">${budIcon(b.cat)}</span><span class="bud-card-name"><b>${escapeHtml(b.name)}</b><small>${b.cat}</small></span><span class="bud-pill ${c.status}">${budStatusText(c.status)}</span></div>
        ${budProgressHtml(c.pct, c.status, 'bud-bar')}
        <div class="bud-card-nums"><span>Tersedia <b>${txRp(b.amount)}</b></span><span>Pakai <b>${txRp(c.spent)}</b></span><span>Sisa <b class="${c.left < 0 ? 'coral' : ''}">${c.left < 0 ? '−' : ''}${txRp(Math.abs(c.left))}</b></span></div>
        <div class="bud-card-foot"><span>${c.count} transaksi</span><span class="${c.status === 'over' ? 'coral' : 'muted'}">${c.pct.toFixed(0)}%</span></div>
      </button>`).join('')}</div>`}

    ${recentTx.length ? `<div class="panel bud-recent">
      <h2>⚡ Transaksi Terbaru <small>yang memengaruhi budget</small></h2>
      ${recentTx.map((t) => `<div class="bud-rtx"><span class="bud-ic sm">${budIcon(BUD_TX_MAP[t.cat])}</span><div><b>${escapeHtml(t.note || t.cat)}</b><small>${budGroupDate(t.date)} · ${t.cat}</small></div><span class="coral">−${txRp(t.amount)}</span></div>`).join('')}
      <button type="button" class="btn tiny" data-bud-gotx>Lihat Semua Transaksi →</button>
    </div>` : ''}
  </div>`;
}

function budGroupDate(iso) {
  if (iso === txIso(new Date())) return 'Hari ini';
  const y = txIso(new Date(Date.now() - 86400000));
  if (iso === y) return 'Kemarin';
  const [mm, dd] = iso.slice(5).split('-');
  return `${Number(dd)} ${MONTHS[Number(mm) - 1].slice(0, 3)}`;
}

function renderBudDetail(b) {
  const c = budCalc(b);
  const txs = budTxFor(b.cat, b.period).sort((a, x) => x.date.localeCompare(a.date));
  const avg = txs.length ? c.spent / txs.length : 0;
  return `<div class="bud-page">
    <button type="button" class="btn tiny bud-back" data-bud-back>← Kembali ke Budget</button>
    <div class="panel bud-hero">
      <div class="bud-det-top">
        <span class="bud-ic lg">${budIcon(b.cat)}</span>
        <div><h2>${escapeHtml(b.name)}</h2><small>${b.cat} · ${budMonthLabel(b.period)} <span class="bud-pill ${c.status}">${budStatusText(c.status)}</span></small></div>
      </div>
      ${b.note ? `<p class="bud-det-note">📝 ${escapeHtml(b.note)}</p>` : ''}
      <div class="bud-nums">
        <div><span>Anggaran</span><b>${txRp(b.amount)}</b></div>
        <div><span>Terpakai</span><b class="coral">${txRp(c.spent)}</b></div>
        <div><span>Sisa</span><b class="${c.left < 0 ? 'coral' : 'green'}">${c.left < 0 ? '−' : ''}${txRp(Math.abs(c.left))}</b></div>
        <div><span>Penggunaan</span><b class="${c.status === 'ok' ? 'green' : c.status === 'warn' ? 'amber' : 'coral'}">${c.pct.toFixed(0)}%</b></div>
      </div>
      <div class="bud-bar-wrap">${budProgressHtml(c.pct, c.status, 'bud-bar bud-bar-lg')}<em>Rata-rata ${txRp(avg)} per transaksi · ${c.count} transaksi</em></div>
      <div class="bud-hero-actions">
        <button type="button" class="btn primary" data-bud-edit="${b.id}">✏️ Edit Budget</button>
        <button type="button" class="btn danger" data-bud-del="${b.id}">🗑 Hapus</button>
      </div>
    </div>
    <div class="panel bud-det-tx">
      <h2>Transaksi Terkait <small>kategori ${b.cat} · ${budMonthLabel(b.period)}</small></h2>
      ${txs.length === 0 ? '<p class="muted">Belum ada transaksi kas yang tercatat untuk kategori ini. Tambahkan lewat menu Transaksi.</p>' : txs.map((t) => `<div class="bud-rtx"><span class="bud-ic sm">↓</span><div><b>${escapeHtml(t.note || t.cat)}</b><small>${budGroupDate(t.date)} · ${t.cat}</small></div><span class="coral">−${txRp(t.amount)}</span></div>`).join('')}
    </div>
  </div>`;
}

function renderBudForm() {
  const editing = budEditingId ? budFind(budEditingId) : null;
  const d = budDraft || (editing ? { name: editing.name, cat: editing.cat, amount: String(editing.amount), note: editing.note || '' } : { name: '', cat: BUD_CATS[0].name, amount: '', note: '' });
  return `<form id="budForm" class="panel bud-form" novalidate>
    <h2>${editing ? '✏️ Edit Budget' : '➕ Tambah Budget'}</h2>
    <div class="tx-form-grid">
      <label class="field"><span>Nama Budget</span><input name="budName" value="${escapeHtml(d.name)}" placeholder="mis. Makan harian" maxlength="60" required></label>
      <label class="field"><span>Kategori</span><select name="budCat">${BUD_CATS.map((x) => `<option value="${x.name}" ${x.name === d.cat ? 'selected' : ''}>${x.icon} ${x.name}</option>`).join('')}</select></label>
      <label class="field"><span>Periode</span><input value="${budMonthLabel(budPeriod())}" disabled></label>
      <label class="field"><span>Jumlah Anggaran (Rp)</span><input name="budAmount" inputmode="numeric" value="${escapeHtml(d.amount)}" placeholder="mis. 500rb" required></label>
      <label class="field bud-field-wide"><span>Catatan <small>opsional</small></span><input name="budNote" value="${escapeHtml(d.note)}" maxlength="120" placeholder="mis. jatuh tempo tanggal 10"></label>
    </div>
    <div class="tx-form-actions">
      <button type="submit" class="btn primary">${editing ? 'Simpan Perubahan' : 'Tambah Budget'}</button>
      <button type="button" class="btn" data-bud-cancelform>Batal</button>
    </div>
  </form>`;
}

function budDraftFrom(form) {
  return { name: form.budName.value, cat: form.budCat.value, amount: form.budAmount.value, note: form.budNote.value };
}

function submitBudForm(form) {
  const draft = budDraftFrom(form);
  const amount = txParseAmount(draft.amount);
  if (!draft.name.trim()) { showToast('Nama budget wajib diisi.', true); return; }
  if (!(amount > 0)) { showToast('Jumlah anggaran tidak valid. Contoh: 500rb atau 1,5jt.', true); return; }
  if (budEditingId) {
    state.budgets = budList().map((b) => (b.id === budEditingId ? { ...b, name: draft.name.trim(), cat: draft.cat, amount, note: draft.note.trim() } : b));
    showToast('Budget diperbarui.');
    budEditingId = null; budDraft = null;
  } else {
    state.budgets.push({ id: uid('bud'), name: draft.name.trim(), cat: draft.cat, period: budPeriod(), amount, note: draft.note.trim(), createdAt: Date.now() });
    showToast(`Budget "${draft.name.trim()}" ditambahkan.`);
    budDraft = null;
  }
  budFormOpen = false;
  saveState(); renderShell();
}

function handleBudAction(btn) {
  if (btn.matches('[data-bud-mprev]')) { budMonth = txMonthShift(budPeriod(), -1); renderShell(); return true; }
  if (btn.matches('[data-bud-mnext]')) { budMonth = txMonthShift(budPeriod(), 1); renderShell(); return true; }
  if (btn.matches('[data-bud-mtoday]')) { budMonth = ''; renderShell(); return true; }
  if (btn.matches('[data-bud-filter]')) { budFilter = btn.dataset.budFilter; renderShell(); return true; }
  if (btn.matches('[data-bud-open]')) { budDetailId = btn.dataset.budOpen; budFormOpen = false; renderShell(); return true; }
  if (btn.matches('[data-bud-back]')) { budDetailId = null; renderShell(); return true; }
  if (btn.matches('[data-bud-new]')) {
    budFormOpen = true; budEditingId = null; budDraft = budDraft || { name: '', cat: BUD_CATS[0].name, amount: '', note: '' };
    budDetailId = null; renderShell();
    const el = dom.content.querySelector('#budForm [name=budName]'); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => el.focus(), 350); }
    return true;
  }
  if (btn.matches('[data-bud-cancelform]')) { budFormOpen = false; budEditingId = null; budDraft = null; renderShell(); return true; }
  if (btn.matches('[data-bud-edit]')) {
    const b = budFind(btn.dataset.budEdit);
    if (!b) return true;
    budEditingId = b.id; budFormOpen = true; budDetailId = null; budDraft = null;
    renderShell();
    dom.content.querySelector('#budForm')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return true;
  }
  if (btn.matches('[data-bud-del]')) {
    const b = budFind(btn.dataset.budDel);
    if (!b) return true;
    if (!window.confirm(`Hapus budget "${b.name}" (${txRp(b.amount)})?`)) return true;
    state.budgets = budList().filter((x) => x.id !== b.id);
    budDetailId = null; budEditingId = null; budFormOpen = false; budDraft = null;
    saveState(); showToast('Budget dihapus.'); renderShell();
    return true;
  }
  if (btn.matches('[data-bud-newtx]')) {
    budTxQuickAdd = !budTxQuickAdd;
    if (budTxQuickAdd) budFormOpen = false;
    renderShell();
    if (budTxQuickAdd) dom.content.querySelector('#budTxForm')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return true;
  }
  if (btn.matches('[data-bud-cancelform2]')) { budTxQuickAdd = false; renderShell(); return true; }
  if (btn.matches('[data-bud-gotx]')) { activeView = 'transaksi'; state.selectedView = 'transaksi'; saveState(); renderShell(); return true; }
  return false;
}
let budTxQuickAdd = false;

function budTxFormHtml() {
  const cats = BUD_CATS.filter((c) => budList().some((b) => b.cat === c.name && b.period === budPeriod()));
  const list = cats.length ? cats : BUD_CATS.slice(0, 5);
  return `<form id="budTxForm" class="panel bud-form" novalidate>
    <h2>➕ Tambah Transaksi Keluar <small>langsung masuk ke anggaran kategori</small></h2>
    <div class="tx-form-grid">
      <label class="field"><span>Keterangan</span><input name="qtxNote" placeholder="mis. belanja sayur" maxlength="80"></label>
      <label class="field"><span>Jumlah (Rp)</span><input name="qtxAmount" inputmode="numeric" placeholder="mis. 35rb" required></label>
      <label class="field"><span>Kategori Budget</span><select name="qtxCat">${list.map((x) => `<option value="${x.name}">${x.icon} ${x.name}</option>`).join('')}</select></label>
      <label class="field"><span>Tanggal</span><input type="date" name="qtxDate" value="${txIso(new Date())}"></label>
    </div>
    <div class="tx-form-actions"><button type="submit" class="btn primary">Simpan Transaksi</button><button type="button" class="btn" data-bud-cancelform2>Batal</button></div>
  </form>`;
}

function submitBudTxForm(form) {
  const amount = txParseAmount(form.qtxAmount.value);
  if (!(amount > 0)) { showToast('Jumlah tidak valid. Contoh: 35rb.', true); return; }
  const cat = form.qtxCat.value;
  const invMap = Object.fromEntries(Object.entries(BUD_TX_MAP).map(([k, v]) => [v, k]));
  if (!Array.isArray(state.transactions)) state.transactions = [];
  state.transactions.push({ id: uid('tx'), type: 'out', amount, note: form.qtxNote.value.trim() || cat, cat: invMap[cat] || 'Lainnya', date: form.qtxDate.value || txIso(new Date()), ts: Date.now() });
  budTxQuickAdd = false;
  saveState(); showToast('Transaksi dicatat & budget diperbarui.'); renderShell();
}

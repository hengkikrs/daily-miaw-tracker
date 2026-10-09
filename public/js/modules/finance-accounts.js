// Tracker Daily — finance-accounts
// Fitur Akun (Finance): pos penyimpanan uang (Tunai, Bank, e-wallet, dll).
// Classic script — urutan load: lihat <script> di public/index.html.
// Desain:
//  - Sub-store baru `state.accounts` (di dalam miaw-tracker.state.v1 → ikut scopedKey + remote sync).
//  - Saldo akun SELALU dihitung (saldo awal + masuk − keluar), tidak pernah disimpan → tidak bisa double-count.
//  - Transfer = SATU record transaksi { type:'transfer', fromAcc, toAcc } → atomik by construction,
//    tidak dihitung sebagai pemasukan/pengeluaran eksternal.
//  - Akun yang punya transaksi tidak bisa dihapus permanen (hanya dinonaktifkan) → riwayat aman.
'use strict';

const ACC_TYPES = [
  { key: 'tunai', label: 'Tunai', icon: '💵' },
  { key: 'bank', label: 'Bank', icon: '🏦' },
  { key: 'ewallet', label: 'E-Wallet', icon: '📱' },
  { key: 'lainnya', label: 'Lainnya', icon: '📦' },
];
let accFormOpen = false;
let accEditingId = null;
let accDetailId = null;
let accTransferOpen = false;
let accFormBusy = false;   // anti klik-ganda
let accTransferBusy = false; // anti klik-ganda

function accTypeMeta(key) { return ACC_TYPES.find((x) => x.key === key) || ACC_TYPES[3]; }

function ensureAccStore() {
  if (!Array.isArray(state.accounts)) state.accounts = [];
}

function accList() { return Array.isArray(state.accounts) ? state.accounts : []; }
function accActiveList() { return accList().filter((a) => !a.inactive); }
function accFind(id) { return accList().find((a) => a.id === id) || null; }

// Semua transaksi yang menyentuh akun (in/out berdasar accId, transfer berdasar fromAcc/toAcc)
function accTxsFor(id) {
  return txList().filter((t) => t.accId === id
    || (t.type === 'transfer' && (t.fromAcc === id || t.toAcc === id)));
}
function accHasTxs(id) { return accTxsFor(id).length > 0; }

// Saldo akun = saldo awal + total masuk − total keluar; transfer keluar/masuk ikut dihitung sekali.
function accBalance(id) {
  let bal = 0;
  const acc = accFind(id);
  if (acc) bal += Number(acc.opening) || 0;
  txList().forEach((t) => {
    if (t.type === 'transfer') {
      if (t.fromAcc === id) bal -= Number(t.amount) || 0;
      if (t.toAcc === id) bal += Number(t.amount) || 0;
      return;
    }
    if (t.accId !== id) return;
    if (t.type === 'in') bal += Number(t.amount) || 0;
    else if (t.type === 'out') bal -= Number(t.amount) || 0;
  });
  return bal;
}
function accTotalBalance() { return accList().reduce((s, a) => s + accBalance(a.id), 0); }

function accName(id) { const a = accFind(id); return a ? a.name : ''; }

function accOptionsHtml(selectedId, opts) {
  const o = opts || {};
  const list = o.includeInactive ? accList() : accActiveList();
  if (!list.length) return '';
  return list.map((a) => `<option value="${a.id}" ${a.id === selectedId ? 'selected' : ''}>${accTypeMeta(a.type).icon} ${escapeHtml(a.name)}</option>`).join('');
}

/* ============ HALAMAN AKUN ============ */

function accStatsHtml() {
  const total = accTotalBalance();
  const active = accActiveList().length;
  const cards = [
    { v: `${total < 0 ? '−' : ''}${txRp(total)}`, l: 'Total Saldo Semua Akun', c: total >= 0 ? 'green' : 'coral', i: '💰' },
    { v: String(accList().length), l: 'Akun Terdaftar', c: '', i: '🗂️' },
    { v: String(active), l: 'Akun Aktif', c: 'green', i: '✅' },
    { v: String(accList().length - active), l: 'Akun Nonaktif', c: 'coral', i: '🚫' },
  ];
  return `<div class="tx-stats">${cards.map((c) => `<div class="tx-stat ${c.c}"><span class="tx-stat-ic">${c.i}</span><div><b>${c.v}</b><span>${c.l}</span></div></div>`).join('')}</div>`;
}

function accFormHtml() {
  const editing = accEditingId ? accFind(accEditingId) : null;
  const name = editing ? editing.name : '';
  const type = editing ? editing.type : 'tunai';
  const opening = editing ? String(editing.opening || 0) : '';
  const inactive = editing ? !!editing.inactive : false;
  return `<form id="accForm" class="panel acc-form" novalidate>
    <h2>${editing ? '✏️ Edit Akun' : '➕ Tambah Akun'}</h2>
    <div class="tx-form-grid">
      <label class="field"><span>Nama Akun</span><input name="accName" maxlength="40" autocomplete="off" placeholder="cth: Tunai, Bank BRI, DANA" value="${escapeHtml(name)}"></label>
      <label class="field"><span>Jenis Akun</span><select name="accType">${ACC_TYPES.map((x) => `<option value="${x.key}" ${x.key === type ? 'selected' : ''}>${x.icon} ${x.label}</option>`).join('')}</select></label>
      <label class="field"><span>Saldo Awal (Rp)</span><input name="accOpening" inputmode="numeric" autocomplete="off" placeholder="cth: 100rb" value="${escapeHtml(opening)}"></label>
      ${editing ? `<label class="field"><span>Status</span><select name="accInactive"><option value="" ${!inactive ? 'selected' : ''}>Aktif</option><option value="1" ${inactive ? 'selected' : ''}>Nonaktif</option></select></label>` : ''}
    </div>
    <div class="tx-form-actions">
      <button type="submit" class="btn primary">${editing ? 'Simpan Perubahan' : 'Tambah Akun'}</button>
      <button type="button" class="btn" data-acc-cancelform>Batal</button>
    </div>
  </form>`;
}

function accTransferHtml() {
  const active = accActiveList();
  if (active.length < 2) return '';
  return `<form id="accTransferForm" class="panel acc-form" novalidate>
    <h2>🔁 Transfer Antar-Akun <small>tidak dihitung sebagai masuk/keluar</small></h2>
    <div class="tx-form-grid">
      <label class="field"><span>Dari Akun</span><select name="trFrom">${accOptionsHtml('', {})}</select></label>
      <label class="field"><span>Ke Akun</span><select name="trTo">${accOptionsHtml(active[1] ? active[1].id : '', {})}</select></label>
      <label class="field"><span>Nominal (Rp)</span><input name="trAmount" inputmode="numeric" autocomplete="off" placeholder="cth: 50rb"></label>
      <label class="field"><span>Catatan <small>opsional</small></span><input name="trNote" maxlength="60" placeholder="cth: isi ulang DANA"></label>
    </div>
    <div class="tx-form-actions">
      <button type="submit" class="btn primary">Transfer</button>
      <button type="button" class="btn" data-acc-canceltransfer>Batal</button>
    </div>
  </form>`;
}

function accListHtml() {
  const list = [...accList()].sort((a, b) => Number(!!a.inactive) - Number(!!b.inactive) || (b.createdAt || 0) - (a.createdAt || 0));
  if (!list.length) {
    return `<div class="panel acc-list-card"><div class="tx-empty"><span>🏦</span><b>Belum ada akun</b>
      <p>Buat akun untuk memisahkan uang Tunai, Bank, dan e-wallet — lalu pilih akun saat mencatat transaksi.</p>
      <button type="button" class="btn primary" data-acc-new>+ Tambah Akun</button></div></div>`;
  }
  const rows = list.map((a) => {
    const bal = accBalance(a.id);
    const meta = accTypeMeta(a.type);
    const nTx = accTxsFor(a.id).length;
    const canDelete = !accHasTxs(a.id);
    return `<div class="acc-row ${a.inactive ? 'acc-off' : ''}">
      <span class="acc-row-ic">${meta.icon}</span>
      <div class="acc-row-mid"><b>${escapeHtml(a.name)}</b>
        <span>${meta.label} · Saldo awal ${txRp(a.opening || 0)}${nTx ? ` · ${nTx} transaksi` : ' · belum ada transaksi'}</span></div>
      <div class="acc-row-bal ${bal < 0 ? 'neg' : ''}">${txRp(bal)}</div>
      <div class="acc-row-act">
        <button type="button" class="tx-icobtn" data-acc-detail="${a.id}" title="Riwayat">📄</button>
        <button type="button" class="tx-icobtn" data-acc-edit="${a.id}" title="Edit">✏️</button>
        ${canDelete
    ? `<button type="button" class="tx-icobtn danger" data-acc-del="${a.id}" title="Hapus">🗑</button>`
    : `<button type="button" class="tx-icobtn ${a.inactive ? '' : 'warn'}" data-acc-toggle="${a.id}" title="${a.inactive ? 'Aktifkan' : 'Nonaktifkan'}">${a.inactive ? '▶️' : '⏸'}</button>`}
      </div></div>`;
  }).join('');
  return `<div class="panel acc-list-card"><div class="tx-list-head"><h2>🏦 Daftar Akun</h2>
    <div class="acc-list-actions">
      <button type="button" class="btn tiny" data-acc-transfer>🔁 Transfer</button>
      <button type="button" class="btn tiny primary" data-acc-new>+ Tambah Akun</button>
    </div></div>${rows}</div>`;
}

function accDetailHtml(a) {
  const txs = accTxsFor(a.id).sort((x, y) => String(y.date).localeCompare(String(x.date)) || (y.ts || 0) - (x.ts || 0));
  const meta = accTypeMeta(a.type);
  return `<div class="acc-page">
    <button type="button" class="btn tiny bud-back" data-acc-back>← Kembali ke Akun</button>
    <div class="panel">
      <div class="acc-det-top">
        <span class="acc-row-ic lg">${meta.icon}</span>
        <div><h2>${escapeHtml(a.name)}</h2><small>${meta.label} · Saldo awal ${txRp(a.opening || 0)}${a.inactive ? ' · Nonaktif' : ''}</small></div>
        <div class="acc-det-bal ${accBalance(a.id) < 0 ? 'neg' : ''}">${txRp(accBalance(a.id))}</div>
      </div>
    </div>
    <div class="panel acc-list-card">
      <div class="tx-list-head"><h2>🧾 Riwayat Transaksi <small>${txs.length} transaksi</small></h2></div>
      ${txs.length === 0 ? '<p class="muted" style="padding:12px 16px">Belum ada transaksi pada akun ini. Pilih akun ini saat mencatat transaksi di menu Transaksi.</p>'
    : txs.map((t) => {
      const isTr = t.type === 'transfer';
      const isIn = isTr ? t.toAcc === a.id : t.type === 'in';
      const time = t.ts ? new Date(t.ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
      const label = isTr ? (isIn ? `Transfer dari ${accName(t.fromAcc)}` : `Transfer ke ${accName(t.toAcc)}`) : (t.note || t.cat || (isIn ? 'Pemasukan' : 'Pengeluaran'));
      return `<div class="tx-row">
          <span class="tx-row-ic ${isIn ? 'in' : 'out'}">${isIn ? '↑' : '↓'}</span>
          <div class="tx-row-mid"><b>${escapeHtml(label)}</b><span>${escapeHtml(isTr ? (t.note || 'Transfer internal') : (t.cat || ''))}${time ? ` · ${time}` : ''} · ${txGroupLabel(t.date)}</span></div>
          <div class="tx-row-amt ${isIn ? 'pos' : 'neg'}">${isIn ? '+' : '−'}${txRp(t.amount)}</div>
        </div>`;
    }).join('')}
    </div>
  </div>`;
}

function renderAccView() {
  if (accDetailId) {
    const a = accFind(accDetailId);
    if (a) return accDetailHtml(a);
    accDetailId = null;
  }
  return `<div class="acc-page">${accStatsHtml()}${accFormOpen ? accFormHtml() : ''}${accTransferOpen ? accTransferHtml() : ''}${accListHtml()}</div>`;
}

/* ============ AKSI ============ */

function accRpParse(raw) { return txParseAmount(raw); }

function submitAccForm(form) {
  if (accFormBusy) return;
  const name = String(form.accName.value || '').trim();
  if (!name) { showToast('Nama akun wajib diisi.', true); form.accName.focus(); return; }
  const openingRaw = String(form.accOpening.value || '').trim();
  const opening = accRpParse(openingRaw);
  // '0'/'0rb' sah (saldo awal nol); invalid = berisi digit yang tak terurai jadi angka positif,
  // atau angka desimal/pecahan yang terpotong jadi 0 (mis. '0,5rb').
  const hasDigits = /[0-9]/.test(openingRaw.replace(/[^0-9]/g, '')) && openingRaw.replace(/[^0-9]/g, '') !== '';
  if (openingRaw && hasDigits && opening === 0 && !/^(0([.,]0+)?|0rb|0ribu|0jt|0juta)$/i.test(openingRaw.replace(/\s/g, ''))) {
    showToast('Saldo awal tidak valid — cth: 100rb atau 250.000.', true);
    if (typeof form.accOpening.focus === 'function') form.accOpening.focus();
    return;
  }
  const type = form.accType.value;
  const inactive = form.accInactive ? form.accInactive.value === '1' : false;
  accFormBusy = true;
  try {
    if (accEditingId) {
      const a = accFind(accEditingId);
      if (!a) { showToast('Akun tidak ditemukan.', true); return; }
      const dup = accList().some((x) => x.id !== a.id && x.name.toLowerCase() === name.toLowerCase());
      if (dup) { showToast(`Akun dengan nama "${name}" sudah ada.`, true); return; }
      a.name = name; a.type = type; a.opening = opening; a.inactive = inactive; a.updatedAt = Date.now();
      showToast('Akun diperbarui.');
      accEditingId = null;
    } else {
      const dup = accList().some((x) => x.name.toLowerCase() === name.toLowerCase());
      if (dup) { showToast(`Akun dengan nama "${name}" sudah ada.`, true); return; }
      state.accounts = accList().concat([{ id: uid('acc'), name, type, opening, inactive: false, createdAt: Date.now(), updatedAt: Date.now() }]);
      showToast(`Akun "${name}" ditambahkan ✅`);
    }
    accFormOpen = false;
    saveState();
    renderShell();
  } finally {
    accFormBusy = false;
  }
}

function submitAccTransfer(form) {
  if (accTransferBusy) return;
  const from = form.trFrom.value;
  const to = form.trTo.value;
  const amount = accRpParse(form.trAmount.value);
  if (from === to) { showToast('Akun asal dan tujuan harus berbeda.', true); return; }
  if (!(amount > 0)) { showToast('Nominal tidak valid — isi angka positif, cth: 50rb atau 120.000.', true); if (typeof form.trAmount.focus === 'function') form.trAmount.focus(); return; }
  // '−5.000' / '-5000' → txParseAmount mengabaikan minus, jadi cek eksplisit nilai mentah.
  if (/-/.test(String(form.trAmount.value || ''))) { showToast('Nominal tidak boleh negatif.', true); return; }
  const fa = accFind(from); const ta = accFind(to);
  if (!fa || !ta) { showToast('Akun tidak ditemukan.', true); return; }
  accTransferBusy = true;
  try {
    // Satu record = satu operasi logis (atomik by construction): fromAcc −amount, toAcc +amount.
    state.transactions = txList().concat([{
      id: uid('tx'), type: 'transfer', amount, fromAcc: from, toAcc: to,
      note: String(form.trNote.value || '').trim().slice(0, 60),
      date: txTodayIso(), ts: Date.now(),
    }]);
    accTransferOpen = false;
    saveState();
    showToast(`Transfer ${txRp(amount)} ke ${ta.name} berhasil ✅`);
    renderShell();
  } finally {
    accTransferBusy = false;
  }
}

function handleAccAction(btn) {
  if (btn.matches('[data-acc-new]')) {
    accFormOpen = true; accEditingId = null; accTransferOpen = false; accDetailId = null;
    renderShell();
    const el = dom.content.querySelector('#accForm [name=accName]');
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => el.focus(), 350); }
    return true;
  }
  if (btn.matches('[data-acc-cancelform]')) { accFormOpen = false; accEditingId = null; renderShell(); return true; }
  if (btn.matches('[data-acc-transfer]')) { accTransferOpen = true; accFormOpen = false; renderShell(); return true; }
  if (btn.matches('[data-acc-canceltransfer]')) { accTransferOpen = false; renderShell(); return true; }
  if (btn.matches('[data-acc-detail]')) { accDetailId = btn.dataset.accDetail; renderShell(); return true; }
  if (btn.matches('[data-acc-back]')) { accDetailId = null; renderShell(); return true; }
  if (btn.matches('[data-acc-edit]')) {
    const a = accFind(btn.dataset.accEdit);
    if (!a) return true;
    accEditingId = a.id; accFormOpen = true; accTransferOpen = false;
    renderShell();
    const el = dom.content.querySelector('#accForm [name=accName]');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return true;
  }
  if (btn.matches('[data-acc-toggle]')) {
    const a = accFind(btn.dataset.accToggle);
    if (!a) return true;
    a.inactive = !a.inactive; a.updatedAt = Date.now();
    saveState();
    showToast(a.inactive ? `Akun "${a.name}" dinonaktifkan — riwayat tetap aman.` : `Akun "${a.name}" aktif kembali.`);
    renderShell();
    return true;
  }
  if (btn.matches('[data-acc-del]')) {
    const a = accFind(btn.dataset.accDel);
    if (!a) return true;
    if (accHasTxs(a.id)) {
      showToast('Akun ini punya transaksi — hanya bisa dinonaktifkan agar riwayat tetap aman.', true);
      return true;
    }
    if (!window.confirm(`Hapus akun "${a.name}"? Akun ini belum punya transaksi.`)) return true;
    state.accounts = accList().filter((x) => x.id !== a.id);
    saveState();
    showToast('Akun dihapus.');
    renderShell();
    return true;
  }
  return false;
}

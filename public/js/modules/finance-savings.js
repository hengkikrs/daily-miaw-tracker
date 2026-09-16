// Tracker Daily — finance-savings
// Dipisah dari public/app.js (refactor modular; tidak ada identifier yang di-rename).
// Classic script — urutan load: lihat <script> di public/index.html.
'use strict';


/* ============ MODUL TABUNGAN (target tabungan + setoran/penarikan) ============ */
const SAVE_CATS = [
  { name: 'Dana Darurat', icon: '🛟' }, { name: 'Keuangan Pribadi', icon: '👛' },
  { name: 'Pendidikan', icon: '🎓' }, { name: 'Kendaraan', icon: '🏍️' },
  { name: 'Rumah', icon: '🏠' }, { name: 'Liburan', icon: '🏝️' },
  { name: 'Bisnis', icon: '💼' }, { name: 'Lainnya', icon: '📦' },
];
const SAVE_ICONS = ['🐱', '🏠', '🚗', '✈️', '🎓', '💻', '📷', '🎸', '🚑', '💍', '🛟', '🌱'];
// Palet warna tabungan (disimpan per item) — keluarga warna hangat.
const SAVE_COLORS = ['#16A34A', '#475569', '#D97706', '#22C55E', '#64748B', '#94A3B8'];
// Warna lama (pra ui61) dipetakan ke palet baru agar data tersimpan tetap senada.
const SAVE_COLOR_LEGACY = {
  '#2e7d5b': '#16A34A', '#4a7fb5': '#475569', '#d99a2b': '#D97706', '#b5567d': '#64748B',
  '#6a5acd': '#94A3B8', '#2e7d4f': '#16A34A', '#2c6e63': '#22C55E', '#3d9a5f': '#16A34A',
  '#3e7b8c': '#475569', '#7d685c': '#64748B', '#b0557a': '#94A3B8', '#7c5cbf': '#94A3B8',
};
function saveColorOf(item) {
  const c = (item && item.color) || SAVE_COLORS[0];
  return SAVE_COLOR_LEGACY[c] || c;
}

let saveFilter = 'all';      // all | aktif | selesai | arsip
let saveDetailId = null;
let saveFormOpen = false;    // form target
let saveEditingId = null;
let saveDraft = null;
let saveTxOpen = false;      // form setoran/penarikan
let saveTxDraft = null;

function ensureSaveStore() {
  if (!Array.isArray(state.savings)) state.savings = [];
  if (!Array.isArray(state.savingsTx)) state.savingsTx = [];
  if (!state.saveSeeded) {
    state.saveSeeded = true;
    if (state.savings.length === 0 && demoSeedEnabled()) seedSavingsDemo();
    saveState();
  }
}
function seedSavingsDemo() {
  const d = (n) => { const t = new Date(); t.setDate(t.getDate() + n); return txIso(t); };
  const now = Date.now();
  state.savings = [
    { id: uid('sv'), name: 'Dana Darurat 6 Bulan', desc: '3x pengeluaran bulanan, untuk PHK/sakit/mendesak.', target: 15000000, balance: 6200000, deadline: d(120), cat: 'Dana Darurat', icon: '🛟', color: '#16A34A', archived: false, createdAt: now - 86400000 * 60 },
    { id: uid('sv'), name: 'Laptop Kerja Baru', desc: 'Upgrade buat rendering & coding, cicil tiap gajian.', target: 12000000, balance: 9450000, deadline: d(45), cat: 'Keuangan Pribadi', icon: '💻', color: '#475569', archived: false, createdAt: now - 86400000 * 90 },
    { id: uid('sv'), name: 'Liburan ke Bali', desc: '4 hari 3 malam buat dua orang, termasuk motor sewaan.', target: 5000000, balance: 1800000, deadline: d(150), cat: 'Liburan', icon: '✈️', color: '#D97706', archived: false, createdAt: now - 86400000 * 30 },
    { id: uid('sv'), name: 'DP Motor', desc: 'Target 30% harga unit, cash biar ringan cicilan.', target: 4200000, balance: 4200000, deadline: '', cat: 'Kendaraan', icon: '🏍️', color: '#64748B', archived: false, createdAt: now - 86400000 * 200 },
    { id: uid('sv'), name: 'Kursus Data Science', desc: 'Beasiswa gagal, bayar sendiri. Sudah selesai ✓', target: 2500000, balance: 2500000, deadline: '', cat: 'Pendidikan', icon: '🎓', color: '#94A3B8', archived: true, createdAt: now - 86400000 * 300 },
  ];
  const sv = state.savings;
  const mk = (si, kind, amt, note, daysAgo, srcTxt) => ({ id: uid('stx'), svId: sv[si].id, kind, amount: amt, note, date: txIso(new Date(now - 86400000 * daysAgo)), source: srcTxt || 'Transfer bank', ts: now - 86400000 * daysAgo * 1000 });
  state.savingsTx = [
    mk(0, 'deposit', 1500000, 'Sisihan gaji bulan ini', 3, 'Rekening utama'),
    mk(0, 'deposit', 1200000, 'Sisihan gaji', 33, 'Rekening utama'),
    mk(0, 'withdraw', 400000, 'Banjir — benerin pompa', 12, 'ATM'),
    mk(0, 'deposit', 1000000, 'Tunjangan proyek', 61, 'E-wallet'),
    mk(0, 'deposit', 1000000, 'Sisihan', 88, 'Rekening utama'),
    mk(0, 'deposit', 900000, 'Sisihan', 116, 'Rekening utama'),
    mk(0, 'deposit', 600000, 'Kemenangan freelance', 140, 'Payout'),
    mk(0, 'deposit', 400000, 'Awal mula', 170, 'Transfer bank'),
    mk(1, 'deposit', 2500000, 'Gaji ke-13', 8, 'Rekening utama'),
    mk(1, 'deposit', 2000000, 'Jual laptop lama', 40, 'COD'),
    mk(1, 'deposit', 1500000, 'Sisihan 2 bulan', 75, 'Rekening utama'),
    mk(1, 'deposit', 1450000, 'Sisihan', 120, 'Rekening utama'),
    mk(1, 'deposit', 2000000, 'BONUS proyek', 160, 'Payout'),
    mk(2, 'deposit', 600000, 'Cicil liburan', 10, 'E-wallet'),
    mk(2, 'deposit', 500000, 'Cicil', 41, 'E-wallet'),
    mk(2, 'deposit', 700000, 'Hasil jual preloved', 70, 'COD'),
    mk(3, 'deposit', 1500000, 'DP dicicil', 90, 'Rekening utama'),
    mk(3, 'deposit', 1200000, 'DP dicicil', 150, 'Rekening utama'),
    mk(3, 'deposit', 1500000, 'DP lunas 🎉', 180, 'Transfer bank'),
    mk(4, 'deposit', 2500000, 'Lunas kursus ✅', 250, 'Rekening utama'),
  ];
  // recalculate balance dari riwayat supaya konsisten
  sv.forEach((s) => { s.balance = state.savingsTx.reduce((acc, t) => acc + (t.svId === s.id ? (t.kind === 'deposit' ? t.amount : -t.amount) : 0), 0); });
}
function saveList() { return Array.isArray(state.savings) ? state.savings : []; }
function saveTxList() { return Array.isArray(state.savingsTx) ? state.savingsTx : []; }
function saveFind(id) { return saveList().find((s) => s.id === id) || null; }
function saveCalc(s) {
  const pct = s.target > 0 ? Math.min(100, (s.balance / s.target) * 100) : 0;
  const pctReal = s.target > 0 ? (s.balance / s.target) * 100 : 0;
  const left = Math.max(0, s.target - s.balance);
  const done = s.balance >= s.target;
  return { pct, pctReal, left, done };
}
function saveDaysLeft(deadline) {
  if (!deadline) return null;
  const ms = new Date(deadline + 'T23:59:59') - Date.now();
  return Math.ceil(ms / 86400000);
}
function saveDeadlineLabel(deadline) {
  if (!deadline) return { text: 'Tanpa deadline', tone: 'muted' };
  const dl = saveDaysLeft(deadline);
  const [mm, dd] = deadline.slice(5).split('-');
  const dateTxt = `${Number(dd)} ${MONTHS[Number(mm) - 1]}`;
  if (dl < 0) return { text: `Lewat ${Math.abs(dl)} hari · ${dateTxt}`, tone: 'coral' };
  if (dl <= 30) return { text: `${dateTxt} · ${dl} hari lagi`, tone: 'amber' };
  return { text: `${dateTxt} · ${dl} hari lagi`, tone: 'muted' };
}
function saveCatIcon(s) { return s.icon || (SAVE_CATS.find((c) => c.name === s.cat) || { icon: '📦' }).icon; }
function saveRp(n) { return txRp(n); }
function saveCompact(n) {
  n = Math.round(Math.abs(n || 0));
  if (n >= 1e9) return (n / 1e9).toFixed(n % 1e9 ? 1 : 0) + ' M';
  if (n >= 1e6) return (n / 1e6).toFixed(n % 1e6 ? 1 : 0).replace('.', ',') + ' jt';
  if (n >= 1e3) return Math.round(n / 1e3) + ' rb';
  return String(n);
}
function saveStatus(s) { const c = saveCalc(s); return s.archived ? 'arsip' : c.done ? 'selesai' : 'aktif'; }
function saveBarHtml(s) {
  const c = saveCalc(s);
  const cls = c.pct >= 100 ? 'sv-pb-done' : c.pct >= 50 ? 'sv-pb-ok' : 'sv-pb-soft';
  return `<div class="sv-bar"><span class="${cls}" style="width:${c.pct.toFixed(1)}%"></span></div>`;
}

function renderSavingsView() {
  if (saveDetailId) {
    const d = saveFind(saveDetailId);
    if (d) return renderSaveDetail(d);
    saveDetailId = null;
  }
  const all = saveList();
  const active = all.filter((s) => saveStatus(s) === 'aktif');
  const totalSaved = all.reduce((a, s) => a + s.balance, 0);
  const totalTarget = all.reduce((a, s) => a + s.target, 0);
  const pctAll = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;
  const filtered = all.filter((s) => saveFilter === 'all' || saveStatus(s) === saveFilter);
  const tabs = [['all', 'Semua'], ['aktif', 'Aktif'], ['selesai', 'Selesai'], ['arsip', 'Diarsipkan']];
  return `<div class="sv-page">
    <div class="panel sv-hero">
      <div class="sv-nums">
        <div><span>💰 Tergumpul</span><b class="green">${txRp(totalSaved)}</b></div>
        <div><span>🎯 Total Target</span><b>${txRp(totalTarget)}</b></div>
        <div><span>📉 Sisa Target</span><b>${txRp(Math.max(0, totalTarget - totalSaved))}</b></div>
        <div><span>📊 Progress</span><b class="${pctAll >= 100 ? 'green' : 'amber'}">${pctAll.toFixed(0)}%</b></div>
        <div><span>🔥 Aktif</span><b>${active.length} target</b></div>
      </div>
      ${saveBarHtml({ balance: totalSaved, target: totalTarget, archived: false })}
      <div class="sv-hero-actions">
        <button type="button" class="btn primary" data-sv-new>+ Tambah Tabungan</button>
        <button type="button" class="btn" data-sv-newtx>+ Tambah Setoran</button>
      </div>
    </div>

    ${saveFormOpen ? renderSvForm() : ''}
    ${saveTxOpen ? renderSvTxForm() : ''}

    <div class="sv-tabs" role="tablist">${tabs.map(([k, l]) => `<button type="button" class="sv-tab ${saveFilter === k ? 'on' : ''}" data-sv-filter="${k}">${l}<small>${k === 'all' ? all.length : all.filter((s) => saveStatus(s) === k).length}</small></button>`).join('')}</div>

    ${filtered.length === 0 ? `<div class="panel sv-empty">
      <div class="sv-empty-ic">🐾</div>
      <h3>${all.length === 0 ? 'Belum ada target tabungan' : 'Kosong di filter ini'}</h3>
      <p>${all.length === 0 ? 'Buat target pertama — dana darurat, laptop baru, atau liburan. Setoran kecil rutin yang dihitung otomatis.' : 'Coba filter lain atau buat target baru.'}</p>
      <div><button type="button" class="btn primary" data-sv-new>+ Tambah Tabungan</button>${all.length > 0 ? '<button type="button" class="btn" data-sv-filter="all">Lihat Semua</button>' : ''}</div>
    </div>` : `<div class="sv-grid">${filtered.map((s) => {
      const c = saveCalc(s);
      const dl = saveDeadlineLabel(s.deadline);
      const st = saveStatus(s);
      return `<button type="button" class="panel sv-card" data-sv-open="${s.id}">
        <div class="sv-card-top">
          <span class="sv-ic" style="background:${saveColorOf(s)}1f">${saveCatIcon(s)}</span>
          <span class="sv-card-name"><b>${escapeHtml(s.name)}</b><small>${s.cat || 'Umum'}</small></span>
          <span class="sv-pill ${st}">${st === 'aktif' ? 'Aktif' : st === 'selesai' ? '✓ Selesai' : 'Arsip'}</span>
        </div>
        ${s.desc ? `<p class="sv-desc">${escapeHtml(s.desc)}</p>` : ''}
        ${saveBarHtml(s)}
        <div class="sv-card-nums">
          <span>Target <b>${txRp(s.target)}</b></span>
          <span>Terkumpul <b class="green">${txRp(s.balance)}</b></span>
          <span>Sisa <b>${c.done ? 'Lunas 🎉' : txRp(c.left)}</b></span>
        </div>
        <div class="sv-card-foot"><span class="${dl.tone}">⏳ ${dl.text}</span><span class="${c.done ? 'green' : 'muted'}">${c.pctReal.toFixed(0)}%</span></div>
      </button>`; }).join('')}</div>`}
  </div>`;
}

function renderSaveDetail(s) {
  const c = saveCalc(s);
  const txs = saveTxList().filter((t) => t.svId === s.id).sort((a, b) => (b.date + String(b.ts || 0)).localeCompare(a.date + String(a.ts || 0)));
  const deposits = txs.filter((t) => t.kind === 'deposit');
  const withdraws = txs.filter((t) => t.kind === 'withdraw');
  const sumDep = deposits.reduce((a, t) => a + t.amount, 0);
  const avg = deposits.length ? sumDep / deposits.length : 0;
  const dl = saveDaysLeft(s.deadline);
  const est = !c.done && dl && dl > 0 ? c.left / dl : null;
  const estMonth = est ? est * 30 : null;
  return `<div class="sv-page">
    <button type="button" class="btn tiny sv-back" data-sv-back>← Kembali ke Tabungan</button>
    <div class="panel sv-hero">
      <div class="sv-det-top">
        <span class="sv-ic lg" style="background:${saveColorOf(s)}1f">${saveCatIcon(s)}</span>
        <div><h2>${escapeHtml(s.name)}</h2><small>${s.cat || 'Umum'} · ${saveStatus(s) === 'aktif' ? 'Aktif' : saveStatus(s) === 'selesai' ? 'Selesai ✓' : 'Diarsipkan'}</small></div>
      </div>
      ${s.desc ? `<p class="sv-det-note">📝 ${escapeHtml(s.desc)}</p>` : ''}
      <div class="sv-nums sv-nums-3">
        <div><span>Target</span><b>${txRp(s.target)}</b></div>
        <div><span>Terkumpul</span><b class="green">${txRp(s.balance)} · ${c.pctReal.toFixed(0)}%</b></div>
        <div><span>Sisa</span><b>${c.done ? 'Lunas 🎉' : txRp(c.left)}</b></div>
      </div>
      ${saveBarHtml(s)}
      <div class="sv-det-meta">
        <span>⏳ ${saveDeadlineLabel(s.deadline).text}</span>
        ${est ? `<span>🧮 Butuh <b>${txRp(Math.ceil(est / 1000) * 1000)}/hari</b> ${saveRp2(estMonth)} × ${dl} hari</span>` : ''}
        ${c.done ? '<span>🎯 Target tercapai — jangan berhenti nabung!</span>' : ''}
      </div>
      <div class="sv-hero-actions">
        <button type="button" class="btn primary" data-sv-deposit="${s.id}">+ Setoran ke Ini</button>
        <button type="button" class="btn" data-sv-edit="${s.id}">✏️ Edit</button>
        <button type="button" class="btn" data-sv-archive="${s.id}">${s.archived ? '↩️ Pulihkan' : '📦 Arsip'}</button>
        <button type="button" class="btn danger" data-sv-del="${s.id}">🗑 Hapus</button>
      </div>
    </div>
    ${saveTxOpen ? renderSvTxForm() : ''}
    <div class="panel sv-det-stats">
      <h3>Statistik Setoran</h3>
      <div class="sv-nums">
        <div><span>Total Setor</span><b class="green">${txRp(sumDep)}</b></div>
        <div><span>Total Tarik</span><b class="coral">${txRp(withdraws.reduce((a, t) => a + t.amount, 0))}</b></div>
        <div><span>Jumlah Setor</span><b>${deposits.length}×</b></div>
        <div><span>Rata-rata</span><b>${txRp(Math.round(avg))}</b></div>
      </div>
    </div>
    <div class="panel sv-det-tx">
      <h3>Riwayat Transaksi <small>${txs.length} catatan</small></h3>
      ${txs.length === 0 ? '<p class="muted">Belum ada setoran. Mulai dengan nominal kecil — yang penting rutin.</p>' : txs.map((t) => `<div class="sv-rtx">
        <span class="sv-ic sm">${t.kind === 'deposit' ? '⬇️' : '⬆️'}</span>
        <div><b>${escapeHtml(t.note || (t.kind === 'deposit' ? 'Setoran' : 'Penarikan'))}</b><small>${budGroupDate(t.date)} · ${escapeHtml(t.source || '—')}</small></div>
        <span class="${t.kind === 'deposit' ? 'green' : 'coral'}">${t.kind === 'deposit' ? '+' : '−'}${txRp(t.amount)}</span>
      </div>`).join('')}
    </div>
  </div>`;
}
function saveRp2(n) { return '≈ ' + txRp(Math.round(n / 1000) * 1000) + '/bln'; }

function renderSvForm() {
  const editing = saveEditingId ? saveFind(saveEditingId) : null;
  const d = saveDraft || (editing ? {
    name: editing.name, desc: editing.desc || '', target: String(editing.target), balance: String(editing.balance),
    deadline: editing.deadline || '', cat: editing.cat || SAVE_CATS[0].name, icon: editing.icon || '', color: editing.color || SAVE_COLORS[0],
  } : { name: '', desc: '', target: '', balance: '', deadline: '', cat: SAVE_CATS[0].name, icon: SAVE_ICONS[0], color: SAVE_COLORS[0] });
  return `<form id="svForm" class="panel sv-form" novalidate>
    <h3>${editing ? '✏️ Edit Tabungan' : '➕ Tambah Tabungan'}</h3>
    <div class="tx-form-grid">
      <label class="field"><span>Nama Target</span><input name="svName" value="${escapeHtml(d.name)}" placeholder="mis. Dana Darurat" maxlength="60" required></label>
      <label class="field"><span>Kategori</span><select name="svCat">${SAVE_CATS.map((x) => `<option value="${x.name}" ${x.name === d.cat ? 'selected' : ''}>${x.icon} ${x.name}</option>`).join('')}</select></label>
      <label class="field"><span>Target Nominal (Rp)</span><input name="svTarget" inputmode="numeric" value="${escapeHtml(d.target)}" placeholder="mis. 15jt" required></label>
      <label class="field"><span>Saldo Awal (Rp)</span><input name="svBalance" inputmode="numeric" value="${escapeHtml(d.balance)}" placeholder="0"></label>
      <label class="field"><span>Deadline <small>opsional</small></span><input type="date" name="svDeadline" value="${escapeHtml(d.deadline)}"></label>
      <label class="field sv-field-wide"><span>Deskripsi <small>opsional</small></span><input name="svDesc" value="${escapeHtml(d.desc)}" maxlength="120" placeholder="satu kalimat tentang target ini"></label>
      <div class="field"><span>Icon</span><div class="sv-picks">${SAVE_ICONS.map((ic) => `<button type="button" class="sv-pick ${ic === d.icon ? 'on' : ''}" data-sv-pick-ic="${ic}">${ic}</button>`).join('')}</div></div>
      <div class="field"><span>Warna</span><div class="sv-picks">${SAVE_COLORS.map((cl) => `<button type="button" class="sv-pick sv-color ${cl === d.color ? 'on' : ''}" style="background:${cl}" data-sv-pick-color="${cl}" aria-label="warna ${cl}"></button>`).join('')}</div></div>
    </div>
    <div class="tx-form-actions">
      <button type="submit" class="btn primary">${editing ? 'Simpan Perubahan' : 'Tambah Tabungan'}</button>
      <button type="button" class="btn" data-sv-cancelform>Batal</button>
    </div>
  </form>`;
}
function svDraftFrom(form) {
  return { name: form.svName.value, desc: form.svDesc.value, target: form.svTarget.value, balance: form.svBalance.value, deadline: form.svDeadline.value, cat: form.svCat.value, icon: form.querySelector('.sv-pick[data-sv-pick-ic].on')?.dataset.svPickIc || SAVE_ICONS[0], color: form.querySelector('.sv-pick[data-sv-pick-color].on')?.dataset.svPickColor || SAVE_COLORS[0] };
}
function submitSvForm(form) {
  const d = svDraftFrom(form);
  const target = txParseAmount(d.target);
  const balance = Math.max(0, txParseAmount(d.balance || '0'));
  if (!d.name.trim()) { showToast('Nama target wajib diisi.', true); return; }
  if (!(target > 0)) { showToast('Target nominal tidak valid. Contoh: 15jt.', true); return; }
  if (balance > target) { showToast('Saldo awal melebihi target — kecilkan dulu.', true); return; }
  if (saveEditingId) {
    const old = saveFind(saveEditingId);
    state.savings = saveList().map((s) => (s.id === saveEditingId ? { ...s, name: d.name.trim(), desc: d.desc.trim(), target, deadline: d.deadline, cat: d.cat, icon: d.icon, color: d.color } : s));
    // kalau saldo awal diedit, catat penyesuaian sebagai setoran/penarikan agar riwayat konsisten
    const nb = balance;
    if (old && nb !== old.balance) {
      const adj = nb - old.balance;
      state.savings = state.savings.map((s) => (s.id === saveEditingId ? { ...s, balance: nb } : s));
      if (adj !== 0) state.savingsTx.push({ id: uid('stx'), svId: saveEditingId, kind: adj > 0 ? 'deposit' : 'withdraw', amount: Math.abs(adj), note: 'Penyesuaian saldo', date: txIso(new Date()), source: 'Manual', ts: Date.now() });
    }
    showToast('Target tabungan diperbarui.');
    saveEditingId = null; saveDraft = null;
  } else {
    state.savings.push({ id: uid('sv'), name: d.name.trim(), desc: d.desc.trim(), target, balance, deadline: d.deadline, cat: d.cat, icon: d.icon, color: d.color, archived: false, createdAt: Date.now() });
    if (balance > 0) state.savingsTx.push({ id: uid('stx'), svId: state.savings[state.savings.length - 1].id, kind: 'deposit', amount: balance, note: 'Saldo awal', date: txIso(new Date()), source: 'Manual', ts: Date.now() });
    showToast(`Target "${d.name.trim()}" dibuat.`);
    saveDraft = null;
  }
  saveFormOpen = false;
  saveState(); renderShell();
}

function renderSvTxForm() {
  const targets = saveList().filter((s) => !s.archived && s.balance < s.target);
  const list = targets.length ? targets : saveList().filter((s) => !s.archived);
  if (list.length === 0) { showToast('Buat target tabungan dulu.', true); saveTxOpen = false; return ''; }
  const d = saveTxDraft || { svId: (list.find((s) => s.id === saveTxPreset) || list[0]).id, kind: 'deposit', amount: '', date: txIso(new Date()), source: 'Transfer bank', note: '' };
  const sv = list.find((x) => x.id === d.svId) || list[0];
  return `<form id="svTxForm" class="panel sv-form" novalidate>
    <h3>💸 Catat Setoran / Penarikan</h3>
    <div class="tx-form-grid">
      <label class="field"><span>Target Tabungan</span><select name="stxSv">${list.map((x) => `<option value="${x.id}" ${x.id === sv.id ? 'selected' : ''}>${saveCatIcon(x)} ${escapeHtml(x.name)} (${saveCompact(x.balance)}/${saveCompact(x.target)})</option>`).join('')}</select></label>
      <label class="field"><span>Jenis</span><select name="stxKind"><option value="deposit" ${d.kind === 'deposit' ? 'selected' : ''}>⬇️ Setoran</option><option value="withdraw" ${d.kind === 'withdraw' ? 'selected' : ''}>⬆️ Penarikan</option></select></label>
      <label class="field"><span>Nominal (Rp)</span><input name="stxAmount" inputmode="numeric" value="${escapeHtml(d.amount)}" placeholder="mis. 500rb" required></label>
      <label class="field"><span>Tanggal</span><input type="date" name="stxDate" value="${escapeHtml(d.date)}"></label>
      <label class="field"><span>Sumber Dana</span><input name="stxSource" value="${escapeHtml(d.source)}" placeholder="mis. Rekening utama" maxlength="40"></label>
      <label class="field"><span>Catatan <small>opsional</small></span><input name="stxNote" value="${escapeHtml(d.note)}" placeholder="mis. sisihan gaji" maxlength="80"></label>
    </div>
    <p class="muted sv-tx-hint">Sisa ${sv.name ? escapeHtml(sv.name) : ''}: <b>${txRp(Math.max(0, sv.target - sv.balance))}</b> — saldo ${txRp(sv.balance)}, tidak bisa minus.</p>
    <div class="tx-form-actions">
      <button type="submit" class="btn primary">Simpan</button>
      <button type="button" class="btn" data-sv-cancelform2>Batal</button>
    </div>
  </form>`;
}
let saveTxPreset = null;
function submitSvTxForm(form) {
  const sv = saveFind(form.stxSv.value);
  const amount = txParseAmount(form.stxAmount.value);
  const kind = form.stxKind.value;
  if (!sv) { showToast('Pilih target tabungan.', true); return; }
  if (!(amount > 0)) { showToast('Nominal tidak valid. Contoh: 500rb.', true); return; }
  if (kind === 'withdraw' && amount > sv.balance) { showToast(`Penarikan melebihi saldo ${txRp(sv.balance)}.`, true); return; }
  if (kind === 'deposit' && sv.balance + amount > sv.target * 3) { showToast('Setoran kejauhan di atas target — cek nominal.', true); return; }
  const date = form.stxDate.value || txIso(new Date());
  state.savingsTx.push({ id: uid('stx'), svId: sv.id, kind, amount, note: form.stxNote.value.trim(), date, source: form.stxSource.value.trim() || '—', ts: Date.now() });
  state.savings = saveList().map((s) => (s.id === sv.id ? { ...s, balance: Math.max(0, s.balance + (kind === 'deposit' ? amount : -amount)) } : s));
  const updated = saveFind(sv.id);
  saveTxOpen = false; saveTxDraft = null; saveTxPreset = null;
  saveState();
  showToast(kind === 'deposit'
    ? (updated.balance >= updated.target ? `🎉 Target "${updated.name}" tercapai!` : `Setoran ${txRp(amount)} masuk.`)
    : `Penarikan ${txRp(amount)} dicatat.`);
  if (kind === 'deposit' && updated.balance >= updated.target && !saveDetailId) saveDetailId = updated.id;
  renderShell();
}

function handleSaveAction(btn) {
  if (btn.matches('[data-sv-filter]')) { saveFilter = btn.dataset.svFilter; renderShell(); return true; }
  if (btn.matches('[data-sv-open]')) { saveDetailId = btn.dataset.svOpen; saveFormOpen = false; saveTxOpen = false; renderShell(); return true; }
  if (btn.matches('[data-sv-back]')) { saveDetailId = null; renderShell(); return true; }
  if (btn.matches('[data-sv-new]')) {
    saveFormOpen = true; saveEditingId = null; saveTxOpen = false; saveDetailId = null;
    saveDraft = saveDraft || { name: '', desc: '', target: '', balance: '', deadline: '', cat: SAVE_CATS[0].name, icon: SAVE_ICONS[0], color: SAVE_COLORS[0] };
    renderShell();
    const el = dom.content.querySelector('#svForm [name=svName]'); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => el.focus(), 350); }
    return true;
  }
  if (btn.matches('[data-sv-cancelform]')) { saveFormOpen = false; saveEditingId = null; saveDraft = null; renderShell(); return true; }
  if (btn.matches('[data-sv-cancelform2]')) { saveTxOpen = false; saveTxDraft = null; saveTxPreset = null; renderShell(); return true; }
  if (btn.matches('[data-sv-pick-ic]')) {
    const f = dom.content.querySelector('#svForm'); if (!f) return true;
    f.querySelectorAll('[data-sv-pick-ic]').forEach((b) => b.classList.remove('on'));
    btn.classList.add('on'); saveDraft = svDraftFrom(f);
    return true;
  }
  if (btn.matches('[data-sv-pick-color]')) {
    const f = dom.content.querySelector('#svForm'); if (!f) return true;
    f.querySelectorAll('[data-sv-pick-color]').forEach((b) => b.classList.remove('on'));
    btn.classList.add('on'); saveDraft = svDraftFrom(f);
    return true;
  }
  if (btn.matches('[data-sv-newtx]')) { saveTxOpen = true; saveFormOpen = false; saveTxPreset = saveDetailId; renderShell(); dom.content.querySelector('#svTxForm')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return true; }
  if (btn.matches('[data-sv-deposit]')) { saveTxOpen = true; saveFormOpen = false; saveTxPreset = btn.dataset.svDeposit; renderShell(); dom.content.querySelector('#svTxForm')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return true; }
  if (btn.matches('[data-sv-edit]')) {
    const s = saveFind(btn.dataset.svEdit);
    if (!s) return true;
    saveEditingId = s.id; saveFormOpen = true; saveTxOpen = false; saveDetailId = null; saveDraft = null;
    renderShell(); dom.content.querySelector('#svForm')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return true;
  }
  if (btn.matches('[data-sv-archive]')) {
    const s = saveFind(btn.dataset.svArchive);
    if (!s) return true;
    state.savings = saveList().map((x) => (x.id === s.id ? { ...x, archived: !x.archived } : x));
    saveState(); showToast(s.archived ? 'Dipulihkan ke aktif.' : 'Dimasukkan ke arsip.'); renderShell();
    return true;
  }
  if (btn.matches('[data-sv-del]')) {
    const s = saveFind(btn.dataset.svDel);
    if (!s) return true;
    if (!window.confirm(`Hapus tabungan "${s.name}" beserta riwayat setoran (${saveTxList().filter((t) => t.svId === s.id).length} catatan)?`)) return true;
    state.savings = saveList().filter((x) => x.id !== s.id);
    state.savingsTx = saveTxList().filter((t) => t.svId !== s.id);
    saveDetailId = null; saveFormOpen = false; saveEditingId = null; saveTxOpen = false;
    saveState(); showToast('Tabungan dihapus.'); renderShell();
    return true;
  }
  return false;
}

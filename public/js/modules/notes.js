// Tracker Daily — notes
// Dipisah dari public/app.js (refactor modular; tidak ada identifier yang di-rename).
// Classic script — urutan load: lihat <script> di public/index.html.
'use strict';


/* ============ MODUL CATATAN (notes: capture, editor rich, template) ============ */
const NOTES_STORE_KEY = 'miaw-tracker.notes.v1';
const NOTE_CATS = ['Inbox', 'Ide', 'Belajar', 'Jurnal', 'Bisnis', 'Arsip'];
const NOTE_TABS = ['Semua', ...NOTE_CATS];
const NOTE_SORTS = [
  { key: 'updated', label: 'Terbaru diperbarui' },
  { key: 'created', label: 'Terbaru dibuat' },
  { key: 'az', label: 'A–Z' },
];
let notePage = 'list'; // list | detail | editor | templates
let noteId = null;
let noteTab = 'Semua';
let noteSearch = '';
let noteSort = 'updated';
let noteTagFilter = null;
let noteMenuId = null;      // bottom sheet pada card list
let noteDetailMenu = false; // bottom sheet pada detail
let noteSavedTimer = null;

const NOTE_TEMPLATES = [
  { key: 'kosong', label: 'Catatan Kosong', icon: '📄', desc: 'Halaman bersih untuk mulai dari nol.', body: '' },
  { key: 'ide', label: 'Ide', icon: '💡', desc: 'Tangkap ide beserta alasan dan langkah awal.', body: '<h3>Ide saya</h3><p></p><h3>Mengapa ini menarik?</h3><p></p><ul><li>✅ Langkah pertama:</li><li>✅ Yang perlu dipelajari:</li></ul>' },
  { key: 'belajar', label: 'Catatan Belajar', icon: '📚', desc: 'Topik, poin penting, dan sumber.', body: '<h3>Topik</h3><p></p><h3>Poin penting</h3><ul><li></li></ul><h3>Sumber</h3><p></p><h3>Review berikutnya</h3><p></p>' },
  { key: 'jurnal', label: 'Jurnal Harian', icon: '🌙', desc: 'Refleksi singkat lima pertanyaan.', body: '<h3>Bagaimana perasaanmu hari ini?</h3><p></p><h3>Apa yang terjadi hari ini?</h3><p></p><h3>Apa yang kamu syukuri?</h3><p></p><h3>Apa yang kamu pelajari?</h3><p></p><h3>Apa fokusmu besok?</h3><p></p>' },
  { key: 'bisnis', label: 'Catatan Bisnis', icon: '💼', desc: 'Tujuan, ide, risiko, dan langkah.', body: '<h3>Tujuan</h3><p></p><h3>Ide & peluang</h3><ul><li></li></ul><h3>Risiko</h3><ul><li></li></ul><h3>Langkah berikutnya</h3><ul><li>✅ </li></ul>' },
];

function noteNewId() { return 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function noteNow() { return Date.now(); }

function noteSeedList() {
  const now = Date.now();
  const H = 3600000, D = 86400000;
  return [
    { id: 'ns1', title: 'Strategi Marketing Batu Bata', category: 'Bisnis', tags: ['marketing', 'batu-bata'], pinned: true, favorite: true, archived: false, prevCat: 'Bisnis',
      created: now - 6 * D, updated: now - 2 * H,
      body: '<h3>Posisi pasar</h3><p>Fokus pada <b>pemasok lokal</b> untuk proyek rumah tinggal dan renovasi. Keunggulan: pengiriman cepat dan harga transparan.</p><ul><li>✅ Bangun presence Google Bisnis</li><li>Katalog harga tetap di WhatsApp</li><li>Testimoni tukang &amp; mandor</li></ul><h3>Kanal</h3><p>Facebook Marketplace, grup proyek lokal, dan referral tukang langganan.</p><blockquote>Target: 10 pelanggan baru per bulan dari kanal organik.</blockquote>' },
    { id: 'ns2', title: 'Ide Aplikasi Keuangan Pribadi', category: 'Ide', tags: ['aplikasi', 'keuangan'], pinned: false, favorite: true, archived: false, prevCat: 'Ide',
      created: now - 4 * D, updated: now - 1 * D,
      body: '<p>Aplikasi catat pengeluaran <b>3 detik per transaksi</b> — lebih cepat dari membuka kalkulator.</p><h3>Fitur inti</h3><ul><li>Input cepat angka + kategori otomatis</li><li>Grafik mingguan sederhana</li><li>Mode offline penuh</li></ul><h3>MVP</h2><p>Satu layar input, satu layar grafik. Sisanya nanti.</p>' },
    { id: 'ns3', title: 'Belajar Next.js', category: 'Belajar', tags: ['nextjs', 'frontend'], pinned: false, favorite: false, archived: false, prevCat: 'Belajar',
      created: now - 12 * D, updated: now - 3 * D,
      body: '<h3>Poin penting</h3><ul><li><b>App Router</b>: file <code>page.js</code> menentukan route.</li><li>Server Component secara default — <code>\'use client\'</code> hanya bila perlu interaksi.</li><li>Data fetching langsung di komponen, tanpa <code>useEffect</code>.</li></ul><h3>Sumber</h3><p>Dokumentasi resmi nextjs.org/learn + video build UI.</p><h3>Review berikutnya</h3><p>Latihan: bikin halaman detail + metadata SEO.</p>' },
    { id: 'ns4', title: 'Jurnal Harian', category: 'Jurnal', tags: ['refleksi'], pinned: false, favorite: false, archived: false, prevCat: 'Jurnal',
      created: now - 8 * H, updated: now - 40 * 60000,
      body: '<h3>Bagaimana perasaanmu hari ini?</h3><p>Cukup baik, agak lelah setelah kerja tapi produktif.</p><h3>Apa yang terjadi hari ini?</h3><p>Selesai merapikan laporan mingguan dan sempat olahraga 20 menit.</p><h3>Apa yang kamu syukuri?</h3><ul><li>Cuaca cerah pagi tadi</li><li>Doa ibu</li></ul><h3>Apa yang kamu pelajari?</h3><p>Mengerjakan hal sulit di pagi hari terasa lebih ringan.</p><h3>Apa fokusmu besok?</h3><p>Follow-up klien batu bata, lanjut modul Next.js.</p>' },
    { id: 'ns5', title: 'Rencana Tabungan', category: 'Bisnis', tags: ['keuangan', 'target'], pinned: false, favorite: false, archived: false, prevCat: 'Bisnis',
      created: now - 20 * D, updated: now - 5 * D,
      body: '<h3>Target</h3><p>Dana darurat 6 bulan pengeluaran, lalu tabungan equipment kerja.</p><ul><li>Otomasi transfer tiap gajian (sebelum belanja)</li><li>Pisahkan rekening target dan rekening harian</li><li>Evalusi tiap 3 bulan</li></ul><blockquote>Bayar diri sendiri duluan — sisanya baru dipakai.</blockquote>' },
  ];
}

function loadNotes() {
  try {
    const raw = localStorage.getItem(scopedKey(NOTES_STORE_KEY));
    if (!raw) {
      if (!demoSeedEnabled()) return [];
      const seeded = noteSeedList(); saveNotes(seeded); return seeded;
    }
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch { return []; }
}

function saveNotes(list) {
  try { localStorage.setItem(scopedKey(NOTES_STORE_KEY), JSON.stringify(list)); } catch { /* ignore */ }
  if (typeof queueRemoteSave === 'function') queueRemoteSave();
}

function sanitizeNoteHtml(html) {
  const doc = new DOMParser().parseFromString('<div id="r">' + String(html || '') + '</div>', 'text/html');
  const root = doc.getElementById('r');
  const ALLOW = { A: ['href'], BR: [], CODE: [], EM: [], STRONG: [], B: [], I: [], U: [], S: [], P: [], H2: [], H3: [], BLOCKQUOTE: [], UL: [], OL: [], LI: [], DIV: [], INPUT: ['type', 'checked'], SPAN: [], LABEL: [] };
  const clean = (node) => {
    const kids = [...node.childNodes];
    for (const kid of kids) {
      if (kid.nodeType === 8) { kid.remove(); continue; }
      if (kid.nodeType !== 1) continue;
      const tag = kid.tagName;
      if (!ALLOW[tag]) {
        // Sanitasi subtree dulu sebelum dibongkar: tanpa ini, atribut berbahaya
        // di dalam tag tak-whitelist (mis. <form><img onerror=…>) lolos utuh.
        clean(kid);
        kid.replaceWith(...[...kid.childNodes].map((c) => c.cloneNode(true)));
        continue;
      }
      for (const attr of [...kid.attributes]) {
        if (!(ALLOW[tag].includes(attr.name) && (tag !== 'A' || /^(https?:|mailto:)/i.test(attr.value)) && (tag !== 'INPUT' || ['type', 'checked'].includes(attr.name)))) kid.removeAttribute(attr.name);
      }
      if (tag === 'A') { kid.setAttribute('rel', 'noopener noreferrer'); kid.setAttribute('target', '_blank'); }
      clean(kid);
    }
  };
  clean(root);
  return root.innerHTML;
}

function notePreview(html) {
  const withSp = String(html || '').replace(/<\/(p|h1|h2|h3|li|blockquote|div)>/gi, '</$1> ');
  const doc = new DOMParser().parseFromString(withSp, 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 130);
}

function noteTimeLabel(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'baru saja';
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'kemarin';
  if (d < 7) return `${d} hari lalu`;
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(ts));
}

function noteFullDate(ts) {
  if (!ts) return '—';
  return new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(ts));
}

function noteFind(list, id) { return list.find((x) => x.id === id) || null; }

function noteParseTags(str) {
  return String(str || '').split(',').map((t) => t.replace(/^#/, '').trim().toLowerCase().replace(/\s+/g, '-')).filter(Boolean).slice(0, 8);
}

function noteAllTags() {
  const counts = {};
  for (const n of loadNotes()) { if (!n.archived) for (const t of n.tags || []) counts[t] = (counts[t] || 0) + 1; }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
}

function noteFiltered() {
  let list = loadNotes();
  if (noteTab === 'Semua') list = list.filter((n) => !n.archived);
  else if (noteTab === 'Arsip') list = list.filter((n) => n.archived);
  else list = list.filter((n) => !n.archived && n.category === noteTab);
  if (noteTagFilter) list = list.filter((n) => (n.tags || []).includes(noteTagFilter));
  const q = noteSearch.trim().toLowerCase();
  if (q) {
    list = list.filter((n) => {
      const text = (n.title + ' ' + (n.body || '').replace(/<[^>]+>/g, ' ') + ' ' + (n.tags || []).join(' ')).toLowerCase();
      return text.includes(q);
    });
  }
  if (noteSort === 'az') list = [...list].sort((a, b) => (a.title || '').localeCompare(b.title || '', 'id'));
  else if (noteSort === 'created') list = [...list].sort((a, b) => b.created - a.created);
  else list = [...list].sort((a, b) => b.updated - a.updated);
  if (noteSort !== 'az') list = [...list.filter((n) => n.pinned), ...list.filter((n) => !n.pinned)];
  return list;
}

function noteCreate(templateKey) {
  const tpl = NOTE_TEMPLATES.find((t) => t.key === templateKey) || NOTE_TEMPLATES[0];
  const now = noteNow();
  const n = { id: noteNewId(), title: '', category: tpl.key === 'jurnal' ? 'Jurnal' : 'Inbox', tags: [], pinned: false, favorite: false, archived: false, prevCat: 'Inbox', created: now, updated: now, body: tpl.body };
  const list = loadNotes();
  list.unshift(n);
  saveNotes(list);
  return n;
}

function noteCapture(text) {
  const now = noteNow();
  const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const n = { id: noteNewId(), title: text, category: 'Inbox', tags: [], pinned: false, favorite: false, archived: false, prevCat: 'Inbox', created: now, updated: now, body: `<p>${esc}</p>` };
  const list = loadNotes();
  list.unshift(n);
  saveNotes(list);
  return n;
}

function noteSetField(id, patch, opts) {
  const list = loadNotes();
  const n = noteFind(list, id);
  if (!n) return null;
  Object.assign(n, patch);
  if (!(opts && opts.silent)) n.updated = noteNow();
  saveNotes(list);
  return n;
}

function noteRenderTags(n) {
  return (n.tags || []).map((t) => `<span class="note-tag">#${escapeHtml(t)}</span>`).join(' ');
}

function renderNotesView() {
  if (notePage === 'templates') return renderNoteTemplatesPage();
  if (notePage === 'editor' && noteId) return renderNoteEditorPage();
  if (notePage === 'detail' && noteId) return renderNoteDetailPage();
  return renderNoteListPage();
}

function noteCardsHtml(list) {
  const total = list.length;
  if (!total) return '';
  return list.map((n) => `<div class="note-card${n.pinned ? ' pin' : ''}">
        <button type="button" class="note-card-main" data-note-open="${n.id}">
          <div class="note-card-head"><b>${n.pinned ? '📌 ' : ''}${n.favorite ? '⭐ ' : ''}${escapeHtml(n.title || 'Tanpa judul')}</b></div>
          ${n.body ? `<p class="note-card-prev">${escapeHtml(notePreview(n.body))}</p>` : '<p class="note-card-prev dim">(kosong)</p>'}
          <div class="note-card-foot"><span class="note-cat ${escapeHtml(n.category)}">${escapeHtml(n.category)}</span><span class="note-card-tags">${noteRenderTags(n)}</span></div>
          <div class="note-card-time">Diperbarui ${noteTimeLabel(n.updated)}</div>
        </button>
        <button type="button" class="note-card-menu" data-note-menu="${n.id}" aria-label="Aksi catatan">⋮</button>
      </div>`).join('');
}

function noteEmptyHtml(anyExisting) {
  return `<div class="note-empty"><span>🗒️</span><b>${anyExisting ? 'Tidak ada hasil' : 'Belum ada catatan'}</b><p>${anyExisting ? 'Coba kata kunci lain atau ganti tab kategori.' : 'Tekan “+ Catatan Baru” untuk mulai menulis, atau tangkap ide lewat kotak cepat di atas.'}</p></div>`;
}

function renderNoteListPage() {
  const list = noteFiltered();
  const anyExisting = loadNotes().some((n) => !n.archived);
  const tabs = NOTE_TABS.map((t) => `<button type="button" class="goal-chip note-tab${noteTab === t ? ' on' : ''}" data-note-tab="${t}">${t}</button>`).join('');
  const tags = noteAllTags();
  const tagRow = tags.length
    ? `<div class="note-tag-row">${tags.map(([t, c]) => `<button type="button" class="note-tag fil${noteTagFilter === t ? ' on' : ''}" data-note-tagfil="${escapeHtml(t)}">#${escapeHtml(t)} <b>${c}</b></button>`).join('')}</div>`
    : '';
  const cards = list.length ? noteCardsHtml(list) : noteEmptyHtml(anyExisting);
  const sheet = noteMenuId ? noteActionSheet(noteFind(loadNotes(), noteMenuId)) : '';
  return `<div class="notes-page">
      <form class="note-capture" id="noteCaptureForm" autocomplete="off"><input name="q" placeholder="⚡ Tangkap cepat, tekan Enter…" maxlength="120" /><button type="submit" class="note-capture-go" aria-label="Simpan catatan cepat">+</button></form>
      <label class="task-search note-search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input type="search" data-note-search placeholder="Cari catatan…" value="${escapeHtml(noteSearch)}" autocomplete="off" /></label>
      <div class="note-tabs">${tabs}</div>
      ${tagRow}
      <div class="note-sortrow"><span>${list.length} catatan</span>
        <select data-note-sort aria-label="Urutkan catatan">${NOTE_SORTS.map((s) => `<option value="${s.key}"${noteSort === s.key ? ' selected' : ''}>${s.label}</option>`).join('')}</select></div>
      <div class="note-list">${cards}</div>
      <button type="button" class="note-fab" data-note-new aria-label="Catatan baru">+</button>
      ${sheet}
    </div>`;
}

function noteActionSheet(n) {
  if (!n) return '';
  return `<div class="note-sheet-wrap" data-note-sheet-close>
      <div class="note-sheet">
        <div class="note-sheet-grip"></div>
        <div class="note-sheet-head"><b>${escapeHtml(n.title || 'Tanpa judul')}</b><button type="button" class="icon-button" data-note-menu-close aria-label="Tutup">✕</button></div>
        <button type="button" class="note-sheet-btn" data-note-pin="${n.id}">${n.pinned ? '📌 Lepas pin' : '📌 Pin catatan'}</button>
        <button type="button" class="note-sheet-btn" data-note-fav="${n.id}">${n.favorite ? '☆ Hapus favorit' : '⭐ Tandai favorit'}</button>
        <button type="button" class="note-sheet-btn" data-note-arch="${n.id}">${n.archived ? '♻️ Pulihkan dari arsip' : '🗄️ Arsipkan'}</button>
        <button type="button" class="note-sheet-btn" data-note-edit="${n.id}">✏️ Edit catatan</button>
        <button type="button" class="note-sheet-btn danger" data-note-del="${n.id}">🗑️ Hapus</button>
      </div>
    </div>`;
}

function renderNoteDetailPage() {
  const n = noteFind(loadNotes(), noteId);
  if (!n) { notePage = 'list'; noteId = null; return renderNoteListPage(); }
  const sheet = noteDetailMenu ? noteActionSheet(n) : '';
  return `<div class="notes-page">
      <div class="task-detail-top">
        <button type="button" class="task-back" data-note-back aria-label="Kembali">←</button>
        <span class="proj-detail-title"><b>${n.pinned ? '📌 ' : ''}${escapeHtml(n.title || 'Tanpa judul')}</b><span><span class="note-cat ${escapeHtml(n.category)}">${escapeHtml(n.category)}</span>${n.favorite ? '⭐' : ''}</span></span>
        <button type="button" class="icon-button proj-menu-btn" data-note-dmenu aria-label="Menu aksi">⋮</button>
      </div>
      <p class="note-detail-time">Dibuat ${noteFullDate(n.created)} · Diperbarui ${noteTimeLabel(n.updated)}</p>
      <div class="goal-detail-card note-body">${n.body || '<p class="note-card-prev dim">(catatan kosong)</p>'}</div>
      ${(n.tags || []).length ? `<div class="note-detail-tags">Tag: ${noteRenderTags(n)}</div>` : ''}
      <button type="button" class="primary-button goal-save" data-note-edit2="${n.id}">✏️ Edit Catatan</button>
      ${sheet}
    </div>`;
}

function renderNoteTemplatesPage() {
  const cards = NOTE_TEMPLATES.map((t) => `<button type="button" class="note-tpl" data-note-tpl="${t.key}"><span class="note-tpl-ico">${t.icon}</span><span class="note-tpl-main"><b>${t.label}</b><span>${t.desc}</span></span><span class="note-tpl-arrow">›</span></button>`).join('');
  return `<div class="notes-page">
      <div class="task-detail-top">
        <button type="button" class="task-back" data-note-back aria-label="Kembali">←</button>
        <span class="proj-detail-title"><b>Catatan Baru</b><span>Pilih template untuk mulai menulis</span></span>
      </div>
      <div class="note-tpl-list">${cards}</div>
    </div>`;
}

function renderNoteEditorPage() {
  const n = noteFind(loadNotes(), noteId);
  if (!n) { notePage = 'list'; noteId = null; return renderNoteListPage(); }
  const cats = NOTE_CATS.filter((c) => c !== 'Arsip').map((c) => `<button type="button" class="goal-chip${n.category === c ? ' on' : ''}" data-note-cat="${c}">${c}</button>`).join('');
  const tb = (cmd, glyph, name, arg) => `<button type="button" class="note-tb-btn" data-note-cmd="${cmd}"${arg ? ` data-note-cmd-arg="${arg}"` : ''} aria-label="${name}" title="${name}">${glyph}</button>`;
  return `<div class="notes-page note-editor-wrap">
      <div class="task-detail-top">
        <button type="button" class="task-back" data-note-back aria-label="Kembali">←</button>
        <span class="proj-detail-title"><b id="noteETop">${escapeHtml(n.title || 'Catatan')}</b><span>Autosave</span></span>
        <span class="note-save-state" id="noteSaveState">Tersimpan ✓</span>
        <button type="button" class="icon-button proj-menu-btn${n.pinned ? ' on' : ''}" data-note-epin="${n.id}" aria-label="Pin">📌</button>
        <button type="button" class="icon-button proj-menu-btn${n.favorite ? ' on' : ''}" data-note-efav="${n.id}" aria-label="Favorit">⭐</button>
      </div>
      <input class="note-e-title" id="noteETitle" data-note-title placeholder="Judul catatan…" value="${escapeHtml(n.title)}" maxlength="120" autocomplete="off" />
      <div class="note-toolbar" role="toolbar">${tb('bold', '<b>B</b>', 'Tebal')}${tb('italic', '<i>I</i>', 'Miring')}${tb('h3', '<span class="nb">H</span>', 'Judul')}<span class="note-tb-sep"></span>${tb('insertUnorderedList', '•≡', 'Daftar butir')}${tb('insertOrderedList', '1≡', 'Daftar nomor')}${tb('checklist', '☑', 'Checklist')}<span class="note-tb-sep"></span>${tb('formatBlock', '❝', 'Kutipan', 'blockquote')}${tb('link', '🔗', 'Tautan')}<span class="note-tb-sep"></span>${tb('undo', '↩', 'Batal')}${tb('redo', '↪', 'Ulangi')}</div>
      <div class="goal-detail-card note-editor" id="noteEBody" contenteditable="true" data-note-body data-placeholder="Tulis catatan…">${n.body || ''}</div>
      <div class="note-e-meta">
        <div class="goal-chips">${cats}</div>
        <input class="note-e-tags" id="noteETags" data-note-tags placeholder="Tag, pisahkan dengan koma (mis. ide, kerja)" value="${escapeHtml((n.tags || []).join(', '))}" maxlength="80" autocomplete="off" />
      </div>
    </div>`;
}

function noteSavedPulse() {
  const el = document.getElementById('noteSaveState');
  if (!el) return;
  el.textContent = 'Menyimpan…';
  el.classList.add('busy');
  clearTimeout(noteSavedTimer);
  noteSavedTimer = setTimeout(() => { el.textContent = 'Tersimpan ✓'; el.classList.remove('busy'); }, 650);
}

function noteEditorSave(patch) {
  noteSetField(noteId, patch);
  noteSavedPulse();
}

function handleNoteAction(btn) {
  const ds = btn.dataset;
  if (ds.noteNew != null) { notePage = 'templates'; renderShell(); return true; }
  if (ds.noteTab != null) { noteTab = ds.noteTab; notePage = 'list'; renderShell(); return true; }
  if (ds.noteTagfil != null) { noteTagFilter = noteTagFilter === ds.noteTagfil ? null : ds.noteTagfil; renderShell(); return true; }
  if (ds.noteTag != null) { noteTagFilter = ds.noteTag; noteTab = 'Semua'; notePage = 'list'; renderShell(); return true; }
  if (ds.noteOpen != null) { noteId = ds.noteOpen; notePage = 'detail'; noteDetailMenu = false; renderShell(); return true; }
  if (ds.noteMenu != null) { noteMenuId = noteMenuId === ds.noteMenu ? null : ds.noteMenu; renderShell(); return true; }
  if (ds.noteMenuClose != null || ds.noteSheetClose != null) { noteMenuId = null; noteDetailMenu = false; renderShell(); return true; }
  if (ds.noteDmenu != null) { noteDetailMenu = !noteDetailMenu; renderShell(); return true; }
  if (ds.noteBack != null) { notePage = 'list'; noteId = null; noteMenuId = null; noteDetailMenu = false; renderShell(); return true; }
  if (ds.noteTpl != null) { const n = noteCreate(ds.noteTpl); noteId = n.id; notePage = 'editor'; renderShell(); return true; }
  if (ds.noteEdit != null || ds.noteEdit2 != null) {
    const id = ds.noteEdit || ds.noteEdit2;
    noteId = id; notePage = 'editor'; noteMenuId = null; noteDetailMenu = false; renderShell(); return true;
  }
  if (ds.notePin != null) { const n = noteFind(loadNotes(), ds.notePin); noteSetField(ds.notePin, { pinned: !n.pinned }); noteMenuId = null; renderShell(); return true; }
  if (ds.noteFav != null) { const n = noteFind(loadNotes(), ds.noteFav); noteSetField(ds.noteFav, { favorite: !n.favorite }); noteMenuId = null; renderShell(); return true; }
  if (ds.noteArch != null) {
    const n = noteFind(loadNotes(), ds.noteArch);
    if (n.archived) noteSetField(ds.noteArch, { archived: false, category: n.prevCat || 'Inbox' });
    else noteSetField(ds.noteArch, { archived: true, prevCat: n.category, category: 'Arsip' });
    noteMenuId = null; noteDetailMenu = false;
    if (notePage === 'detail') notePage = 'list';
    renderShell(); return true;
  }
  if (ds.noteDel != null) {
    if (!window.confirm('Hapus catatan ini secara permanen?')) { noteMenuId = null; renderShell(); return true; }
    saveNotes(loadNotes().filter((x) => x.id !== ds.noteDel));
    noteMenuId = null; noteDetailMenu = false;
    if (noteId === ds.noteDel) { noteId = null; notePage = 'list'; }
    renderShell(); return true;
  }
  if (ds.noteEpin != null) {
    const n = noteFind(loadNotes(), ds.noteEpin);
    noteSetField(ds.noteEpin, { pinned: !n.pinned });
    btn.classList.toggle('on', !n.pinned);
    return true;
  }
  if (ds.noteEfav != null) {
    const n = noteFind(loadNotes(), ds.noteEfav);
    noteSetField(ds.noteEfav, { favorite: !n.favorite });
    btn.classList.toggle('on', !n.favorite);
    return true;
  }
  if (ds.noteCat != null) {
    const list = loadNotes(); const n = noteFind(list, noteId);
    if (n) { n.category = ds.noteCat; n.updated = noteNow(); saveNotes(list); noteSavedPulse(); notePage = 'editor'; renderShell(); }
    return true;
  }
  if (ds.noteCmd != null) { noteExecCmd(ds.noteCmd, btn.dataset.noteCmdArg); return true; }
  return false;
}

function noteExecCmd(cmd, arg) {
  const body = document.getElementById('noteEBody');
  if (!body) return;
  body.focus();
  if (cmd === 'checklist') {
    const sel = window.getSelection();
    const item = '<li><input type="checkbox" /><label>​</label></li>';
    document.execCommand('insertHTML', false, sel && sel.rangeCount && body.contains(sel.anchorNode) ? item : `<ul>${item}</ul>`);
    noteEditorSave({ body: sanitizeNoteHtml(body.innerHTML) });
    return;
  }
  if (cmd === 'link') {
    const url = window.prompt('Masukkan URL link:', 'https://');
    if (!url || !/^https?:\/\//i.test(url)) return;
    document.execCommand('createLink', false, url);
    noteEditorSave({ body: sanitizeNoteHtml(body.innerHTML) });
    return;
  }
  if (cmd === 'h3') {
    const cur = document.queryCommandValue('formatBlock');
    document.execCommand('formatBlock', false, cur === 'h3' ? 'p' : 'h3');
    noteEditorSave({ body: sanitizeNoteHtml(body.innerHTML) });
    return;
  }
  document.execCommand(cmd, false, arg || null);
  noteEditorSave({ body: sanitizeNoteHtml(body.innerHTML) });
  noteSyncTb();
}

// Sinkronkan tombol toolbar (B/I/H/list/kutip/link) dengan gaya di posisi kursor.
function noteSyncTb() {
  const bar = document.querySelector('.note-toolbar');
  const body = document.getElementById('noteEBody');
  if (!bar) return;
  const inside = !!body && document.activeElement === body;
  let blk = '';
  let link = false;
  if (inside) {
    try { blk = String(document.queryCommandValue('formatBlock')).toLowerCase(); } catch (e) { blk = ''; }
    try { link = document.queryCommandState('createLink'); } catch (e) { link = false; }
  }
  bar.querySelectorAll('[data-note-cmd]').forEach((b) => {
    const c = b.dataset.noteCmd;
    const a = b.dataset.noteCmdArg || '';
    let on = false;
    if (inside) {
      try {
        if (c === 'h3') on = blk === 'h3';
        else if (c === 'formatBlock') on = blk === a;
        else if (c === 'link') on = link;
        else if (c === 'checklist' || c === 'undo' || c === 'redo') on = false;
        else on = document.queryCommandState(c);
      } catch (e) { on = false; }
    }
    b.classList.toggle('on', !!on);
  });
}
let noteTbTimer = null;
document.addEventListener('selectionchange', () => {
  const body = document.getElementById('noteEBody');
  if (!body || document.activeElement !== body) return;
  clearTimeout(noteTbTimer);
  noteTbTimer = setTimeout(noteSyncTb, 120);
});

function handleNoteInput(el) {
  if (el.matches('[data-note-search]')) {
    noteSearch = el.value;
    const list = dom.content.querySelector('.note-list');
    if (list) {
      const items = noteFiltered();
      list.innerHTML = items.length ? noteCardsHtml(items) : noteEmptyHtml(true);
    }
    return true;
  }
  if (el.matches('[data-note-title]')) {
    noteEditorSave({ title: el.value.trim() });
    const b = dom.content.querySelector('#noteETop');
    if (b) b.textContent = el.value.trim() || 'Catatan';
    return true;
  }
  if (el.matches('[data-note-tags]')) {
    noteEditorSave({ tags: noteParseTags(el.value) });
    return true;
  }
  if (el.matches('[data-note-body]')) {
    el.querySelectorAll('input[type="checkbox"]').forEach((c) => { if (c.checked) c.setAttribute('checked', ''); else c.removeAttribute('checked'); });
    noteEditorSave({ body: sanitizeNoteHtml(el.innerHTML) });
    return true;
  }
  return false;
}

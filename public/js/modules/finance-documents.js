// Tracker Daily — finance-documents
// Dipisah dari public/app.js (refactor modular; tidak ada identifier yang di-rename).
// Classic script — urutan load: lihat <script> di public/index.html.
'use strict';


/* ============ MODUL DOKUMEN (document hub: berkas & tautan) ============ */
const DOC_BASE_CATS = ['Project', 'Kuliah', 'Keuangan', 'Pekerjaan', 'Referensi'];
const DOC_FILE_LIMIT = 2 * 1024 * 1024; // 2 MB per berkas (disimpan base64, ikut tersinkron)
let docSearch = '';
let docCat = 'Semua';
let docType = 'all';
let docFavOnly = false;
let docSort = 'terbaru';
let docMenuId = null;
let docModal = null;        // 'add' | 'edit'
let docEditingId = null;
let docFormType = 'link';   // 'link' | 'file'
let docPickedFile = null;   // { name, size, type, data }
let docBusy = false;
let docMoveOpen = false;

function ensureDocStore() {
  let dirty = false;
  if (!Array.isArray(state.documents)) { state.documents = []; dirty = true; }
  if (!Array.isArray(state.docCats)) { state.docCats = []; dirty = true; }
  if (!state.docSeeded) {
    state.docSeeded = true;
    if (demoSeedEnabled()) state.documents = docSeedList();
    dirty = true;
  }
  if (dirty) saveState();
}

function docSeedList() {
  const now = Date.now();
  const file = (name, text) => {
    const data = 'data:text/plain;base64,' + btoa(unescape(encodeURIComponent(text)));
    return { data, fileName: name, fileType: 'text/plain', size: text.length };
  };
  return [
    { id: uid('doc'), kind: 'link', name: 'Dokumentasi Next.js', desc: 'Referensi resmi belajar App Router.', category: 'Referensi', tags: ['nextjs', 'web'], url: 'https://nextjs.org/docs', favorite: true, createdAt: now - 86400000 * 2, updatedAt: now - 86400000 },
    { id: uid('doc'), kind: 'link', name: 'Dashboard Supabase', desc: 'Proyek tracker-daily (SQL & storage).', category: 'Project', tags: ['database'], url: 'https://supabase.com/dashboard', favorite: false, createdAt: now - 86400000 * 5, updatedAt: now - 86400000 * 5 },
    { id: uid('doc'), kind: 'link', name: 'Kalkulator Bunga Majemuk', desc: 'Tools perencanaan tabungan.', category: 'Keuangan', tags: ['tools', 'tabungan'], url: 'https://www.investor.gov/financial-tools-calculators/calculators-compound-interest', favorite: false, createdAt: now - 86400000 * 9, updatedAt: now - 86400000 * 9 },
    { id: uid('doc'), kind: 'file', name: 'Checklist Skripsi.txt', desc: 'Tahapan yang harus selesai sebelum sidang.', category: 'Kuliah', tags: ['checklist'], favorite: true, ...file('Checklist Skripsi.txt', 'CHECKLIST SKRIPSI\n\n[x] Topik disetujui dosen pembimbing\n[ ] Bab 1-3 selesai\n[ ] Sidang proposal\n[ ] Pengumpulan data\n[ ] Olah data & Bab 4\n[ ] Sidang hasil\n[ ] Revisi & hardbound\n'), createdAt: now - 86400000 * 3, updatedAt: now - 3600000 * 5 },
    { id: uid('doc'), kind: 'file', name: 'Template Notulen Rapat.txt', desc: 'Format cepat mencatat rapat.', category: 'Pekerjaan', tags: ['template', 'rapat'], favorite: false, ...file('Template Notulen Rapat.txt', 'NOTULEN RAPAT\nTanggal : \nPukul   : \nPimpinan: \nPeserta : \n\nAGENDA\n1. \n2. \n\nKEPUTUSAN\n- \n\nACTION ITEM\n- PIC: ... Deadline: ...\n'), createdAt: now - 86400000 * 1, updatedAt: now - 86400000 },
    { id: uid('doc'), kind: 'file', name: 'Ide Konten Batu Bata.txt', desc: 'Cadangan ide dari modul Catatan.', category: 'Project', tags: ['ide', 'marketing'], favorite: false, ...file('Ide Konten Batu Bata.txt', 'IDE KONTEN\n1. Video proses pembakaran batu bata\n2. Perbandingan bata merah vs ringan\n3. Testimoni pelanggan proyek villas\n4. Tips aduk spesi yang benar\n'), createdAt: now - 3600000 * 4, updatedAt: now - 3600000 * 4 },
  ];
}

function docList() { return Array.isArray(state.documents) ? state.documents : []; }
function docFind(id) { return docList().find((d) => d.id === id) || null; }
function docCatsAll() { return [...DOC_BASE_CATS, ...(state.docCats || [])]; }
function docSaveDocs() { saveState(); }

function docFiltered() {
  const q = docSearch.trim().toLowerCase();
  let list = docList().filter((d) => {
    if (docFavOnly && !d.favorite) return false;
    if (docCat === 'Favorit') { if (!d.favorite) return false; }
    else if (docCat !== 'Semua' && d.category !== docCat) return false;
    if (docType !== 'all' && d.kind !== docType) return false;
    if (q) {
      const hay = [d.name, d.desc, d.category, ...(d.tags || [])].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  list = [...list].sort((a, b) => {
    if (docSort === 'lama' || docSort === 'terlama') return a.createdAt - b.createdAt;
    if (docSort === 'nama') return String(a.name).localeCompare(String(b.name), 'id');
    return b.updatedAt - a.updatedAt;
  });
  return list;
}

function docFmtBytes(b) {
  if (typeof b !== 'number' || !isFinite(b)) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

function docTimeLabel(ts) {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return 'baru saja';
  const m = Math.floor(s / 60); if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60); if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24); if (d < 30) return `${d} hari lalu`;
  return new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function docKindLabel(d) { return d.kind === 'link' ? 'Tautan' : 'Berkas'; }

function docIcon(d) {
  if (d.kind === 'link') return '🔗';
  const ext = String(d.fileName || d.name).split('.').pop().toLowerCase();
  const t = d.fileType || '';
  if (t.startsWith('image/')) return '🖼️';
  if (t === 'application/pdf' || ext === 'pdf') return '📕';
  if (['doc', 'docx'].includes(ext)) return '📘';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return '📗';
  if (['ppt', 'pptx'].includes(ext)) return '📙';
  if (['zip', 'rar', '7z'].includes(ext)) return '🗜️';
  if (t.startsWith('video/')) return '🎬';
  if (t.startsWith('audio/')) return '🎵';
  return '📄';
}

function docOpen(d) {
  if (!d) return;
  const href = d.kind === 'link' ? d.url : d.data;
  if (!href) { showToast('Dokumen ini belum punya isi/tautan.'); return; }
  const a = document.createElement('a');
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener';
  if (d.kind === 'file' && d.data) a.download = d.fileName || d.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function docsEmptyHtml(hasAny) {
  return `<div class="doc-empty"><span>🗂️</span><b>${hasAny ? 'Tidak ada hasil' : 'Belum ada dokumen'}</b>
    <p>${hasAny ? 'Coba kata kunci lain atau ubah filter.' : 'Simpan berkas & tautan penting di satu tempat — mulai dari sini.'}</p>
    <div class="doc-empty-cta"><button type="button" class="btn primary" data-doc-new>＋ Tambah Dokumen</button><button type="button" class="btn" data-doc-link>🔗 Tambah Link</button></div></div>`;
}

function docsStatsHtml() {
  const docs = docList();
  const week = Date.now() - 7 * 86400000;
  const items = [
    { n: docs.length, l: 'Total Dokumen', c: 'amber' },
    { n: docs.filter((d) => d.kind === 'link').length, l: 'Total Link', c: 'teal' },
    { n: docs.filter((d) => d.favorite).length, l: 'Favorit', c: 'orange' },
    { n: docs.filter((d) => d.createdAt >= week).length, l: 'Baru (7 hari)', c: 'green' },
  ];
  return `<div class="doc-stats">${items.map((s) => `<div class="doc-stat ${s.c}"><b>${s.n}</b><span>${s.l}</span></div>`).join('')}</div>`;
}

function docsRowsHtml(list) {
  return list.map((d) => `<tr class="doc-row" data-doc-open="${d.id}">
    <td data-l="Dokumen"><div class="doc-cell"><span class="doc-ic">${docIcon(d)}</span><div class="doc-cell-t"><b>${d.favorite ? '⭐ ' : ''}${escapeHtml(d.name)}</b>${d.desc ? `<small>${escapeHtml(d.desc)}</small>` : ''}</div></div></td>
    <td data-l="Tipe"><span class="doc-type ${d.kind}">${docKindLabel(d)}</span></td>
    <td data-l="Kategori"><span class="doc-cat">${escapeHtml(d.category || '—')}</span></td>
    <td data-l="Tag">${(d.tags || []).length ? `<span class="doc-tags">${d.tags.slice(0, 3).map((t) => `<span>#${escapeHtml(t)}</span>`).join('')}${d.tags.length > 3 ? `<span>+${d.tags.length - 3}</span>` : ''}</span>` : '<span class="doc-dim">—</span>'}</td>
    <td data-l="Ukuran">${d.kind === 'file' ? escapeHtml(docFmtBytes(d.size) || '—') : '<span class="doc-dim">—</span>'}</td>
    <td data-l="Diperbarui">${docTimeLabel(d.updatedAt)}</td>
    <td class="doc-td-act"><button type="button" class="icon-button" data-doc-menu="${d.id}" aria-label="Aksi dokumen">⋮</button></td>
  </tr>`).join('');
}

function renderDocListPage() {
  const list = docFiltered();
  const hasAny = docList().length > 0;
  const cats = ['Semua', ...docCatsAll(), 'Favorit'];
  const tabs = cats.map((c) => `<button type="button" class="goal-chip doc-tab${docCat === c ? ' on' : ''}" data-doc-tab="${escapeHtml(c)}">${c}</button>`).join('');
  const sheet = docMenuId ? docActionSheet(docFind(docMenuId)) : '';
  const modal = docModal ? renderDocModal() : '';
  return `<div class="docs-page">
    <div class="doc-toolbar"><button type="button" class="btn primary" data-doc-new>＋ Tambah Dokumen</button></div>
    ${docsStatsHtml()}
    <div class="doc-actions">
      <button type="button" class="doc-qact" data-doc-upload><span>📤</span>Upload File</button>
      <button type="button" class="doc-qact" data-doc-link><span>🔗</span>Tambah Link</button>
      <button type="button" class="doc-qact" data-doc-addcat><span>📁</span>Buat Folder</button>
      <button type="button" class="doc-qact" data-doc-import><span>📥</span>Import</button>
    </div>
    <label class="task-search doc-search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      <input type="search" data-doc-search placeholder="Cari nama, deskripsi, kategori, tag…" value="${escapeHtml(docSearch)}" autocomplete="off" /></label>
    <div class="doc-tabs">${tabs}<button type="button" class="goal-chip doc-tab doc-addcat" data-doc-addcat aria-label="Buat kategori baru" title="Buat kategori baru">＋ Kategori</button></div>
    <div class="doc-filterrow">
      <select data-doc-ftype aria-label="Filter tipe"><option value="all"${docType === 'all' ? ' selected' : ''}>Semua tipe</option><option value="file"${docType === 'file' ? ' selected' : ''}>Berkas</option><option value="link"${docType === 'link' ? ' selected' : ''}>Tautan</option></select>
      <select data-doc-sort aria-label="Urutkan">${[['terbaru', 'Terbaru diperbarui'], ['lama', 'Terlama dibuat'], ['nama', 'Nama A-Z']].map(([k, l]) => `<option value="${k}"${docSort === k ? ' selected' : ''}>${l}</option>`).join('')}</select>
      <button type="button" class="goal-chip doc-tab${docFavOnly ? ' on' : ''}" data-doc-favfil>⭐ Favorit</button>
      <span class="doc-count">${list.length} dokumen</span>
    </div>
    <div class="doc-tablewrap">${list.length ? `<table class="doc-table"><thead><tr><th>Dokumen</th><th>Tipe</th><th>Kategori</th><th>Tag</th><th>Ukuran</th><th>Diperbarui</th><th></th></tr></thead><tbody>${docsRowsHtml(list)}</tbody></table>` : docsEmptyHtml(hasAny)}</div>
    <button type="button" class="note-fab doc-fab" data-doc-new aria-label="Tambah dokumen">+</button>
    <input type="file" id="docFileInput" hidden />
    <input type="file" id="docImportInput" accept="application/json,.json" hidden />
    ${sheet}${modal}
  </div>`;
}

function docFieldRow(label, inner) { return `<label class="doc-field"><span>${label}</span>${inner}</label>`; }

function renderDocModal() {
  const edit = docModal === 'edit' ? docFind(docEditingId) : null;
  const cats = docCatsAll().map((c) => `<option value="${escapeHtml(c)}"${(edit?.category || 'Project') === c ? ' selected' : ''}>${escapeHtml(c)}</option>`).join('');
  const isFile = (edit ? edit.kind : docFormType) === 'file';
  const picked = docPickedFile;
  return `<div class="doc-modal-wrap" data-doc-closeform>
    <form class="doc-modal" id="docForm" autocomplete="off">
      <div class="doc-modal-head"><b>${edit ? 'Edit Dokumen' : 'Tambah Dokumen'}</b><button type="button" class="icon-button" data-doc-closeform aria-label="Tutup">✕</button></div>
      <div class="doc-mtypes">
        <button type="button" class="doc-mtype${!isFile ? ' on' : ''}" data-doc-mtype="link">🔗 Tautan / URL</button>
        <button type="button" class="doc-mtype${isFile ? ' on' : ''}" data-doc-mtype="file">📄 Upload File</button>
      </div>
      ${isFile ? `<div class="doc-drop" data-doc-pickfile>${picked ? `<b>${escapeHtml(picked.name)}</b><small>${docFmtBytes(picked.size)} • klik untuk ganti berkas</small>` : '<span>📤</span><b>Pilih berkas</b><small>PNG, JPG, PDF, TXT… maks 2 MB (tersimpan & tersinkron)</small>'}<input type="file" name="docFile" hidden /></div>` : docFieldRow('URL', `<input name="docUrl" type="url" placeholder="https://…" value="${escapeHtml(edit?.url || '')}" required />`)}
      ${docFieldRow('Nama dokumen', `<input name="docName" maxlength="80" placeholder="mis. Jurnal Langit — draf" value="${escapeHtml(edit?.name || '')}" required />`)}
      ${docFieldRow('Deskripsi', `<textarea name="docDesc" rows="2" maxlength="200" placeholder="Opsional…">${escapeHtml(edit?.desc || '')}</textarea>`)}
      <div class="doc-mgrid">${docFieldRow('Kategori', `<select name="docCategory">${cats}</select>`)}${docFieldRow('Tags', `<input name="docTags" maxlength="80" placeholder="pisahkan dengan koma" value="${escapeHtml((edit?.tags || []).join(', '))}" />`)}</div>
      <label class="doc-favline"><input type="checkbox" name="docFav" ${edit?.favorite ? 'checked' : ''} /> Tandai sebagai favorit</label>
      <div class="doc-modal-foot">
        <button type="button" class="btn" data-doc-closeform>Batal</button>
        <button type="submit" class="btn primary"${docBusy ? ' disabled' : ''}>${docBusy ? 'Menyimpan…' : (edit ? 'Simpan Perubahan' : '+ Tambah Dokumen')}</button>
      </div>
    </form></div>`;
}

function docActionSheet(d) {
  if (!d) return '';
  const cats = docCatsAll().filter((c) => c !== d.category);
  return `<div class="note-sheet-wrap" data-doc-sheet-close>
    <div class="note-sheet">
      <div class="note-sheet-grip"></div>
      <div class="note-sheet-head"><b>${escapeHtml(d.name)}</b><button type="button" class="icon-button" data-doc-menu-close aria-label="Tutup">✕</button></div>
      <button type="button" class="note-sheet-btn" data-doc-open2="${d.id}">${d.kind === 'link' ? '↗️ Buka tautan' : (d.data ? '👁️ Buka / unduh berkas' : '↗️ Buka')}</button>
      <button type="button" class="note-sheet-btn" data-doc-edit="${d.id}">✏️ Edit</button>
      <button type="button" class="note-sheet-btn" data-doc-fav="${d.id}">${d.favorite ? '☆ Hapus favorit' : '⭐ Tandai favorit'}</button>
      ${docMoveOpen ? `<div class="doc-movegrid">${cats.map((c) => `<button type="button" class="goal-chip" data-doc-move="${d.id}:${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('')}</div>` : '<button type="button" class="note-sheet-btn" data-doc-moveopen="1">📁 Pindahkan kategori</button>'}
      <button type="button" class="note-sheet-btn danger" data-doc-del="${d.id}">🗑️ Hapus</button>
    </div></div>`;
}

function renderDocsView() {
  return renderDocListPage();
}

function docResetUi() { docSearch = ''; docCat = 'Semua'; docType = 'all'; docFavOnly = false; docSort = 'terbaru'; docMenuId = null; docModal = null; docEditingId = null; docPickedFile = null; docMoveOpen = false; }

function handleDocSearch(value) {
  docSearch = value;
  const list = docFiltered();
  const wrap = dom.content.querySelector('.doc-tablewrap');
  if (wrap) wrap.innerHTML = list.length ? `<table class="doc-table"><thead><tr><th>Dokumen</th><th>Tipe</th><th>Kategori</th><th>Tag</th><th>Ukuran</th><th>Diperbarui</th><th></th></tr></thead><tbody>${docsRowsHtml(list)}</tbody></table>` : docsEmptyHtml(docList().length > 0);
  const cnt = dom.content.querySelector('.doc-count');
  if (cnt) cnt.textContent = `${list.length} dokumen`;
}

function handleDocFilePick(input) {
  const f = input.files && input.files[0];
  if (!f) return;
  if (f.size > DOC_FILE_LIMIT) { showToast(`Berkas terlalu besar (${docFmtBytes(f.size)}). Maks 2 MB.`); input.value = ''; return; }
  const reader = new FileReader();
  docBusy = true; renderShell();
  reader.onload = () => {
    docPickedFile = { name: f.name, size: f.size, type: f.type || 'application/octet-stream', data: String(reader.result) };
    docBusy = false;
    renderShell();
    const nameInp = dom.content.querySelector('#docForm [name=docName]');
    if (nameInp && !nameInp.value.trim()) { nameInp.value = f.name.replace(/\.[^.]+$/, '').slice(0, 80); }
  };
  reader.onerror = () => { docBusy = false; input.value = ''; showToast('Gagal membaca berkas.'); renderShell(); };
  reader.readAsDataURL(f);
}

function handleDocImport(input) {
  const f = input.files && input.files[0];
  input.value = '';
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const arr = Array.isArray(parsed) ? parsed : Array.isArray(parsed.documents) ? parsed.documents : null;
      if (!arr) throw new Error('format');
      let added = 0;
      arr.forEach((x) => {
        if (!x || typeof x !== 'object' || !x.name) return;
        state.documents.push({ id: uid('doc'), kind: x.kind === 'file' ? 'file' : 'link', name: String(x.name).slice(0, 80), desc: String(x.desc || ''), category: docCatsAll().includes(x.category) ? x.category : 'Referensi', tags: Array.isArray(x.tags) ? x.tags.map(String).slice(0, 6) : [], url: typeof x.url === 'string' ? x.url : '', data: typeof x.data === 'string' && x.data.startsWith('data:') ? x.data : '', fileName: x.fileName || (x.kind === 'file' ? String(x.name) : ''), fileType: x.fileType || '', size: Number(x.size) || 0, favorite: Boolean(x.favorite), createdAt: Number(x.createdAt) || Date.now(), updatedAt: Date.now() });
        added += 1;
      });
      docSaveDocs();
      renderShell();
      showToast(added ? `${added} dokumen diimpor.` : 'Tidak ada dokumen valid di file itu.');
    } catch { showToast('File import tidak valid (harus JSON hasil Export).'); }
  };
  reader.readAsText(f);
}

function submitDocForm(form) {
  const typeBtn = form.querySelector('.doc-mtype.on');
  const kind = typeBtn ? typeBtn.dataset.docMtype : (docPickedFile ? 'file' : 'link');
  const name = (form.docName.value || '').trim();
  if (!name) { showToast('Nama dokumen wajib diisi.'); return; }
  const tags = (form.docTags.value || '').split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean).slice(0, 6);
  const fav = form.docFav.checked;
  const desc = (form.docDesc.value || '').trim();
  const category = form.docCategory.value;
  if (kind === 'link') {
    const url = (form.docUrl.value || '').trim();
    if (!url) { showToast('Isi URL tautan dulu.'); return; }
    if (!/^https?:\/\//i.test(url)) { showToast('URL harus diawali http:// atau https://'); return; }
    if (docModal === 'edit' && docEditingId) {
      const d = docFind(docEditingId);
      if (d) Object.assign(d, { kind: 'link', name, desc, category, tags, favorite: fav, url, data: '', fileName: '', size: 0, updatedAt: Date.now() });
    } else {
      state.documents.push({ id: uid('doc'), kind: 'link', name, desc, category, tags, url, data: '', fileName: '', fileType: '', size: 0, favorite: fav, createdAt: Date.now(), updatedAt: Date.now() });
    }
    docSaveDocs();
    docCloseModal();
    showToast('Tautan tersimpan.');
    return;
  }
  const picked = docPickedFile;
  let payload;
  if (picked) payload = { data: picked.data, fileName: picked.name, fileType: picked.type, size: picked.size, url: '' };
  else if (docModal === 'edit' && docFind(docEditingId)?.kind === 'file') {
    const old = docFind(docEditingId);
    payload = { data: old.data, fileName: old.fileName || name, fileType: old.fileType, size: old.size, url: '' };
  } else { showToast('Pilih berkas dulu.'); return; }
  if (docModal === 'edit' && docEditingId) {
    const d = docFind(docEditingId);
    if (d) Object.assign(d, { kind: 'file', name, desc, category, tags, favorite: fav, updatedAt: Date.now(), ...payload });
  } else {
    state.documents.push({ id: uid('doc'), kind: 'file', name, desc, category, tags, favorite: fav, createdAt: Date.now(), updatedAt: Date.now(), ...payload });
  }
  docSaveDocs();
  docCloseModal();
  showToast('Berkas tersimpan & tersinkron.');
}

function docCloseModal() { docModal = null; docEditingId = null; docPickedFile = null; docBusy = false; renderShell(); }

function handleDocAction(btn) {
  if (btn.matches('[data-doc-new]')) { docModal = 'add'; docFormType = 'link'; docPickedFile = null; renderShell(); return true; }
  if (btn.matches('[data-doc-link]')) { docModal = 'add'; docFormType = 'link'; docPickedFile = null; renderShell(); return true; }
  if (btn.matches('[data-doc-upload]')) { docModal = 'add'; docFormType = 'file'; docPickedFile = null; renderShell(); return true; }
  if (btn.matches('[data-doc-import]')) { dom.content.querySelector('#docImportInput')?.click(); return true; }
  if (btn.matches('[data-doc-pickfile]')) { btn.querySelector('input[type=file]')?.click(); return true; }
  if (btn.matches('[data-doc-addcat]')) {
    const name = (window.prompt('Nama kategori/folder baru:') || '').trim();
    if (!name) return true;
    if (docCatsAll().some((c) => c.toLowerCase() === name.toLowerCase())) { showToast('Kategori itu sudah ada.'); return true; }
    state.docCats.push(name.slice(0, 24));
    docCat = name;
    docSaveDocs();
    renderShell();
    showToast(`Kategori “${name}” dibuat.`);
    return true;
  }
  if (btn.matches('[data-doc-tab]')) { docCat = btn.dataset.docTab; docFavOnly = false; docMenuId = null; renderShell(); return true; }
  if (btn.matches('[data-doc-favfil]')) { docFavOnly = !docFavOnly; renderShell(); return true; }
  if (btn.matches('[data-doc-mtype]')) {
    docFormType = btn.dataset.docMtype;
    const wrap = dom.content.querySelector('.doc-modal');
    if (wrap) { // update modal in place to keep typed values
      const f = dom.content.querySelector('#docForm');
      const vals = { name: f.docName.value, desc: f.docDesc.value, category: f.docCategory.value, tags: f.docTags.value, url: f.docUrl ? f.docUrl.value : '', fav: f.docFav.checked };
      docPickedFile = null;
      dom.content.querySelector('.docs-page').outerHTML = renderDocListPage();
      const nf = dom.content.querySelector('#docForm');
      if (nf) { nf.docName.value = vals.name; nf.docDesc.value = vals.desc; nf.docTags.value = vals.tags; if (nf.docUrl) nf.docUrl.value = vals.url; nf.docFav.checked = vals.fav; }
    }
    return true;
  }
  if (btn.matches('[data-doc-menu]')) { docMenuId = btn.dataset.docMenu; docMoveOpen = false; renderShell(); return true; }
  if (btn.matches('[data-doc-menu-close]')) { docMenuId = null; docMoveOpen = false; renderShell(); return true; }
  if (btn.matches('[data-doc-closeform]')) { docCloseModal(); return true; }
  if (btn.matches('[data-doc-sheet-close]') && !btn.closest('.note-sheet')) { docMenuId = null; docMoveOpen = false; renderShell(); return true; }
  if (btn.matches('[data-doc-moveopen]')) { docMoveOpen = true; renderShell(); return true; }
  if (btn.dataset.docOpen2 != null) { const d = docFind(btn.dataset.docOpen2); docMenuId = null; docMoveOpen = false; renderShell(); if (d) docOpen(d); return true; }
  if (btn.dataset.docMove != null) {
    const [id, cat] = btn.dataset.docMove.split(':');
    const d = docFind(id);
    if (d) { d.category = cat; d.updatedAt = Date.now(); docSaveDocs(); }
    docMenuId = null; docMoveOpen = false; renderShell();
    showToast(`Dipindahkan ke “${cat}”.`);
    return true;
  }
  if (btn.dataset.docEdit != null) {
    const d = docFind(btn.dataset.docEdit);
    if (d) { docModal = 'edit'; docEditingId = d.id; docFormType = d.kind; docPickedFile = null; docMenuId = null; renderShell(); }
    return true;
  }
  if (btn.dataset.docFav != null) {
    const d = docFind(btn.dataset.docFav);
    if (d) { d.favorite = !d.favorite; d.updatedAt = Date.now(); docSaveDocs(); }
    docMenuId = null; renderShell();
    showToast(d?.favorite ? 'Ditandai favorit.' : 'Favorit dilepas.');
    return true;
  }
  if (btn.dataset.docDel != null) {
    const d = docFind(btn.dataset.docDel);
    if (!d) return true;
    if (!window.confirm(`Hapus dokumen “${d.name}”?${d.kind === 'file' ? ' Berkas yang tersimpan ikut terhapus.' : ''}`)) { docMenuId = null; renderShell(); return true; }
    state.documents = docList().filter((x) => x.id !== d.id);
    docSaveDocs();
    docMenuId = null;
    renderShell();
    showToast('Dokumen dihapus.');
    return true;
  }
  const row = btn.matches('[data-doc-open]') ? btn : btn.closest('tr[data-doc-open]');
  if (row && !btn.closest('.note-sheet') && !btn.closest('.doc-modal')) {
    const d = docFind(row.dataset.docOpen);
    if (d) { docModal = 'edit'; docEditingId = d.id; docFormType = d.kind; docPickedFile = d.kind === 'file' ? { name: d.fileName || d.name, size: d.size || 0, type: d.fileType || 'text/plain', data: d.data || '' } : null; renderShell(); }
    return true;
  }
  return false;
}

/* ============ MODUL PROGRESS (statistik kebiasaan + task + goals) ============ */
let progressTab = 'minggu';

// Tracker Daily — pencarian global (⌘K / Ctrl+K)
// Classic script — urutan load: lihat <script> di public/index.html.
// Overlay mandiri: listener terikat pada elemennya sendiri (dihapus bersama elemen),
// jadi tidak perlu didaftarkan ke dispatcher global.
'use strict';

let gsQuery = '';
let gsOpen = false;

function openGlobalSearch() {
  gsOpen = true;
  gsQuery = '';
  renderGlobalSearch();
}

function closeGlobalSearch() {
  gsOpen = false;
  const w = document.getElementById('gsWrap');
  if (w) w.remove();
}

function gsMatches(text) {
  const q = gsQuery.trim().toLowerCase();
  if (!q) return true;
  return String(text || '').toLowerCase().includes(q);
}

function gsRows(items, render) {
  const list = items.slice(0, render.limit);
  if (!list.length) return '';
  return `<div class="gs-group"><div class="gs-group-name">${render.label} <em>${items.length}</em></div>${list.map(render.html).join('')}</div>`;
}

function gsResultsHtml() {
  if (!gsQuery.trim()) {
    return `<div class="gs-empty">Ketik untuk mencari di seluruh tracker — goal, project, task, catatan, dokumen, transaksi, agenda, dan kebiasaan.</div>`;
  }
  const q = gsQuery.trim().toLowerCase();
  const hit = (s) => String(s || '').toLowerCase().includes(q);
  const goalRes = loadGoals().filter((g) => hit(g.title) || hit(g.description) || hit(g.category));
  const projRes = loadProjects().filter((p) => hit(p.name) || hit(p.goalId));
  const taskRes = loadTasks().filter((t) => hit(t.title) || hit(t.project));
  const dailyRes = loadDailyTasks().filter((t) => t && t.id && (hit(t.title) || hit(t.category)));
  const noteRes = loadNotes().filter((n) => hit(n.title) || hit(n.body) || hit(n.category));
  const docRes = (Array.isArray(state.documents) ? state.documents : []).filter((d) => hit(d.name) || hit(d.category) || hit(d.desc));
  const txRes = (Array.isArray(state.transactions) ? state.transactions : []).filter((t) => hit(t.note) || hit(t.cat)).slice(-40);
  const jadRes = loadJadwalEvents().filter((e) => hit(e.title) || hit(e.category));

  const html = [
    gsRows(goalRes, {
      label: 'Goals', limit: 5,
      html: (g) => `<button type="button" class="gs-row" data-gs-open="goal:${g.id}"><span class="gs-row-ico">🎯</span><span class="gs-row-main"><b>${escapeHtml(g.title)}</b><small>${escapeHtml(g.category || 'Goal')} · ${goalProgress(g).pct}%</small></span><span class="gs-row-go">→</span></button>`,
    }),
    gsRows(projRes, {
      label: 'Project', limit: 5,
      html: (p) => `<button type="button" class="gs-row" data-gs-open="project:${p.id}"><span class="gs-row-ico">${escapeHtml(p.icon || '📁')}</span><span class="gs-row-main"><b>${escapeHtml(p.name)}</b><small>Project</small></span><span class="gs-row-go">→</span></button>`,
    }),
    gsRows(noteRes, {
      label: 'Catatan', limit: 5,
      html: (n) => `<button type="button" class="gs-row" data-gs-open="note:${n.id}"><span class="gs-row-ico">📝</span><span class="gs-row-main"><b>${escapeHtml(n.title)}</b><small>Catatan${n.category ? ' · ' + escapeHtml(n.category) : ''}</small></span><span class="gs-row-go">→</span></button>`,
    }),
    gsRows(dailyRes, {
      label: 'Kegiatan & Rutinitas', limit: 5,
      html: (t) => `<button type="button" class="gs-row" data-gs-open="task"><span class="gs-row-ico">✅</span><span class="gs-row-main"><b>${escapeHtml(t.title)}</b><small>Daily Task${t.category ? ' · ' + escapeHtml(t.category) : ''}</small></span><span class="gs-row-go">→</span></button>`,
    }),
    gsRows(taskRes, {
      label: 'Project Task', limit: 5,
      html: (t) => `<button type="button" class="gs-row" data-gs-open="task"><span class="gs-row-ico">🧩</span><span class="gs-row-main"><b>${escapeHtml(t.title)}</b><small>${escapeHtml(t.project || 'Tanpa project')}</small></span><span class="gs-row-go">→</span></button>`,
    }),
    gsRows(docRes, {
      label: 'Dokumen', limit: 5,
      html: (d) => `<button type="button" class="gs-row" data-gs-open="dokumen"><span class="gs-row-ico">📎</span><span class="gs-row-main"><b>${escapeHtml(d.name)}</b><small>Dokumen${d.category ? ' · ' + escapeHtml(d.category) : ''}</small></span><span class="gs-row-go">→</span></button>`,
    }),
    gsRows(jadRes, {
      label: 'Agenda', limit: 5,
      html: (e) => `<button type="button" class="gs-row" data-gs-open="jadwal"><span class="gs-row-ico">📅</span><span class="gs-row-main"><b>${escapeHtml(e.title)}</b><small>${escapeHtml(e.date || '')}${e.time ? ' · ' + escapeHtml(e.time) : ''}</small></span><span class="gs-row-go">→</span></button>`,
    }),
    gsRows(txRes, {
      label: 'Transaksi', limit: 6,
      html: (t) => `<button type="button" class="gs-row" data-gs-open="transaksi"><span class="gs-row-ico">${t.type === 'masuk' ? '↑' : '↓'}</span><span class="gs-row-main"><b>${escapeHtml(t.note || t.cat || 'Transaksi')}</b><small>${escapeHtml(t.cat || '')} · ${dashCompact ? dashCompact(t.amount) : t.amount}</small></span><span class="gs-row-go">→</span></button>`,
    }),
  ].join('');

  if (!html) return `<div class="gs-empty">Tidak ada hasil untuk “${escapeHtml(gsQuery)}”.</div>`;
  return html;
}

function handleGsOpen(el) {
  const key = el.getAttribute('data-gs-open') || '';
  const [kind, id] = key.split(':');
  if (kind === 'goal' && id) { goalsPage = 'detail'; goalsDetailId = id; activeView = 'goals'; }
  else if (kind === 'project' && id) { projPage = 'detail'; projDetailId = id; projTab = 'overview'; activeView = 'project'; }
  else if (kind === 'note' && id) { notePage = 'detail'; noteId = id; activeView = 'catatan'; }
  else if (kind === 'task') { activeView = 'task'; }
  else if (kind === 'dokumen') { activeView = 'dokumen'; }
  else if (kind === 'jadwal') { activeView = 'jadwal'; }
  else if (kind === 'transaksi') { activeView = 'transaksi'; }
  else { activeView = 'dashboard'; }
  if (typeof state !== 'undefined') { state.selectedView = activeView; saveState(); }
  closeGlobalSearch();
  renderShell();
}

function renderGlobalSearch() {
  const old = document.getElementById('gsWrap');
  if (old) old.remove();
  const wrap = document.createElement('div');
  wrap.id = 'gsWrap';
  wrap.className = 'gs-wrap';
  wrap.innerHTML = `
    <div class="gs-backdrop" data-gs-close></div>
    <div class="gs-card" role="dialog" aria-modal="true" aria-label="Pencarian global">
      <div class="gs-inputrow">
        <span class="gs-ico" aria-hidden="true">🔍</span>
        <input id="gsInput" type="search" placeholder="Cari di seluruh tracker…" autocomplete="off" value="${escapeHtml(gsQuery)}" aria-label="Pencarian global" />
        <kbd>Esc</kbd>
      </div>
      <div class="gs-results">${gsResultsHtml()}</div>
    </div>`;
  wrap.addEventListener('click', (event) => {
    if (event.target.closest('[data-gs-close]')) { closeGlobalSearch(); return; }
    const open = event.target.closest('[data-gs-open]');
    if (open) handleGsOpen(open);
  });
  wrap.addEventListener('input', (event) => {
    if (event.target.id === 'gsInput') {
      gsQuery = event.target.value;
      renderGlobalSearch();
      const inp = document.getElementById('gsInput');
      if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
    }
  });
  wrap.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeGlobalSearch();
  });
  document.body.appendChild(wrap);
  const inp = document.getElementById('gsInput');
  if (inp) inp.focus();
}

const gsBtn = document.getElementById('globalSearchBtn');
if (gsBtn) gsBtn.addEventListener('click', openGlobalSearch);

// Pintasan keyboard global: Ctrl/Cmd+K membuka pencarian.
document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && (event.key === 'k' || event.key === 'K')) {
    event.preventDefault();
    if (gsOpen) closeGlobalSearch();
    else openGlobalSearch();
  }
});

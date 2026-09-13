// Tracker Daily — miawai
// Dipisah dari public/app.js (refactor modular; tidak ada identifier yang di-rename).
// Classic script — urutan load: lihat <script> di public/index.html.
'use strict';


function miawSiteContext() {
  try {
    const goals = loadGoals().slice(0, 12).map((g) => `${g.title} [${(GOAL_TERMS[g.term] || {}).label || g.term || '-'}] ${g.status || ''}`).join('; ');
    const projs = loadProjects().slice(0, 12).map((p) => `${p.name || p.title} (${p.status || ''})`).join('; ');
    const tasks = loadTasks().slice(0, 15).map((t) => `${t.title}${t.done ? ' ✓' : ''} @${t.project || '-'}`).join('; ');
    const habitLines = [];
    Object.values(state.years || {}).forEach((yr) => {
      Object.values(yr.categories || {}).forEach((cat) => {
        (cat.habits || []).slice(0, 40).forEach((h) => {
          habitLines.push(`${cat.name || 'kategori'}/${h.name}${h.active === false ? ' (nonaktif)' : ''}`);
        });
      });
    });
    const habits = [...new Set(habitLines)].slice(0, 25).join('; ');
    return [
      'KONTEKS SINGKAT DATA USER (pakai hanya untuk menjawab seputar website/Habit/Goals):',
      `Goals: ${goals || '(belum ada)'}`,
      `Projects: ${projs || '(belum ada)'}`,
      `Tasks: ${tasks || '(belum ada)'}`,
      `Habits: ${habits || '(belum ada)'}`,
    ].join('\n');
  } catch (e) {
    return 'Konteks data tidak tersedia.';
  }
}

function miawBubble(msg) {
  const who = msg.role === 'user' ? 'you' : 'ai';
  const files = (msg.files && msg.files.length) ? `<span class="miaw-msg-files">📎 ${msg.files.map(escapeHtml).join(', ')}</span>` : '';
  const inner = (!msg.content && msg.role === 'assistant')
    ? '<span class="miaw-typing"><i></i><i></i><i></i></span>'
    : (msg.role === 'user' ? escapeHtml(msg.content).replace(/\n/g, '<br/>') : miawSimpleMarkdown(msg.content));
  const avatar = msg.role === 'assistant' ? '<span class="miaw-avatar">🐱</span>' : '';
  return `<div class="miaw-msg miaw-${who}">${avatar}<div class="miaw-bubble">${files}<div class="miaw-text">${inner}</div></div></div>`;
}

function miawSimpleMarkdown(text) {
  const esc = escapeHtml(text || '');
  const lines = esc.split('\n');
  const html = [];
  let list = null;
  const closeList = () => { if (list) { html.push(`</${list}>`); list = null; } };
  const inline = (s) => s
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`\n]+)`/g, '<code>$1</code>');
  for (const raw of lines) {
    const ln = raw.trim();
    let m;
    if ((m = ln.match(/^[-•*] +(.*)$/))) {
      if (list !== 'ul') { closeList(); html.push('<ul>'); list = 'ul'; }
      html.push(`<li>${inline(m[1])}</li>`);
    } else if ((m = ln.match(/^(\d+)[.)] +(.*)$/))) {
      if (list !== 'ol') { closeList(); html.push('<ol>'); list = 'ol'; }
      html.push(`<li>${inline(m[2])}</li>`);
    } else if ((m = ln.match(/^#{1,4} +(.*)$/))) {
      closeList();
      html.push(`<strong class="miaw-h">${inline(m[1])}</strong><br/>`);
    } else if (!ln) {
      closeList();
    } else {
      closeList();
      html.push(`${inline(ln)}<br/>`);
    }
  }
  closeList();
  let out = html.join('');
  out = out.replace(/<br\/>(<\/(?:ul|ol)>)/g, '$1');
  out = out.replace(/(<\/(?:ul|ol)>)<br\/>/g, '$1');
  out = out.replace(/(<\/(?:ul|ol)>)\s*<br\/>\s*<strong class="miaw-h">/g, '$1<strong class="miaw-h">');
  out = out.replace(/<br\/>\s*<(ul|ol)>/g, '<$1>');
  return out.replace(/(<\/(?:ul|ol)>)<br\/>\s*(?![\s\S]*<\/(?:ul|ol)>)/g, '$1');
}

function renderMiawAIView() {
  const modelOpts = MIAW_MODELS.map((m) => `<option value="${m.id}" ${m.id === miawModel ? 'selected' : ''}>${m.label}</option>`).join('');
  const body = miawMessages.length
    ? miawMessages.map(miawBubble).join('')
    : `<div class="miaw-empty">
         <div class="miaw-empty-avatar">🐱</div>
         <b class="miaw-empty-title">MiawAI</b>
         <p>Asisten khusus <strong>website ini</strong>, <strong>Habit</strong>, dan <strong>Goals</strong>.<br/>Tanya cara pakai fitur, minta saran kebiasaan, atau breakdown target — bisa lampirkan file untuk dianalisis.</p>
         <div class="miaw-suggests">
           <button type="button" class="miaw-suggest" data-miaw-q="Bagaimana cara membuat Goals dan Project di website ini?"><span>🎯</span> Cara pakai Goals &amp; Project</button>
           <button type="button" class="miaw-suggest" data-miaw-q="Bantu aku bikin rencana kebiasaan pagi yang konsisten"><span>🌅</span> Saran Habit pagi</button>
           <button type="button" class="miaw-suggest" data-miaw-q="Pecah goalsku jadi target jangka pendek yang realistis"><span>🪜</span> Breakdown Goals</button>
         </div>
       </div>`;
  const files = miawFiles.length
    ? `<div class="miaw-files">${miawFiles.map((f, i) => `<span class="miaw-file">📄 ${escapeHtml(f.name)}<button type="button" data-miaw-rmfile="${i}" aria-label="Hapus lampiran">✕</button></span>`).join('')}</div>`
    : '';
  return `
    <div class="miaw-layout">
      <section class="panel miaw-panel">
        <div class="miaw-topbar">
          <div class="miaw-brand">
            <span class="miaw-brand-avatar">🐱</span>
            <span class="miaw-brand-text"><b>MiawAI</b><small>Website · Habit · Goals</small></span>
          </div>
          <div class="miaw-tools">
            <label class="miaw-model-pick" title="Pilih model AI">
              <select id="miawModelSel" aria-label="Pilih model AI">${modelOpts}</select>
            </label>
            <button class="miaw-newchat" type="button" data-action="miaw-new" title="Mulai obrolan baru">＋</button>
          </div>
        </div>
        <div class="miaw-chat" id="miawChat">${body}</div>
        ${files}
        <div class="miaw-composer">
          <input type="file" id="miawFile" hidden multiple accept=".txt,.md,.csv,.tsv,.json,.log,.html,.js,.xml,.yml,.yaml,text/plain,text/markdown,text/csv,application/json" />
          <button class="miaw-attach" type="button" data-action="miaw-attach" title="Lampirkan file untuk dianalisis" aria-label="Lampirkan file">📎</button>
          <input id="miawInput" type="text" placeholder="Tanya seputar website, Habit, atau Goals…" value="${escapeHtml(miawDraft)}" autocomplete="off" />
          <button class="miaw-send" type="button" data-action="miaw-send" ${miawBusy ? 'disabled' : ''} aria-label="Kirim pesan">${miawBusy ? '<span class="miaw-spin"></span>' : '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4Z"/></svg>'}</button>
        </div>
      </section>
    </div>
  `;
}

async function miawSend(text) {
  const content = String(text || '').trim();
  if (!content || miawBusy) return;
  const files = miawFiles.slice();
  miawFiles = [];
  miawDraft = '';
  let userContent = content;
  if (files.length) {
    userContent += '\n\n' + files.map((f) => `--- FILE: ${f.name} ---\n${f.text.slice(0, MIAW_FILE_MAX)}`).join('\n\n');
  }
  if (!miawContextSent) {
    userContent = miawSiteContext() + '\n\nPERTANYAAN USER:\n' + userContent;
    miawContextSent = true;
  }
  miawMessages.push({ role: 'user', content, files: files.map((f) => f.name) });
  miawMessages.push({ role: 'assistant', content: '' });
  miawBusy = true;
  renderShell();
  miawScrollBottom();
  try {
    const payload = miawMessages.slice(0, -1).filter((m) => m.content).map((m) => ({ role: m.role, content: m.content }));
    payload[payload.length - 1] = { role: 'user', content: userContent };
    const res = await fetch('/api/miawai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: miawModel, messages: payload }),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data || typeof data.reply !== 'string') {
      miawMessages[miawMessages.length - 1].content = '⚠️ ' + ((data && data.error) || 'MiawAI sedang tidak tersedia. Coba lagi.');
    } else {
      miawMessages[miawMessages.length - 1].content = data.reply;
    }
  } catch (e) {
    miawMessages[miawMessages.length - 1].content = '⚠️ Gagal terhubung ke MiawAI. Periksa koneksi lalu coba lagi.';
  } finally {
    miawBusy = false;
    renderShell();
    miawScrollBottom();
  }
}

function miawScrollBottom() {
  const el = dom.content.querySelector('#miawChat');
  if (el) el.scrollTop = el.scrollHeight;
}

async function handleMiawFiles(inputEl) {
  const files = [...(inputEl.files || [])].slice(0, 5);
  inputEl.value = '';
  for (const f of files) {
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    if (!['txt', 'md', 'csv', 'tsv', 'json', 'log', 'html', 'js', 'xml', 'yml', 'yaml'].includes(ext)) {
      showToast(`File ${f.name}: format tidak didukung (teks saja).`);
      continue;
    }
    try {
      const text = await f.text();
      miawFiles.push({ name: f.name, text: text.slice(0, 120000) });
    } catch (e) {
      showToast(`Gagal membaca ${f.name}.`);
    }
  }
  renderShell();
}

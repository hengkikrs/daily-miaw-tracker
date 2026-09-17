// Tracker Daily — 06-lang.js
// Pemilihan bahasa EN/ID + mesin terjemahan DOM.
// Pendekatan: aplikasi merender teks Indonesia; saat EN aktif, satu lapisan
// pasca-render menerjemahkan text node & atribut memakai kamus I18N_EN
// (lihat 06b-i18n-dict.js). Tidak ada modul lain yang perlu diubah.
// Simbol: APP_LANG, LANG_KEY, t, applyLang, toggleLang, initLang, translateDom, watchI18n
'use strict';

const LANG_KEY = 'miaw-tracker.lang';

// Label chrome (dipakai langsung oleh renderShell/akun) — sumber kebenaran ganda
// dengan kamus DOM: kunci 'nav.*'/'page.*'/'acct.*'/'theme.*'.
const APP_STRINGS = {
  'nav.dashboard': { en: 'Dashboard', id: 'Dashboard' },
  'nav.month': { en: 'Monthly Tracker', id: 'Pelacakan Bulanan' },
  'nav.activity': { en: 'Activity', id: 'Activity' },
  'nav.daily': { en: 'Daily Task', id: 'Daily Task' },
  'nav.jadwal': { en: 'Schedule', id: 'Jadwal' },
  'nav.goals': { en: 'Goals & Habit', id: 'Goals & Habit' },
  'nav.goals-sub': { en: 'Goals', id: 'Goals' },
  'nav.project': { en: 'Project', id: 'Project' },
  'nav.project-task': { en: 'Project Task', id: 'Project Task' },
  'nav.habit': { en: 'Habit', id: 'Habit' },
  'nav.organization': { en: 'Organization', id: 'Organization' },
  'nav.notes': { en: 'Notes', id: 'Catatan' },
  'nav.docs': { en: 'Documents', id: 'Dokumen' },
  'nav.finance': { en: 'Finance', id: 'Finance' },
  'nav.tx': { en: 'Transactions', id: 'Transaksi' },
  'nav.budget': { en: 'Budget', id: 'Budget' },
  'nav.savings': { en: 'Savings', id: 'Tabungan' },
  'nav.report-fin': { en: 'Financial Report', id: 'Laporan Keuangan' },
  'nav.export': { en: 'Export & Reports', id: 'Ekspor & Laporan' },
  'nav.ai': { en: 'MiawAI', id: 'MiawAI' },
  'nav.account': { en: 'Account', id: 'Akun' },
  'page.login': { en: 'Sign in', id: 'Masuk' },
  'page.login-sub': { en: 'Login required to open the tracker', id: 'Login diperlukan untuk membuka tracker' },
  'page.dashboard': { en: 'Dashboard', id: 'Dashboard' },
  'page.dashboard-sub': { en: 'Habit summary throughout', id: 'Ringkasan kebiasaan sepanjang' },
  'page.habits': { en: 'Habits', id: 'Kebiasaan' },
  'page.account': { en: 'Account', id: 'Akun' },
  'page.account-sub': { en: 'Profile & security settings', id: 'Pengaturan profil dan keamanan' },
  'page.task': { en: 'Daily Task', id: 'Daily Task' },
  'page.task-sub': { en: 'Daily routines outside projects', id: 'Kegiatan rutin harian di luar project' },
  'page.jadwal': { en: 'Schedule', id: 'Jadwal' },
  'page.jadwal-sub': { en: 'Daily & weekly plans', id: 'Rencana waktu harian & mingguan' },
  'page.progress': { en: 'Goals and Habit Progress', id: 'Goals and Habit Progress' },
  'page.progress-sub': { en: 'Track your consistency and growth', id: 'Grafik perkembangan dirimu' },
  'page.project': { en: 'Project', id: 'Project' },
  'page.project-sub': { en: 'Goal-based projects', id: 'Project berbasis goal' },
  'page.project-task': { en: 'Project Task', id: 'Project Task' },
  'page.goals': { en: 'Goals', id: 'Goals' },
  'page.notes': { en: 'Notes', id: 'Catatan' },
  'page.notes-sub': { en: 'Personal notes & ideas', id: 'Catatan pribadi & ide' },
  'page.docs': { en: 'Documents', id: 'Dokumen' },
  'page.docs-sub': { en: 'Document archive', id: 'Arsip dokumen' },
  'page.tx': { en: 'Transactions', id: 'Transaksi' },
  'page.tx-sub': { en: 'Money in & out', id: 'Uang masuk & keluar' },
  'page.budget': { en: 'Budget', id: 'Budget' },
  'page.budget-sub': { en: 'Monthly spending plan', id: 'Rencana belanja bulanan' },
  'page.savings': { en: 'Savings', id: 'Tabungan' },
  'page.savings-sub': { en: 'Savings targets & progress', id: 'Target tabungan & progres' },
  'page.report-fin': { en: 'Financial Report', id: 'Laporan Keuangan' },
  'page.report-fin-sub': { en: 'Cashflow & spending summary', id: 'Ringkasan arus kas & belanja' },
  'page.ai': { en: 'MiawAI', id: 'MiawAI' },
  'page.ai-sub': { en: 'AI assistant', id: 'Asisten AI' },
  'page.reports': { en: 'Export & Reports', id: 'Ekspor & Laporan' },
  'page.reports-sub': { en: 'Cross-module reports', id: 'Laporan lintas modul' },
  'acct.profile': { en: 'Account Profile', id: 'Profil Akun' },
  'acct.profile-sub': { en: 'Data used to sign in and appear in the app.', id: 'Data yang dipakai untuk masuk dan tampil di aplikasi.' },
  'acct.name': { en: 'Name', id: 'Nama' },
  'acct.username': { en: 'Username', id: 'Username' },
  'acct.email': { en: 'Email in use', id: 'Email yang digunakan' },
  'acct.phone': { en: 'Phone Number', id: 'Nomor Telepon' },
  'acct.save': { en: 'Save Profile', id: 'Simpan Profil' },
  'acct.security': { en: 'Security', id: 'Keamanan' },
  'acct.security-sub': { en: 'Password used to sign in to this account.', id: 'Password digunakan untuk masuk ke akun ini.' },
  'acct.changepw': { en: 'Change Password', id: 'Ubah Password' },
  'acct.tutorial': { en: 'Tutorial', id: 'Tutorial' },
  'acct.tutorial-sub': { en: 'Short guide on filling the tracker: habits, tasks, goals, notes, finance, and reports.', id: 'Panduan singkat cara mengisi tracker: kebiasaan, task, goals, catatan, keuangan, sampai laporan.' },
  'acct.replay': { en: 'Replay Tutorial', id: 'Putar Ulang Tutorial' },
  'acct.appearance': { en: 'Appearance', id: 'Tampilan' },
  'acct.appearance-sub': { en: 'Pick a website theme that suits your taste. Choice is saved per device.', id: 'Pilih tema website sesuai selera. Pilihan tersimpan di perangkat ini.' },
  'theme.light': { en: 'Green Light', id: 'Hijau Terang' },
  'theme.dark': { en: 'Green Dark', id: 'Hijau Gelap' },
  'theme.ocean': { en: 'Ocean', id: 'Samudra' },
  'theme.sunset': { en: 'Sunset', id: 'Senja' },
  'theme.mono': { en: 'Mono Slate', id: 'Slate Monokrom' },
  'theme.auto': { en: 'Follow device (light/dark)', id: 'Ikuti perangkat (terang/gelap)' },
};

let APP_LANG = 'id';
let i18nApplying = false;

function t(key) {
  const row = APP_STRINGS[key];
  if (!row) return key;
  return row[APP_LANG] || row.id || key;
}

/* ---------- kamus DOM (I18N_EN dari 06b-i18n-dict.js) ---------- */
function dictEn() {
  return (typeof I18N_EN === 'object' && I18N_EN) ? I18N_EN : {};
}

// Aturan pola untuk teks dinamis (angka + satuan).
const I18N_RULES = [
  [/^(\d+) hari lalu$/i, '$1 days ago'],
  [/^(\d+) hari$/i, '$1 days'],
  [/^(\d+) hari sebelum$/i, '$1 day before'],
  [/^(\d+) jam(?: (\d+) mnt)?$/i, (m) => (m[2] ? `${m[1]}h ${m[2]}m` : `${m[1]}h`)],
  [/^(\d+) menit$/i, '$1 minutes'],
  [/^(\d+) menit sebelum$/i, '$1 minutes before'],
  [/^(\d+) detik$/i, '$1 seconds'],
  [/^(\d+) bulan$/i, '$1 months'],
  [/^(\d+) tahun$/i, '$1 years'],
  [/^(\d+) terakhir$/i, 'last $1'],
  [/^(\d+) terakhir dari kas$/i, 'last $1 from cash'],
  [/^(.+) hari ini$/i, '$1 today'],
  [/^(.+) bulan ini$/i, '$1 this month'],
  [/^(.+) tahun ini$/i, '$1 this year'],
  [/^(\d+) dari (\d+)$/, '$1 of $2'],
  [/^Sisa (\d+) hari$/i, '$1 days left'],
  [/^(\d+)% dari target$/i, '$1% of target'],
];

function translateString(s) {
  if (!s) return s;
  const dict = dictEn();
  const trimmed = s.trim();
  if (!trimmed) return s;
  const hit = dict[trimmed];
  if (hit) return s.replace(trimmed, hit);
  for (const [rx, rep] of I18N_RULES) {
    const m = trimmed.match(rx);
    if (m) {
      const out = typeof rep === 'function' ? rep(m) : trimmed.replace(rx, rep);
      return s.replace(trimmed, out);
    }
  }
  return s;
}

const I18N_SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'CODE', 'PRE', 'TEXTAREA', 'SVG', 'PATH', 'CANVAS']);
const I18N_ATTRS = ['placeholder', 'title', 'aria-label'];

function i18nSkipNode(el) {
  for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
    if (I18N_SKIP_TAGS.has(n.tagName)) return true;
    if (n.dataset && n.dataset.noI18n !== undefined) return true;
    if (n.isContentEditable) return true;
  }
  return false;
}

// Terjemahkan seluruh text node + atribut di dalam root (default: <body>).
function translateDom(root) {
  const scope = root || document.body;
  if (!scope || APP_LANG !== 'en') return;
  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, null);
  const nodes = [];
  let node = walker.nextNode();
  while (node) {
    if (!i18nSkipNode(node.parentElement)) nodes.push(node);
    node = walker.nextNode();
  }
  const dict = dictEn();
  if (!Object.keys(dict).length) return;
  i18nApplying = true;
  try {
    for (const n of nodes) {
      const out = translateString(n.nodeValue);
      if (out !== n.nodeValue) n.nodeValue = out;
    }
    const els = scope.querySelectorAll('[placeholder],[title],[aria-label]');
    els.forEach((el) => {
      if (i18nSkipNode(el)) return;
      I18N_ATTRS.forEach((a) => {
        const v = el.getAttribute(a);
        if (!v) return;
        const out = translateString(v);
        if (out !== v) el.setAttribute(a, out);
      });
    });
  } finally {
    i18nApplying = false;
  }
}

let i18nObserver = null;
// Amati perubahan DOM (render ulang modul, toast, modal) lalu terjemahkan.
// Mutasi yang tiba saat pass terjemahan lain berjalan TIDAK dibuang — antre
// dan diproses di frame berikutnya, supaya node hasil render ulang tidak lolos.
function watchI18n() {
  if (i18nObserver) return;
  const pending = new Set();
  let scheduled = false;
  const flush = () => {
    scheduled = false;
    i18nApplying = false;
    const batch = [...pending];
    pending.clear();
    batch.forEach((el) => { if (el.isConnected) translateDom(el); });
  };
  i18nObserver = new MutationObserver((records) => {
    if (APP_LANG !== 'en') return;
    records.forEach((r) => {
      if (r.type === 'characterData') { if (r.target.parentElement) pending.add(r.target.parentElement); return; }
      r.addedNodes.forEach((n) => {
        if (n.nodeType === 1) pending.add(n);
        else if (n.nodeType === 3 && n.parentElement) pending.add(n.parentElement);
      });
    });
    if (!pending.size || scheduled) return;
    scheduled = true;
    requestAnimationFrame(flush);
  });
  i18nObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
}

function applyLang(lang) {
  APP_LANG = lang === 'en' ? 'en' : 'id';
  localStorage.setItem(LANG_KEY, APP_LANG);
  document.documentElement.lang = APP_LANG;
  // Nama bulan ikut bahasa (MONTHS dipakai lintas modul).
  if (typeof MONTHS_ID !== 'undefined' && typeof MONTHS_EN !== 'undefined') {
    MONTHS = APP_LANG === 'en' ? MONTHS_EN : MONTHS_ID;
  }
}

function toggleLang() {
  applyLang(APP_LANG === 'id' ? 'en' : 'id');
}

function initLang() {
  const saved = localStorage.getItem(LANG_KEY);
  APP_LANG = saved === 'en' ? 'en' : 'id';
  document.documentElement.lang = APP_LANG;
  if (typeof MONTHS_ID !== 'undefined' && typeof MONTHS_EN !== 'undefined') {
    MONTHS = APP_LANG === 'en' ? MONTHS_EN : MONTHS_ID;
  }
  watchI18n();
}

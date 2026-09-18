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

// Aturan pola untuk teks dinamis (angka + satuan). Dipakai SETELAH lapis kata.
const I18N_RULES = [
  [/^Masukkan kode OTP yang dikirim ke (.+)\.$/i, 'Enter the OTP code sent to $1.'],
  [/^Kode belum masuk\? Tunggu (\d+) detik untuk kirim ulang\.$/i,
    (m) => `Code not received yet? Wait ${m[1]} second${m[1] === '1' ? '' : 's'} to resend.`],
  [/^Baru \((\d+) hari(?:s)?\)$/i, (m) => `New (${m[1]} days)`],
  [/^Diperbarui (\d+) jam lalu$/i, (m) => `Last updated ${m[1]} hour${m[1] === '1' ? '' : 's'} ago`],
  [/^Diperbarui (\d+) hari lalu$/i, (m) => `Last updated ${m[1]} day${m[1] === '1' ? '' : 's'} ago`],
  [/^Diperbarui (\d+) menit lalu$/i, (m) => `Last updated ${m[1]} minute${m[1] === '1' ? '' : 's'} ago`],
  [/^Diperbarui (.+)$/i, 'Last updated $1'],
  [/^(?:Kebiasaan|Habits) paling konsisten \((.+)\)$/i, 'Most consistent habits ($1)'],
  [/^(\d+) hari lalu$/i, (m) => `${m[1]} day${m[1] === '1' ? '' : 's'} ago`],
  [/^(\d+) hari sebelum$/i, '$1 day before'],
  [/^(\d+) jam(?: (\d+) mnt)?$/i, (m) => (m[2] ? `${m[1]}h ${m[2]}m` : `${m[1]}h`)],
  [/^(\d+) menit sebelum$/i, '$1 minutes before'],
  [/^(\d+) terakhir dari kas$/i, 'last $1 from cash'],
  [/^(\d+) dari (\d+)$/, '$1 of $2'],
  [/^Sisa (\d+) hari$/i, '$1 days left'],
  [/^(\d+) Kebiasaan Harian Paling Konsisten$/i, '$1 Most Consistent Daily Habits'],
  [/^(\d+) Kebiasaan Harian yang Perlu Ditingkatkan$/i, '$1 Daily Habits Needing Improvement'],
  [/^Budget periode ini (.+) dengan terpakai (.+) \((.+)\)\.$/i, 'Budget this period $1 with $2 used ($3).'],
  [/^Rasio tabungan (.+) dari pemasukan, setoran tabungan periode ini (.+)\.$/i, 'Savings ratio $1 of income, savings deposits this period $2.'],
  [/^Isi laporan mengikuti data tiap menu pada periode (.+)\.$/i, 'Report content follows each menu\u2019s data for the period $1.'],
  [/^(\d+) September 2026: nilai (\d+) \((\d+) dari (\d+) poin\)$/i, '$1 September 2026: value $2 ($3 of $4 points)'],
  [/^(\d+) target masih berjalan; setoran rutin (.+) bisa menambah (.+) ke tabungan\.$/i,
    (m) => `${m[1]} target${m[1] === '1' ? '' : 's'} still active; regular deposits of ${m[2].replace('/bln', '/mo')} can add ${m[3].replace(/ rb$/, 'k')} to savings.`],
  [/^Prioritas (tinggi|sedang|rendah): (\d+) (?:tugas|tasks?|todos?) \((.+)\)$/i, (m) => `Priority ${m[1] === 'tinggi' ? 'high' : m[1] === 'sedang' ? 'medium' : 'low'}: ${m[2]} task${m[2] === '1' ? '' : 's'} (${m[3]})`],
  [/^(\d+) target aktif\/selesai \u00b7 (\d+) tercapai$/i, '$1 active/completed targets \u00b7 $2 achieved'],
  [/^Pengeluaran terbesar: (.+)$/i, 'Largest expenses: $1'],
];

// Lapis 2 — kamus kata/frasa untuk teks dinamis hasil interpolasi
// ("0 dari 280 poin harian", "1 September — belum ada transaksi").
// Frasa lebih panjang menang; hanya diterapkan pada string yang tampak UI
// (mengandung angka, pendek, atau ≥2 kata cocok) agar konten pengguna utuh.
const I18N_WORDS = {
  'belum ada': 'no', 'tidak ada': 'no', 'hari lalu': 'days ago', 'jam lalu': 'hours ago',
  'menit lalu': 'minutes ago', 'hari lagi': 'days left', 'hari masuk': 'days in',
  'hari keluar': 'days out', 'terbesar': 'largest', 'kegiatan hari ini': 'activities today',
  'kegiatan bulan ini': 'activities this month', 'kebiasaan harian': 'daily habits',
  'kebiasaan aktif': 'active habits', 'poin harian': 'daily points', 'poin selesai': 'points completed',
  'poin didapat': 'points earned', 'task selesai': 'tasks done', 'target aktif': 'active targets',
  'goals aktif': 'active goals', 'blok data': 'data blocks', 'pos anggaran': 'budget lines',
  'bulan lalu': 'last month', 'bulan ini': 'this month', 'hari ini': 'today', 'tahun ini': 'this year',
  'minggu ini': 'this week', 'rutinitas': 'routines', 'kegiatan': 'activities', 'kebiasaan': 'habits',
  'transaksi': 'transactions', 'milestone': 'milestones', 'task': 'tasks', 'poin': 'points',
  'slot': 'slots', 'target': 'targets', 'goal': 'goals', 'catatan': 'notes', 'dokumen': 'documents',
  'jadwal': 'schedules', 'bulan': 'months', 'tahun': 'years', 'kategori': 'categories',
  'tercapai': 'achieved', 'aktif': 'active', 'selesai': 'done', 'dari': 'of', 'dan': 'and',
  'masuk': 'in', 'keluar': 'out', 'pagu': 'cap', 'pos': 'lines', 'tugas': 'tasks',
  'hari': 'days', 'jam': 'hours', 'menit': 'minutes', 'minggu': 'weeks', 'skor': 'score',
  'buka': 'open', 'lihat': 'view', 'pilih': 'pick', 'belum': 'not yet', 'dengan': 'with', 'tambah': 'add',
  'periode ini': 'this period', 'setoran tabungan': 'savings deposits', 'rasio tabungan': 'savings ratio',
  'pemasukan': 'income', 'pengeluaran bulanan': 'monthly expenses', 'bulan depan': 'next month',
  'kas': 'cash', 'ringkasan': 'summary', 'capaian': 'achievement',
  // kategori (label tampilan; nilai tersimpan tidak diubah)
  'makanan': 'food', 'transportasi': 'transport', 'belanja': 'shopping', 'tagihan': 'bills',
  'hiburan': 'entertainment', 'gaji': 'salary', 'kesehatan': 'health', 'pendidikan': 'education',
  'lainnya': 'other', 'kebutuhan pokok': 'essentials', 'umum': 'general', 'pribadi': 'personal',
  'karier': 'career', 'keuangan': 'finance', 'bisnis': 'business', 'belajar': 'study',
  'liburan': 'holiday', 'jurnal': 'journal', 'referensi': 'references', 'proyek': 'project',
  'pengeluaran terbesar': 'largest expenses', 'pendapatan': 'income', 'pemasukan': 'income',
  'laporan keuangan': 'financial report', 'laporan': 'report',
  'diperbarui': 'last updated', 'paling konsisten': 'most consistent',
  'umum': 'general', 'kemarin': 'yesterday', 'terakhir': 'last', 'rata-rata': 'average',
  'rekap': 'recap', 'kuliah': 'lecture', 'pekerjaan': 'work', 'diarsipkan': 'archived',
  'siap diunduh': 'ready to download', 'pada': 'at',
  // hari & sapaan
  'senin': 'Monday', 'selasa': 'Tuesday', 'rabu': 'Wednesday', 'kamis': 'Thursday',
  'jumat': 'Friday', 'sabtu': 'Saturday', 'minggu': 'weeks', 'min': 'Sun', 'sen': 'Mon',
  'sel': 'Tue', 'rab': 'Wed', 'kam': 'Thu', 'jum': 'Fri', 'sab': 'Sat',
  'selamat pagi': 'good morning', 'selamat siang': 'good afternoon',
  'selamat sore': 'good evening', 'selamat malam': 'good night',
  'masih berjalan': 'still active', 'setoran rutin': 'regular deposits', 'bisa menambah': 'can add',
  'ke tabungan': 'to savings', '/bln': '/mo', 'per bulan': 'per month', 'per hari': 'per day',
};

function escapeRx(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function matchCase(src, out) {
  if (!src || !out) return out;
  if (src === src.toUpperCase() && src !== src.toLowerCase()) return out.toUpperCase();
  if (src[0] === src[0].toUpperCase()) return out[0].toUpperCase() + out.slice(1);
  return out;
}

const I18N_WORD_KEYS = Object.keys(I18N_WORDS).sort((a, b) => b.length - a.length);

// Bentuk tunggal untuk hasil terjemahan (dipakai setelah angka 1).
const EN_SINGULAR = {
  tasks: 'task', points: 'point', days: 'day', months: 'month', years: 'year',
  weeks: 'week', hours: 'hour', minutes: 'minute', slots: 'slot', milestones: 'milestone',
  activities: 'activity', routines: 'routine', habits: 'habit', transactions: 'transaction',
  notes: 'note', documents: 'document', targets: 'target', goals: 'goal', reports: 'report',
  categories: 'category', schedules: 'schedule', lines: 'line', projects: 'project',
};

// Terjemahan tingkat kata: null bila tak ada yang cocok.
// Spasi/newline dinormalkan lebih dulu supaya frasa ("kegiatan hari ini")
// tetap cocok walau di DOM terpecah baris.
function translateWords(raw) {
  const s = raw.replace(/\s+/g, ' ');
  let out = s;
  let hits = 0;
  for (const key of I18N_WORD_KEYS) {
    const rx = new RegExp('(^|[^\\p{L}])(' + escapeRx(key) + ')(?![\\p{L}])', 'giu');
    out = out.replace(rx, (m, pre, word) => { hits += 1; return pre + matchCase(word, I18N_WORDS[key]); });
  }
  if (!hits || out === s) return null;
  // Bentuk tunggal setelah angka 1 ("1 tasks" -> "1 task", "1 days" -> "1 day").
  out = out.replace(/(^|[^\p{L}])1\s+([A-Za-z]+)/gu, (m, pre, w) => {
    const sing = EN_SINGULAR[w.toLowerCase()];
    return sing ? pre + '1 ' + matchCase(w, sing) : m;
  });
  // Kalimat panjang (prosa pengguna: catatan, deskripsi goal/project) dibiarkan utuh —
  // hanya UI pendek/berangka yang diterjemahkan tingkat kata.
  const words = s.split(/\s+/).length;
  if (words > 8 && s.length > 60) return null;
  if (/\d/.test(s) || s.length <= 30 || hits >= 2) return out;
  return null;
}

function translateString(s) {
  if (!s) return s;
  const dict = dictEn();
  const trimmed = s.trim();
  if (!trimmed) return s;
  const lead = s.match(/^\s*/)[0];
  const tail = s.match(/\s*$/)[0];
  const flat = trimmed.replace(/\s+/g, ' ');

  // Lapis 1 — kecocokan persis (teks utuh maupun versi spasi-dinormalkan).
  const hit = dict[trimmed] || dict[flat];
  if (hit) return lead + hit + tail;

  // Prefix simbol/emoji ("💡 3 target ...", "🧾 Rekap ...") dipisah supaya
  // aturan berpola tetap cocok; simbolnya ditempel ulang apa adanya.
  const symMatch = flat.match(/^[^\p{L}\p{N}]+/u);
  const symLead = symMatch ? symMatch[0] : '';
  const body = symLead ? flat.slice(symLead.length).trim() : flat;

  const coreOut = translateCore(body, dict);
  if (coreOut) return lead + symLead + coreOut + tail;

  // Lapis terakhir — kamus kata atas teks utuh (termasuk prefix simbol).
  const worded = translateWords(flat);
  if (worded) return lead + worded + tail;
  return s;
}

// Terjemahkan satu potongan tanpa prefix simbol: panah → aturan pola → kata.
function translateCore(text, dict) {
  if (!text) return null;

  // Panah "→" yang ditempel template (`${cta} →`) berada di luar kamus.
  const arrow = text.match(/\s*→$/);
  if (arrow) {
    const core = text.slice(0, arrow.index).trim();
    const coreHit = dict[core] || translateWords(core);
    if (coreHit) return coreHit + ' →';
  }

  const exact = dict[text];
  if (exact) return exact;

  // Aturan pola (angka/satuan/tanggal) dijalankan SEBELUM kamus kata supaya
  // kalimat berformat tetap utuh (mis. "Diperbarui 3 jam lalu").
  for (const [rx, rep] of I18N_RULES) {
    const m = text.match(rx);
    if (m) {
      const out = typeof rep === 'function' ? rep(m) : text.replace(rx, rep);
      return translateWords(out) || out;
    }
  }

  return translateWords(text);
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

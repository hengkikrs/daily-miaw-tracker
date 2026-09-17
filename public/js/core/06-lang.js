// Tracker Daily — 06-lang.js
// Pemilihan bahasa EN/ID (toggle kiri-atas topbar). Memuat SEBELUM 09-router.js.
// Simbol: APP_LANG, initLang, applyLang, t(), toggleLang
'use strict';

const LANG_KEY = 'miaw-tracker.lang';
const APP_STRINGS = {
  // Sidebar
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
  // Topbar
  'app.subtitle': { en: 'Daily, weekly, and monthly tracking', id: 'Jejak harian, mingguan, dan bulanan' },
  // Router judul halaman
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
  // Halaman akun
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
  'acct.theme-names': { en: 'Theme', id: 'Tema' },
  // Tema (5 pilihan + auto)
  'theme.light': { en: 'Green Light', id: 'Hijau Terang' },
  'theme.dark': { en: 'Green Dark', id: 'Hijau Gelap' },
  'theme.ocean': { en: 'Ocean', id: 'Samudra' },
  'theme.sunset': { en: 'Sunset', id: 'Senja' },
  'theme.mono': { en: 'Mono Slate', id: 'Slate Monokrom' },
  'theme.auto': { en: 'Follow device (light/dark)', id: 'Ikuti perangkat (terang/gelap)' },
  'theme.group-title': { en: 'Website theme', id: 'Tema website' },
};

let APP_LANG = localStorage.getItem(LANG_KEY) || 'id';

function t(key) {
  const row = APP_STRINGS[key];
  if (!row) return key;
  return row[APP_LANG] || row.id || key;
}

function applyLang(lang) {
  APP_LANG = APP_STRINGS && lang === 'en' ? 'en' : 'id';
  localStorage.setItem(LANG_KEY, APP_LANG);
  document.documentElement.lang = APP_LANG;
}

function toggleLang() {
  applyLang(APP_LANG === 'id' ? 'en' : 'id');
}

function initLang() {
  const saved = localStorage.getItem(LANG_KEY);
  APP_LANG = saved === 'en' ? 'en' : 'id';
  document.documentElement.lang = APP_LANG;
}

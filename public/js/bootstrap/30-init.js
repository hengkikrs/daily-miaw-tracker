// Tracker Daily — 30-init
// Dipisah dari public/app.js (refactor modular; tidak ada identifier yang di-rename).
// Classic script — urutan load: lihat <script> di public/index.html.
'use strict';


async function init() {
  initLang();
  initTheme();
  await consumeOAuthCallback();
  if (authSession) await getAccessToken();
  ensureYear(activeYear);
  saveState();
  bindEvents();
  renderShell();
  if (APP_LANG === 'en') translateDom();
  await hydrateRemoteState();
  // Tutorial pop-up: muncul sekali per akun (lihat js/modules/onboarding.js)
  maybeStartOnboarding();
}

/* ============ MODUL LAPORAN (laporan lintas modul: preview + PDF + DOC + AI) ============ */
const LAP_SECTIONS = [
  { key: 'activity', label: 'Activity', desc: 'Daily Task & Jadwal' },
  { key: 'goals', label: 'Goals & Habit', desc: 'Goals, Project, Habit' },
  { key: 'org', label: 'Organization', desc: 'Catatan & Dokumen' },
  { key: 'finance', label: 'Finance', desc: 'Transaksi, Budget, Tabungan' },
];
const LAP_MODE_LABEL = { bulan: 'Bulan ini', tiga: '3 bulan', tahun: 'Tahun ini' };
let lapPeriodMode = 'bulan';
let lapSections = new Set(LAP_SECTIONS.map((s) => s.key));
let lapAiModel = 'qwen3.8-flash';
let lapAiText = '';
let lapAiMeta = null;
let lapAiBusy = false;
let lapNotice = '';
init();

// Tracker Daily — 09-router
// Dipisah dari public/app.js (refactor modular; tidak ada identifier yang di-rename).
// Classic script — urutan load: lihat <script> di public/index.html.
'use strict';

// Judul halaman per bahasa (lihat 06-lang.js). Peta view -> [kunci judul, kunci subjudul].
const PAGE_META = {
  dashboard: ['page.dashboard', 'page.dashboard-sub'],
  habits: ['page.habits', null],
  account: ['page.account', 'page.account-sub'],
  task: ['page.task', 'page.task-sub'],
  jadwal: ['page.jadwal', 'page.jadwal-sub'],
  progress: ['page.progress', 'page.progress-sub'],
  project: ['page.project', null],
  'project-task': ['page.project-task', null],
  goals: ['page.goals', null],
  catatan: ['page.notes', 'page.notes-sub'],
  dokumen: ['page.docs', 'page.docs-sub'],
  transaksi: ['page.tx', 'page.tx-sub'],
  budget: ['page.budget', 'page.budget-sub'],
  tabungan: ['page.savings', 'page.savings-sub'],
  'laporan-keuangan': ['page.report-fin', 'page.report-fin-sub'],
  miawai: ['page.ai', 'page.ai-sub'],
  reports: ['page.reports', 'page.reports-sub'],
};

// Pembungkus: setiap render ulang shell (login, logout, pindah view, menu Akun)
// langsung diterjemahkan saat bahasa EN aktif, tanpa bergantung MutationObserver.
function renderShell() {
  renderShellInner();
  if (typeof APP_LANG !== 'undefined' && APP_LANG === 'en') translateDom();
}

function renderShellInner() {
  renderI18nStatic();
  if (!isLoggedIn()) {
    dom.content.innerHTML = '';
    dom.pageTitle.textContent = t('page.login');
    dom.pageSubtitle.textContent = t('page.login-sub');
    renderAuthPanel();
    renderAuthScreen();
    return;
  }

  document.body.classList.remove('auth-required');
  if (dom.authScreen) dom.authScreen.innerHTML = '';

  renderYearOptions();
  renderMonthList();
  renderAuthPanel();

  document.querySelectorAll('[data-view]').forEach((button) => {
    button.classList.toggle('active', activeView === button.dataset.view);
  });
  syncNavGroups();
  const taskSearch = document.getElementById('taskSearchWrap');
  if (taskSearch) taskSearch.hidden = activeView !== 'task';

  if (activeView === 'dashboard') {
    dom.pageTitle.textContent = t('page.dashboard');
    dom.pageSubtitle.textContent = `${t('page.dashboard-sub')} ${activeYear}`;
    dom.content.innerHTML = renderDashboard(activeYear);
    return;
  }

  if (activeView === 'habits') {
    const period = habitPeriod();
    ensureYear(period.year);
    dom.pageTitle.textContent = t('page.habits');
    dom.pageSubtitle.textContent = `${MONTHS[period.monthIndex]} ${period.year}`;
    dom.content.innerHTML = renderHabitsTab(period.year, period.monthIndex);
    return;
  }

  if (activeView === 'account') {
    dom.pageTitle.textContent = t('page.account');
    dom.pageSubtitle.textContent = t('page.account-sub');
    dom.content.innerHTML = renderAccountTab();
    return;
  }

  if (activeView === 'task') {
    dom.pageTitle.textContent = t('page.task');
    dom.pageSubtitle.textContent = t('page.task-sub');
    if (dailyDetailId) {
      const dd = renderDailyDetail();
      if (dd) { dom.content.innerHTML = dd; return; }
      dailyDetailId = null;
    }
    if (taskDetailId) {
      const legacy = renderTaskDetail();
      if (legacy) { dom.content.innerHTML = legacy; if (focusTaskId) setTimeout(tickFocusDisplay, 0); return; }
      taskDetailId = null;
    }
    dom.content.innerHTML = renderDailyTaskView();
    return;
  }

  if (activeView === 'jadwal') {
    dom.pageTitle.textContent = t('page.jadwal');
    dom.pageSubtitle.textContent = t('page.jadwal-sub');
    dom.content.innerHTML = renderJadwalView();
    return;
  }

  if (activeView === 'progress') {
    dom.pageTitle.textContent = t('page.progress');
    dom.pageSubtitle.textContent = 'Statistik kebiasaan, task & goals';
    dom.content.innerHTML = renderProgressView();
    return;
  }

  if (activeView === 'project') {
    dom.pageTitle.textContent = t('page.project');
    dom.pageSubtitle.textContent = 'Proyek & target besar';
    dom.content.innerHTML = renderProjectView();
    return;
  }

  if (activeView === 'project-task') {
    dom.pageTitle.textContent = t('page.project-task');
    dom.pageSubtitle.textContent = 'Task yang terhubung ke tiap project';
    dom.content.innerHTML = renderProjectTaskView();
    return;
  }

  if (activeView === 'goals') {
    dom.pageTitle.textContent = t('page.goals');
    dom.pageSubtitle.textContent = 'Target jangka pendek & panjang';
    dom.content.innerHTML = renderGoalsView();
    return;
  }

  if (activeView === 'catatan') {
    dom.pageTitle.textContent = t('page.notes');
    dom.pageSubtitle.textContent = 'Simpan ide, pengetahuan, dan hal penting dalam satu tempat.';
    dom.content.innerHTML = renderNotesView();
    return;
  }

  if (activeView === 'dokumen') {
    ensureDocStore();
    dom.pageTitle.textContent = t('page.docs');
    dom.pageSubtitle.textContent = 'Berkas & tautan penting dalam satu hub.';
    dom.content.innerHTML = renderDocsView();
    return;
  }

  if (activeView === 'transaksi') {
    ensureTxStore();
    dom.pageTitle.textContent = t('page.tx');
    dom.pageSubtitle.textContent = 'Catat uang masuk & keluar, lihat pola lewat kalender cashflow.';
    dom.content.innerHTML = renderTxView();
    return;
  }

  if (activeView === 'budget') {
    ensureBudStore();
    dom.pageTitle.textContent = t('page.budget');
    dom.pageSubtitle.textContent = 'Anggaran per kategori, dihitung otomatis dari transaksi kas.';
    dom.content.innerHTML = renderBudgetView();
    return;
  }

  if (activeView === 'tabungan') {
    ensureSaveStore();
    dom.pageTitle.textContent = t('page.savings');
    dom.pageSubtitle.textContent = 'Target tabungan dengan setoran, progress, dan deadline.';
    dom.content.innerHTML = renderSavingsView();
    return;
  }

  if (activeView === 'laporan-keuangan') {
    ensureTxStore();
    ensureBudStore();
    ensureSaveStore();
    dom.pageTitle.textContent = t('page.report-fin');
    dom.pageSubtitle.textContent = 'Rekap kas, budget, dan tabungan dalam satu laporan.';
    dom.content.innerHTML = renderReportView();
    return;
  }

  if (activeView === 'miawai') {
    dom.pageTitle.textContent = t('page.ai');
    dom.pageSubtitle.textContent = 'Asisten AI untuk website, Habit & Goals';
    dom.content.innerHTML = renderMiawAIView();
    return;
  }

  if (activeView === 'reports') {
    ensureTxStore();
    ensureBudStore();
    ensureSaveStore();
    ensureDocStore();
    ensureRepHistory();
    dom.pageTitle.textContent = t('page.reports');
    dom.pageSubtitle.textContent = 'Laporan lintas modul: Activity, Goals & Habit, Organization, Finance — PDF/DOC + analisis AI';
    dom.content.innerHTML = renderLaporanView();
    return;
  }

  if (PLACEHOLDER_VIEWS[activeView]) {
    dom.pageTitle.textContent = PLACEHOLDER_VIEWS[activeView].title;
    dom.pageSubtitle.textContent = PLACEHOLDER_VIEWS[activeView].subtitle;
    dom.content.innerHTML = renderPlaceholderView(activeView);
    return;
  }

  dom.pageTitle.textContent = `${MONTHS[activeMonth]} ${activeYear}`;
  dom.pageSubtitle.textContent = 'Lembar pelacak bulanan dan analitik';
  dom.content.innerHTML = renderMonth(activeYear, activeMonth);
}

const PLACEHOLDER_VIEWS = {
  jadwal: { title: 'Jadwal', subtitle: 'Rencana waktu harian & mingguan', emoji: '🗓️', hint: 'Atur agenda dan rutinitas harianmu.' },
  goals: { title: 'Goals', subtitle: 'Target jangka pendek & panjang', emoji: '🎯', hint: 'Pasang target besar dan pecah jadi kebiasaan kecil.' },
  progress: { title: 'Goals and Habit Progress', subtitle: 'Grafik perkembangan dirimu', emoji: '📈', hint: 'Pantau konsistensi dan pertumbuhan dari waktu ke waktu.' },
  project: { title: 'Project', subtitle: 'Proyek & target besar', emoji: '🧩', hint: 'Kelompokkan task dan catatan ke dalam proyek.' },
  catatan: { title: 'Catatan', subtitle: 'Ide, journal, dan memo cepat', emoji: '📝', hint: 'Tangkap pikiran sebelum hilang.' },
  transaksi: { title: 'Transaksi', subtitle: 'Pemasukan & pengeluaran harian', emoji: '💸', hint: 'Catat uang masuk dan keluar dengan cepat.' },
  budget: { title: 'Budget', subtitle: 'Rencana belanja bulanan', emoji: '🧾', hint: 'Bagi budget per pos belanja.' },
  tabungan: { title: 'Tabungan', subtitle: 'Target tabungan & dana darurat', emoji: '🪙', hint: 'Kejar target tabungan setahap demi setahap.' },
  'laporan-keuangan': { title: 'Laporan Keuangan', subtitle: 'Ringkasan kondisi finansial', emoji: '📊', hint: 'Rekap bulanan kas, budget, dan tabungan.' },
  reports: { title: 'Ekspor & Laporan', subtitle: 'Laporan lintas aktivitas & kebiasaan', emoji: '📑', hint: 'Analitik gabungan dari seluruh modul tracker.' },
  miawai: { title: 'MiawAI', subtitle: 'Asisten cerdas produktivitas', emoji: '🤖', hint: 'Minta saran, ringkasan, dan rencana dari data tracker-mu.' },
};

function renderPlaceholderView(viewName) {
  const info = PLACEHOLDER_VIEWS[viewName];
  return `
    <section class="panel placeholder-panel">
      <div class="placeholder-stage">
        <div class="placeholder-emoji" aria-hidden="true">${info.emoji}</div>
        <h2 class="placeholder-title">${escapeHtml(info.title)}</h2>
        <p class="placeholder-hint">${escapeHtml(info.hint)}</p>
        <span class="placeholder-chip">Segera hadir</span>
      </div>
    </section>
  `;
}

function rerenderWithScroll(scrollKey, scrollLeft) {
  renderShell();
  if (!scrollKey) return;
  requestAnimationFrame(() => {
    const scroller = document.querySelector(`[data-scroll-key="${scrollKey}"]`);
    if (scroller) scroller.scrollLeft = scrollLeft;
  });
}

function openSidebar() {
  dom.sidebar.classList.add('open');
  dom.overlay.classList.add('show');
}

function closeSidebar() {
  dom.sidebar.classList.remove('open');
  dom.overlay.classList.remove('show');
}

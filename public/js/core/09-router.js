// Tracker Daily — 09-router
// Dipisah dari public/app.js (refactor modular; tidak ada identifier yang di-rename).
// Classic script — urutan load: lihat <script> di public/index.html.
'use strict';


function renderShell() {
  if (!isLoggedIn()) {
    dom.content.innerHTML = '';
    dom.pageTitle.textContent = 'Masuk';
    dom.pageSubtitle.textContent = 'Login diperlukan untuk membuka tracker';
    renderAuthPanel();
    renderAuthScreen();
    return;
  }

  document.body.classList.remove('auth-required');
  if (dom.authScreen) dom.authScreen.innerHTML = '';

  if (activeView === 'habits') {
    const current = currentTrackingDate();
    activeYear = current.year;
    activeMonth = current.monthIndex;
    ensureYear(activeYear);
  }

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
    dom.pageTitle.textContent = 'Dashboard';
    dom.pageSubtitle.textContent = `Ringkasan kebiasaan sepanjang ${activeYear}`;
    dom.content.innerHTML = renderDashboard(activeYear);
    return;
  }

  if (activeView === 'habits') {
    const current = currentTrackingDate();
    activeYear = current.year;
    activeMonth = current.monthIndex;
    ensureYear(activeYear);
    dom.pageTitle.textContent = 'Kebiasaan';
    dom.pageSubtitle.textContent = `${MONTHS[activeMonth]} ${activeYear} berjalan`;
    dom.content.innerHTML = renderHabitsTab(activeYear, activeMonth);
    return;
  }

  if (activeView === 'account') {
    dom.pageTitle.textContent = 'Akun';
    dom.pageSubtitle.textContent = 'Pengaturan profil dan keamanan';
    dom.content.innerHTML = renderAccountTab();
    return;
  }

  if (activeView === 'task') {
    dom.pageTitle.textContent = 'Daily Task';
    dom.pageSubtitle.textContent = 'Kegiatan rutin harian di luar project';
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
    dom.pageTitle.textContent = 'Jadwal';
    dom.pageSubtitle.textContent = 'Rencana waktu harian & mingguan';
    dom.content.innerHTML = renderJadwalView();
    return;
  }

  if (activeView === 'progress') {
    dom.pageTitle.textContent = 'Progress';
    dom.pageSubtitle.textContent = 'Statistik kebiasaan, task & goals';
    dom.content.innerHTML = renderProgressView();
    return;
  }

  if (activeView === 'project') {
    dom.pageTitle.textContent = 'Project';
    dom.pageSubtitle.textContent = 'Proyek & target besar';
    dom.content.innerHTML = renderProjectView();
    return;
  }

  if (activeView === 'project-task') {
    dom.pageTitle.textContent = 'Project Task';
    dom.pageSubtitle.textContent = 'Task yang terhubung ke tiap project';
    dom.content.innerHTML = renderProjectTaskView();
    return;
  }

  if (activeView === 'goals') {
    dom.pageTitle.textContent = 'Goals';
    dom.pageSubtitle.textContent = 'Target jangka pendek & panjang';
    dom.content.innerHTML = renderGoalsView();
    return;
  }

  if (activeView === 'catatan') {
    dom.pageTitle.textContent = 'Catatan';
    dom.pageSubtitle.textContent = 'Simpan ide, pengetahuan, dan hal penting dalam satu tempat.';
    dom.content.innerHTML = renderNotesView();
    return;
  }

  if (activeView === 'dokumen') {
    ensureDocStore();
    dom.pageTitle.textContent = 'Dokumen';
    dom.pageSubtitle.textContent = 'Berkas & tautan penting dalam satu hub.';
    dom.content.innerHTML = renderDocsView();
    return;
  }

  if (activeView === 'transaksi') {
    ensureTxStore();
    dom.pageTitle.textContent = 'Transaksi';
    dom.pageSubtitle.textContent = 'Catat uang masuk & keluar, lihat pola lewat kalender PnL.';
    dom.content.innerHTML = renderTxView();
    return;
  }

  if (activeView === 'budget') {
    ensureBudStore();
    dom.pageTitle.textContent = 'Budget';
    dom.pageSubtitle.textContent = 'Anggaran per kategori, dihitung otomatis dari transaksi kas.';
    dom.content.innerHTML = renderBudgetView();
    return;
  }

  if (activeView === 'tabungan') {
    ensureSaveStore();
    dom.pageTitle.textContent = 'Tabungan';
    dom.pageSubtitle.textContent = 'Target tabungan dengan setoran, progress, dan deadline.';
    dom.content.innerHTML = renderSavingsView();
    return;
  }

  if (activeView === 'laporan-keuangan') {
    ensureTxStore();
    ensureBudStore();
    ensureSaveStore();
    dom.pageTitle.textContent = 'Laporan Keuangan';
    dom.pageSubtitle.textContent = 'Rekap kas, budget, dan tabungan dalam satu laporan.';
    dom.content.innerHTML = renderReportView();
    return;
  }

  if (activeView === 'miawai') {
    dom.pageTitle.textContent = 'MiawAI';
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
    dom.pageTitle.textContent = 'Laporan';
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
  progress: { title: 'Progress', subtitle: 'Grafik perkembangan dirimu', emoji: '📈', hint: 'Pantau konsistensi dan pertumbuhan dari waktu ke waktu.' },
  project: { title: 'Project', subtitle: 'Proyek & target besar', emoji: '🧩', hint: 'Kelompokkan task dan catatan ke dalam proyek.' },
  catatan: { title: 'Catatan', subtitle: 'Ide, journal, dan memo cepat', emoji: '📝', hint: 'Tangkap pikiran sebelum hilang.' },
  transaksi: { title: 'Transaksi', subtitle: 'Pemasukan & pengeluaran harian', emoji: '💸', hint: 'Catat uang masuk dan keluar dengan cepat.' },
  budget: { title: 'Budget', subtitle: 'Rencana belanja bulanan', emoji: '🧾', hint: 'Bagi budget per pos belanja.' },
  tabungan: { title: 'Tabungan', subtitle: 'Target tabungan & dana darurat', emoji: '🪙', hint: 'Kejar target tabungan setahap demi setahap.' },
  'laporan-keuangan': { title: 'Laporan Keuangan', subtitle: 'Ringkasan kondisi finansial', emoji: '📊', hint: 'Rekap bulanan kas, budget, dan tabungan.' },
  reports: { title: 'Laporan', subtitle: 'Laporan lintas aktivitas & kebiasaan', emoji: '📑', hint: 'Analitik gabungan dari seluruh modul tracker.' },
  miawai: { title: 'MiawAI', subtitle: 'Asisten cerdas produktivitas', emoji: '🤖', hint: 'Minta saran, ringkasan, dan rencana dari data tracker-mu.' },
};

function renderPlaceholderView(viewName) {
  const info = PLACEHOLDER_VIEWS[viewName];
  return `
    <section class="panel placeholder-panel">
      <div class="placeholder-stage">
        <div class="placeholder-emoji" aria-hidden="true">${info.emoji}</div>
        <h3 class="placeholder-title">${escapeHtml(info.title)}</h3>
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

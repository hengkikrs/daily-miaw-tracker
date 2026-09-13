# Navigation — peta cepat kode

> Pakai dokumen ini + `docs/symbol-index.md` sebelum membaca `public/app.js`.
> Jangan membaca seluruh app.js: cari simbol → baca rentang baris → ubah → validasi.

## Alur runtime (satu arah)
```
index.html
  ├─ runtime-config.js        → window.MIAW_TRACKER_CONFIG (hasil `npm run build`)
  └─ app.js (IIFE)
        ├─ top-level: dom = {...}, state = loadState(), migrateLegacyStores()
        ├─ ... definisi 400 fungsi ...
        └─ init()  ← dipanggil sekali di baris terakhir (L8773)
              └─ bindEvents()  (L7479–7948)  → satu delegasi event global
                    └─ aksi user → handle*Action → saveState()/save*() → renderShell()
                          └─ renderShell() (L1861–2048) → #content
```

## Router: `renderShell()` — L1861–2048

| `data-view` (index.html) | Cabang baris | Fungsi render | File |
|---|---|---|---|
| `account` | L1910 | `renderAccountTab()` | `js/auth/14-auth-ui.js` |
| `task` | L1917 | `renderDailyTaskView()` — bila `dailyDetailId` → `renderDailyDetail()`; bila `taskDetailId` (legacy) → `renderTaskDetail()` | `js/modules/daily-tasks.js` (+ legacy di `js/modules/tasks.js`) |
| `jadwal` | L1934 | `renderJadwalView()` | `js/modules/schedule.js` |
| `progress` | L1941 | `renderProgressView()` | `js/modules/progress.js` |
| `project` | L1948 | `renderProjectView()` | `js/modules/projects.js` |
| `project-task` | L1955 | `renderProjectTaskView()` | `js/modules/projects.js` |
| `goals` | L1962 | `renderGoalsView()` | `js/modules/goals.js` |
| `catatan` | L1969 | `renderNotesView()` | `js/modules/notes.js` |
| `dokumen` | L1976 | `renderDocsView()` | `js/modules/finance-documents.js` |
| `transaksi` | L1984 | `renderTxView()` | `js/modules/finance-transactions.js` |
| `budget` | L1992 | `renderBudgetView()` | `js/modules/finance-budget.js` |
| `tabungan` | L2000 | `renderSavingsView()` | `js/modules/finance-savings.js` |
| `laporan-keuangan` | L2008 | `renderReportView()` (**Laporan Keuangan** = report finance lama) | `js/modules/finance-reports-legacy.js` |
| `miawai` | L2018 | `renderMiawAIView()` | `js/modules/miawai.js` |
| `reports` | L2025 | `renderLaporanView()` (**Laporan lintas modul** + ekspor PDF/DOC) | `js/modules/laporan-export.js` |
| `dashboard` | L1892 | `renderDashboard()` | `js/modules/dashboard.js` |
| `habits` | L1899 (dan L1874) | `renderHabitsTab()` | `js/modules/habit-analytics.js` |
| lainnya | L2037 | `PLACEHOLDER_VIEWS[view]` → `renderPlaceholderView()` | `js/core/09-router.js` |
| default | L2044 | `renderMonth(activeYear, activeMonth)` (lembar pelacakan bulanan klasik) | `js/modules/habit-legacy.js` + `habit-analytics` |

Catatan penting (hasil pembacaan kode aktual, bukan asumsi):
- Menu **"Laporan"** di grup Finance (`data-view="laporan-keuangan"`) → `renderReportView()`; menu **"Laporan"** standalone (`data-view="reports"`) → `renderLaporanView()`. Keduanya **berbeda modul**.
- `activeView === 'kalender'` dinormalkan ke `'jadwal'` di L230 (kompatibilitas view lama).

## Delegasi event: `bindEvents()` — L7479–7948
Listener yang dipasang:

| Baris | Target | Event |
|---|---|---|
| L7480 | `dom.themeToggle` | `click` → `applyTheme`/`initTheme` |
| L7485–7486 | `dom.menuBtn`, `dom.overlay` | `click` → `openSidebar`/`closeSidebar` |
| L7488 | `dom.yearSelect` | `change` |
| L7495 | `dom.monthList` | `click` |
| L7508–7521 | `dom.authScreen` | `submit`, `input`, `click` |
| L7562 | `dom.authPanel` | `click` |
| L7569 | `document` | `click` (delegasi utama semua `data-action`) |
| L7715–7920 | `dom.content` | `keydown`, `change`, `input`, `submit` |
| L7940 | `document` | `visibilitychange` |
| L7944 | `window` | `pagehide` (flush remote save) |

Handler aksi yang dipanggil dari dispatch (20 handler, 23 section):

| Handler | File |
|---|---|
| `handleDailyAction` | `js/modules/daily-tasks.js` |
| `handleTaskAction` | `js/modules/tasks.js` |
| `handleJadwalAction` | `js/modules/schedule.js` |
| `handleGoalAction` | `js/modules/goals.js` (via `submitGoalForm`) |
| `handleProjectAction`, `handleProjectChange`, `submitProjectSubForm` | `js/modules/projects.js` |
| `handleNoteAction`, `handleNoteInput` | `js/modules/notes.js` |
| `handleSaveAction` | `js/modules/finance-savings.js` |
| `handleBudAction` | `js/modules/finance-budget.js` |
| `handleTxAction` | `js/modules/finance-transactions.js` |
| `handleDocAction`, `handleDocSearch`, `handleDocFilePick`, `handleDocImport` | `js/modules/finance-documents.js` |
| `handleRepAction` | `js/modules/finance-reports-legacy.js` |
| `handleProgressAction` | `js/modules/progress.js` |
| `handleDashAction` | `js/modules/dashboard.js` |
| `handleLaporanAction` | `js/modules/laporan-export.js` |
| `handleMiawFiles` | `js/modules/miawai.js` |
| handler auth (login/OTP/logout, `data-auth-action`) | `js/auth/14-auth-ui.js` |

Selain `data-action`, dispatch mengenali awalan khusus: `data-daily-*`, `data-task-*`, `data-jadwal-*`, `data-goal-*`, `data-proj-*`, `data-note-*`, `data-sv-*`, `data-bud-*`, `data-tx-*` (termasuk alias ringkas `data-l`), `data-doc-*`, `data-rep-*`, `data-lap-*`, `data-dash-go`, `data-progress-tab`, `data-focus-live`, `data-auth-action`.

## Cara cepat menemukan kode (hemat token)
1. `search_files` untuk nama fungsi / `data-*` / kunci storage.
2. Ambil nomor baris dari `docs/symbol-index.md`, lalu `read_file(offset=..., limit=...)` hanya pada rentang itu.
3. Untuk perubahan aksi: baca `handle*Action` modul **dan** baris dispatch terkait di `bindEvents` (`docs/navigation.md` tabel di atas).
4. Untuk perubahan tampilan: baca `render*` modul; `dom.content.innerHTML = ...` adalah pola render.
5. Untuk perubahan data: baca `js/core/05-storage.js` + handler `load*/save*` modul.
6. Validasi: `node --check` + jalankan `scripts/dev/check-syntax.js` + uji route terkait di browser.

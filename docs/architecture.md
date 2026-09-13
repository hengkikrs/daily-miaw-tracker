# Architecture

## Bentuk kode sekarang
```
public/index.html
  └── <script src="runtime-config.js">        (hasil build: window.MIAW_TRACKER_CONFIG)
  └── <script src="app.js">                   (SATU IIFE: 400 fungsi + 188 var, 588 simbol top-level)
```
- IIFE: `(() => { 'use strict'; ... })();`
- Hanya **2 pemanggilan top-level**: `migrateLegacyStores();` (L225) dan `init();` (L8773, terakhir).
- 0 nama duplikat di antara 588 simbol top-level.
- **0 tabrakan** antara 588 nama itu dan properti `window` (diuji runtime) → IIFE bisa dibuka tanpa menabrak global browser.

## Lapisan (dari data aktual, bukan asumsi)
```
config/konstanta  (STORAGE_KEY, MONTHS, CATEGORY_CONFIG, DEFAULT_HABITS, NAV_GROUP_OF, ...)
        ↓
runtime & DOM     ($, dom, runtimeConfig, supabaseConfig, remoteEnabled, runtimeYear)
        ↓
state mutable     67 var di-assign lintas section; activeView di-assign di 11 section
        ↓
storage lokal     loadState/saveState/readStoreJson + store per modul
        ↓
remote sync       saveRemoteState/hydrateRemoteState (debounce 150 ms) — hanya jika remoteEnabled
        ↓
render per modul  render*View / render*Detail / render*Page
        ↓
handler aksi      handle*Action / submit*Form / handle*Input
        ↓
bindEvents()      satu listener global → dispatch ke 20 handler dari 23 section
        ↓
renderShell()     router: 18 cabang activeView mengganti #content
```

## Dependency paling berat (fan-in terukur)
| Simbol | Dipakai oleh |
|---|---|
| `$` | 188 fungsi |
| `escapeHtml` | 59 |
| `state` | 48 |
| `renderShell` | 45 |
| `showToast` | 38 |
| `saveState` | 32 |
| `MONTHS` / `dom` | 26 / 23 |
| `activeYear` / `authSession` | 19 / 18 |
| `activeMonth` / `scopedKey` | 17 / 16 |
| `activeView` | 15 |

Tidak ada modul yang bebas dari lapisan fondasi ini.

## Kenapa ES module tidak dipakai (keputusan)
Pada ES module, binding hasil `import` bersifat **read-only** untuk pengimpor. Di kode ini **67 variabel level-IIFE di-assign dari ≥2 section** (`activeView` dari 11 section), sehingga ES module menuntut konversi state menjadi store/accessor = perubahan arsitektur. Lihat `docs/decisions/refactor-log.md`.

## Strategi modularisasi yang dipakai (Opsi B)
Classic script berurutan + **buka pembungkus IIFE**; potong berdasarkan section tanpa mengubah satu pun identifier:
- deklarasi `let/const` top-level di classic script hidup di *global lexical environment* → **dibaca & di-assign lintas file**;
- urutan load mengikuti urutan section, `init()` terakhir;
- `'use strict';` di setiap file (sama seperti sekarang);
- `scripts/build-vercel-static.js` menyalin `public/` rekursif → `public/js/**` otomatis ikut deploy, dan `server.js` menyajikan subfolder.

## Peta target file (33 file, LOC terukur)
| File | LOC | Asal (section app.js) |
|---|---|---|
| `js/core/01-config.js` | 140 | core-bootstrap (konstanta) + `DATA_STORE_KEYS`, `NAV_GROUP_OF`, `PW_RULE_*`, `OAUTH_VERIFIER_KEY` |
| `js/core/02-runtime-dom.js` | 27 | `$`, `dom`, `runtimeConfig`, `supabaseConfig`, `remoteEnabled`, `runtimeYear` |
| `js/core/03-state.js` | 124 | baca/tulis localStorage ber-scope + seluruh state mutable |
| `js/core/04-utils.js` | 150 | utility murni (uid, escapeHtml, clamp, daysInMonth, slot*, evaluatePassword, …) |
| `js/core/05-storage.js` | 167 | createFreshState, loadState/saveState, buildStoresPayload/applyStoresPayload, ensure* |
| `js/core/06-toast.js` | 7 | `showToast` |
| `js/core/07-theme.js` | 16 | `applyTheme`, `initTheme` |
| `js/core/08-nav.js` | 34 | `buildYearOptions`, `renderYearOptions`, `renderMonthList` |
| `js/core/09-router.js` | 222 | `renderShell`, `openSidebar`, `closeSidebar`, `rerenderWithScroll`, `renderPlaceholderView` |
| `js/auth/11-session.js` | 77 | sesi + `isLoggedIn` + `completeLogin` |
| `js/auth/12-oauth.js` | 118 | PKCE, Google OAuth, OTP, countdown |
| `js/auth/13-remote-sync.js` | 189 | `authFetch`, `supabaseFetch`, `hydrateRemoteState`, `queue/flushRemoteSave`, `saveRemoteState` |
| `js/auth/14-auth-ui.js` | 719 | auth screen/panel + alur login/signup/logout + tab Akun |
| `js/modules/habit-analytics.js` | 333 | analitik habit + leaderboard + `renderHabitsTab` |
| `js/modules/habit-legacy.js` | 297 | model habit lama (mingguan/bulanan) — status pemakaian perlu dipastikan |
| `js/modules/daily-tasks.js` | 344 | Daily Tasks |
| `js/modules/schedule.js` | 209 | Jadwal |
| `js/modules/tasks.js` | 764 | Tasks + focus timer + activity log |
| `js/modules/goals.js` | 308 | Goals |
| `js/modules/projects.js` | 557 | Projects + Project Task |
| `js/modules/notes.js` | 419 | Notes |
| `js/modules/finance-reports-legacy.js` | 211 | report/keuangan lama |
| `js/modules/finance-savings.js` | 378 | Tabungan |
| `js/modules/finance-budget.js` | 288 | Budget |
| `js/modules/finance-transactions.js` | 289 | Transaksi |
| `js/modules/finance-documents.js` | 401 | Dokumen |
| `js/modules/progress.js` | 216 | Progress |
| `js/modules/dashboard.js` | 281 | Dashboard |
| `js/modules/miawai.js` | 190 | MiawAI |
| `js/modules/laporan-export.js` | 800 | Laporan + ekspor PDF/DOC |
| `js/events/20-bind-events.js` | 470 | `bindEvents` |
| `js/bootstrap/30-init.js` | 27 | `init` |

Daftar simbol+baris per section: `docs/symbol-index.md`. Rencana & progres: `docs/decisions/refactor-log.md`.

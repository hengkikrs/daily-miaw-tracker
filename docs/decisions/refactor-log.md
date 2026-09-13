# Refactor Log — Tracker Daily

Aturan: setiap fase = **1 commit + 1 validasi**. Jangan lompat fase. Jangan gabungkan dua fase dalam satu commit.

## Status
| Fase | Isi | Status |
|---|---|---|
| TAHAP 0 | Audit + baseline | ✅ selesai (`docs/refactor-audit.md`, tag `pre-refactor-baseline`) |
| FASE 0 | Dokumentasi + AGENTS.md + validator + indeks simbol | ✅ selesai (tanpa perubahan perilaku) |
| FASE A | Ekstrak murni: `core/01-config.js`, `core/04-utils.js`, `core/07-theme.js` | ✅ selesai |
| FASE B | `02-runtime-dom`, `05-storage`, `03-state` + **buka pembungkus IIFE** | ✅ selesai (commit `a21cdb9`) |
| FASE C | `modules/notes`, `modules/daily-tasks`, `modules/schedule` | ✅ selesai |
| FASE D | `modules/tasks`, `modules/goals`, `modules/projects` | ✅ selesai |
| FASE E | `modules/finance-*` | ✅ selesai |
| FASE F | `modules/progress`, `dashboard`, `habit-analytics`, `laporan-export` | ✅ selesai |
| FASE G | `auth/*`, `core/09-router`, `events/20-bind-events`, `bootstrap/30-init` | ✅ selesai |
| FASE H | `modules/habit-legacy` (dipindah apa adanya; status pemakaian belum diputuskan) | ✅ dipindah, ⚠️ belum diputuskan |

## Keputusan
1. **Opsi B dipilih** (classic script berurutan + buka IIFE), bukan ES module.
   Alasan terukur: 67 variabel level-IIFE di-assign dari ≥2 section (`activeView` dari 11 section); binding `import` bersifat read-only sehingga ES module menuntut konversi state = perubahan arsitektur.
2. **Tidak ada bundler** ditambahkan; tidak ada framework baru; tidak ada perubahan API contract.
3. Tidak ada perubahan storage key, bentuk data, `SCHEMA_VERSION`, auth, atau endpoint `api/`.
4. Validasi memakai **differential test** (fingerprint 17 route) karena project tidak punya test/lint/typecheck.

## Koreksi hasil audit (ditemukan saat membuat `docs/navigation.md`)
- Sebelumnya dicatat: `reports` → laporan keuangan lama. **Koreksi (kode aktual L2008 & L2025):**
  - `data-view="laporan-keuangan"` (menu Finance → "Laporan") → `renderReportView()` + `handleRepAction` → modul **finance-reports-legacy**.
  - `data-view="reports"` (menu Laporan standalone) → `renderLaporanView()` + `handleLaporanAction` → modul **laporan-export** (ekspor PDF/DOC).
- Menu **"Daily Task"** (`data-view="task"`) → `renderDailyTaskView()`; detail harian `renderDailyDetail()`; cabang `renderTaskDetail()` adalah jalur **legacy** yang aktif hanya bila `taskDetailId` terisi.
- Ditemukan potensi bug (didokumentasikan, **tidak diperbaiki**): `miaw-tracker.daily-tasks.v1` tidak termasuk `DATA_STORE_KEYS`, sehingga tidak ikut `migrateLegacyStores()` atau `removeUserDataFor()` (lihat `docs/storage.md`).

## Baseline & rollback
- Tag: `pre-refactor-baseline` → commit `e2e6287` (working tree bersih saat audit).
- Salinan kode pra-refactor: `/home/ubuntu/tracker-daily-refactor-audit/app.js`.
- Fingerprint perilaku: `/home/ubuntu/tracker-daily-refactor-audit/audit-baseline.json` (17 route: panjang HTML, jumlah node, checksum).

## Cara validasi tiap fase
```bash
node scripts/dev/check-syntax.js          # kompilasi + duplikat deklarasi top-level
node scripts/dev/gen-symbol-index.js      # regenerasi peta simbol (nomor baris berubah)
PORT=3999 node server.js                  # jalankan lokal
npm run vercel:prebuild                   # pastikan public/js/** ikut ke .vercel/output/static/js
git diff --stat
```
Lalu uji di browser (Chrome headless/CDP): buka `http://127.0.0.1:3999`, klik ke-17 `data-view`,
bandingkan panjang HTML + jumlah node + checksum `#content` dengan `audit-baseline.json`, dan pastikan
`Object.keys(localStorage)` tetap 7 kunci ber-scope `:<user-id>`.

Hal yang **belum pernah** diuji (jangan diklaim lulus): login Supabase asli, OTP, Google OAuth, remote sync nyata, dan aksi tulis per modul.

## FASE A — laporan
- **Tujuan:** memindahkan kode murni (tanpa state/closure) keluar dari IIFE tanpa membuka pembungkus IIFE.
- **File dibuat:** `public/js/core/01-config.js` (19 simbol, 133 baris), `public/js/core/04-utils.js` (21 simbol, 131 baris), `public/js/core/07-theme.js` (2 simbol, 21 baris).
- **File diubah:** `public/app.js` (8.775 → 8475 baris; 264 baris dipindah), `public/index.html` (3 script baru + cache-bust `?v=20260913-faseA`).
- **Simbol dipindah:** konstanta (`STORAGE_KEY`, `MONTHS`, `CATEGORY_CONFIG`, `DEFAULT_HABITS`, `DATA_STORE_KEYS`, `NAV_GROUP_OF`, `PW_RULE_*`, `OAUTH_VERIFIER_KEY`, …), utility murni (`uid`, `escapeHtml`, `clamp`, `normalizeHabitPoints`, `suggestHabitPoints`, `habitPoints`, `roundPercent`, `compactPercent`, `pointScore`, `daysInMonth`, `focusedDayIndex`, `currentTrackingDate`, `weeksInMonth`, `slotCountFor`, `slotLabel`, `slotTitle`, `noteRandomB64url`, `canonicalUsername`, `evaluatePassword`, `allPwChecksPass`, `val2`), dan `applyTheme`/`initTheme`.
- **Bukan dipindah (ternyata tidak murni):** `showToast` (pakai `dom.toast` + `toastTimer`) dan `otpRemainingSeconds` (pakai `authOtpResendAt`) → tetap di app.js sampai FASE B/G.
- **Storage key yang terlibat:** tidak ada yang berubah; `DATA_STORE_KEYS` hanya dipindah sebagai konstanta.
- **Validasi:** `node --check` 4/4 file OK · `node scripts/dev/check-syntax.js` LULUS (0 duplikat) · `npm run build` + `npm run vercel:prebuild` → `.vercel/output/static/js/core/*.js` ada · differential test 17 route (teks+node) SEBELUM vs SESUDAH → 16/17 identik, 1 beda hanya pada label jam/menit yang dinamis · `localStorage` tetap 7 kunci ber-scope `:<user-id>`.
- **Catatan mekanisme:** di versi SESUDAH, `window.escapeHtml`/`window.uid` berisi `function` (hasil pemisahan) sedangkan `window.MONTHS` tetap `undefined` karena `const` top-level hidup di *global lexical environment* — persis perilaku yang diharapkan.
- **Risiko terbuka:** `openNavGroups = new Set(... NAV_GROUP_OF ...)` di app.js memakai konstanta yang kini dimuat dari file lain → **urutan `<script>` menjadi kontrak**; jangan menaruh `01-config.js` setelah `app.js`.
- **Belum diuji:** aksi tulis per modul, login Supabase asli, remote sync.

## FASE B — laporan
- **Tujuan:** membuka pembungkus IIFE + memindahkan fondasi (runtime/DOM, state, storage, toast, nav, router) dan auth.
- **File dibuat:** `js/core/02-runtime-dom.js`, `03-state.js`, `05-storage.js`, `06-toast.js`, `08-nav.js`, `09-router.js`, `js/auth/11-session.js`, `12-oauth.js`, `13-remote-sync.js`, `14-auth-ui.js` (10 file, 1.598 baris).
- **File diubah:** `public/app.js` (sisa modul, sudah unwrapped), `public/index.html` (urutan `<script>` hasil topological sort).
- **Urutan load (dihitung otomatis):** 01-config → 04-utils → 07-theme → 02-runtime-dom → 05-storage → 11-session → **03-state** → 13-remote-sync → 12-oauth → 06-toast → 08-nav → 14-auth-ui → 09-router.
  Alasan urutan: `let state = loadState()` dan `let authSession = loadAuthSession()` dieksekusi saat load → storage & session harus dimuat lebih dulu.
- **Storage key:** tidak ada yang berubah; hanya `scopedKey`/`DATA_STORE_KEYS` yang pindah file.
- **Risiko ditemukan:** `openNavGroups = new Set(... NAV_GROUP_OF ...)` dieksekusi saat load → urutan `<script>` jadi kontrak.
- **Validasi:** `node --check` 15/15 OK · `check-syntax` LULUS (0 duplikat) · uji cakupan 7881 baris masuk = 7881 keluar (0 hilang, 0 duplikat) · uji diferensial 17 view + 23 interaksi: identik kecuali `transaksi` (label jam dinamis) · **0 error listener** · 7 kunci localStorage ber-scope tetap.

## FASE C–H — laporan
- **Tujuan:** memindahkan seluruh modul, delegasi event, dan bootstrap; `app.js` menjadi shim.
- **File dibuat:** 19 file (17 `modules/*`, `events/20-bind-events.js`, `bootstrap/30-init.js`); 1 simbol di-append ke `js/core/05-storage.js` (`createHabit`, `createMonth`).
- **Hasil akhir:** 33 classic script, total 8.900 baris (termasuk header 4-5 baris/file); `public/app.js` = shim 3 baris.
- **Urutan load terdeteksi otomatis dari dependency saat-load:** `modules/projects` → `modules/tasks` (`taskAddDefaults()` memakai `firstProjName()`), `modules/tasks` → `modules/schedule` (`let jadwalSelIso = taskTodayIso()`), `bootstrap/30-init` paling akhir (`init();` di-detach ke file itu).
- **Metode:** peta `nama simbol → section` diambil dari **app.js asli** (bukan nomor baris), sehingga tahan pergeseran baris antar-fase; ada guard yang menolak bila ada simbol yang mau ditulis ulang ke file lama (fatal, bukan silent).
- **Validasi:** uji cakupan end-to-end **8142 baris masuk = 8142 keluar (0 hilang, 0 duplikat)** · `check-syntax`: 34 file, **0 duplikat deklarasi, 0 syntax error** · `npm run build` + `vercel:prebuild`: seluruh `js/**` ikut ke `.vercel/output/static/js` · uji diferensial (versi FASE B di :3998 vs versi akhir di :3999): 16/17 view identik + 23 langkah interaksi identik (beda hanya label menit pada `transaksi`), **0 error** di kedua versi · uji tulis: klik checkbox habit (150 checkbox) mengubah state dan **bertahan setelah reload** di kedua versi · 7 kunci localStorage ber-scope.
- **Kontrol negatif:** dua seed segar pada origin yang sama menghasilkan hash state berbeda (panjang sama) → seed memakai id acak (`Math.random`), sehingga perbandingan hash state mentah antar versi **tidak bermakna**; yang dibandingkan adalah panjang/struktur + render + perilaku.
- **Catatan / risiko terbuka:**
  1. `modules/habit-legacy.js` (376 baris) dipindah apa adanya; belum diputuskan masih dipakai atau tidak (dipakai sebagai fallback view default `renderMonth`).
  2. Potensi bug `miaw-tracker.daily-tasks.v1` tidak ada di `DATA_STORE_KEYS` — masih **tidak diperbaiki** (di luar lingkup refactor).
  3. Belum diuji: login Supabase asli, OTP, Google OAuth, remote sync nyata (butuh kredensial/jaringan).
  4. `js/` belum diuji di deployment Vercel nyata (hanya build output lokal yang diverifikasi berisi semua file).

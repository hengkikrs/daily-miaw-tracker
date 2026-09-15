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


## Deploy & verifikasi produksi (2026-09-14)
- Commit rilis: `4bbd3bd` (cache-bust `?v=20260914-ui42`). Rantai commit: `51b442a` (FASE 0) → `290bba3` (A) → `a21cdb9` (B) → `f97a1e6` (C–H) → `fa23346` + `4bbd3bd` (cache-bust) → `29dc914` (laporan QA).
- QA pra-deploy (skill `dogfood`): 0 Critical/High/Medium, 2 Low (kosmetik, terbukti identik pada build pra-refactor). Laporan: `docs/qa/report.md`; bukti JSON + 2 screenshot: `~/tracker-daily-refactor-audit/qa/`.
- Deploy: `vercel deploy --prod --yes --token …` → produksi `tracker-daily-pi.vercel.app` kini menyajikan 33 script `ui42`; `runtime-config.js` terisi; `/api/lookup-user` 404 `not_found` (fungsi serverless sehat); 17/17 view render di produksi tanpa error; tanpa SSO protection.
- Catatan: `?v=` untuk **CSS** sebelumnya tertinggal di `ui41` (skrip migrasi hanya menulis ulang tag `<script>`) — diseragamkan ke `ui42` sebelum deploy.


## Perubahan fitur setelah refactor — ui43 (2026-09-14)
Perbaikan dari laporan pengguna pada menu Activity → Daily Task:
1. **Bug**: form "Tambah Kegiatan" selalu membuat kegiatan sekali (tanggal hari ini), bukan rutinitas berulang → diperbaiki: ada pilihan **Jenis** (Rutinitas berulang / Sekali) + **Jadwal** (Setiap hari, Senin–Jumat, Sabtu & Minggu, Setiap Senin, Setiap Minggu). Default jenis mengikuti tab (tab Rutinitas → Rutinitas; tab Hari Ini → Sekali).
2. **Label** "Ikun" → **"Ikon"** pada form.
3. **Fitur baru**: tombol **ubah (✎)** dan **hapus (✕)** pada setiap kartu rutinitas di tab Rutinitas.
- Penyimpanan: `DAILY_ROUTINES` menjadi benih; daftar kustom disimpan di kunci `miaw-tracker.daily-tasks.v1.routines` (pola sama dengan `.log`). Materialisasi mempertahankan id r1–r6 sehingga riwayat/streak lama tetap.
- Sinkronisasi: `buildStoresPayload()` mengirim `dailyRoutines` (null bila belum diubah → tidak menimpa bawaan perangkat lain); `applyStoresPayload()` menulis kunci `.routines`.
- Berkas diubah: `public/js/modules/daily-tasks.js`, `public/js/events/20-bind-events.js` (2 selector baru + submit didelegasikan ke `dailySubmitAdd`), `public/js/core/05-storage.js`, `public/styles.css` (blok `.dt-card-tools/.dt-tool/.dt-add-hint`), `public/index.html` (cache-bust ui43).
- Validasi: `check-syntax.js` LULUS · uji browser (offline, sesi palsu): kartu 6 → tambah 7 (tersimpan di `.routines`, payload sync berisi rutinitas) → ubah (prefill + tersimpan, toast) → centang (entri log streak) → hapus (kembali 6, log dibersihkan, toast) → jenis "Sekali" tetap menambah agenda hari ini → reload tetap tersimpan · tombol ✎/✕ terlihat (7+7) · 0 error JS.
- Catatan: temuan bug internal saat implementasi — `saveDailyTasks()` menulis hasil `.filter()` sehingga properti array (`__routines`) hilang; karena itu rutinitas disimpan di kunci terpisah seperti `__dailyLog`.

## ui44 — fitur & perbaikan (2026-09-14, commit `657f9be`)

Permintaan pengguna: kategori pada agenda daily, edit agenda, detail + fokus khusus daily task; edit/hapus goal, perbaikan tambah sub goal; edit/hapus project task; perubahan status project.

Perubahan: `public/js/modules/daily-tasks.js` (kategori, `data-daily-edit`, detail rutinitas `r:<id>`, mesin sesi fokus + resume), `public/js/modules/goals.js` (edit/hapus goal, form sub goal inline menggantikan `prompt()`), `public/js/modules/projects.js` (chip status cepat, `ptEditForm`, `ptToolsHtml`, guard `projFormSelId`), `public/js/events/20-bind-events.js` (daftar selector goal/project/daily + submit `goalMsForm`/`ptEditForm` + resume fokus daily), `public/index.html` (cache-bust `ui44`, urutan `goals.js` sebelum `projects.js`), `public/styles.css` (kelas `.dt-row-tools`, `.pt-row`, `.pt-edit-form`, `.proj-status-row`, `.goal-ms-form`, `.goal-del-confirm`, dst.).

**Temuan bug penting (data-loss)**: store `proj-tracker.projects.v1:<uid>` ditimpa seed pada setiap load karena `loadProjects()` memanggil `loadGoals()` di dalam `try` yang sama dengan pembacaan store, sedangkan `goals.js` dimuat setelah `tasks.js` (pemanggil level atas). Dibuktikan dengan instrumentasi `localStorage.setItem/getItem` lewat `Page.addScriptToEvaluateOnNewDocument`: terlihat `SET proj-tracker.projects.v1:qa-ui44 n=6 st0=active` dari `loadProjects()` baris seed tepat setelah satu pembacaan berhasil. Perbaikan: `try/catch` terpisah untuk blok penautan (data selalu dikembalikan) + urutan script dikoreksi. Dampak sebelum perbaikan: semua perubahan project (termasuk status Active/On Hold) hilang setelah reload.

Uji: 17/17 view render tanpa error; daily (kategori, ubah kegiatan, detail + fokus kegiatan & rutinitas, resume fokus setelah reload, tandai selesai dari detail); goals (tambah/hapus sub goal, edit goal, hapus goal + lepas tautan project); project task (ubah/hapus di halaman daftar & detail); status project (chip cepat di detail, chip di form edit, persist setelah reload); regression store project (status, nama, project baru bertahan setelah reload, penautan goal tetap jalan).

## ui45 — kerapian UI Daily Task (2026-09-14)

Permintaan pengguna (dari tangkapan layar): samakan font/ukuran chip kategori dengan chip "Umum"; beri garis seperti chip tanggal agar rapi; jadikan Sesi Fokus satu baris dengan tombol Tandai Selesai; rapikan sisa tampilan Daily Task.

Perubahan: `public/js/modules/daily-tasks.js` (chip kategori di kartu rutinitas, `dailyFocusActionHtml()` menggantikan `dailyFocusCardHtml()`, sel Total fokus pada detail rutinitas, dua baris aksi `dt-actions-main`/`dt-actions-sub` di kedua halaman detail), `public/styles.css` (blok `ui45`: `.dt-tags`, `.dt-actions-*`, `.dt-focus-inline`, media query ≤420px), `public/index.html` (cache-bust `ui45`), `docs/modules/daily-tasks.md`.

Bukti ukur (lokal & produksi, computed style): chip kategori rutin vs chip agenda → 12px / weight 600 / tinggi 22px / border 1px / radius 999px (identik); detail kegiatan baris utama `flexDirection: row` berisi [Tandai Selesai, ▶ Mulai Fokus] (saat fokus berjalan: [Tandai Selesai, grup timer + Jeda/Stop]); baris kedua [Ubah, Hapus]; section "Sesi Fokus" terpisah sudah tidak ada; tanpa overflow horizontal; 0 error JS.

## ui46–ui48 — rapikan detail kegiatan Daily Task (2026-09-14, commit `563a5ae`, `d3b2e77`, `a61f30e`)

Permintaan pengguna (tangkapan layar "Detail Kegiatan — Anjing"): kata "Umum" disamakan font/ukurannya dengan "Prioritas Sedang" dan "In Progres"; bagian kategori (Kartu Info) diberi spacing/garis seperti sel Tanggal.

Perubahan: `public/styles.css` (`.task-detail-chips .task-chip.tag` digabung rule `.prio/.status`; `.task-info-cell:nth-of-type(n+3)` diberi `border-top`), `public/js/modules/daily-tasks.js` (chip kategori selalu dirender dengan default `'Umum'`; fallback kartu info & agenda `'Kegiatan'` → `'Umum'`), `public/index.html` (cache-bust ui46→ui47→ui48).

Verifikasi produksi (replika persis kasus pengguna: kegiatan tanpa kategori eksplisit, prioritas sedang, jam 18:46, sudah pernah fokus): chip `Umum`/`Prioritas Sedang`/`In Progres` identik (12px/800/4px 12px/28px/999px); sel Kategori & Total fokus `border-top: 1px`, padding 14px seragam, posisi y sejajar; agenda menampilkan `Umum`; 0 error JS.

## ui49 — perataan Kategori di kartu Info Daily Task (2026-09-14, commit `0d5061d`)

Keluhan lanjutan dari ui46–48: "Umum" belum rapi — harus persis di bawah "Tanggal hari ini".

Diagnosis terukur (getBoundingClientRect, viewport 390px): sel Kategori di kolom kiri baris kedua mendapat `border-left + padding-left:16px + margin-left:16px` karena selektor pemisah lama `.task-info-cell + .task-info-cell` juga cocok dengan sel ke-3 ⇒ x=51 (Tanggal: 35), lebar 144 (Tanggal: 160).

Perbaikan: pemisah kolom dipindah ke `.task-info-cell:nth-child(even)` (hanya kolom kanan). Verifikasi lokal & produksi: x Kategori = x Tanggal = 35 (label & nilai), lebar kolom sama 160px, pemisah kolom kanan tetap 1px, baris kedua sejajar, 0 error JS.

## ui50–52 — kerapian select form Project + ikon prioritas (2026-09-15, commits `d23f340`,`8c0bb30`,`ui52`)

Select "Goals" (tambah/edit project) dan "Prioritas" (edit Project Task) jatuh ke gaya default browser karena tidak pernah tercakup aturan field. Diseragamkan: `.goal-field select` ikut grup input; `.pt-edit-form select` disamakan dengan `.proj-inline input` + `min-height:46px`; `appearance:none` + panah SVG. Opsi prioritas + meta task diberi ikon 🔴/🟡/🟢 via helper `ptBadge(p)` (menggantikan penanda lama "⚡ Tinggi" yang hanya muncul untuk prioritas tinggi). Verifikasi produksi 390px: tinggi select == input (47px goals, 46px prioritas vs date), 0 error JS.

### ui53 — Progress: streak, mingguan, KPI project task done, judul bar, hapus Waktu & Prioritas
- File: js/modules/progress.js (streak sumber centang aktif-only, byCat Mingguan +specificWeekly, progTaskStats ptDone/ptTotal, kartu prio dihapus), js/core/09-router.js (judul).
- Verifikasi lokal+produksi browser_exec: streak dihitung dari slots habit store; KPI Project task done 2/7; kartu Kebiasaan September; 0 error JS.

# Audit Refactor — Tracker Daily (TAHAP 0)

Tanggal audit: 2026-09-13 · Commit basis: `e2e6287` (branch `main`, working tree bersih)
Status: **LAPORAN SAJA — belum ada kode yang dipindahkan/diubah.**
Lokasi project: `/opt/tracker-daily`

---

## 1. Verifikasi struktur & toolchain

| Item | Hasil |
|---|---|
| Stack | Vanilla JS + satu IIFE, HTML/CSS statis, server HTTP native, serverless `api/`, Supabase, Vercel static |
| Runtime deps | **tidak ada** (`package.json` tanpa dependencies/devDependencies) |
| Node / npm | v22.23.1 / 10.9.8 |
| Build | `npm run build` → `scripts/write-config.js` (`.env.local` → `public/runtime-config.js`) |
| Build Vercel | `npm run vercel:prebuild` → `scripts/build-vercel-static.js` (output `.vercel/output`, **copyDir rekursif → subfolder `public/js/**` otomatis ikut ter-deploy**) |
| Deploy env | `npm run vercel:env` → `scripts/sync-vercel-env.js` |
| Jalankan lokal | `npm start` (= `node server.js`, default port 3000; audit memakai 3999) |
| Lint | **tidak ada** (tidak ada eslint/prettier/editorconfig) |
| Test | **tidak ada** (tidak ada jest/vitest/`test/`) |
| Typecheck | **tidak ada** (bukan TypeScript, tidak ada tsconfig) |
| Syntax check tersedia | `node --check public/app.js` → **OK** |
| Git | ya; `main`; tree bersih; 60 commit; remote `github.com/hengkikrs/tracker-daily` |
| Rollback | commit `e2e6287` + tag `pre-refactor-baseline` (dibuat saat audit) |
| `.vercel/output` | sudah tergenerate (static + `functions/lookup-user.func`) |
| `public/app.js` sebagai static asset | ya (disajikan `server.js` dan output Vercel); di-cache-bust lewat query `?v=...` di `index.html` |
| Secret | `.env.local` **tidak dibaca**; hanya nama key yang dicatat (isi tidak ditampilkan) |

Catatan: `public/runtime-config.js` dan `.vercel/` ada di `.gitignore` (generated).

## 2. Pemuatan script (fakta, bukan asumsi)

`public/index.html` (L167–168), di akhir `<body>`:

```html
<script src="runtime-config.js?v=20260525"></script>
<script src="app.js?v=20260910-ui41"></script>
```

- Dua-duanya **classic script** (bukan `type="module"`).
- **Tidak ada** inline handler (`onclick=` dsb.) di `index.html` maupun di string HTML yang digenerate `app.js`.
- `const dom = {...}` (L126–139) menangkap elemen DOM saat load → script **harus** tetap di akhir body / setelah DOM ada.
- Hanya **2 pemanggilan top-level** di seluruh app.js: `migrateLegacyStores();` (L225, deklarasinya L214) dan `init();` (L8773, baris terakhir).
- IIFE dibungkus `(() => { 'use strict'; ... })();`.

## 3. Peta ukuran app.js (terukur)

`public/app.js`: **8.774 baris**, 464 KB. Isinya: **400 deklarasi `function`** + **188 deklarasi `const/let/var`** pada level atas IIFE = **588 simbol unik, 0 nama duplikat**.

| # | Section | Baris | LOC | fn | var |
|---|---|---|---|---|---|
| 1 | core-bootstrap | 1–270 | 270 | 5 | 48 |
| 2 | auth + remote-sync | 271–894 | 624 | 53 | 1 |
| 3 | habit-model (+toast/theme) | 895–1147 | 253 | 18 | 0 |
| 4 | auth-screen | 1148–1307 | 160 | 4 | 1 |
| 5 | daily-tasks | 1308–1651 | 344 | 15 | 7 |
| 6 | jadwal | 1652–1860 | 209 | 9 | 6 |
| 7 | shell-router | 1861–2063 | 203 | 1 | 1 |
| 8 | tasks + focus | 2064–2831 | 768 | 32 | 12 |
| 9 | goals | 2832–3139 | 308 | 14 | 12 |
| 10 | projects | 3140–3696 | 557 | 25 | 20 |
| 11 | notes | 3697–4115 | 419 | 30 | 14 |
| 12 | report-legacy | 4116–4326 | 211 | 11 | 0 |
| 13 | savings | 4327–4704 | 378 | 22 | 11 |
| 14 | budget | 4705–4992 | 288 | 20 | 9 |
| 15 | transactions | 4993–5281 | 289 | 24 | 8 |
| 16 | documents | 5282–5682 | 401 | 27 | 15 |
| 17 | progress | 5683–5898 | 216 | 9 | 0 |
| 18 | dashboard | 5899–6194 | 296 | 10 | 0 |
| 19 | habit-analytics | 6195–6406 | 212 | 7 | 8 |
| 20 | miawai | 6407–6596 | 190 | 7 | 4 |
| 21 | account | 6597–6740 | 144 | 4 | 0 |
| 22 | legacy-weekly (habit lama + alur login) | 6741–7478 | 738 | 27 | 0 |
| 23 | bindEvents | 7479–7948 | 470 | 1 | 0 |
| 24 | init | 7949–7975 | 27 | 1 | 9 |
| 25 | laporan-export | 7976–8774 | 1.024 | 24 | 2 |

## 4. Temuan dependency (dasar keputusan modularisasi)

### 4.1 Simbol shared paling berat (fan-in = jumlah fungsi yang memakainya)

| Simbol | Dipakai | Section asal |
|---|---|---|
| `$` (helper querySelector) | **188 fungsi** | core |
| `escapeHtml` | 59 | core/utils |
| `state` (objek state utama) | 48 | core |
| `renderShell` (router) | 45 | core/router |
| `showToast` | 38 | core |
| `saveState` | 32 | storage |
| `MONTHS`, `dom` | 26 / 23 | core |
| `activeYear`, `authSession` | 19 / 18 | core |
| `activeMonth` | 17 | core |
| `scopedKey` | 16 | core |
| `activeView` | 15 | core |

Kesimpulan: **semua modul bergantung pada satu lapisan fondasi bersama** (`$`, `escapeHtml`, `state`, `saveState`, `showToast`, `activeView/activeMonth/activeYear`, `scopedKey`). Tidak ada satu pun section yang bebas dependency.

### 4.2 Hambatan utama: state mutable lintas section

**67 variabel level-IIFE di-assign dari ≥2 section berbeda** (dari 125 variabel yang pernah di-assign). Contoh:

- `activeView` — di-assign di **11 section** (core, auth+sync, bindEvents, budget, daily-tasks, dashboard, goals, jadwal, legacy-weekly, projects, report-legacy).
- `activeYear`, `activeMonth` — 5 section; `state` — 3 section; `taskDetailId`, `jadwalSelIso`, `authPending*` — 4 section; puluhan var modul (`notePage`, `projTab`, `goalsPage`, `focusTaskId`, …) — 2–3 section.

**Konsekuensi teknis (penting):** pada ES module, binding yang di-`import` bersifat **read-only** untuk pengimpor, sehingga 67 variabel ini tidak bisa di-assign dari file lain. Opsi ES module karena itu menuntut konversi ke state-store/accessor — yaitu **perubahan arsitektur**, bukan pemindahan file (masuk STOP CONDITION).

### 4.3 Coupling antar-section (jumlah simbol berbeda yang keluar/masuk)

Semua section punya outbound ke `core` (18–103 simbol). Inbound (`in`) paling kecil = paling "daun": `progress` (2), `account` (2), `laporan-export` (2), `dashboard` (4), `report-legacy` (11), `documents` (14), `auth-screen` (16), `jadwal` (18), `daily-tasks` (19), `savings`/`budget` (20), `notes` (22).

### 4.4 Titik sensitif

- **`bindEvents` (L7479–7948, 470 baris)**: satu listener global, mendelegasikan ke **20 handler `handle*Action`** dari 23 section (legacy-weekly 16, tasks 9, notes 6, documents 5, projects 5, budget 4, daily-tasks 4, auth 4, …). Setiap modul yang dipindah **wajib tetap terjangkau** dari titik dispatch ini.
- **`renderShell` (L1861–2048, 187 baris)**: 18 cabang `activeView === '<view>'`; `data-view` di `index.html` = 17 (semua tercakup; `habits` muncul 2× di renderShell).
- **Storage**: semua kunci `miaw-tracker.*` + `proj-tracker.projects.v1`, scoped per user (`:<user-id>`), diamankan `applyUserScope` + `migrateLegacyStores` + `SCHEMA_VERSION`. Remote sync: `queueRemoteSave`/`flushRemoteSave`/`saveRemoteState`/`hydrateRemoteState` dengan debounce 150 ms.

### 4.5 Catatan pembacaan (untuk kerja berikutnya)

Baris yang memuat nilai sensitif (mis. `Authorization: Bearer ${...}`, `apikey: ...`) **disensor sebagian oleh tool pembaca file**. Jangan terkejut bila hasil pembacaan tampak terpotong di `supabaseFetch` (L774–802).

## 5. Opsi modularisasi

### Opsi A — ES module (`type="module"`) — **TIDAK disarankan untuk tahap ini**
Butuh: konversi 67 variabel shared-state (4.2), ubah 2 script tag jadi module (+ `runtime-config.js` ikut), dan perubahan timing eksekusi (module = deferred). Hasil akhir lebih rapi, tetapi = perubahan arsitektur → butuh persetujuan eksplisit (TAHAP 12).

### Opsi B — Classic script berurutan, IIFE dibuka (in-place split) — **REKOMENDASI**
Fakta pendukung (terverifikasi):
1. `node --check` OK → tidak ada assignment ke `const`.
2. **0 tabrakan** dari 588 nama top-level dengan properti `window` (uji runtime: `names.filter(n => n in window)` → kosong) → membuka IIFE tidak akan menabrak global bawaan browser.
3. Hanya 2 statement top-level yang benar-benar eksekusi (`migrateLegacyStores()` L225 dan `init()` L8773) → **urutan load aman** asalkan urutan file mengikuti urutan section dan `init()` terakhir.
4. Tidak ada inline handler dan tidak ada script lain → tidak ada pemanggil eksternal yang bisa putus.
5. Build Vercel menyalin `public/` rekursif → `public/js/**` otomatis ter-deploy; `server.js` juga menyajikan subfolder.

Perubahan mekanis: hapus pembungkus IIFE, jadikan `app.js` (atau `js/*`) kumpulan classic script ber-urutan dengan `'use strict';` di setiap file. Deklarasi `let/const` top-level di classic script berada di *global lexical environment* → **dibaca dan di-assign lintas file tanpa mengubah satu pun nama identifier**. Ini yang membuat pemindahan menjadi "potong-tempel", bukan rewrite.

Risiko Opsi B: (a) urutan load harus benar, (b) tidak boleh ada deklarasi nama sama di dua file (early error) → dicek oleh validator, (c) global namespace jadi lebih terbuka (kosmetik).

### Peta 33 file yang diusulkan (Opsi B) — LOC terukur dari kode aktual

| Target file | LOC | fn | var |
|---|---|---|---|
| `js/core/01-config.js` | 140 | 0 | 19 |
| `js/core/02-runtime-dom.js` | 27 | 0 | 6 |
| `js/core/03-state.js` | 109+15 | 5 | 25 |
| `js/core/04-utils.js` | 150 | 22 | 0 |
| `js/core/05-storage.js` | 167 | 15 | 0 |
| `js/core/06-toast.js` | 7 | 1 | 0 |
| `js/core/07-theme.js` | 16 | 2 | 0 |
| `js/core/08-nav.js` | 34 | 3 | 0 |
| `js/core/09-router.js` | 222 | 5 | 0 |
| `js/auth/11-session.js` | 77 | 8 | 0 |
| `js/auth/12-oauth.js` | 118 | 6 | 0 |
| `js/auth/13-remote-sync.js` | 189 | 10 | 0 |
| `js/auth/14-auth-ui.js` | 719 | 22 | 0 |
| `js/modules/habit-analytics.js` | 333 | 12 | 8 |
| `js/modules/habit-legacy.js` | 297 | 10 | 0 |
| `js/modules/daily-tasks.js` | 344 | 15 | 7 |
| `js/modules/schedule.js` | 209 | 9 | 6 |
| `js/modules/tasks.js` | 764 | 31 | 12 |
| `js/modules/goals.js` | 308 | 14 | 12 |
| `js/modules/projects.js` | 557 | 25 | 20 |
| `js/modules/notes.js` | 419 | 30 | 14 |
| `js/modules/finance-reports-legacy.js` | 211 | 11 | 0 |
| `js/modules/finance-savings.js` | 378 | 22 | 11 |
| `js/modules/finance-budget.js` | 288 | 20 | 9 |
| `js/modules/finance-transactions.js` | 289 | 24 | 8 |
| `js/modules/finance-documents.js` | 401 | 27 | 15 |
| `js/modules/progress.js` | 216 | 9 | 0 |
| `js/modules/dashboard.js` | 281 | 9 | 0 |
| `js/modules/miawai.js` | 190 | 7 | 4 |
| `js/modules/laporan-export.js` | 800 | 24 | 2 |
| `js/events/20-bind-events.js` | 470 | 1 | 0 |
| `js/bootstrap/30-init.js` | 27 | 1 | 9 |
| **TOTAL** | **8.772** | **400** | **187** |

(1 var di section shell-router belum terpetakan ke file → akan difinalkan saat eksekusi.)

Daftar simbol lengkap per section + baris: lihat `section-index.md` (artefak audit).

### Dampak hemat baca (terukur, bukan klaim persen)

| Tugas | Minimum yang perlu dibaca HARI INI | Setelah split |
|---|---|---|
| Ubah UI Daily Task | section 344 L + fondasi (config/state/utils/storage/toast ~450 L) + cabang router + cabang dispatch bindEvents ≈ **1,2–1,9 k baris** | `modules/daily-tasks.js` (344 L) + `core/05-storage.js` (167 L) + `docs/modules/daily-tasks.md` ≈ **0,5 k baris** |
| Ubah Notes | section 419 L + fondasi + router + dispatch ≈ **1,3–2,0 k baris** | `modules/notes.js` (419 L) + storage + docs ≈ **0,6 k baris** |
| Ubah transaksi keuangan | section 289 L + `txRp/txList/txFind` (semuanya di section yang sama) + fondasi ≈ **1,0–1,7 k baris** | `modules/finance-transactions.js` (289 L) + storage + docs ≈ **0,45 k baris** |
| Ubah ekspor PDF/DOC laporan | 1.024 L + fondasi + `init` = **1,5 k+** | `modules/laporan-export.js` (800 L) + docs ≈ **0,8 k baris** |

Angka "hari ini" mencakup fakta bahwa hari ini **memotong rentang baris tetap menuntut memahami fondasi IIFE di baris 1–500** sebelum aman menyentuh modul; setelah split, fondasi itu punya file sendiri dan tidak perlu dibaca ulang kecuali berubah.

## 6. Urutan refactor yang diusulkan + estimasi risiko

Setiap fase = **1 commit + 1 validasi** (fingerprint 17 route + `node --check` + cek deklarasi duplikat).

| Fase | Isi | Risiko | Rollback |
|---|---|---|---|
| **FASE 0** | docs/ + AGENTS.md + indeks simbol + harness validasi (TANPA ubah kode) | **Sangat rendah** | hapus file baru |
| **FASE A** | Ekstrak yang **murni & tanpa state**: `01-config`, `04-utils`, `06-toast`, `07-theme` (IIFE tetap utuh; file baru dimuat lebih dulu; IIFE melihatnya via global lookup) | **Rendah** | `git revert` commit fase |
| **FASE B** | `02-runtime-dom`, `05-storage`, `03-state` + **satu langkah kunci: buka pembungkus IIFE** (`'use strict'` per file). Di sini urutan load jadi kontrak. | **Sedang** — satu perubahan global, tetapi mekanis & terverifikasi (0 tabrakan global, hanya 2 statement top-level) | revert commit + tag baseline |
| **FASE C** | Modul terisolasi: `notes` (in=22), `daily-tasks` (19), `schedule` (18) | Sedang–rendah | revert per modul |
| **FASE D** | `tasks` (+focus), `goals`, `projects` | Sedang (coupling tasks↔projects = 15 simbol) | revert per modul |
| **FASE E** | `finance-savings/budget/transactions/documents/reports-legacy` | Sedang (budget↔transactions = 15, savings↔transactions = 12) | revert per modul |
| **FASE F** | `progress`, `dashboard`, `habit-analytics`, `laporan-export` (semuanya `in` ≤ 4 → paling aman di akhir) | Rendah | revert per modul |
| **FASE G** | `auth/*`, `core/09-router`, `events/20-bind-events`, `bootstrap/30-init` | **Tinggi** — dilakukan terakhir, setelah semua modul stabil & teruji | revert + tag |
| **FASE H** | `modules/habit-legacy` (kode lama; jangan dipindah sebelum dipastikan masih dipakai) | Tinggi (butuh keputusan: masih dipakai atau tidak) | — |

## 7. Harness validasi (sudah diuji, tetap ada sebelum & sesudah refactor)

Bukan test suite otomatis (project tidak punya), tetapi **differential test** nyata:

1. `node --check` setiap file JS.
2. Cek deklarasi duplikat lintas file (nama top-level harus unik).
3. Jalankan `PORT=3999 node server.js`.
4. Buka `http://127.0.0.1:3999` di Chrome headless (CDP 9222), sesi palsu di `localStorage['miaw-tracker.auth-session.v1']` (karena `remoteEnabled=false` → app jalan offline penuh, tanpa jaringan).
5. Klik ke-17 `data-view`, catat `#content`: panjang HTML, jumlah node, checksum → dibandingkan dengan **`audit-baseline.json`** yang sudah direkam dari kode sebelum refactor.
6. Cek `Object.keys(localStorage)` → harus tetap 7 kunci ber-scope `:<user-id>` (terbukti saat audit: `miaw-tracker.theme`, `state.v1:audit-user`, `goals.v1:audit-user`, `notes.v1:audit-user`, `proj-tracker.projects.v1:audit-user`, `jadwal.v1:audit-user`, `auth-session.v1`).
7. `npm run build` + `npm run vercel:prebuild` → pastikan `public/js/**` ikut ke `.vercel/output/static/js/**`.
8. `git diff --stat` per fase.

Baseline tersimpan: `/home/ubuntu/tracker-daily-refactor-audit/audit-baseline.json`.

**Tidak diuji (dan tidak akan diklaim teruji):** login Supabase asli, OTP, Google OAuth, remote sync nyata (butuh kredensial + jaringan), dan interaksi tulis (tambah/hapus entri) per modul. Opsi: tambah skrip harness aksi-tulis bila disetujui (di luar lingkup audit).

## 8. STOP CONDITION yang terpicu / perlu keputusan Anda

1. **ES module** = perubahan arsitektur (67 var shared-state) → **minta persetujuan** jika ingin Opsi A. (Rekomendasi: Opsi B.)
2. **Membuka pembungkus IIFE** (FASE B) mengubah bentuk file entry (`app.js` → kumpulan script ber-urutan). Secara perilaku aman menurut 3 pengujian di §5, tetapi tetap perubahan global → **butuh persetujuan sebelum FASE B**.
3. `modules/habit-legacy` (738 L, section legacy-weekly) — **masih dipakai atau tidak harus diputuskan** (analisis lebih dalam diperlukan sebelum dipindah).
4. `report-legacy` memakai `goals.v1` — **tidak diubah**; dicatat sebagai potensi bug, bukan diperbaiki di refactor ini.
5. `read_file` menyensor sebagian baris ber-`Bearer`/`apikey` → bisa menyulitkan pembacaan selektif di `supabaseFetch`.

## 9. Artefak audit

- `docs/refactor-audit.md` (dokumen ini, di dalam repo)
- `/home/ubuntu/tracker-daily-refactor-audit/`
  - `app.js` (salinan kode sebelum refactor, sebagai pembanding)
  - `audit-baseline.json` (fingerprint 17 route)
  - `section-index.md` (588 simbol + nomor baris per section)
  - `split-plan.json` (peta 33 file + daftar simbol per file)
  - `analyze_app.py`, `analyze2.py`, `analyze3.py`, `index_sections.py`, `split_plan.py` (skrip analisis, read-only)
- Git tag `pre-refactor-baseline` (commit `e2e6287`)

## 10. Langkah berikutnya (menunggu persetujuan)

- **Mulai dari FASE 0** (docs + AGENTS.md + harness) — nol perubahan perilaku.
- Setelah itu FASE A (ekstrak murni: config/utils/toast/theme).
- FASE B menunggu keputusan eksplisit soal pembukaan IIFE.

---

## Koreksi pasca-audit (2026-09-14)
Dua klaim di dokumen ini dikoreksi setelah kode dibaca ulang saat membuat `docs/navigation.md`
(dan sekarang terdokumentasi di `docs/decisions/refactor-log.md`):

1. Peta view Laporan **tertukar** di §3/§4: `data-view="laporan-keuangan"` → `renderReportView()` (modul finance-reports-legacy),
   sedangkan `data-view="reports"` → `renderLaporanView()` (modul laporan-export, ekspor PDF/DOC).
2. `data-view="task"` (menu "Daily Task") → `renderDailyTaskView()`; `renderTaskDetail()` adalah jalur legacy
   yang hanya aktif bila `taskDetailId` terisi.

Temuan tambahan yang didokumentasikan dan **tidak** diperbaiki (di luar lingkup refactor):
`miaw-tracker.daily-tasks.v1` tidak termasuk `DATA_STORE_KEYS` → tidak ikut `migrateLegacyStores()`/`removeUserDataFor()`.

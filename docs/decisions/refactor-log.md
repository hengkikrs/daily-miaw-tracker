# Refactor Log — Tracker Daily

Aturan: setiap fase = **1 commit + 1 validasi**. Jangan lompat fase. Jangan gabungkan dua fase dalam satu commit.

## Status
| Fase | Isi | Status |
|---|---|---|
| TAHAP 0 | Audit + baseline | ✅ selesai (`docs/refactor-audit.md`, tag `pre-refactor-baseline`) |
| FASE 0 | Dokumentasi + AGENTS.md + validator + indeks simbol | ✅ selesai (tanpa perubahan perilaku) |
| FASE A | Ekstrak murni: `core/01-config.js`, `core/04-utils.js`, `core/07-theme.js` | ⏳ belum |
| FASE B | `02-runtime-dom`, `05-storage`, `03-state` + **buka pembungkus IIFE** (butuh approval terpisah) | ⏳ belum |
| FASE C | `modules/notes`, `modules/daily-tasks`, `modules/schedule` | ⏳ belum |
| FASE D | `modules/tasks`, `modules/goals`, `modules/projects` | ⏳ belum |
| FASE E | `modules/finance-*` | ⏳ belum |
| FASE F | `modules/progress`, `dashboard`, `habit-analytics`, `laporan-export` | ⏳ belum |
| FASE G | `auth/*`, `core/09-router`, `events/20-bind-events`, `bootstrap/30-init` | ⏳ belum |
| FASE H | `modules/habit-legacy` (status pemakaian harus dipastikan dulu) | ⏳ belum |

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

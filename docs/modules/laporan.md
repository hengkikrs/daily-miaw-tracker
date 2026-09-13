# Laporan lintas modul + ekspor PDF/DOC

## Purpose
Menu Laporan: mode periode (bulan/3 bulan/tahun), section Activity/Goals/Organization/Finance, ringkasan AI, ekspor PDF & DOC mandiri.

## Main files
- Asal (sebelum refactor): `public/app.js` baris 7976-8774 (1024 baris, 24 fungsi, 2 var)
- Nomor baris per file: `docs/symbol-index.md` (generated).
- File modul: `public/js/modules/laporan-export.js`

## Entry points
- `renderLaporanView`
- `handleLaporanAction`

## Important functions
### Handler aksi / render
- `renderLaporanView`
- `handleLaporanAction`

### Baca & tulis store
- (tidak ada)

### Helper internal
- `lapPad`
- `lapRp`
- `lapPct`
- `lapMonthKey`
- `lapDateId`
- `lapShortMonth`
- `lapPeriod`
- `lapInRange`
- `lapActivityBlocks`
- `lapGoalsBlocks`
- `lapOrgBlocks`
- `lapFinanceBlocks`
- `lapAiBlocks`
- `lapBuildModel`
- `lapAiDigest`
- `lapRunAi`
- `lapBlocksHtml`
- `lapPdfAscii`

## State and storage
- `miaw-tracker.state.v1 → sub-store: state.savings, state.savingsTx`
- State modul (var level-IIFE): lihat `docs/symbol-index.md` bagian section `laporan-export`

## DOM dependencies
- (tidak ada selector langsung)
- Registry elemen global: `dom` (di `core/02-runtime-dom.js`)

## Event dependencies
- `data-lap-dl (3x)`
- `data-lap-mode (2x)`
- `data-lap-sec (2x)`
- `data-lap-all (2x)`
- `data-lap-ai (2x)`
- Dispatch: `bindEvents()` (`events/20-bind-events.js`) → lihat `docs/navigation.md`

## Related modules
- `core-bootstrap (26)`
- `init (22)`
- `habit-model (5)`
- `budget (5)`
- `auth+remote-sync (4)`
- `goals (3)`

## Safe editing guide
Render → `renderLaporanView`/`lapBlocksHtml`; model → `lapBuildModel` (+ `lapActivityBlocks`/`lapGoalsBlocks`/`lapOrgBlocks`/`lapFinanceBlocks`); ekspor → `lapDownload`/`lapPdfBytes`/`lapDocHtml`/`lapFileName`; aksi → `handleLaporanAction`.

## Known risks
Engine PDF mandiri (tabel lebar font WinAnsi `LAP_PDF_W_*`) — jangan "merapikan" angka tabel itu. AI memakai `lapRunAi`/`lapAiDigest` (prompt dipadatkan agar tidak timeout). `handleLaporanAction` dipanggil dari `bindEvents`.

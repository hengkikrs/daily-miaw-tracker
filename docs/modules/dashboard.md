# Dashboard

## Purpose
Kartu lintas modul: ring statistik, tren habit, kasflow, donut kategori, agenda, dan navigasi cepat `data-dash-go`.

## Main files
- Sekarang: `public/app.js` baris 5899-6194 (296 baris, 10 fungsi, 0 var)
- Nomor baris `public/app.js` bergeser setiap kali kode dipindah — acuan otoritatif: `docs/symbol-index.md`.
- Target refactor: `public/js/modules/dashboard.js`

## Entry points
- `renderPlaceholderView`
- `renderDashboard`
- `handleDashAction`

## Important functions
### Handler aksi / render
- `renderPlaceholderView`
- `renderDashboard`
- `handleDashAction`

### Baca & tulis store
- (tidak ada)

### Helper internal
- `dashRp`
- `goalPctOf`
- `dashCompact`
- `dashSparkline`
- `dashCompute`
- `dashGoTo`
- `dashCard`

## State and storage
- `miaw-tracker.state.v1 → sub-store: `
- State modul (var level-IIFE): lihat `docs/symbol-index.md` bagian section `dashboard`

## DOM dependencies
- (tidak ada selector langsung)
- Registry elemen global: `dom` (di `core/02-runtime-dom.js`)

## Event dependencies
- `data-dash-go (9x)`
- Dispatch: `bindEvents()` (`events/20-bind-events.js`) → lihat `docs/navigation.md`

## Related modules
- `core-bootstrap (13)`
- `report-legacy (8)`
- `auth+remote-sync (7)`
- `habit-model (6)`
- `transactions (5)`
- `tasks+focus (4)`

## Safe editing guide
Render → `renderDashboard`; aksi → `handleDashAction`; komputasi → `dashCompute` (+ `dashSparkline`, `dashRp`, `goalPctOf`).

## Known risks
Mengagregasi hampir semua modul lain (habit, task, goals, finance) tanpa menulis store. Perubahan bentuk data modul lain berdampak ke sini.

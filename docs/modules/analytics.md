# Analytics (Habit)

## Purpose
Analitik habit: strip persen harian, kalender poin, metrik, tren, tab habit, breakdown kategori, dan leaderboard.

## Main files
- Asal (sebelum refactor): `public/app.js` baris 6195-6406 (212 baris, 7 fungsi, 8 var)
- Nomor baris per file: `docs/symbol-index.md` (generated).
- File modul: `public/js/modules/habit-analytics.js`

## Entry points
- `renderDailyPercentStrip`
- `renderPointCalendar`
- `renderMetric`
- `renderTrendChart`
- `renderHabitsTab`

## Important functions
### Handler aksi / render
- `renderDailyPercentStrip`
- `renderPointCalendar`
- `renderMetric`
- `renderTrendChart`
- `renderHabitsTab`

### Baca & tulis store
- (tidak ada)

### Helper internal
- `calculateCategoryBreakdown`
- `scoreClass`

## State and storage
- (tidak ada)
- State modul (var level-IIFE): lihat `docs/symbol-index.md` bagian section `habit-analytics`

## DOM dependencies
- (tidak ada selector langsung)
- Registry elemen global: `dom` (di `core/02-runtime-dom.js`)

## Event dependencies
- `data-action (1x)`
- Dispatch: `bindEvents()` (`events/20-bind-events.js`) → lihat `docs/navigation.md`

## Related modules
- `core-bootstrap (12)`
- `auth+remote-sync (8)`
- `habit-model (3)`
- `legacy-weekly (1)`

## Safe editing guide
Render → `renderHabitsTab`/`renderDailyPercentStrip`/`renderPointCalendar`/`renderMetric`/`renderTrendChart`; komputasi → `calculateCategoryBreakdown`/`calculateHabitProgress`/`calculateMonthStats`.

## Known risks
Berbagi model habit lama dengan section `habit-model` (L895–1147). Fungsi kalkulasi dipakai juga oleh Dashboard/Progress — jangan ubah signature.

# Progress

## Purpose
Ringkasan progres: donut, ring, bar habit/task/goal, dan tab.

## Main files
- Asal (sebelum refactor): `public/app.js` baris 5683-5898 (216 baris, 9 fungsi, 0 var)
- Nomor baris per file: `docs/symbol-index.md` (generated).
- File modul: `public/js/modules/progress.js`

## Entry points
- `renderProgressView`
- `handleProgressAction`

## Important functions
### Handler aksi / render
- `renderProgressView`
- `handleProgressAction`

### Baca & tulis store
- (tidak ada)

### Helper internal
- `progTaskDone`
- `progHabitStats`
- `progGoalStats`
- `progTaskStats`
- `progDonut`
- `progRing`
- `progBars`

## State and storage
- (tidak ada)
- State modul (var level-IIFE): lihat `docs/symbol-index.md` bagian section `progress`

## DOM dependencies
- (tidak ada selector langsung)
- Registry elemen global: `dom` (di `core/02-runtime-dom.js`)

## Event dependencies
- `data-progress-tab (1x)`
- Dispatch: `bindEvents()` (`events/20-bind-events.js`) → lihat `docs/navigation.md`

## Related modules
- `core-bootstrap (8)`
- `habit-model (6)`
- `auth+remote-sync (6)`
- `tasks+focus (2)`
- `goals (2)`
- `shell-router (1)`

## Safe editing guide
Render → `renderProgressView`; aksi → `handleProgressAction`; helper → `progHabitStats`/`progGoalStats`/`progTaskStats`/`progDonut`/`progRing`/`progBars`.

## Known risks
Read-only terhadap modul lain (tidak menulis store). `in` hanya 2 → paling aman dipindah lebih awal.

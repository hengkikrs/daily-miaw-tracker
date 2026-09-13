# Daily Tasks

## Purpose
Mengelola rutinitas non-project: daftar "Hari Ini", jadwal rutin per-hari (DAILY_ROUTINES), streak, tab Rutinitas/Selesai, dan detail item.

## Main files
- Sekarang: `public/app.js` baris 1308-1651 (344 baris, 15 fungsi, 7 var)
- Target refactor: `public/js/modules/daily-tasks.js`

## Entry points
- `renderDailyTaskView`
- `renderDailyDetail`
- `handleDailyAction`

## Important functions
### Handler aksi / render
- `renderDailyTaskView`
- `renderDailyDetail`
- `handleDailyAction`

### Baca & tulis store
- `loadDailyTasks`
- `saveDailyTasks`

### Helper internal
- `dailyTodayIso`
- `dailyDowOf`
- `dailyRoutineApplies`
- `dailyRoutineDoneKey`
- `dailyIsRoutineDone`
- `dailySetRoutineDone`
- `dailyRoutineStats`
- `dailyDayList`
- `dailyAddDraftDefaults`
- `dailyDetailOf`

## State and storage
- `miaw-tracker.daily-tasks.v1`
- `miaw-tracker.daily-tasks.v1 (+ .log)`
- `miaw-tracker.jadwal.v1`
- `miaw-tracker.state.v1 → sub-store: `
- State modul (var level-IIFE): lihat `docs/symbol-index.md` bagian section `daily-tasks`

## DOM dependencies
- `dailyAddForm`
- Registry elemen global: `dom` (di `core/02-runtime-dom.js`)

## Event dependencies
- `data-daily-toggle (5x)`
- `data-daily-open (4x)`
- `data-daily-tab (4x)`
- `data-daily-delete (3x)`
- `data-daily-rt (2x)`
- `data-daily-id (2x)`
- `data-daily-jadwal (2x)`
- `data-daily-cancel (2x)`
- Dispatch: `bindEvents()` (`events/20-bind-events.js`) → lihat `docs/navigation.md`

## Related modules
- `core-bootstrap (10)`
- `tasks+focus (6)`
- `jadwal (4)`
- `auth+remote-sync (4)`
- `shell-router (1)`

## Safe editing guide
UI/tab → `renderDailyTaskView`/`renderDailyDetail` + `data-daily-*`. Tambah/ubah rutinitas → `DAILY_ROUTINES` + `dailyRoutineApplies`. Penyimpanan → `loadDailyTasks`/`saveDailyTasks`.

## Known risks
Log rutinitas memakai kunci turunan (`dailyRoutineDoneKey`) di dalam store `daily-tasks.v1`; jangan ubah bentuknya tanpa migrasi. Dipakai juga oleh Jadwal (L1652+) — ubah `dailyDayList` dengan hati-hati.

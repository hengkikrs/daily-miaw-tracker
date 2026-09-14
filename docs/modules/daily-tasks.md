# Daily Tasks

## Purpose
Mengelola rutinitas non-project: daftar "Hari Ini", jadwal rutin per-hari (DAILY_ROUTINES), streak, tab Rutinitas/Selesai, dan detail item.

## Main files
- Asal (sebelum refactor): `public/app.js` baris 1308-1651 (344 baris, 15 fungsi, 7 var)
- Nomor baris per file: `docs/symbol-index.md` (generated).
- File modul: `public/js/modules/daily-tasks.js`

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
- `loadDailyTasks` / `saveDailyTasks` (+ `__dailyLog` & `__routines` disimpan ke kunci terpisah karena `saveDailyTasks()` menulis hasil `filter()` → properti array tidak ikut tersimpan)
- `loadDailyRoutines` / `saveDailyRoutines` / `dailyRoutineById` / `dailyRoutineNewId` / `dailyPurgeRoutineLog`
- `dailySubmitAdd(form)` — dipanggil dari submit handler `#dailyAddForm` di `events/20-bind-events.js`

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
- Rutinitas: `loadDailyRoutines()`/`saveDailyRoutines()` di `modules/daily-tasks.js`; id rutinitas bawaan (r1–r6) dipertahankan saat materialisasi supaya riwayat/streak tidak hilang.
- Menambah atribut `data-daily-*` baru wajib menambahkannya ke daftar `closest()` di `events/20-bind-events.js` (kalau tidak, klik tidak ter-dispatch).
- Sinkronisasi: `buildStoresPayload()` mengirim `dailyRoutines` (null bila belum pernah diubah) dan `applyStoresPayload()` menulis `${DAILY_TASK_STORE_KEY}.routines` di `core/05-storage.js`.
UI/tab → `renderDailyTaskView`/`renderDailyDetail` + `data-daily-*`. Tambah/ubah rutinitas → `DAILY_ROUTINES` + `dailyRoutineApplies`. Penyimpanan → `loadDailyTasks`/`saveDailyTasks`.

## Known risks
Log rutinitas memakai kunci turunan (`dailyRoutineDoneKey`) di dalam store `daily-tasks.v1`; jangan ubah bentuknya tanpa migrasi. Dipakai juga oleh Jadwal (L1652+) — ubah `dailyDayList` dengan hati-hati.

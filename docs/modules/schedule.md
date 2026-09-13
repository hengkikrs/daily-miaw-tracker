# Schedule (Jadwal)

## Purpose
Kalender bulanan + daftar event/jadwal, penanda task pada tanggal, mode kalender/daftar, dan navigasi ke detail task.

## Main files
- Sekarang: `public/app.js` baris 1652-1860 (209 baris, 9 fungsi, 6 var)
- Target refactor: `public/js/modules/schedule.js`

## Entry points
- `renderJadwalView`
- `handleJadwalAction`

## Important functions
### Handler aksi / render
- `renderJadwalView`
- `handleJadwalAction`

### Baca & tulis store
- `loadJadwalEvents`
- `saveJadwalEvents`

### Helper internal
- `jadwalCatColor`
- `jadwalItems`
- `jadwalMonthGrid`
- `jadwalDayTitle`
- `jadwalRowHtml`

## State and storage
- `miaw-tracker.jadwal.v1`
- `miaw-tracker.state.v1 → sub-store: `
- State modul (var level-IIFE): lihat `docs/symbol-index.md` bagian section `jadwal`

## DOM dependencies
- `jadwalAddForm`
- Registry elemen global: `dom` (di `core/02-runtime-dom.js`)

## Event dependencies
- `data-jadwal-mode (3x)`
- `data-jadwal-check (2x)`
- `data-jadwal-ev (2x)`
- `data-jadwal-task (2x)`
- `data-jadwal-cancel (2x)`
- `data-jadwal-day (2x)`
- `data-jadwal-prev (2x)`
- `data-jadwal-next (2x)`
- Dispatch: `bindEvents()` (`events/20-bind-events.js`) → lihat `docs/navigation.md`

## Related modules
- `core-bootstrap (9)`
- `tasks+focus (6)`
- `auth+remote-sync (4)`
- `daily-tasks (2)`
- `shell-router (1)`

## Safe editing guide
Grid → `jadwalMonthGrid`/`jadwalRowHtml`; aksi → `handleJadwalAction` (`data-jadwal-*`); simpan → `loadJadwalEvents`/`saveJadwalEvents`.

## Known risks
Membaca task dari modul Tasks (`loadTasks`) dan rutinitas dari Daily Tasks. Kunci store `miaw-tracker.jadwal.v1`. Klik baris bisa mengubah `taskDetailId` (state lintas modul).

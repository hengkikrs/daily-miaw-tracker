# Tasks (+ Focus Timer)

## Purpose
Task/subtask dengan deadline, filter, halaman tambah, timer fokus (start/pause/resume/stop), dan activity log.

## Main files
- Sekarang: `public/app.js` baris 2064-2831 (768 baris, 32 fungsi, 12 var)
- Target refactor: `public/js/modules/tasks.js`

## Entry points
- `renderTaskDetail`
- `renderTaskView`
- `renderTaskAddPage`
- `submitTaskAdd`
- `handleTaskAction`

## Important functions
### Handler aksi / render
- `renderTaskDetail`
- `renderTaskView`
- `renderTaskAddPage`
- `submitTaskAdd`
- `handleTaskAction`

### Baca & tulis store
- `loadTasks`
- `saveTasks`

### Helper internal
- `taskSeed`
- `taskTodayIso`
- `taskDateOffset`
- `taskMatchKey`
- `taskMatchFilter`
- `taskDeadlineLabel`
- `taskMinutesLabel`
- `taskRelTime`
- `taskFocusElapsedMin`
- `focusElapsedMs`
- `focusSecondsLabel`
- `logTaskActivity`
- `focusTask`
- `startFocus`
- `pauseFocus`
- `resumeFocus`
- `stopFocus`
- `tickFocusDisplay`

## State and storage
- `miaw-tracker.state.v1 → sub-store: state.tasks`
- `miaw-tracker.tasks.v1`
- State modul (var level-IIFE): lihat `docs/symbol-index.md` bagian section `tasks+focus`

## DOM dependencies
- `taskAddForm`
- `taskAddTitle`
- `taskSearchInput`
- Registry elemen global: `dom` (di `core/02-runtime-dom.js`)

## Event dependencies
- `data-focus-live (3x)`
- `data-task-focus-pause (3x)`
- `data-task-back (3x)`
- `data-task-delete (3x)`
- `data-task-toggle (3x)`
- `data-task-focus (3x)`
- `data-task-cancel-edit (2x)`
- `data-task-sub (2x)`
- Dispatch: `bindEvents()` (`events/20-bind-events.js`) → lihat `docs/navigation.md`

## Related modules
- `core-bootstrap (18)`
- `auth+remote-sync (5)`
- `projects (4)`
- `shell-router (1)`
- `habit-model (1)`

## Safe editing guide
Render → `renderTaskView`/`renderTaskDetail`/`renderTaskAddPage`; aksi → `handleTaskAction`; timer → `startFocus`/`pauseFocus`/`resumeFocus`/`stopFocus`/`tickFocusDisplay`; simpan → `loadTasks`/`saveTasks`.

## Known risks
Paling banyak state modul (`taskDetailId`, `taskFilter`, `focusTaskId`, `taskAddDraft`, …). Focus timer berjalan lewat interval dan dipulihkan setelah reload — jangan pindah tanpa memeriksa `init`. Sinergi kuat dengan Projects (15 referensi).

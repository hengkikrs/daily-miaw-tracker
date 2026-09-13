# Projects (+ Project Task)

## Purpose
Daftar project, status/chip, progress dari task, deadline, form project, tab overview/task, dan sub-form.

## Main files
- Asal (sebelum refactor): `public/app.js` baris 3140-3696 (557 baris, 25 fungsi, 20 var)
- Nomor baris per file: `docs/symbol-index.md` (generated).
- File modul: `public/js/modules/projects.js`

## Entry points
- `renderProjectListPage`
- `renderProjectDetailPage`
- `renderProjectFormPage`
- `renderProjectView`
- `renderProjectTaskView`
- `submitProjectForm`
- `handleProjectAction`
- `handleProjectChange`
- `submitProjectSubForm`

## Important functions
### Handler aksi / render
- `renderProjectListPage`
- `renderProjectDetailPage`
- `renderProjectFormPage`
- `renderProjectView`
- `renderProjectTaskView`
- `submitProjectForm`
- `handleProjectAction`
- `handleProjectChange`
- `submitProjectSubForm`

### Baca & tulis store
- `loadProjects`
- `saveProjects`

### Helper internal
- `projSeed`
- `goalTitleOf`
- `projTasks`
- `projProgress`
- `projDaysLeft`
- `projLog`
- `projTimeAgo`
- `projDeadlineLabel`
- `projStatusChip`
- `projNameOptions`
- `firstProjName`
- `projCardHtml`
- `projFormValues`
- `captureProjForm`

## State and storage
- `miaw-tracker.state.v1 → sub-store: `
- `proj-tracker.projects.v1`
- State modul (var level-IIFE): lihat `docs/symbol-index.md` bagian section `projects`

## DOM dependencies
- `projFileForm`
- `projForm`
- `projNoteForm`
- `projTaskForm`
- Registry elemen global: `dom` (di `core/02-runtime-dom.js`)

## Event dependencies
- `data-proj-tfilter (4x)`
- `data-proj-open (3x)`
- `data-proj-filter (2x)`
- `data-proj-search (2x)`
- `data-proj-add (2x)`
- `data-proj-tab (2x)`
- `data-proj-ms (2x)`
- `data-proj-task (2x)`
- Dispatch: `bindEvents()` (`events/20-bind-events.js`) → lihat `docs/navigation.md`

## Related modules
- `core-bootstrap (19)`
- `tasks+focus (15)`
- `auth+remote-sync (9)`
- `goals (8)`
- `shell-router (4)`

## Safe editing guide
Render → `renderProjectListPage`/`renderProjectDetailPage`/`renderProjectFormPage`/`renderProjectView`/`renderProjectTaskView`; aksi → `handleProjectAction`/`handleProjectChange`; simpan → `loadProjects`/`saveProjects`.

## Known risks
Kunci `proj-tracker.projects.v1` (bukan prefix `miaw-tracker`). Coupling tertinggi dengan Tasks (membaca/menulis task project) dan Goals (menautkan goal). State modul banyak (`projFilter`, `projPage`, `projTab`, `projFormId`, …).

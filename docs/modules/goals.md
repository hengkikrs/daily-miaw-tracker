# Goals

## Purpose
Target jangka pendek/menengah/panjang, milestone, kalender goal, dan halaman detail/tambah.

## Main files
- Sekarang: `public/app.js` baris 2832-3139 (308 baris, 14 fungsi, 12 var)
- Target refactor: `public/js/modules/goals.js`

## Entry points
- `renderGoalsView`
- `renderGoalDetailPage`
- `renderGoalAddPage`
- `renderGoalCalendarPage`
- `handleGoalAction`
- `submitGoalForm`

## Important functions
### Handler aksi / render
- `renderGoalsView`
- `renderGoalDetailPage`
- `renderGoalAddPage`
- `renderGoalCalendarPage`
- `handleGoalAction`
- `submitGoalForm`

### Baca & tulis store
- `loadGoals`
- `saveGoals`

### Helper internal
- `goalTermOf`
- `captureGoalAdd`
- `goalProgress`
- `goalCatColor`
- `goalCatIcon`
- `goalCardHtml`

## State and storage
- `miaw-tracker.goals.v1`
- `miaw-tracker.state.v1 → sub-store: `
- State modul (var level-IIFE): lihat `docs/symbol-index.md` bagian section `goals`

## DOM dependencies
- `goalAddForm`
- Registry elemen global: `dom` (di `core/02-runtime-dom.js`)

## Event dependencies
- `data-goal-back (3x)`
- `data-goal-open (2x)`
- `data-goal-filter (2x)`
- `data-goal-add (2x)`
- `data-goal-cal-page (2x)`
- `data-goal-ms-add (2x)`
- `data-goal-cat (2x)`
- `data-goal-term (2x)`
- Dispatch: `bindEvents()` (`events/20-bind-events.js`) → lihat `docs/navigation.md`

## Related modules
- `core-bootstrap (13)`
- `tasks+focus (6)`
- `projects (6)`
- `auth+remote-sync (6)`
- `shell-router (2)`
- `jadwal (1)`

## Safe editing guide
Render → `renderGoalsView`/`renderGoalDetailPage`/`renderGoalAddPage`/`renderGoalCalendarPage`; aksi → `handleGoalAction`; simpan → `loadGoals`/`saveGoals`.

## Known risks
Kunci `miaw-tracker.goals.v1` **juga dipakai modul report/keuangan lama (L4116–4326)** — jangan ubah kunci/bentuk data. `GOAL_TERMS` & `GOAL_CATS` dipakai lintas modul (Projects menautkan goal ke project).

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

## ui44 — status project, project task bisa diubah/dihapus, dan perbaikan data-loss

- **Status project dari halaman detail**: baris chip `data-proj-setstatus` (Planning/Active/On Hold/Completed/Archived) mengubah status langsung + dicatat ke activity + toast, tanpa masuk form.
- **Bug pilihan status/ikon/warna di form edit**: `renderProjectFormPage()` menginisialisasi `projFormSel` dari project **setiap render**, jadi chip yang baru diklik selalu ter-reset → status tidak bisa diubah. Sekarang dijaga `projFormSelId` (inisialisasi sekali per project; dilakukan di handler `data-proj-edit`), dan simpan memberi toast "Project diperbarui.".
- **Project task bisa diubah/dihapus**: `ptToolsHtml()` (✎ `data-pt-edit`, ✕ `data-pt-del`) + form inline `#ptEditForm` (`ptEditFormHtml()`, field judul/tanggal/prioritas/jam) dipakai di **dua** tempat: daftar "Project Task" (`renderProjectTaskView`) dan tab Task di detail project. Aksi ditangani di `handleProjectAction()` (edit/hapus) dan `submitProjectSubForm()` (ubah field) — cabang `ptEditForm` ditaruh **paling awal** karena `projDetailId` boleh kosong di halaman daftar.
- **⚠️ Perbaikan bug data-loss (penting)**: `loadProjects()` menimpa seluruh data project dengan **seed** setiap kali halaman dimuat. Penyebab: blok penautan goal (`loadGoals()`) berada di `try` yang sama dengan pembacaan store, dan `goals.js` dimuat **setelah** `tasks.js` — saat `taskAddDefaults()` memanggil `firstProjName()` → `loadProjects()` → `loadGoals()`, fungsinya belum ada → `ReferenceError` → jatuh ke `catch` → cabang `seed`. Akibatnya semua perubahan project (termasuk status Active/On Hold) kembali ke data contoh setelah reload. Perbaikan dua lapis: (1) blok penautan memakai `try/catch` sendiri dan data tersimpan **selalu** dikembalikan apa adanya; (2) urutan `<script>` diubah: `goals.js` **sebelum** `projects.js` (dan `tasks.js`).

## ui50–52 — select form disamakan dengan input + ikon prioritas

Keluhan: dropdown "Goals" di form tambah/edit project dan "Prioritas" di form edit Project Task tidak seragam dengan field lain (lebih kecil, panah sistem, bg abu).

Akar masalah (terukur): `<select>` tidak pernah ikut aturan `.goal-field input, .goal-field textarea` dan tidak punya gaya di `.pt-edit-form` — ia jatuh ke gaya default browser (Chrome form-control: tinggi 25px, bg `rgb(239,239,239)`, font 16px/400).

Perbaikan (styles.css):
- `.goal-field select` ikut grup aturan input (tinggi 47px, border 1.5px, radius 14px, font 14px/600, bg panel-soft).
- `.pt-edit-form select` disamakan dengan input `.proj-inline` (13.5px/600, padding 11px, radius 14px) + `min-height: 46px` agar setinggi input date/time.
- Keduanya `appearance:none` dengan panah SVG kustom di kanan (padding-right 34px), `:focus` border biru, dark mode `color-scheme:dark`.
- Opsi prioritas form edit Project Task kini berikon: 🟢 Rendah / 🟡 Sedang / 🔴 Tinggi.
- Helper baru `ptBadge(p)` menampilkan ikon prioritas di meta task project (dulu hanya "⚡ Tinggi", Sedang/Rendah tak terlihat).

Bukti (produksi 390px): Goals select 47px == input 47px; select Prioritas 46px == input date/time 46px; meta task: "Hari ini · ⏱ 20:00 · 🔴 Tinggi"; 0 error JS. Catatan: input `title` 44px memang beda 2px dari input date (perbedaan native rendering date/time) — pre-existing, tidak diubah.

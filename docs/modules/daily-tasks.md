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

## ui44 — kategori, ubah kegiatan, detail + sesi fokus

- **Kategori** menggantikan label lama `rutinitas` di samping nama pada "Agenda hari ini": baris agenda memakai `t.category || 'Kegiatan'` (fungsi `dailyDayList()`), dan form punya field **Kategori** (`name="category"`, datalist `#dailyCats` dari `DAILY_CATEGORIES`, default `Umum`). Rutinitas juga menyimpan `category` (opsional) dan menampilkannya di kartu.
- **Ubah kegiatan sekali**: tombol ✎ di baris agenda/"Mendatang" dan di halaman detail → `data-daily-edit` → `dailyEditingTaskId`, form yang sama dibuka dengan mode "Ubah Kegiatan" (jenis & jadwal `disabled`), disimpan oleh `dailySubmitAdd()` (memperbarui title/ikon/jam/prioritas/kategori, tanggal tidak diubah, activity dicatat).
- **Detail + sesi fokus (khusus Daily Task)**: `renderDailyDetail()` menangani dua jenis item — kegiatan (id langsung) dan **rutinitas** (prefix `r:<id>`). Kartu fokus dibuat oleh `dailyFocusCardHtml()` dengan state `dailyFocusKey`/`dailyFocusInterval` dan timer `data-daily-focus-live`; aksi: `data-daily-focus-start|pause|stop`. Field sesi (`focusAt`, `focusPausedSince`, `focusPauseAccum`, `actual`, `activity`) disimpan pada item dan **dipertahankan** oleh `saveDailyRoutines()`; sesi yang berjalan dipulihkan setelah reload di `bindEvents()` (`resume-fokus-daily`). Hapus item/rutinitas yang sedang difokuskan otomatis menghentikan sesi.
- Atribut baru WAJIB ditambahkan ke daftar `closest('[data-daily-…]')` di `js/events/20-bind-events.js` sebelum `handleDailyAction()` — kalau tidak, tombol dirender tetapi kliknya tidak melakukan apa pun (sempat terjadi pada ui44).

## ui45 — kerapian tampilan (chip kategori & sesi fokus)

- **Chip kategori pada kartu Rutinitas**: kategori tidak lagi ditempel sebagai teks di baris `small` (11.5px, tanpa garis). Sekarang dirender sebagai `<span class="dt-tags"><span class="task-chip tag">…</span></span>` sehingga **identik** dengan chip kategori/tanggal di Agenda: font 12px, weight 600, border 1px, radius 999px, tinggi 22px. `.dt-tags` wajib menyetel `font-size: 12px` karena `.task-chip` tidak mendefinisikan `font-size` sendiri (ia mewarisi dari induknya — di kartu rutin induknya 16px).
- **Sesi fokus sebaris dengan tombol selesai**: `dailyFocusActionHtml()` menggantikan kartu "Sesi Fokus" yang dulu terpisah. Tata letak detail sekarang: baris pertama `.dt-actions-main` = tombol Tandai Selesai + kontrol fokus (tombol `▶ Mulai Fokus`, atau grup `.dt-focus-inline` berisi pulse + `data-daily-focus-live` + Jeda/Lanjut + Stop saat sesi berjalan); baris kedua `.dt-actions-sub` = Ubah + Hapus. Bila sesi belum pernah jalan tombolnya "▶ Mulai Fokus", kalau sudah ada `actual` menjadi "▶ Fokus Lagi".
- Detail rutinitas juga menampilkan sel **Total fokus** bila rutinitas pernah difokuskan.
- Catatan CSS: `.task-detail-actions` bawaan `flex-direction: column` + `.primary-button { width: 100% }`; modifier `.dt-actions-main/.dt-actions-sub` menimpanya menjadi baris dengan lebar otomatis (tanpa mengubah kelas dasar, karena kelas itu dipakai juga oleh detail task project). Pada layar ≤420px tombol kembali menjadi satu kolom penuh.

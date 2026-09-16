# Tasklist Audit — Miaw Tracker (2026-09-16)

Siap diumpankan ke AI coding assistant. Urut prioritas. Semua task merujuk temuan di
`docs/qa/audit-menyeluruh-2026-09-16.md`.

---

## TASK-001
**Title:** Satu sumber kebenaran untuk progress goals (perbaiki 46% vs 44% vs 24%)
**Problem:** Angka progress goal berbeda antar halaman karena rumus berbeda.
**Current behavior:** Dashboard memakai rata-rata persentase per goal (`dashboard.js:48 avgGoal` → 46%); halaman Goals memakai agregat milestone (`goals.js:137-138` → 44%); halaman Progress menampilkan nilai lain lagi.
**Expected behavior:** Semua halaman memakai satu fungsi, satu definisi (rekomendasi: agregat = total milestone selesai ÷ total milestone).
**Acceptance criteria:** Buat `function goalProgressAll()` di `js/modules/goals.js` yang mengembalikan `{done, total, pct}`; `dashboard.js`, `goals.js`, `progress.js` memanggil fungsi itu; tidak ada lagi `avgGoal` terpisah; angka di dashboard = angka di Goals = angka di Progress saat data sama.
**Affected page:** Dashboard, Goals, Progress
**Priority:** P0
**Implementation notes:** Jangan ubah storage key/bentuk data. `check-syntax.js` + `check-theme.js` wajib lulus.

## TASK-002
**Title:** Verifikasi & perbaiki scope RLS Supabase (client_id → auth.uid)
**Problem:** Tabel `tracker_daily_states` di-scope oleh `client_id` (UUID buatan klien), bukan `auth.uid()`.
**Current behavior:** Request: `GET /rest/v1/tracker_daily_states?client_id=eq.<uuid>`; upsert `on_conflict=client_id`.
**Expected behavior:** Data hanya dapat dibaca/ditulis oleh pemilik akun terautentikasi.
**Acceptance criteria:** RLS policy memakai `auth.uid()` (atau `client_id` yang terikat ke user); uji: akun A tidak bisa membaca baris akun B walau `client_id` B diketahui.
**Affected page:** Sinkronisasi seluruh aplikasi (`js/auth/13-remote-sync.js`)
**Priority:** P0
**Implementation notes:** [NEEDS VERIFICATION] butuh akses dashboard Supabase. Jangan ubah bentuk data tanpa migrasi.

## TASK-003
**Title:** Ganti nama menu "Laporan" yang duplikat
**Problem:** Dua entri menu bernama "Laporan": `Finance → Laporan` (`laporan-keuangan`) dan top-level `Laporan` (`reports`).
**Current behavior:** Dua label identik, fungsi berbeda (laporan keuangan vs ekspor PDF/DOC).
**Expected behavior:** Label berbeda & jelas: "Laporan Keuangan" dan "Ekspor & Laporan".
**Acceptance criteria:** Tidak ada dua entri dengan label sama di sidebar; judul halaman ikut berubah.
**Affected page:** Sidebar + `reports`/`laporan-keuangan`
**Priority:** P1
**Implementation notes:** Ubah label di `js/core/08-nav.js` (atau sumber nav) + `pageTitle` router.

## TASK-004
**Title:** Global search (⌘K) untuk Goals/Projects/Task/Notes/Finance/Dokumen
**Problem:** Search hanya di Daily Task dan hanya memfilter `.task-row` (bukan rutinitas); tidak ada feedback.
**Current behavior:** `09-router.js:36` menyembunyikan input di view lain; `tasks.js:617-625` hanya hide/show `.task-row`.
**Expected behavior:** Satu pencarian global: fuzzy, hasil dikelompokkan per modul, ada hitungan hasil + empty result.
**Acceptance criteria:** Ketik "kelas" → rutinitas & kegiatan muncul; ketik nama goal → goal muncul; ada pesan "tidak ditemukan".
**Affected page:** Semua (topbar)
**Priority:** P1
**Implementation notes:** Bisa murni klien (indeks in-memory). Pertahankan input lama sebagai fallback.

## TASK-005
**Title:** Hapus/tandai data contoh (seed) untuk akun asli
**Problem:** Akun baru langsung berisi data contoh (proyek & catatan "Marketing Batu Bata", 125 transaksi contoh) sehingga sulit membedakan data asli vs contoh.
**Current behavior:** Seed otomatis saat store kosong (mis. `txSeedList()` di `finance-transactions.js`).
**Expected behavior:** Akun asli mulai kosong + empty state informatif; data contoh hanya di mode demo.
**Acceptance criteria:** Akun baru setelah daftar → semua modul menampilkan empty state dengan tombol aksi; tidak ada proyek/transaksi contoh.
**Affected page:** Semua modul
**Priority:** P1
**Implementation notes:** Jangan hapus data akun yang sudah ada; hanya ubah perilaku seed untuk akun baru.

## TASK-006
**Title:** Unifikasi terminologi & angka "hari ini"
**Problem:** Dashboard "0/1 task hari ini" + "0/4 rutinitas", halaman Daily Task "0/3 kegiatan hari ini" + "0/3 rutinitas"; istilah task/kegiatan/rutinitas tercampur.
**Current behavior:** Sumber data & label berbeda antar halaman.
**Expected behavior:** Satu definisi "Hari Ini" (kegiatan + rutinitas) dan satu istilah konsisten di seluruh aplikasi.
**Acceptance criteria:** Angka di dashboard = angka di Daily Task; hanya satu istilah ("Kegiatan" atau "Task") dipakai konsisten.
**Affected page:** Dashboard, Daily Task
**Priority:** P1
**Implementation notes:** Audit `dashboard.js` (`tasksToday`, `rt`) vs `daily-tasks.js` (`loadDailyTasks`, routines).

## TASK-007
**Title:** Logout aman: revoke sesi server + bersihkan data lokal per-user
**Problem:** Logout hanya menghapus key sesi lokal.
**Current behavior:** `clearAuthSession()` (`11-session.js:32-38`) → `removeItem(AUTH_SESSION_KEY)` saja; refresh token tetap valid; data `miaw-tracker.*:<uid>` tetap tersisa.
**Expected behavior:** Panggil endpoint sign-out Supabase, lalu bersihkan state per-user.
**Acceptance criteria:** Setelah logout, refresh token tidak bisa dipakai lagi; localStorage tidak menyisakan data akun.
**Affected page:** Akun
**Priority:** P2
**Implementation notes:** Jangan hapus data yang belum tersinkron — flush remote save dulu.

## TASK-008
**Title:** Focus ring yang terlihat (pakai token tema)
**Problem:** Outline default `#101010` nyaris tak terlihat di sidebar gelap.
**Current behavior:** `:focus-visible` hanya memakai outline default browser.
**Expected behavior:** Fokus jelas terlihat di semua permukaan (sidebar gelap, konten terang).
**Acceptance criteria:** Tab pada nav sidebar → ring coral terlihat (kontras ≥3:1 terhadap sidebar); berlaku untuk button, link, input.
**Affected page:** Global (stylesheet)
**Priority:** P2
**Implementation notes:** Pakai token `--focus`/`--teal`; jangan hardcode hex (guard `check-theme.js`).

## TASK-009
**Title:** Seragamkan namespace storage (`proj-tracker` → `miaw-tracker`)
**Problem:** Kunci proyek memakai prefix berbeda (`proj-tracker.projects.v1`).
**Current behavior:** `proj-tracker.projects.v1` vs `miaw-tracker.*`.
**Expected behavior:** Semua kunci satu namespace.
**Acceptance criteria:** Kunci baru seragam; kunci lama dibaca sebagai fallback (migrasi lunak) sehingga data lama tidak hilang.
**Affected page:** Project
**Priority:** P2
**Implementation notes:** Wajib migrasi lunak + jangan ubah bentuk data.

## TASK-010
**Title:** Halaman Habit: riwayat tahunan + contoh habit
**Problem:** Halaman Habit hanya bulan berjalan dan tampak 0%/kosong.
**Current behavior:** Banner "Tab ini hanya menampilkan kebiasaan untuk bulan yang sedang berjalan"; 0% untuk akun demo.
**Expected behavior:** Riwayat bulan/tahun bisa dilihat langsung di halaman Habit + empty state dengan tombol tambah.
**Acceptance criteria:** Pengguna bisa pindah bulan tanpa lewat sidebar; ada empty state jelas saat belum ada habit.
**Affected page:** Habit
**Priority:** P2
**Implementation notes:** Pindahkan widget "TAHUN PELACAKAN/bulan" dari sidebar ke halaman ini.

## TASK-011
**Title:** Hapus 12 tombol bulan dari sidebar
**Problem:** Sidebar memuat widget tahun + 12 bulan di semua halaman (semua "0%" untuk akun ini) → noise.
**Current behavior:** Tombol `Januari … Desember 0%` tampil global.
**Expected behavior:** Sidebar hanya navigasi.
**Acceptance criteria:** Sidebar tanpa daftar bulan; fitur bulan tetap ada di halaman Habit/Progress.
**Affected page:** Sidebar
**Priority:** P2
**Implementation notes:** Pastikan tidak menghilangkan fungsionalitas.

## TASK-012
**Title:** A11y: aria-label tombol ikon, alt gambar, skip-link, heading
**Problem:** 4 tombol ikon tanpa label; 1 `<img>` tanpa `alt`; tanpa skip-link; hierarchy heading lemah.
**Current behavior:** Terukur di produksi: `iconOnlyNoLabel=4`, `imgsNoAlt=1`, `skipLink=false`, h1=1/h2=1.
**Expected behavior:** Semua kontrol punya nama aksesibel; gambar punya alt; ada skip-to-content; struktur heading berjenjang.
**Acceptance criteria:** Scan a11y menunjukkan 0 kontrol tanpa nama, ada skip-link, heading berurutan (h1→h2→h3).
**Affected page:** Global
**Priority:** P3
**Implementation notes:** Prioritaskan tombol aksi utama (hapus/edit/pin/favorit).

## TASK-013
**Title:** Dashboard restructure: Today-first, overdue, kurangi noise
**Problem:** Dashboard menampilkan puluhan angka dan tidak menjawab "apa yang harus saya lakukan hari ini".
**Current behavior:** Chip ringkasan + skor gabungan + 4 kartu statistik; tanpa overdue.
**Expected behavior:** Blok "Hari Ini" actionable di atas (kegiatan + rutinitas + overdue), statistik ringkas di bawah.
**Acceptance criteria:** Kegiatan hari ini dapat dicentang langsung dari dashboard; ada indikator overdue; jumlah angka per kartu ≤4.
**Affected page:** Dashboard
**Priority:** P2
**Implementation notes:** Reuse komponen Daily Task; jaga performa render.

## TASK-014
**Title:** Kalender: tampilkan deadline task & due goal
**Problem:** Kalender hanya berisi event manual (bukan deadline).
**Current behavior:** Hanya event jadwal (9 item) tampil.
**Expected behavior:** Deadline task, due goal, dan event muncul di kalender dengan penanda berbeda.
**Acceptance criteria:** Task dengan due date muncul di tanggalnya; legenda jenis item tersedia.
**Affected page:** Jadwal
**Priority:** P3
**Implementation notes:** Baca dari `loadTasks()`/`loadDailyTasks()`/`loadGoals()` tanpa duplikasi data.

## TASK-015
**Title:** Integrasi Goal ↔ Finance (goal tabungan)
**Problem:** Goal "nabung X" tidak terhubung ke Tabungan/Transaksi.
**Current behavior:** Modul terpisah; progress goal hanya dari milestone.
**Expected behavior:** Goal kategori keuangan dapat dihubungkan ke target tabungan → progress otomatis dari transaksi.
**Acceptance criteria:** Menautkan goal ke target tabungan mengubah progress goal sesuai saldo tabungan; nilai manual tetap bisa di-override.
**Affected page:** Goals, Tabungan
**Priority:** P2
**Implementation notes:** Tambah field relasi opsional (jangan ubah data lama).

## TASK-016
**Title:** Security hardening header + CSP
**Problem:** Tanpa CSP/X-Frame-Options/X-Content-Type-Options; `access-control-allow-origin: *`.
**Current behavior:** Terverifikasi lewat header respons produksi.
**Expected behavior:** Header keamanan terpasang di Vercel.
**Acceptance criteria:** Respons memuat `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`; CORS dipersempit bila memungkinkan.
**Affected page:** Deployment (`vercel.json`)
**Priority:** P3
**Implementation notes:** Pastikan CSP tidak memblokir Supabase/Vercel/Google OAuth.

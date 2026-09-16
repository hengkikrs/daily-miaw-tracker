# Audit Menyeluruh — Miaw Tracker (daily-miaw-tracker.my.id)

**Tanggal**: 2026-09-16 · **Auditor**: Senior Product Designer / UX/UI Auditor / Software Architect / QA / Security
**Akun demo**: hengkikr / Hengky363 · **Metode**: login nyata, jelajah 17 view + semua menu/submenu/form, inspeksi DOM/computed-style/localStorage/JWT, uji search/filter/mobile/a11y/performa, cross-check terhadap source code (`/opt/tracker-daily`).
**Label bukti**: `[VERIFIED]` = teruji langsung · `[OBSERVED]` = terlihat saat audit · `[INFERRED]` = disimpulkan dari perilaku · `[RECOMMENDED]` = saran · `[NEEDS VERIFICATION]` = butuh akses backend/source.

---

## 1. Executive Summary

Miaw Tracker adalah SPA **vanilla JS + Supabase + Vercel** yang solid secara teknis: cepat (load ~0,7s), tanpa framework, satu tema warna hangat yang konsisten, data tersinkron per akun. Posisinya **bukan sekadar task manager** — ia adalah **Personal OS produktivitas** yang menggabungkan Goals→Project→Task, Habit, Catatan, Dokumen, Finance, dan MiawAI.

Namun produknya belum "satu kesatuan": **Finance** terasa seperti aplikasi terpisah (125 transaksi, budget, tabungan, laporan, export PDF — jauh lebih matang daripada modul lain), sementara **Habit** hanya menampilkan bulan berjalan dan sering tampak 0%. Terdapat **inkonsistensi angka progress** antar-halaman (46% vs 44% vs 24% untuk hal yang sama), **duplikasi menu "Laporan"**, dan **terminologi yang saling tumpang tindih** (task/kegiatan/rutinitas; Activity/Goals-Habit) yang membingungkan pengguna baru.

Prioritas terbesar bukan fitur baru, melainkan **konsistensi definisi & satu sumber kebenaran (single source of truth) untuk angka progress**, lalu **penggabungan dua menu Laporan**, lalu **finishing Habit & unifikasi terminologi**.

---

## 2. Product Assessment — Positioning

`[VERIFIED]` Fitur yang benar-benar ada dan berfungsi:
- **Goals** (4 item demo: milestone, deadline, kategori, jangka waktu)
- **Project** (6 item, terhubung ke goal) + **Project Task**
- **Daily Task** (kegiatan + rutinitas harian, tab Hari Ini/Rutinitas/Selesai)
- **Habit** (4 kategori: harian/mingguan/mingguan khusus/bulanan; grid centang)
- **Catatan** (rich text, folder, tag) + **Dokumen** (upload/link/folder/favorit)
- **Finance**: Transaksi (125), Budget (6 pos), Tabungan (3 target), Laporan keuangan, Kalender cashflow
- **Laporan** (export PDF/DOC multi-modul) · **MiawAI** (chat + 3 model) · **Akun** (profil, keamanan, tutorial)

`[INFERRED]` Positioning terbaik: **"Personal Operating System"** dengan siklus Goal→Project→Task→Eksekusi→Progress→Review. Habit, Finance, Catatan, Kalender = supporting systems.

`[RECOMMENDED]` Masalah: produk terasa seperti **2 aplikasi** — (a) *produktivitas/habit/goal* yang masih muda, dan (b) *finance* yang matang. Saran: de-emphasize finance di dashboard (kartu finance jangan sama besarnya dengan activity/goals), dan naikkan maturitas Habit (view tahunan sudah ada di sidebar tapi halaman habit hanya bulan berjalan).

---

## 3. Current Information Architecture (OBSERVED)

Sidebar (dari DOM & nav): 
```
Dashboard
Activity ▾        → Daily Task, Jadwal
Goals and Habit ▾ → Goals, Project, Project Task, Habit, Progress
Organization ▾    → (Catatan, Dokumen)
Finance ▾         → Transaksi, Budget, Tabungan, Laporan
Laporan            (top-level, terpisah)
MiawAI
Akun
[widget] TAHUN PELACAKAN (2025–2028) + 12 tombol bulan (Januari..Desember, semua "0%")
```
`[VERIFIED]` Temuan IA:
- **Dua menu "Laporan"**: `Finance → Laporan` (laporan keuangan) dan `Laporan` top-level (export PDF/DOC). Nama sama, fungsi beda → membingungkan.
- **Group "Activity"** berisi Daily Task + Jadwal, tapi ada kartu "Activity" di dashboard dengan arti berbeda → istilah "Activity" punya 2 makna.
- **12 tombol bulan di sidebar** selalu tampil di semua halaman (untuk akun ini semua "0%") → noise permanen.
- "Catatan" & "Dokumen" tidak punya `data-view` yang tampak di map (masuk lewat Organization), tapi ada di view list (`catatan`, `dokumen`).

### Recommended IA (RECOMMENDED)
```
Hari Ini (Dashboard + Today view + overdue)
├─ Daily Task
├─ Jadwal
Tujuan (Goals)
├─ Goals → Project → Project Task
├─ Progress (satu halaman, sumber kebenaran angka)
Kebiasaan (Habit)
├─ Bulan berjalan + Riwayat (tahunan)
Catatan & Dokumen (Organization)
Keuangan (Finance) → Transaksi · Budget · Tabungan · Laporan Keuangan
Laporan (export) → ganti nama "Ekspor" atau gabung ke dalam tiap modul
MiawAI · Akun
```
Widget "TAHUN PELACAKAN + bulan" dipindah ke dalam halaman Habit/Progress, bukan sidebar.

---

## 4. User Journey Findings (simulasi user baru)

`[VERIFIED]` Alur login→dashboard→create→…→kembali:
1. **Login** lancar (username/email + password, OTP, Google). Toast "Data Supabase dimuat." ✓
2. Setelah login masuk ke view **"goals"** (bukan dashboard) karena `state.selectedView` tersimpan → user baru melihat Goals duluan, bukan "hari ini". `[VERIFIED]` (landing state = goals).
3. **Membuat Goal** = halaman terpisah (bukan modal) dengan 5 field + chips kategori/jangka → lebih panjang dari yang diperlukan untuk "goal singkat". `[OBSERVED]`
4. **Feedback** baik (toast, auto-save, simpan & tambah lagi).
5. Tidak ada **Today view / overdue** yang jelas di dashboard. `[VERIFIED]`

Kelebihan: auto-save, penyimpanan lokal + sinkron, konsistensi tema.
Kekurangan: banyak klik untuk task sederhana; tidak ada "quick add" global; istilah task/kegiatan/rutinitas membingungkan.

---

## 5. Dashboard Audit

`[VERIFIED]` Dashboard menampilkan: header "RINGKASAN SEPTEMBER 2026", 4 chip (task, rutinitas, goals %, habit %, kas), skor gabungan (donat, 20%), 4 kartu (Activity/Goals&Habit/Organization/Finance) + CTA "Buka … →".

- Informasi pertama = ringkasan bulan + skor gabungan. **Bukan** "apa yang harus saya lakukan hari ini". `[OBSERVED]`
- **Overdue task**: tidak ada (tidak pernah disebut). `[VERIFIED]`
- **Today view**: tidak ada yang tegas; CTA "Buka Daily Task" mengarah ke halaman terpisah. `[VERIFIED]`
- **Terlalu banyak statistik**: ya — skor gabungan 20%, lalu 4 kartu dengan puluhan angka, sebagian 0%. `[OBSERVED]`
- **Angka inkonsisten** (lihat §9): dashboard "46% goals" vs halaman Goals "44%".

`[RECOMMENDED]` Struktur dashboard baru:
```
[Today bar] 3 kegiatan · 4 rutinitas · + overdue (bila ada)
[Kartu utama] "Hari Ini" — daftar kegiatan & rutinitas yang bisa dicentang langsung (actionable)
[Skor gabungan] opsional, kecil
[Kartu ringkas] Goals · Habit · Keuangan (tanpa 20 angka per kartu)
```

---

## 6. Task Management Audit

`[VERIFIED]` Task tersebar di 2 tempat: **Daily Task** (kegiatan + rutinitas, tab Hari Ini/Rutinitas/Selesai) dan **Project Task** (sub-task project). Field task: title, date, done, icon, time (sebagian). 

- Tidak ada: prioritas eksplisit (hanya rutinitas/agenda), estimasi/actual time, attachment, subtask rekursif, recurring task (ada "rutinitas" yang dekat konsepnya), bulk action. `[VERIFIED]`/`[OBSERVED]`
- Search hanya di view Task dan hanya memfilter `.task-row` (kegiatan), bukan rutinitas. `[VERIFIED]` (source `tasks.js:617-625`).

`[RECOMMENDED]` Minimum info task: judul, tanggal/due, prioritas (high/med/low), status, sumber (project/goal), estimasi (opsional). Satukan "kegiatan" dan "rutinitas" ke satu model dengan flag `recurring`.

---

## 7. Goal Audit

`[VERIFIED]` Goal punya: judul, deskripsi, jangka waktu (pendek/menengah/panjang), deadline, kategori, **milestone** (7/16 selesai di demo), progress %. Hubungan Goal→Project→Task dinyatakan di hint form.

- Goal sudah **tidak** terasa "task besar" — ada milestone + jangka waktu. ✓ `[OBSERVED]`
- Progress goal = `milestones done / total`. `[VERIFIED]` (source `goals.js:107-111`)

`[RECOMMENDED]` Tambah "target kuantitatif" opsional (mis. "nabung 15jt" → metrik angka), dan relasi otomatis Goal↔Finance (goal tabungan). Contoh struktur: Goal → metric + milestones → projects → tasks.

---

## 8. Project Audit

`[VERIFIED]` Project: nama, ikon, warna, status (planning/active/onhold/completed/archived), goal induk, progress, project task. Fungsi Project **jelas** sebagai wadah antara Goal dan Task. ✓

`[OBSERVED]` Sedikit overlap dengan Goal: keduanya punya "status" dan "progress". `[RECOMMENDED]` Pastikan copy membedakan: Goal = hasil besar + jangka panjang; Project = inisiatif terukur dengan rentang waktu; Task = unit eksekusi harian.

---

## 9. Habit Audit

`[VERIFIED]` Halaman Habit: 4 kategori (Harian/Mingguan/Mingguan Khusus/Bulanan), grid centang (152 input checkbox di demo), "Tambah Kebiasaan", "Reset Centang", dan banner "Tab ini hanya menampilkan kebiasaan untuk bulan yang sedang berjalan".

- Streak & statistik tahunan ada di **sidebar** (12 bulan, semua "0%" di demo) dan Progress. `[OBSERVED]`
- **Demo account habit = 0% di mana-mana** → sulit menilai streak; halaman Habit terkesan kosong/tidak jalan. `[VERIFIED]`
- Habit vs Task: Habit = berulang + centang per periode; Task = sekali. Pemisahan logis, tapi copy belum menjelaskan. `[RECOMMENDED]` Tambah tooltip/empty-state yang menjelaskan bedanya.

`[RECOMMENDED]` Tampilkan riwayat tahunan di dalam halaman Habit (bukan cuma sidebar), dan beri contoh habit saat akun baru.

---

## 10. Progress & Analytics — TEMUAN KUNCI

`[VERIFIED]` **Angka yang sama dihitung beda di 3 tempat:**
| Lokasi | Angka | Rumus (dari source) |
|---|---|---|
| Dashboard "GOALS (RATA-RATA)" | **46%** | rata-rata dari % tiap goal (`dashboard.js:48` `avgGoal`) |
| Halaman Goals | **44%** | total milestone selesai / total milestone semua goal (`goals.js:137-138`) |
| Halaman Progress | **44%** dan **24%** | agregat + kombinasi lain |

Ini **bug definisi**, bukan bug visual: "average of averages" vs "aggregate ratio". Pengguna melihat 46% di dashboard lalu 44% di Goals → kehilangan kepercayaan pada angka.

`[RECOMMENDED]` Satu fungsi `goalProgressAll()` yang dipakai semua halaman. Pilih SATU definisi (rekomendasi: **aggregate** = total milestone selesai / total milestone, karena lebih intuitif). Tambah label tooltip "X dari Y milestone".

---

## 11. Calendar & Scheduling

`[VERIFIED]` "Jadwal" = kalender bulanan dengan event (9 event demo, ber-icon, berwaktu), navigasi bulan. Agenda hari ini muncul di Daily Task.

`[OBSERVED]` Kalender hanya **deadline/event**, bukan time-blocking. `[RECOMMENDED]` Integrasikan deadline task & due goal ke kalender; opsional time-blocking.

---

## 12. Finance Audit

`[VERIFIED]` Finance paling matang: Transaksi (125, masuk/keluar, kategori, input singkat "50rb"), Budget (6 pos, terpakai/sisa), Tabungan (3 target, terkumpul/target/progress), Laporan keuangan (saldo, nilai bersih, pemasukan/pengeluaran, kalender cashflow), export.

- **Input nominal yang ramah**: "cth: 50rb / 120.000" — parsing singkatan. `[VERIFIED]` (nilai bagus)
- `[RECOMMENDED]` Integrasi Goal↔Finance belum ada (goal "nabung" tidak terhubung otomatis ke tabungan). Ini peluang utama Personal OS.
- Debt/financial-goal/recurring transaction belum ada. `[OBSERVED]`

---

## 13. Search & Filter

`[VERIFIED]`
- Search **hanya ada di Daily Task** (input disembunyikan di view lain — `09-router.js:36`).
- Hanya memfilter **kegiatan** (`.task-row`), **bukan rutinitas**. Diuji: ketik "Kelas" (rutinitas) → tidak terfilter.
- Tidak ada highlight, hitungan hasil, atau "tidak ditemukan".
- **Tidak ada global search** untuk Goals/Projects/Notes/Finance/Dokumen. `[VERIFIED]`

`[RECOMMENDED]` Global search (⌘K) di seluruh entitas, minimal fuzzy-match + grouping per tipe.

---

## 14. UI/UX Design

`[VERIFIED]` Satu tema hangat konsisten (hasil audit warna sebelumnya: 0 warna dingin tersisa, kontras token lulus AA). Emoji sebagai ikon utama, kartu bersih, tipografi jelas, `lang="id"`.

`[OBSERVED]`
- Desain terasa **personal & modern**, tidak "korporat". ✓
- **Terlalu ramai di dashboard** (puluhan angka, banyak 0%).
- Heading hierarchy lemah: 1×h1 + 1×h2 per halaman; judul kartu pakai h3 tanpa h2. `[VERIFIED]`

`[RECOMMENDED]` Kurangi noise angka di dashboard; seragamkan ukuran kartu; naikkan hierarchy heading.

---

## 15. Responsive & Mobile

`[VERIFIED]` (viewport 390px)
- Sidebar jadi **drawer off-canvas** (left:-298 default, slide ke 0 saat dibuka), tombol menu 44×44 `aria-label="Buka navigasi"`, overlay tutup. ✓ Bekerja.
- **Tidak ada horizontal scroll** di halaman yang diuji (docW==scrollW==390). ✓
- Touch target aman (area tombol terkecil ~3191px² > 1936). ✓

`[OBSERVED]` Tabel transaksi & grid habit (152 checkbox) padat di mobile; perlu diuji lebih lanjut di perangkat nyata. `[NEEDS VERIFICATION]`

---

## 16. Accessibility

`[VERIFIED]`
- Form berlabel baik: **0 input tanpa label** (semua pakai `<label>`/`aria-label`). ✓
- `lang="id"` ✓.
- 4 tombol ikon tanpa `aria-label`/`title`. ✗
- 1 gambar tanpa `alt` (satu-satunya `<img>`). ✗
- **Tidak ada skip-link** ke konten. ✗
- Heading hierarchy lemah (h1/h2 tunggal). ✗
- **Focus ring**: keyboard Tab memicu `:focus-visible` (outline default `auto`), tapi warnanya default gelap `#101010` → **nyaris tak terlihat di sidebar gelap** (`#241f1a`). `[VERIFIED]`

Severity a11y: P2 (focus di sidebar), P3 (alt/aria-label/skip-link/heading).

---

## 17. Performance

`[VERIFIED]` (dari resource timing, produksi)
- Total request: 45 · **34 file JS** (33 modul + shim) · total JS ~**164 KB** (transfer, terkompresi) · DCL ~**678 ms** · load ~**734 ms**.
- **Tanpa library chart berat** (SVG custom) ✓, tanpa framework. ✓
- 4 request Supabase (state load/upsert). ✓
- `[OBSERVED]` 34 request JS terpisah (tanpa bundling) — oke untuk HTTP/2, tapi menambah round-trip di jaringan lambat. `[RECOMMENDED]` bundling/minify opsional (bukan prioritas).

---

## 18. Security

`[VERIFIED]`
- **Token access + refresh di `localStorage`** (`miaw-tracker.auth-session.v1`) — rentan XSS (standar Supabase, tapi tetap risiko). JWT = ES256, `exp` = +3600s (1 jam), `aal1` (tanpa 2FA).
- **Supabase project ref & anon key publik** di bundle (normal untuk Supabase; keamanan bergantung RLS).
- **Logout hanya menghapus key lokal** (`clearAuthSession` → `removeItem(AUTH_SESSION_KEY)`), **tidak memanggil sign-out server** → refresh token tidak dicabut; data per-user (`miaw-tracker.*.<uid>`) tetap tersisa di localStorage setelah logout. `[VERIFIED]` (source `11-session.js:32-38`).
- Header respons statis: `access-control-allow-origin: *`, tanpa CSP / X-Frame-Options / X-Content-Type-Options. `[VERIFIED]` (curl)

`[NEEDS VERIFICATION]` (perlu cek developer/backend):
- **RLS Supabase**: tabel `tracker_daily_states` di-scope oleh `client_id` (nilai UUID yang di-generate klien), **bukan** `auth.uid()`. Ini pola yang berisiko IDOR — pastikan RLS mengikat `client_id` ke user yang terautentikasi, atau pindah ke `auth.uid()`.
- Password policy (min 8 char client-side `[VERIFIED]`), enkripsi, rate-limit OTP, session revocation.

`[RECOMMENDED]` P0.5: verifikasi RLS; ganti key scope ke `auth.uid()`; panggil Supabase sign-out saat logout; tambah CSP.

---

## 19. Data Model & Architecture (OBSERVED/INFERRED)

`[OBSERVED]` Kunci localStorage (nama persis):
```
miaw-tracker.state.v1            (state global + selectedView/tahun; 20KB)
miaw-tracker.state.v1:<uid>      (data per user; 47.9KB — berisi tasks[], transactions[], years)
miaw-tracker.tasks / goals / notes / daily-tasks / jadwal / docs / auth-session / theme
miaw-tracker.daily-tasks.v1.routines · .log
proj-tracker.projects.v1:<uid>   ← namespace beda ("proj-tracker" vs "miaw-tracker")
```
`[INFERRED]` Supabase tabel tunggal `tracker_daily_states` (kolom `client_id`, `state`, `updated_at`; upsert `on_conflict=client_id`). Habit disimpan di `state.years[2026].months[m]`.

`[OBSERVED]` Temuan arsitektur:
- **Namespace tidak konsisten**: `proj-tracker.projects.v1` vs `miaw-tracker.*`. ✗ maintainability.
- **Semua state ditaruh di satu blob 47.9KB** + tabel tunggal → tidak bisa query per-entitas, sinkron = full-dump. `[INFERRED]`

`[RECOMMENDED]` Normalisasi bertahap: tabel per entitas (goals/projects/tasks/…) dengan `auth.uid()` sebagai scope; simpan per-modul, bukan satu blob.

---

## 20. Error Handling & Empty States

`[VERIFIED]` Validasi form: `required` + maxlength ada di form Goal; input nominal transaksi punya format longgar ("50rb"). Submit kosong → dicegah oleh `required`. `[OBSERVED]`

`[OBSERVED]` **Akun baru di-seed dengan data contoh** (proyek "Marketing Batu Bata", catatan "Strategi Marketing Batu Bata", 125 transaksi contoh) → pengguna baru tidak pernah melihat empty-state, dan **sulit membedakan data contoh dari data asli**. Ini temuan UX penting.

`[RECOMMENDED]` Hapus seed data untuk akun asli (atau tandai jelas "Contoh — hapus saya"), dan rancang empty-state yang: menjelaskan apa halaman ini + tombol aksi utama.

---

## 21. Micro UX

`[VERIFIED]` yang sudah baik: toast feedback, auto-save (remote sync debounce 150ms), "Simpan & Tambah Lagi", input nominal ramah, drawer mobile halus, tema light/dark.

`[RECOMMENDED]` quick wins: hasil hitung di search, copy button di catatan, tooltip di ikon-ikon ambigu, skeleton saat load, konfirmasi hapus (sudah ada di beberapa), keyboard shortcut (⌘K global search, `n` new task).

---

## 22. Personal OS Evaluation

`[INFERRED]` Siklus **Goal→Project→Task→Eksekusi→Progress→Review** **sebagian terbentuk**: Goal→Project→Task sudah terhubung (hint form + relasi), Progress ada. Yang kurang: **Review** (retrospektif/mingguan), **penyesuaian goal** otomatis, dan **integrasi Finance↔Goal** (goal nabung tidak terhubung tabungan).

`[RECOMMENDED]` Tambah "Review Mingguan" (ringkasan seminggu) + hubungkan Goal↔Finance sebagai penutup siklus Personal OS.

---

## 23. Prioritized Findings Table

| ID | Area | Temuan | Evidence | Severity | Dampak | Solusi |
|---|---|---|---|---|---|---|
| F-01 | Progress | Angka progress goals beda (46/44/24) | VERIFIED | **P0** | Kepercayaan angka | Satu `goalProgressAll()` |
| F-02 | IA | Dua menu "Laporan" | VERIFIED | P1 | Kebingungan | Ganti nama/ gabung |
| F-03 | Sec | RLS keyed `client_id` bukan `auth.uid()` | NEEDS VERIFICATION | **P0** | IDOR | Scope ke auth.uid() |
| F-04 | Search | Tanpa global search; search task tak filter rutinitas | VERIFIED | P1 | Discoverability | Global search + filter penuh |
| F-05 | Onboarding | Data contoh ter-seed ke akun asli | OBSERVED | P1 | Bingung data asli/contoh | Hapus/tandai seed |
| F-06 | Task | Terminologi task/kegiatan/rutinitas & angka hari ini beda (0/1 vs 0/3) | VERIFIED | P1 | Bingung | Unifikasi istilah & sumber |
| F-07 | Sec | Logout tak revoke server; data lokal tersisa | VERIFIED | P2 | Privasi | Sign-out endpoint + bersihkan |
| F-08 | A11y | Focus ring tak terlihat di sidebar | VERIFIED | P2 | Keyboard UX | Gaya focus dengan token |
| F-09 | Arch | Namespace `proj-tracker` vs `miaw-tracker` | OBSERVED | P2 | Maintainability | Seragamkan |
| F-10 | Habit | Halaman habit hanya bulan berjalan + 0% | VERIFIED | P2 | Fitur terkesan mati | Riwayat tahunan + seed contoh |
| F-11 | Dashboard | Terlalu banyak statistik, tanpa Today/overdue | OBSERVED | P2 | Clarity | Struktur §5 |
| F-12 | A11y | 4 tombol tanpa aria-label, 1 img tanpa alt, no skip-link | VERIFIED | P3 | Aksesibilitas | Tambah label |
| F-13 | Perf | 34 request JS tanpa bundling | VERIFIED | P3 | Latency di jaringan lambat | Bundle/minify |
| F-14 | Sec | Tanpa CSP/X-Frame/X-CTO; CORS `*` | VERIFIED | P3 | Hardening | Tambah header |
| F-15 | Calendar | Kalender hanya deadline, tanpa time-blocking | OBSERVED | P3 | Perencanaan | Integrasi task due |

---

## 24. Quick Wins (≥10)

1. **Satu fungsi progress goals** → hilangkan 46/44/24. (impact: kepercayaan)
2. **Ganti nama menu "Laporan" (top-level) → "Ekspor"**. (impact: kejelasan)
3. **Hapus seed data** (atau tandai "Contoh"). (impact: kejelasan akun baru)
4. **Gaya focus ring** pakai `--focus` (coral) untuk sidebar & semua button. (impact: a11y)
5. **Aria-label** untuk 4 tombol ikon + alt gambar. (impact: a11y)
6. **Skip-link** "Langsung ke konten". (impact: keyboard)
7. **Search**: tambah hitungan hasil + "tidak ditemukan" + filter rutinitas. (impact: UX)
8. **Unifikasi "Laporan"**: label "Laporan Keuangan" vs "Ekspor Laporan". (impact: IA)
9. **Hapus 12 tombol bulan dari sidebar** → pindah ke halaman Habit. (impact: clean)
10. **Dashboard**: ganti chip "HABIT SEP" → "Habit September" (konsistensi). (impact: polish)
11. **Tooltip** pada ikon ambigu. (impact: discoverability)
12. **Logout** → panggil Supabase sign-out + hapus data per-user. (impact: privasi)

---

## 25. Major Improvements

| Problem | Why | Solution | Complexity | Deps |
|---|---|---|---|---|
| Sinkron full-dump satu blob | Tak bisa query per-entitas, risiko korupsi | Migrasi ke tabel per entitas + `auth.uid()` | **High** | Supabase RLS/migrasi |
| Tidak ada global search | Discoverability rendah | Global search ⌘K (indeks klien) | Medium | — |
| Goal↔Finance terputus | Personal OS belum menutup loop | Relasi goal→tabungan/transaksi | Medium | Data model |
| Review mingguan | Siklus PDCA belum lengkap | Halaman "Review" (minggu lalu) | Medium | — |
| Bundling JS 34 file | Latency jaringan lambat | Vite/esbuild bundle | Medium | Build step |
| Time-blocking kalender | Kalender pasif | Drag task→slot waktu | High | Data model |

---

## 26. Prioritized Roadmap

- **Phase 1 — Foundation** (F-01 progress single-source, F-02 menu Laporan, F-05 hapus seed, F-09 namespace, F-12/F-08 a11y, F-14 header)
- **Phase 2 — Productivity** (F-04 global search, F-06 unifikasi terminologi, F-11 dashboard restructure, F-15 kalender due)
- **Phase 3 — Personal Management** (Goal↔Finance, Review mingguan, Habit riwayat tahunan, time-blocking)
- **Phase 4 — Automation & AI** (MiawAI insight proaktif, recurring transaction, asisten rekomendasi goal)

---

## 27. OUTPUT KHUSUS DEVELOPER (lihat file terpisah: `docs/qa/tasklist-audit-2026-09-16.md`)

Daftar task siap-eksekusi (TASK-001 dst) dipisah ke file tersendiri agar langsung bisa diumpankan ke AI coding assistant.

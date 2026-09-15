# Audit Sistem Warna & Tema — Miaw Tracker

**Tanggal**: 2026-09-15 · **Cakupan**: seluruh `public/**` (SPA) · **Metode**: inventaris token, pemindaian hex literal (`python3 scripts/dev/audit-theme.py`), pengukuran `getComputedStyle` di 12 view (light + dark), perhitungan kontras WCAG 2.1.
**Kesimpulan singkat**: tema dasar (hangat) sudah kuat dan mayoritas komponen baru sudah memakai token, tetapi **masih ada 2 sistem warna hidup berdampingan** — palet "dingin" lama (`styles.css :root`) dan palet hangat (`theme.css`) — sehingga 332 pemakaian warna literal di luar token membuat beberapa bagian tampak tidak satu tema.

---

## 1. Angka dasar

| Metrik | Nilai |
|---|---|
| Token light (styles.css + theme.css) | 33 definisi; 42 hex unik sebagai nilai token |
| Token dark | 26 definisi |
| Pemakaian hex literal (di luar blok token, tanpa aset brand Google) | **332** (styles.css ±300 · js ±120) |
| Hex unik di luar palet token | **109** |
| Di antaranya bernuansa **dingin** (biru/hijau/ungu) | **44 warna / 95 pemakaian** |
| Hex hardcode tanpa pasangan khusus dark | 22 dari 27 sampel |

**Akar masalah**: `styles.css :root` mendefinisikan palet dingin (`--bg #f6f8fb`, `--text #101828`, `--teal #0f766e`, `--blue #2563eb`, `--cyan #0891b2`, `--violet #7c3aed`, `--rose #e11d48`), lalu `theme.css` (tema "Hangat") menimpanya (`--bg #faf6ef`, `--text #26201a`, `--teal #e85d4f` coral, dst). Setiap rule yang menulis hex langsung — atau memakai `var(--token, #fallback-dingin)` — tetap dingin dan tidak mengikuti tema.

---

## 2. Bagian yang tidak satu tema (temuan terurut)

### P0 — terlihat jelas, warna menjelma sendiri

| # | Bagian | Warna terukur | Lokasi |
|---|---|---|---|
| 1 | **Persen bulan di sidebar** (`TAB BULANAN`) | mint `#5eead4`, amber `#fcd34d`, violet `#c4b5fd`, sky `#7dd3fc` — 4 pastel dingin di sidebar cokelat hangat | `styles.css:382,387,391,395` |
| 2 | **Bar progres Tabungan** | biru `#9db9d8→#6f97c4` (soft), sage `#9fc7ab→#4e9a72`, `#67b98c→#2e7d5b` | `styles.css:4699–4701` |
| 3 | **Angka hijau Budget & Tabungan** | `#2e7d5b` (bukan `--green` `#3d9a5f`) | `styles.css:4616, 4693` |
| 4 | **Bar & legend Laporan** | sage `.lg-in #7fb5a0`, `.lg-out #e2a89b`; `rep-rb-ok #8fd0b4→#5aa87c`, `rep-rb-soft #cfe0f4→#7ea9d8` (biru), `rep-rb-done #b5e0c3→#58a878` | `styles.css:4788, 4819–4823` |
| 5 | **Goals** | bar `#3f9d63→#58b57a`; chip status aktif `#2e7d4f`; selesai teal `#2c6e63` + bg `#0f766e`; badge `#8b5cf6`/`#c4b5fd`; proj chip `#5b4b8a` | `styles.css:3667, 3762–3782` |
| 6 | **Project** | `PROJ_STATUS` planning `#8b7bb8`, completed `#2f8fbf`; `PROJ_COLORS` 8 warna campur | `js/modules/projects.js:10–17` |
| 7 | **Jadwal/agenda** | `JADWAL_COLORS` kantor `#35a7b0` (teal), marketing `#9c5fd1` (ungu), keuangan `#4c9f70`, konten `#d96a6a` | `js/modules/schedule.js:10–11` |
| 8 | **Catatan — kategori "Belajar"** | biru `#1d5fbf` | `styles.css:4095` |
| 9 | **Dokumen — tipe "link"** | biru `#1d5fbf` | `styles.css:4448` |
| 10 | **Kalender kas — teks sel `ok3`** | `#07361a` (hijau sangat gelap) — **di dark mode kontras 1,24:1 → praktis tak terbaca** | `styles.css:4546` |
| 11 | **Palet chart di JS** | `['#d99a2b','#7fb5a0','#4a7fb5','#b5567d','#6a5acd']` → 3 dari 5 dingin (sage, biru, slate-blue); dipakai legend kategori di dashboard & laporan | `dashboard.js:145`, `finance-reports-legacy.js:78–89,160`, `finance-savings.js:15` |
| 12 | **Dashboard — bar goal** | gradient pink→amber hardcode `#d96a8b→#ea8a2f` | `styles.css:5154` |
| 13 | **Progress — baris kategori habit** | Harian `#3b82f6` (biru tailwind), Bulanan `#8b5cf6` (ungu tailwind) | `progress.js:162–164` |
| 14 | **Goals — kategori & jangka waktu** | `GOAL_CATS`: Karier `#3b82f6`, Kesehatan `#3f9d63`, Pendidikan `#8b5cf6`, Personal `#ec6aa0`, Lainnya `#6b7280`; `GOAL_TERMS.panjang #2f8fbf` | `goals.js:10–17` |
| 15 | **Tabungan — warna kartu** | `SAVE_COLORS`: `#2e7d5b, #7d685c, #d99a2b, #4a7fb5, #b5567d, #6a5acd` | `finance-savings.js:15` |
| 16 | **Focus ring select** | fallback biru `#2f8fbf` | `styles.css:3859` |

### P1 — struktural (membuat tema mudah bocor lagi)

1. **Tiga hijau berbeda untuk arti "berhasil"**: token `--green #3d9a5f`, `#3f9d63`, `#2e7d5b`/`#2e7d4f` (+ sage `#7fb5a0`, `#8fd0b4`).
2. **Palet chart tidak berasal dari token** — 5 array warna terpisah di JS (`dashboard.js`, `finance-reports-legacy.js`, `finance-savings.js`, `progress.js`, `schedule.js`).
3. **Duplikasi token dua file**: 33 token di `styles.css` ditimpa `theme.css` → tidak ada rujukan tunggal; nilai lama tetap terbaca sebagai "benar" saat audit.
4. **Dead CSS membawa palet lama**: `.auth-form` (placeholder `rgba(237,247,246,.42)`, focus mint `rgba(94,234,212,…)`), `.otp-form`, `.auth-link #fcd34d`, `.auth-button` (gradient `#14b8a6→#2563eb` + border mint) — tidak ada markup yang memakainya (varian `.secondary` yang dipakai sudah bertema). Lokasi: `styles.css:505–547`.
5. **Fallback dingin pada `var()`**: `var(--violet, #8b5cf6)` (`:5028`), `var(--muted, #8a8f98)` (`:2696`), `var(--rose, #b3364a)` (`:4918`), `var(--blue, #2f8fbf)` (`:3859`).
6. **Inkonsisten dalam satu komponen**: `.month-link.active` memakai `var(--teal/--cyan)` (jadi coral→oranye, benar) sementara angka persen di dalamnya tetap pastel dingin.

### P2 — aksesibilitas kontras (WCAG AA: 4,5 teks normal · 3,0 teks besar/ikon)

**Token tema**

| Pasangan | Light | Dark |
|---|---|---|
| text / panel | 15,85 OK | 14,39 OK |
| muted / panel | **4,14** (di bawah 4,5) | 6,15 OK |
| muted / bg | **3,90** | 6,80 OK |
| aksen green / panel | **3,45** | 6,87 OK |
| aksen orange / panel | **3,34** | 6,31 OK |
| aksen pink / panel | **3,79** | 5,90 OK |
| aksen teal / panel | **3,38** | 5,79 OK |
| aksen violet / panel | 4,99 OK | 5,68 OK |

Aksen dipakai sebagai **teks kecil** (mis. `.dash-mod-cta` 12px, `.lap-card-head small` 11,5px, angka `.green` 13px) → pada light mode gagal AA. Aman untuk teks besar/tebal ≥18,66px dan untuk ikon (butuh 3,0).

**Hardcode yang gagal di salah satu mode**

- Gagal di **dark**: `#07361a` 1,24 · `#1d5fbf` 2,75 · `#2c6e63` 2,81 · `#2563eb` 3,24 · `#2e7d4f` 3,32 · `#2e7d5b` 3,35 · `#6b7280` 3,47 · `#b5567d` 3,67 · `#8b5cf6` 3,96 · `#9c5fd1` 3,97 · `#4a7fb5` 3,99
- Gagal di **light**: `#7fb5a0` 2,29 · `#35a7b0` 2,83 · `#ec6aa0` 2,90 · `#8a9a5b` 3,02 · `#3f9d63` 3,33 · `#2f8fbf` 3,56 · `#3b82f6` 3,62 · `#8b7bb8` 3,68

---

## 3. Yang sudah konsisten (jangan diubah)

- Landing pra-login (ui56–58), kartu dashboard + aksen menu per seksi (ui59–60), chip ringkasan, dan sebagian besar chip kategori Catatan sudah memakai token tema.
- Token dark lengkap (26) dan seluruh pasangan token utama lolos AA di dark mode.
- Fokus ring global, radius, dan bayangan sudah bertema (`--focus`, `--radius`, `--shadow`).

---

## 4. Rekomendasi perbaikan

**Langkah 1 — tambah token semantik di `theme.css` (light + dark):**
`--green-strong` (teks hijau aman AA di light, mis. `#2a6b4a`), `--green-soft`, `--chart-1..--chart-5` (turunan hangat: amber `#d99a2b`, sage hangat `#8fae7a`, terakota `#c47a5a`, magenta `#b5567d` → ganti jadi `#a8506d`, slate→`#7c6a9a`), `--violet-soft`, `--blue-strong` (teks biru `#1d5fbf` → `#2f6f8f` selaras `--blue`).

**Langkah 2 — pemetaan hex → token (mekanis):**

| Sekarang | Ganti |
|---|---|
| `#3f9d63`, `#58b57a`, `#2e7d5b`, `#2e7d4f`, `#8fd0b4`, `#5aa87c`, `#b5e0c3`, `#58a878`, `#7fb5a0` | `var(--green)`, `var(--green-soft)`, `var(--green-strong)` |
| `#0f766e`, `#2c6e63`, `#14b8a6`, `#35a7b0` | `var(--green)` / `var(--teal)` sesuai makna |
| `#1d5fbf`, `#2563eb`, `#3b82f6`, `#2f8fbf`, `#4a7fb5`, `#7ea9d8`, `#cfe0f4` | `var(--blue)`, `var(--blue-strong)` |
| `#8b5cf6`, `#c4b5fd`, `#8b7bb8`, `#9c5fd1`, `#5b4b8a`, `#6a5acd` | `var(--violet)`, `var(--violet-soft)` |
| `#d96a8b`, `#ec6aa0`, `#b5567d` | `var(--pink)` |
| `#07361a` | `color-mix(in srgb, var(--text) 70%, var(--green))` |
| 4 pastel persen bulan | `var(--sec-*)` atau `var(--text)`/`var(--muted)` |
| `.auth-button`/`.auth-form`/`.otp-form`/`.auth-link` | hapus (dead code) |
| Array warna di JS | definisikan sekali (`CHART_COLORS`, `CAT_COLORS`) memakai token seksi, hapus 5 array tersebar |

**Langkah 3 — guardrail otomatis:** tambahkan `scripts/dev/check-theme.js` yang gagal bila ada hex literal di luar blok `:root`/`[data-theme="dark"]` (allowlist: aset brand Google `#4285F4 #34A853 #FBBC05 #EA4335`), lalu jalankan di samping `check-syntax.js`.

**Langkah 4 — kontras:** naikkan `--muted` light menjadi ≈`#6f6558` (target ≥4,5) dan pakai `--green-strong`/`--blue-strong` untuk angka kecil berwarna.

---

## 5. Lampiran — data mentah

- Pemindaian hex diulang kapan saja dengan `python3 scripts/dev/audit-theme.py` (opsi `--json` untuk data mentah).
- Pengukuran live (contoh): bar goal `linear-gradient(90deg, rgb(63,157,99), rgb(88,181,122))`; `.green` budget `rgb(46,125,91)`; bar tabungan soft `rgb(157,185,216)→rgb(111,151,196)`; legend laporan `.lg-in rgb(127,181,160)`; persen bulan 1–3 `rgb(94,234,212)`, `rgb(252,211,77)`, `rgb(196,181,253)` — identik di light & dark (bukti tidak adaptif).

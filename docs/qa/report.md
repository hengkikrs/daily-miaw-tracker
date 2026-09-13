# Dogfood QA Report

**Target:** http://127.0.0.1:8899 (build lokal pra-deploy, `public/` — sama dengan artefak yang dideploy ke Vercel)
**Date:** 2026-09-14
**Scope:** SPA Tracker Daily (Miaw Tracker) setelah refactor modular FASE A–H — 17 view, alur tulis per modul, edge case, recovery storage, responsif mobile. Pembanding: build pra-refactor di `http://127.0.0.1:3998` (commit `a21cdb9`) untuk uji paritas.
**Tester:** Hermes Agent (eksploratif QA otomatis + asertion DOM/komputasi, tanpa akses kredensial Supabase)

---

## Executive Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | 0 |
| 🟠 High | 0 |
| 🟡 Medium | 0 |
| 🔵 Low | 2 |
| **Total** | **2** |

**Overall Assessment:** Refactor modular **lolos QA** — tidak ada regresi fungsional; 2 temuan kategori Low bersifat kosmetik/pre-existing (terbukti identik pada build pra-refactor), sehingga aman untuk deploy.

**Bukti kuantitatif utama**
- 17/17 view ter-render dengan judul & konten benar; **0 uncaught error / 0 error listener** di seluruh sesi (harness membungkus `addEventListener`).
- Alur tulis terverifikasi tersimpan ke localStorage dan **bertahan setelah reload**: Daily Task, Jadwal, Goals, Project, Catatan, Transaksi (termasuk parser `50rb` → 50000), Budget, Tabungan (saldo awal 250000), Dokumen (tautan + unggah berkas).
- Ekspor Laporan: `lapPdfBytes()` → **40.463 byte, header `%PDF-`**, 4 section, 4 KPI; `lapDocHtml()` → 48.839 char, 16 tabel.
- Keamanan: injeksi `<img src=x onerror=…>` pada Catatan dan `<script>` pada judul Daily Task **tidak tereksekusi** (0 elemen `<script>`/`<img>` disuntik, teks tampil ter-escape).
- Ketahanan: localStorage berisi JSON rusak → aplikasi tetap login, render normal (0 error) tanpa kehilangan sesi.
- Mobile 390×844: **tanpa overflow horizontal** (`scrollWidth == innerWidth`), tombol menu tampil, sidebar tertutup default & terbuka saat diklik (`class="sidebar app-shell open"`).
- Paritas pra/pasca refactor untuk perilaku ambigu: submit form kosong dan unggah dokumen → **hasil identik byte-per-byte** pada kedua build.

---

## Issues

### Issue #1: Nama berkas unggahan kehilangan ekstensi

| Field | Value |
|-------|-------|
| **Severity** | 🔵 Low |
| **Category** | Content |
| **URL** | view `dokumen` (`#content [name="docFile"]`) |

**Description:**
Saat mengunggah berkas `qa-unggah.txt`, nama yang tersimpan & ditampilkan menjadi `qa-unggah` (ekstensi `.txt` hilang). Data tersimpan dengan benar (`kind:'file'`, 59 karakter data URL), hanya penamaannya yang terpotong.

**Steps to Reproduce:**
1. Buka view `dokumen` → klik **+ Tambah Dokumen**.
2. Pilih tipe **📄 Upload File**.
3. Pilih berkas `qa-unggah.txt`.
4. Simpan, lalu periksa daftar dokumen / `state.documents`.

**Expected Behavior:**
Nama berkas tampil lengkap dengan ekstensi (`qa-unggah.txt`).

**Actual Behavior:**
Nama tampil sebagai `qa-unggah` tanpa ekstensi.

**Bukti:**
```
BARU=stored [{"n":"qa-unggah","kind":"file","len":59}]
LAMA=stored [{"n":"qa-unggah","kind":"file","len":59}]   ← identik sebelum refactor
```

**Catatan:** **Bukan regresi refactor** — perilaku sama pada build pra-refactor; hanya dicatat sebagai temuan kosmetik.

---

### Issue #2: Tidak ada umpan balik selain validasi native pada submit form kosong

| Field | Value |
|-------|-------|
| **Severity** | 🔵 Low |
| **Category** | UX |
| **URL** | view `task` → form tambah rutinitas |

**Description:**
Menekan tombol simpan dengan judul kosong tidak menambah data (benar) tetapi tidak memunculkan toast/pesan apa pun; pengguna hanya melihat tooltip validasi bawaan browser (`required`).

**Steps to Reproduce:**
1. Buka view `task` → klik tombol **+** (tambah rutinitas).
2. Biarkan judul kosong → klik simpan.

**Expected Behavior:**
Ada umpan balik eksplisit (toast "Judul wajib diisi") — sesuai pola modul lain yang memakai `showToast` untuk penolakan.

**Actual Behavior:**
Tidak ada perubahan data, tidak ada toast; submit diblokir oleh validasi native (`required` pada input judul).

**Bukti:**
```
[submit kosong BARU] {'before':'0','after':'0','tambah':False,'toast_segera':'','errors':[]}
[submit kosong LAMA] {'before':'0','after':'0','tambah':False,'toast_segera':'','errors':[]}
```

**Catatan:** **Bukan regresi refactor** — identik pada build pra-refactor.

---

## Issues Summary Table

| # | Title | Severity | Category | URL |
|---|-------|----------|----------|-----|
| 1 | Nama berkas unggahan kehilangan ekstensi | 🔵 Low | Content | view `dokumen` |
| 2 | Tanpa umpan balik selain validasi native pada submit kosong | 🔵 Low | UX | view `task` |

## Testing Coverage

### Pages/View diuji (17/17)
`dashboard`, `task` (Daily Task), `jadwal`, `goals`, `project`, `project-task`, `habits`, `progress`, `catatan`, `dokumen`, `transaksi`, `budget`, `tabungan`, `laporan-keuangan`, `reports`, `miawai`, `account` — plus layar login (mode masuk) dan tampilan mobile.

### Fitur diuji
- Render semua view + judul halaman; navigasi sidebar & akordeon grup (buka/tutup, `aria-expanded`).
- Tema terang↔gelap (toggle + persistensi `miaw-tracker.theme`).
- Alur tulis: tambah rutinitas harian; tambah event jadwal; tambah goal; tambah project (relasi `goalId`); quick capture catatan; tambah transaksi (parser `50rb`, `txForm`); tambah budget (`budName/budAmount`); tambah tabungan + saldo awal; tambah dokumen tautan; unggah berkas dokumen (data URL base64).
- Persistensi setelah reload untuk seluruh store yang diuji; scoping per akun (`:qa-user`) tetap.
- Laporan: mode periode (`bulan`/`tiga`/`tahun`, chip aktif berubah), toggle section (panjang konten 5375 → 4477), build PDF/DOC.
- Ketahanan: localStorage rusak (`{bukan json valid`) → pulih tanpa crash; submit form kosong; injeksi XSS (Catatan & judul Task); interaksi widget filter/tab (23 langkah, hasil identik dengan build pra-refactor).
- Responsif: 375×667 dan 390×844 (tanpa overflow horizontal, menu mobile berfungsi).
- Gagal-dengan-sopan: MiawAI offline → bubble asisten "⚠️ MiawAI sedang tidak tersedia. Coba lagi." (0 error); simpan profil tanpa backend → toast "Gagal memperbarui profil." (0 error).

### Tidak diuji / di luar cakupan (dan alasannya)
- **Login/OTP/Google OAuth & remote sync Supabase asli** — butuh kredensial + jaringan; env lokal sengaja `remoteEnabled=false`.
- **Respons MiawAI asli** — endpoint `/api/miawai-chat` hanya ada di deployment Vercel; yang diuji hanya jalur gagal-dengan-sopan.
- **Hapus data/akun (dialog `window.confirm`)** — memblokir renderer headless; hanya diperiksa keberadaan tombolnya.
- **Impor JSON dokumen, ganti password, hapus akun** — bergantung backend Supabase.
- **Bukti visual (screenshot) desktop** — `Page.captureScreenshot` timeout berulang di lingkungan headless ini (2 screenshot berhasil: layar login & dashboard mobile); analisis gambar otomatis gagal (provider). Sebagai gantinya: asertion DOM/geometri/`getComputedStyle` (1456 rule `styles.css` + 60 rule `theme.css` termuat, token `--teal/--green/--panel` terdefinisi, tanpa overflow).

### Blockers
- Tanpa kredensial Supabase/Vercel-env di sesi ini, fitur yang bergantung backend hanya bisa diuji sampai batas "gagal dengan sopan".

---

## Notes

1. **Perbandingan pra/pasca refactor** dilakukan pada dua origin: build pra-refactor (`:3998`, commit `a21cdb9`) vs build pasca-refactor (`:8899`, 33 modul). Semua penyimpangan yang muncul (label menit pada jam `transaksi`, nama berkas tanpa ekstensi) terbukti **turunan data dinamis / perilaku lama**, bukan akibat pemecahan file.
2. **Perbaikan kecil saat QA:** token cache-bust CSS (`styles.css`/`theme.css`/`runtime-config.js`) masih `?v=20260910-ui41` sementara JS sudah `ui42` — diseragamkan ke `?v=20260914-ui42` sebelum deploy agar pengguna lama tidak menerima CSS/JS tidak sinkron.
3. **Kandidat perbaikan berikutnya (di luar lingkup refactor, tidak diubah):** (a) pesan validasi eksplisit untuk form kosong, (b) pertahankan ekstensi nama berkas unggahan, (c) `miaw-tracker.daily-tasks.v1` belum terdaftar di `DATA_STORE_KEYS` (tidak ikut migrasi/pembersihan saat hapus akun).

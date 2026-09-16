# Modul: Onboarding (tutorial pop-up akun baru)

File: `public/js/modules/onboarding.js` · CSS: blok `/* ONBOARDING */` di `public/styles.css` · Rilis: **ui64** (2026-09-15)

## Perilaku
- Saat akun login dan `state.onboardingDone` belum ada, pop-up tutorial **muncul otomatis**.
- Dipanggil dari 3 titik: `init()` (`js/bootstrap/30-init.js`, setelah `hydrateRemoteState()`), login password, dan verifikasi OTP (`js/auth/14-auth-ui.js`). Login Google ikut lewat `init()`.
- **8 langkah**: pembuka → Kebiasaan → Daily Task & Jadwal → Goals & Project → Catatan & Dokumen → Finance → Laporan → ajakan mulai.
- Setiap langkah **memindahkan halaman di belakang pop-up** (`activeView = step.view`) supaya konteksnya terlihat.
- Navigasi: `Lanjut →`, `← Kembali`, **`Lewati tutorial`** (di bawah tombol, sesuai permintaan), `Esc` = lewati, `←`/`→` = pindah langkah.
- Langkah terakhir: tombol `Mulai pakai tracker`.

## Penyimpanan (tanpa kunci baru)
- Penanda disimpan di state yang sudah ada: `state.onboardingDone` (boolean) + `state.onboardingDoneAt` (timestamp), lewat `saveState()`.
- Karena state tersimpan per akun (`scopedKey()` → `<key>:<user-id>`) dan ikut sinkron remote, tutorial **hanya muncul sekali per akun** dan tidak muncul di perangkat lain setelah dilewati.
- Tidak ada storage key baru, tidak ada perubahan bentuk data lama, tidak menyentuh auth/api.

## Memutar ulang
Menu **Akun → panel “Tutorial” → `Putar Ulang Tutorial`** (`data-action="replay-onboarding"` di `js/events/20-bind-events.js`).
Lewat console: `state.onboardingDone = false; saveState(); openOnboarding(0);`

## QA (ui64)
- Akun baru (state kosong) → pop-up muncul, “Langkah 1 dari 8”, tombol skip ada. Terverifikasi di **lokal dan produksi**.
- Navigasi: langkah 2 → view `habits`, langkah 3 → view `task`, tombol “← Kembali” berfungsi, langkah 8 menampilkan “Mulai pakai tracker”.
- `Lewati tutorial` → pop-up hilang, `state.onboardingDone = true` tersimpan di localStorage; setelah reload **tidak muncul lagi**.
- `Putar Ulang Tutorial` di menu Akun → pop-up muncul lagi. `Esc` menutup.
- `check-syntax.js` LULUS 35 file · `check-theme.js` LULUS (tanpa hex di luar token).
- Screenshot: `cap-cdp` (lihat `scripts/dev/screenshot-cdp.py`).

## Catatan teknis
- Overlay **tanpa `backdrop-filter`** (dihapus) agar raster tetap ringan di perangkat lemah; kedalaman diambil dari `background: color-mix(in srgb, var(--sidebar) 72%, transparent)`.
- Semua warna memakai token tema (`--teal`, `--panel-raised`, `--line`, `--on-accent`, dst) sehingga ikut mode terang & gelap.

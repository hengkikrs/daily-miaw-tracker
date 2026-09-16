# Modul: Onboarding (tutorial pop-up akun BARU)

File: `public/js/modules/onboarding.js` · CSS: blok `/* ONBOARDING */` di `public/styles.css` · Rilis: **ui64 → ui65** (2026-09-15)

## Siapa yang dapat tutorial otomatis
**Hanya akun yang BARU TERDAFTAR, dan hanya sekali.**

Syarat (semua harus benar) di `maybeStartOnboarding()`:
1. Sudah login.
2. **Akun baru terdaftar** — `onboardingFreshlyRegistered()`: selisih `user.created_at` dan `user.last_sign_in_at` dari sesi Supabase **< 10 menit** (akun yang baru dibuat & login pertama). Akun lama selisihnya hari/bulan → **tidak pernah** kena tutorial otomatis.
3. Belum pernah melihat tutorial — `state.onboardingDone` belum ada.

Penanda (`state.onboardingDone` + `state.onboardingDoneAt`) dipasang **begitu pop-up terbuka**, bukan saat selesai → kalau pop-up ditutup di tengah jalan (Esc/skip/tab ditutup), tutorial **tidak akan muncul lagi**. Sifat “sekali saja” ini yang diinginkan.

## Siapa yang TIDAK dapat tutorial
- Akun yang sudah terdaftar sebelumnya (login ulang) — tidak muncul, bahkan tanpa penanda apa pun.
- Pengguna yang belum login (mode lokal) — tidak ada pendaftaran, jadi tidak muncul.
- Akun baru yang sudah pernah melihat/skip — tidak muncul lagi.

## Memutar ulang (opsional)
Menu **Akun → panel “Tutorial” → `Putar Ulang Tutorial`** (`data-action="replay-onboarding"` di `js/events/20-bind-events.js`). Ini satu-satunya cara akun lama melihat tutorial.
Lewat console: `openOnboarding(0);`

## Isi tutorial
8 langkah: pembuka → 📅 Kebiasaan → ✅ Daily Task & Jadwal → 🎯 Goals & Project → 🗂️ Catatan & Dokumen → 💰 Finance → 📊 Laporan → 🚀 “Mulai dari tiga hal ini”.
- Tiap langkah **memindahkan halaman di belakang pop-up** (`activeView = step.view`).
- Navigasi: `Lanjut →`, `← Kembali`, **`Lewati tutorial`** (di bawah tombol), `Esc` = lewati, `←`/`→` = pindah langkah, langkah terakhir `Mulai pakai tracker`.

## Titik panggil
- `init()` di `js/bootstrap/30-init.js` (setelah `hydrateRemoteState()`).
- Login password & verifikasi OTP di `js/auth/14-auth-ui.js`; login Google lewat callback → `completeLogin()` → `init()`.

## Penyimpanan
Tanpa kunci baru: penanda di state yang sudah ada (`state.onboardingDone`, `state.onboardingDoneAt`) lewat `saveState()` → per akun (`scopedKey()`) dan ikut sinkron Supabase. Tidak menyentuh storage key lama, bentuk data lama, auth, atau `api/`.

## QA (ui65) — terbukti di lokal & produksi
| Skenario | Hasil |
|---|---|
| Akun BARU (`created_at` ≈ `last_sign_in_at`) saat boot | pop-up muncul, “Langkah 1 dari 8”, penanda terpasang |
| Muat ulang halaman akun yang sama | **tidak muncul** (sekali saja) |
| Akun LAMA (dibuat 30–90 hari lalu, login sekarang) | **tidak muncul**, tanpa penanda pun |
| Tombol `Putar Ulang Tutorial` di menu Akun | pop-up muncul lagi |
| `Esc` / `Lewati tutorial` | pop-up hilang, tidak muncul lagi setelah reload |

`check-syntax.js` LULUS 35 file · `check-theme.js` LULUS. Screenshot: `scripts/dev/screenshot-cdp.py`.

## Catatan teknis
- Overlay **tanpa `backdrop-filter`** (perf perangkat lemah); kedalaman dari `background: color-mix(in srgb, var(--sidebar) 72%, transparent)`.
- Semua warna memakai token tema sehingga ikut mode terang & gelap.

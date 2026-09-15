# Account (Akun)

## Purpose
Tab Akun: profil, ganti password, halaman password, dan hapus akun (grace 24 jam).

## Main files
- Asal (sebelum refactor): `public/app.js` baris 6597-6740 (144 baris, 4 fungsi, 0 var)
- Nomor baris per file: `docs/symbol-index.md` (generated).
- File modul: `public/js/auth/14-auth-ui.js`

## Entry points
- `renderAccountPasswordPage`
- `renderAccountTab`

## Important functions
### Handler aksi / render
- `renderAccountPasswordPage`
- `renderAccountTab`

### Baca & tulis store
- (tidak ada)

### Helper internal
- `acctEyeSvg`
- `refreshAcctPwUi`

## State and storage
- (tidak ada)
- State modul (var level-IIFE): lihat `docs/symbol-index.md` bagian section `account`

## DOM dependencies
- `accountPasswordForm`
- `acctPwOk`
- `acctPwRules`
- Registry elemen global: `dom` (di `core/02-runtime-dom.js`)

## Event dependencies
- `data-action (9x)`
- `data-rule (4x)`
- Dispatch: `bindEvents()` (`events/20-bind-events.js`) → lihat `docs/navigation.md`

## Related modules
- `core-bootstrap (8)`
- `miawai (4)`
- `auth+remote-sync (3)`
- `habit-model (2)`
- `auth-screen (2)`

## Safe editing guide
Render → `renderAccountTab`/`renderAccountPasswordPage`/`refreshAcctPwUi`; alur → `updateAccountProfile`/`changeAccountPassword`/`confirmAccountDeletion`.

## Known risks
Bergantung pada `authSession` + endpoint `api/schedule-deletion`. Jangan ubah perilaku logout/hapus akun saat refactor UI.

## ui55 — halaman landing sebelum login (2026-09-15)
- `js/auth/14-auth-ui.js`: fungsi baru `authLandingHtml()` merender halaman depan (brand, hero + mock kartu skor, 8 kartu fitur, 3 langkah mulai, blok ajakan, footer). `renderAuthScreen()` bercabang: `authMode === 'landing'` → render landing + kelas `.landing` di `#authScreen`; mode lain → form lama (tidak berubah).
- `js/core/03-state.js`: default `authMode = 'landing'` (sebelumnya `'login'`).
- `js/events/20-bind-events.js`: aksi baru pada delegasi `#authScreen` — `data-auth-action="start-signup"`, `"start-login"`, `"to-landing"`. Handler lama (`toggle-pw`, `switch-mode`, `back-to-signup`, `resend-signup`, `google`) tidak diubah.
- `js/auth/14-auth-ui.js` `logoutAuth()`: setelah keluar, `authMode='landing'` sebelum `renderShell()` → user kembali ke halaman depan.
- Tombol "← Kembali ke halaman depan" (`.land-back`) ditambahkan di form login/signup (tidak muncul di layar verifikasi OTP).
- `styles.css`: blok "Halaman depan (landing)" memakai token tema (`--panel`, `--teal`, `--line`, `--radius`, `--shadow`) sehingga aman untuk light dan dark. Breakpoint 900px (1 kolom) dan 560px (CTA full-width, fitur 2 kolom).
- Alur auth tidak berubah: token, PKCE, OTP, refresh, gate `isLoggedIn()` tetap sama.
- QA lokal: 390px dan 1280px tanpa overflow horizontal; tombol start-signup → #authSignupForm, start-login → #authLoginForm, land-back → landing lagi.

## ui56–ui58 — landing minimalis (2026-09-15)
Referensi desain: gaya "calm SaaS" (navbar kapsul mengambang, headline besar rata tengah, satu CTA utama, mockup produk di tengah, whitespace lega).
- `js/auth/14-auth-ui.js` `authLandingHtml()` ditulis ulang: navbar kapsul (logo + tautan "Fitur" + "Masuk" + pill gelap "Daftar →"), hero (h1 + subjudul + CTA "Mulai gratis →" + "Masuk ke akun" + mikrokopi), pratinjau aplikasi (`.land-device` + 2 chip mengambang + `.land-glow`), 6 item fitur ringkas (`.land-item`, satu baris penjelas), footer ajakan + catatan data. Bagian "8 kartu fitur" dan "3 langkah" dari ui55 dihapus agar tidak padat.
- `index.html`: font `Fraunces` (serif, opsz 9..144 wght 600) ditambahkan ke link Google Fonts untuk headline; dipakai via `font-family: "Fraunces", var(--font-display), Georgia, serif` (fallback Space Grotesk bila gagal dimuat).
- `styles.css`: blok landing diganti total — `.land-wrap/.land-nav/.land-hero/.land-cta/.land-preview/.land-device/.land-chip/.land-feat/.land-item/.land-end`. Semua warna dari token tema (aman light & dark: pill CTA memakai `var(--text)`/`var(--bg)` sehingga otomatis terbalik di dark mode). Breakpoint 720px (CTA full-width, tautan jangkar & chip disembunyikan, fitur 2 kolom) dan 420px.
- ui57: `.land-device` 350→392px, kontras teks subjudul/fitur dinaikkan (`color-mix(var(--muted) 76%, var(--text))`).
- ui58: `text-wrap: balance` pada h1 (hindari kata yatim) dan warna tautan navbar digelapkan (`color-mix(var(--muted) 62%, var(--text))`).
- Alur auth tetap: `data-auth-action` baru (`start-signup`, `start-login`, `to-landing`) dari ui55 tidak berubah.
- QA produksi ui58: 6 item fitur, `.land-device` 392px, Fraunces termuat; klik CTA → form daftar, "Masuk" navbar/`Masuk di sini` → form login, "← Kembali" → landing, tautan "Fitur" → `#fitur`; tanpa overflow horizontal di 1280px maupun 390px.

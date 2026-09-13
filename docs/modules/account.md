# Account (Akun)

## Purpose
Tab Akun: profil, ganti password, halaman password, dan hapus akun (grace 24 jam).

## Main files
- Sekarang: `public/app.js` baris 6597-6740 (144 baris, 4 fungsi, 0 var)
- Nomor baris `public/app.js` bergeser setiap kali kode dipindah — acuan otoritatif: `docs/symbol-index.md`.
- Target refactor: `public/js/auth/14-auth-ui.js`

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

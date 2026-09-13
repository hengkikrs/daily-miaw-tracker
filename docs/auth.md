# Auth & Session

Semua auth memakai **Supabase Auth**; kunci rahasia tidak pernah masuk browser (hanya anon/publishable key dari `runtime-config.js`, plus endpoint server-side di `api/`).

## Aliran
```
boot → loadAuthSession()  (L518)
        ├─ valid (access_token + refresh_token + user.id) → body tanpa kelas 'auth-required',
        │     renderAuthPanel(), dan (bila remoteEnabled) hydrateRemoteState()
        └─ tidak ada → renderAuthScreen() → form login/daftar
login sukses → completeLogin()/saveAuthSession() → applyUserScope() → muat data akun → renderShell()
logout → logoutAuth() (L7238) → clearAuthSession() → applyUserScope() (scope tanpa user)
```

## Fungsi kunci
| Fungsi | Baris | Catatan |
|---|---|---|
| `loadAuthSession` | L518 | Menerima sesi hanya bila `access_token` **dan** `refresh_token` **dan** `user.id` ada |
| `saveAuthSession` | L528 | Menulis `miaw-tracker.auth-session.v1`, mengisi `expires_at` (default `expires_in`/3600), menghapus kelas `auth-required`, mengosongkan `#authScreen`, `renderAuthPanel()` |
| `clearAuthSession` | L539 | `authSession = null`, mereset `remoteHydrated`/`remoteSaveQueued`, hapus kunci sesi, `renderAuthPanel()` |
| `mergeAuthUser` / `completeLogin` | L558 / L574 | Menyatukan user + memicu `applyUserScope()` & sinkron ulang |
| `authFetch(path, options, token = supabaseConfig.key)` | L722 | Fetch ke Supabase Auth/GoTrue; melempar `Error` dengan pesan dari `msg/message/error_description/error`. **Tidak** dipakai untuk tabel data |
| `refreshAuthSession` | L745 | Pakai `refresh_token` untuk memperbarui sesi |
| `getAccessToken` | L765 | Refresh lebih dulu bila `expires_at - now < 60s`, lalu kembalikan `access_token` |
| `supabaseFetch` | L774 | Akses tabel REST (`apikey` + `Authorization: Bearer <accessToken>`); `null` bila `canSyncRemote()` false; 204/body kosong → `null` |
| `startGoogleLogin` / `consumeOAuthCallback` / `consumeOAuthHash` / `clearAuthHash` | L609 / L632 / L673 / L706 | PKCE + OAuth Google; verifier disimpan di `miaw-tracker.oauth-verifier.v1` |
| `pkceChallenge` | L604 | code_verifier → code_challenge |
| `startOtpCountdown` / `otpRemainingSeconds` | L710 / L591 | Cooldown kirim ulang OTP (`OTP_RESEND_SECONDS = 60`) |
| `renderAuthScreen` / `renderAuthPanel` | L1182 / L1275 | Dua mode: layar penuh (belum login) dan panel akun di topbar |
| `loginWithPassword` / `signupWithPassword` / `resendSignupOtp` / `verifyAuthOtp` | L7061 / L7098 / L7155 / L7185 | Alur password + OTP Supabase |
| `resolveLoginEmail` | L7047 | username → email: cache lokal `miaw-tracker.username-map.v1`, lalu `GET /api/lookup-user?u=` |
| `logoutAuth` | L7238 | Keluar + reset scope |
| `updateAccountProfile` / `changeAccountPassword` / `confirmAccountDeletion` | L7263 / L7295 / L7333 | Profil, ganti password, dan penjadwalan hapus akun (24 jam) via `POST /api/schedule-deletion` |

Helper validasi password (murni, tanpa state): `evaluatePassword` (L1136), `allPwChecksPass` (L1144), `canonicalUsername` (L1127), `PW_RULE_OK`/`PW_RULE_LABELS`, `refreshPwChecklistUi` (L1155), `refreshUsernamePreview` (L1176).

## Server-side (`api/`) — jangan ubah tanpa approval
| Endpoint | Fungsi |
|---|---|
| `api/lookup-user.js` | `GET /api/lookup-user?u=<username>` → `{email}`; rate-limited; service key tidak pernah ke browser |
| `api/miawai-chat.js` | Proxy chat AI (whitelist model; system prompt scope tracker) |
| `api/schedule-deletion.js` | `POST {userId}` menandai `deletion_requested_at`; purge akun kedaluwarsa (24 jam) via admin delete |

## Aturan refactor
- PKCE, OAuth, OTP, refresh token, `getAccessToken`, `authFetch`, `supabaseFetch`, `consumeOAuthCallback`, `startGoogleLogin`, `logoutAuth`, dan user-scoping dianggap **dependency inti**.
- Jangan memindahkan auth sebelum modul lain stabil (FASE G), dan jangan mengubah perilaku saat refactor UI.
- Jangan mencetak/menyalin token atau kredensial ke dokumentasi, log, atau komentar.

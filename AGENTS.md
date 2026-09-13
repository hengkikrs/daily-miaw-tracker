# AGENTS.md — Tracker Daily

Instruksi kerja untuk agen/AI (dan manusia) yang mengubah repo ini. Baca ini **sebelum** menyentuh kode.

## Apa ini
**Miaw Tracker** — SPA tracker personal (habit, task, goals, project, catatan, dokumen, keuangan, laporan, AI assistant).
Lokasi: `/opt/tracker-daily` · Branch utama: `main` · Remote: `github.com/hengkikrs/tracker-daily`

## Stack aktual (jangan diasumsikan lain)
- **Vanilla JavaScript**. Satu IIFE besar di `public/app.js` (8.774 baris, 400 fungsi, 188 var, 588 simbol top-level). **Bukan** React/Next/Vue/Svelte/TypeScript.
- **Tidak ada bundler, lint, test, atau typecheck.** Tidak ada dependency runtime.
- HTML statis `public/index.html`; 2 `<script>` **classic** di akhir `<body>` (bukan `type="module"`); tidak ada inline handler.
- CSS: `public/styles.css` + `public/theme.css`.
- Server lokal: `server.js` (HTTP native). Serverless: `api/lookup-user.js`, `api/miawai-chat.js`, `api/schedule-deletion.js`.
- Supabase (Auth + tabel `tracker_daily_states`) — opsional; bila `remoteEnabled=false` aplikasi jalan penuh offline.
- Deploy: Vercel static + functions. `scripts/build-vercel-static.js` menyalin `public/` **rekursif** → subfolder `public/js/**` otomatis ikut.

## Struktur folder
```
public/      index.html, app.js, styles.css, theme.css, runtime-config.js (generated), cat-logo.svg
             js/…        ← tujuan pemecahan modul (lihat docs/architecture.md)
api/         lookup-user.js, miawai-chat.js, schedule-deletion.js
scripts/     write-config.js, build-vercel-static.js, sync-vercel-env.js
scripts/dev/ check-syntax.js, gen-symbol-index.js   (validator, bukan bagian build)
docs/        overview, architecture, navigation, storage, auth, symbol-index, modules/*, decisions/*
```
Struktur `public/js/**` yang direncanakan + pemetaan LOC: `docs/architecture.md`.

## Entry point & arsitektur
- `renderShell()` (app.js L1861–2048) = **router**: 18 cabang `activeView`, mengganti `#content`.
- `bindEvents()` (L7479–7948) = **satu delegasi event global** → 20 handler `handle*Action` dari 23 section.
- `showToast()` (L1070) = notifikasi global.
- `init()` (L7949) = bootstrap, **dipanggil sekali di baris terakhir** (L8773).
- Hanya 2 pemanggilan top-level: `migrateLegacyStores()` (L225) dan `init()` (L8773).
- Peta lengkap: `docs/navigation.md`. Dependency lapisan: `docs/architecture.md`.

## Storage & sinkronisasi
- Semua akses lewat `scopedKey()` → kunci data jadi `<key>:<user-id>` saat login.
- Kunci: `miaw-tracker.state.v1` (state inti + sub-store finance), `jadwal.v1`, `tasks.v1`, `goals.v1`, `proj-tracker.projects.v1`, `notes.v1`, `daily-tasks.v1` (+`.log`), `theme`, `auth-session.v1`, `client-id`, `oauth-verifier.v1`, `username-map.v1`.
- Remote: `queueRemoteSave` (debounce **150 ms**) → `flushRemoteSave` → `saveRemoteState` (POST `?on_conflict=client_id`); `hydrateRemoteState` (GET `limit=1`) saat login. Detail: `docs/storage.md`.

## Auth
Supabase Auth: PKCE + Google OAuth, OTP, password login, refresh token, logout, hapus akun 24 jam (`api/schedule-deletion.js`).
`authFetch` (Auth/GoTrue), `supabaseFetch` (tabel REST), `getAccessToken` (refresh bila < 60 s). Detail: `docs/auth.md`.

## Lokasi dokumentasi
`docs/overview.md` · `docs/architecture.md` · `docs/navigation.md` · `docs/storage.md` · `docs/auth.md` · `docs/symbol-index.md` · `docs/modules/*.md` · `docs/decisions/refactor-log.md` · `docs/refactor-audit.md`

## ATURAN HEMAT TOKEN (wajib)
1. **Do not read the entire `public/app.js` by default.**
2. **Search for the relevant symbol, action, selector, or storage key before reading source code.**
3. **Read only the relevant file or code range** (`read_file` dengan `offset`/`limit`, memakai nomor baris dari `docs/symbol-index.md`).
4. **Use `docs/` as a navigation map, but verify source code before modifying behavior.**
5. Jangan membaca ulang file yang sudah dipahami; gunakan ringkasan dokumen.
6. Jangan membuka semua hasil pencarian sekaligus; perluas pembacaan bertahap.
7. UI/CSS: cari class/fungsi yang relevan, jangan baca `styles.css` (4.857 baris) seluruhnya.
8. Perubahan frontend tidak perlu membaca `api/`; perubahan API tidak perlu membaca modul UI lain.

## ATURAN PERUBAHAN (wajib)
1. **Do not modify unrelated modules.** Satu perubahan = satu modul.
2. **Do not change storage keys without an explicit migration plan.**
3. **Do not change authentication behavior during ordinary UI refactors.**
4. Jangan mengubah `api/` tanpa persetujuan eksplisit.
5. Jangan mengubah nama `data-action` / `data-view` / selector / route tanpa memperbarui semua pemanggil.
6. Jangan menambah listener ganda atau memanggil `init()` lebih dari sekali.
7. Jangan menambah bundler, framework, atau dependency runtime demi refactor.
8. **After each meaningful change, run the smallest relevant validation.**
9. **Do not claim a refactor is safe without validation.**
10. Bila perubahan menyentuh perilaku aplikasi → **berhenti dan minta persetujuan** (daftar STOP CONDITION di `docs/refactor-audit.md` §8).

## Perintah validasi
```bash
node scripts/dev/check-syntax.js      # kompilasi + duplikat deklarasi top-level (exit 1 bila gagal)
node scripts/dev/gen-symbol-index.js  # regenerasi docs/symbol-index.md setelah memindah kode
node --check public/app.js            # cek sintaks satu file
PORT=3999 node server.js              # jalankan lokal (http://localhost:3999)
npm run build                         # tulis public/runtime-config.js dari .env.local
npm run vercel:prebuild               # hasilkan .vercel/output (static + functions)
git diff --stat
```
Checklist validasi lengkap (17 route + storage + build): `docs/decisions/refactor-log.md`.

## Konvensi menulis kode
- Gaya saat ini: 2 spasi indent, `function` declaration (bukan class), string template untuk HTML, komentar bahasa Indonesia.
- Render = string HTML → `dom.content.innerHTML = ...`; jangan menambahkan framework virtual DOM.
- Simpan state lewat `save*` modul yang sudah memanggil `queueRemoteSave()`; jangan menulis `localStorage` langsung.
- `'use strict';` wajib di setiap file baru (menggantikan mode strict IIFE).
- Urutan `<script>` di `index.html` mengikuti urutan section asli app.js; `init()` harus tetap paling akhir. Naikkan query `?v=` saat mengubah aset.

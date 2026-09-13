# Tracker Daily — Overview

Aplikasi tracker personal satu halaman (SPA) **tanpa framework dan tanpa dependency runtime**.
Nama produk: **Miaw Tracker** (`🐴 Miaw Tracker - Analitik Kebiasaan`).

## Stack aktual
- Vanilla JavaScript (satu IIFE besar di `public/app.js`, 8.774 baris) — **bukan** Next.js/React/Vue/TS.
- HTML statis `public/index.html` (2 `<script>` classic di akhir `<body>`, tanpa inline handler).
- CSS: `public/styles.css` (4.857 baris) + `public/theme.css` (456 baris, tema terang/gelap).
- Server lokal: `server.js` (HTTP statis native, tanpa dependency).
- Serverless: `api/lookup-user.js`, `api/miawai-chat.js`, `api/schedule-deletion.js` (kunci rahasia hanya di server).
- Backend: Supabase (Auth + tabel `tracker_daily_states`) — bersifat **opsional**: bila `supabaseUrl`/`supabaseKey` kosong maka `remoteEnabled=false` dan aplikasi berjalan penuh secara offline via localStorage.
- Deploy: Vercel static + functions, `framework: null`, build custom tanpa bundler.

## Perintah
```bash
npm start                     # server statis lokal, http://localhost:3000 (PORT=xxxx untuk ganti)
npm run build                 # .env.local -> public/runtime-config.js
npm run vercel:prebuild       # public/ + api/ -> .vercel/output (copyDir rekursif)
npm run vercel:env            # sinkron env wajib ke Vercel
node --check public/app.js    # satu-satunya gerbang sintaks yang tersedia
```

**Tidak ada** lint, test, typecheck, atau bundler. Validasi = `node --check` + perbandingan perilaku di browser (lihat `docs/decisions/refactor-log.md`).

## Fitur (menu = 17 `data-view`)
`dashboard`, `task` (Daily Task), `jadwal`, `goals`, `project`, `project-task`, `habits`, `progress`, `catatan`, `dokumen`, `transaksi`, `budget`, `tabungan`, `laporan-keuangan`, `reports` (laporan keuangan lama), `miawai`, `account`.

## Data
- Semua data pengguna di `localStorage`, di-scope per akun (`<key>:<user-id>`), plus snapshot remote ke Supabase saat login.
- Detail lengkap: `docs/storage.md`.

## Titik masuk kode
- Router/view: `renderShell()` — `public/app.js` L1861–2048 (target: `public/js/core/09-router.js`).
- Delegasi event: `bindEvents()` — L7479–7948 (target: `public/js/events/20-bind-events.js`).
- Notifikasi: `showToast()` — L1070–1076.
- Bootstrap: `init()` — L7949–7975, **dipanggil sekali di baris terakhir file** (L8773).

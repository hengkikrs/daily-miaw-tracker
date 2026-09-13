# Miaw Tracker

Aplikasi satu halaman tanpa dependensi untuk melacak kebiasaan harian, mingguan, mingguan khusus, dan bulanan. Data tersimpan di browser lewat localStorage dan langsung memperbarui grid bulanan, panel analitik, serta dasbor tahunan.

## Fitur

- Ringkasan dasbor untuk 12 lembar bulanan
- Grid kebiasaan harian dengan tingkat penyelesaian per hari
- Grid kebiasaan mingguan dan mingguan khusus dengan jumlah minggu sesuai bulan
- Milestone bulanan sekali centang
- Rumus progres per kebiasaan dan rata-rata global bulanan
- Papan 5 besar "Miaw-keren!" dan 5 terbawah "Miaw-no!"
- Navigasi bulan responsif untuk desktop dan handphone
- Tema terang dan gelap
- Tambah, ganti nama, jeda, hapus, dan reset kebiasaan

## Menjalankan

```bash
npm start
```

Buka http://localhost:3000.

Untuk memakai port lain:

```cmd
set PORT=4000 && npm start
```

## Struktur

```text
public/
|-- index.html          # shell + 33 <script> classic (urutan = kontrak load)
|-- styles.css, theme.css, cat-logo.svg
|-- runtime-config.js   # hasil `npm run build` (gitignored)
|-- app.js              # SHIM kompatibilitas (kode sudah pindah ke js/)
`-- js/
    |-- core/           # 01-config, 02-runtime-dom, 03-state, 04-utils, 05-storage,
    |                   # 06-toast, 07-theme, 08-nav, 09-router
    |-- auth/           # 11-session, 12-oauth, 13-remote-sync, 14-auth-ui
    |-- modules/        # habit-analytics, habit-legacy, daily-tasks, schedule, tasks, goals,
    |                   # projects, notes, finance-*, progress, dashboard, miawai, laporan-export
    |-- events/         # 20-bind-events (delegasi event global)
    `-- bootstrap/      # 30-init (dipanggil paling akhir)
```

Peta navigasi kode: `docs/navigation.md` + `docs/symbol-index.md`. Aturan kerja: `AGENTS.md`.

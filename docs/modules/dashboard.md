# Dashboard

## Purpose
Kartu lintas modul: ring statistik, tren habit, kasflow, donut kategori, agenda, dan navigasi cepat `data-dash-go`.

## Main files
- Asal (sebelum refactor): `public/app.js` baris 5899-6194 (296 baris, 10 fungsi, 0 var)
- Nomor baris per file: `docs/symbol-index.md` (generated).
- File modul: `public/js/modules/dashboard.js`

## Entry points
- `renderPlaceholderView`
- `renderDashboard`
- `handleDashAction`

## Important functions
### Handler aksi / render
- `renderPlaceholderView`
- `renderDashboard`
- `handleDashAction`

### Baca & tulis store
- (tidak ada)

### Helper internal
- `dashRp`
- `goalPctOf`
- `dashCompact`
- `dashSparkline`
- `dashCompute`
- `dashGoTo`
- `dashCard`

## State and storage
- `miaw-tracker.state.v1 → sub-store: `
- State modul (var level-IIFE): lihat `docs/symbol-index.md` bagian section `dashboard`

## DOM dependencies
- (tidak ada selector langsung)
- Registry elemen global: `dom` (di `core/02-runtime-dom.js`)

## Event dependencies
- `data-dash-go (9x)`
- Dispatch: `bindEvents()` (`events/20-bind-events.js`) → lihat `docs/navigation.md`

## Related modules
- `core-bootstrap (13)`
- `report-legacy (8)`
- `auth+remote-sync (7)`
- `habit-model (6)`
- `transactions (5)`
- `tasks+focus (4)`

## Safe editing guide
Render → `renderDashboard`; aksi → `handleDashAction`; komputasi → `dashCompute` (+ `dashSparkline`, `dashRp`, `goalPctOf`).

## Known risks
Mengagregasi hampir semua modul lain (habit, task, goals, finance) tanpa menulis store. Perubahan bentuk data modul lain berdampak ke sini.

## ui59–ui60 — warna seksi & ring skor gabungan (2026-09-15)
- **Ring skor gabungan** (`js/modules/dashboard.js`): angka & label tidak lagi di dalam SVG (teks 8.5px buram), melainkan HTML di atas ring (34px + caption 11px) sehingga tajam; tanpa kotak/panel latar (`background: none; border: 0; box-shadow: none`); busur memakai `linearGradient` dari `currentColor` (opacity 0.72→1) + `drop-shadow` lembut; track memakai `var(--line)` agar sisa ring tetap terlihat. Ukuran 128→148px. Skor kini disimpan sebagai `const score` (sebelumnya formula diulang 3× inline) dan ditampilkan sebagai rincian di bawah ring: `Activity x% · Goals y% · Habit z% · Kas n%`.
- **Token warna seksi** di `styles.css`: `--sec-activity: var(--green)`, `--sec-goals: var(--pink)`, `--sec-org: var(--violet)`, `--sec-finance: var(--orange)` — semuanya token tema hangat (bukan hex baru), jadi tetap senada di light & dark.
- **Kartu dashboard**: kelas lama `.dash-mod.tone-teal/rose/violet/amber` → `.tone-activity/goals/org/finance` yang memetakan ke token seksi. Ikon kartu kini berlatar tint warna seksi (`color-mix`). Chip ringkasan diberi `data-sec` sehingga berlatar tint sesuai modulnya.
- **Menu sidebar** (`js/core/03-state.js` + `styles.css`): `syncNavGroups()` menambahkan kelas `.active` pada grup yang memuat view aktif (memakai `NAV_GROUP_OF` yang sudah ada). CSS: ikon grup berwarna `--sec`, hover grup bertint, dan sub-item aktif memakai gradient + garis inset sesuai warna seksi (Activity hijau, Goals and Habit pink, Organization ungu, Finance oranye).
- QA produksi ui60: ring `background: none` 148px, angka 34px berwarna sesuai skor, rincian tampil; border atas kartu `rgb(61,154,95)` / `rgb(208,87,146)` / `rgb(124,92,191)` / `rgb(224,104,47)`; ikon menu grup sama; sub-item aktif "Daily Task" bergradasi hijau, "Catatan" bergradasi ungu.

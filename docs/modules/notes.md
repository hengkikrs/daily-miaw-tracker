# Notes (Catatan)

## Purpose
Catatan kaya-teks dengan tab/kategori, tag, pencarian, sort, template, editor, dan sanitasi HTML allowlist.

## Main files
- Asal (sebelum refactor): `public/app.js` baris 3697-4115 (419 baris, 30 fungsi, 14 var)
- Nomor baris per file: `docs/symbol-index.md` (generated).
- File modul: `public/js/modules/notes.js`

## Entry points
- `renderNotesView`
- `renderNoteListPage`
- `renderNoteDetailPage`
- `renderNoteTemplatesPage`
- `renderNoteEditorPage`
- `handleNoteAction`
- `handleNoteInput`

## Important functions
### Handler aksi / render
- `renderNotesView`
- `renderNoteListPage`
- `renderNoteDetailPage`
- `renderNoteTemplatesPage`
- `renderNoteEditorPage`
- `handleNoteAction`
- `handleNoteInput`

### Baca & tulis store
- `loadNotes`
- `saveNotes`

### Helper internal
- `noteNewId`
- `noteNow`
- `noteSeedList`
- `sanitizeNoteHtml`
- `notePreview`
- `noteTimeLabel`
- `noteFullDate`
- `noteFind`
- `noteParseTags`
- `noteAllTags`
- `noteFiltered`
- `noteCreate`
- `noteCapture`
- `noteSetField`
- `noteRenderTags`
- `noteCardsHtml`
- `noteEmptyHtml`
- `noteActionSheet`

## State and storage
- `miaw-tracker.notes.v1`
- State modul (var level-IIFE): lihat `docs/symbol-index.md` bagian section `notes`

## DOM dependencies
- `noteETop`
- Registry elemen global: `dom` (di `core/02-runtime-dom.js`)

## Event dependencies
- `data-note-back (3x)`
- `data-note-search (2x)`
- `data-note-title (2x)`
- `data-note-body (2x)`
- `data-note-tags (2x)`
- `data-note-open (1x)`
- `data-note-menu (1x)`
- `data-note-tab (1x)`
- Dispatch: `bindEvents()` (`events/20-bind-events.js`) → lihat `docs/navigation.md`

## Related modules
- `core-bootstrap (15)`
- `auth+remote-sync (7)`
- `shell-router (1)`

## Safe editing guide
Render → `renderNotesView`/`renderNoteListPage`/`renderNoteDetailPage`/`renderNoteTemplatesPage`/`renderNoteEditorPage`; aksi → `handleNoteAction`/`handleNoteInput`; sanitasi → `sanitizeNoteHtml`; simpan → `loadNotes`/`saveNotes`.

## Known risks
`sanitizeNoteHtml` memakai allowlist `ALLOW` (L3765+) — jangan longgarkan tanpa alasan keamanan. Kunci `miaw-tracker.notes.v1`.

## ui54 — toolbar Catatan, tombol Dokumen, donut Laporan, Kalender Cashflow (2026-09-15)
- notes.js: toolbar diberi pemisah grup (B/I/H • list • kutip/link • undo/redo), title tooltip per tombol, `noteSyncTb()` menyalakan kelas `.on` (latar gelap #57443a) mengikuti gaya di posisi kursor via `selectionchange` (debounce 120ms) + `queryCommandState`.
- finance-documents.js: tombol "+ Kategori" kini `goal-chip` (40px, radius 999px, sama dgn tab); "+ Tambah Dokumen" dapat gaya `.docs-page .btn(.primary)` seragam tx-page (selama ini tanpa CSS → button polos browser). Mobile: toolbar disembunyikan, FAB tetap.
- styles.css: `.rep-donut` 138px → `clamp(190px,46%,260px)`, wrap center + gap 26px.
- finance-transactions.js: "Kalender PnL" → "Kalender Cashflow"; legend Rugi/Profit → Keluar/Masuk; ringkasan "N hari profit/rugi · terbaik/terburuk" → "masuk/keluar · terbesar". Subtitle router ikut.
- QA lokal 390px: btns=10 seps=3, bold toggle on/off ✓, onBg rgb(87,68,58); donutW=190; chip Kategori 40px == tab 40px.

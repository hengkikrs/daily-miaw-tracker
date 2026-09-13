# Notes (Catatan)

## Purpose
Catatan kaya-teks dengan tab/kategori, tag, pencarian, sort, template, editor, dan sanitasi HTML allowlist.

## Main files
- Sekarang: `public/app.js` baris 3697-4115 (419 baris, 30 fungsi, 14 var)
- Target refactor: `public/js/modules/notes.js`

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

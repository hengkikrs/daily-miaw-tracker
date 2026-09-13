# MiawAI

## Purpose
Chat AI: kirim prompt ke `/api/miawai-chat`, unggah berkas (maks 60k karakter per berkas), bubble/typing, markdown ringan.

## Main files
- Sekarang: `public/app.js` baris 6407-6596 (190 baris, 7 fungsi, 4 var)
- Target refactor: `public/js/modules/miawai.js`

## Entry points
- `renderMiawAIView`
- `handleMiawFiles`

## Important functions
### Handler aksi / render
- `renderMiawAIView`
- `handleMiawFiles`

### Baca & tulis store
- (tidak ada)

### Helper internal
- `miawSiteContext`
- `miawBubble`
- `miawSimpleMarkdown`
- `miawSend`
- `miawScrollBottom`

## State and storage
- `miaw-tracker.state.v1 → sub-store: `
- State modul (var level-IIFE): lihat `docs/symbol-index.md` bagian section `miawai`

## DOM dependencies
- `miawChat`
- Registry elemen global: `dom` (di `core/02-runtime-dom.js`)

## Event dependencies
- `data-miaw-q (3x)`
- `data-action (3x)`
- `data-miaw-rmfile (1x)`
- Dispatch: `bindEvents()` (`events/20-bind-events.js`) → lihat `docs/navigation.md`

## Related modules
- `habit-analytics (14)`
- `core-bootstrap (8)`
- `auth+remote-sync (3)`
- `shell-router (2)`
- `goals (2)`
- `tasks+focus (1)`

## Safe editing guide
Render → `renderMiawAIView`; kirim → `miawSend`; berkas → `handleMiawFiles`; konteks data user → `miawSiteContext`.

## Known risks
Memanggil endpoint server-side `api/miawai-chat.js` (kunci b.ai tidak boleh masuk browser). Prompt sengaja dipendekkan agar tidak timeout 60s — jangan panjangkan tanpa alasan.

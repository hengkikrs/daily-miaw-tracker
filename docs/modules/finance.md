# Finance

## Purpose
Lima sub-bagian: Tabungan (target & transaksi tabungan), Budget (periode + transaksi), Transaksi (kalender/daftar masuk-keluar), Dokumen (unggah base64, limit 2 MB/berkas), dan report/keuangan lama.

## Main files
- Asal (sebelum refactor): `public/app.js` baris 4327-5682 (1356 baris, 93 fungsi, 43 var)
- Nomor baris per file: `docs/symbol-index.md` (generated).
- File modul: `public/js/modules/finance-{savings,budget,transactions,documents,reports-legacy}.js`

## Entry points
- `renderSavingsView`
- `renderSaveDetail`
- `renderSvForm`
- `submitSvForm`
- `renderSvTxForm`
- `submitSvTxForm`
- `handleSaveAction`
- `renderBudgetView`
- `renderBudDetail`
- `renderBudForm`
- `submitBudForm`
- `handleBudAction`
- `submitBudTxForm`
- `renderTxView`
- `submitTxForm`
- `handleTxAction`
- `renderDocListPage`
- `renderDocModal`
- `renderDocsView`
- `handleDocSearch`
- `handleDocFilePick`
- `handleDocImport`
- `submitDocForm`
- `handleDocAction`

## Important functions
### Handler aksi / render
- `renderSavingsView`
- `renderSaveDetail`
- `renderSvForm`
- `submitSvForm`
- `renderSvTxForm`
- `submitSvTxForm`
- `handleSaveAction`
- `renderBudgetView`
- `renderBudDetail`
- `renderBudForm`
- `submitBudForm`
- `handleBudAction`
- `submitBudTxForm`
- `renderTxView`
- `submitTxForm`
- `handleTxAction`
- `renderDocListPage`
- `renderDocModal`
- `renderDocsView`
- `handleDocSearch`
- `handleDocFilePick`
- `handleDocImport`
- `submitDocForm`
- `handleDocAction`

### Baca & tulis store
- `ensureSaveStore`
- `saveList`
- `saveTxList`
- `saveFind`
- `saveCalc`
- `saveDaysLeft`
- `saveDeadlineLabel`
- `saveCatIcon`
- `saveRp`
- `saveCompact`
- `saveStatus`
- `saveBarHtml`
- `saveRp2`
- `ensureBudStore`
- `ensureTxStore`
- `ensureTxFormDefaults`
- `ensureDocStore`

### Helper internal
- `seedSavingsDemo`
- `svDraftFrom`
- `budPeriod`
- `budIcon`
- `budMonthLabel`
- `budSeedList`
- `budList`
- `budFind`
- `budTxFor`
- `budCalc`
- `budStatusText`
- `budProgressHtml`
- `budGroupDate`
- `budDraftFrom`
- `budTxFormHtml`
- `txTodayIso`
- `txIso`
- `txMonthNow`

## State and storage
- `miaw-tracker.state.v1 → sub-store: state.budSeeded, state.budgets, state.docCats, state.docSeeded, state.documents, state.saveSeeded, state.savings, state.savingsTx, state.transactions, state.txSeeded`
- State modul (var level-IIFE): lihat `docs/symbol-index.md` bagian section `savings/budget/transactions/documents/report-legacy`

## DOM dependencies
- `budForm`
- `budTxForm`
- `docForm`
- `docImportInput`
- `svForm`
- `svTxForm`
- `txForm`
- Registry elemen global: `dom` (di `core/02-runtime-dom.js`)

## Event dependencies
- `data-l (6x)`
- `data-sv-pick-ic (4x)`
- `data-sv-pick-color (4x)`
- `data-doc-new (4x)`
- `data-doc-closeform (4x)`
- `data-sv-new (3x)`
- `data-sv-filter (3x)`
- `data-bud-new (3x)`
- Dispatch: `bindEvents()` (`events/20-bind-events.js`) → lihat `docs/navigation.md`

## Related modules
- `core-bootstrap (18)`
- `transactions (12)`
- `auth+remote-sync (11)`
- `habit-model (4)`
- `shell-router (3)`
- `budget (1)`

## Safe editing guide
Sub-bagian terpisah per file: `renderSavingsView`/`handleSaveAction`, `renderBudgetView`/`handleBudAction`, `renderTxView`/`handleTxAction`, `renderDocsView`/`handleDocAction`, `renderReportView`/`handleRepAction`.

## Known risks
Sub-store ini disimpan di dalam snapshot `miaw-tracker.state.v1` lewat `buildStoresPayload`/`applyStoresPayload` — **bentuk data & kunci tidak boleh berubah**. `data-l` (6×) adalah atribut ringkas milik finance; jangan di-rename. Dokumen menyimpan base64 di localStorage (risiko kuota).

# Storage & Sinkronisasi

## Aturan emas
1. **Jangan ubah nama kunci, bentuk data, atau `SCHEMA_VERSION`** tanpa rencana migrasi.
2. Semua akses data pengguna lewat `scopedKey()` (fungsi, bukan literal) → jangan pernah menulis `localStorage.setItem('miaw-tracker.x')` langsung.
3. Setelah menulis state, panggil `saveState()` / `save*()` modul (yang sudah memanggil `queueRemoteSave()`).

## Scoping per akun
```
scopedKey(key) = authSession?.user?.id ? `${key}:${authSession.user.id}` : key
```
- Belum login → kunci tanpa suffix. Sudah login → `:<user-id>` (data tiap akun terpisah).
- `applyUserScope()` (L161–205) dipakai saat login/logout untuk memuat ulang state akun + mereset state UI (task/goal/proj/note/jadwal), lalu `ensureYear()` + `saveState()`.
- `removeUserDataFor(uid)` (L207) menghapus kunci ber-suffix user tersebut.
- `migrateLegacyStores()` (L214, **dipanggil top-level di L225**) mengadopsi kunci lama tanpa suffix ke akun yang login pertama kali.

## Kunci storage
| Kunci | Isi | Modul |
|---|---|---|
| `miaw-tracker.state.v1` | state inti + **sub-store**: `state.savings`, `state.savingsTx`, `state.transactions`, `state.budgets`, `state.documents`, `state.docCats`, `state.years` (habit) | semua; khususnya finance |
| `miaw-tracker.jadwal.v1` | daftar event jadwal | Schedule |
| `miaw-tracker.tasks.v1` | task/subtask + activity log | Tasks |
| `miaw-tracker.goals.v1` | goals + milestone. **Juga dipakai modul report/keuangan lama (L4116–4326)** | Goals, finance-reports-legacy |
| `proj-tracker.projects.v1` | project + task project (perhatikan prefix `proj-tracker`, bukan `miaw-tracker`) | Projects |
| `miaw-tracker.notes.v1` | catatan (HTML tersanitasi) | Notes |
| `miaw-tracker.daily-tasks.v1` | kegiatan sekali (satu tanggal) | Daily Tasks |
| `miaw-tracker.daily-tasks.v1.log` | log centang rutinitas (streak) | Daily Tasks |
| `miaw-tracker.daily-tasks.v1.routines` | daftar rutinitas kustom (dibuat hanya setelah user mengubah daftar) | Daily Tasks |
| `miaw-tracker.theme` | tema terang/gelap (**tidak** di-scope) | core/theme |
| `miaw-tracker.auth-session.v1` | sesi Supabase (**tidak** di-scope) | auth/session |
| `miaw-tracker.client-id` | id klien anonim sebelum login | core/state |
| `miaw-tracker.oauth-verifier.v1` | PKCE verifier saat alur Google | auth/oauth |
| `miaw-tracker.username-map.v1` | peta username → email (login username instan) | auth |

`DATA_STORE_KEYS` (L158) = 6 kunci: `state.v1`, `jadwal.v1`, `tasks.v1`, `goals.v1`, `proj-tracker.projects.v1`, `notes.v1`.
**Temuan (dokumentasi saja, jangan diperbaiki tanpa approval):** `miaw-tracker.daily-tasks.v1` **tidak** ada di daftar itu sehingga tidak ikut `migrateLegacyStores()`/`removeUserDataFor()` — akun lama berpotensi tidak mengadopsi store daily task, dan penghapusan data user tidak membersihkannya.

## Baca/tulis state
- `loadState()` (L437): parse `scopedKey(STORAGE_KEY)`; valid bila `schemaVersion === SCHEMA_VERSION (1)` **dan** ada `years`; jika tidak → `createFreshState()`.
- `saveState()` (L450): menyelaraskan `state.selectedYear/selectedView/selectedMonth/openNavGroups` dari variabel runtime, `localStorage.setItem(scopedKey(STORAGE_KEY), …)`, lalu `queueRemoteSave()`.
- `readStoreJson(key, fallback)` (L460): baca store terpisah dengan fallback aman.
- `buildStoresPayload()` (L469): `{ jadwal, goals, projects, notes, dailyTasks, dailyLog, dailyRoutines, savedAt }`.
- `applyStoresPayload(stores)` (L483): menulis balik store-store tersebut via `scopedKey`.
- Store terpisah per modul: `loadDailyTasks/saveDailyTasks`, `loadJadwalEvents/saveJadwalEvents`, `loadTasks/saveTasks`, `loadGoals/saveGoals`, `loadProjects/saveProjects`, `loadNotes/saveNotes`.
- Finance (`ensureSaveStore/ensureBudStore/ensureTxStore/ensureDocStore`) tidak memakai kunci sendiri: sub-store-nya hidup di dalam `state` lalu ikut `saveState()`.

## Remote sync (Supabase) — hanya aktif bila `remoteEnabled`
`remoteEnabled = Boolean(supabaseConfig.url && supabaseConfig.key && supabaseConfig.table)` (dari `window.MIAW_TRACKER_CONFIG`, hasil `npm run build`).
`canSyncRemote() = remoteEnabled && authSession.access_token && authSession.user.id`.

| Fungsi | Baris | Perilaku |
|---|---|---|
| `queueRemoteSave(options)` | L842 | Guard `canSyncRemote() && remoteHydrated && !isApplyingRemoteState`; set `remoteSaveQueued`, `remoteSaveRevision += 1`; debounce `REMOTE_SYNC_DEBOUNCE_MS = 150 ms` (`options.immediate` → 0) |
| `flushRemoteSave(options)` | L850 | Kirim snapshot; di `finally` bila `remoteSaveQueued` atau `revision` berubah → jadwalkan flush lagi (anti kehilangan tulisan) |
| `saveRemoteState(snapshot, options)` | L872 | `enriched = cloneStateSnapshot(); enriched.__stores = buildStoresPayload()`; POST `/rest/v1/<table>?on_conflict=client_id` dengan `Prefer: resolution=merge-duplicates,return=minimal`, payload `{ client_id, user_id, state }` |
| `hydrateRemoteState()` | L804 | GET `?client_id=eq.<clientId>&select=state,updated_at&limit=1`. Bila `isValidRemoteState` → `applyStoresPayload(state.__stores)`, hapus `__stores`, jadikan state aktif, simpan lokal, `ensureYear`, `renderShell()`; bila tidak valid → **unggah snapshot lokal** (`saveRemoteState(cloneStateSnapshot())`) |

Guard anti-loop: `isApplyingRemoteState` mencegah penyimpanan balik saat menerapkan state dari server.

## Validasi yang relevan
- Uji baseline membuktikan penulisan 7 kunci ber-scope (`…:audit-user`) dan tidak ada kunci tak ber-scope yang bocor saat login.
- Untuk menguji offline: biarkan `supabaseUrl`/`supabaseKey` kosong di `runtime-config.js` → `remoteEnabled=false` (perilaku normal aplikasi di lingkungan dev).

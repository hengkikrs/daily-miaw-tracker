// Tracker Daily — 13-remote-sync
// Dipisah dari public/app.js (refactor modular; tidak ada identifier yang di-rename).
// Classic script — urutan load: lihat <script> di public/index.html.
'use strict';


function getRemoteClientId() {
  if (authSession?.user?.id) return authSession.user.id;

  let clientId = localStorage.getItem(CLIENT_ID_KEY);
  if (!clientId) {
    clientId = `browser_${uid('client')}`;
    localStorage.setItem(CLIENT_ID_KEY, clientId);
  }

  return clientId;
}

function canSyncRemote() {
  return Boolean(remoteEnabled && authSession?.access_token && authSession?.user?.id);
}

async function authFetch(path, options = {}, token = supabaseConfig.key) {
  if (!remoteEnabled) throw new Error('Konfigurasi Supabase belum tersedia.');

  const response = await fetch(`${supabaseConfig.url}${path}`, {
    ...options,
    headers: {
      apikey: supabaseConfig.key,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const text = await response.text();
  const data = text.trim() ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.msg || data?.message || data?.error_description || data?.error || response.statusText);
  }

  return data;
}

async function refreshAuthSession() {
  if (!authSession?.refresh_token) return null;

  try {
    const session = await authFetch('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: authSession.refresh_token }),
    });
    if (session?.access_token) {
      saveAuthSession(session);
      return authSession;
    }
  } catch (error) {
    console.warn(error);
    clearAuthSession();
  }

  return null;
}

async function getAccessToken() {
  if (!authSession?.access_token) return null;
  const expiresAt = Number(authSession.expires_at || 0);
  if (expiresAt && expiresAt - Math.floor(Date.now() / 1000) < 60) {
    await refreshAuthSession();
  }
  return authSession?.access_token || null;
}

async function supabaseFetch(path, options = {}) {
  if (!canSyncRemote()) return null;
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  const headers = {
    apikey: supabaseConfig.key,
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(`${supabaseConfig.url}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(`Supabase ${response.status}: ${message}`);
  }

  if (response.status === 204) return null;

  const text = await response.text();
  if (!text.trim()) return null;

  return JSON.parse(text);
}

async function hydrateRemoteState() {
  if (!canSyncRemote() || remoteHydrated) return;
  remoteHydrated = true;

  const clientId = encodeURIComponent(getRemoteClientId());
  const path = `/rest/v1/${encodeURIComponent(supabaseConfig.table)}?client_id=eq.${clientId}&select=state,updated_at&limit=1`;

  try {
    const rows = await supabaseFetch(path, { method: 'GET' });
    const remoteState = rows?.[0]?.state;
    if (isValidRemoteState(remoteState)) {
      isApplyingRemoteState = true;
      applyStoresPayload(remoteState.__stores);
      delete remoteState.__stores;
      state = remoteState;
      if (state.selectedView === 'kalender') { state.selectedView = 'jadwal'; }
      activeYear = Number(state.selectedYear) || runtimeYear;
      activeView = state.selectedView || 'dashboard';
      activeMonth = Number.isInteger(state.selectedMonth) ? state.selectedMonth : new Date().getMonth();
      openNavGroups = new Set(state.openNavGroups || (NAV_GROUP_OF[activeView] ? [NAV_GROUP_OF[activeView]] : []));
      localStorage.setItem(scopedKey(STORAGE_KEY), JSON.stringify(state));
      ensureYear(activeYear);
      renderShell();
      isApplyingRemoteState = false;
      showToast('Data Supabase dimuat.');
      return;
    }

    await saveRemoteState(cloneStateSnapshot());
    showToast('Data lokal disinkronkan ke Supabase.');
  } catch (error) {
    isApplyingRemoteState = false;
    remoteHydrated = false; // biar bisa dicoba lagi saat berikutnya
    console.warn(error);
    showToast('Sinkron Supabase gagal — data masih tersimpan di perangkat ini.');
  }
}

function queueRemoteSave(options = {}) {
  if (!canSyncRemote() || !remoteHydrated || isApplyingRemoteState) return;
  remoteSaveQueued = true;
  remoteSaveRevision += 1;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => flushRemoteSave(options), options.immediate ? 0 : REMOTE_SYNC_DEBOUNCE_MS);
}

async function flushRemoteSave(options = {}) {
  if (!remoteEnabled || !remoteSaveQueued || remoteSaveInFlight) return;

  remoteSaveQueued = false;
  remoteSaveInFlight = true;
  const revision = remoteSaveRevision;
  const snapshot = cloneStateSnapshot();

  try {
    await saveRemoteState(snapshot, options);
  } catch (error) {
    console.warn(error);
    showToast('Data lokal tersimpan. Sinkron Supabase gagal sementara.');
  } finally {
    remoteSaveInFlight = false;
    if (remoteSaveQueued || remoteSaveRevision > revision) {
      clearTimeout(syncTimer);
      syncTimer = setTimeout(() => flushRemoteSave(options), 0);
    }
  }
}

async function saveRemoteState(snapshot = state, options = {}) {
  if (!canSyncRemote()) return;

  // snapshot = state inti; store terpisah disisipkan agar semua modul ikut tersinkron
  const enriched = cloneStateSnapshot();
  enriched.__stores = buildStoresPayload();

  const payload = {
    client_id: getRemoteClientId(),
    user_id: authSession.user.id,
    state: enriched,
  };

  await supabaseFetch(`/rest/v1/${encodeURIComponent(supabaseConfig.table)}?on_conflict=client_id`, {
    method: 'POST',
    keepalive: Boolean(options.keepalive),
    headers: {
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(payload),
  });
}

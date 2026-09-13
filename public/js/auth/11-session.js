// Tracker Daily — 11-session
// Dipisah dari public/app.js (refactor modular; tidak ada identifier yang di-rename).
// Classic script — urutan load: lihat <script> di public/index.html.
'use strict';


function isLoggedIn() {
  return Boolean(authSession?.access_token && authSession?.user?.id);
}

function loadAuthSession() {
  try {
    const session = JSON.parse(localStorage.getItem(AUTH_SESSION_KEY));
    if (session?.access_token && session?.refresh_token && session?.user?.id) return session;
  } catch {
    // Ignore invalid saved auth data.
  }
  return null;
}

function saveAuthSession(session) {
  authSession = {
    ...session,
    expires_at: session.expires_at || Math.floor(Date.now() / 1000) + Number(session.expires_in || 3600),
  };
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(authSession));
  document.body.classList.remove('auth-required');
  if (dom.authScreen) dom.authScreen.innerHTML = '';
  renderAuthPanel();
}

function clearAuthSession() {
  authSession = null;
  remoteHydrated = false;
  remoteSaveQueued = false;
  localStorage.removeItem(AUTH_SESSION_KEY);
  renderAuthPanel();
}

function authEmail() {
  return authSession?.user?.email || 'Akun tersambung';
}

function authDisplayName() {
  return authSession?.user?.user_metadata?.username
    || authSession?.user?.user_metadata?.display_name
    || authSession?.user?.user_metadata?.full_name
    || authEmail();
}

function mergeAuthUser(user) {
  if (!user?.id || !authSession) return;

  saveAuthSession({
    ...authSession,
    user: {
      ...authSession.user,
      ...user,
      user_metadata: {
        ...(authSession.user?.user_metadata || {}),
        ...(user.user_metadata || {}),
      },
    },
  });
}

function completeLogin(session) {
  if (!session?.access_token) throw new Error('Sesi login tidak diterima.');
  saveAuthSession(session);
  authOtpEmail = '';
  authPendingName = '';
  authPendingUsername = '';
  authPendingPassword = '';
  authOtpResendAt = 0;
  clearInterval(authCooldownTimer);
  authIsBusy = false;
  remoteHydrated = false;
  // Pindahkan lingkup storage ke data milik akun ini (terisolasi per user)
  applyUserScope();
  // Muat ulang data akun dari Supabase supaya perangkat lain selalu sinkron
  if (canSyncRemote()) hydrateRemoteState();
}

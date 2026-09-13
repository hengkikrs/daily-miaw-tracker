// Tracker Daily — 12-oauth
// Dipisah dari public/app.js (refactor modular; tidak ada identifier yang di-rename).
// Classic script — urutan load: lihat <script> di public/index.html.
'use strict';


function otpRemainingSeconds() {
  return Math.max(0, Math.ceil((authOtpResendAt - Date.now()) / 1000));
}

/* --- OAuth Google (PKCE flow, tanpa OTP) --- */

async function pkceChallenge(verifier) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function startGoogleLogin() {
  if (!remoteEnabled) {
    showToast('Konfigurasi Supabase belum tersedia.');
    return;
  }
  authIsBusy = true;
  renderAuthScreen();
  try {
    const verifier = noteRandomB64url(48);
    const challenge = await pkceChallenge(verifier);
    // localStorage (bukan sessionStorage): Google sering buka tab baru di mobile
    localStorage.setItem(OAUTH_VERIFIER_KEY, verifier);
    const redirectTo = `${location.origin}${location.pathname}`;
    const url = `${supabaseConfig.url}/auth/v1/authorize?provider=google&flow_type=pkce&code_challenge_method=S256&code_challenge=${challenge}&redirect_to=${encodeURIComponent(redirectTo)}`;
    location.assign(url);
  } catch (error) {
    console.warn(error);
    authIsBusy = false;
    renderAuthScreen();
    showToast('Browser tidak mendukung login Google. Pakai email & password ya.');
  }
}

async function consumeOAuthCallback() {
  // 1) Implicit-style: sesi di URL hash (fallback)
  if (consumeOAuthHash()) return true;
  // 2) PKCE: ?code=...&state=... di query -> tukar dengan sesi
  const params = new URLSearchParams(location.search);
  const code = params.get('code');
  if (params.get('error')) {
    const desc = params.get('error_description') || params.get('error');
    history.replaceState(null, '', location.pathname);
    authIsBusy = false;
    showToast(`Login Google dibatalkan: ${desc}`);
    return false;
  }
  if (!code) return false;
  let verifier = localStorage.getItem(OAUTH_VERIFIER_KEY) || sessionStorage.getItem(OAUTH_VERIFIER_KEY) || '';
  history.replaceState(null, '', location.pathname);
  if (!verifier) {
    // Verifier hilang (tab ditutup paksa dsb): restart otomatis alur Google
    startGoogleLogin();
    return true;
  }
  try {
    const session = await authFetch('/auth/v1/token?grant_type=pkce', {
      method: 'POST',
      body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
    });
    sessionStorage.removeItem(OAUTH_VERIFIER_KEY);
    localStorage.removeItem(OAUTH_VERIFIER_KEY);
    completeLogin(session);
    return true;
  } catch (error) {
    console.warn(error);
    sessionStorage.removeItem(OAUTH_VERIFIER_KEY);
    localStorage.removeItem(OAUTH_VERIFIER_KEY);
    authIsBusy = false;
    showToast('Gagal menukar kode Google. Coba lagi.');
    return false;
  }
}

function consumeOAuthHash() {
  const hash = location.hash.startsWith('#') ? location.hash.slice(1) : location.hash;
  if (!hash) return false;
  const params = new URLSearchParams(hash);
  if (params.get('error')) {
    clearAuthHash();
    authIsBusy = false;
    showToast(`Login Google dibatalkan: ${params.get('error_description') || params.get('error')}`);
    return false;
  }
  const accessToken = params.get('access_token');
  if (!accessToken) return false;
  clearAuthHash();
  let user = null;
  try { user = JSON.parse(params.get('user') || 'null'); } catch { user = null; }
  const session = {
    access_token: accessToken,
    token_type: params.get('token_type') || 'bearer',
    expires_in: Number(params.get('expires_in') || 3600),
    refresh_token: params.get('refresh_token') || '',
    user: user || undefined,
  };
  if (params.get('provider_token')) session.provider_token = params.get('provider_token');
  try {
    completeLogin(session);
    return true;
  } catch (error) {
    console.warn(error);
    authIsBusy = false;
    return false;
  }
}

function clearAuthHash() {
  history.replaceState(null, '', location.pathname + location.search);
}

function startOtpCountdown(seconds = OTP_RESEND_SECONDS) {
  authOtpResendAt = Date.now() + seconds * 1000;
  clearInterval(authCooldownTimer);
  authCooldownTimer = setInterval(() => {
    if (otpRemainingSeconds() <= 0) {
      clearInterval(authCooldownTimer);
      authCooldownTimer = null;
    }
    if (!isLoggedIn() && authMode === 'signup' && authOtpEmail) renderAuthScreen();
  }, 1000);
}

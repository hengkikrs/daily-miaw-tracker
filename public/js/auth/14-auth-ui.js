// Tracker Daily — 14-auth-ui
// Dipisah dari public/app.js (refactor modular; tidak ada identifier yang di-rename).
// Classic script — urutan load: lihat <script> di public/index.html.
'use strict';


// Update checklist + tombol submit in-place tanpa re-render (fokus input tidak hilang).
function refreshPwChecklistUi(pw) {
  authPwChecks = evaluatePassword(pw);
  const screen = dom.authScreen;
  if (!screen) return;
  const list = screen.querySelector('#authPwRules');
  if (list) {
    ['len', 'upper', 'other'].forEach((rule) => {
      const li = list.querySelector(`[data-rule="${rule}"]`);
      if (!li) return;
      const ok = authPwChecks[rule];
      li.classList.toggle('pass', ok);
      li.textContent = `${ok ? '✓' : '○'} ${PW_RULE_LABELS[rule]}`;
    });
    list.classList.toggle('all-pass', allPwChecksPass(authPwChecks));
  }
  const okLabel = screen.querySelector('#authPwOk');
  if (okLabel) okLabel.hidden = !allPwChecksPass(authPwChecks);
  const submit = screen.querySelector('#authSignupForm .auth-primary');
  if (submit && !authIsBusy) submit.disabled = pw.length > 0 ? !allPwChecksPass(authPwChecks) : true;
}

function refreshUsernamePreview(name) {
  authPendingUsername = canonicalUsername(name);
  const el = dom.authScreen?.querySelector('#authUserPreview');
  if (el) el.textContent = authPendingUsername ? `@${authPendingUsername}` : '—';
}

// Halaman depan (landing) sebelum login — profesional & minimalis.
// Satu headline, satu CTA utama, pratinjau produk datar, dan 6 fitur
// dengan ikon garis monokrom (tanpa emoji, tanpa elemen dekoratif berlebih).
// Toggle bahasa EN/ID untuk halaman sebelum login (topbar baru tampil setelah masuk).
// Tombol memakai data-action/data-lang-set supaya ditangani delegasi global
// (20-bind-events.js) dan ikut disinkronkan renderI18nStatic().
function authLangToggleHtml() {
  const btn = (code, label, title) =>
    `<button type="button" class="lang-btn" data-action="set-lang" data-lang-set="${code}" aria-pressed="${APP_LANG === code}" title="${title}">${label}</button>`;
  return `<span class="lang-toggle auth-lang-toggle" role="group" aria-label="Pilih bahasa / Choose language">${btn('en', 'EN', 'English')}${btn('id', 'ID', 'Bahasa Indonesia')}</span>`;
}

function authLandingHtml() {
  const fitur = [
    { nama: 'Kebiasaan', teks: 'Streak dan skor bulanan dihitung otomatis.', icon: '<svg viewBox="0 0 24 24"><path d="M17 2l4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>' },
    { nama: 'Task & Jadwal', teks: 'Agenda harian dengan jam, kategori, dan sesi fokus.', icon: '<svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>' },
    { nama: 'Goals & Project', teks: 'Target besar dipecah menjadi langkah yang terukur.', icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>' },
    { nama: 'Catatan & Dokumen', teks: 'Ide dan berkas tersimpan rapi dalam kategori.', icon: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>' },
    { nama: 'Finance', teks: 'Uang masuk dan keluar, budget, serta tabungan.', icon: '<svg viewBox="0 0 24 24"><path d="M22 7l-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/></svg>' },
    { nama: 'Laporan & Miaw AI', teks: 'Tren bulanan dan asisten perangkum dalam satu klik.', icon: '<svg viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="M7 15v4"/><path d="M12 10v9"/><path d="M17 6v13"/></svg>' },
  ];

  return `
    <div class="land-wrap">
      <nav class="land-nav">
        <span class="land-nav-brand">
          <img src="cat-logo.svg" alt="" aria-hidden="true" />
          <b>Miaw Tracker</b>
        </span>
        <span class="land-nav-links">
          ${authLangToggleHtml()}
          <button class="land-nav-link" type="button" data-auth-action="start-login">Masuk</button>
          <button class="land-nav-cta" type="button" data-auth-action="start-signup">Mulai gratis</button>
        </span>
      </nav>

      <header class="land-hero">
        <p class="land-kicker">Personal productivity</p>
        <h1>Semua hal pentingmu, dalam satu tempat.</h1>
        <p>Lacak kebiasaan, tugas, target, catatan, dan keuangan — dengan antarmuka yang tenang, fokus, dan bebas dari kebisingan.</p>
        <div class="land-cta-row">
          <button class="land-cta" type="button" data-auth-action="start-signup">
            Mulai gratis <span class="land-cta-arrow" aria-hidden="true">→</span>
          </button>
          <button class="land-cta-link" type="button" data-auth-action="start-login">Masuk ke akun</button>
        </div>
      </header>

      <section class="land-preview" aria-hidden="true">
        <article class="land-device">
          <header>
            <span>Kebiasaan hari ini</span>
            <strong>82%</strong>
          </header>
          <div class="land-bar"><span style="width:82%"></span></div>
          <ul class="land-rows">
            <li><i class="on">✓</i><span>Olahraga pagi</span><em>21 hari</em></li>
            <li><i class="on">✓</i><span>Baca 20 halaman</span><em>18 hari</em></li>
            <li><i>○</i><span>Jurnal malam</span><em>12 hari</em></li>
          </ul>
        </article>
      </section>

      <section class="land-feat" id="fitur">
        ${fitur.map((f) => `
          <article class="land-item">
            <span class="land-item-ico">${f.icon}</span>
            <strong>${f.nama}</strong>
            <p>${f.teks}</p>
          </article>
        `).join('')}
      </section>

      <footer class="land-end">
        <p>Sudah punya akun? <button class="land-inline-link" type="button" data-auth-action="start-login">Masuk di sini</button></p>
        <p class="land-foot">Miaw Tracker — pelacak pribadi untuk kebiasaan, tugas, catatan, dan keuangan.</p>
      </footer>
    </div>
  `;
}

function renderAuthScreen() {
  if (!dom.authScreen) return;

  document.body.classList.add('auth-required');

  if (authMode === 'landing') {
    dom.authScreen.classList.add('landing');
    dom.authScreen.innerHTML = authLandingHtml();
    return;
  }

  dom.authScreen.classList.remove('landing');

  const isSignup = authMode === 'signup';
  const isVerify = isSignup && authOtpEmail;
  const remaining = otpRemainingSeconds();
  const title = isVerify ? 'Verifikasi email' : (isSignup ? 'Daftar akun' : 'Masuk ke Miaw Tracker');
  const subtitle = isVerify
    ? `Masukkan kode OTP yang dikirim ke ${authOtpEmail}.`
    : (isSignup
      ? 'Buat akun dengan email dan password, lalu verifikasi OTP dari email.'
      : 'Masukkan email dan password untuk membuka tracker pribadi kamu.');

  dom.authScreen.innerHTML = `
    <div class="auth-hero">
      <div class="auth-brand">
        <img src="cat-logo.svg" alt="" aria-hidden="true" />
        <div>
          <span>Miaw Tracker</span>
          <strong>Pelacak kebiasaan pribadi</strong>
        </div>
      </div>
      ${authLangToggleHtml()}

      <div class="auth-copy">
        <h1>${title}</h1>
        <p>${subtitle}</p>
      </div>

      ${isVerify ? `
        <form id="authOtpForm" class="auth-page-form">
          <label for="authOtp">Kode OTP</label>
          <input id="authOtp" name="token" type="text" inputmode="numeric" autocomplete="one-time-code" placeholder="6 digit dari email" maxlength="8" required />
          <p class="auth-hint">Kode belum masuk? Tunggu ${remaining > 0 ? `${remaining} detik` : '0 detik'} untuk kirim ulang.</p>
          <button class="auth-primary" type="submit" ${authIsBusy ? 'disabled' : ''}>
            ${authIsBusy ? 'Memverifikasi...' : 'Verifikasi dan masuk'}
          </button>
        </form>
        <div class="auth-row-actions">
          <button class="auth-text-button" type="button" data-auth-action="back-to-signup">Ganti email</button>
          <button class="auth-text-button" type="button" data-auth-action="resend-signup" ${authIsBusy || remaining > 0 ? 'disabled' : ''}>
            ${remaining > 0 ? `Kirim ulang (${remaining})` : 'Kirim ulang OTP'}
          </button>
        </div>
      ` : `
        <form id="${isSignup ? 'authSignupForm' : 'authLoginForm'}" class="auth-page-form">
          ${isSignup ? `
            <label for="authName">Nama pengguna</label>
            <input id="authName" name="name" type="text" autocomplete="name" placeholder="Nama kamu" value="${escapeHtml(authPendingName)}" maxlength="40" required />
            <p class="auth-hint">Nanti bisa dipakai untuk login: <strong id="authUserPreview">@${escapeHtml(authPendingUsername || canonicalUsername(authPendingName) || '—')}</strong></p>
          ` : ''}

          <label for="authEmail">${isSignup ? 'Email' : 'Email atau username'}</label>
          <input id="authEmail" name="email" type="${isSignup ? 'email' : 'text'}" autocomplete="email" placeholder="${isSignup ? 'nama@email.com' : 'nama@email.com atau username'}" value="${escapeHtml(authOtpEmail)}" required />

          <label for="authPassword">Password</label>
          <div class="auth-pw-wrap">
            <input id="authPassword" name="password" type="${authPwVisible ? 'text' : 'password'}" autocomplete="${isSignup ? 'new-password' : 'current-password'}" placeholder="Minimal 8 karakter" minlength="8" required />
            <button class="auth-eye" type="button" data-auth-action="toggle-pw" aria-label="${authPwVisible ? 'Sembunyikan password' : 'Tampilkan password'}" aria-pressed="${authPwVisible ? 'true' : 'false'}" tabindex="-1">
              <svg class="eye-open" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${authPwVisible ? ' style="display:none"' : ''}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
              <svg class="eye-off" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${authPwVisible ? '' : ' style="display:none"'}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.13a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            </button>
          </div>
          ${isSignup ? `
            <ul class="auth-pw-rules ${allPwChecksPass(authPwChecks) ? 'all-pass' : ''}" id="authPwRules" aria-label="Kriteria password">
              <li data-rule="len" class="${authPwChecks.len ? 'pass' : ''}">${authPwChecks.len ? '✓' : '○'} Minimal 8 karakter</li>
              <li data-rule="upper" class="${authPwChecks.upper ? 'pass' : ''}">${authPwChecks.upper ? '✓' : '○'} Minimal 1 huruf besar (A-Z)</li>
              <li data-rule="other" class="${authPwChecks.other ? 'pass' : ''}">${authPwChecks.other ? '✓' : '○'} Minimal 1 angka / karakter non-huruf</li>
            </ul>
            <p class="auth-pw-ok" id="authPwOk" ${allPwChecksPass(authPwChecks) ? '' : 'hidden'}>✓ ${PW_RULE_OK}</p>
          ` : ''}

          <button class="auth-primary" type="submit" ${authIsBusy || (isSignup && !allPwChecksPass(authPwChecks)) ? 'disabled' : ''}>
            ${authIsBusy ? 'Memproses...' : (isSignup ? 'Daftar dan kirim OTP' : 'Masuk')}
          </button>
        </form>
        <button class="auth-switch" type="button" data-auth-action="switch-mode">
          ${isSignup ? 'Sudah punya akun? Masuk' : 'Belum punya akun? Daftar'}
        </button>
        <button class="auth-text-button land-back" type="button" data-auth-action="to-landing">← Kembali ke halaman depan</button>
        ${!isSignup && remoteEnabled ? `
          <div class="auth-divider"><span>atau</span></div>
          <button class="auth-google" type="button" data-auth-action="google" ${authIsBusy ? 'disabled' : ''}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.44a5.5 5.5 0 0 1-2.4 3.62v3h3.87c2.27-2.09 3.59-5.17 3.59-8.81z"/><path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3.01c-1.07.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.1A11.99 11.99 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54v-3.1H1.29a12 12 0 0 0 0 10.74l3.98-3.1z"/><path fill="#EA4335" d="M12 4.73c1.77 0 3.35.61 4.6 1.8l3.43-3.43A11.97 11.97 0 0 0 1.29 6.63l3.98 3.1C6.22 6.84 8.87 4.73 12 4.73z"/></svg>
            Lanjut dengan Google
          </button>
          <p class="auth-hint center">Masuk cepat pakai akun Google — tanpa OTP.</p>
        ` : ''}
      `}
    </div>
  `;
}

function renderAuthPanel() {
  if (!dom.authPanel) return;

  if (!isLoggedIn()) {
    dom.authPanel.innerHTML = '';
    return;
  }

  if (!remoteEnabled) {
    dom.authPanel.innerHTML = `
      <div class="auth-card">
        <strong>Mode lokal</strong>
        <p>Konfigurasi Supabase belum tersedia.</p>
      </div>
    `;
    return;
  }

  dom.authPanel.innerHTML = `
    <div class="auth-card signed-in">
      <span class="auth-kicker">Akun aktif</span>
      <span class="auth-identity">
        <strong title="${escapeHtml(authEmail())}">${escapeHtml(authDisplayName())}</strong>
        <p>${escapeHtml(authEmail())}</p>
      </span>
      <button class="auth-button secondary" type="button" data-auth-action="logout" ${authIsBusy ? 'disabled' : ''}>
        Keluar
      </button>
    </div>
  `;
}

let accountPage = 'main';
let acctNewPwVisible = false;
let accountDeleteOpen = false;
let accountResetFinanceOpen = false; // modal konfirmasi reset data keuangan
let acctPwDraft = { pw: '', confirm: '' };

function acctEyeSvg(show) {
  return `
    <button class="auth-eye" type="button" data-action="${show ? 'acct-eye-off' : 'acct-eye-on'}" aria-label="${show ? 'Sembunyikan password' : 'Tampilkan password'}" aria-pressed="${show ? 'true' : 'false'}">
      <svg class="eye-open" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${show ? ' style="display:none"' : ''}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
      <svg class="eye-off" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${show ? '' : ' style="display:none"'}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0 11-8 11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.13a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
    </button>`;
}

function renderAccountPasswordPage() {
  const meta = authSession?.user?.user_metadata || {};
  return `
    <div class="account-layout">
      <section class="panel account-panel">
        <div class="section-heading">
          <div>
            <h2>Ganti Password</h2>
            <p>Buat password baru. Semua kriteria di bawah harus lolos sebelum password bisa disimpan.</p>
          </div>
          <button class="ghost-button" type="button" data-action="account-back">← Kembali</button>
        </div>
        <form id="accountPasswordForm" class="account-form">
          <label>
            <span>Password Baru</span>
            <div class="auth-pw-wrap">
              <input name="password" type="${acctNewPwVisible ? 'text' : 'password'}" autocomplete="new-password" placeholder="Minimal 8 karakter" value="${escapeHtml(acctPwDraft.pw)}" required />
              ${acctEyeSvg(acctNewPwVisible)}
            </div>
          </label>
          <ul class="auth-pw-rules" id="acctPwRules" aria-label="Kriteria password">
            <li data-rule="len">○ ${PW_RULE_LABELS.len}</li>
            <li data-rule="upper">○ ${PW_RULE_LABELS.upper}</li>
            <li data-rule="other">○ ${PW_RULE_LABELS.other}</li>
          </ul>
          <p class="acct-pw-ok" id="acctPwOk" hidden>✓ Password lolos semua kriteria</p>
          <label>
            <span>Ulangi Password</span>
            <div class="auth-pw-wrap">
              <input name="confirmPassword" type="password" autocomplete="new-password" placeholder="Ketik ulang password baru" value="${escapeHtml(acctPwDraft.confirm)}" required />
            </div>
          </label>
          <button class="primary-button" type="submit" disabled>Simpan Password Baru</button>
        </form>
      </section>
    </div>
  `;
}

function refreshAcctPwUi(pw) {
  const checks = evaluatePassword(pw);
  const screen = dom.content;
  if (!screen) return;
  const list = screen.querySelector('#acctPwRules');
  if (list) {
    ['len', 'upper', 'other'].forEach((rule) => {
      const li = list.querySelector(`[data-rule="${rule}"]`);
      if (!li) return;
      const ok = checks[rule];
      li.classList.toggle('pass', ok);
      li.textContent = `${ok ? '✓' : '○'} ${PW_RULE_LABELS[rule]}`;
    });
    list.classList.toggle('all-pass', allPwChecksPass(checks));
  }
  const okLabel = screen.querySelector('#acctPwOk');
  if (okLabel) okLabel.hidden = !allPwChecksPass(checks);
  const submit = screen.querySelector('#accountPasswordForm .primary-button');
  if (submit && !authIsBusy) submit.disabled = !allPwChecksPass(checks);
}

function renderAccountTab() {
  if (accountPage === 'password') return renderAccountPasswordPage();

  const meta = authSession?.user?.user_metadata || {};
  const fullName = meta.display_name || meta.full_name || '';
  const phone = meta.phone || '';
  return `
    <div class="account-layout">
      <section class="panel account-panel">
        <div class="section-heading">
          <div>
            <h2>Profil Akun</h2>
            <p>Data yang dipakai untuk masuk dan tampil di aplikasi.</p>
          </div>
        </div>
        <form id="accountProfileForm" class="account-form">
          <label>
            <span>Nama</span>
            <input name="fullName" type="text" maxlength="60" value="${escapeHtml(fullName)}" autocomplete="name" />
          </label>
          <label>
            <span>Username</span>
            <input name="username" type="text" maxlength="40" value="${escapeHtml(meta.username || '')}" autocomplete="username" />
          </label>
          <label>
            <span>Email yang digunakan</span>
            <input type="email" value="${escapeHtml(authEmail())}" disabled />
          </label>
          <label>
            <span>Nomor Telepon</span>
            <input name="phone" type="tel" maxlength="20" value="${escapeHtml(phone)}" autocomplete="tel" placeholder="08xxxxxxxxxx" />
          </label>
          <button class="primary-button" type="submit">Simpan Profil</button>
        </form>
      </section>

      <section class="panel account-panel">
        <div class="section-heading">
          <div>
            <h2>Keamanan</h2>
            <p>Password digunakan untuk masuk ke akun ini.</p>
          </div>
        </div>
        <button class="primary-button" type="button" data-action="account-password-page">Ubah Password</button>
      </section>

      <section class="panel account-panel">
        <div class="section-heading">
          <div>
            <h2>Tutorial</h2>
            <p>Panduan singkat cara mengisi tracker: kebiasaan, task, goals, catatan, keuangan, sampai laporan.</p>
          </div>
        </div>
        <button class="primary-button" type="button" data-action="replay-onboarding">Putar Ulang Tutorial</button>
      </section>

      <section class="panel account-panel">
        <div class="section-heading">
          <div>
            <h2>Tampilan</h2>
            <p>Pilih tema website sesuai selera. Pilihan tersimpan di perangkat ini.</p>
          </div>
        </div>
        <div class="theme-picker" role="group" aria-label="Tema website">
          ${[['light', '#16A34A'], ['dark', '#22C55E'], ['ocean', '#0EA5E9'], ['sunset', '#EA580C'], ['mono', '#64748B']].map(([th, col]) => `
            <button type="button" class="theme-opt ${savedTheme === th ? 'on' : ''}" data-action="set-theme" data-theme-set="${th}" aria-pressed="${savedTheme === th}">
              <i class="theme-swatch" style="background:${col}"></i>
              <b>${themeLabel(th)}</b>
              ${savedTheme === th ? '<span class="theme-check">✓</span>' : ''}
            </button>`).join('')}
          <button type="button" class="theme-opt ${savedTheme === 'auto' ? 'on' : ''}" data-action="set-theme" data-theme-set="auto" aria-pressed="${savedTheme === 'auto'}">
            <i class="theme-swatch theme-swatch-auto"></i>
            <b>${themeLabel('auto')}</b>
            ${savedTheme === 'auto' ? '<span class="theme-check">✓</span>' : ''}
          </button>
        </div>
      </section>

      <section class="panel account-panel">
        <div class="section-heading">
          <div>
            <h2>Reset Data Keuangan</h2>
            <p>Mengosongkan transaksi, budget, tabungan, dan riwayat laporan supaya bisa diisi dari awal. Kebiasaan, task, goals, catatan, dan dokumen <strong>tidak</strong> dihapus.</p>
          </div>
        </div>
        <button class="danger-button" type="button" data-action="reset-finance-open">Reset Data Keuangan</button>
      </section>

      <section class="panel account-panel">
        <div class="section-heading">
          <div>
            <h2>Sesi</h2>
            <p>Keluar dari akun ini di perangkat ini. Kamu bisa masuk lagi kapan saja.</p>
          </div>
        </div>
        <button class="ghost-button" type="button" data-action="account-logout" ${authIsBusy ? 'disabled' : ''}>Keluar</button>
      </section>

      <section class="panel account-panel danger-zone">
        <div class="section-heading">
          <div>
            <h2>Hapus Akun</h2>
            <p>Menghapus akun akan menghapus semua data tracker dari perangkat dan database website. Penghapusan identitas akan otomatis berlangsung 24 jam sejak akun dihapus.</p>
          </div>
        </div>
        <button class="danger-button" type="button" data-action="delete-account-data">Hapus Akun</button>
      </section>
    </div>
    ${accountDeleteOpen ? `
    <div class="doc-modal-wrap" id="acctDeleteModal" role="dialog" aria-modal="true" aria-labelledby="acctDeleteTitle" data-action="account-delete-cancel">
      <div class="doc-modal acct-del-modal" data-action="acct-del-noop">
        <div class="doc-modal-head"><b id="acctDeleteTitle">Hapus Akun?</b>
          <button class="ghost-button" type="button" data-action="account-delete-cancel">✕</button>
        </div>
        <p>Konfirmasi sekali lagi. Ini akan menghapus <strong>semua data tracker</strong> dari perangkat dan database website. Penghapusan identitas akun berlangsung otomatis <strong>24 jam</strong> setelah akun dihapus.</p>
        <label class="acct-del-confirm">
          <span>Ketik: <code>ya, saya ingin hapus akun</code></span>
          <input id="acctDelConfirm" type="text" autocomplete="off" placeholder="ya, saya ingin hapus akun" />
        </label>
        <div class="doc-modal-foot">
          <button class="ghost-button" type="button" data-action="account-delete-cancel">Batal</button>
          <button class="danger-button" type="button" id="acctDelGo" data-action="account-delete-confirm" disabled>Hapus Permanen</button>
        </div>
      </div>
    </div>` : ''}
    ${accountResetFinanceOpen ? `
    <div class="doc-modal-wrap" id="acctResetFinModal" role="dialog" aria-modal="true" aria-labelledby="acctResetFinTitle" data-action="reset-finance-cancel">
      <div class="doc-modal acct-del-modal" data-action="acct-resetfin-noop">
        <div class="doc-modal-head"><b id="acctResetFinTitle">Reset data keuangan?</b>
          <button class="ghost-button" type="button" data-action="reset-finance-cancel">✕</button>
        </div>
        <p>Transaksi, budget, tabungan, dan riwayat laporan akan <strong>dikosongkan</strong> di perangkat ini dan di database website. Data kebiasaan (habit), task, goals, catatan, dan dokumen <strong>tidak dihapus</strong>.</p>
        <label class="acct-del-confirm">
          <span>Ketik: <code>reset keuangan</code></span>
          <input id="acctResetFinConfirm" type="text" autocomplete="off" placeholder="reset keuangan" />
        </label>
        <div class="doc-modal-foot">
          <button class="ghost-button" type="button" data-action="reset-finance-cancel">Batal</button>
          <button class="danger-button" type="button" id="acctResetFinGo" data-action="reset-finance-confirm" disabled>Kosongkan Data Keuangan</button>
        </div>
      </div>
    </div>` : ''}
  `;
}

async function resolveLoginEmail(identifier) {
  if (identifier.includes('@')) return identifier;
  // Username → email: cari di cookie lokal, lalu endpoint lookup server-side.
  try {
    const map = JSON.parse(localStorage.getItem('miaw-tracker.username-map.v1') || '{}');
    if (map[identifier]) return map[identifier];
  } catch { /* abaikan map rusak */ }
  const res = await fetch(`/api/lookup-user?u=${encodeURIComponent(identifier)}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('lookup_failed');
  const data = await res.json().catch(() => null);
  return data?.email || null;
}

async function loginWithPassword(form) {
  const data = new FormData(form);
  const identifier = String(data.get('email') || '').trim().toLowerCase();
  const password = String(data.get('password') || '');
  if (!identifier || !password) return;

  authIsBusy = true;
  renderAuthScreen();

  try {
    const email = await resolveLoginEmail(identifier);
    if (!email) {
      showToast('Username tidak ditemukan. Coba login dengan email.');
      return;
    }

    const session = await authFetch('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
      }),
    });

    completeLogin(session);
    await hydrateRemoteState();
    renderShell();
    showToast('Miaw-velous! Kamu sudah masuk.');
    maybeStartOnboarding();
  } catch (error) {
    console.warn(error);
    showToast('Email atau password salah, atau akun belum diverifikasi.');
  } finally {
    authIsBusy = false;
    if (!isLoggedIn()) renderAuthScreen();
  }
}

async function signupWithPassword(form) {
  const data = new FormData(form);
  const name = String(data.get('name') || '').trim();
  const email = String(data.get('email') || '').trim().toLowerCase();
  const password = String(data.get('password') || '');
  const username = canonicalUsername(name);
  authPendingUsername = username;
  if (!name) {
    showToast('Nama pengguna wajib diisi.');
    return;
  }
  if (!username) {
    showToast('Nama pengguna minimal 2 huruf/angka (akan jadi username login).');
    return;
  }
  if (!email || !email.includes('@')) {
    showToast('Email tidak valid.');
    return;
  }
  authPwChecks = evaluatePassword(password);
  if (!allPwChecksPass(authPwChecks)) {
    showToast('Password belum memenuhi kriteria: minimal 8 karakter, 1 huruf besar, 1 angka/karakter non-huruf.');
    return;
  }

  authIsBusy = true;
  authPendingName = name.slice(0, 40);
  authOtpEmail = email;
  authPendingPassword = password;
  authPwVisible = false;
  renderAuthScreen();

  try {
    await authFetch('/auth/v1/otp', {
      method: 'POST',
      body: JSON.stringify({
        email,
        create_user: true,
        data: {
          username,
          full_name: authPendingName,
          display_name: authPendingName,
        },
      }),
    });

    startOtpCountdown();
    showToast('OTP verifikasi dikirim. Cek email kamu.');
  } catch (error) {
    console.warn(error);
    showToast('Gagal daftar. Email mungkin sudah terdaftar atau rate limit OTP aktif.');
  } finally {
    authIsBusy = false;
    if (!isLoggedIn()) renderAuthScreen();
  }
}

async function resendSignupOtp() {
  if (!authOtpEmail || otpRemainingSeconds() > 0) return;

  authIsBusy = true;
  renderAuthScreen();

  try {
    await authFetch('/auth/v1/otp', {
      method: 'POST',
      body: JSON.stringify({
        email: authOtpEmail,
        create_user: true,
        data: {
          username: authPendingName,
          full_name: authPendingName,
          display_name: authPendingName,
        },
      }),
    });
    startOtpCountdown();
    showToast('OTP dikirim ulang. Cek email kamu.');
  } catch (error) {
    console.warn(error);
    showToast('Belum bisa kirim ulang OTP. Tunggu sebentar lalu coba lagi.');
  } finally {
    authIsBusy = false;
    renderAuthScreen();
  }
}

async function verifyAuthOtp(form) {
  const data = new FormData(form);
  const token = String(data.get('token') || '').trim();
  if (!authOtpEmail || !token) return;

  authIsBusy = true;
  renderAuthScreen();

  try {
    const session = await authFetch('/auth/v1/verify', {
      method: 'POST',
      body: JSON.stringify({
        email: authOtpEmail,
        token,
        type: 'email',
      }),
    });

    await authFetch('/auth/v1/user', {
      method: 'PUT',
      body: JSON.stringify({
        password: authPendingPassword,
        data: {
          username: authPendingUsername || canonicalUsername(authPendingName),
          full_name: authPendingName,
          display_name: authPendingName,
        },
      }),
    }, session.access_token);

    // Simpan pemetaan username→email lokal supaya login username instan tanpa lookup.
    try {
      const mapKey = 'miaw-tracker.username-map.v1';
      const map = JSON.parse(localStorage.getItem(mapKey) || '{}');
      const uname = authPendingUsername || canonicalUsername(authPendingName);
      if (uname) map[uname] = authOtpEmail;
      localStorage.setItem(mapKey, JSON.stringify(map));
    } catch { /* penyimpanan lokal bersifat opsional */ }

    completeLogin(session);
    remoteHydrated = false;
    await hydrateRemoteState();
    renderShell();
    showToast('Miaw-velous! Email terverifikasi.');
    maybeStartOnboarding();
  } catch (error) {
    console.warn(error);
    showToast('Kode OTP tidak valid atau sudah kedaluwarsa.');
  } finally {
    authIsBusy = false;
    if (!isLoggedIn()) renderAuthScreen();
  }
}

async function logoutAuth() {
  authIsBusy = true;
  renderAuthPanel();

  try {
    const token = authSession?.access_token;
    if (token) await authFetch('/auth/v1/logout', { method: 'POST' }, token);
  } catch (error) {
    console.warn(error);
  }

  const leavingUid = authSession?.user?.id || '';
  clearAuthSession();
  removeUserDataFor(leavingUid);
  state = createFreshState();
  activeYear = runtimeYear;
  activeView = 'dashboard';
  activeMonth = new Date().getMonth();
  ensureYear(activeYear);
  saveState();
  authMode = 'landing';
  renderShell();
  authIsBusy = false;
  showToast('Kamu sudah keluar. Mode lokal aktif.');
}

async function updateAccountProfile(form) {
  const data = new FormData(form);
  const username = canonicalUsername(String(data.get('username') || ''));
  const fullName = String(data.get('fullName') || '').trim().slice(0, 60);
  const phone = String(data.get('phone') || '').replace(/[^\d+\-\s()]/g, '').trim().slice(0, 20);

  const meta = {};
  if (username) meta.username = username;
  if (fullName) { meta.display_name = fullName; meta.full_name = fullName; }
  meta.phone = phone;

  authIsBusy = true;
  renderShell();

  try {
    const token = await getAccessToken();
    const response = await authFetch('/auth/v1/user', {
      method: 'PUT',
      body: JSON.stringify({ data: meta }),
    }, token);

    mergeAuthUser(response?.user || response);
    showToast('Profil akun diperbarui.');
  } catch (error) {
    console.warn(error);
    showToast('Gagal memperbarui profil.');
  } finally {
    authIsBusy = false;
    renderShell();
  }
}

async function changeAccountPassword(form) {
  const data = new FormData(form);
  const password = String(data.get('password') || '');
  const confirmPassword = String(data.get('confirmPassword') || '');

  if (!allPwChecksPass(evaluatePassword(password))) {
    showToast('Password belum lolos semua kriteria.');
    return;
  }

  if (password !== confirmPassword) {
    showToast('Konfirmasi password tidak sama.');
    return;
  }

  authIsBusy = true;
  renderShell();

  try {
    const token = await getAccessToken();
    const response = await authFetch('/auth/v1/user', {
      method: 'PUT',
      body: JSON.stringify({ password }),
    }, token);

    mergeAuthUser(response?.user || response);
    accountPage = 'main';
    acctNewPwVisible = false;
    showToast('Password akun diperbarui.');
  } catch (error) {
    console.warn(error);
    showToast('Gagal mengganti password.');
  } finally {
    authIsBusy = false;
    renderShell();
  }
}

async function confirmAccountDeletion() {
  const typed = (dom.content.querySelector('#acctDelConfirm')?.value || '').trim().toLowerCase();
  if (typed !== 'ya, saya ingin hapus akun') {
    showToast('Ketik konfirmasi dengan tepat.');
    return;
  }

  authIsBusy = true;
  renderShell();

  const leavingUid = authSession?.user?.id || '';

  // Ask the server to schedule identity deletion in 24h (best-effort).
  try {
    if (leavingUid && authSession?.access_token) {
      await fetch('/api/schedule-deletion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + authSession.access_token,
        },
        body: JSON.stringify({ userId: leavingUid }),
        cache: 'no-store',
      });
    }
  } catch (error) {
    console.warn('schedule-deletion failed:', error);
  }

  try {
    if (canSyncRemote()) {
      const clientId = encodeURIComponent(getRemoteClientId());
      await supabaseFetch(`/rest/v1/${encodeURIComponent(supabaseConfig.table)}?client_id=eq.${clientId}`, {
        method: 'DELETE',
      });
    }
  } catch (error) {
    console.warn(error);
  }

  try {
    const token = authSession?.access_token;
    if (token) await authFetch('/auth/v1/logout', { method: 'POST' }, token);
  } catch (error) {
    console.warn(error);
  }

  clearAuthSession();
  removeUserDataFor(leavingUid);
  state = createFreshState();
  activeYear = runtimeYear;
  activeView = 'dashboard';
  activeMonth = new Date().getMonth();
  ensureYear(activeYear);
  localStorage.setItem(scopedKey(STORAGE_KEY), JSON.stringify(state));
  accountDeleteOpen = false;
  accountPage = 'main';
  authIsBusy = false;
  renderShell();
  showToast('Akun dihapus. Identitas dimusnahkan otomatis dalam 24 jam.');
}

// Reset HANYA data keuangan (transaksi, budget, tabungan, riwayat laporan).
// Data kebiasaan/habit, task, goals, catatan, dan dokumen tidak disentuh.
async function resetFinanceData() {
  const typed = (document.getElementById('acctResetFinConfirm')?.value || '').trim().toLowerCase();
  if (typed !== 'reset keuangan') {
    showToast('Ketik konfirmasi dengan tepat.');
    return;
  }

  authIsBusy = true;
  renderShell();

  // 1) kosongkan data keuangan di state inti
  state.transactions = [];
  state.budgets = [];
  state.savings = [];
  state.savingsTx = [];
  if (Array.isArray(state.repHist)) state.repHist = [];

  // 2) tandai sudah pernah "terisi" agar data contoh tidak dimunculkan lagi
  state.txSeeded = true;
  state.budSeeded = true;
  state.saveSeeded = true;
  state.repHistSeeded = true;

  // 3) simpan ke perangkat + antre sinkron Supabase
  saveState();

  try {
    if (canSyncRemote()) await saveRemoteState();
  } catch (error) {
    console.warn('reset keuangan (remote):', error);
    showToast('Data perangkat dikosongkan. Sinkron Supabase gagal sementara.');
  }

  accountResetFinanceOpen = false;
  authIsBusy = false;
  renderShell();
  showToast('Data keuangan dikosongkan. Kebiasaan & data lain tetap aman.');
}

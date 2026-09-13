(() => {
  'use strict';

  const STORAGE_KEY = 'miaw-tracker.state.v1';
  const THEME_KEY = 'miaw-tracker.theme';
  const CLIENT_ID_KEY = 'miaw-tracker.client-id';
  const AUTH_SESSION_KEY = 'miaw-tracker.auth-session.v1';
  const SCHEMA_VERSION = 1;
  const REMOTE_SYNC_DEBOUNCE_MS = 150;
  const OTP_RESEND_SECONDS = 60;

  const MONTHS = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  const CATEGORY_ORDER = ['daily', 'weekly', 'specificWeekly', 'monthly'];

  const CATEGORY_CONFIG = {
    daily: {
      label: 'Kebiasaan Harian',
      shortLabel: 'Harian',
      slotUnit: 'hari',
      color: 'teal',
      description: 'Dilacak untuk setiap hari kalender dalam bulan ini.',
    },
    weekly: {
      label: 'Kebiasaan Mingguan',
      shortLabel: 'Mingguan',
      slotUnit: 'minggu',
      color: 'blue',
      description: 'Dilacak berdasarkan jumlah minggu pada bulan ini.',
    },
    specificWeekly: {
      label: 'Kebiasaan Mingguan Khusus',
      shortLabel: 'Mingguan Khusus',
      slotUnit: 'minggu',
      color: 'amber',
      description: 'Rutinitas mingguan khusus dengan logika progres mingguan yang sama.',
    },
    monthly: {
      label: 'Kebiasaan Bulanan',
      shortLabel: 'Bulanan',
      slotUnit: 'bulan',
      color: 'rose',
      description: 'Target besar yang dicentang satu kali per bulan.',
    },
  };

  const DEFAULT_HABITS = {
    daily: [
      'Minum air minimal 1.5 L',
      'Workout 45 Menit',
      'Baca Al-Quran 2 lembar',
      'Evaluasi hari ini',
      'Tidur jam 22.00 maksimal 23.00',
    ],
    weekly: [],
    specificWeekly: [],
    monthly: [],
  };

  const CATEGORY_DEFAULT_POINTS = {
    daily: 50,
    weekly: 65,
    specificWeekly: 70,
    monthly: 85,
  };

  const DEFAULT_HABIT_POINTS = {
    'Minum air minimal 1.5 L': 35,
    'Workout 45 Menit': 85,
    'Baca Al-Quran 2 lembar': 55,
    'Evaluasi hari ini': 30,
    'Tidur jam 22.00 maksimal 23.00': 75,
    'Bangun jam 4': 80,
    'Shalat Tahajud': 85,
    'Baca Al-Waqiah & Al-Mulk': 60,
    'Shalat Wajib & Rawatib & Doa': 75,
    'Shalat Dhuha': 55,
    'Minum Creatine & Susu Protein (Pagi & Sore)': 45,
    'Makan minimal 3x sehari (300 gr nasi)': 60,
    'Mandi 2x sehari pagi & sore': 35,
    'Sikat gigi setiap malam': 25,
    'Domestik 30 menit': 50,
    'Game (Sudoku 2x Easy, Geografi 100, ML 1x)': 35,
    'Belajar editing video & AI max 2 jam': 70,
    'Belajar bahasa inggris max 2 jam': 70,
    'Sadaqah subuh': 30,
    'Baca Buku 50 Halaman': 75,
    'Bangun jam 4, cuci muka dan shalat tahajud': 90,
    'Shalat wajib, rawatib dan dhuha': 80,
    'Baca Al-Quran minimal 1 halaman, Al Waqiah (subuh) dan Al Mulk (malam)': 75,
    'Pekerjaan domestik 30 menit': 50,
    'Mandi pagi dan sore, sikat gigi malam, dan bersihin muka sebelum tidur': 45,
    'Makan 3x (8, 12, 17) dan minum air 1.5 L': 65,
    'Belajar English 30 menit aja': 45,
    'Catat Pengeluaran hari ini': 35,
  };

  const HABIT_NAME_TRANSLATIONS = {
    'Drink enough water': 'Minum air yang cukup',
    'Move for 20 minutes': 'Bergerak selama 20 menit',
    'Read 10 pages': 'Membaca 10 halaman',
    'Sleep before target time': 'Tidur sebelum target waktu',
    'Journal check-in': 'Menulis jurnal singkat',
    'Mindful breathing': 'Latihan napas sadar',
    'Plan tomorrow': 'Merencanakan hari esok',
    'Tidy one space': 'Merapikan satu area',
    'Weekly review': 'Evaluasi mingguan',
    'Meal prep': 'Persiapan makanan',
    'Budget check': 'Cek anggaran',
    'Workspace reset': 'Rapikan ruang kerja',
    'Sunday reset routine': 'Rutinitas reset hari Minggu',
    'Long walk session': 'Sesi jalan kaki panjang',
    'Deep clean zone': 'Bersih-bersih area khusus',
    'Call family or friend': 'Menghubungi keluarga atau teman',
    'Pay bills': 'Membayar tagihan',
    'Health checkpoint': 'Pemeriksaan kesehatan',
    'Learning milestone': 'Target belajar bulanan',
    'Digital backup': 'Cadangan data digital',
  };

  const $ = (selector) => document.querySelector(selector);

  const dom = {
    content: $('#content'),
    monthList: $('#monthList'),
    yearSelect: $('#yearSelect'),
    pageTitle: $('#pageTitle'),
    pageSubtitle: $('#pageSubtitle'),
    sidebar: $('#sidebar'),
    overlay: $('#overlay'),
    menuBtn: $('#menuBtn'),
    themeToggle: $('#themeToggle'),
    authPanel: $('#authPanel'),
    authScreen: $('#authScreen'),
    toast: $('#toast'),
  };

  const runtimeConfig = window.MIAW_TRACKER_CONFIG || {};
  const supabaseConfig = {
    url: String(runtimeConfig.supabaseUrl || '').replace(/\/+$/, ''),
    key: String(runtimeConfig.supabaseKey || ''),
    table: String(runtimeConfig.supabaseTable || 'tracker_daily_states'),
    clientId: String(runtimeConfig.supabaseClientId || ''),
  };
  const remoteEnabled = Boolean(supabaseConfig.url && supabaseConfig.key && supabaseConfig.table);
  const runtimeYear = new Date().getFullYear();
  // Sesi dimuat lebih dulu supaya storage bisa di-scope per akun
  let authSession = loadAuthSession();

  // Semua kunci data pengguna diberi suffix id user => tiap akun punya datanya sendiri
  function scopedKey(key) {
    return authSession?.user?.id ? `${key}:${authSession.user.id}` : key;
  }

  const DATA_STORE_KEYS = ['miaw-tracker.state.v1', 'miaw-tracker.jadwal.v1', 'miaw-tracker.tasks.v1', 'miaw-tracker.goals.v1', 'proj-tracker.projects.v1', 'miaw-tracker.notes.v1'];

  // Ganti lingkup storage ke user yang baru login: reload data milik akun ini (dummy baru otomatis di-seed)
  function applyUserScope() {
    state = loadState();
    if (state.selectedView === 'kalender') { state.selectedView = 'jadwal'; }
    activeYear = Number(state.selectedYear) || runtimeYear;
    activeView = state.selectedView || 'dashboard';
    activeMonth = Number.isInteger(state.selectedMonth) ? state.selectedMonth : new Date().getMonth();
    openNavGroups = new Set(state.openNavGroups || (NAV_GROUP_OF[activeView] ? [NAV_GROUP_OF[activeView]] : []));
    mobileDailyExpanded = false;
    taskFilter = 'today';
    taskDetailId = null;
    taskAdding = false;
    taskPageAdding = false;
    taskAddOptions = false;
    taskAddDraft = taskAddDefaults();
    focusTaskId = null;
    goalsFilter = 'all';
    goalsPage = 'list';
    goalsDetailId = null;
    goalsMonthOffset = 0;
    goalsAddCat = 'Karier';
    goalsCalSel = null;
    projFilter = 'all';
    projSearch = '';
    projPage = 'list';
    projDetailId = null;
    projTab = 'overview';
    projTaskFilter = 'all';
    projMenuOpen = false;
    projFormId = null;
    projTaskAdding = false;
    jadwalMode = 'kalender';
    jadwalSelIso = taskTodayIso();
    jadwalMonthOffset = 0;
    jadwalAdding = false;
    notePage = 'list';
    noteId = null;
    noteTab = 'Semua';
    noteSearch = '';
    noteSort = 'updated';
    noteTagFilter = null;
    noteMenuId = null;
    noteDetailMenu = false;
    ensureYear(activeYear);
    saveState();
  }

  function removeUserDataFor(uid) {
    if (!uid) return;
    DATA_STORE_KEYS.forEach((k) => localStorage.removeItem(`${k}:${uid}`));
  }

  // Satu kali: data lama (kunci tanpa suffix) diadopsi oleh akun yang sedang login pertama kali,
  // supaya pemilik data lama tidak kehilangan catatan sementara akun baru tetap dapat dummy sendiri.
  function migrateLegacyStores() {
    const uid = authSession?.user?.id;
    if (!uid) return;
    DATA_STORE_KEYS.forEach((k) => {
      const legacy = localStorage.getItem(k);
      if (legacy !== null && localStorage.getItem(`${k}:${uid}`) === null) {
        localStorage.setItem(`${k}:${uid}`, legacy);
        localStorage.removeItem(k);
      }
    });
  }
  migrateLegacyStores();

  let state = loadState();
  let activeYear = Number(state.selectedYear) || runtimeYear;
  let activeView = state.selectedView || 'dashboard';
  if (activeView === 'kalender') { activeView = 'jadwal'; state.selectedView = 'jadwal'; }
  const NAV_GROUP_OF = {
    task: 'activity', jadwal: 'activity',
    habits: 'goals', goals: 'goals', progress: 'goals', project: 'goals', 'project-task': 'goals',
    catatan: 'organization', dokumen: 'organization',
    transaksi: 'keuangan', budget: 'keuangan', tabungan: 'keuangan', 'laporan-keuangan': 'keuangan',
  };
  let openNavGroups = new Set(state.openNavGroups || (NAV_GROUP_OF[activeView] ? [NAV_GROUP_OF[activeView]] : []));

  function syncNavGroups() {
    document.querySelectorAll('.nav-group').forEach((group) => {
      const key = group.dataset.group;
      const isOpen = openNavGroups.has(key);
      group.classList.toggle('open', isOpen);
      const toggle = group.querySelector('.nav-group-toggle');
      if (toggle) toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }
  let activeMonth = Number.isInteger(state.selectedMonth) ? state.selectedMonth : new Date().getMonth();
  let mobileDailyExpanded = false;
  let mobileOpenSections = new Set(['daily']);
  let toastTimer = null;
  let syncTimer = null;
  let remoteHydrated = false;
  let isApplyingRemoteState = false;
  let remoteSaveInFlight = false;
  let remoteSaveQueued = false;
  let remoteSaveRevision = 0;
  let authMode = 'login';
  let authOtpEmail = '';

  let authPendingName = '';
  let authPendingUsername = '';
  let authPendingPassword = '';
  let authOtpResendAt = 0;
  let authCooldownTimer = null;
  let authIsBusy = false;
  let authPwVisible = false;
  let authPwChecks = { len: false, upper: false, other: false };
  const PW_RULE_OK = 'Password memenuhi semua kriteria.';

  function uid(prefix = 'h') {
    return `${prefix}_${Math.random().toString(36).slice(2, 8)}_${Date.now().toString(36)}`;
  }

  function createFreshState() {
    return {
      schemaVersion: SCHEMA_VERSION,
      selectedYear: runtimeYear,
      selectedView: 'dashboard',
      selectedMonth: new Date().getMonth(),
      years: {},
    };
  }

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

  function isLoggedIn() {
    return Boolean(authSession?.access_token && authSession?.user?.id);
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[char]));
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function normalizeHabitPoints(value) {
    if (value === null || value === undefined || String(value).trim() === '') return null;
    const points = Number(value);
    if (!Number.isFinite(points)) return null;
    return Math.round(clamp(points, 1, 100));
  }

  function suggestHabitPoints(name, categoryKey) {
    if (DEFAULT_HABIT_POINTS[name]) return DEFAULT_HABIT_POINTS[name];

    const normalized = String(name || '').toLowerCase();
    const base = CATEGORY_DEFAULT_POINTS[categoryKey] || 50;
    const rules = [
      { score: 90, words: ['deep work', 'proyek besar', 'marathon', 'ujian'] },
      { score: 85, words: ['workout', 'gym', 'olahraga', 'lari', 'cardio', 'training'] },
      { score: 85, words: ['tahajud'] },
      { score: 80, words: ['bangun jam 4', 'shalat wajib', 'rawatib', 'puasa', 'deadline', 'presentasi'] },
      { score: 75, words: ['tidur', 'bangun pagi', 'no sugar', 'tanpa gula'] },
      { score: 70, words: ['belajar', 'course', 'kelas', 'menulis', 'konten', 'editing', 'ai max'] },
      { score: 60, words: ['baca buku', 'al-waqiah', 'al-mulk', 'quran', 'al-quran', 'meeting', 'review mingguan'] },
      { score: 55, words: ['dhuha'] },
      { score: 45, words: ['protein', 'creatine', 'makan', 'budget', 'bersih', 'rapikan', 'backup', 'meal prep'] },
      { score: 35, words: ['minum', 'air', 'vitamin', 'jalan'] },
      { score: 30, words: ['sadaqah', 'sedekah', 'evaluasi', 'jurnal', 'journal', 'plan', 'rencana', 'napas'] },
    ];

    const matched = rules.find((rule) => rule.words.some((word) => normalized.includes(word)));
    return matched ? matched.score : base;
  }

  function habitPoints(habit, categoryKey) {
    return normalizeHabitPoints(habit.points) || suggestHabitPoints(habit.name, categoryKey);
  }

  function roundPercent(value) {
    return Number.isFinite(value) ? value.toFixed(2) : '0.00';
  }

  function compactPercent(value) {
    return `${Math.round(Number.isFinite(value) ? value : 0)}%`;
  }

  function pointScore(value) {
    return String(Math.round(clamp(Number.isFinite(value) ? value : 0, 0, 100)));
  }

  function daysInMonth(year, monthIndex) {
    return new Date(year, monthIndex + 1, 0).getDate();
  }

  function focusedDayIndex(year, monthIndex) {
    const today = new Date();
    if (today.getFullYear() === year && today.getMonth() === monthIndex) {
      return today.getDate() - 1;
    }
    return 0;
  }

  function currentTrackingDate() {
    const today = new Date();
    return {
      year: today.getFullYear(),
      monthIndex: today.getMonth(),
    };
  }

  function weeksInMonth(year, monthIndex) {
    return Math.ceil(daysInMonth(year, monthIndex) / 7);
  }

  function slotCountFor(categoryKey, year, monthIndex) {
    if (categoryKey === 'daily') return daysInMonth(year, monthIndex);
    if (categoryKey === 'weekly' || categoryKey === 'specificWeekly') return weeksInMonth(year, monthIndex);
    return 1;
  }

  function slotLabel(categoryKey, index, year, monthIndex) {
    if (categoryKey === 'daily') return String(index + 1);
    if (categoryKey === 'weekly' || categoryKey === 'specificWeekly') {
      const firstDay = index * 7 + 1;
      const lastDay = Math.min(firstDay + 6, daysInMonth(year, monthIndex));
      return `M${index + 1}`;
    }
    return 'Selesai';
  }

  function slotTitle(categoryKey, index, year, monthIndex) {
    if (categoryKey === 'daily') return `${index + 1} ${MONTHS[monthIndex]} ${year}`;
    if (categoryKey === 'weekly' || categoryKey === 'specificWeekly') {
      const firstDay = index * 7 + 1;
      const lastDay = Math.min(firstDay + 6, daysInMonth(year, monthIndex));
      return `Minggu ${index + 1}: ${firstDay}-${lastDay} ${MONTHS[monthIndex]} ${year}`;
    }
    return `${MONTHS[monthIndex]} ${year}`;
  }

  function createHabit(name, categoryKey, year, monthIndex, points = null) {
    return {
      id: uid(categoryKey.slice(0, 2)),
      name,
      category: categoryKey,
      active: true,
      points: normalizeHabitPoints(points) || suggestHabitPoints(name, categoryKey),
      slots: Array(slotCountFor(categoryKey, year, monthIndex)).fill(false),
      createdAt: Date.now(),
    };
  }

  function createMonth(year, monthIndex) {
    const categories = {};
    CATEGORY_ORDER.forEach((categoryKey) => {
      categories[categoryKey] = DEFAULT_HABITS[categoryKey].map((name) => (
        createHabit(name, categoryKey, year, monthIndex)
      ));
    });
    return { categories };
  }

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(scopedKey(STORAGE_KEY)));
      if (parsed && parsed.schemaVersion === SCHEMA_VERSION && parsed.years) {
        return parsed;
      }
    } catch {
      // Fall back to a fresh state below.
    }

    return createFreshState();
  }

  function saveState() {
    state.selectedYear = activeYear;
    state.selectedView = activeView;
    state.selectedMonth = activeMonth;
    state.openNavGroups = [...openNavGroups];
    localStorage.setItem(scopedKey(STORAGE_KEY), JSON.stringify(state));
    queueRemoteSave();
  }

  function cloneStateSnapshot() {
    if (typeof structuredClone === 'function') return structuredClone(state);
    return JSON.parse(JSON.stringify(state));
  }

  function isValidRemoteState(value) {
    return Boolean(
      value
      && typeof value === 'object'
      && value.schemaVersion === SCHEMA_VERSION
      && value.years
      && typeof value.years === 'object',
    );
  }

  function hasYearData(value) {
    return Boolean(value?.years && Object.keys(value.years).length);
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
  }

  function otpRemainingSeconds() {
    return Math.max(0, Math.ceil((authOtpResendAt - Date.now()) / 1000));
  }

  /* --- OAuth Google (PKCE flow, tanpa OTP) --- */
  const OAUTH_VERIFIER_KEY = 'miaw-tracker.oauth-verifier.v1';

  function noteRandomB64url(len) {
    const bytes = new Uint8Array(len);
    crypto.getRandomValues(bytes);
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

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
      if (isValidRemoteState(remoteState) && (hasYearData(remoteState) || !hasYearData(state))) {
        isApplyingRemoteState = true;
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
      console.warn(error);
      showToast('Mode lokal aktif. Sinkron Supabase belum tersedia.');
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

    const payload = {
      client_id: getRemoteClientId(),
      user_id: authSession.user.id,
      state: snapshot,
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

  function ensureYear(year) {
    const key = String(year);
    if (!state.years[key]) state.years[key] = { months: {} };

    for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
      ensureMonth(year, monthIndex);
    }

    return state.years[key];
  }

  function ensureMonth(year, monthIndex) {
    const yearKey = String(year);
    if (!state.years[yearKey]) state.years[yearKey] = { months: {} };
    const yearData = state.years[yearKey];
    const monthKey = String(monthIndex);

    if (!yearData.months[monthKey]) {
      yearData.months[monthKey] = createMonth(year, monthIndex);
    }

    normalizeMonth(yearData.months[monthKey], year, monthIndex);
    return yearData.months[monthKey];
  }

  function normalizeMonth(monthData, year, monthIndex) {
    if (!monthData.categories) monthData.categories = {};

    CATEGORY_ORDER.forEach((categoryKey) => {
      if (!Array.isArray(monthData.categories[categoryKey])) {
        monthData.categories[categoryKey] = [];
      }

      const expectedSlots = slotCountFor(categoryKey, year, monthIndex);
      monthData.categories[categoryKey].forEach((habit) => {
        if (!habit.id) habit.id = uid(categoryKey.slice(0, 2));
        if (!habit.category) habit.category = categoryKey;
        if (typeof habit.active !== 'boolean') habit.active = true;
        if (HABIT_NAME_TRANSLATIONS[habit.name]) habit.name = HABIT_NAME_TRANSLATIONS[habit.name];
        habit.points = normalizeHabitPoints(habit.points) || suggestHabitPoints(habit.name, categoryKey);
        if (!Array.isArray(habit.slots)) habit.slots = [];
        habit.slots = Array.from({ length: expectedSlots }, (_, index) => Boolean(habit.slots[index]));
      });
    });
  }

  function getAllHabits(monthData, includeInactive = false) {
    return CATEGORY_ORDER.flatMap((categoryKey) => (
      monthData.categories[categoryKey]
        .filter((habit) => includeInactive || habit.active)
        .map((habit) => ({ ...habit, categoryKey }))
    ));
  }

  function calculateHabitProgress(habit, categoryKey, year, monthIndex) {
    const totalSlots = slotCountFor(categoryKey, year, monthIndex);
    const checkedSlots = habit.slots.slice(0, totalSlots).filter(Boolean).length;
    const points = habitPoints(habit, categoryKey);
    const earnedPoints = checkedSlots * points;
    const possiblePoints = totalSlots * points;
    const progress = totalSlots === 0 ? 0 : (checkedSlots / totalSlots) * 100;

    return {
      points,
      earnedPoints,
      possiblePoints,
      checkedSlots,
      totalSlots,
      progress,
    };
  }

  function calculateDailyRates(monthData, year, monthIndex) {
    const dayCount = daysInMonth(year, monthIndex);
    const activeDailyHabits = monthData.categories.daily.filter((habit) => habit.active);

    return Array.from({ length: dayCount }, (_, dayIndex) => {
      const checked = activeDailyHabits.filter((habit) => Boolean(habit.slots[dayIndex])).length;
      const earnedPoints = activeDailyHabits.reduce((sum, habit) => (
        sum + (habit.slots[dayIndex] ? habitPoints(habit, 'daily') : 0)
      ), 0);
      const possiblePoints = activeDailyHabits.reduce((sum, habit) => (
        sum + habitPoints(habit, 'daily')
      ), 0);
      return {
        checked,
        total: activeDailyHabits.length,
        earnedPoints,
        possiblePoints,
        progress: possiblePoints === 0 ? 0 : (earnedPoints / possiblePoints) * 100,
      };
    });
  }

  function dailyPointSummary(dailyRates, year, monthIndex) {
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === monthIndex;
    const dayIndex = isCurrentMonth ? today.getDate() - 1 : focusedDayIndex(year, monthIndex);
    const day = dailyRates[dayIndex] || {
      checked: 0,
      total: 0,
      earnedPoints: 0,
      possiblePoints: 0,
      progress: 0,
    };

    return {
      ...day,
      dayIndex,
      isCurrentMonth,
      label: isCurrentMonth ? 'Poin Hari Ini' : 'Poin Tanggal Fokus',
      dateText: `${dayIndex + 1} ${MONTHS[monthIndex]} ${year}`,
    };
  }

  function calculateMonthStats(year, monthIndex) {
    const monthData = ensureMonth(year, monthIndex);
    const habits = getAllHabits(monthData);
    const rows = habits.map((habit) => {
      const progressData = calculateHabitProgress(habit, habit.categoryKey, year, monthIndex);
      return { ...habit, ...progressData };
    });

    const totalHabits = rows.length;
    const earnedPoints = rows.reduce((sum, row) => sum + row.earnedPoints, 0);
    const possiblePoints = rows.reduce((sum, row) => sum + row.possiblePoints, 0);
    const average = possiblePoints === 0
      ? 0
      : (earnedPoints / possiblePoints) * 100;

    const checkedSlots = rows.reduce((sum, row) => sum + row.checkedSlots, 0);
    const totalSlots = rows.reduce((sum, row) => sum + row.totalSlots, 0);
    const activeDailyHabits = monthData.categories.daily.filter((habit) => habit.active).length;

    return {
      monthIndex,
      monthName: MONTHS[monthIndex],
      totalHabits,
      average,
      earnedPoints,
      possiblePoints,
      checkedSlots,
      totalSlots,
      activeDailyHabits,
      rows,
    };
  }

  function calculateYearStats(year) {
    ensureYear(year);
    const months = MONTHS.map((_, monthIndex) => calculateMonthStats(year, monthIndex));
    const yearAverage = months.length === 0
      ? 0
      : months.reduce((sum, month) => sum + month.average, 0) / months.length;
    const bestMonth = months.reduce((best, month) => (
      !best || month.average > best.average ? month : best
    ), null);
    const totalHabits = months.reduce((sum, month) => sum + month.totalHabits, 0);
    const checkedSlots = months.reduce((sum, month) => sum + month.checkedSlots, 0);
    const totalSlots = months.reduce((sum, month) => sum + month.totalSlots, 0);
    const earnedPoints = months.reduce((sum, month) => sum + month.earnedPoints, 0);
    const possiblePoints = months.reduce((sum, month) => sum + month.possiblePoints, 0);

    return {
      months,
      yearAverage,
      bestMonth,
      totalHabits,
      earnedPoints,
      possiblePoints,
      checkedSlots,
      totalSlots,
    };
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    dom.toast.textContent = message;
    dom.toast.classList.add('show');
    toastTimer = setTimeout(() => dom.toast.classList.remove('show'), 2200);
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }

  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) {
      applyTheme(saved);
      return;
    }

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
  }

  function buildYearOptions() {
    const knownYears = Object.keys(state.years).map(Number).filter(Number.isFinite);
    const years = new Set([
      runtimeYear - 1,
      runtimeYear,
      runtimeYear + 1,
      runtimeYear + 2,
      activeYear,
      ...knownYears,
    ]);

    return Array.from(years).sort((a, b) => a - b);
  }

  function renderYearOptions() {
    dom.yearSelect.innerHTML = buildYearOptions()
      .map((year) => `<option value="${year}" ${year === activeYear ? 'selected' : ''}>${year}</option>`)
      .join('');
  }

  function renderMonthList() {
    dom.monthList.innerHTML = MONTHS.map((month, monthIndex) => {
      const stats = calculateMonthStats(activeYear, monthIndex);
      const activeClass = activeView === 'month' && activeMonth === monthIndex ? 'active' : '';

      return `
        <button class="month-link ${activeClass}" type="button" data-month="${monthIndex}">
          <span>${month}</span>
          <strong>${compactPercent(stats.average)}</strong>
        </button>
      `;
    }).join('');
  }

  function canonicalUsername(raw) {
    return String(raw || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9._-]+/g, '')
      .replace(/^[._-]+|[._-]+$/g, '')
      .slice(0, 29);
  }

  function evaluatePassword(pw) {
    return {
      len: pw.length >= 8,
      upper: /[A-Z]/.test(pw),
      other: /[0-9!@#$%^&*()_+\-=\[\]{};:'",.<>/?\\|`~]/.test(pw),
    };
  }

  function allPwChecksPass(checks) {
    return checks.len && checks.upper && checks.other;
  }

  const PW_RULE_LABELS = {
    len: 'Minimal 8 karakter',
    upper: 'Minimal 1 huruf besar (A-Z)',
    other: 'Minimal 1 angka / karakter non-huruf',
  };

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

  function renderAuthScreen() {
    if (!dom.authScreen) return;

    document.body.classList.add('auth-required');

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

  /* ============ MODUL JADWAL (kalender + agenda harian) ============ */
  const JADWAL_STORE_KEY = 'miaw-tracker.jadwal.v1';
  const JADWAL_COLORS = {
    kantor: '#35a7b0', sales: '#efc343', marketing: '#9c5fd1', konten: '#d96a6a',
    keuangan: '#4c9f70', pribadi: '#e8a33d', belajar: '#8b6f47',
  };
  let jadwalMode = 'kalender';           // 'kalender' | 'daftar'
  let jadwalSelIso = taskTodayIso();
  let jadwalMonthOffset = 0;             // offset bulan dari bulan ini
  let jadwalAdding = false;

  function jadwalCatColor(cat) {
    return JADWAL_COLORS[String(cat || '').toLowerCase()] || '#a9885f';
  }

  function loadJadwalEvents() {
    try {
      const raw = JSON.parse(localStorage.getItem(scopedKey(JADWAL_STORE_KEY)) || 'null');
      if (Array.isArray(raw)) return raw;
    } catch { /* seed ulang */ }
    const seed = [
      { id: 'j1', date: '2026-09-07', time: '19:30', title: 'Live shopping', category: 'Konten', kind: 'event' },
      { id: 'j2', date: '2026-09-10', time: '09:00', title: 'Meeting tim', category: 'Kantor', kind: 'event' },
      { id: 'j3', date: '2026-09-10', time: '11:00', title: 'Follow up pelanggan', category: 'Sales', kind: 'event' },
      { id: 'j4', date: '2026-09-10', time: '19:00', title: 'Upload konten', category: 'Konten', kind: 'event' },
      { id: 'j5', date: '2026-09-11', time: '08:00', title: 'Setoran harian', category: 'Keuangan', kind: 'event' },
      { id: 'j6', date: '2026-09-11', time: '16:00', title: 'Rapat vendor', category: 'Pribadi', kind: 'event' },
      { id: 'j7', date: '2026-09-16', time: '13:00', title: 'Kelas desain', category: 'Belajar', kind: 'event' },
      { id: 'j8', date: '2026-09-25', time: '10:00', title: 'Kumpul keluarga', category: 'Pribadi', kind: 'event' },
      { id: 'j9', date: '2026-09-27', time: '09:00', title: 'Bayar pajak', category: 'Keuangan', kind: 'event' },
    ];
    try { localStorage.setItem(scopedKey(JADWAL_STORE_KEY), JSON.stringify(seed)); } catch { /* ignore */ }
    return seed;
  }

  function saveJadwalEvents(list) {
    try { localStorage.setItem(scopedKey(JADWAL_STORE_KEY), JSON.stringify(list)); } catch { /* ignore */ }
  }

  function jadwalItems(iso) {
    const items = loadJadwalEvents()
      .filter((e) => e.date === iso)
      .map((e) => ({ time: e.time || '', title: e.title, sub: e.category || '', color: jadwalCatColor(e.category), kind: e.kind === 'task' ? 'task' : 'event', done: false }));
    loadTasks().forEach((t) => {
      if (t.date === iso) items.push({ time: t.time || '', title: t.title, sub: [t.project, t.tag].filter(Boolean).join(' · ') || 'Task', color: jadwalCatColor(t.tag || t.project), kind: 'task', done: !!t.done });
    });
    items.sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
    return items;
  }

  function jadwalMonthGrid() {
    const now = new Date();
    const view = new Date(now.getFullYear(), now.getMonth() + jadwalMonthOffset, 1);
    const y = view.getFullYear();
    const m = view.getMonth();
    const days = new Date(y, m + 1, 0).getDate();
    const firstDow = (new Date(y, m, 1).getDay() + 6) % 7; // Senin = 0
    const cells = [];
    for (let i = 0; i < firstDow; i += 1) cells.push(null);
    for (let d = 1; d <= days; d += 1) cells.push(`${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    return { y, m, cells };
  }

  function jadwalDayTitle(iso) {
    const d = new Date(`${iso}T00:00:00`);
    return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  function jadwalRowHtml(it) {
    const dot = it.kind === 'task'
      ? `<span class="jadwal-dot ring" style="--jc:${it.color}"></span>`
      : `<span class="jadwal-dot" style="background:${it.color}"></span>`;
    return `<div class="jadwal-row${it.done ? ' done' : ''}">
        <span class="jadwal-time">${escapeHtml(it.time || '—')}</span>
        ${dot}
        <span class="jadwal-info"><span class="jadwal-title">${escapeHtml(it.title)}</span><span class="jadwal-sub">${escapeHtml(it.sub)}</span></span>
        <span class="jadwal-chev">›</span>
      </div>`;
  }

  function renderJadwalView() {
    const { y, m, cells } = jadwalMonthGrid();
    const monthLabel = `${MONTHS[m]} ${y}`;
    const seg = `<div class="jadwal-seg" role="tablist">
        <button type="button" class="jadwal-seg-btn${jadwalMode === 'kalender' ? ' active' : ''}" data-jadwal-mode="kalender">Kalender</button>
        <button type="button" class="jadwal-seg-btn${jadwalMode === 'daftar' ? ' active' : ''}" data-jadwal-mode="daftar">Daftar</button>
      </div>`;

    const addForm = jadwalAdding ? `
      <form class="jadwal-add-card" id="jadwalAddForm">
        <div class="jadwal-add-head"><span>Tambah Jadwal</span><button type="button" class="task-add-x" data-jadwal-cancel aria-label="Batal">×</button></div>
        <input name="title" type="text" maxlength="80" placeholder="Judul jadwal…" autocomplete="off" required />
        <div class="jadwal-add-grid">
          <label><span>Tanggal</span><input name="date" type="date" value="${escapeHtml(jadwalSelIso)}" /></label>
          <label><span>Jam</span><input name="time" type="time" value="09:00" /></label>
          <label><span>Kategori</span><input name="category" type="text" maxlength="24" placeholder="Kantor" autocomplete="off" list="jadwalCats" /></label>
          <label><span>Tipe</span><select name="kind"><option value="event">Event</option><option value="task">Task</option></select></label>
        </div>
        <datalist id="jadwalCats">${Object.keys(JADWAL_COLORS).map((c) => `<option value="${c}"></option>`).join('')}</datalist>
        <button class="primary-button jadwal-add-save" type="submit">Simpan</button>
      </form>` : '';

    let body = '';
    if (jadwalMode === 'kalender') {
      const week = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
      const grid = cells.map((iso) => {
        if (!iso) return '<span class="jadwal-cell empty"></span>';
        const items = jadwalItems(iso);
        const dots = items.slice(0, 3).map((it) => (it.kind === 'task'
          ? `<span class="jadwal-mdot ring" style="--jc:${it.color}"></span>`
          : `<span class="jadwal-mdot" style="background:${it.color}"></span>`)).join('');
        const sel = iso === jadwalSelIso ? ' sel' : '';
        const today = iso === taskTodayIso() ? ' today' : '';
        return `<button type="button" class="jadwal-cell${sel}${today}" data-jadwal-day="${iso}"><span>${Number(iso.slice(8))}</span><span class="jadwal-mdots">${dots}</span></button>`;
      }).join('');
      body = `
        <div class="jadwal-card">
          <div class="jadwal-month-head">
            <span class="jadwal-month-label">${monthLabel}</span>
            <span class="jadwal-month-nav">
              <button type="button" class="jadwal-navbtn" data-jadwal-prev aria-label="Bulan sebelumnya">‹</button>
              <button type="button" class="jadwal-navbtn" data-jadwal-next aria-label="Bulan berikutnya">›</button>
            </span>
          </div>
          <div class="jadwal-week">${week.map((w) => `<span>${w}</span>`).join('')}</div>
          <div class="jadwal-grid">${grid}</div>
        </div>
        <h3 class="jadwal-day-title">${jadwalDayTitle(jadwalSelIso)}</h3>
        <div class="jadwal-card jadwal-list">
          ${jadwalItems(jadwalSelIso).length ? jadwalItems(jadwalSelIso).map(jadwalRowHtml).join('') : '<p class="task-empty">Tidak ada jadwal pada hari ini.</p>'}
        </div>`;
    } else {
      const today = taskTodayIso();
      const isoSet = new Set();
      loadJadwalEvents().forEach((e) => { if (e.date >= today) isoSet.add(e.date); });
      loadTasks().forEach((t) => { if (t.date && t.date >= today) isoSet.add(t.date); });
      const isos = [...isoSet].sort();
      body = `<div class="jadwal-card jadwal-list">
          ${isos.length ? isos.map((iso) => `
            <div class="jadwal-group">${jadwalDayTitle(iso)}</div>
            ${jadwalItems(iso).map(jadwalRowHtml).join('')}`).join('') : '<p class="task-empty">Belum ada jadwal mendatang.</p>'}
        </div>`;
    }

    return `<div class="jadwal-page">
        ${seg}
        ${addForm}
        ${body}
        <button class="task-fab" type="button" data-jadwal-add aria-label="Tambah jadwal baru">+</button>
      </div>`;
  }

  function handleJadwalAction(btn) {
    if (btn.matches('[data-jadwal-mode]')) {
      jadwalMode = btn.dataset.jadwalMode;
      renderShell();
      return true;
    }
    if (btn.matches('[data-jadwal-prev]')) { jadwalMonthOffset -= 1; renderShell(); return true; }
    if (btn.matches('[data-jadwal-next]')) { jadwalMonthOffset += 1; renderShell(); return true; }
    if (btn.matches('[data-jadwal-day]')) {
      jadwalSelIso = btn.dataset.jadwalDay;
      renderShell();
      return true;
    }
    if (btn.matches('[data-jadwal-add]')) { jadwalAdding = true; renderShell(); setTimeout(() => document.querySelector('#jadwalAddForm [name=title]')?.focus(), 30); return true; }
    if (btn.matches('[data-jadwal-cancel]')) { jadwalAdding = false; renderShell(); return true; }
    return false;
  }

  function renderShell() {
    if (!isLoggedIn()) {
      dom.content.innerHTML = '';
      dom.pageTitle.textContent = 'Masuk';
      dom.pageSubtitle.textContent = 'Login diperlukan untuk membuka tracker';
      renderAuthPanel();
      renderAuthScreen();
      return;
    }

    document.body.classList.remove('auth-required');
    if (dom.authScreen) dom.authScreen.innerHTML = '';

    if (activeView === 'habits') {
      const current = currentTrackingDate();
      activeYear = current.year;
      activeMonth = current.monthIndex;
      ensureYear(activeYear);
    }

    renderYearOptions();
    renderMonthList();
    renderAuthPanel();

    document.querySelectorAll('[data-view]').forEach((button) => {
      button.classList.toggle('active', activeView === button.dataset.view);
    });
    syncNavGroups();
    const taskSearch = document.getElementById('taskSearchWrap');
    if (taskSearch) taskSearch.hidden = activeView !== 'task';

    if (activeView === 'dashboard') {
      dom.pageTitle.textContent = 'Dashboard';
      dom.pageSubtitle.textContent = `Ringkasan kebiasaan sepanjang ${activeYear}`;
      dom.content.innerHTML = renderDashboard(activeYear);
      return;
    }

    if (activeView === 'habits') {
      const current = currentTrackingDate();
      activeYear = current.year;
      activeMonth = current.monthIndex;
      ensureYear(activeYear);
      dom.pageTitle.textContent = 'Kebiasaan';
      dom.pageSubtitle.textContent = `${MONTHS[activeMonth]} ${activeYear} berjalan`;
      dom.content.innerHTML = renderHabitsTab(activeYear, activeMonth);
      return;
    }

    if (activeView === 'account') {
      dom.pageTitle.textContent = 'Akun';
      dom.pageSubtitle.textContent = 'Pengaturan profil dan keamanan';
      dom.content.innerHTML = renderAccountTab();
      return;
    }

    if (activeView === 'task') {
      dom.pageTitle.textContent = 'Daily Task';
      dom.pageSubtitle.textContent = 'Daftar tugas harian';
      dom.content.innerHTML = renderTaskView();
      if (taskAdding) {
        const q = dom.content.querySelector('#taskQuickInput');
        if (q) q.focus();
      }
      if (focusTaskId) setTimeout(tickFocusDisplay, 0);
      mountTaskSearch();
      return;
    }

    if (activeView === 'jadwal') {
      dom.pageTitle.textContent = 'Jadwal';
      dom.pageSubtitle.textContent = 'Rencana waktu harian & mingguan';
      dom.content.innerHTML = renderJadwalView();
      return;
    }

    if (activeView === 'progress') {
      dom.pageTitle.textContent = 'Progress';
      dom.pageSubtitle.textContent = 'Statistik kebiasaan, task & goals';
      dom.content.innerHTML = renderProgressView();
      return;
    }

    if (activeView === 'project') {
      dom.pageTitle.textContent = 'Project';
      dom.pageSubtitle.textContent = 'Proyek & target besar';
      dom.content.innerHTML = renderProjectView();
      return;
    }

    if (activeView === 'project-task') {
      dom.pageTitle.textContent = 'Project Task';
      dom.pageSubtitle.textContent = 'Task yang terhubung ke tiap project';
      dom.content.innerHTML = renderProjectTaskView();
      return;
    }

    if (activeView === 'goals') {
      dom.pageTitle.textContent = 'Goals';
      dom.pageSubtitle.textContent = 'Target jangka pendek & panjang';
      dom.content.innerHTML = renderGoalsView();
      return;
    }

    if (activeView === 'catatan') {
      dom.pageTitle.textContent = 'Catatan';
      dom.pageSubtitle.textContent = 'Simpan ide, pengetahuan, dan hal penting dalam satu tempat.';
      dom.content.innerHTML = renderNotesView();
      return;
    }

    if (activeView === 'dokumen') {
      ensureDocStore();
      dom.pageTitle.textContent = 'Dokumen';
      dom.pageSubtitle.textContent = 'Berkas & tautan penting dalam satu hub.';
      dom.content.innerHTML = renderDocsView();
      return;
    }

    if (activeView === 'transaksi') {
      ensureTxStore();
      dom.pageTitle.textContent = 'Transaksi';
      dom.pageSubtitle.textContent = 'Catat uang masuk & keluar, lihat pola lewat kalender PnL.';
      dom.content.innerHTML = renderTxView();
      return;
    }

    if (activeView === 'budget') {
      ensureBudStore();
      dom.pageTitle.textContent = 'Budget';
      dom.pageSubtitle.textContent = 'Anggaran per kategori, dihitung otomatis dari transaksi kas.';
      dom.content.innerHTML = renderBudgetView();
      return;
    }

    if (activeView === 'tabungan') {
      ensureSaveStore();
      dom.pageTitle.textContent = 'Tabungan';
      dom.pageSubtitle.textContent = 'Target tabungan dengan setoran, progress, dan deadline.';
      dom.content.innerHTML = renderSavingsView();
      return;
    }

    if (activeView === 'laporan-keuangan') {
      ensureTxStore();
      ensureBudStore();
      ensureSaveStore();
      dom.pageTitle.textContent = 'Laporan Keuangan';
      dom.pageSubtitle.textContent = 'Rekap kas, budget, dan tabungan dalam satu laporan.';
      dom.content.innerHTML = renderReportView();
      return;
    }

    if (activeView === 'miawai') {
      dom.pageTitle.textContent = 'MiawAI';
      dom.pageSubtitle.textContent = 'Asisten AI untuk website, Habit & Goals';
      dom.content.innerHTML = renderMiawAIView();
      return;
    }

    if (PLACEHOLDER_VIEWS[activeView]) {
      dom.pageTitle.textContent = PLACEHOLDER_VIEWS[activeView].title;
      dom.pageSubtitle.textContent = PLACEHOLDER_VIEWS[activeView].subtitle;
      dom.content.innerHTML = renderPlaceholderView(activeView);
      return;
    }

    dom.pageTitle.textContent = `${MONTHS[activeMonth]} ${activeYear}`;
    dom.pageSubtitle.textContent = 'Lembar pelacak bulanan dan analitik';
    dom.content.innerHTML = renderMonth(activeYear, activeMonth);
  }

  const PLACEHOLDER_VIEWS = {
    jadwal: { title: 'Jadwal', subtitle: 'Rencana waktu harian & mingguan', emoji: '🗓️', hint: 'Atur agenda dan rutinitas harianmu.' },
    goals: { title: 'Goals', subtitle: 'Target jangka pendek & panjang', emoji: '🎯', hint: 'Pasang target besar dan pecah jadi kebiasaan kecil.' },
    progress: { title: 'Progress', subtitle: 'Grafik perkembangan dirimu', emoji: '📈', hint: 'Pantau konsistensi dan pertumbuhan dari waktu ke waktu.' },
    project: { title: 'Project', subtitle: 'Proyek & target besar', emoji: '🧩', hint: 'Kelompokkan task dan catatan ke dalam proyek.' },
    catatan: { title: 'Catatan', subtitle: 'Ide, journal, dan memo cepat', emoji: '📝', hint: 'Tangkap pikiran sebelum hilang.' },
    transaksi: { title: 'Transaksi', subtitle: 'Pemasukan & pengeluaran harian', emoji: '💸', hint: 'Catat uang masuk dan keluar dengan cepat.' },
    budget: { title: 'Budget', subtitle: 'Rencana belanja bulanan', emoji: '🧾', hint: 'Bagi budget per pos belanja.' },
    tabungan: { title: 'Tabungan', subtitle: 'Target tabungan & dana darurat', emoji: '🪙', hint: 'Kejar target tabungan setahap demi setahap.' },
    'laporan-keuangan': { title: 'Laporan Keuangan', subtitle: 'Ringkasan kondisi finansial', emoji: '📊', hint: 'Rekap bulanan kas, budget, dan tabungan.' },
    reports: { title: 'Laporan', subtitle: 'Laporan lintas aktivitas & kebiasaan', emoji: '📑', hint: 'Analitik gabungan dari seluruh modul tracker.' },
    miawai: { title: 'MiawAI', subtitle: 'Asisten cerdas produktivitas', emoji: '🤖', hint: 'Minta saran, ringkasan, dan rencana dari data tracker-mu.' },
  };

  /* ============ MODUL TASK (daftar tugas personal) ============ */
  const TASK_STORE_KEY = 'miaw-tracker.tasks.v1';
  const TASK_FILTERS = [
    { key: 'today', label: 'Hari Ini' },
    { key: 'upcoming', label: 'Mendatang' },
    { key: 'inbox', label: 'Inbox' },
    { key: 'all', label: 'Semua' },
  ];
  let taskFilter = 'today';
  let taskAdding = false;
  let taskDetailId = null;
  let taskEditing = false;
  let taskPageAdding = false;
  let taskAddOptions = false;
  const taskAddDefaults = () => ({ title: '', date: taskTodayIso(), time: '19:00', priority: 'high', project: firstProjName(), category: 'Marketing', notes: '', memo: '', deadline: '', reminder: '', tag: '', recurring: '', estimate: '', checklist: [], attachments: [] });
  let taskAddDraft = taskAddDefaults();
  let focusTaskId = null;
  let focusInterval = null;

  function taskSeed() {
    const today = taskTodayIso();
    const later = taskDateOffset(1);
    return [
      { id: 't1', title: 'Buat landing page', project: 'Marketing Batu Bata', tag: '', time: '19:00', priority: 'high', date: today, done: false,
        notes: 'Bangun landing page satu halaman yang sederhana dan cepat untuk menarik pembeli batu bata dari Google dan Facebook.',
        memo: 'Pakai template satu kolom. CTA utama: tombol WhatsApp. Target publish sebelum akhir pekan.',
        estimate: 120,
        actual: 75,
        checklist: [
          { id: 'c1', text: 'Riset kompetitor', done: true },
          { id: 'c2', text: 'Buat struktur landing page', done: true },
          { id: 'c3', text: 'Tulis copywriting', done: true },
          { id: 'c4', text: 'Publish', done: false },
        ],
        attachments: ['landing-wireframe.png', 'copy-v1.docx'],
        activity: [
          { text: 'Checklist "Tulis copywriting" selesai', at: Date.now() - 40 * 60000 },
          { text: 'Sesi fokus 45 mnt selesai', at: Date.now() - 55 * 60000 },
          { text: 'Task dibuat', at: Date.now() - 26 * 3600000 },
        ] },
      { id: 't2', title: 'Follow up pelanggan', project: 'Marketing Batu Bata', tag: '', time: '20:00', priority: 'high', date: today, done: false },
      { id: 't3', title: 'Laporan keuangan', project: 'Otomasi Laporan Bulanan', tag: '', time: '21:00', priority: 'med', date: today, done: false },
      { id: 't4', title: 'Edit video promosi', project: 'Marketing Batu Bata', tag: '', time: '22:00', priority: 'low', date: today, done: false },
      { id: 't5', title: 'Riset keyword', project: 'Website Toko Online', tag: '', time: '10:30', priority: 'med', date: today, done: true },
      { id: 't6', title: 'Cek stok bahan', project: 'Marketing Batu Bata', tag: '', time: '14:00', priority: 'low', date: today, done: true },
      { id: 't7', title: 'Susun konten minggu depan', project: 'Marketing Batu Bata', tag: '', time: '', priority: 'med', date: later, done: false },
    ];
  }

  function taskTodayIso() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function taskDateOffset(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function loadTasks() {
    if (!state.tasks || !Array.isArray(state.tasks)) {
      state.tasks = taskSeed();
    }
    // lengkapi field demo yang belum ada pada task lama (id cocok dengan seed)
    const seedById = new Map(taskSeed().map((s) => [s.id, s]));
    state.tasks.forEach((t) => {
      const s = seedById.get(t.id);
      if (!s) return;
      ['notes', 'memo', 'estimate', 'actual', 'checklist', 'attachments', 'activity'].forEach((k) => {
        if (t[k] === undefined && s[k] !== undefined) t[k] = s[k];
      });
    });
    return state.tasks;
  }

  function saveTasks() {
    saveState();
    if (typeof scheduleCloudSync === 'function') scheduleCloudSync();
  }

  function taskMatchKey(t, key, todayIso) {
    if (key === 'all') return true;
    if (key === 'today') return t.date === todayIso;
    if (key === 'upcoming') return t.date > todayIso;
    return t.date > todayIso || !t.date; // inbox = mendatang + tanpa tanggal
  }

  function taskMatchFilter(t, todayIso) {
    return taskMatchKey(t, taskFilter, todayIso);
  }

  function taskDeadlineLabel(t) {
    const iso = t.deadlineDate || t.date;
    if (!iso) return '';
    const d = new Date(`${iso}T00:00:00`);
    const label = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    return t.time ? `${label}&nbsp;·&nbsp;${escapeHtml(t.time)}` : label;
  }

  function taskMinutesLabel(mins) {
    const m = Math.max(0, Math.round(mins || 0));
    const h = Math.floor(m / 60);
    return h ? `${h} jam ${m % 60 ? `${m % 60} mnt` : ''}`.trim() : `${m} mnt`;
  }

  function taskRelTime(ts) {
    const diff = Date.now() - ts;
    const m = Math.round(diff / 60000);
    if (m < 1) return 'baru saja';
    if (m < 60) return `${m} mnt lalu`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h} jam lalu`;
    return `${Math.round(h / 24)} hari lalu`;
  }

  function taskFocusElapsedMin(t) {
    return t && t.focusAt ? focusElapsedMs(t) / 60000 : 0;
  }

  function focusElapsedMs(t) {
    if (!t || !t.focusAt) return 0;
    let ms = Date.now() - t.focusAt - (t.focusPauseAccum || 0);
    if (t.focusPausedSince) ms -= Date.now() - t.focusPausedSince;
    return Math.max(0, ms);
  }

  function focusSecondsLabel(ms) {
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const mm = `${m}`.padStart(2, '0');
    const ss = `${s}`.padStart(2, '0');
    return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  }

  function logTaskActivity(t, text) {
    if (!Array.isArray(t.activity)) t.activity = [];
    t.activity.push({ at: Date.now(), text });
    if (t.activity.length > 30) t.activity = t.activity.slice(-30);
  }

  function focusTask() {
    return focusTaskId ? loadTasks().find((x) => x.id === focusTaskId) : null;
  }

  function startFocus() {
    if (focusTaskId) return;
    const t = loadTasks().find((x) => x.id === taskDetailId);
    if (!t) return;
    t.actual = (t.actual || 0) + taskFocusElapsedMin(t);
    t.focusAt = Date.now();
    t.focusPausedSince = null;
    t.focusPauseAccum = 0;
    logTaskActivity(t, 'Sesi fokus dimulai.');
    saveTasks();
    focusTaskId = t.id;
    if (!focusInterval) focusInterval = setInterval(tickFocusDisplay, 1000);
  }

  function pauseFocus() {
    const t = focusTask();
    if (!t || !t.focusAt || t.focusPausedSince) return;
    t.focusPausedSince = Date.now();
    logTaskActivity(t, 'Fokus dijeda.');
    saveTasks();
  }

  function resumeFocus() {
    const t = focusTask();
    if (!t || !t.focusPausedSince) return;
    t.focusPauseAccum = (t.focusPauseAccum || 0) + (Date.now() - t.focusPausedSince);
    t.focusPausedSince = null;
    logTaskActivity(t, 'Fokus dilanjutkan.');
    saveTasks();
  }

  function stopFocus() {
    const t = focusTask();
    if (t) {
      t.actual = (t.actual || 0) + taskFocusElapsedMin(t);
      t.focusAt = null;
      t.focusPausedSince = null;
      t.focusPauseAccum = 0;
      logTaskActivity(t, 'Sesi fokus dihentikan.');
      saveTasks();
    }
    focusTaskId = null;
    if (focusInterval) { clearInterval(focusInterval); focusInterval = null; }
  }

  function tickFocusDisplay() {
    const t = focusTask();
    if (!t || !t.focusAt) return;
    const ms = focusElapsedMs(t);
    const running = !t.focusPausedSince;
    const txt = focusSecondsLabel(ms);
    document.querySelectorAll('[data-focus-live]').forEach((el) => { el.textContent = txt; });
    const pauseBtn = document.querySelector('[data-task-focus-pause]');
    if (pauseBtn) pauseBtn.textContent = t.focusPausedSince ? 'Lanjut' : 'Jeda';
    const line = document.querySelector('.task-focus-state');
    if (line) line.textContent = running ? 'Sesi fokus berjalan' : 'Fokus dijeda';
  }

  function renderTaskDetail() {
    const t = loadTasks().find((x) => x.id === taskDetailId);
    if (!t) return '';
    const prio = { high: ['Prioritas Tinggi', 'high'], med: ['Prioritas Sedang', 'med'], low: ['Prioritas Rendah', 'low'] }[t.priority || 'low'];
    const status = t.done ? ['Selesai', 'done'] : ['In Progres', 'prog'];
    const projLabel = [t.project, t.tag].filter(Boolean).join(' ');
    const deadline = taskDeadlineLabel(t);
    const desc = t.notes ? `<p class="task-detail-desc">${escapeHtml(t.notes)}</p>` : '';

    if (taskEditing) {
      return `
    <section class="task-page task-detail">
      <div class="task-detail-top">
        <button class="icon-button task-back" type="button" data-task-back aria-label="Kembali">←</button>
        <strong>Edit Task</strong>
      </div>
      <form class="task-card task-edit-form" id="taskEditForm">
        <label>Judul<input name="title" type="text" maxlength="120" required value="${escapeHtml(t.title)}" /></label>
        <label>Project<select name="project" required><option value="">— Pilih project —</option>${projNameOptions(t.project || '')}</select></label>
        <div class="task-edit-row">
          <label>Deadline<input name="date" type="date" value="${t.date || ''}" /></label>
          <label>Jam<input name="time" type="time" value="${t.time || ''}" /></label>
        </div>
        <label>Prioritas
          <select name="priority">
            <option value="high" ${t.priority === 'high' ? 'selected' : ''}>Tinggi</option>
            <option value="med" ${t.priority === 'med' ? 'selected' : ''}>Sedang</option>
            <option value="low" ${t.priority === 'low' ? 'selected' : ''}>Rendah</option>
          </select>
        </label>
        <label>Deskripsi<textarea name="notes" rows="3" maxlength="400">${escapeHtml(t.notes || '')}</textarea></label>
        <div class="task-composer-actions">
          <button type="button" class="ghost-button" data-task-cancel-edit>Batal</button>
          <button type="submit" class="primary-button">Simpan</button>
        </div>
      </form>
    </section>`;
    }

    const cl = Array.isArray(t.checklist) ? t.checklist : [];
    const clDone = cl.filter((c) => c.done).length;
    const clPct = cl.length ? Math.round((clDone / cl.length) * 100) : 0;
    const clItems = cl.length ? cl.map((c) => `
        <label class="task-sub ${c.done ? 'done' : ''}">
          <input class="task-check" type="checkbox" ${c.done ? 'checked' : ''} data-task-sub="${t.id}" data-sub-id="${c.id}" />
          <span>${escapeHtml(c.text)}</span>
        </label>`).join('') : '<p class="task-empty">Belum ada subtask.</p>';
    const atts = Array.isArray(t.attachments) ? t.attachments : [];
    const acts = Array.isArray(t.activity) ? [...t.activity].sort((a, b) => b.at - a.at) : [];
    const menu = `
        <div class="task-menu">
          <button class="icon-button task-menu-btn" type="button" data-task-menu aria-label="Menu">⋮</button>
          <div class="task-menu-pop" hidden>
            <button type="button" data-task-edit>Edit Task</button>
            <button type="button" class="danger" data-task-delete="${t.id}">Delete</button>
          </div>
        </div>`;
    return `
    <section class="task-page task-detail">
      <div class="task-detail-top">
        <button class="icon-button task-back" type="button" data-task-back aria-label="Kembali">←</button>
        <strong>Detail Task</strong>
        ${menu}
      </div>
      <div class="task-card task-detail-head">
        <div class="task-detail-chips">
          <span class="task-chip prio ${prio[1]}">${prio[0]}</span>
          <span class="task-chip status ${status[1]}">${status[0]}</span>
        </div>
        <h2 class="task-detail-title">${escapeHtml(t.title)}</h2>
      </div>
      <div class="task-card task-detail-info">
        <div class="task-info-grid">
          <div class="task-info-cell">
            <span class="task-info-label">Project</span>
            <span class="task-info-value">${escapeHtml(projLabel || '—')}</span>
          </div>
          <div class="task-info-cell">
            <span class="task-info-label">Deadline</span>
            <span class="task-info-value">${deadline || '—'}</span>
          </div>
        </div>
        <div class="task-info-grid">
          <div class="task-info-cell">
            <span class="task-info-label">Estimasi</span>
            <span class="task-info-value">${taskMinutesLabel(t.estimate)}</span>
          </div>
          <div class="task-info-cell">
            <span class="task-info-label">Aktual</span>
            <span class="task-info-value">${focusTaskId === t.id && t.focusAt ? '<span class="task-actual-live" data-focus-live></span>' : taskMinutesLabel(t.actual)}</span>
          </div>
        </div>
      </div>
      ${t.notes ? `
      <section class="task-card task-detail-sec">
        <h3>Deskripsi</h3>
        ${desc}
      </section>` : ''}
      <section class="task-card task-detail-sec">
        <div class="task-sec-head">
          <h3>Checklist</h3>
          ${cl.length ? `<span class="task-sec-meta">${clDone} / ${cl.length} selesai</span>` : ''}
        </div>
        ${cl.length ? `<div class="task-bar slim"><span style="width:${clPct}%"></span></div>` : ''}
        <div class="task-sub-list">${clItems}</div>
      </section>
      <section class="task-card task-detail-sec">
        <h3>Catatan</h3>
        <p class="task-detail-desc">${t.memo ? escapeHtml(t.memo) : 'Belum ada catatan tambahan.'}</p>
      </section>
      <section class="task-card task-detail-sec">
        <h3>Attachment</h3>
        <div class="task-attach-list">
          ${atts.length ? atts.map((a) => `<span class="task-chip att">📎 ${escapeHtml(String(a))}</span>`).join('') : '<p class="task-empty">Belum ada lampiran.</p>'}
        </div>
      </section>
      <div class="task-detail-actions">
        ${t.done ? `<button class="primary-button" type="button" data-task-toggle="${t.id}">Tandai Belum Selesai</button>`
      : focusTaskId === t.id && t.focusAt ? `
        <div class="task-focus-timer-card">
          <div class="task-focus-timer ${t.focusPausedSince ? 'paused' : ''}"><span class="task-focus-dotpulse"></span><span class="task-focus-state">${t.focusPausedSince ? 'Fokus dijeda' : 'Sesi fokus berjalan'}</span><strong data-focus-live>${focusSecondsLabel(focusElapsedMs(t))}</strong></div>
          <div class="task-focus-btns">
            <button class="secondary-button" type="button" data-task-focus-pause>${t.focusPausedSince ? 'Lanjut' : 'Jeda'}</button>
            <button class="primary-button" type="button" data-task-focus="${t.id}">Stop</button>
          </div>
        </div>`
      : `<button class="primary-button task-focus-btn" type="button" data-task-focus="${t.id}">Mulai Fokus</button>`}
      </div>
      <section class="task-card task-detail-sec">
        <h3>Activity</h3>
        <ul class="task-activity">
          ${acts.length ? acts.map((a) => `<li><span>${escapeHtml(a.text)}</span><time>${taskRelTime(a.at)}</time></li>`).join('') : '<li class="task-empty">Belum ada aktivitas.</li>'}
        </ul>
      </section>
    </section>`;
  }

  function renderTaskView() {
    if (taskPageAdding) return renderTaskAddPage();
    if (taskDetailId) {
      const detail = renderTaskDetail();
      if (detail) return detail;
      taskDetailId = null;
    }
    const tasks = loadTasks();
    const todayIso = taskTodayIso();
    const visible = tasks.filter((t) => taskMatchFilter(t, todayIso));
    const active = visible.filter((t) => !t.done);
    const done = visible.filter((t) => t.done);
    const todayAll = tasks.filter((t) => t.date === todayIso);
    const doneCount = todayAll.filter((t) => t.done).length;
    const totalCount = todayAll.length;
    const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;
    const now = new Date();
    const dateLabel = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const h = now.getHours();
    const greet = h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 19 ? 'Selamat sore' : 'Selamat malam';

    const pills = TASK_FILTERS.map((f) => {
      const n = tasks.filter((t) => taskMatchKey(t, f.key, todayIso)).length;
      return `<button class="task-pill ${taskFilter === f.key ? 'active' : ''}" type="button" data-task-filter="${f.key}">${f.label}<span>${n}</span></button>`;
    }).join('');

    const chip = (text, cls) => (text ? `<span class="task-chip ${cls || ''}">${escapeHtml(text)}</span>` : '');
    const row = (t) => `
      <div class="task-row ${t.done ? 'done' : ''}" data-task-id="${t.id}">
        <span class="task-prio p-${t.priority || 'low'}" aria-label="Prioritas"></span>
        <label class="task-check-wrap">
          <input class="task-check" type="checkbox" ${t.done ? 'checked' : ''} data-task-toggle="${t.id}" />
        </label>
        <span class="task-main" data-task-open="${t.id}" role="button" tabindex="0" aria-label="Buka detail ${escapeHtml(t.title)}">
          <span class="task-name">${escapeHtml(t.title)}</span>
          <span class="task-meta">${chip(t.project)}${t.tag ? chip(t.tag, 'tag') : ''}${t.time ? `<span class="task-time">⏱ ${escapeHtml(t.time)}</span>` : ''}</span>
        </span>
        <button class="task-del icon-button" type="button" data-task-delete="${t.id}" aria-label="Hapus task">✕</button>
      </div>`;

    const composer = taskAdding ? `
      <form class="task-composer" id="taskComposer">
        <input id="taskQuickInput" type="text" maxlength="120" placeholder="Nama task…" autocomplete="off" />
        <input id="taskQuickWhen" type="date" value="${todayIso}" />
        <select id="taskQuickProj"><option value="">— Project —</option>${projNameOptions(taskAddDraft.project)}</select>
        <div class="task-composer-actions">
          <button type="button" class="ghost-button" data-task-cancel>Batal</button>
          <button type="submit" class="primary-button">Simpan</button>
        </div>
      </form>` : '';

    return `
    <section class="task-page">
      <div class="task-date"><strong>${greet}</strong> · ${escapeHtml(dateLabel)}</div>
      <div class="task-card task-progress-card">
        <div class="task-progress-head">
          <strong>${doneCount} / ${totalCount} selesai</strong>
          <span class="task-pct">${pct}%</span>
        </div>
        <div class="task-bar"><span style="width:${pct}%"></span></div>
      </div>
      <div class="task-pills" role="tablist">${pills}</div>
      ${composer}
      <section class="task-card task-section">
        <h3>Fokus Hari Ini</h3>
        <div class="task-list">
          ${active.length ? active.map(row).join('') : '<p class="task-empty">Belum ada task di sini. Tambah satu lewat tombol +.</p>'}
        </div>
      </section>
      ${done.length ? `
      <section class="task-card task-section">
        <h3>Selesai</h3>
        <div class="task-list">${done.map(row).join('')}</div>
      </section>` : ''}
      <button class="task-fab" type="button" data-task-add aria-label="Tambah task baru">+</button>
    </section>`;
  }

  function taskDateRead(iso) {
    if (!iso) return 'Pilih tanggal';
    if (iso === taskTodayIso()) return 'Hari ini';
    const [y, m, d] = iso.split('-').map(Number);
    const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${d} ${bulan[(m || 1) - 1]} ${y}`;
  }

  function taskTimeRead(v) {
    return v || 'Pilih jam';
  }

  function renderTaskAddPage() {
    const todayIso = taskTodayIso();
    const d = taskAddDraft;
    const prio = { high: 'High', med: 'Medium', low: 'Low' }[d.priority] || 'Low';
    const row = (icon, label, valueHtml, extra = '') => `
        <div class="task-add-row" ${extra}>
          <span class="task-add-ico">${icon}</span>
          <span class="task-add-label">${label}</span>
          <span class="task-add-value">${valueHtml}</span>
          <span class="task-add-chev">›</span>
        </div>`;
    const cal = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/></svg>';
    const clock = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>';
    const prioIco = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3.5l8.5 8.5L12 20.5 3.5 12z"/></svg>';
    const board = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="16" height="16" rx="3.5"/><path d="M10 4v16"/></svg>';
    const grid = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/></svg>';
    const optRows = taskAddOptions ? `
        <div class="task-add-opt-sep"></div>
        <label class="task-add-row task-add-desk">
          <span class="task-add-label">Deskripsi</span>
          <textarea name="opt-notes" rows="2" maxlength="400" placeholder="Jelaskan task ini… (opsional)">${escapeHtml(d.notes)}</textarea>
        </label>
        <label class="task-add-row task-add-desk">
          <span class="task-add-label">Catatan</span>
          <textarea name="opt-memo" rows="2" maxlength="400" placeholder="Catatan singkat (opsional)">${escapeHtml(d.memo)}</textarea>
        </label>
        <div class="task-add-row">
          <span class="task-add-label">Deadline</span>
          <span class="task-add-value"><input name="opt-deadline" type="date" value="${escapeHtml(d.deadline)}" /></span>
        </div>
        <div class="task-add-row">
          <span class="task-add-label">Estimasi</span>
          <span class="task-add-value"><select name="opt-estimate">
            <option value="">Tanpa estimasi</option>
            <option value="30" ${d.estimate === '30' ? 'selected' : ''}>30 menit</option>
            <option value="60" ${d.estimate === '60' ? 'selected' : ''}>1 jam</option>
            <option value="90" ${d.estimate === '90' ? 'selected' : ''}>1 jam 30 mnt</option>
            <option value="120" ${d.estimate === '120' ? 'selected' : ''}>2 jam</option>
            <option value="240" ${d.estimate === '240' ? 'selected' : ''}>4 jam</option>
          </select></span>
        </div>
        <div class="task-add-row">
          <span class="task-add-label">Reminder</span>
          <span class="task-add-value"><select name="opt-reminder">
            <option value="">Tidak ada</option>
            <option value="30" ${d.reminder === '30' ? 'selected' : ''}>30 menit sebelum</option>
            <option value="60" ${d.reminder === '60' ? 'selected' : ''}>1 jam sebelum</option>
            <option value="1440" ${d.reminder === '1440' ? 'selected' : ''}>1 hari sebelum</option>
          </select></span>
        </div>
        <div class="task-add-row">
          <span class="task-add-label">Tag</span>
          <span class="task-add-value"><input name="opt-tag" type="text" maxlength="24" placeholder="mis. promosi" value="${escapeHtml(d.tag)}" /></span>
        </div>
        <div class="task-add-row">
          <span class="task-add-label">Recurring</span>
          <span class="task-add-value"><select name="opt-recurring">
            <option value="">Tidak berulang</option>
            <option value="daily" ${d.recurring === 'daily' ? 'selected' : ''}>Harian</option>
            <option value="weekly" ${d.recurring === 'weekly' ? 'selected' : ''}>Mingguan</option>
            <option value="monthly" ${d.recurring === 'monthly' ? 'selected' : ''}>Bulanan</option>
          </select></span>
        </div>
        <div class="task-add-block">
          <div class="task-add-block-head"><span>Checklist Subtask</span>${d.checklist.length ? `<em>${d.checklist.length} item</em>` : ''}</div>
          ${d.checklist.map((c, i) => `<div class="task-add-block-row"><span>${escapeHtml(c.text)}</span><button type="button" class="task-add-x" data-task-sub-del="${i}" aria-label="Hapus subtask">×</button></div>`).join('')}
          <div class="task-add-inline">
            <input name="opt-sub-new" type="text" maxlength="60" placeholder="Tambah subtask…" autocomplete="off" />
            <button type="button" class="task-add-mini" data-task-sub-add>Tambah</button>
          </div>
        </div>
        <div class="task-add-block">
          <div class="task-add-block-head"><span>Attachment</span></div>
          ${d.attachments.length ? `<div class="task-add-att-chips">${d.attachments.map((a, i) => `<span class="task-chip att">📎 ${escapeHtml(a.text || '')}<button type="button" class="task-add-x" data-task-att-del="${i}" aria-label="Hapus lampiran">×</button></span>`).join('')}</div>` : '<p class="task-empty">Belum ada lampiran.</p>'}
          <div class="task-add-inline">
            <input name="opt-att-new" type="text" maxlength="60" placeholder="Nama file / link…" autocomplete="off" />
            <button type="button" class="task-add-mini" data-task-att-add>Tambah</button>
          </div>
        </div>` : '';
    return `
    <section class="task-page task-add-page">
      <div class="task-detail-top">
        <button class="icon-button task-back" type="button" data-task-add-close aria-label="Kembali">←</button>
        <strong>Tambah Task</strong>
      </div>
      <form class="task-add-form" id="taskAddForm">
        <div class="task-card task-add-title-card">
          <input id="taskAddTitle" name="title" type="text" maxlength="120" placeholder="Apa yang ingin dikerjakan?" autocomplete="off" value="${escapeHtml(d.title)}" />
          <div class="task-add-hint">Contoh: Buat konten promosi batu bata</div>
        </div>
        <div class="task-card task-add-rows">
          ${row(cal, 'Tanggal', `<span class="task-add-native-wrap"><span class="task-add-read">${taskDateRead(d.date)}</span><input name="date" type="date" value="${escapeHtml(d.date)}" data-add-sync="date" /></span>`)}
          ${row(clock, 'Jam', `<span class="task-add-native-wrap"><span class="task-add-read">${taskTimeRead(d.time)}</span><input name="time" type="time" value="${d.time}" data-add-sync="time" /></span>`)}
          ${row(`<span class="task-add-ico prio">${prioIco}</span>`, 'Prioritas', `<span class="task-dot dot-red"></span><select name="priority"><option value="high" ${d.priority === 'high' ? 'selected' : ''}>High</option><option value="med" ${d.priority === 'med' ? 'selected' : ''}>Medium</option><option value="low" ${d.priority === 'low' ? 'selected' : ''}>Low</option></select>`)}
          ${row(board, 'Project', `<span class="task-dot dot-red"></span><select name="project" required><option value="">— Pilih project —</option>${projNameOptions(d.project)}</select>`)}
          ${row(grid, 'Kategori', `<span class="task-dot dot-ring"></span><input name="category" type="text" maxlength="24" value="${escapeHtml(d.category)}" list="taskAddCats" />`)}
          <datalist id="taskAddCats"><option value="Marketing"></option><option value="Operasional"></option><option value="Keuangan"></option><option value="Konten"></option></datalist>
          <button class="task-add-row task-add-more" type="button" data-task-options>
            <span class="task-add-label" style="font-weight:800; color:var(--text)">Opsi Lainnya</span>
            <span class="task-add-chev ${taskAddOptions ? 'open' : ''}">⌄</span>
          </button>
          ${optRows}
        </div>
        <div class="task-add-actions">
          <button type="submit" class="primary-button">Simpan</button>
          <button type="button" class="secondary-button" data-task-add-again>Simpan &amp; Tambah Lagi</button>
        </div>
      </form>
    </section>`;
  }

  function taskAddCollect(form) {
    const el = (n) => form.querySelector(`[name=${n}]`);
    const val = (n) => el(n)?.value.trim() || '';
    const data = {
      title: val('title'),
      date: val('date') || taskTodayIso(),
      time: val('time'),
      priority: el('priority')?.value || 'low',
      project: val('project'),
      category: val('category'),
    };
    // Field opsional hanya ikut terkumpul saat ada di DOM (section terbuka);
    // kalau tidak ada, jangan timpa draft — cegah reset saat collapse.
    if (el('opt-tag')) data.tag = val('opt-tag');
    if (el('opt-notes')) data.notes = val('opt-notes');
    if (el('opt-memo')) data.memo = val('opt-memo');
    if (el('opt-reminder')) data.reminder = val('opt-reminder');
    if (el('opt-recurring')) data.recurring = val('opt-recurring');
    if (el('opt-deadline')) data.deadline = val('opt-deadline');
    if (el('opt-estimate')) data.estimate = el('opt-estimate').value.trim();
    return data;
  }

  // Simpan seluruh nilai form ke draft supaya tidak hilang saat form dirender ulang
  function taskAddSyncDraft(form) {
    if (!form) return;
    Object.entries(taskAddCollect(form)).forEach(([k, v]) => { taskAddDraft[k] = v; });
    taskAddDraft.checklist.forEach((c) => { if (c._live) c.text = c._live.value.trim() || c.text; });
    taskAddDraft.attachments.forEach((a) => { if (a._live) a.text = String(a._live.value).trim() || a.text; });
    taskAddDraft.checklist = taskAddDraft.checklist.filter((c) => c.text);
    taskAddDraft.attachments = taskAddDraft.attachments.filter((a) => a.text);
  }

  function submitTaskAdd(form, again) {
    taskAddSyncDraft(form);
    const data = taskAddDraft;
    if (!data.title) {
      const el = form.querySelector('#taskAddTitle');
      el.focus();
      return false;
    }
    if (!data.project) { showToast('Pilih project terlebih dahulu — semua task harus berdasarkan project.', true); return false; }
    const checklist = taskAddDraft.checklist.map((c, i) => ({ id: `s${Date.now()}${i}`, text: c.text, done: false }));
    const attachments = taskAddDraft.attachments.map((a) => a.text);
    loadTasks().push({
      id: `t${Date.now()}`, title: data.title, project: data.project, tag: data.tag || data.category, time: data.time, priority: data.priority, date: data.date, done: false,
      notes: data.notes || undefined,
      memo: data.memo || (data.reminder ? `Reminder: ${data.reminder === '30' ? '30 mnt' : data.reminder === '60' ? '1 jam' : '1 hari'} sebelum deadline` : undefined),
      estimate: data.estimate ? Number(data.estimate) : undefined,
      deadlineDate: data.deadline || undefined,
      recurring: data.recurring || undefined,
      checklist: checklist.length ? checklist : undefined,
      attachments: attachments.length ? attachments : undefined,
    });
    saveTasks();
    const keep = { time: data.time || '19:00', priority: data.priority, project: data.project || firstProjName(), category: data.category || 'Marketing', date: data.date };
    taskAddDraft = Object.assign(taskAddDefaults(), again ? keep : {});
    return true;
  }

  function val2(form, name) {
    return form.querySelector(`[name=${name}]`)?.value.trim() || '';
  }

  function logActivityLastTask(text) {
    const tasks = loadTasks();
    const t = tasks[tasks.length - 1];
    if (t) logTaskActivity(t, text);
  }

  function mountTaskSearch() {
    const input = document.querySelector('#taskSearchInput');
    if (!input || input.dataset.taskBound === '1') return;
    input.dataset.taskBound = '1';
    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      document.querySelectorAll('.task-page .task-row').forEach((el) => {
        const text = el.textContent.toLowerCase();
        el.style.display = !q || text.includes(q) ? '' : 'none';
      });
    });
  }

  function handleTaskAction(actionButton) {
    if (actionButton.matches('[data-task-open]')) {
      taskDetailId = actionButton.dataset.taskOpen;
      renderShell();
      return true;
    }
    if (actionButton.matches('[data-task-back]')) {
      if (taskEditing) { taskEditing = false; renderShell(); return true; }
      taskDetailId = null;
      renderShell();
      return true;
    }
    if (actionButton.matches('[data-task-add-close]')) {
      taskPageAdding = false;
      renderShell();
      return true;
    }
    if (actionButton.matches('[data-task-options]')) {
      taskAddSyncDraft(document.querySelector('#taskAddForm'));
      taskAddOptions = !taskAddOptions;
      renderShell();
      return true;
    }
    if (actionButton.matches('[data-task-sub-add]')) {
      const form = actionButton.closest('#taskAddForm');
      taskAddSyncDraft(form);
      const el = form.querySelector('[name=opt-sub-new]');
      const v = el ? el.value.trim() : '';
      if (v) { taskAddDraft.checklist.push({ text: v }); renderShell(); setTimeout(() => document.querySelector('[name=opt-sub-new]')?.focus(), 30); }
      else { el?.focus(); }
      return true;
    }
    if (actionButton.matches('[data-task-sub-del]')) {
      const form = actionButton.closest('#taskAddForm');
      taskAddSyncDraft(form);
      taskAddDraft.checklist.splice(Number(actionButton.dataset.taskSubDel), 1);
      renderShell();
      return true;
    }
    if (actionButton.matches('[data-task-att-add]')) {
      const form = actionButton.closest('#taskAddForm');
      taskAddSyncDraft(form);
      const el = form.querySelector('[name=opt-att-new]');
      const v = el ? el.value.trim() : '';
      if (v) { taskAddDraft.attachments.push({ text: v }); renderShell(); setTimeout(() => document.querySelector('[name=opt-att-new]')?.focus(), 30); }
      else { el?.focus(); }
      return true;
    }
    if (actionButton.matches('[data-task-att-del]')) {
      const form = actionButton.closest('#taskAddForm');
      taskAddSyncDraft(form);
      taskAddDraft.attachments.splice(Number(actionButton.dataset.taskAttDel), 1);
      renderShell();
      return true;
    }
    if (actionButton.matches('[data-task-add-again]')) {
      const form = document.querySelector('#taskAddForm');
      if (form && submitTaskAdd(form, true)) {
        logActivityLastTask('Task dibuat');
        taskAddOptions = false;
        renderShell();
        setTimeout(() => document.querySelector('#taskAddTitle')?.focus(), 50);
      }
      return true;
    }
    if (actionButton.matches('[data-task-menu]')) {
      const pop = actionButton.parentElement.querySelector('.task-menu-pop');
      if (pop) pop.hidden = !pop.hidden;
      return true;
    }
    if (actionButton.matches('[data-task-edit]')) {
      taskEditing = true;
      renderShell();
      return true;
    }
    if (actionButton.matches('[data-task-cancel-edit]')) {
      taskEditing = false;
      renderShell();
      return true;
    }
    if (actionButton.matches('[data-task-sub]')) {
      const t = loadTasks().find((x) => x.id === actionButton.dataset.taskSub);
      const c = t && Array.isArray(t.checklist) ? t.checklist.find((y) => y.id === actionButton.dataset.subId) : null;
      if (c) {
        c.done = !c.done;
        logTaskActivity(t, c.done ? `Checklist "${c.text}" selesai` : `Checklist "${c.text}" dibuka kembali`);
        saveTasks();
        renderShell();
      }
      return true;
    }
    if (actionButton.matches('[data-task-focus]')) {
      if (focusTaskId) stopFocus(); else startFocus();
      renderShell();
      return true;
    }
    if (actionButton.matches('[data-task-focus-pause]')) {
      const t = focusTask();
      if (t) { if (t.focusPausedSince) resumeFocus(); else pauseFocus(); }
      renderShell();
      setTimeout(tickFocusDisplay, 0);
      return true;
    }
    if (actionButton.matches('[data-task-filter]')) {
      taskFilter = actionButton.dataset.taskFilter;
      renderShell();
      return true;
    }
    if (actionButton.matches('[data-task-toggle]')) {
      const t = loadTasks().find((x) => x.id === actionButton.dataset.taskToggle);
      if (t) {
        t.done = !t.done;
        logTaskActivity(t, t.done ? 'Task ditandai selesai' : 'Task dibuka kembali');
        saveTasks();
        renderShell();
      }
      return true;
    }
    if (actionButton.matches('[data-task-delete]')) {
      const id = actionButton.dataset.taskDelete;
      state.tasks = loadTasks().filter((x) => x.id !== id);
      saveTasks();
      if (taskDetailId === id) { taskDetailId = null; taskEditing = false; }
      renderShell();
      return true;
    }
    if (actionButton.matches('[data-task-add]')) {
      taskPageAdding = true;
      taskAddOptions = false;
      renderShell();
      setTimeout(() => document.querySelector('#taskAddTitle')?.focus(), 60);
      return true;
    }
    if (actionButton.matches('[data-task-cancel]')) {
      taskAdding = false;
      renderShell();
      return true;
    }
    return false;
  }


  /* ============ MODUL GOALS (target & milestone) ============ */
  const GOALS_STORE_KEY = 'miaw-tracker.goals.v1';
  const GOAL_CATS = {
    Karier: '#3b82f6', Keuangan: '#ea8a2f', Kesehatan: '#3f9d63',
    Pendidikan: '#8b5cf6', Personal: '#ec6aa0', Lainnya: '#6b7280',
  };
  const GOAL_ICONS = { Karier: '💼', Keuangan: '💰', Kesehatan: '💚', Pendidikan: '🎓', Personal: '🌸', Lainnya: '📌' };
  const GOAL_TERMS = {
    pendek: { label: 'Jangka Pendek', hint: '≤ 3 bulan', color: '#3f9d63' },
    menengah: { label: 'Jangka Menengah', hint: '3–12 bulan', color: '#ea8a2f' },
    panjang: { label: 'Jangka Panjang', hint: '> 12 bulan', color: '#2f8fbf' },
  };
  function goalTermOf(g) {
    if (g.term && GOAL_TERMS[g.term]) return g.term;
    const dl = g.deadline || '';
    const days = dl ? Math.ceil((new Date(`${dl}T23:59:59`).getTime() - Date.now()) / 86400000) : 90;
    return days <= 90 ? 'pendek' : days <= 365 ? 'menengah' : 'panjang';
  }
  let goalsFilter = 'all';        // all | aktif | selesai
  let goalsPage = 'list';         // list | detail | add | calendar
  let goalsDetailId = null;
  let goalsMonthOffset = 0;
  let goalsAddCat = 'Karier';
  let goalsAddTerm = 'pendek';
  let goalsAddDraft = { title: '', description: '', deadline: '' };
  function captureGoalAdd() {
    const f = document.querySelector('#goalAddForm');
    if (!f) return;
    goalsAddDraft = { title: f.querySelector('[name=title]').value, description: f.querySelector('[name=description]').value, deadline: f.querySelector('[name=deadline]').value };
  }
  let goalsCalSel = null;

  function loadGoals() {
    try {
      const raw = JSON.parse(localStorage.getItem(scopedKey(GOALS_STORE_KEY)) || 'null');
      if (Array.isArray(raw) && raw.length) return raw;
    } catch { /* seed ulang */ }
    const today = taskTodayIso();
    const y = today.slice(0, 4);
    const m = today.slice(5, 7);
    const day = (n) => `${y}-${m}-${String(n).padStart(2, '0')}`;
    const seed = [
      {
        id: 'g1', title: 'Bangun bisnis online', category: 'Karier', project: 'Marketing Batu Bata', term: 'menengah',
        deadline: day(30), description: 'Luncurkan toko online dan raih 100 pelanggan pertama.',
        status: 'aktif', createdAt: today,
        milestones: [
          { id: 'm1', text: 'Riset pasar & kompetitor', target: day(12), done: true },
          { id: 'm2', text: 'Buat website toko', target: day(15), done: true },
          { id: 'm3', text: 'Siapkan katalog produk', target: day(18), done: true },
          { id: 'm4', text: 'Mulai iklan berbayar', target: day(24), done: false },
          { id: 'm5', text: 'Evaluasi & optimasi', target: day(28), done: false },
        ],
      },
      {
        id: 'g2', title: 'Meningkatkan skill digital', category: 'Pendidikan', project: 'Pengembangan Diri', term: 'pendek',
        deadline: day(27), description: 'Selesaikan kelas desain & analitik data bulan ini.',
        status: 'aktif', createdAt: today,
        milestones: [
          { id: 'm6', text: 'Pilih kursus online', target: day(8), done: true },
          { id: 'm7', text: 'Selesaikan modul 1-3', target: day(16), done: false },
          { id: 'm8', text: 'Buat portofolio kecil', target: day(22), done: false },
          { id: 'm9', text: 'Ikuti webinar industri', target: day(25), done: false },
        ],
      },
      {
        id: 'g3', title: 'Menjaga kesehatan', category: 'Kesehatan', project: 'Rutinitas Harian', term: 'pendek',
        deadline: day(28), description: 'Konsisten olahraga & pola makan sehat 4 minggu.',
        status: 'aktif', createdAt: today,
        milestones: [
          { id: 'm10', text: 'Jogging 3x seminggu', target: day(14), done: false },
          { id: 'm11', text: 'Cek kesehatan rutin', target: day(20), done: false },
          { id: 'm12', text: 'Kurangi gula & gorengan', target: day(24), done: false },
          { id: 'm13', text: 'Tidur sebelum jam 23:00', target: day(26), done: false },
        ],
      },
      {
        id: 'g4', title: 'Dana darurat 3 bulan', category: 'Keuangan', project: 'Keuangan Pribadi', term: 'panjang',
        deadline: `${y}-12-20`, description: 'Sisihkan 10% penghasilan tiap bulan sampai tercapai.',
        status: 'selesai', createdAt: today,
        milestones: [
          { id: 'm14', text: 'Buka rekening khusus', target: day(5), done: true },
          { id: 'm15', text: 'Autodebet bulanan', target: day(6), done: true },
          { id: 'm16', text: 'Capai target 3 bulan', target: day(10), done: true },
        ],
      },
    ];
    try { localStorage.setItem(scopedKey(GOALS_STORE_KEY), JSON.stringify(seed)); } catch { /* ignore */ }
    return seed;
  }

  function saveGoals(list) {
    try { localStorage.setItem(scopedKey(GOALS_STORE_KEY), JSON.stringify(list)); } catch { /* ignore */ }
  }

  function goalProgress(g) {
    const ms = g.milestones || [];
    const done = ms.filter((x) => x.done).length;
    return { done, total: ms.length, pct: ms.length ? Math.round((done / ms.length) * 100) : 0 };
  }

  function goalCatColor(c) { return GOAL_CATS[c] || GOAL_CATS.Lainnya; }
  function goalCatIcon(c) { return GOAL_ICONS[c] || GOAL_ICONS.Lainnya; }

  function goalCardHtml(g) {
    const p = goalProgress(g);
    const term = goalTermOf(g);
    return `<button type="button" class="goal-card" data-goal-open="${g.id}">
        <span class="goal-ico" style="--gc:${goalCatColor(g.category)}">${goalCatIcon(g.category)}</span>
        <span class="goal-card-main">
          <span class="goal-card-title">${escapeHtml(g.title)}</span>
          <span class="goal-card-meta"><span class="goal-term-chip t-${term}" style="--tc:${GOAL_TERMS[term].color}">${GOAL_TERMS[term].label}</span> Deadline ${escapeHtml(taskDateRead(g.deadline || ''))} · ${escapeHtml(g.category)}</span>
          <span class="goal-bar"><span style="width:${p.pct}%"></span></span>
          <span class="goal-card-sub">${p.done}/${p.total} milestone${p.pct ? ` · ${p.pct}%` : ''}</span>
        </span>
        <span class="goal-chev">›</span>
      </button>`;
  }

  function renderGoalsView() {
    if (goalsPage === 'add') return renderGoalAddPage();
    if (goalsPage === 'detail' && goalsDetailId) return renderGoalDetailPage();
    if (goalsPage === 'calendar') return renderGoalCalendarPage();
    const all = loadGoals();
    const filtered = all.filter((g) => (goalsFilter === 'all' ? true : g.status === goalsFilter));
    const totalMs = all.reduce((s, g) => s + goalProgress(g).total, 0);
    const doneMs = all.reduce((s, g) => s + goalProgress(g).done, 0);
    const pctAll = totalMs ? Math.round((doneMs / totalMs) * 100) : 0;
    const summary = `<div class="goal-summary">
        <span class="goal-summary-label">${doneMs}/${totalMs} milestone selesai</span>
        <span class="goal-summary-pct">${pctAll}%</span>
      </div>
      <div class="goal-bar big"><span style="width:${pctAll}%"></span></div>`;
    const chips = ['all', 'aktif', 'selesai'].map((f) => `<button type="button" class="goal-chip${goalsFilter === f ? ' on' : ''}" data-goal-filter="${f}">${f === 'all' ? 'Semua' : f === 'aktif' ? 'Aktif' : 'Selesai'}</button>`).join('');
    const shown = filtered;
    const sec = (key) => {
      const items = shown.filter((g) => goalTermOf(g) === key);
      if (!items.length) return '';
      return `<div class="goal-term-sec"><h3 class="goal-term-head" style="--tc:${GOAL_TERMS[key].color}">${GOAL_TERMS[key].label}<span class="goal-term-hint">${GOAL_TERMS[key].hint} · ${items.length} goal</span></h3>${items.map(goalCardHtml).join('')}</div>`;
    };
    const grouped = ['pendek', 'menengah', 'panjang'].map(sec).join('') || '<p class="task-empty">Tidak ada goal pada filter ini.</p>';
    return `<div class="goals-page">
        <p class="goal-foundation-note">🎯 Goals adalah pondasi: hasil besar yang ingin diwujudkan. Project dan Task mengikuti goal di atasnya.</p>
        ${summary}
        <div class="goal-chips">${chips}</div>
        ${grouped}
        <button class="goal-add-btn" type="button" data-goal-add>+ Tambah Goal</button>
        <button class="goal-cal-link" type="button" data-goal-cal-page>📅 Kalender Goal</button>
      </div>`;
  }

  function renderGoalDetailPage() {
    const g = loadGoals().find((x) => x.id === goalsDetailId);
    if (!g) { goalsPage = 'list'; return renderGoalsView(); }
    const p = goalProgress(g);
    const rows = (g.milestones || []).map((mi) => `
        <label class="goal-ms${mi.done ? ' done' : ''}">
          <input type="checkbox" class="task-check" data-goal-ms="${g.id}:${mi.id}" ${mi.done ? 'checked' : ''} />
          <span class="goal-ms-text">${escapeHtml(mi.text)}</span>
          <span class="goal-ms-date">${escapeHtml(taskDateRead(mi.target || ''))}</span>
        </label>`).join('');
    return `<div class="goals-page">
        <button class="goal-back-btn" type="button" data-goal-back>← Kembali</button>
        <div class="goal-detail-card proj-blk">
          <div class="goal-detail-head">
            <span class="goal-ico big" style="--gc:${goalCatColor(g.category)}">${goalCatIcon(g.category)}</span>
            <span class="goal-detail-titlewrap">
              <span class="goal-detail-title">${escapeHtml(g.title)}</span>
              <span class="goal-chip-status ${g.status === 'selesai' ? 'fin' : 'act'}">${g.status === 'selesai' ? 'Selesai' : 'Aktif'}</span>
            </span>
          </div>
          <div class="goal-detail-meta"><span class="goal-term-chip t-${goalTermOf(g)}" style="--tc:${GOAL_TERMS[goalTermOf(g)].color}">${GOAL_TERMS[goalTermOf(g)].label}</span> Deadline <strong>${escapeHtml(taskDateRead(g.deadline || ''))}</strong> · ${escapeHtml(g.category)}</div>
          <div class="goal-bar big"><span style="width:${p.pct}%"></span></div>
          <div class="goal-detail-sub">${p.done}/${p.total} sub goal · ${p.pct}%</div>
          <div class="goal-detail-sec">Deskripsi</div>
          <p class="goal-detail-desc">${escapeHtml(g.description || '—')}</p>
          <div class="goal-detail-sec">Project di goal ini</div>
          ${(() => { const linked = loadProjects().filter((p) => p.goalId === g.id); return linked.length ? linked.map((p) => `<button type="button" class="goal-proj-chip link" data-proj-open="${p.id}">${p.icon || '🧩'} ${escapeHtml(p.name)} ${projStatusChip(p.status)}</button>`).join(' ') : '<span class="goal-proj-chip">Belum ada project — buat lewat menu Project</span>'; })()}
          <div class="goal-detail-sec">Sub Goal / Milestone</div>
          <div class="goal-ms-list">${rows || '<p class="task-empty">Belum ada sub goal.</p>'}</div>
          <button class="goal-ms-add" type="button" data-goal-ms-add>+ Tambah Sub Goal</button>
        </div>
      </div>`;
  }

  /* GOALS-PART2 */
  function renderGoalAddPage() {
    const cats = Object.keys(GOAL_CATS);
    const chips = cats.map((c) => `<button type="button" class="goal-cat-chip${goalsAddCat === c ? ' on' : ''}" data-goal-cat="${c}"><span class="goal-cat-dot" style="background:${GOAL_CATS[c]}"></span>${c}</button>`).join('');
    const terms = Object.entries(GOAL_TERMS).map(([k, t]) => `<button type="button" class="goal-cat-chip${goalsAddTerm === k ? ' on' : ''}" data-goal-term="${k}"><span class="goal-cat-dot" style="background:${t.color}"></span>${t.label}<em class="goal-term-mini">${t.hint}</em></button>`).join('');
    return `<div class="goals-page">
        <form class="goal-add-card" id="goalAddForm">
          <label class="goal-field"><span>Judul</span><input name="title" type="text" maxlength="90" placeholder="Raih tujuan besar…" required value="${escapeHtml(goalsAddDraft.title)}" /></label>
          <label class="goal-field"><span>Deskripsi</span><textarea name="description" rows="3" maxlength="240" placeholder="Ceritakan goal ini…">${escapeHtml(goalsAddDraft.description)}</textarea></label>
          <div class="goal-field"><span>Jangka Waktu</span><div class="goal-cat-row">${terms}</div></div>
          <label class="goal-field"><span>Deadline</span><input name="deadline" type="date" value="${escapeHtml(goalsAddDraft.deadline || taskTodayIso())}" /></label>
          <div class="goal-field"><span>Kategori</span><div class="goal-cat-row">${chips}</div></div>
          <p class="goal-form-hint">💡 Project dibuat menyusul: di halaman Project, pilih goal ini sebagai induknya (Goals → Project → Task → Subtask).</p>
          <button class="primary-button goal-save" type="submit">Simpan</button>
          <button class="secondary-button goal-save2" type="button" data-goal-add-again>Simpan &amp; Tambah Lagi</button>
        </form>
      </div>`;
  }

  function renderGoalCalendarPage() {
    const now = new Date();
    const view = new Date(now.getFullYear(), now.getMonth() + goalsMonthOffset, 1);
    const y = view.getFullYear();
    const m = view.getMonth();
    const days = new Date(y, m + 1, 0).getDate();
    const firstDow = (new Date(y, m, 1).getDay() + 6) % 7;
    const cells = [];
    for (let i = 0; i < firstDow; i += 1) cells.push(null);
    for (let d = 1; d <= days; d += 1) cells.push(`${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    const all = loadGoals();
    const itemsOn = (iso) => {
      const out = [];
      all.forEach((g) => {
        if (g.deadline === iso) out.push({ color: goalCatColor(g.category), text: `Deadline: ${g.title}`, kind: '1deadline' });
        (g.milestones || []).forEach((mi) => { if (mi.target === iso) out.push({ color: goalCatColor(g.category), text: `${mi.done ? '✓' : '•'} ${mi.text} (${g.title})`, kind: '2ms' }); });
      });
      return out.sort((a, b) => a.kind.localeCompare(b.kind));
    };
    const selIso = goalsCalSel || taskTodayIso();
    const dayItems = itemsOn(selIso);
    const grid = cells.map((iso) => {
      if (!iso) return '<span class="jadwal-cell empty"></span>';
      const dots = itemsOn(iso).slice(0, 3).map((x) => `<span class="jadwal-mdot" style="background:${x.color}"></span>`).join('');
      return `<button type="button" class="jadwal-cell${iso === selIso ? ' sel' : iso === taskTodayIso() ? ' today' : ''}" data-goal-cal-day="${iso}"><span>${Number(iso.slice(8))}</span><span class="jadwal-mdots">${dots}</span></button>`;
    }).join('');
    return `<div class="goals-page">
        <div class="jadwal-card">
          <div class="jadwal-month-head">
            <span class="jadwal-month-label">${MONTHS[m]} ${y}</span>
            <span class="jadwal-month-nav">
              <button type="button" class="jadwal-navbtn" data-goal-cal-prev aria-label="Bulan sebelumnya">‹</button>
              <button type="button" class="jadwal-navbtn" data-goal-cal-next aria-label="Bulan berikutnya">›</button>
            </span>
          </div>
          <div class="jadwal-week">${['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((w) => `<span>${w}</span>`).join('')}</div>
          <div class="jadwal-grid">${grid}</div>
        </div>
        <h3 class="jadwal-day-title">${jadwalDayTitle(selIso)}</h3>
        <div class="jadwal-card jadwal-list">
          ${dayItems.length ? dayItems.map((x) => `<div class="jadwal-row"><span class="jadwal-dot" style="background:${x.color}"></span><span class="jadwal-info"><span class="jadwal-title">${escapeHtml(x.text)}</span><span class="jadwal-sub">${x.kind === '1deadline' ? 'Deadline goal' : 'Target milestone'}</span></span></div>`).join('') : '<p class="task-empty">Tidak ada deadline/milestone pada tanggal ini.</p>'}
        </div>
        <button class="goal-back-btn" type="button" data-goal-back>← Kembali ke daftar goal</button>
      </div>`;
  }

  function handleGoalAction(btn) {
    if (btn.matches('[data-goal-add]')) {
      goalsPage = 'add';
      goalsAddCat = 'Karier';
      goalsAddTerm = 'pendek';
      goalsAddDraft = { title: '', description: '', deadline: '' };
      renderShell();
      setTimeout(() => document.querySelector('#goalAddForm [name=title]')?.focus(), 30);
      return true;
    }
    if (btn.matches('[data-goal-back]')) { goalsPage = 'list'; renderShell(); return true; }
    if (btn.matches('[data-goal-cal-page]')) { goalsPage = 'calendar'; goalsCalSel = null; goalsMonthOffset = 0; renderShell(); return true; }
    if (btn.matches('[data-goal-filter]')) { goalsFilter = btn.dataset.goalFilter; renderShell(); return true; }
    if (btn.matches('[data-goal-open]')) { goalsDetailId = btn.dataset.goalOpen; goalsPage = 'detail'; renderShell(); return true; }
    if (btn.matches('[data-goal-cat]')) { captureGoalAdd(); goalsAddCat = btn.dataset.goalCat; renderShell(); return true; }
    if (btn.matches('[data-goal-term]')) { captureGoalAdd(); goalsAddTerm = btn.dataset.goalTerm; renderShell(); return true; }
    if (btn.matches('[data-goal-add-again]')) { submitGoalForm(document.querySelector('#goalAddForm'), true); return true; }
    if (btn.matches('[data-goal-ms-add]')) {
      const g = loadGoals().find((x) => x.id === goalsDetailId);
      if (g) {
        const text = prompt('Sub goal baru:');
        if (text && text.trim()) {
          g.milestones.push({ id: `m${Date.now()}`, text: text.trim(), target: g.deadline, done: false });
          saveGoals(loadGoals());
          renderShell();
        }
      }
      return true;
    }
    if (btn.matches('[data-goal-cal-prev]')) { goalsMonthOffset -= 1; renderShell(); return true; }
    if (btn.matches('[data-goal-cal-next]')) { goalsMonthOffset += 1; renderShell(); return true; }
    if (btn.matches('[data-goal-cal-day]')) { goalsCalSel = btn.dataset.goalCalDay; renderShell(); return true; }
    if (btn.matches('[data-goal-proj]')) { projDetailId = btn.dataset.goalProj; projPage = 'detail'; projTab = 'overview'; projMenuOpen = false; activeView = 'project'; state.selectedView = 'project'; saveState(); renderShell(); return true; }
    return false;
  }

  function submitGoalForm(form, again) {
    if (!form) return;
    const val = (n) => form.querySelector(`[name=${n}]`)?.value.trim() || '';
    const title = val('title');
    if (!title) return;
    const item = {
      id: `g${Date.now()}`, title, description: val('description'), deadline: val('deadline') || taskTodayIso(),
      term: goalsAddTerm, project: '', category: goalsAddCat, status: 'aktif', createdAt: taskTodayIso(), milestones: [],
    };
    const items = loadGoals();
    items.push(item);
    saveGoals(items);
    if (again) {
      renderShell();
      setTimeout(() => document.querySelector('#goalAddForm [name=title]')?.focus(), 30);
    } else {
      goalsPage = 'list';
      renderShell();
    }
  }

  /* ============ MODUL PROJECT (proyek mandiri: task, notes, files) ============ */
  const PROJ_STORE_KEY = 'proj-' + 'tracker.projects.v1';
  const PROJ_STATUS = {
    planning: { label: 'Planning', color: '#8b7bb8' },
    active: { label: 'Active', color: '#3f9d63' },
    onhold: { label: 'On Hold', color: '#ea8a2f' },
    completed: { label: 'Completed', color: '#2f8fbf' },
    archived: { label: 'Archived', color: '#9a917f' },
  };
  const PROJ_ICONS = ['🧩', '🚀', '🏗️', '💻', '📣', '🎨', '📚', '🏠', '💼', '🌱'];
  const PROJ_COLORS = ['#6a564a', '#3f9d63', '#ea8a2f', '#2f8fbf', '#8b7bb8', '#d4576b', '#3f9a8f', '#9a8452'];
  const PROJ_FILTERS = [
    { key: 'all', label: 'Semua' },
    { key: 'active', label: 'Aktif' },
    { key: 'completed', label: 'Selesai' },
    { key: 'archived', label: 'Diarsipkan' },
  ];
  const PROJ_TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'task', label: 'Task' },
    { key: 'notes', label: 'Notes' },
    { key: 'files', label: 'Files' },
  ];
  let projPage = 'list';
  let projFilter = 'all';
  let projSearch = '';
  let projDetailId = null;
  let projTab = 'overview';
  let projTaskFilter = 'all';
  let projMenuOpen = false;
  let projFormId = null;         // null = tambah baru, id = edit
  let projFormSel = { status: 'active', icon: '🧩', color: '#6a564a' };
  let projFormDraft = { name: '', description: '', category: '', start: '', deadline: '', goalId: '', err: '' };
  let projTaskAdding = false;
  let projNoteAdding = false;
  let projFileAdding = false;
  let projFileErr = '';

  function projSeed() {
    const today = taskTodayIso();
    const y = today.slice(0, 4);
    const m = today.slice(5, 7);
    const day = (n) => `${y}-${m}-${String(n).padStart(2, '0')}`;
    return [
      { id: 'p1', name: 'Marketing Batu Bata', icon: '📣', color: '#ea8a2f', category: 'Bisnis', status: 'active', goalId: 'g1',
        start: day(1), deadline: day(20), createdAt: day(1),
        description: 'Kampanye pemasaran digital untuk toko batu bata: landing page, iklan, dan follow-up pelanggan.',
        milestones: [
          { id: 'pm1', text: 'Riset pasar & kompetitor', done: true },
          { id: 'pm2', text: 'Landing page online', done: true },
          { id: 'pm3', text: 'Iklan jalan konsisten', done: false },
          { id: 'pm4', text: 'Evaluasi ROI kampanye', done: false },
        ],
        notes: [
          { id: 'pn1', text: 'CTA utama pakai tombol WhatsApp, harga nego dibuka.', at: Date.now() - 2 * 86400000 },
          { id: 'pn2', text: 'Follow-up maksimal H+1 setelah leads masuk.', at: Date.now() - 5 * 3600000 },
        ],
        files: [
          { id: 'pf1', name: 'Brief kampanye v2.pdf', url: 'https://example.com/brief-kampanye.pdf' },
          { id: 'pf2', name: 'Desain banner (Figma)', url: 'https://figma.com/file/batu-bata-banner' },
        ],
        activity: [] },
      { id: 'p2', name: 'Website Toko Online', icon: '💻', color: '#2f8fbf', category: 'Teknis', status: 'active', goalId: 'g1',
        start: day(5), deadline: day(28), createdAt: day(5),
        description: 'Bangun website toko online lengkap dengan katalog, keranjang, dan pembayaran.',
        milestones: [
          { id: 'pm5', text: 'Struktur & database katalog', done: true },
          { id: 'pm6', text: 'Halaman checkout', done: false },
          { id: 'pm7', text: 'Integrasi pembayaran', done: false },
        ],
        notes: [{ id: 'pn3', text: 'Pakai domain .co.id, hosting di VPS lama.', at: Date.now() - 86400000 }],
        files: [{ id: 'pf3', name: 'Arsitektur sistem.md', url: 'https://example.com/arsitektur.md' }],
        activity: [] },
      { id: 'p3', name: 'Renovasi Dapur', icon: '🏠', color: '#6a564a', category: 'Rumah', status: 'onhold', goalId: 'g3',
        start: day(2), deadline: `${y}-${m}-25`, createdAt: day(2),
        description: 'Perbaikan kabinet, keramik, dan sirkulasi udara dapur.',
        milestones: [
          { id: 'pm8', text: 'Kontraktor & RAB disetujui', done: true },
          { id: 'pm9', text: 'Bongkar kabinet lama', done: false },
        ],
        notes: [], files: [], activity: [] },
      { id: 'p4', name: 'Skripsi Data Science', icon: '📚', color: '#8b7bb8', category: 'Pendidikan', status: 'planning', goalId: 'g2',
        start: day(15), deadline: `${y}-12-15`, createdAt: today,
        description: 'Penelitian prediksi harga komoditas dengan machine learning.',
        milestones: [
          { id: 'pm10', text: 'Judul & proposal disetujui', done: false },
          { id: 'pm11', text: 'Pengumpulan dataset', done: false },
        ],
        notes: [{ id: 'pn4', text: 'Konsultasi dosen pembimbing tiap Selasa.', at: Date.now() - 3 * 86400000 }],
        files: [], activity: [] },
      { id: 'p5', name: 'Otomasi Laporan Bulanan', icon: '🤖', color: '#3f9d63', category: 'Produktivitas', status: 'completed', goalId: 'g2',
        start: day(1), deadline: day(8), createdAt: day(1),
        description: 'Script Python yang menyusun laporan penjualan otomatis tiap awal bulan.',
        milestones: [
          { id: 'pm12', text: 'Ekstrak data penjualan', done: true },
          { id: 'pm13', text: 'Template PDF otomatis', done: true },
          { id: 'pm14', text: 'Jadwal cron jalan', done: true },
        ],
        notes: [], files: [{ id: 'pf4', name: 'repo: laporan-bot', url: 'https://github.com/contoh/laporan-bot' }], activity: [] },
      { id: 'p6', name: 'Event Workshop 2025', icon: '🎨', color: '#9a917f', category: 'Acara', status: 'archived', goalId: 'g4',
        start: `${y}-06-01`, deadline: `${y}-07-30`, createdAt: today,
        description: 'Workshop desain untuk komunitas lokal (sudah selesai,arsip).',
        milestones: [], notes: [], files: [], activity: [] },
    ];
  }

  function loadProjects() {
    try {
      const raw = JSON.parse(localStorage.getItem(scopedKey(PROJ_STORE_KEY)) || 'null');
      if (Array.isArray(raw) && raw.length) {
        let changed = false;
        const goals = loadGoals();
        raw.forEach((p) => {
          if (!p.goalId) {
            const guess = goals.find((g) => (g.project || '').toLowerCase() === p.name.toLowerCase()) || goals.find((g) => g.status === 'aktif');
            if (guess) { p.goalId = guess.id; changed = true; }
          }
        });
        if (changed) { try { localStorage.setItem(scopedKey(PROJ_STORE_KEY), JSON.stringify(raw)); } catch { /* ignore */ } }
        return raw;
      }
    } catch { /* seed ulang */ }
    const seed = projSeed();
    try { localStorage.setItem(scopedKey(PROJ_STORE_KEY), JSON.stringify(seed)); } catch { /* ignore */ }
    return seed;
  }

  function goalTitleOf(id) { const g = loadGoals().find((x) => x.id === id); return g ? g.title : ''; }

  function saveProjects(list) {
    try { localStorage.setItem(scopedKey(PROJ_STORE_KEY), JSON.stringify(list)); } catch { /* ignore */ }
    if (typeof queueRemoteSave === 'function') queueRemoteSave();
  }

  function projTasks(name) {
    return loadTasks().filter((t) => (t.project || '').trim().toLowerCase() === name.trim().toLowerCase());
  }

  function projProgress(p) {
    const ts = projTasks(p.name);
    if (ts.length) {
      const done = ts.filter((t) => t.done === true || t.status === 'done' || t.status === 'selesai').length;
      return { done, total: ts.length, pct: Math.round((done / ts.length) * 100), from: 'task' };
    }
    const ms = p.milestones || [];
    const done = ms.filter((x) => x.done).length;
    return { done, total: ms.length, pct: ms.length ? Math.round((done / ms.length) * 100) : (p.status === 'completed' ? 100 : 0), from: 'milestone' };
  }

  function projDaysLeft(p) {
    if (!p.deadline) return null;
    const d = new Date(`${p.deadline}T23:59:59`);
    if (Number.isNaN(d.getTime())) return null;
    return Math.ceil((d.getTime() - Date.now()) / 86400000);
  }

  function projLog(p, text) {
    p.activity = p.activity || [];
    p.activity.unshift({ text, at: Date.now() });
    if (p.activity.length > 30) p.activity.length = 30;
  }

  function projTimeAgo(at) {
    const diff = Date.now() - at;
    if (diff < 3600000) return `${Math.max(1, Math.round(diff / 60000))} mnt lalu`;
    if (diff < 86400000) return `${Math.round(diff / 3600000)} jam lalu`;
    if (diff < 7 * 86400000) return `${Math.round(diff / 86400000)} hari lalu`;
    return taskDateRead(new Date(at).toISOString().slice(0, 10));
  }

  function projDeadlineLabel(p) {
    const left = projDaysLeft(p);
    if (left === null) return '<span class="proj-dl none">Tanpa deadline</span>';
    if (p.status === 'completed' || p.status === 'archived') return `<span class="proj-dl done">Selesai · ${escapeHtml(taskDateRead(p.deadline))}</span>`;
    if (left < 0) return `<span class="proj-dl late">Lewat ${Math.abs(left)} hari</span>`;
    if (left === 0) return '<span class="proj-dl soon">Deadline hari ini</span>';
    if (left <= 7) return `<span class="proj-dl soon">${left} hari lagi</span>`;
    return `<span class="proj-dl">Sampai ${escapeHtml(taskDateRead(p.deadline))}</span>`;
  }

  function projStatusChip(status) {
    const s = PROJ_STATUS[status] || PROJ_STATUS.planning;
    return `<span class="proj-status" style="--pc:${s.color}">${s.label}</span>`;
  }

  function projNameOptions(selected) {
    const ps = loadProjects().filter((p) => p.status !== 'archived');
    const names = ps.map((p) => p.name);
    let opts = names.map((n) => `<option value="${escapeHtml(n)}" ${n === selected ? 'selected' : ''}>${escapeHtml(n)}</option>`).join('');
    if (selected && !names.includes(selected)) opts = `<option value="${escapeHtml(selected)}" selected>${escapeHtml(selected)} (lama)</option>` + opts;
    return opts;
  }
  function firstProjName() { const ps = loadProjects().filter((p) => p.status !== 'archived'); return ps.length ? ps[0].name : ''; }

  function projCardHtml(p) {
    const pr = projProgress(p);
    const gt = goalTitleOf(p.goalId);
    return `<button type="button" class="proj-card" data-proj-open="${p.id}">
        <span class="proj-ico" style="--pc:${p.color}">${p.icon || '🧩'}</span>
        <span class="proj-card-main">
          <span class="proj-card-head"><span class="proj-card-title">${escapeHtml(p.name)}</span>${projStatusChip(p.status)}</span>
          <span class="proj-card-desc">${gt ? `🎯 ${escapeHtml(gt)} · ` : ''}${escapeHtml(p.description || 'Tanpa deskripsi')}</span>
          <span class="goal-bar"><span style="width:${pr.pct}%;background:${p.color}"></span></span>
          <span class="proj-card-sub"><span>${pr.done}/${pr.total} ${pr.from === 'task' ? 'task' : 'milestone'} · ${pr.pct}%</span>${projDeadlineLabel(p)}</span>
        </span>
        <span class="goal-chev">›</span>
      </button>`;
  }

  function renderProjectListPage() {
    const all = loadProjects();
    const active = all.filter((p) => p.status === 'active').length;
    const done = all.filter((p) => p.status === 'completed').length;
    const soon = all.filter((p) => { const l = projDaysLeft(p); return p.status === 'active' && l !== null && l >= 0 && l <= 7; }).length;
    let list = all.filter((p) => (projFilter === 'all' ? p.status !== 'archived' : p.status === projFilter));
    const q = projSearch.trim().toLowerCase();
    if (q) list = list.filter((p) => `${p.name} ${p.description || ''} ${p.category || ''}`.toLowerCase().includes(q));
    const chips = PROJ_FILTERS.map((f) => `<button type="button" class="goal-chip${projFilter === f.key ? ' on' : ''}" data-proj-filter="${f.key}">${f.label}</button>`).join('');
    const cards = list.length
      ? list.map(projCardHtml).join('')
      : `<div class="proj-empty"><span>${q ? '🔍' : '🗂️'}</span><b>${q ? 'Project tidak ditemukan' : 'Belum ada project'}</b><p>${q ? 'Coba kata kunci lain atau ubah filter.' : 'Tekan tombol + untuk membuat project pertamamu.'}</p></div>`;
    return `<div class="goals-page">
        <div class="proj-stat-row">
          <div class="proj-stat"><b>${active}</b><span>Project Aktif</span></div>
          <div class="proj-stat ok"><b>${done}</b><span>Selesai</span></div>
          <div class="proj-stat warn"><b>${soon}</b><span>Mendekati Deadline</span></div>
        </div>
        <label class="task-search proj-search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input type="search" data-proj-search placeholder="Cari project…" value="${escapeHtml(projSearch)}" autocomplete="off" /></label>
        <div class="goal-chips">${chips}</div>
        <div class="proj-list">${cards}</div>
        <button type="button" class="goal-add-btn" data-proj-add>+ Tambah Project</button>
      </div>`;
  }

  function renderProjectDetailPage() {
    const p = loadProjects().find((x) => x.id === projDetailId);
    if (!p) { projPage = 'list'; return renderProjectListPage(); }
    const pr = projProgress(p);
    const tabs = PROJ_TABS.map((t) => `<button type="button" class="jadwal-seg-btn proj-tab-btn${projTab === t.key ? ' active' : ''}" data-proj-tab="${t.key}">${t.label}</button>`).join('');
    let body = '';
    if (projTab === 'overview') {
      const left = projDaysLeft(p);
      const stats = `<div class="proj-stat-row">
          <div class="proj-stat"><b>${pr.pct}%</b><span>Progress</span></div>
          <div class="proj-stat ok"><b>${pr.done}/${pr.total}</b><span>Task selesai</span></div>
          <div class="proj-stat warn"><b>${left === null ? '—' : (left < 0 ? `${Math.abs(left)} lewat` : `${left} hr`)}</b><span>Sisa waktu</span></div>
        </div>`;
      const ms = (p.milestones || []).length
        ? `<div class="goal-detail-card proj-blk"><h4>Milestone</h4>${p.milestones.map((m) => `<label class="goal-ms${m.done ? ' done' : ''}"><input type="checkbox" data-proj-ms="${p.id}:${m.id}"${m.done ? ' checked' : ''} /><span>${escapeHtml(m.text)}</span></label>`).join('')}</div>`
        : `<div class="goal-detail-card proj-blk"><h4>Milestone</h4><p class="proj-hint">Belum ada milestone. Tambahkan lewat menu ⋮ → Edit, atau biarkan progress dihitung dari task.</p></div>`;
      const acts = (p.activity || []).length
        ? `<div class="goal-detail-card proj-blk"><h4>Aktivitas Terbaru</h4><div class="proj-act">${p.activity.slice(0, 8).map((a) => `<div class="proj-act-row"><span>${escapeHtml(a.text)}</span><em>${projTimeAgo(a.at)}</em></div>`).join('')}</div></div>`
        : `<div class="goal-detail-card proj-blk"><h4>Aktivitas Terbaru</h4><p class="proj-hint">Aktivitas akan tercatat saat kamu menambah task, catatan, atau menandai milestone.</p></div>`;
      body = `${stats}
        <div class="goal-detail-card proj-blk"><h4>Deskripsi</h4><p>${escapeHtml(p.description || '—')}</p></div>
        ${ms}${acts}`;
    } else if (projTab === 'task') {
      const ts = projTasks(p.name);
      const flt = projTaskFilter === 'done' ? ts.filter((t) => t.done) : projTaskFilter === 'open' ? ts.filter((t) => !t.done) : ts;
      const sub = `<div class="goal-chips">
          <button type="button" class="goal-chip${projTaskFilter === 'all' ? ' on' : ''}" data-proj-tfilter="all">Semua (${ts.length})</button>
          <button type="button" class="goal-chip${projTaskFilter === 'open' ? ' on' : ''}" data-proj-tfilter="open">Belum (${ts.filter((t) => !t.done).length})</button>
          <button type="button" class="goal-chip${projTaskFilter === 'done' ? ' on' : ''}" data-proj-tfilter="done">Selesai (${ts.filter((t) => t.done).length})</button>
        </div>`;
      const rows = flt.length
        ? flt.map((t) => `<label class="proj-task${t.done ? ' done' : ''}"><input type="checkbox" data-proj-task="${t.id}"${t.done ? ' checked' : ''} /><span class="proj-task-main"><span class="proj-task-title">${escapeHtml(t.title)}</span><span class="proj-task-meta">${escapeHtml(taskDateRead(t.date || ''))}${t.priority === 'high' ? ' · ⚡ Tinggi' : ''}</span></span></label>`).join('')
        : `<p class="proj-hint">${ts.length ? 'Tidak ada task pada filter ini.' : 'Belum ada task yang terhubung ke project ini.'}</p>`;
      const add = projTaskAdding
        ? `<form class="proj-inline" id="projTaskForm"><input name="title" placeholder="Judul task baru" required maxlength="90" /><input name="date" type="date" value="${taskTodayIso()}" /><button type="submit" class="proj-inline-go">Tambah</button></form>`
        : `<button type="button" class="goal-add-btn ghost" data-proj-task-add>+ Tambah Task</button>`;
      body = `${sub}<div class="goal-detail-card proj-blk">${rows}</div>${add}`;
    } else if (projTab === 'notes') {
      const notes = p.notes || [];
      const rows = notes.length
        ? notes.map((n) => `<div class="proj-note"><div class="goal-detail-card proj-blk note"><p>${escapeHtml(n.text)}</p><em>${projTimeAgo(n.at)}</em></div><button type="button" class="proj-del" data-proj-note-del="${n.id}" aria-label="Hapus catatan">×</button></div>`).join('')
        : '<p class="proj-hint">Belum ada catatan untuk project ini.</p>';
      const add = projNoteAdding
        ? `<form class="proj-inline col" id="projNoteForm"><textarea name="text" placeholder="Tulis catatan…" required maxlength="600" rows="3"></textarea><button type="submit" class="proj-inline-go">Simpan Catatan</button></form>`
        : `<button type="button" class="goal-add-btn ghost" data-proj-note-add>+ Tambah Catatan</button>`;
      body = `<div>${rows}</div>${add}`;
    } else {
      const files = p.files || [];
      const rows = files.length
        ? files.map((f) => `<div class="proj-file"><span class="proj-file-ico">🔗</span><a href="${escapeHtml(f.url || '#')}" target="_blank" rel="noopener">${escapeHtml(f.name)}</a><button type="button" class="proj-del" data-proj-file-del="${f.id}" aria-label="Hapus file">×</button></div>`).join('')
        : '<p class="proj-hint">Belum ada file atau link terkait.</p>';
      const add = projFileAdding
        ? `<div>${projFileErr ? `<p class="proj-err">${escapeHtml(projFileErr)}</p>` : ''}<form class="proj-inline col" id="projFileForm"><input name="name" placeholder="Nama file / link" required maxlength="80" /><input name="url" placeholder="https://…" required /><button type="submit" class="proj-inline-go">Simpan Link</button></form></div>`
        : `<button type="button" class="goal-add-btn ghost" data-proj-file-add>+ Tambah File/Link</button>`;
      body = `<div class="goal-detail-card proj-blk">${rows}</div>${add}`;
    }
    const menu = projMenuOpen
      ? `<div class="proj-menu"><button type="button" data-proj-edit="${p.id}">✏️ Edit Project</button><button type="button" data-proj-archive="${p.id}">${p.status === 'archived' ? '♻️ Pulihkan' : '🗄️ Arsipkan'}</button><button type="button" class="danger" data-proj-del="${p.id}">🗑️ Hapus</button></div>`
      : '';
    return `<div class="goals-page">
        <div class="task-detail-top">
          <button type="button" class="task-back" data-proj-back aria-label="Kembali">←</button>
          <span class="proj-ico lg" style="--pc:${p.color}">${p.icon || '🧩'}</span>
          <span class="proj-detail-title"><b>${escapeHtml(p.name)}</b><span>${projStatusChip(p.status)} ${p.category ? escapeHtml(p.category) : ''}</span></span>
          <button type="button" class="icon-button proj-menu-btn" data-proj-menu aria-label="Menu aksi">⋮</button>
        </div>
        ${menu}
        <div class="proj-meta-row"><span>📅 Mulai ${escapeHtml(taskDateRead(p.start || p.createdAt || ''))}</span><span>⏳ ${p.deadline ? escapeHtml(taskDateRead(p.deadline)) : '—'}</span><span>✅ ${pr.done}/${pr.total}</span></div>
        ${p.goalId ? `<div class="proj-goal-row">🎯 Goal: <button type="button" class="goal-proj-chip link" data-goal-from-proj="${p.goalId}">${escapeHtml(goalTitleOf(p.goalId) || 'Goal (terhapus)')}</button></div>` : '<div class="proj-goal-row">🎯 Belum terhubung ke goal — edit project untuk memilih goal.</div>'}
        <div class="goal-bar big"><span style="width:${pr.pct}%;background:${p.color}"></span></div>
        <div class="jadwal-seg proj-tabs">${tabs}</div>
        ${body}
      </div>`;
  }

  function renderProjectFormPage() {
    const editing = projFormId ? loadProjects().find((x) => x.id === projFormId) : null;
    if (editing) projFormSel = { status: editing.status, icon: editing.icon || '🧩', color: editing.color || '#6a564a' };
    const d = editing ? { name: editing.name, description: editing.description || '', category: editing.category || '', start: editing.start || '', deadline: editing.deadline || '', goalId: editing.goalId || '', err: '' } : projFormDraft;
    if (!editing) projFormDraft = d;
    const goals = loadGoals();
    const goalOptions = goals.map((g) => `<option value="${g.id}" ${d.goalId === g.id ? 'selected' : ''}>${escapeHtml(g.title)} · ${GOAL_TERMS[goalTermOf(g)].label}</option>`).join('');
    const icons = PROJ_ICONS.map((i) => `<button type="button" class="goal-cat-chip${projFormSel.icon === i ? ' on' : ''}" data-proj-icon="${i}" style="font-size:17px">${i}</button>`).join('');
    const colors = PROJ_COLORS.map((c) => `<button type="button" class="proj-color${projFormSel.color === c ? ' on' : ''}" data-proj-color="${c}" style="--cc:${c}" aria-label="warna ${c}"></button>`).join('');
    const statuses = Object.entries(PROJ_STATUS).map(([k, s]) => `<button type="button" class="goal-cat-chip${projFormSel.status === k ? ' on' : ''}" data-proj-status="${k}"><span class="goal-cat-dot" style="background:${s.color}"></span>${s.label}</button>`).join('');
    return `<div class="goals-page"><button type="button" class="goal-back-btn" data-proj-form-back>← Kembali</button>
      <div class="goal-add-card">
        <h3>${editing ? 'Edit Project' : 'Tambah Project'}</h3>
        ${d.err ? `<p class="proj-err">${escapeHtml(d.err)}</p>` : ''}
        <form id="projForm" novalidate>
          ${goals.length ? '<label class="goal-field"><span>Goals *</span><select name="goalId" required><option value="">— Pilih goal —</option>' + goalOptions + '</select></label>' : '<p class="proj-err">Belum ada Goals. Project tidak bisa dibuat tanpa goal — buat goal dulu di menu Goals.</p>'}
          <label class="goal-field"><span>Nama Project *</span><input name="name" required maxlength="70" value="${escapeHtml(d.name)}" placeholder="cth. Website Toko Online" /></label>
          <label class="goal-field"><span>Deskripsi</span><textarea name="description" rows="3" maxlength="400" placeholder="Ringkasan singkat project…">${escapeHtml(d.description)}</textarea></label>
          <div class="proj-form-grid"><label class="goal-field"><span>Tanggal Mulai</span><input name="start" type="date" value="${escapeHtml(d.start)}" /></label>
          <label class="goal-field"><span>Deadline</span><input name="deadline" type="date" value="${escapeHtml(d.deadline)}" /></label></div>
          <label class="goal-field"><span>Kategori</span><input name="category" maxlength="30" value="${escapeHtml(d.category)}" placeholder="cth. Bisnis, Belajar…" list="projCats" /><datalist id="projCats"><option value="Bisnis"></option><option value="Teknis"></option><option value="Pendidikan"></option><option value="Rumah"></option><option value="Acara"></option><option value="Keuangan"></option></datalist></label>
          <div class="goal-field"><span>Icon</span><div class="goal-cat-row">${icons}</div></div>
          <div class="goal-field"><span>Warna</span><div class="proj-colors">${colors}</div></div>
          <div class="goal-field"><span>Status</span><div class="goal-cat-row">${statuses}</div></div>
          <button type="submit" class="primary-button goal-save" ${goals.length ? '' : 'disabled'}>${editing ? 'Simpan Perubahan' : 'Simpan Project'}</button>
        </form>
      </div></div>`;
  }

  function renderProjectView() {
    if (projPage === 'form') return renderProjectFormPage();
    if (projPage === 'detail' && projDetailId) return renderProjectDetailPage();
    return renderProjectListPage();
  }

  function renderProjectTaskView() {
    const projects = loadProjects().filter((p) => p.status !== 'archived');
    const tasks = loadTasks();
    const nameOf = (t) => (t.project || '').trim();
    const groups = projects.map((p) => {
      const ts = tasks.filter((t) => nameOf(t).toLowerCase() === p.name.trim().toLowerCase());
      return { p, ts, done: ts.filter((t) => t.done).length };
    });
    const noProj = tasks.filter((t) => !nameOf(t) || !groups.some((g) => g.p.name.trim().toLowerCase() === nameOf(t).toLowerCase()));
    const row = (t) => `
      <label class="proj-task${t.done ? ' done' : ''}">
        <input type="checkbox" data-task-toggle="${t.id}"${t.done ? ' checked' : ''} />
        <span class="proj-task-main">
          <span class="proj-task-title">${escapeHtml(t.title)}</span>
          <span class="proj-task-meta">${escapeHtml(taskDateRead(t.date || ''))}${t.time ? ` · ⏱ ${escapeHtml(t.time)}` : ''}${t.priority === 'high' ? ' · ⚡ Tinggi' : ''}</span>
        </span>
      </label>`;
    const cards = groups.map((g) => {
      const pct = g.ts.length ? Math.round((g.done / g.ts.length) * 100) : 0;
      const gt = goalTitleOf(g.p.goalId);
      return `<section class="proj-blk goal-detail-card pt-group">
        <header class="pt-group-head">
          <span class="pt-group-icon" style="background:${escapeHtml(g.p.color || '#6a564a')}">${g.p.icon || '🧩'}</span>
          <div class="pt-group-title">
            <strong>${escapeHtml(g.p.name)}</strong>
            <span class="pt-group-sub">${gt ? `🎯 ${escapeHtml(gt)} · ` : ''}${g.done}/${g.ts.length} selesai · ${pct}%</span>
          </div>
          <span class="pt-group-actions">
            <button type="button" class="ghost-button" data-pt-add-task="${g.p.id}">+ Task</button>
            <button type="button" class="ghost-button" data-proj-open="${g.p.id}">Buka Project</button>
          </span>
        </header>
        ${g.ts.length ? g.ts.map(row).join('') : '<p class="proj-hint">Belum ada task di project ini.</p>'}
      </section>`;
    }).join('');
    const orphan = noProj.length ? `<section class="proj-blk goal-detail-card pt-group pt-orphan">
        <header class="pt-group-head">
          <span class="pt-group-icon" style="background:#9a8f86">⚠️</span>
          <div class="pt-group-title"><strong>Belum ada Project</strong><span class="pt-group-sub">Semua task harus berdasarkan project — pindahkan di bawah</span></div>
        </header>
        ${noProj.map((t) => `<div class="pt-orphan-row">
          <label class="proj-task${t.done ? ' done' : ''}">
            <input type="checkbox" data-task-toggle="${t.id}"${t.done ? ' checked' : ''} />
            <span class="proj-task-main"><span class="proj-task-title">${escapeHtml(t.title)}</span></span>
          </label>
          <select data-pt-move="${t.id}"><option value="">Pindahkan ke…</option>${projNameOptions('')}</select>
        </div>`).join('')}
      </section>` : '';
    const totalTasks = groups.reduce((a, g) => a + g.ts.length, 0);
    const totalDone = groups.reduce((a, g) => a + g.done, 0);
    const empty = !projects.length
      ? '<p class="task-empty">Belum ada project. Buat dulu lewat menu Goals and Habit → Project.</p>'
      : (!totalTasks && !noProj.length ? '<p class="task-empty">Belum ada task yang terhubung ke project.</p>' : '');
    return `<section class="task-page pt-page">
      <div class="task-card task-progress-card">
        <div class="task-progress-head">
          <strong>${totalDone} / ${totalTasks + noProj.length} task selesai</strong>
          <span class="task-pct">${totalTasks + noProj.length ? Math.round((totalDone / (totalTasks + noProj.length)) * 100) : 0}%</span>
        </div>
        <div class="task-bar"><span style="width:${totalTasks + noProj.length ? Math.round((totalDone / (totalTasks + noProj.length)) * 100) : 0}%"></span></div>
      </div>
      ${empty}${cards}${orphan}
    </section>`;
  }

  function projFormValues(form) {
    return { name: form.querySelector('[name=name]').value.trim(), description: form.querySelector('[name=description]').value.trim(), category: form.querySelector('[name=category]').value.trim(), start: form.querySelector('[name=start]').value, deadline: form.querySelector('[name=deadline]').value, goalId: form.querySelector('[name=goalId]')?.value || '' };
  }

  function submitProjectForm(form) {
    const v = projFormValues(form);
    if (!loadGoals().length) { projFormDraft = { ...v, err: 'Project tidak bisa dibuat tanpa Goals. Buat goal dulu di menu Goals.' }; renderShell(); return; }
    if (!v.goalId) { projFormDraft = { ...v, err: 'Pilih Goals terlebih dahulu — project harus mengikuti goal.' }; renderShell(); return; }
    if (!v.name) { projFormDraft = { ...v, err: 'Nama project wajib diisi.' }; renderShell(); return; }
    if (v.start && v.deadline && v.deadline < v.start) { projFormDraft = { ...v, err: 'Deadline tidak boleh sebelum tanggal mulai.' }; renderShell(); return; }
    const items = loadProjects();
    if (projFormId) {
      const p = items.find((x) => x.id === projFormId);
      if (p) { Object.assign(p, { name: v.name, description: v.description, category: v.category, start: v.start || p.start, deadline: v.deadline, goalId: v.goalId || p.goalId, status: projFormSel.status, icon: projFormSel.icon, color: projFormSel.color }); projLog(p, 'Detail project diperbarui'); }
      saveProjects(items);
      projFormId = null;
      projPage = 'detail';
      renderShell();
      return;
    }
    const p = { id: `p${Date.now()}`, ...v, status: projFormSel.status, icon: projFormSel.icon, color: projFormSel.color, createdAt: taskTodayIso(), milestones: [], notes: [], files: [], activity: [] };
    projLog(p, 'Project dibuat');
    items.push(p);
    saveProjects(items);
    projFormDraft = { name: '', description: '', category: '', start: '', deadline: '', goalId: '', err: '' };
    projPage = 'list';
    renderShell();
  }

  function handleProjectAction(btn) {
    if (btn.matches('[data-proj-add]')) { projFormId = null; projFormDraft = { name: '', description: '', category: '', start: taskTodayIso(), deadline: '', goalId: '', err: '' }; projFormSel = { status: 'active', icon: '🧩', color: '#6a564a' }; projPage = 'form'; renderShell(); setTimeout(() => document.querySelector('#projForm [name=name]')?.focus(), 30); return true; }
    if (btn.matches('[data-proj-form-back]')) { projPage = projFormId ? 'detail' : 'list'; renderShell(); return true; }
    if (btn.matches('[data-proj-filter]')) { projFilter = btn.dataset.projFilter; renderShell(); return true; }
    if (btn.matches('[data-proj-open]')) { projDetailId = btn.dataset.projOpen; projPage = 'detail'; projTab = 'overview'; projMenuOpen = false; projTaskAdding = projNoteAdding = projFileAdding = false; activeView = 'project'; state.selectedView = 'project'; renderShell(); return true; }
    if (btn.matches('[data-proj-back]')) { projPage = 'list'; projMenuOpen = false; renderShell(); return true; }
    if (btn.matches('[data-proj-tab]')) { projTab = btn.dataset.projTab; projMenuOpen = false; renderShell(); return true; }
    if (btn.matches('[data-proj-tfilter]')) { projTaskFilter = btn.dataset.projTfilter; renderShell(); return true; }
    if (btn.matches('[data-proj-menu]')) { projMenuOpen = !projMenuOpen; renderShell(); return true; }
    if (btn.matches('[data-proj-icon]')) { captureProjForm(); projFormSel.icon = btn.dataset.projIcon; renderShell(); return true; }
    if (btn.matches('[data-proj-color]')) { captureProjForm(); projFormSel.color = btn.dataset.projColor; renderShell(); return true; }
    if (btn.matches('[data-proj-status]')) { captureProjForm(); projFormSel.status = btn.dataset.projStatus; renderShell(); return true; }
    if (btn.matches('[data-proj-edit]')) { projFormId = btn.dataset.projEdit; projFormDraft = { name: '', description: '', category: '', start: '', deadline: '', goalId: '', err: '' }; projPage = 'form'; renderShell(); return true; }
    if (btn.matches('[data-proj-archive]')) {
      const items = loadProjects(); const p = items.find((x) => x.id === btn.dataset.projArchive);
      if (p) { p.status = p.status === 'archived' ? 'active' : 'archived'; projLog(p, p.status === 'archived' ? 'Project diarsipkan' : 'Project dipulihkan'); saveProjects(items); projMenuOpen = false; renderShell(); }
      return true;
    }
    if (btn.matches('[data-proj-del]')) {
      const items = loadProjects(); const p = items.find((x) => x.id === btn.dataset.projDel);
      if (p && window.confirm(`Hapus project "${p.name}"? Task yang terhubung tidak ikut terhapus.`)) {
        saveProjects(items.filter((x) => x.id !== p.id));
        projMenuOpen = false; projPage = 'list'; renderShell();
      } else { projMenuOpen = false; renderShell(); }
      return true;
    }
    if (btn.matches('[data-proj-task-add]')) { projTaskAdding = true; renderShell(); setTimeout(() => document.querySelector('#projTaskForm [name=title]')?.focus(), 30); return true; }
    if (btn.matches('[data-proj-note-add]')) { projNoteAdding = true; renderShell(); setTimeout(() => document.querySelector('#projNoteForm [name=text]')?.focus(), 30); return true; }
    if (btn.matches('[data-proj-file-add]')) { projFileAdding = true; renderShell(); setTimeout(() => document.querySelector('#projFileForm [name=name]')?.focus(), 30); return true; }
    if (btn.matches('[data-proj-note-del]')) {
      const items = loadProjects(); const p = items.find((x) => x.id === projDetailId);
      if (p) { p.notes = (p.notes || []).filter((n) => n.id !== btn.dataset.projNoteDel); saveProjects(items); renderShell(); }
      return true;
    }
    if (btn.matches('[data-proj-file-del]')) {
      const items = loadProjects(); const p = items.find((x) => x.id === projDetailId);
      if (p) { p.files = (p.files || []).filter((f) => f.id !== btn.dataset.projFileDel); projLog(p, 'File/link dihapus'); saveProjects(items); renderShell(); }
      return true;
    }
    if (btn.matches('[data-goal-from-proj]')) { goalsDetailId = btn.dataset.goalFromProj; goalsPage = 'detail'; activeView = 'goals'; state.selectedView = 'goals'; saveState(); renderShell(); return true; }
    if (btn.matches('[data-pt-add-task]')) { activeView = 'project'; state.selectedView = 'project'; projDetailId = btn.dataset.ptAddTask; projPage = 'detail'; projTab = 'tasks'; projTaskAdding = true; saveState(); renderShell(); setTimeout(() => document.querySelector('#projTaskForm [name=title]')?.focus(), 60); return true; }
    return false;
  }

  function captureProjForm() {
    const form = document.querySelector('#projForm');
    if (form && !projFormId) projFormDraft = { ...projFormValues(form), err: '' };
  }

  function handleProjectChange(el) {
    if (el.matches('[data-proj-ms]')) {
      const [pid, mid] = el.dataset.projMs.split(':');
      const items = loadProjects(); const p = items.find((x) => x.id === pid);
      const m = p && (p.milestones || []).find((x) => x.id === mid);
      if (m) { m.done = el.checked; projLog(p, `${m.done ? '✓' : '↺'} Milestone "${m.text}" ${m.done ? 'selesai' : 'dibuka lagi'}`); saveProjects(items); renderShell(); }
      return true;
    }
    if (el.matches('[data-proj-task]')) {
      const tasks = loadTasks(); const t = tasks.find((x) => x.id === el.dataset.projTask);
      if (t) { t.done = el.checked; saveTasks(); const items = loadProjects(); const p = items.find((x) => x.id === projDetailId); if (p) { projLog(p, `${el.checked ? '✓' : '↺'} Task "${t.title}" ${el.checked ? 'selesai' : 'dibuka lagi'}`); saveProjects(items); } renderShell(); }
      return true;
    }
    if (el.matches('[data-proj-search]')) {
      projSearch = el.value;
      const list = dom.content.querySelector('.proj-list');
      if (list) {
        const all = loadProjects();
        const q = projSearch.trim().toLowerCase();
        const filtered = all.filter((p) => (projFilter === 'all' ? p.status !== 'archived' : p.status === projFilter))
          .filter((p) => !q || `${p.name} ${p.description || ''} ${p.category || ''}`.toLowerCase().includes(q));
        list.innerHTML = filtered.length
          ? filtered.map(projCardHtml).join('')
          : `<div class="proj-empty"><span>🔍</span><b>Project tidak ditemukan</b><p>Coba kata kunci lain atau ubah filter.</p></div>`;
      }
      return true;
    }
    return false;
  }

  function submitProjectSubForm(form) {
    const items = loadProjects();
    const p = items.find((x) => x.id === projDetailId);
    if (!p) return;
    if (form.id === 'projTaskForm') {
      const title = form.querySelector('[name=title]').value.trim();
      const date = form.querySelector('[name=date]').value || taskTodayIso();
      if (!title) return;
      const tasks = loadTasks();
      tasks.push({ id: `t${Date.now()}`, title, project: p.name, tag: '', time: '', priority: 'med', date, done: false });
      saveTasks();
      projLog(p, `＋ Task "${title}" ditambahkan`);
      saveProjects(items);
      projTaskAdding = false;
      renderShell();
    } else if (form.id === 'projNoteForm') {
      const text = form.querySelector('[name=text]').value.trim();
      if (!text) return;
      p.notes = p.notes || [];
      p.notes.unshift({ id: `pn${Date.now()}`, text, at: Date.now() });
      projLog(p, '📝 Catatan baru ditambahkan');
      saveProjects(items);
      projNoteAdding = false;
      renderShell();
    } else if (form.id === 'projFileForm') {
      const name = form.querySelector('[name=name]').value.trim();
      const url = form.querySelector('[name=url]').value.trim();
      if (!name || !url) { projFileErr = 'Nama dan URL wajib diisi.'; renderShell(); return; }
      if (!/^https?:\/\/.+/i.test(url)) { projFileErr = 'URL harus diawali http:// atau https://'; renderShell(); return; }
      p.files = p.files || [];
      p.files.push({ id: `pf${Date.now()}`, name, url });
      projLog(p, `🔗 Link "${name}" ditambahkan`);
      saveProjects(items);
      projFileAdding = false;
      projFileErr = '';
      renderShell();
    }
  }

  /* ============ MODUL CATATAN (notes: capture, editor rich, template) ============ */
  const NOTES_STORE_KEY = 'miaw-tracker.notes.v1';
  const NOTE_CATS = ['Inbox', 'Ide', 'Belajar', 'Jurnal', 'Bisnis', 'Arsip'];
  const NOTE_TABS = ['Semua', ...NOTE_CATS];
  const NOTE_SORTS = [
    { key: 'updated', label: 'Terbaru diperbarui' },
    { key: 'created', label: 'Terbaru dibuat' },
    { key: 'az', label: 'A–Z' },
  ];
  let notePage = 'list'; // list | detail | editor | templates
  let noteId = null;
  let noteTab = 'Semua';
  let noteSearch = '';
  let noteSort = 'updated';
  let noteTagFilter = null;
  let noteMenuId = null;      // bottom sheet pada card list
  let noteDetailMenu = false; // bottom sheet pada detail
  let noteSavedTimer = null;

  const NOTE_TEMPLATES = [
    { key: 'kosong', label: 'Catatan Kosong', icon: '📄', desc: 'Halaman bersih untuk mulai dari nol.', body: '' },
    { key: 'ide', label: 'Ide', icon: '💡', desc: 'Tangkap ide beserta alasan dan langkah awal.', body: '<h3>Ide saya</h3><p></p><h3>Mengapa ini menarik?</h3><p></p><ul><li>✅ Langkah pertama:</li><li>✅ Yang perlu dipelajari:</li></ul>' },
    { key: 'belajar', label: 'Catatan Belajar', icon: '📚', desc: 'Topik, poin penting, dan sumber.', body: '<h3>Topik</h3><p></p><h3>Poin penting</h3><ul><li></li></ul><h3>Sumber</h3><p></p><h3>Review berikutnya</h3><p></p>' },
    { key: 'jurnal', label: 'Jurnal Harian', icon: '🌙', desc: 'Refleksi singkat lima pertanyaan.', body: '<h3>Bagaimana perasaanmu hari ini?</h3><p></p><h3>Apa yang terjadi hari ini?</h3><p></p><h3>Apa yang kamu syukuri?</h3><p></p><h3>Apa yang kamu pelajari?</h3><p></p><h3>Apa fokusmu besok?</h3><p></p>' },
    { key: 'bisnis', label: 'Catatan Bisnis', icon: '💼', desc: 'Tujuan, ide, risiko, dan langkah.', body: '<h3>Tujuan</h3><p></p><h3>Ide & peluang</h3><ul><li></li></ul><h3>Risiko</h3><ul><li></li></ul><h3>Langkah berikutnya</h3><ul><li>✅ </li></ul>' },
  ];

  function noteNewId() { return 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function noteNow() { return Date.now(); }

  function noteSeedList() {
    const now = Date.now();
    const H = 3600000, D = 86400000;
    return [
      { id: 'ns1', title: 'Strategi Marketing Batu Bata', category: 'Bisnis', tags: ['marketing', 'batu-bata'], pinned: true, favorite: true, archived: false, prevCat: 'Bisnis',
        created: now - 6 * D, updated: now - 2 * H,
        body: '<h3>Posisi pasar</h3><p>Fokus pada <b>pemasok lokal</b> untuk proyek rumah tinggal dan renovasi. Keunggulan: pengiriman cepat dan harga transparan.</p><ul><li>✅ Bangun presence Google Bisnis</li><li>Katalog harga tetap di WhatsApp</li><li>Testimoni tukang &amp; mandor</li></ul><h3>Kanal</h3><p>Facebook Marketplace, grup proyek lokal, dan referral tukang langganan.</p><blockquote>Target: 10 pelanggan baru per bulan dari kanal organik.</blockquote>' },
      { id: 'ns2', title: 'Ide Aplikasi Keuangan Pribadi', category: 'Ide', tags: ['aplikasi', 'keuangan'], pinned: false, favorite: true, archived: false, prevCat: 'Ide',
        created: now - 4 * D, updated: now - 1 * D,
        body: '<p>Aplikasi catat pengeluaran <b>3 detik per transaksi</b> — lebih cepat dari membuka kalkulator.</p><h3>Fitur inti</h3><ul><li>Input cepat angka + kategori otomatis</li><li>Grafik mingguan sederhana</li><li>Mode offline penuh</li></ul><h3>MVP</h2><p>Satu layar input, satu layar grafik. Sisanya nanti.</p>' },
      { id: 'ns3', title: 'Belajar Next.js', category: 'Belajar', tags: ['nextjs', 'frontend'], pinned: false, favorite: false, archived: false, prevCat: 'Belajar',
        created: now - 12 * D, updated: now - 3 * D,
        body: '<h3>Poin penting</h3><ul><li><b>App Router</b>: file <code>page.js</code> menentukan route.</li><li>Server Component secara default — <code>\'use client\'</code> hanya bila perlu interaksi.</li><li>Data fetching langsung di komponen, tanpa <code>useEffect</code>.</li></ul><h3>Sumber</h3><p>Dokumentasi resmi nextjs.org/learn + video build UI.</p><h3>Review berikutnya</h3><p>Latihan: bikin halaman detail + metadata SEO.</p>' },
      { id: 'ns4', title: 'Jurnal Harian', category: 'Jurnal', tags: ['refleksi'], pinned: false, favorite: false, archived: false, prevCat: 'Jurnal',
        created: now - 8 * H, updated: now - 40 * 60000,
        body: '<h3>Bagaimana perasaanmu hari ini?</h3><p>Cukup baik, agak lelah setelah kerja tapi produktif.</p><h3>Apa yang terjadi hari ini?</h3><p>Selesai merapikan laporan mingguan dan sempat olahraga 20 menit.</p><h3>Apa yang kamu syukuri?</h3><ul><li>Cuaca cerah pagi tadi</li><li>Doa ibu</li></ul><h3>Apa yang kamu pelajari?</h3><p>Mengerjakan hal sulit di pagi hari terasa lebih ringan.</p><h3>Apa fokusmu besok?</h3><p>Follow-up klien batu bata, lanjut modul Next.js.</p>' },
      { id: 'ns5', title: 'Rencana Tabungan', category: 'Bisnis', tags: ['keuangan', 'target'], pinned: false, favorite: false, archived: false, prevCat: 'Bisnis',
        created: now - 20 * D, updated: now - 5 * D,
        body: '<h3>Target</h3><p>Dana darurat 6 bulan pengeluaran, lalu tabungan equipment kerja.</p><ul><li>Otomasi transfer tiap gajian (sebelum belanja)</li><li>Pisahkan rekening target dan rekening harian</li><li>Evalusi tiap 3 bulan</li></ul><blockquote>Bayar diri sendiri duluan — sisanya baru dipakai.</blockquote>' },
    ];
  }

  function loadNotes() {
    try {
      const raw = localStorage.getItem(scopedKey(NOTES_STORE_KEY));
      if (!raw) { const seeded = noteSeedList(); saveNotes(seeded); return seeded; }
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch { return []; }
  }

  function saveNotes(list) {
    try { localStorage.setItem(scopedKey(NOTES_STORE_KEY), JSON.stringify(list)); } catch { /* ignore */ }
    if (typeof queueRemoteSave === 'function') queueRemoteSave();
  }

  function sanitizeNoteHtml(html) {
    const doc = new DOMParser().parseFromString('<div id="r">' + String(html || '') + '</div>', 'text/html');
    const root = doc.getElementById('r');
    const ALLOW = { A: ['href'], BR: [], CODE: [], EM: [], STRONG: [], B: [], I: [], U: [], S: [], P: [], H2: [], H3: [], BLOCKQUOTE: [], UL: [], OL: [], LI: [], DIV: [], INPUT: ['type', 'checked'], SPAN: [], LABEL: [] };
    const clean = (node) => {
      const kids = [...node.childNodes];
      for (const kid of kids) {
        if (kid.nodeType === 8) { kid.remove(); continue; }
        if (kid.nodeType !== 1) continue;
        const tag = kid.tagName;
        if (!ALLOW[tag]) { kid.replaceWith(...[...kid.childNodes].map((c) => c.cloneNode(true))); continue; }
        for (const attr of [...kid.attributes]) {
          if (!(ALLOW[tag].includes(attr.name) && (tag !== 'A' || /^(https?:|mailto:)/i.test(attr.value)) && (tag !== 'INPUT' || ['type', 'checked'].includes(attr.name)))) kid.removeAttribute(attr.name);
        }
        if (tag === 'A') { kid.setAttribute('rel', 'noopener noreferrer'); kid.setAttribute('target', '_blank'); }
        clean(kid);
      }
    };
    clean(root);
    return root.innerHTML;
  }

  function notePreview(html) {
    const withSp = String(html || '').replace(/<\/(p|h1|h2|h3|li|blockquote|div)>/gi, '</$1> ');
    const doc = new DOMParser().parseFromString(withSp, 'text/html');
    return (doc.body.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 130);
  }

  function noteTimeLabel(ts) {
    if (!ts) return '';
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'baru saja';
    if (m < 60) return `${m} mnt lalu`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} jam lalu`;
    const d = Math.floor(h / 24);
    if (d === 1) return 'kemarin';
    if (d < 7) return `${d} hari lalu`;
    return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(ts));
  }

  function noteFullDate(ts) {
    if (!ts) return '—';
    return new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(ts));
  }

  function noteFind(list, id) { return list.find((x) => x.id === id) || null; }

  function noteParseTags(str) {
    return String(str || '').split(',').map((t) => t.replace(/^#/, '').trim().toLowerCase().replace(/\s+/g, '-')).filter(Boolean).slice(0, 8);
  }

  function noteAllTags() {
    const counts = {};
    for (const n of loadNotes()) { if (!n.archived) for (const t of n.tags || []) counts[t] = (counts[t] || 0) + 1; }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }

  function noteFiltered() {
    let list = loadNotes();
    if (noteTab === 'Semua') list = list.filter((n) => !n.archived);
    else if (noteTab === 'Arsip') list = list.filter((n) => n.archived);
    else list = list.filter((n) => !n.archived && n.category === noteTab);
    if (noteTagFilter) list = list.filter((n) => (n.tags || []).includes(noteTagFilter));
    const q = noteSearch.trim().toLowerCase();
    if (q) {
      list = list.filter((n) => {
        const text = (n.title + ' ' + (n.body || '').replace(/<[^>]+>/g, ' ') + ' ' + (n.tags || []).join(' ')).toLowerCase();
        return text.includes(q);
      });
    }
    if (noteSort === 'az') list = [...list].sort((a, b) => (a.title || '').localeCompare(b.title || '', 'id'));
    else if (noteSort === 'created') list = [...list].sort((a, b) => b.created - a.created);
    else list = [...list].sort((a, b) => b.updated - a.updated);
    if (noteSort !== 'az') list = [...list.filter((n) => n.pinned), ...list.filter((n) => !n.pinned)];
    return list;
  }

  function noteCreate(templateKey) {
    const tpl = NOTE_TEMPLATES.find((t) => t.key === templateKey) || NOTE_TEMPLATES[0];
    const now = noteNow();
    const n = { id: noteNewId(), title: '', category: tpl.key === 'jurnal' ? 'Jurnal' : 'Inbox', tags: [], pinned: false, favorite: false, archived: false, prevCat: 'Inbox', created: now, updated: now, body: tpl.body };
    const list = loadNotes();
    list.unshift(n);
    saveNotes(list);
    return n;
  }

  function noteCapture(text) {
    const now = noteNow();
    const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const n = { id: noteNewId(), title: text, category: 'Inbox', tags: [], pinned: false, favorite: false, archived: false, prevCat: 'Inbox', created: now, updated: now, body: `<p>${esc}</p>` };
    const list = loadNotes();
    list.unshift(n);
    saveNotes(list);
    return n;
  }

  function noteSetField(id, patch, opts) {
    const list = loadNotes();
    const n = noteFind(list, id);
    if (!n) return null;
    Object.assign(n, patch);
    if (!(opts && opts.silent)) n.updated = noteNow();
    saveNotes(list);
    return n;
  }

  function noteRenderTags(n) {
    return (n.tags || []).map((t) => `<span class="note-tag">#${escapeHtml(t)}</span>`).join(' ');
  }

  function renderNotesView() {
    if (notePage === 'templates') return renderNoteTemplatesPage();
    if (notePage === 'editor' && noteId) return renderNoteEditorPage();
    if (notePage === 'detail' && noteId) return renderNoteDetailPage();
    return renderNoteListPage();
  }

  function noteCardsHtml(list) {
    const total = list.length;
    if (!total) return '';
    return list.map((n) => `<div class="note-card${n.pinned ? ' pin' : ''}">
          <button type="button" class="note-card-main" data-note-open="${n.id}">
            <div class="note-card-head"><b>${n.pinned ? '📌 ' : ''}${n.favorite ? '⭐ ' : ''}${escapeHtml(n.title || 'Tanpa judul')}</b></div>
            ${n.body ? `<p class="note-card-prev">${escapeHtml(notePreview(n.body))}</p>` : '<p class="note-card-prev dim">(kosong)</p>'}
            <div class="note-card-foot"><span class="note-cat ${escapeHtml(n.category)}">${escapeHtml(n.category)}</span><span class="note-card-tags">${noteRenderTags(n)}</span></div>
            <div class="note-card-time">Diperbarui ${noteTimeLabel(n.updated)}</div>
          </button>
          <button type="button" class="note-card-menu" data-note-menu="${n.id}" aria-label="Aksi catatan">⋮</button>
        </div>`).join('');
  }

  function noteEmptyHtml(anyExisting) {
    return `<div class="note-empty"><span>🗒️</span><b>${anyExisting ? 'Tidak ada hasil' : 'Belum ada catatan'}</b><p>${anyExisting ? 'Coba kata kunci lain atau ganti tab kategori.' : 'Tekan “+ Catatan Baru” untuk mulai menulis, atau tangkap ide lewat kotak cepat di atas.'}</p></div>`;
  }

  function renderNoteListPage() {
    const list = noteFiltered();
    const anyExisting = loadNotes().some((n) => !n.archived);
    const tabs = NOTE_TABS.map((t) => `<button type="button" class="goal-chip note-tab${noteTab === t ? ' on' : ''}" data-note-tab="${t}">${t}</button>`).join('');
    const tags = noteAllTags();
    const tagRow = tags.length
      ? `<div class="note-tag-row">${tags.map(([t, c]) => `<button type="button" class="note-tag fil${noteTagFilter === t ? ' on' : ''}" data-note-tagfil="${escapeHtml(t)}">#${escapeHtml(t)} <b>${c}</b></button>`).join('')}</div>`
      : '';
    const cards = list.length ? noteCardsHtml(list) : noteEmptyHtml(anyExisting);
    const sheet = noteMenuId ? noteActionSheet(noteFind(loadNotes(), noteMenuId)) : '';
    return `<div class="notes-page">
        <form class="note-capture" id="noteCaptureForm" autocomplete="off"><input name="q" placeholder="⚡ Tangkap cepat, tekan Enter…" maxlength="120" /><button type="submit" class="note-capture-go" aria-label="Simpan catatan cepat">+</button></form>
        <label class="task-search note-search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input type="search" data-note-search placeholder="Cari catatan…" value="${escapeHtml(noteSearch)}" autocomplete="off" /></label>
        <div class="note-tabs">${tabs}</div>
        ${tagRow}
        <div class="note-sortrow"><span>${list.length} catatan</span>
          <select data-note-sort aria-label="Urutkan catatan">${NOTE_SORTS.map((s) => `<option value="${s.key}"${noteSort === s.key ? ' selected' : ''}>${s.label}</option>`).join('')}</select></div>
        <div class="note-list">${cards}</div>
        <button type="button" class="note-fab" data-note-new aria-label="Catatan baru">+</button>
        ${sheet}
      </div>`;
  }

  function noteActionSheet(n) {
    if (!n) return '';
    return `<div class="note-sheet-wrap" data-note-sheet-close>
        <div class="note-sheet">
          <div class="note-sheet-grip"></div>
          <div class="note-sheet-head"><b>${escapeHtml(n.title || 'Tanpa judul')}</b><button type="button" class="icon-button" data-note-menu-close aria-label="Tutup">✕</button></div>
          <button type="button" class="note-sheet-btn" data-note-pin="${n.id}">${n.pinned ? '📌 Lepas pin' : '📌 Pin catatan'}</button>
          <button type="button" class="note-sheet-btn" data-note-fav="${n.id}">${n.favorite ? '☆ Hapus favorit' : '⭐ Tandai favorit'}</button>
          <button type="button" class="note-sheet-btn" data-note-arch="${n.id}">${n.archived ? '♻️ Pulihkan dari arsip' : '🗄️ Arsipkan'}</button>
          <button type="button" class="note-sheet-btn" data-note-edit="${n.id}">✏️ Edit catatan</button>
          <button type="button" class="note-sheet-btn danger" data-note-del="${n.id}">🗑️ Hapus</button>
        </div>
      </div>`;
  }

  function renderNoteDetailPage() {
    const n = noteFind(loadNotes(), noteId);
    if (!n) { notePage = 'list'; noteId = null; return renderNoteListPage(); }
    const sheet = noteDetailMenu ? noteActionSheet(n) : '';
    return `<div class="notes-page">
        <div class="task-detail-top">
          <button type="button" class="task-back" data-note-back aria-label="Kembali">←</button>
          <span class="proj-detail-title"><b>${n.pinned ? '📌 ' : ''}${escapeHtml(n.title || 'Tanpa judul')}</b><span><span class="note-cat ${escapeHtml(n.category)}">${escapeHtml(n.category)}</span>${n.favorite ? '⭐' : ''}</span></span>
          <button type="button" class="icon-button proj-menu-btn" data-note-dmenu aria-label="Menu aksi">⋮</button>
        </div>
        <p class="note-detail-time">Dibuat ${noteFullDate(n.created)} · Diperbarui ${noteTimeLabel(n.updated)}</p>
        <div class="goal-detail-card note-body">${n.body || '<p class="note-card-prev dim">(catatan kosong)</p>'}</div>
        ${(n.tags || []).length ? `<div class="note-detail-tags">Tag: ${noteRenderTags(n)}</div>` : ''}
        <button type="button" class="primary-button goal-save" data-note-edit2="${n.id}">✏️ Edit Catatan</button>
        ${sheet}
      </div>`;
  }

  function renderNoteTemplatesPage() {
    const cards = NOTE_TEMPLATES.map((t) => `<button type="button" class="note-tpl" data-note-tpl="${t.key}"><span class="note-tpl-ico">${t.icon}</span><span class="note-tpl-main"><b>${t.label}</b><span>${t.desc}</span></span><span class="note-tpl-arrow">›</span></button>`).join('');
    return `<div class="notes-page">
        <div class="task-detail-top">
          <button type="button" class="task-back" data-note-back aria-label="Kembali">←</button>
          <span class="proj-detail-title"><b>Catatan Baru</b><span>Pilih template untuk mulai menulis</span></span>
        </div>
        <div class="note-tpl-list">${cards}</div>
      </div>`;
  }

  function renderNoteEditorPage() {
    const n = noteFind(loadNotes(), noteId);
    if (!n) { notePage = 'list'; noteId = null; return renderNoteListPage(); }
    const cats = NOTE_CATS.filter((c) => c !== 'Arsip').map((c) => `<button type="button" class="goal-chip${n.category === c ? ' on' : ''}" data-note-cat="${c}">${c}</button>`).join('');
    const tb = (cmd, label, arg) => `<button type="button" class="note-tb-btn" data-note-cmd="${cmd}"${arg ? ` data-note-cmd-arg="${arg}"` : ''} aria-label="${label}">${label}</button>`;
    return `<div class="notes-page note-editor-wrap">
        <div class="task-detail-top">
          <button type="button" class="task-back" data-note-back aria-label="Kembali">←</button>
          <span class="proj-detail-title"><b id="noteETop">${escapeHtml(n.title || 'Catatan')}</b><span>Autosave</span></span>
          <span class="note-save-state" id="noteSaveState">Tersimpan ✓</span>
          <button type="button" class="icon-button proj-menu-btn${n.pinned ? ' on' : ''}" data-note-epin="${n.id}" aria-label="Pin">📌</button>
          <button type="button" class="icon-button proj-menu-btn${n.favorite ? ' on' : ''}" data-note-efav="${n.id}" aria-label="Favorit">⭐</button>
        </div>
        <input class="note-e-title" id="noteETitle" data-note-title placeholder="Judul catatan…" value="${escapeHtml(n.title)}" maxlength="120" autocomplete="off" />
        <div class="note-toolbar" role="toolbar">${tb('bold', '<b>B</b>')}${tb('italic', '<i>I</i>')}${tb('h3', '<span class="nb">H</span>')}${tb('insertUnorderedList', '•≡')}${tb('insertOrderedList', '1≡')}${tb('checklist', '☑')}${tb('formatBlock', '❝', 'blockquote')}${tb('link', '🔗')}<span class="note-tb-sep"></span>${tb('undo', '↩')}${tb('redo', '↪')}</div>
        <div class="goal-detail-card note-editor" id="noteEBody" contenteditable="true" data-note-body data-placeholder="Tulis catatan…">${n.body || ''}</div>
        <div class="note-e-meta">
          <div class="goal-chips">${cats}</div>
          <input class="note-e-tags" id="noteETags" data-note-tags placeholder="Tag, pisahkan dengan koma (mis. ide, kerja)" value="${escapeHtml((n.tags || []).join(', '))}" maxlength="80" autocomplete="off" />
        </div>
      </div>`;
  }

  function noteSavedPulse() {
    const el = document.getElementById('noteSaveState');
    if (!el) return;
    el.textContent = 'Menyimpan…';
    el.classList.add('busy');
    clearTimeout(noteSavedTimer);
    noteSavedTimer = setTimeout(() => { el.textContent = 'Tersimpan ✓'; el.classList.remove('busy'); }, 650);
  }

  function noteEditorSave(patch) {
    noteSetField(noteId, patch);
    noteSavedPulse();
  }

  function handleNoteAction(btn) {
    const ds = btn.dataset;
    if (ds.noteNew != null) { notePage = 'templates'; renderShell(); return true; }
    if (ds.noteTab != null) { noteTab = ds.noteTab; notePage = 'list'; renderShell(); return true; }
    if (ds.noteTagfil != null) { noteTagFilter = noteTagFilter === ds.noteTagfil ? null : ds.noteTagfil; renderShell(); return true; }
    if (ds.noteTag != null) { noteTagFilter = ds.noteTag; noteTab = 'Semua'; notePage = 'list'; renderShell(); return true; }
    if (ds.noteOpen != null) { noteId = ds.noteOpen; notePage = 'detail'; noteDetailMenu = false; renderShell(); return true; }
    if (ds.noteMenu != null) { noteMenuId = noteMenuId === ds.noteMenu ? null : ds.noteMenu; renderShell(); return true; }
    if (ds.noteMenuClose != null || ds.noteSheetClose != null) { noteMenuId = null; noteDetailMenu = false; renderShell(); return true; }
    if (ds.noteDmenu != null) { noteDetailMenu = !noteDetailMenu; renderShell(); return true; }
    if (ds.noteBack != null) { notePage = 'list'; noteId = null; noteMenuId = null; noteDetailMenu = false; renderShell(); return true; }
    if (ds.noteTpl != null) { const n = noteCreate(ds.noteTpl); noteId = n.id; notePage = 'editor'; renderShell(); return true; }
    if (ds.noteEdit != null || ds.noteEdit2 != null) {
      const id = ds.noteEdit || ds.noteEdit2;
      noteId = id; notePage = 'editor'; noteMenuId = null; noteDetailMenu = false; renderShell(); return true;
    }
    if (ds.notePin != null) { const n = noteFind(loadNotes(), ds.notePin); noteSetField(ds.notePin, { pinned: !n.pinned }); noteMenuId = null; renderShell(); return true; }
    if (ds.noteFav != null) { const n = noteFind(loadNotes(), ds.noteFav); noteSetField(ds.noteFav, { favorite: !n.favorite }); noteMenuId = null; renderShell(); return true; }
    if (ds.noteArch != null) {
      const n = noteFind(loadNotes(), ds.noteArch);
      if (n.archived) noteSetField(ds.noteArch, { archived: false, category: n.prevCat || 'Inbox' });
      else noteSetField(ds.noteArch, { archived: true, prevCat: n.category, category: 'Arsip' });
      noteMenuId = null; noteDetailMenu = false;
      if (notePage === 'detail') notePage = 'list';
      renderShell(); return true;
    }
    if (ds.noteDel != null) {
      if (!window.confirm('Hapus catatan ini secara permanen?')) { noteMenuId = null; renderShell(); return true; }
      saveNotes(loadNotes().filter((x) => x.id !== ds.noteDel));
      noteMenuId = null; noteDetailMenu = false;
      if (noteId === ds.noteDel) { noteId = null; notePage = 'list'; }
      renderShell(); return true;
    }
    if (ds.noteEpin != null) {
      const n = noteFind(loadNotes(), ds.noteEpin);
      noteSetField(ds.noteEpin, { pinned: !n.pinned });
      btn.classList.toggle('on', !n.pinned);
      return true;
    }
    if (ds.noteEfav != null) {
      const n = noteFind(loadNotes(), ds.noteEfav);
      noteSetField(ds.noteEfav, { favorite: !n.favorite });
      btn.classList.toggle('on', !n.favorite);
      return true;
    }
    if (ds.noteCat != null) {
      const list = loadNotes(); const n = noteFind(list, noteId);
      if (n) { n.category = ds.noteCat; n.updated = noteNow(); saveNotes(list); noteSavedPulse(); notePage = 'editor'; renderShell(); }
      return true;
    }
    if (ds.noteCmd != null) { noteExecCmd(ds.noteCmd, btn.dataset.noteCmdArg); return true; }
    return false;
  }

  function noteExecCmd(cmd, arg) {
    const body = document.getElementById('noteEBody');
    if (!body) return;
    body.focus();
    if (cmd === 'checklist') {
      const sel = window.getSelection();
      const item = '<li><input type="checkbox" /><label>​</label></li>';
      document.execCommand('insertHTML', false, sel && sel.rangeCount && body.contains(sel.anchorNode) ? item : `<ul>${item}</ul>`);
      noteEditorSave({ body: sanitizeNoteHtml(body.innerHTML) });
      return;
    }
    if (cmd === 'link') {
      const url = window.prompt('Masukkan URL link:', 'https://');
      if (!url || !/^https?:\/\//i.test(url)) return;
      document.execCommand('createLink', false, url);
      noteEditorSave({ body: sanitizeNoteHtml(body.innerHTML) });
      return;
    }
    if (cmd === 'h3') {
      const cur = document.queryCommandValue('formatBlock');
      document.execCommand('formatBlock', false, cur === 'h3' ? 'p' : 'h3');
      noteEditorSave({ body: sanitizeNoteHtml(body.innerHTML) });
      return;
    }
    document.execCommand(cmd, false, arg || null);
    noteEditorSave({ body: sanitizeNoteHtml(body.innerHTML) });
  }

  function handleNoteInput(el) {
    if (el.matches('[data-note-search]')) {
      noteSearch = el.value;
      const list = dom.content.querySelector('.note-list');
      if (list) {
        const items = noteFiltered();
        list.innerHTML = items.length ? noteCardsHtml(items) : noteEmptyHtml(true);
      }
      return true;
    }
    if (el.matches('[data-note-title]')) {
      noteEditorSave({ title: el.value.trim() });
      const b = dom.content.querySelector('#noteETop');
      if (b) b.textContent = el.value.trim() || 'Catatan';
      return true;
    }
    if (el.matches('[data-note-tags]')) {
      noteEditorSave({ tags: noteParseTags(el.value) });
      return true;
    }
    if (el.matches('[data-note-body]')) {
      el.querySelectorAll('input[type="checkbox"]').forEach((c) => { if (c.checked) c.setAttribute('checked', ''); else c.removeAttribute('checked'); });
      noteEditorSave({ body: sanitizeNoteHtml(el.innerHTML) });
      return true;
    }
    return false;
  }

  /* ============ MODUL LAPORAN KEUANGAN (rekap kas + budget + tabungan) ============ */
  function repMonthKey(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
  function repMonths(n) { // n bulan terakhir, tua -> baru
    const out = [];
    const t = new Date();
    for (let i = n - 1; i >= 0; i--) { const d = new Date(t.getFullYear(), t.getMonth() - i, 1); out.push(repMonthKey(d)); }
    return out;
  }
  function repMonthLabel(key) { const [y, m] = key.split('-'); return `${MONTHS[Number(m) - 1].slice(0, 3)} ${y.slice(2)}`; }
  function repSum(list) { return list.reduce((a, t) => a + (Number(t.amount) || 0), 0); }

  // seed riwayat kas 6 bulan (sekali) supaya grafik laporan hidup; hanya bulan yang benar-benar kosong
  function ensureRepHistory() {
    if (!Array.isArray(state.transactions)) state.transactions = [];
    if (state.repHistSeeded) return;
    state.repHistSeeded = true;
    const now = new Date();
    const has = new Set(txList().map((t) => (t.date || '').slice(0, 7)));
    const rnd = (seed) => { let x = seed; return () => { x = (x * 9301 + 49297) % 233280; return x / 233280; }; };
    for (let back = 1; back <= 5; back++) {
      const d0 = new Date(now.getFullYear(), now.getMonth() - back, 1);
      const key = repMonthKey(d0);
      if (has.has(key)) continue;
      const dim = new Date(d0.getFullYear(), d0.getMonth() + 1, 0).getDate();
      const R = rnd(back * 7919);
      const iso = (day) => key + '-' + String(Math.max(1, Math.min(dim, day))).padStart(2, '0');
      const push = (day, type, amount, cat, note) => state.transactions.push({ id: uid('tx'), type, amount, cat, note, date: iso(day), ts: new Date(d0.getFullYear(), d0.getMonth(), Math.max(1, Math.min(dim, day))).getTime(), hist: true });
      push(Math.min(5, dim), 'in', 2500000 + Math.round(R() * 800) * 1000, 'Gaji', 'Gaji bulanan');
      if (R() > 0.55) push(Math.min(18, dim), 'in', 400000 + Math.round(R() * 900) * 1000, 'Jual Barang', 'Proyek / preloved');
      if (R() > 0.8) push(Math.min(24, dim), 'in', 150000 + Math.round(R() * 400) * 500, 'Lainnya', 'Cashback & hadiah');
      push(Math.min(2, dim), 'out', 400000 + Math.round(R() * 90) * 1000, 'Tagihan', 'Listrik + internet');
      push(Math.min(10, dim), 'out', 550000 + Math.round(R() * 300) * 1000, 'Belanja', 'Belanja bulanan');
      const nFood = 8 + Math.floor(R() * 5);
      for (let i = 0; i < nFood; i++) push(Math.floor(R() * dim) + 1, 'out', 15000 + Math.round(R() * 70) * 1000, 'Makanan', 'Makan harian');
      const nTr = 4 + Math.floor(R() * 3);
      for (let i = 0; i < nTr; i++) push(Math.floor(R() * dim) + 1, 'out', 20000 + Math.round(R() * 40) * 1000, 'Transportasi', 'Bensin / parkir');
      const nFun = 2 + Math.floor(R() * 3);
      for (let i = 0; i < nFun; i++) push(Math.floor(R() * dim) + 1, 'out', 25000 + Math.round(R() * 75) * 1000, 'Hiburan', 'Kopi / nonton');
      if (R() > 0.6) push(Math.floor(R() * dim) + 1, 'out', 50000 + Math.round(R() * 150) * 1000, 'Kesehatan', 'Vitamin / apotek');
      if (R() > 0.75) push(Math.floor(R() * dim) + 1, 'out', 100000 + Math.round(R() * 200) * 1000, 'Pendidikan', 'Buku / kursus');
    }
    state.transactions.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    saveState();
  }

  function repFlow(months) {
    return months.map((m) => {
      const txs = txList().filter((t) => (t.date || '').slice(0, 7) === m);
      const inc = repSum(txs.filter((t) => t.type === 'in'));
      const exp = repSum(txs.filter((t) => t.type === 'out'));
      return { m, inc, exp, net: inc - exp, count: txs.length };
    });
  }
  function repSpendByCat(monthKey) {
    const map = new Map();
    txList().filter((t) => t.type === 'out' && (t.date || '').slice(0, 7) === monthKey)
      .forEach((t) => map.set(t.cat || 'Lainnya', (map.get(t.cat || 'Lainnya') || 0) + (Number(t.amount) || 0)));
    return [...map.entries()].map(([cat, amt]) => ({ cat, amt })).sort((a, b) => b.amt - a.amt);
  }

  function repBarChartSvg(flows, W, H) {
    const max = Math.max(1, ...flows.flatMap((f) => [f.inc, f.exp]));
    const pad = { l: 8, r: 8, t: 18, b: 22 };
    const gw = (W - pad.l - pad.r) / flows.length;
    const bw = Math.min(16, gw * 0.28);
    let bars = '';
    let netPts = [];
    flows.forEach((f, i) => {
      const cx = pad.l + gw * i + gw / 2;
      const hi = Math.max(2, (f.inc / max) * (H - pad.t - pad.b));
      const ho = Math.max(2, (f.exp / max) * (H - pad.t - pad.b));
      bars += `<rect x="${(cx - bw - 2).toFixed(1)}" y="${(H - pad.b - hi).toFixed(1)}" width="${bw.toFixed(1)}" height="${hi.toFixed(1)}" rx="3" fill="#7fb5a0"><title>Masuk ${txRp(f.inc)}</title></rect>`;
      bars += `<rect x="${(cx + 2).toFixed(1)}" y="${(H - pad.b - ho).toFixed(1)}" width="${bw.toFixed(1)}" height="${ho.toFixed(1)}" rx="3" fill="#e2a89b"><title>Keluar ${txRp(f.exp)}</title></rect>`;
      const ny = H - pad.b - Math.max(0, Math.min(1, (f.net + max * 0.15) / (max * 1.15))) * (H - pad.t - pad.b);
      netPts.push([cx, ny]);
      bars += `<text x="${cx}" y="${H - 7}" text-anchor="middle" font-size="9.5" fill="var(--muted)">${repMonthLabel(f.m)}</text>`;
    });
    const path = netPts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const dots = netPts.map(([x, y], i) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="var(--text)"><title>Net ${txRp(flows[i].net)}</title></circle>`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" class="rep-svg" role="img" aria-label="Grafik kasflow 6 bulan">${bars}<path d="${path}" fill="none" stroke="var(--text)" stroke-width="1.6" stroke-dasharray="3 3" opacity=".55"/>${dots}</svg>`;
  }
  function repDonutSvg(items, total) {
    const COL = ['#d99a2b', '#7d685c', '#4a7fb5', '#b5567d', '#6a5acd', '#3e7b8c', '#c2402f', '#8a9a5b', '#b26a1f'];
    const R = 52, C = 2 * Math.PI * R;
    let acc = 0;
    const arcs = items.map((it, i) => {
      const frac = total > 0 ? it.amt / total : 0;
      const seg = `<circle cx="70" cy="70" r="${R}" fill="none" stroke="${COL[i % COL.length]}" stroke-width="17" stroke-dasharray="${(frac * C - 1.5).toFixed(2)} ${C.toFixed(2)}" stroke-dashoffset="${(-acc * C).toFixed(2)}" transform="rotate(-90 70 70)" stroke-linecap="round"><title>${escapeHtml(it.cat)} ${txRp(it.amt)}</title></circle>`;
      acc += frac;
      return seg;
    }).join('');
    return `<svg viewBox="0 0 140 140" class="rep-donut" role="img" aria-label="Donut pengeluaran per kategori"><circle cx="70" cy="70" r="${R}" fill="none" stroke="var(--panel-soft)" stroke-width="17"/>${arcs}<text x="70" y="66" text-anchor="middle" font-size="10" fill="var(--muted)">Total</text><text x="70" y="82" text-anchor="middle" font-size="13.5" font-weight="700" fill="var(--text)">${total >= 1e6 ? (total / 1e6).toFixed(1).replace('.', ',') + ' jt' : Math.round(total / 1000) + ' rb'}</text></svg>`;
  }

  function renderReportView() {
    ensureRepHistory();
    const months = repMonths(6);
    const cur = months[months.length - 1];
    const flows = repFlow(months);
    const fCur = flows[flows.length - 1];
    const fPrev = flows.length > 1 ? flows[flows.length - 2] : null;
    const balance = repSum(txList().filter((t) => t.type === 'in')) - repSum(txList().filter((t) => t.type === 'out'));
    const savedTotal = saveList().reduce((a, s) => a + (Number(s.balance) || 0), 0);
    const netWorth = balance + savedTotal;
    const rate = fCur.inc > 0 ? (fCur.net / fCur.inc) * 100 : 0;
    const expDelta = fPrev && fPrev.exp > 0 ? ((fCur.exp - fPrev.exp) / fPrev.exp) * 100 : null;
    const cats = repSpendByCat(cur);
    const catTotal = repSum(cats.map((c) => ({ amount: c.amt })));
    // budget bulan aktif
    const buds = budList().filter((b) => b.period === cur);
    const budSum = buds.reduce((a, b) => a + (Number(b.amount) || 0), 0);
    const budRows = buds.map((b) => ({ b, c: budCalc(b) })).sort((x, y) => y.c.pct - x.c.pct);
    const budOver = budRows.filter((r) => r.c.status === 'over');
    // tabungan
    const svActive = saveList().filter((s) => !s.archived && s.balance < s.target);
    const svDone = saveList().filter((s) => !s.archived && s.balance >= s.target);
    // outlook: rata2 pengeluaran 3 bulan -> proyeksi bulan depan, dana darurat cover
    const recent3 = flows.slice(-4, -1).filter((f) => f.count > 0);
    const avgExp = recent3.length ? repSum(recent3.map((f) => ({ amount: f.exp }))) / recent3.length : fCur.exp;
    const ddMonths = avgExp > 0 ? savedTotal / avgExp : 0;
    const nextBudgetGap = budSum > 0 ? budSum - fCur.exp : null;
    const svDue = svActive.filter((s) => s.deadline && saveDaysLeft(s.deadline) > 0)
      .map((s) => ({ s, left: saveCalc(s).left, dl: saveDaysLeft(s.deadline) })).filter((x) => x.left > 0)
      .sort((a, b) => (a.left / a.dl) - (b.left / b.dl));
    const pctTxt = (n) => (n >= 0 ? '+' : '') + n.toFixed(0) + '%';
    return `<div class="rep-page">
      <div class="panel rep-hero">
        <div class="rep-hero-top"><h2>📊 Kondisi Finansialmu</h2><small>${repMonthLabel(cur)} · data 6 bulan terakhir</small></div>
        <div class="rep-nums">
          <div><span>Saldo Kas</span><b class="${balance >= 0 ? 'green' : 'coral'}">${txRp(balance)}</b></div>
          <div><span>Nilai Bersih*</span><b>${txRp(netWorth)}</b></div>
          <div><span>Pemasukan</span><b class="green">${txRp(fCur.inc)}</b></div>
          <div><span>Pengeluaran</span><b class="coral">${txRp(fCur.exp)}</b></div>
          <div><span>Sisa Bulan Ini</span><b class="${fCur.net >= 0 ? 'green' : 'coral'}">${txRp(fCur.net)}</b></div>
        </div>
        <div class="rep-chips">
          <span class="rep-chip">💼 Menabung <b class="${rate >= 20 ? 'green' : rate >= 0 ? 'amber' : 'coral'}">${rate.toFixed(0)}%</b> dari pemasukan</span>
          ${expDelta == null ? '' : `<span class="rep-chip">📉 Ekspending vs bulan lalu <b class="${expDelta <= 0 ? 'green' : 'coral'}">${pctTxt(expDelta)}</b></span>`}
          <span class="rep-chip">🪙 Terkumpul di tabungan <b>${txRp(savedTotal)}</b></span>
        </div>
        <p class="rep-fineprint">* Saldo kas + total terkumpul di target tabungan.</p>
      </div>

      <div class="panel rep-card">
        <div class="rep-card-head"><h3>Cashflow 6 Bulan</h3><span class="rep-legend"><i class="lg-in"></i>Masuk <i class="lg-out"></i>Keluar <i class="lg-net"></i>Selisih</span></div>
        ${repBarChartSvg(flows, 640, 210)}
        <div class="rep-flow-nums">${flows.map((f) => `<div><span>${repMonthLabel(f.m)}</span><b class="${f.net >= 0 ? 'green' : 'coral'}">${f.net >= 0 ? '+' : '−'}${saveCompact(Math.abs(f.net))}</b></div>`).join('')}</div>
      </div>

      <div class="rep-two">
        <div class="panel rep-card">
          <div class="rep-card-head"><h3>Spending per Kategori</h3><small>${repMonthLabel(cur)}</small></div>
          ${cats.length === 0 ? '<p class="muted rep-empty-line">Belum ada pengeluaran bulan ini.</p>' : `<div class="rep-donut-wrap">${repDonutSvg(cats, catTotal)}
            <div class="rep-legend-list">${cats.slice(0, 6).map((it, i) => { const COL = ['#d99a2b', '#7d685c', '#4a7fb5', '#b5567d', '#6a5acd', '#3e7b8c', '#c2402f', '#8a9a5b', '#b26a1f']; const share = catTotal ? (it.amt / catTotal) * 100 : 0; return `<div class="rep-lg"><i style="background:${COL[i % COL.length]}"></i><b>${escapeHtml(it.cat)}</b><small>${share.toFixed(0)}%</small><span>${txRp(it.amt)}</span></div>`; }).join('')}</div></div>`}
        </div>
        <div class="panel rep-card">
          <div class="rep-card-head"><h3>🔭 Outlook</h3><small>proyeksi bulan depan</small></div>
          <div class="rep-out">
            <div><span>Perkiraan pengeluaran</span><b>${txRp(Math.round(avgExp / 1000) * 1000)}</b><small>rata-rata ${recent3.length || 1} bln terakhir</small></div>
            ${nextBudgetGap == null ? '' : `<div><span>Pos anggaran tersisa</span><b class="${nextBudgetGap >= 0 ? 'green' : 'coral'}">${txRp(nextBudgetGap)}</b><small>dari pagu ${txRp(budSum)}</small></div>`}
            <div><span>Dana darurat</span><b class="${ddMonths >= 3 ? 'green' : ddMonths >= 1 ? 'amber' : 'coral'}">${ddMonths.toFixed(1)} bln</b><small>cover pengeluaran · target 3–6 bln</small></div>
            ${svDue.length ? `<div><span>Setoran harian</span><b>${txRp(Math.ceil((svDue[0].left / svDue[0].dl) / 1000) * 1000)}/hari</b><small>agar "${escapeHtml(svDue[0].s.name)}" tepat waktu · ${svDue[0].dl} hari lagi</small></div>` : ''}
          </div>
          ${budOver.length ? `<p class="rep-warn">⚠️ ${budOver.length} pos budget melebihi anggaran bulan ini — cek halaman Budget.</p>` : (svActive.length ? `<p class="rep-tip">💡 ${svActive.length} target masih berjalan; setoran rutin ${recent3.length ? txRp(Math.round((recent3.length ? avgExp : fCur.exp) * 0.1 / 1000) * 1000) : 'kecil tapi rutin'}/bln bisa menambah ${saveCompact((recent3.length ? avgExp : fCur.exp) * 0.1)} ke tabungan.</p>` : '')}
        </div>
      </div>

      <div class="panel rep-card">
        <div class="rep-card-head"><h3>🧾 Rekap Budget ${repMonthLabel(cur)}</h3><small>${buds.length} pos · pagu ${txRp(budSum)}</small></div>
        ${budRows.length === 0 ? '<p class="muted rep-empty-line">Belum ada budget untuk bulan ini — buat di halaman Budget.</p>' : budRows.map(({ b, c }) => {
          const cls = c.status === 'over' ? 'over' : c.status === 'warn' ? 'warn' : 'ok';
          return `<div class="rep-row">
            <span class="rep-row-name"><i>${(BUD_CATS.find((x) => x.name === b.cat) || { icon: '📦' }).icon}</i>${escapeHtml(b.name)}</span>
            <div class="rep-row-bar"><span class="rep-rb-${cls}" style="width:${Math.min(100, c.pct).toFixed(1)}%"></span></div>
            <b class="${cls === 'over' ? 'coral' : cls === 'warn' ? 'amber' : ''}">${c.pct.toFixed(0)}%</b>
            <span class="rep-row-amt">${saveCompact(c.spent)}/${saveCompact(b.amount)}</span>
          </div>`; }).join('')}
      </div>

      <div class="panel rep-card">
        <div class="rep-card-head"><h3>🪙 Rekap Tabungan</h3><small>${svActive.length + svDone.length} target aktif/selesai · ${svDone.length} tercapai</small></div>
        ${saveList().length === 0 ? '<p class="muted rep-empty-line">Belum ada target tabungan.</p>' : saveList().map((s) => {
          const c = saveCalc(s);
          return `<div class="rep-row">
            <span class="rep-row-name"><i>${saveCatIcon(s)}</i>${escapeHtml(s.name)}</span>
            <div class="rep-row-bar"><span class="${c.done ? 'rep-rb-done' : c.pct >= 50 ? 'rep-rb-ok' : 'rep-rb-soft'}" style="width:${c.pct.toFixed(1)}%"></span></div>
            <b>${c.pctReal.toFixed(0)}%</b>
            <span class="rep-row-amt">${saveCompact(s.balance)}/${saveCompact(s.target)}</span>
          </div>`; }).join('')}
      </div>

      <div class="panel rep-card">
        <div class="rep-card-head"><h3>Transaksi Terbaru</h3><small>5 terakhir dari kas</small></div>
        ${txList().length === 0 ? '<p class="muted rep-empty-line">Belum ada transaksi.</p>' : [...txList()].sort((a, b) => String(b.date).localeCompare(String(a.date)) || (b.ts || 0) - (a.ts || 0)).slice(0, 5).map((t) => `<div class="rep-txline">
          <span class="rep-tx-ic">${t.type === 'in' ? '↑' : '↓'}</span>
          <div><b>${escapeHtml(t.note || t.cat || 'Transaksi')}</b><small>${budGroupDate(t.date)} · ${escapeHtml(t.cat || 'Umum')}</small></div>
          <span class="${t.type === 'in' ? 'green' : 'coral'}">${t.type === 'in' ? '+' : '−'}${txRp(t.amount)}</span>
        </div>`).join('')}
        <div class="rep-links"><a class="rep-link" data-rep-goto="transaksi">Ke Transaksi →</a><a class="rep-link" data-rep-goto="budget">Ke Budget →</a><a class="rep-link" data-rep-goto="tabungan">Ke Tabungan →</a></div>
      </div>
    </div>`;
  }

  function handleRepAction(btn) {
    if (btn.matches('[data-rep-goto]')) {
      activeView = btn.dataset.repGoto; state.selectedView = activeView; saveState(); renderShell();
      return true;
    }
    return false;
  }

  /* ============ MODUL TABUNGAN (target tabungan + setoran/penarikan) ============ */
  const SAVE_CATS = [
    { name: 'Dana Darurat', icon: '🛟' }, { name: 'Keuangan Pribadi', icon: '👛' },
    { name: 'Pendidikan', icon: '🎓' }, { name: 'Kendaraan', icon: '🏍️' },
    { name: 'Rumah', icon: '🏠' }, { name: 'Liburan', icon: '🏝️' },
    { name: 'Bisnis', icon: '💼' }, { name: 'Lainnya', icon: '📦' },
  ];
  const SAVE_ICONS = ['🐱', '🏠', '🚗', '✈️', '🎓', '💻', '📷', '🎸', '🚑', '💍', '🛟', '🌱'];
  const SAVE_COLORS = ['#2e7d5b', '#7d685c', '#d99a2b', '#4a7fb5', '#b5567d', '#6a5acd'];

  let saveFilter = 'all';      // all | aktif | selesai | arsip
  let saveDetailId = null;
  let saveFormOpen = false;    // form target
  let saveEditingId = null;
  let saveDraft = null;
  let saveTxOpen = false;      // form setoran/penarikan
  let saveTxDraft = null;

  function ensureSaveStore() {
    if (!Array.isArray(state.savings)) state.savings = [];
    if (!Array.isArray(state.savingsTx)) state.savingsTx = [];
    if (!state.saveSeeded) {
      state.saveSeeded = true;
      if (state.savings.length === 0) seedSavingsDemo();
      saveState();
    }
  }
  function seedSavingsDemo() {
    const d = (n) => { const t = new Date(); t.setDate(t.getDate() + n); return txIso(t); };
    const now = Date.now();
    state.savings = [
      { id: uid('sv'), name: 'Dana Darurat 6 Bulan', desc: '3x pengeluaran bulanan, untuk PHK/sakit/mendesak.', target: 15000000, balance: 6200000, deadline: d(120), cat: 'Dana Darurat', icon: '🛟', color: '#2e7d5b', archived: false, createdAt: now - 86400000 * 60 },
      { id: uid('sv'), name: 'Laptop Kerja Baru', desc: 'Upgrade buat rendering & coding, cicil tiap gajian.', target: 12000000, balance: 9450000, deadline: d(45), cat: 'Keuangan Pribadi', icon: '💻', color: '#4a7fb5', archived: false, createdAt: now - 86400000 * 90 },
      { id: uid('sv'), name: 'Liburan ke Bali', desc: '4 hari 3 malam buat dua orang, termasuk motor sewaan.', target: 5000000, balance: 1800000, deadline: d(150), cat: 'Liburan', icon: '✈️', color: '#d99a2b', archived: false, createdAt: now - 86400000 * 30 },
      { id: uid('sv'), name: 'DP Motor', desc: 'Target 30% harga unit, cash biar ringan cicilan.', target: 4200000, balance: 4200000, deadline: '', cat: 'Kendaraan', icon: '🏍️', color: '#b5567d', archived: false, createdAt: now - 86400000 * 200 },
      { id: uid('sv'), name: 'Kursus Data Science', desc: 'Beasiswa gagal, bayar sendiri. Sudah selesai ✓', target: 2500000, balance: 2500000, deadline: '', cat: 'Pendidikan', icon: '🎓', color: '#6a5acd', archived: true, createdAt: now - 86400000 * 300 },
    ];
    const sv = state.savings;
    const mk = (si, kind, amt, note, daysAgo, srcTxt) => ({ id: uid('stx'), svId: sv[si].id, kind, amount: amt, note, date: txIso(new Date(now - 86400000 * daysAgo)), source: srcTxt || 'Transfer bank', ts: now - 86400000 * daysAgo * 1000 });
    state.savingsTx = [
      mk(0, 'deposit', 1500000, 'Sisihan gaji bulan ini', 3, 'Rekening utama'),
      mk(0, 'deposit', 1200000, 'Sisihan gaji', 33, 'Rekening utama'),
      mk(0, 'withdraw', 400000, 'Banjir — benerin pompa', 12, 'ATM'),
      mk(0, 'deposit', 1000000, 'Tunjangan proyek', 61, 'E-wallet'),
      mk(0, 'deposit', 1000000, 'Sisihan', 88, 'Rekening utama'),
      mk(0, 'deposit', 900000, 'Sisihan', 116, 'Rekening utama'),
      mk(0, 'deposit', 600000, 'Kemenangan freelance', 140, 'Payout'),
      mk(0, 'deposit', 400000, 'Awal mula', 170, 'Transfer bank'),
      mk(1, 'deposit', 2500000, 'Gaji ke-13', 8, 'Rekening utama'),
      mk(1, 'deposit', 2000000, 'Jual laptop lama', 40, 'COD'),
      mk(1, 'deposit', 1500000, 'Sisihan 2 bulan', 75, 'Rekening utama'),
      mk(1, 'deposit', 1450000, 'Sisihan', 120, 'Rekening utama'),
      mk(1, 'deposit', 2000000, 'BONUS proyek', 160, 'Payout'),
      mk(2, 'deposit', 600000, 'Cicil liburan', 10, 'E-wallet'),
      mk(2, 'deposit', 500000, 'Cicil', 41, 'E-wallet'),
      mk(2, 'deposit', 700000, 'Hasil jual preloved', 70, 'COD'),
      mk(3, 'deposit', 1500000, 'DP dicicil', 90, 'Rekening utama'),
      mk(3, 'deposit', 1200000, 'DP dicicil', 150, 'Rekening utama'),
      mk(3, 'deposit', 1500000, 'DP lunas 🎉', 180, 'Transfer bank'),
      mk(4, 'deposit', 2500000, 'Lunas kursus ✅', 250, 'Rekening utama'),
    ];
    // recalculate balance dari riwayat supaya konsisten
    sv.forEach((s) => { s.balance = state.savingsTx.reduce((acc, t) => acc + (t.svId === s.id ? (t.kind === 'deposit' ? t.amount : -t.amount) : 0), 0); });
  }
  function saveList() { return Array.isArray(state.savings) ? state.savings : []; }
  function saveTxList() { return Array.isArray(state.savingsTx) ? state.savingsTx : []; }
  function saveFind(id) { return saveList().find((s) => s.id === id) || null; }
  function saveCalc(s) {
    const pct = s.target > 0 ? Math.min(100, (s.balance / s.target) * 100) : 0;
    const pctReal = s.target > 0 ? (s.balance / s.target) * 100 : 0;
    const left = Math.max(0, s.target - s.balance);
    const done = s.balance >= s.target;
    return { pct, pctReal, left, done };
  }
  function saveDaysLeft(deadline) {
    if (!deadline) return null;
    const ms = new Date(deadline + 'T23:59:59') - Date.now();
    return Math.ceil(ms / 86400000);
  }
  function saveDeadlineLabel(deadline) {
    if (!deadline) return { text: 'Tanpa deadline', tone: 'muted' };
    const dl = saveDaysLeft(deadline);
    const [mm, dd] = deadline.slice(5).split('-');
    const dateTxt = `${Number(dd)} ${MONTHS[Number(mm) - 1]}`;
    if (dl < 0) return { text: `Lewat ${Math.abs(dl)} hari · ${dateTxt}`, tone: 'coral' };
    if (dl <= 30) return { text: `${dateTxt} · ${dl} hari lagi`, tone: 'amber' };
    return { text: `${dateTxt} · ${dl} hari lagi`, tone: 'muted' };
  }
  function saveCatIcon(s) { return s.icon || (SAVE_CATS.find((c) => c.name === s.cat) || { icon: '📦' }).icon; }
  function saveRp(n) { return txRp(n); }
  function saveCompact(n) {
    n = Math.round(Math.abs(n || 0));
    if (n >= 1e9) return (n / 1e9).toFixed(n % 1e9 ? 1 : 0) + ' M';
    if (n >= 1e6) return (n / 1e6).toFixed(n % 1e6 ? 1 : 0).replace('.', ',') + ' jt';
    if (n >= 1e3) return Math.round(n / 1e3) + ' rb';
    return String(n);
  }
  function saveStatus(s) { const c = saveCalc(s); return s.archived ? 'arsip' : c.done ? 'selesai' : 'aktif'; }
  function saveBarHtml(s) {
    const c = saveCalc(s);
    const cls = c.pct >= 100 ? 'sv-pb-done' : c.pct >= 50 ? 'sv-pb-ok' : 'sv-pb-soft';
    return `<div class="sv-bar"><span class="${cls}" style="width:${c.pct.toFixed(1)}%"></span></div>`;
  }

  function renderSavingsView() {
    if (saveDetailId) {
      const d = saveFind(saveDetailId);
      if (d) return renderSaveDetail(d);
      saveDetailId = null;
    }
    const all = saveList();
    const active = all.filter((s) => saveStatus(s) === 'aktif');
    const totalSaved = all.reduce((a, s) => a + s.balance, 0);
    const totalTarget = all.reduce((a, s) => a + s.target, 0);
    const pctAll = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;
    const filtered = all.filter((s) => saveFilter === 'all' || saveStatus(s) === saveFilter);
    const tabs = [['all', 'Semua'], ['aktif', 'Aktif'], ['selesai', 'Selesai'], ['arsip', 'Diarsipkan']];
    return `<div class="sv-page">
      <div class="panel sv-hero">
        <div class="sv-nums">
          <div><span>💰 Tergumpul</span><b class="green">${txRp(totalSaved)}</b></div>
          <div><span>🎯 Total Target</span><b>${txRp(totalTarget)}</b></div>
          <div><span>📉 Sisa Target</span><b>${txRp(Math.max(0, totalTarget - totalSaved))}</b></div>
          <div><span>📊 Progress</span><b class="${pctAll >= 100 ? 'green' : 'amber'}">${pctAll.toFixed(0)}%</b></div>
          <div><span>🔥 Aktif</span><b>${active.length} target</b></div>
        </div>
        ${saveBarHtml({ balance: totalSaved, target: totalTarget, archived: false })}
        <div class="sv-hero-actions">
          <button type="button" class="btn primary" data-sv-new>+ Tambah Tabungan</button>
          <button type="button" class="btn" data-sv-newtx>+ Tambah Setoran</button>
        </div>
      </div>

      ${saveFormOpen ? renderSvForm() : ''}
      ${saveTxOpen ? renderSvTxForm() : ''}

      <div class="sv-tabs" role="tablist">${tabs.map(([k, l]) => `<button type="button" class="sv-tab ${saveFilter === k ? 'on' : ''}" data-sv-filter="${k}">${l}<small>${k === 'all' ? all.length : all.filter((s) => saveStatus(s) === k).length}</small></button>`).join('')}</div>

      ${filtered.length === 0 ? `<div class="panel sv-empty">
        <div class="sv-empty-ic">🐾</div>
        <h3>${all.length === 0 ? 'Belum ada target tabungan' : 'Kosong di filter ini'}</h3>
        <p>${all.length === 0 ? 'Buat target pertama — dana darurat, laptop baru, atau liburan. Setoran kecil rutin yang dihitung otomatis.' : 'Coba filter lain atau buat target baru.'}</p>
        <div><button type="button" class="btn primary" data-sv-new>+ Tambah Tabungan</button>${all.length > 0 ? '<button type="button" class="btn" data-sv-filter="all">Lihat Semua</button>' : ''}</div>
      </div>` : `<div class="sv-grid">${filtered.map((s) => {
        const c = saveCalc(s);
        const dl = saveDeadlineLabel(s.deadline);
        const st = saveStatus(s);
        return `<button type="button" class="panel sv-card" data-sv-open="${s.id}">
          <div class="sv-card-top">
            <span class="sv-ic" style="background:${(s.color || '#7d685c')}1f">${saveCatIcon(s)}</span>
            <span class="sv-card-name"><b>${escapeHtml(s.name)}</b><small>${s.cat || 'Umum'}</small></span>
            <span class="sv-pill ${st}">${st === 'aktif' ? 'Aktif' : st === 'selesai' ? '✓ Selesai' : 'Arsip'}</span>
          </div>
          ${s.desc ? `<p class="sv-desc">${escapeHtml(s.desc)}</p>` : ''}
          ${saveBarHtml(s)}
          <div class="sv-card-nums">
            <span>Target <b>${txRp(s.target)}</b></span>
            <span>Terkumpul <b class="green">${txRp(s.balance)}</b></span>
            <span>Sisa <b>${c.done ? 'Lunas 🎉' : txRp(c.left)}</b></span>
          </div>
          <div class="sv-card-foot"><span class="${dl.tone}">⏳ ${dl.text}</span><span class="${c.done ? 'green' : 'muted'}">${c.pctReal.toFixed(0)}%</span></div>
        </button>`; }).join('')}</div>`}
    </div>`;
  }

  function renderSaveDetail(s) {
    const c = saveCalc(s);
    const txs = saveTxList().filter((t) => t.svId === s.id).sort((a, b) => (b.date + String(b.ts || 0)).localeCompare(a.date + String(a.ts || 0)));
    const deposits = txs.filter((t) => t.kind === 'deposit');
    const withdraws = txs.filter((t) => t.kind === 'withdraw');
    const sumDep = deposits.reduce((a, t) => a + t.amount, 0);
    const avg = deposits.length ? sumDep / deposits.length : 0;
    const dl = saveDaysLeft(s.deadline);
    const est = !c.done && dl && dl > 0 ? c.left / dl : null;
    const estMonth = est ? est * 30 : null;
    return `<div class="sv-page">
      <button type="button" class="btn tiny sv-back" data-sv-back>← Kembali ke Tabungan</button>
      <div class="panel sv-hero">
        <div class="sv-det-top">
          <span class="sv-ic lg" style="background:${(s.color || '#7d685c')}1f">${saveCatIcon(s)}</span>
          <div><h2>${escapeHtml(s.name)}</h2><small>${s.cat || 'Umum'} · ${saveStatus(s) === 'aktif' ? 'Aktif' : saveStatus(s) === 'selesai' ? 'Selesai ✓' : 'Diarsipkan'}</small></div>
        </div>
        ${s.desc ? `<p class="sv-det-note">📝 ${escapeHtml(s.desc)}</p>` : ''}
        <div class="sv-nums sv-nums-3">
          <div><span>Target</span><b>${txRp(s.target)}</b></div>
          <div><span>Terkumpul</span><b class="green">${txRp(s.balance)} · ${c.pctReal.toFixed(0)}%</b></div>
          <div><span>Sisa</span><b>${c.done ? 'Lunas 🎉' : txRp(c.left)}</b></div>
        </div>
        ${saveBarHtml(s)}
        <div class="sv-det-meta">
          <span>⏳ ${saveDeadlineLabel(s.deadline).text}</span>
          ${est ? `<span>🧮 Butuh <b>${txRp(Math.ceil(est / 1000) * 1000)}/hari</b> ${saveRp2(estMonth)} × ${dl} hari</span>` : ''}
          ${c.done ? '<span>🎯 Target tercapai — jangan berhenti nabung!</span>' : ''}
        </div>
        <div class="sv-hero-actions">
          <button type="button" class="btn primary" data-sv-deposit="${s.id}">+ Setoran ke Ini</button>
          <button type="button" class="btn" data-sv-edit="${s.id}">✏️ Edit</button>
          <button type="button" class="btn" data-sv-archive="${s.id}">${s.archived ? '↩️ Pulihkan' : '📦 Arsip'}</button>
          <button type="button" class="btn danger" data-sv-del="${s.id}">🗑 Hapus</button>
        </div>
      </div>
      ${saveTxOpen ? renderSvTxForm() : ''}
      <div class="panel sv-det-stats">
        <h3>Statistik Setoran</h3>
        <div class="sv-nums">
          <div><span>Total Setor</span><b class="green">${txRp(sumDep)}</b></div>
          <div><span>Total Tarik</span><b class="coral">${txRp(withdraws.reduce((a, t) => a + t.amount, 0))}</b></div>
          <div><span>Jumlah Setor</span><b>${deposits.length}×</b></div>
          <div><span>Rata-rata</span><b>${txRp(Math.round(avg))}</b></div>
        </div>
      </div>
      <div class="panel sv-det-tx">
        <h3>Riwayat Transaksi <small>${txs.length} catatan</small></h3>
        ${txs.length === 0 ? '<p class="muted">Belum ada setoran. Mulai dengan nominal kecil — yang penting rutin.</p>' : txs.map((t) => `<div class="sv-rtx">
          <span class="sv-ic sm">${t.kind === 'deposit' ? '⬇️' : '⬆️'}</span>
          <div><b>${escapeHtml(t.note || (t.kind === 'deposit' ? 'Setoran' : 'Penarikan'))}</b><small>${budGroupDate(t.date)} · ${escapeHtml(t.source || '—')}</small></div>
          <span class="${t.kind === 'deposit' ? 'green' : 'coral'}">${t.kind === 'deposit' ? '+' : '−'}${txRp(t.amount)}</span>
        </div>`).join('')}
      </div>
    </div>`;
  }
  function saveRp2(n) { return '≈ ' + txRp(Math.round(n / 1000) * 1000) + '/bln'; }

  function renderSvForm() {
    const editing = saveEditingId ? saveFind(saveEditingId) : null;
    const d = saveDraft || (editing ? {
      name: editing.name, desc: editing.desc || '', target: String(editing.target), balance: String(editing.balance),
      deadline: editing.deadline || '', cat: editing.cat || SAVE_CATS[0].name, icon: editing.icon || '', color: editing.color || SAVE_COLORS[0],
    } : { name: '', desc: '', target: '', balance: '', deadline: '', cat: SAVE_CATS[0].name, icon: SAVE_ICONS[0], color: SAVE_COLORS[0] });
    return `<form id="svForm" class="panel sv-form" novalidate>
      <h3>${editing ? '✏️ Edit Tabungan' : '➕ Tambah Tabungan'}</h3>
      <div class="tx-form-grid">
        <label class="field"><span>Nama Target</span><input name="svName" value="${escapeHtml(d.name)}" placeholder="mis. Dana Darurat" maxlength="60" required></label>
        <label class="field"><span>Kategori</span><select name="svCat">${SAVE_CATS.map((x) => `<option value="${x.name}" ${x.name === d.cat ? 'selected' : ''}>${x.icon} ${x.name}</option>`).join('')}</select></label>
        <label class="field"><span>Target Nominal (Rp)</span><input name="svTarget" inputmode="numeric" value="${escapeHtml(d.target)}" placeholder="mis. 15jt" required></label>
        <label class="field"><span>Saldo Awal (Rp)</span><input name="svBalance" inputmode="numeric" value="${escapeHtml(d.balance)}" placeholder="0"></label>
        <label class="field"><span>Deadline <small>opsional</small></span><input type="date" name="svDeadline" value="${escapeHtml(d.deadline)}"></label>
        <label class="field sv-field-wide"><span>Deskripsi <small>opsional</small></span><input name="svDesc" value="${escapeHtml(d.desc)}" maxlength="120" placeholder="satu kalimat tentang target ini"></label>
        <div class="field"><span>Icon</span><div class="sv-picks">${SAVE_ICONS.map((ic) => `<button type="button" class="sv-pick ${ic === d.icon ? 'on' : ''}" data-sv-pick-ic="${ic}">${ic}</button>`).join('')}</div></div>
        <div class="field"><span>Warna</span><div class="sv-picks">${SAVE_COLORS.map((cl) => `<button type="button" class="sv-pick sv-color ${cl === d.color ? 'on' : ''}" style="background:${cl}" data-sv-pick-color="${cl}" aria-label="warna ${cl}"></button>`).join('')}</div></div>
      </div>
      <div class="tx-form-actions">
        <button type="submit" class="btn primary">${editing ? 'Simpan Perubahan' : 'Tambah Tabungan'}</button>
        <button type="button" class="btn" data-sv-cancelform>Batal</button>
      </div>
    </form>`;
  }
  function svDraftFrom(form) {
    return { name: form.svName.value, desc: form.svDesc.value, target: form.svTarget.value, balance: form.svBalance.value, deadline: form.svDeadline.value, cat: form.svCat.value, icon: form.querySelector('.sv-pick[data-sv-pick-ic].on')?.dataset.svPickIc || SAVE_ICONS[0], color: form.querySelector('.sv-pick[data-sv-pick-color].on')?.dataset.svPickColor || SAVE_COLORS[0] };
  }
  function submitSvForm(form) {
    const d = svDraftFrom(form);
    const target = txParseAmount(d.target);
    const balance = Math.max(0, txParseAmount(d.balance || '0'));
    if (!d.name.trim()) { showToast('Nama target wajib diisi.', true); return; }
    if (!(target > 0)) { showToast('Target nominal tidak valid. Contoh: 15jt.', true); return; }
    if (balance > target) { showToast('Saldo awal melebihi target — kecilkan dulu.', true); return; }
    if (saveEditingId) {
      const old = saveFind(saveEditingId);
      state.savings = saveList().map((s) => (s.id === saveEditingId ? { ...s, name: d.name.trim(), desc: d.desc.trim(), target, deadline: d.deadline, cat: d.cat, icon: d.icon, color: d.color } : s));
      // kalau saldo awal diedit, catat penyesuaian sebagai setoran/penarikan agar riwayat konsisten
      const nb = balance;
      if (old && nb !== old.balance) {
        const adj = nb - old.balance;
        state.savings = state.savings.map((s) => (s.id === saveEditingId ? { ...s, balance: nb } : s));
        if (adj !== 0) state.savingsTx.push({ id: uid('stx'), svId: saveEditingId, kind: adj > 0 ? 'deposit' : 'withdraw', amount: Math.abs(adj), note: 'Penyesuaian saldo', date: txIso(new Date()), source: 'Manual', ts: Date.now() });
      }
      showToast('Target tabungan diperbarui.');
      saveEditingId = null; saveDraft = null;
    } else {
      state.savings.push({ id: uid('sv'), name: d.name.trim(), desc: d.desc.trim(), target, balance, deadline: d.deadline, cat: d.cat, icon: d.icon, color: d.color, archived: false, createdAt: Date.now() });
      if (balance > 0) state.savingsTx.push({ id: uid('stx'), svId: state.savings[state.savings.length - 1].id, kind: 'deposit', amount: balance, note: 'Saldo awal', date: txIso(new Date()), source: 'Manual', ts: Date.now() });
      showToast(`Target "${d.name.trim()}" dibuat.`);
      saveDraft = null;
    }
    saveFormOpen = false;
    saveState(); renderShell();
  }

  function renderSvTxForm() {
    const targets = saveList().filter((s) => !s.archived && s.balance < s.target);
    const list = targets.length ? targets : saveList().filter((s) => !s.archived);
    if (list.length === 0) { showToast('Buat target tabungan dulu.', true); saveTxOpen = false; return ''; }
    const d = saveTxDraft || { svId: (list.find((s) => s.id === saveTxPreset) || list[0]).id, kind: 'deposit', amount: '', date: txIso(new Date()), source: 'Transfer bank', note: '' };
    const sv = list.find((x) => x.id === d.svId) || list[0];
    return `<form id="svTxForm" class="panel sv-form" novalidate>
      <h3>💸 Catat Setoran / Penarikan</h3>
      <div class="tx-form-grid">
        <label class="field"><span>Target Tabungan</span><select name="stxSv">${list.map((x) => `<option value="${x.id}" ${x.id === sv.id ? 'selected' : ''}>${saveCatIcon(x)} ${escapeHtml(x.name)} (${saveCompact(x.balance)}/${saveCompact(x.target)})</option>`).join('')}</select></label>
        <label class="field"><span>Jenis</span><select name="stxKind"><option value="deposit" ${d.kind === 'deposit' ? 'selected' : ''}>⬇️ Setoran</option><option value="withdraw" ${d.kind === 'withdraw' ? 'selected' : ''}>⬆️ Penarikan</option></select></label>
        <label class="field"><span>Nominal (Rp)</span><input name="stxAmount" inputmode="numeric" value="${escapeHtml(d.amount)}" placeholder="mis. 500rb" required></label>
        <label class="field"><span>Tanggal</span><input type="date" name="stxDate" value="${escapeHtml(d.date)}"></label>
        <label class="field"><span>Sumber Dana</span><input name="stxSource" value="${escapeHtml(d.source)}" placeholder="mis. Rekening utama" maxlength="40"></label>
        <label class="field"><span>Catatan <small>opsional</small></span><input name="stxNote" value="${escapeHtml(d.note)}" placeholder="mis. sisihan gaji" maxlength="80"></label>
      </div>
      <p class="muted sv-tx-hint">Sisa ${sv.name ? escapeHtml(sv.name) : ''}: <b>${txRp(Math.max(0, sv.target - sv.balance))}</b> — saldo ${txRp(sv.balance)}, tidak bisa minus.</p>
      <div class="tx-form-actions">
        <button type="submit" class="btn primary">Simpan</button>
        <button type="button" class="btn" data-sv-cancelform2>Batal</button>
      </div>
    </form>`;
  }
  let saveTxPreset = null;
  function submitSvTxForm(form) {
    const sv = saveFind(form.stxSv.value);
    const amount = txParseAmount(form.stxAmount.value);
    const kind = form.stxKind.value;
    if (!sv) { showToast('Pilih target tabungan.', true); return; }
    if (!(amount > 0)) { showToast('Nominal tidak valid. Contoh: 500rb.', true); return; }
    if (kind === 'withdraw' && amount > sv.balance) { showToast(`Penarikan melebihi saldo ${txRp(sv.balance)}.`, true); return; }
    if (kind === 'deposit' && sv.balance + amount > sv.target * 3) { showToast('Setoran kejauhan di atas target — cek nominal.', true); return; }
    const date = form.stxDate.value || txIso(new Date());
    state.savingsTx.push({ id: uid('stx'), svId: sv.id, kind, amount, note: form.stxNote.value.trim(), date, source: form.stxSource.value.trim() || '—', ts: Date.now() });
    state.savings = saveList().map((s) => (s.id === sv.id ? { ...s, balance: Math.max(0, s.balance + (kind === 'deposit' ? amount : -amount)) } : s));
    const updated = saveFind(sv.id);
    saveTxOpen = false; saveTxDraft = null; saveTxPreset = null;
    saveState();
    showToast(kind === 'deposit'
      ? (updated.balance >= updated.target ? `🎉 Target "${updated.name}" tercapai!` : `Setoran ${txRp(amount)} masuk.`)
      : `Penarikan ${txRp(amount)} dicatat.`);
    if (kind === 'deposit' && updated.balance >= updated.target && !saveDetailId) saveDetailId = updated.id;
    renderShell();
  }

  function handleSaveAction(btn) {
    if (btn.matches('[data-sv-filter]')) { saveFilter = btn.dataset.svFilter; renderShell(); return true; }
    if (btn.matches('[data-sv-open]')) { saveDetailId = btn.dataset.svOpen; saveFormOpen = false; saveTxOpen = false; renderShell(); return true; }
    if (btn.matches('[data-sv-back]')) { saveDetailId = null; renderShell(); return true; }
    if (btn.matches('[data-sv-new]')) {
      saveFormOpen = true; saveEditingId = null; saveTxOpen = false; saveDetailId = null;
      saveDraft = saveDraft || { name: '', desc: '', target: '', balance: '', deadline: '', cat: SAVE_CATS[0].name, icon: SAVE_ICONS[0], color: SAVE_COLORS[0] };
      renderShell();
      const el = dom.content.querySelector('#svForm [name=svName]'); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => el.focus(), 350); }
      return true;
    }
    if (btn.matches('[data-sv-cancelform]')) { saveFormOpen = false; saveEditingId = null; saveDraft = null; renderShell(); return true; }
    if (btn.matches('[data-sv-cancelform2]')) { saveTxOpen = false; saveTxDraft = null; saveTxPreset = null; renderShell(); return true; }
    if (btn.matches('[data-sv-pick-ic]')) {
      const f = dom.content.querySelector('#svForm'); if (!f) return true;
      f.querySelectorAll('[data-sv-pick-ic]').forEach((b) => b.classList.remove('on'));
      btn.classList.add('on'); saveDraft = svDraftFrom(f);
      return true;
    }
    if (btn.matches('[data-sv-pick-color]')) {
      const f = dom.content.querySelector('#svForm'); if (!f) return true;
      f.querySelectorAll('[data-sv-pick-color]').forEach((b) => b.classList.remove('on'));
      btn.classList.add('on'); saveDraft = svDraftFrom(f);
      return true;
    }
    if (btn.matches('[data-sv-newtx]')) { saveTxOpen = true; saveFormOpen = false; saveTxPreset = saveDetailId; renderShell(); dom.content.querySelector('#svTxForm')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return true; }
    if (btn.matches('[data-sv-deposit]')) { saveTxOpen = true; saveFormOpen = false; saveTxPreset = btn.dataset.svDeposit; renderShell(); dom.content.querySelector('#svTxForm')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return true; }
    if (btn.matches('[data-sv-edit]')) {
      const s = saveFind(btn.dataset.svEdit);
      if (!s) return true;
      saveEditingId = s.id; saveFormOpen = true; saveTxOpen = false; saveDetailId = null; saveDraft = null;
      renderShell(); dom.content.querySelector('#svForm')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return true;
    }
    if (btn.matches('[data-sv-archive]')) {
      const s = saveFind(btn.dataset.svArchive);
      if (!s) return true;
      state.savings = saveList().map((x) => (x.id === s.id ? { ...x, archived: !x.archived } : x));
      saveState(); showToast(s.archived ? 'Dipulihkan ke aktif.' : 'Dimasukkan ke arsip.'); renderShell();
      return true;
    }
    if (btn.matches('[data-sv-del]')) {
      const s = saveFind(btn.dataset.svDel);
      if (!s) return true;
      if (!window.confirm(`Hapus tabungan "${s.name}" beserta riwayat setoran (${saveTxList().filter((t) => t.svId === s.id).length} catatan)?`)) return true;
      state.savings = saveList().filter((x) => x.id !== s.id);
      state.savingsTx = saveTxList().filter((t) => t.svId !== s.id);
      saveDetailId = null; saveFormOpen = false; saveEditingId = null; saveTxOpen = false;
      saveState(); showToast('Tabungan dihapus.'); renderShell();
      return true;
    }
    return false;
  }

  /* ============ MODUL BUDGET (finansial: anggaran per kategori) ============ */
  const BUD_CATS = [
    { name: 'Kebutuhan Pokok', icon: '🛒' },
    { name: 'Makan & Minum', icon: '🍜' },
    { name: 'Transportasi', icon: '🛵' },
    { name: 'Tagihan', icon: '🧾' },
    { name: 'Hiburan', icon: '🎮' },
    { name: 'Kesehatan', icon: '💊' },
    { name: 'Pendidikan', icon: '📚' },
    { name: 'Tabungan', icon: '🏦' },
    { name: 'Lainnya', icon: '📦' },
  ];
  // pemetaan kategori kas (transaksi) -> kategori budget, agar progress dihitung dari transaksi nyata
  const BUD_TX_MAP = {
    'Makanan': 'Makan & Minum',
    'Transportasi': 'Transportasi',
    'Belanja': 'Kebutuhan Pokok',
    'Tagihan': 'Tagihan',
    'Hiburan': 'Hiburan',
    'Kesehatan': 'Kesehatan',
    'Pendidikan': 'Pendidikan',
    'Lainnya': 'Lainnya',
  };
  let budMonth = '';        // 'YYYY-MM' terpilih ('' = bulan ini)
  let budFilter = 'all';    // all | ok | warn | over
  let budDetailId = null;   // halaman detail budget
  let budFormOpen = false;  // form tambah/edit terbuka
  let budEditingId = null;
  let budDraft = null;      // { name, cat, amount, note }

  function budPeriod() { return budMonth || txMonthNow(); }
  function budIcon(cat) { const c = BUD_CATS.find((x) => x.name === cat); return c ? c.icon : '📦'; }
  function budMonthLabel(p) { const [y, m] = p.split('-').map(Number); return `${MONTHS[m - 1]} ${y}`; }

  function ensureBudStore() {
    ensureTxStore(); // progress budget dihitung dari transaksi kas — pastikan ada datanya
    if (!Array.isArray(state.budgets)) state.budgets = [];
    if (!state.budSeeded) {
      state.budSeeded = true;
      if (state.budgets.length === 0) state.budgets = budSeedList();
      saveState();
    }
  }
  function budSeedList() {
    const p = txMonthNow();
    return [
      { id: uid('bud'), name: 'Belanja dapur', cat: 'Kebutuhan Pokok', period: p, amount: 600000, note: 'Stok mingguan + bulanan', createdAt: Date.now() - 86400000 * 12 },
      { id: uid('bud'), name: 'Makan harian', cat: 'Makan & Minum', period: p, amount: 900000, note: 'Masak + warkop', createdAt: Date.now() - 86400000 * 12 },
      { id: uid('bud'), name: 'Bensin & parkir', cat: 'Transportasi', period: p, amount: 300000, note: '', createdAt: Date.now() - 86400000 * 10 },
      { id: uid('bud'), name: 'Listrik, internet, pulsa', cat: 'Tagihan', period: p, amount: 450000, note: 'Jatuh tempo tanggal 10', createdAt: Date.now() - 86400000 * 9 },
      { id: uid('bud'), name: 'Nongkrong & langganan', cat: 'Hiburan', period: p, amount: 200000, note: 'Kopi + streaming', createdAt: Date.now() - 86400000 * 8 },
      { id: uid('bud'), name: 'Kesehatan', cat: 'Kesehatan', period: p, amount: 150000, note: 'Vitamin & darurat', createdAt: Date.now() - 86400000 * 7 },
    ];
  }
  function budList() { return Array.isArray(state.budgets) ? state.budgets : []; }
  function budFind(id) { return budList().find((b) => b.id === id) || null; }

  // transaksi keluar yang terkait budget: kategori terpetakan + tanggal dalam periode
  function budTxFor(cat, period) {
    return txList().filter((t) => t.type === 'out' && t.date && t.date.slice(0, 7) === period && BUD_TX_MAP[t.cat] === cat);
  }
  function budCalc(b) {
    const txs = budTxFor(b.cat, b.period);
    const spent = txs.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0;
    const status = pct > 100 ? 'over' : pct >= 80 ? 'warn' : 'ok';
    return { spent, pct, status, count: txs.length, left: b.amount - spent };
  }
  function budStatusText(s) { return s === 'over' ? 'Melebihi Anggaran' : s === 'warn' ? 'Mendekati Batas' : 'Normal'; }
  function budProgressHtml(pct, status, cls) {
    const w = Math.min(100, Math.max(0, pct));
    return `<div class="${cls}"><span class="bud-pb-${status}" style="width:${w.toFixed(1)}%"></span></div>`;
  }

  function renderBudgetView() {
    if (budDetailId) {
      const d = budFind(budDetailId);
      if (d) return renderBudDetail(d);
      budDetailId = null;
    }
    const period = budPeriod();
    const items = budList().filter((b) => b.period === period).map((b) => ({ b, c: budCalc(b) }));
    const total = items.reduce((s, x) => s + x.b.amount, 0);
    const spent = items.reduce((s, x) => s + x.c.spent, 0);
    const pct = total > 0 ? (spent / total) * 100 : 0;
    const status = pct > 100 ? 'over' : pct >= 80 ? 'warn' : 'ok';
    const filtered = items.filter((x) => budFilter === 'all' || (budFilter === 'over' ? x.c.status === 'over' : budFilter === 'warn' ? x.c.status === 'warn' : x.c.status === 'ok'));
    const recentTx = txList().filter((t) => t.type === 'out' && t.date && t.date.slice(0, 7) === period && BUD_TX_MAP[t.cat])
      .sort((a, b) => (b.date + String(b.ts || 0)).localeCompare(a.date + String(a.ts || 0))).slice(0, 5);

    const tabs = [['all', 'Semua'], ['ok', 'Normal'], ['warn', 'Mendekati'], ['over', 'Melebihi']];
    return `<div class="bud-page">
      <div class="panel bud-hero">
        <div class="bud-period">
          <button type="button" class="btn tiny" data-bud-mprev aria-label="Bulan sebelumnya">‹</button>
          <b>${budMonthLabel(period)}</b>
          <button type="button" class="btn tiny" data-bud-mnext aria-label="Bulan berikutnya">›</button>
          ${period === txMonthNow() ? '' : '<button type="button" class="btn tiny" data-bud-mtoday>Bulan ini</button>'}
        </div>
        <div class="bud-nums">
          <div><span>Total Anggaran</span><b>${txRp(total)}</b></div>
          <div><span>Terpakai</span><b class="coral">${txRp(spent)}</b></div>
          <div><span>Sisa</span><b class="${spent > total ? 'coral' : 'green'}">${spent > total ? '−' : ''}${txRp(Math.abs(total - spent))}</b></div>
          <div><span>Penggunaan</span><b class="${status === 'ok' ? 'green' : status === 'warn' ? 'amber' : 'coral'}">${pct.toFixed(0)}%</b></div>
        </div>
        <div class="bud-bar-wrap">${budProgressHtml(pct, status, 'bud-bar bud-bar-lg')}<em>${budStatusText(status)} · ${items.length} pos anggaran</em></div>
        <div class="bud-hero-actions">
          <button type="button" class="btn primary" data-bud-new>+ Tambah Budget</button>
          <button type="button" class="btn" data-bud-newtx>+ Tambah Transaksi</button>
        </div>
      </div>

      ${budFormOpen ? renderBudForm() : ''}
      ${budTxQuickAdd ? budTxFormHtml() : ''}

      <div class="bud-tabs" role="tablist">${tabs.map(([k, l]) => `<button type="button" class="bud-tab ${budFilter === k ? 'on' : ''}" data-bud-filter="${k}">${l}</button>`).join('')}</div>

      ${filtered.length === 0 ? `<div class="panel bud-empty">
        <div class="bud-empty-ic">🗂️</div>
        <h3>${items.length === 0 ? `Belum ada budget untuk ${budMonthLabel(period)}` : 'Tidak ada budget pada filter ini'}</h3>
        <p>Atur batas belanja per kategori, lalu pantau dari sini — angka terpakai dihitung otomatis dari Transaksi kas.</p>
        <div><button type="button" class="btn primary" data-bud-new>+ Tambah Budget</button>${items.length === 0 && budFilter !== 'all' ? '<button type="button" class="btn" data-bud-filter="all">Lihat Semua</button>' : ''}</div>
      </div>` : `<div class="bud-grid">${filtered.map(({ b, c }) => `
        <button type="button" class="panel bud-card ${c.status}" data-bud-open="${b.id}">
          <div class="bud-card-top"><span class="bud-ic">${budIcon(b.cat)}</span><span class="bud-card-name"><b>${escapeHtml(b.name)}</b><small>${b.cat}</small></span><span class="bud-pill ${c.status}">${budStatusText(c.status)}</span></div>
          ${budProgressHtml(c.pct, c.status, 'bud-bar')}
          <div class="bud-card-nums"><span>Tersedia <b>${txRp(b.amount)}</b></span><span>Pakai <b>${txRp(c.spent)}</b></span><span>Sisa <b class="${c.left < 0 ? 'coral' : ''}">${c.left < 0 ? '−' : ''}${txRp(Math.abs(c.left))}</b></span></div>
          <div class="bud-card-foot"><span>${c.count} transaksi</span><span class="${c.status === 'over' ? 'coral' : 'muted'}">${c.pct.toFixed(0)}%</span></div>
        </button>`).join('')}</div>`}

      ${recentTx.length ? `<div class="panel bud-recent">
        <h3>⚡ Transaksi Terbaru <small>yang memengaruhi budget</small></h3>
        ${recentTx.map((t) => `<div class="bud-rtx"><span class="bud-ic sm">${budIcon(BUD_TX_MAP[t.cat])}</span><div><b>${escapeHtml(t.note || t.cat)}</b><small>${budGroupDate(t.date)} · ${t.cat}</small></div><span class="coral">−${txRp(t.amount)}</span></div>`).join('')}
        <button type="button" class="btn tiny" data-bud-gotx>Lihat Semua Transaksi →</button>
      </div>` : ''}
    </div>`;
  }

  function budGroupDate(iso) {
    if (iso === txIso(new Date())) return 'Hari ini';
    const y = txIso(new Date(Date.now() - 86400000));
    if (iso === y) return 'Kemarin';
    const [mm, dd] = iso.slice(5).split('-');
    return `${Number(dd)} ${MONTHS[Number(mm) - 1].slice(0, 3)}`;
  }

  function renderBudDetail(b) {
    const c = budCalc(b);
    const txs = budTxFor(b.cat, b.period).sort((a, x) => x.date.localeCompare(a.date));
    const avg = txs.length ? c.spent / txs.length : 0;
    return `<div class="bud-page">
      <button type="button" class="btn tiny bud-back" data-bud-back>← Kembali ke Budget</button>
      <div class="panel bud-hero">
        <div class="bud-det-top">
          <span class="bud-ic lg">${budIcon(b.cat)}</span>
          <div><h2>${escapeHtml(b.name)}</h2><small>${b.cat} · ${budMonthLabel(b.period)} <span class="bud-pill ${c.status}">${budStatusText(c.status)}</span></small></div>
        </div>
        ${b.note ? `<p class="bud-det-note">📝 ${escapeHtml(b.note)}</p>` : ''}
        <div class="bud-nums">
          <div><span>Anggaran</span><b>${txRp(b.amount)}</b></div>
          <div><span>Terpakai</span><b class="coral">${txRp(c.spent)}</b></div>
          <div><span>Sisa</span><b class="${c.left < 0 ? 'coral' : 'green'}">${c.left < 0 ? '−' : ''}${txRp(Math.abs(c.left))}</b></div>
          <div><span>Penggunaan</span><b class="${c.status === 'ok' ? 'green' : c.status === 'warn' ? 'amber' : 'coral'}">${c.pct.toFixed(0)}%</b></div>
        </div>
        <div class="bud-bar-wrap">${budProgressHtml(c.pct, c.status, 'bud-bar bud-bar-lg')}<em>Rata-rata ${txRp(avg)} per transaksi · ${c.count} transaksi</em></div>
        <div class="bud-hero-actions">
          <button type="button" class="btn primary" data-bud-edit="${b.id}">✏️ Edit Budget</button>
          <button type="button" class="btn danger" data-bud-del="${b.id}">🗑 Hapus</button>
        </div>
      </div>
      <div class="panel bud-det-tx">
        <h3>Transaksi Terkait <small>kategori ${b.cat} · ${budMonthLabel(b.period)}</small></h3>
        ${txs.length === 0 ? '<p class="muted">Belum ada transaksi kas yang tercatat untuk kategori ini. Tambahkan lewat menu Transaksi.</p>' : txs.map((t) => `<div class="bud-rtx"><span class="bud-ic sm">↓</span><div><b>${escapeHtml(t.note || t.cat)}</b><small>${budGroupDate(t.date)} · ${t.cat}</small></div><span class="coral">−${txRp(t.amount)}</span></div>`).join('')}
      </div>
    </div>`;
  }

  function renderBudForm() {
    const editing = budEditingId ? budFind(budEditingId) : null;
    const d = budDraft || (editing ? { name: editing.name, cat: editing.cat, amount: String(editing.amount), note: editing.note || '' } : { name: '', cat: BUD_CATS[0].name, amount: '', note: '' });
    return `<form id="budForm" class="panel bud-form" novalidate>
      <h3>${editing ? '✏️ Edit Budget' : '➕ Tambah Budget'}</h3>
      <div class="tx-form-grid">
        <label class="field"><span>Nama Budget</span><input name="budName" value="${escapeHtml(d.name)}" placeholder="mis. Makan harian" maxlength="60" required></label>
        <label class="field"><span>Kategori</span><select name="budCat">${BUD_CATS.map((x) => `<option value="${x.name}" ${x.name === d.cat ? 'selected' : ''}>${x.icon} ${x.name}</option>`).join('')}</select></label>
        <label class="field"><span>Periode</span><input value="${budMonthLabel(budPeriod())}" disabled></label>
        <label class="field"><span>Jumlah Anggaran (Rp)</span><input name="budAmount" inputmode="numeric" value="${escapeHtml(d.amount)}" placeholder="mis. 500rb" required></label>
        <label class="field bud-field-wide"><span>Catatan <small>opsional</small></span><input name="budNote" value="${escapeHtml(d.note)}" maxlength="120" placeholder="mis. jatuh tempo tanggal 10"></label>
      </div>
      <div class="tx-form-actions">
        <button type="submit" class="btn primary">${editing ? 'Simpan Perubahan' : 'Tambah Budget'}</button>
        <button type="button" class="btn" data-bud-cancelform>Batal</button>
      </div>
    </form>`;
  }

  function budDraftFrom(form) {
    return { name: form.budName.value, cat: form.budCat.value, amount: form.budAmount.value, note: form.budNote.value };
  }

  function submitBudForm(form) {
    const draft = budDraftFrom(form);
    const amount = txParseAmount(draft.amount);
    if (!draft.name.trim()) { showToast('Nama budget wajib diisi.', true); return; }
    if (!(amount > 0)) { showToast('Jumlah anggaran tidak valid. Contoh: 500rb atau 1,5jt.', true); return; }
    if (budEditingId) {
      state.budgets = budList().map((b) => (b.id === budEditingId ? { ...b, name: draft.name.trim(), cat: draft.cat, amount, note: draft.note.trim() } : b));
      showToast('Budget diperbarui.');
      budEditingId = null; budDraft = null;
    } else {
      state.budgets.push({ id: uid('bud'), name: draft.name.trim(), cat: draft.cat, period: budPeriod(), amount, note: draft.note.trim(), createdAt: Date.now() });
      showToast(`Budget "${draft.name.trim()}" ditambahkan.`);
      budDraft = null;
    }
    budFormOpen = false;
    saveState(); renderShell();
  }

  function handleBudAction(btn) {
    if (btn.matches('[data-bud-mprev]')) { budMonth = txMonthShift(budPeriod(), -1); renderShell(); return true; }
    if (btn.matches('[data-bud-mnext]')) { budMonth = txMonthShift(budPeriod(), 1); renderShell(); return true; }
    if (btn.matches('[data-bud-mtoday]')) { budMonth = ''; renderShell(); return true; }
    if (btn.matches('[data-bud-filter]')) { budFilter = btn.dataset.budFilter; renderShell(); return true; }
    if (btn.matches('[data-bud-open]')) { budDetailId = btn.dataset.budOpen; budFormOpen = false; renderShell(); return true; }
    if (btn.matches('[data-bud-back]')) { budDetailId = null; renderShell(); return true; }
    if (btn.matches('[data-bud-new]')) {
      budFormOpen = true; budEditingId = null; budDraft = budDraft || { name: '', cat: BUD_CATS[0].name, amount: '', note: '' };
      budDetailId = null; renderShell();
      const el = dom.content.querySelector('#budForm [name=budName]'); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => el.focus(), 350); }
      return true;
    }
    if (btn.matches('[data-bud-cancelform]')) { budFormOpen = false; budEditingId = null; budDraft = null; renderShell(); return true; }
    if (btn.matches('[data-bud-edit]')) {
      const b = budFind(btn.dataset.budEdit);
      if (!b) return true;
      budEditingId = b.id; budFormOpen = true; budDetailId = null; budDraft = null;
      renderShell();
      dom.content.querySelector('#budForm')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return true;
    }
    if (btn.matches('[data-bud-del]')) {
      const b = budFind(btn.dataset.budDel);
      if (!b) return true;
      if (!window.confirm(`Hapus budget "${b.name}" (${txRp(b.amount)})?`)) return true;
      state.budgets = budList().filter((x) => x.id !== b.id);
      budDetailId = null; budEditingId = null; budFormOpen = false; budDraft = null;
      saveState(); showToast('Budget dihapus.'); renderShell();
      return true;
    }
    if (btn.matches('[data-bud-newtx]')) {
      budTxQuickAdd = !budTxQuickAdd;
      if (budTxQuickAdd) budFormOpen = false;
      renderShell();
      if (budTxQuickAdd) dom.content.querySelector('#budTxForm')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return true;
    }
    if (btn.matches('[data-bud-cancelform2]')) { budTxQuickAdd = false; renderShell(); return true; }
    if (btn.matches('[data-bud-gotx]')) { activeView = 'transaksi'; state.selectedView = 'transaksi'; saveState(); renderShell(); return true; }
    return false;
  }
  let budTxQuickAdd = false;

  function budTxFormHtml() {
    const cats = BUD_CATS.filter((c) => budList().some((b) => b.cat === c.name && b.period === budPeriod()));
    const list = cats.length ? cats : BUD_CATS.slice(0, 5);
    return `<form id="budTxForm" class="panel bud-form" novalidate>
      <h3>➕ Tambah Transaksi Keluar <small>langsung masuk ke anggaran kategori</small></h3>
      <div class="tx-form-grid">
        <label class="field"><span>Keterangan</span><input name="qtxNote" placeholder="mis. belanja sayur" maxlength="80"></label>
        <label class="field"><span>Jumlah (Rp)</span><input name="qtxAmount" inputmode="numeric" placeholder="mis. 35rb" required></label>
        <label class="field"><span>Kategori Budget</span><select name="qtxCat">${list.map((x) => `<option value="${x.name}">${x.icon} ${x.name}</option>`).join('')}</select></label>
        <label class="field"><span>Tanggal</span><input type="date" name="qtxDate" value="${txIso(new Date())}"></label>
      </div>
      <div class="tx-form-actions"><button type="submit" class="btn primary">Simpan Transaksi</button><button type="button" class="btn" data-bud-cancelform2>Batal</button></div>
    </form>`;
  }

  function submitBudTxForm(form) {
    const amount = txParseAmount(form.qtxAmount.value);
    if (!(amount > 0)) { showToast('Jumlah tidak valid. Contoh: 35rb.', true); return; }
    const cat = form.qtxCat.value;
    const invMap = Object.fromEntries(Object.entries(BUD_TX_MAP).map(([k, v]) => [v, k]));
    if (!Array.isArray(state.transactions)) state.transactions = [];
    state.transactions.push({ id: uid('tx'), type: 'out', amount, note: form.qtxNote.value.trim() || cat, cat: invMap[cat] || 'Lainnya', date: form.qtxDate.value || txIso(new Date()), ts: Date.now() });
    budTxQuickAdd = false;
    saveState(); showToast('Transaksi dicatat & budget diperbarui.'); renderShell();
  }

  /* ============ MODUL TRANSAKSI (kas harian + kalender PnL) ============ */
  const TX_CATS_OUT = ['Makanan', 'Transportasi', 'Belanja', 'Tagihan', 'Hiburan', 'Lainnya'];
  const TX_CATS_IN = ['Gaji', 'Jual Barang', 'Bonus', 'Hadiah', 'Lainnya'];
  let txFilter = 'all';        // daftar: all | in | out
  let txMonth = '';            // kalender: 'YYYY-MM' ('' = bulan berjalan)
  let txDaySel = '';           // hari terpilih di kalender: 'YYYY-MM-DD' | ''
  let txFormType = 'out';      // form aktif: 'in' | 'out'
  let txEditingId = null;
  let txFormDraft = null;

  function txTodayIso() { return txIso(new Date()); }
  function txIso(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
  function txMonthNow() { return txTodayIso().slice(0, 7); }
  function txMonthLabel(m) { const [y, mo] = m.split('-').map(Number); return `${MONTHS[mo - 1]} ${y}`; }
  function txMonthShift(m, delta) { const [y, mo] = m.split('-').map(Number); const d = new Date(y, mo - 1 + delta, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }

  function ensureTxStore() {
    if (!Array.isArray(state.transactions)) { state.transactions = []; }
    if (!state.txSeeded) {
      state.txSeeded = true;
      if (state.transactions.length === 0) { state.transactions = txSeedList(); }
      saveState();
    }
  }

  function txSeedList() {
    const day = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return txIso(d); };
    return [
      { id: uid('tx'), type: 'out', amount: 22000, note: 'Bubur ayam pagi', cat: 'Makanan', date: day(0), ts: Date.now() - 28800000 },
      { id: uid('tx'), type: 'out', amount: 15000, note: 'Kopi di workspace', cat: 'Hiburan', date: day(0), ts: Date.now() - 18000000 },
      { id: uid('tx'), type: 'in', amount: 150000, note: 'Invoice proyek website', cat: 'Jual Barang', date: day(1), ts: Date.now() - 90000000 },
      { id: uid('tx'), type: 'out', amount: 68000, note: 'Belanja bulanan', cat: 'Belanja', date: day(1), ts: Date.now() - 100000000 },
      { id: uid('tx'), type: 'out', amount: 40000, note: 'Bensin motor', cat: 'Transportasi', date: day(2), ts: Date.now() - 180000000 },
      { id: uid('tx'), type: 'in', amount: 2500000, note: 'Gaji freelancer', cat: 'Gaji', date: day(3), ts: Date.now() - 260000000 },
      { id: uid('tx'), type: 'out', amount: 350000, note: 'Token listrik + internet', cat: 'Tagihan', date: day(4), ts: Date.now() - 350000000 },
      { id: uid('tx'), type: 'out', amount: 30000, note: 'Makan siang', cat: 'Makanan', date: day(5), ts: Date.now() - 435000000 },
      { id: uid('tx'), type: 'in', amount: 75000, note: 'Jual buku kuliah', cat: 'Jual Barang', date: day(8), ts: Date.now() - 700000000 },
      { id: uid('tx'), type: 'out', amount: 120000, note: 'Servis AC', cat: 'Lainnya', date: day(12), ts: Date.now() - 1040000000 },
    ];
  }

  function txList() { return Array.isArray(state.transactions) ? state.transactions : []; }
  function txFind(id) { return txList().find((t) => t.id === id) || null; }

  function txParseAmount(raw) {
    let s = String(raw || '').toLowerCase().replace(/\s/g, '');
    let mult = 1;
    if (/(jt|juta)$/.test(s)) { mult = 1000000; s = s.replace(/(jt|juta)$/, ''); }
    else if (/(rb|ribu)$/.test(s)) { mult = 1000; s = s.replace(/(rb|ribu)$/, ''); }
    let t = s.replace(/[^0-9.,]/g, '');
    if (t.includes(',') && t.includes('.')) {
      t = t.replace(/\./g, '').replace(',', '.');
    } else {
      const m = t.match(/^(\d+)([.,])(\d+)$/);
      if (m && m[3].length === 3) t = m[1] + m[3];
      else if (m && m[3].length <= 2) t = `${m[1]}.${m[3]}`;
      else t = t.replace(/[.,]/g, '');
    }
    const n = Math.round(parseFloat(t) * mult);
    return isFinite(n) && n > 0 ? n : 0;
  }
  function txRp(n) { return `Rp\u00A0${Math.abs(Math.round(n || 0)).toLocaleString('id-ID')}`; }
  function txCompact(n) {
    const a = Math.abs(Math.round(n || 0));
    if (a >= 1000000) return `${(a / 1000000).toFixed(a >= 10000000 ? 0 : 1).replace('.', ',')}jt`;
    if (a >= 1000) return `${Math.round(a / 1000)}rb`;
    return String(a);
  }
  function txByDay(month) {
    const map = {};
    txList().forEach((t) => {
      if (t.date && t.date.startsWith(month)) map[t.date] = (map[t.date] || 0) + (t.type === 'in' ? t.amount : -t.amount);
    });
    return map;
  }
  function txMonthTotals(month) {
    let inn = 0; let out = 0; let cnt = 0;
    txList().forEach((t) => { if (t.date && t.date.startsWith(month)) { cnt += 1; if (t.type === 'in') inn += t.amount; else out += t.amount; } });
    return { inn, out, net: inn - out, cnt };
  }
  function txFiltered() {
    let list = txList().filter((t) => {
      if (txFilter !== 'all' && t.type !== txFilter) return false;
      if (txDaySel && t.date !== txDaySel) return false;
      return true;
    });
    return [...list].sort((a, b) => (a.date === b.date ? (b.ts || 0) - (a.ts || 0) : a.date < b.date ? 1 : -1));
  }
  function txGroupLabel(dateStr) {
    if (dateStr === txTodayIso()) return 'Hari Ini';
    const y = new Date(); y.setDate(y.getDate() - 1);
    if (dateStr === txIso(y)) return 'Kemarin';
    const [yy, mm, dd] = dateStr.split('-').map(Number);
    return `${dd} ${MONTHS[mm - 1]} ${yy}`;
  }

  function ensureTxFormDefaults() {
    const today = txTodayIso();
    const inCats = txFormType === 'in' ? TX_CATS_IN : TX_CATS_OUT;
    const cat = txFormDraft && inCats.includes(txFormDraft.cat) ? txFormDraft.cat : inCats[0];
    return {
      amount: txFormDraft && txFormDraft.type === txFormType ? txFormDraft.amount : '',
      note: txFormDraft && txFormDraft.type === txFormType ? txFormDraft.note : '',
      date: (txFormDraft && txFormDraft.date) || today,
      cat,
    };
  }

  function txStatsHtml(month) {
    const tot = txMonthTotals(month);
    const today = txTodayIso();
    let tin = 0; let tout = 0; let tc = 0;
    txList().forEach((t) => { if (t.date === today) { tc += 1; if (t.type === 'in') tin += t.amount; else tout += t.amount; } });
    const netToday = tin - tout;
    const cards = [
      { v: txRp(tot.inn), l: `Masuk · ${txMonthLabel(month)}`, c: 'green', i: '↑' },
      { v: txRp(tot.out), l: `Keluar · ${txMonthLabel(month)}`, c: 'coral', i: '↓' },
      { v: `${tot.net < 0 ? '−' : ''}${txRp(tot.net)}`, l: 'Saldo Bulan Ini', c: tot.net >= 0 ? 'green' : 'coral', i: tot.net >= 0 ? '📈' : '📉' },
      { v: `${netToday < 0 ? '−' : '+'}${txRp(netToday)}`, l: `Hari Ini · ${tc} transaksi`, c: netToday >= 0 ? 'green' : 'coral', i: '💸' },
    ];
    return `<div class="tx-stats">${cards.map((c) => `<div class="tx-stat ${c.c}"><span class="tx-stat-ic">${c.i}</span><div><b>${c.v}</b><span>${c.l}</span></div></div>`).join('')}</div>`;
  }

  function txFormHtml() {
    const d = ensureTxFormDefaults();
    const editing = txEditingId ? txFind(txEditingId) : null;
    const cats = txFormType === 'in' ? TX_CATS_IN : TX_CATS_OUT;
    return `<div class="panel tx-form-card">
      <div class="tx-form-head"><h3>${editing ? '✏️ Edit Transaksi' : '➕ Catat Transaksi'}</h3>
        ${editing ? '<button type="button" class="btn tiny" data-tx-canceledit>Batal</button>' : ''}</div>
      <form id="txForm" class="tx-form">
        <div class="tx-type-toggle" role="group">
          <button type="button" class="tx-type-btn in ${txFormType === 'in' ? 'on' : ''}" data-tx-ftype-btn="in">↑ Masuk</button>
          <button type="button" class="tx-type-btn out ${txFormType === 'out' ? 'on' : ''}" data-tx-ftype-btn="out">↓ Keluar</button>
        </div>
        <div class="tx-form-grid">
          <label class="field"><span>Nominal</span><input name="txAmount" inputmode="numeric" autocomplete="off" placeholder="cth: 50rb / 120.000" value="${escapeHtml(String(d.amount))}" /></label>
          <label class="field"><span>Keterangan</span><input name="txNote" maxlength="80" autocomplete="off" placeholder="cth: makan siang" value="${escapeHtml(String(d.note))}" /></label>
          <label class="field"><span>Kategori</span><select name="txCat">${cats.map((c) => `<option value="${c}" ${c === d.cat ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
          <label class="field"><span>Tanggal</span><input type="date" name="txDate" value="${d.date}" /></label>
        </div>
        <div class="tx-form-actions"><button type="submit" class="btn primary">${editing ? 'Simpan Perubahan' : '+ Tambah Data'}</button></div>
      </form>
    </div>`;
  }

  function txCalendarHtml(month) {
    const byDay = txByDay(month);
    const [y, mo] = month.split('-').map(Number);
    const days = new Date(y, mo, 0).getDate();
    const firstOffset = (new Date(y, mo - 1, 1).getDay() + 6) % 7;
    const nets = Object.values(byDay);
    const maxAbs = Math.max(100000, ...nets.map((n) => Math.abs(n)));
    const lvl = (n) => { const a = Math.abs(n); if (a === 0) return 0; const r = a / maxAbs; return r < 0.34 ? 1 : r < 0.67 ? 2 : 3; };
    const todayStr = txTodayIso();
    let cells = '';
    for (let i = 0; i < firstOffset; i += 1) cells += '<div class="tx-cel empty"></div>';
    for (let dd = 1; dd <= days; dd += 1) {
      const iso = `${month}-${String(dd).padStart(2, '0')}`;
      const net = byDay[iso];
      const has = typeof net === 'number';
      const cls = has ? (net > 0 ? `ok${lvl(net)}` : net < 0 ? `bad${lvl(net)}` : 'zero') : 'none';
      const sel = txDaySel === iso ? ' sel' : '';
      const isToday = iso === todayStr ? ' today' : '';
      const amt = has && net !== 0 ? `<span class="tx-cel-amt">${net > 0 ? '+' : '−'}${txCompact(net)}</span>` : '<span class="tx-cel-amt dim">·</span>';
      cells += `<button type="button" class="tx-cel ${cls}${sel}${isToday}" data-tx-day="${iso}" title="${dd} ${MONTHS[mo - 1]}${has ? ` — ${net < 0 ? '−' : ''}${txRp(net)}` : ' — belum ada transaksi'}"><b>${dd}</b>${amt}</button>`;
    }
    let best = null; let worst = null;
    Object.entries(byDay).forEach(([dstr, n]) => { if (!best || n > best[1]) best = [dstr, n]; if (!worst || n < worst[1]) worst = [dstr, n]; });
    const profitDays = nets.filter((n) => n > 0).length;
    const lossDays = nets.filter((n) => n < 0).length;
    const isCur = month === txMonthNow();
    return `<div class="panel tx-cal-card">
      <div class="tx-cal-head">
        <h3>📊 Kalender PnL</h3>
        <div class="tx-cal-nav">
          <button type="button" class="btn tiny" data-tx-mprev aria-label="Bulan sebelumnya">‹</button>
          <b>${txMonthLabel(month)}</b>
          <button type="button" class="btn tiny" data-tx-mnext aria-label="Bulan berikutnya">›</button>
          ${isCur ? '' : '<button type="button" class="btn tiny" data-tx-mtoday>Bulan ini</button>'}
        </div>
      </div>
      <div class="tx-cal-dow">${['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((d) => `<span>${d}</span>`).join('')}</div>
      <div class="tx-cal-grid">${cells}</div>
      <div class="tx-cal-foot">
        <div class="tx-legend"><span class="tx-lg bad3"></span><span class="tx-lg bad2"></span><span class="tx-lg bad1"></span><span class="rugi">Rugi</span><span class="tx-lg zero"></span><span class="tx-lg ok1"></span><span class="tx-lg ok2"></span><span class="tx-lg ok3"></span><span class="profit">Profit</span></div>
        <div class="tx-cal-sum">${profitDays} hari profit · ${lossDays} hari rugi${best && best[1] > 0 ? ` · terbaik ${txGroupLabel(best[0])} <b class="pos">+${txCompact(best[1])}</b>` : ''}${worst && worst[1] < 0 ? ` · terburuk ${txGroupLabel(worst[0])} <b class="neg">−${txCompact(worst[1])}</b>` : ''}</div>
        ${txDaySel ? `<button type="button" class="btn tiny" data-tx-dayclear>✕ Lepas pilihan hari (${txGroupLabel(txDaySel)})</button>` : ''}
      </div>
    </div>`;
  }

  function txListHtml() {
    const rows = txFiltered();
    const tabs = [['all', 'Semua'], ['in', '↑ Masuk'], ['out', '↓ Keluar']];
    if (!rows.length) {
      return `<div class="panel tx-list-card"><div class="tx-list-head"><h3>🧾 Riwayat Transaksi</h3><div class="tx-tabs">${tabs.map(([k, l]) => `<button type="button" class="tx-tab ${txFilter === k ? 'on' : ''}" data-tx-ftype="${k}">${l}</button>`).join('')}</div></div>
        <div class="tx-empty"><span>💸</span><b>${txList().length ? 'Tidak ada hasil' : 'Belum ada transaksi'}</b>
        <p>${txList().length ? 'Ubah filter atau pilih hari lain di kalender.' : 'Mulai catat uang masuk & keluar pertamamu.'}</p>
        <button type="button" class="btn primary" data-tx-focus>+ Tambah Data</button></div></div>`;
    }
    let html = ''; let lastDate = '';
    rows.forEach((t) => {
      if (t.date !== lastDate) {
        lastDate = t.date;
        const dayNet = txList().filter((x) => x.date === t.date).reduce((s, x) => s + (x.type === 'in' ? x.amount : -x.amount), 0);
        html += `<div class="tx-group-head"><b>${escapeHtml(txGroupLabel(t.date))}</b><span class="${dayNet >= 0 ? 'pos' : 'neg'}">${dayNet >= 0 ? '+' : '−'}${txRp(dayNet)}</span></div>`;
      }
      const isIn = t.type === 'in';
      const time = t.ts ? new Date(t.ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
      html += `<div class="tx-row" data-tx-id="${t.id}">
        <span class="tx-row-ic ${isIn ? 'in' : 'out'}">${isIn ? '↑' : '↓'}</span>
        <div class="tx-row-mid"><b>${escapeHtml(t.note || t.cat || (isIn ? 'Pemasukan' : 'Pengeluaran'))}</b>
          <span>${escapeHtml(t.cat || '')}${time ? ` · ${time}` : ''}</span></div>
        <div class="tx-row-amt ${isIn ? 'pos' : 'neg'}">${isIn ? '+' : '−'}${txRp(t.amount)}</div>
        <div class="tx-row-act">
          <button type="button" class="tx-icobtn" data-tx-edit="${t.id}" title="Edit">✏️</button>
          <button type="button" class="tx-icobtn danger" data-tx-del="${t.id}" title="Hapus">🗑</button>
        </div></div>`;
    });
    return `<div class="panel tx-list-card"><div class="tx-list-head"><h3>🧾 Riwayat Transaksi</h3><div class="tx-tabs">${tabs.map(([k, l]) => `<button type="button" class="tx-tab ${txFilter === k ? 'on' : ''}" data-tx-ftype="${k}">${l}</button>`).join('')}</div></div>${html}</div>`;
  }

  function renderTxView() {
    const month = txMonth || txMonthNow();
    return `<div class="tx-page">${txStatsHtml(month)}${txFormHtml()}${txCalendarHtml(month)}${txListHtml()}</div>`;
  }

  function submitTxForm(form) {
    const amount = txParseAmount(form.txAmount.value);
    if (!amount) { showToast('Nominal tidak valid — isi angka, cth: 50rb atau 120.000.'); form.txAmount.focus(); return; }
    const note = form.txNote.value.trim().slice(0, 80);
    const cat = form.txCat.value;
    const date = form.txDate.value || txTodayIso();
    if (date > txTodayIso()) { showToast('Tanggal belum terjadi — pilih hari ini atau sebelumnya.'); return; }
    if (txEditingId) {
      const t = txFind(txEditingId);
      if (t) { t.type = txFormType; t.amount = amount; t.note = note || cat; t.cat = cat; t.date = date; t.ts = t.ts || Date.now(); showToast('Transaksi diperbarui.'); }
      txEditingId = null; txFormDraft = null;
    } else {
      state.transactions = txList().concat([{ id: uid('tx'), type: txFormType, amount, note: note || cat, cat, date, ts: Date.now() }]);
      showToast(txFormType === 'in' ? `Masuk ${txRp(amount)} tercatat ✅` : `Keluar ${txRp(amount)} tercatat ✅`);
      txFormDraft = null;
    }
    saveState();
    renderShell();
  }

  function handleTxAction(btn) {
    if (btn.matches('[data-tx-ftype]')) { txFilter = btn.dataset.txFtype; renderShell(); return true; }
    if (btn.matches('[data-tx-ftype-btn]')) {
      const form = dom.content.querySelector('#txForm');
      if (form) txFormDraft = { type: txFormType, amount: form.txAmount.value, note: form.txNote.value, cat: form.txCat.value, date: form.txDate.value };
      txFormType = btn.dataset.txFtypeBtn; renderShell();
      const el = dom.content.querySelector('#txForm [name=txAmount]'); if (el) el.focus();
      return true;
    }
    if (btn.matches('[data-tx-mprev]')) { txMonth = txMonthShift(txMonth || txMonthNow(), -1); renderShell(); return true; }
    if (btn.matches('[data-tx-mnext]')) { txMonth = txMonthShift(txMonth || txMonthNow(), 1); renderShell(); return true; }
    if (btn.matches('[data-tx-mtoday]')) { txMonth = txMonthNow(); renderShell(); return true; }
    if (btn.matches('[data-tx-day]')) { const d = btn.dataset.txDay; txDaySel = txDaySel === d ? '' : d; renderShell(); return true; }
    if (btn.matches('[data-tx-dayclear]')) { txDaySel = ''; renderShell(); return true; }
    if (btn.matches('[data-tx-focus]')) {
      const el = dom.content.querySelector('#txForm [name=txAmount]');
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => el.focus(), 350); }
      return true;
    }
    if (btn.matches('[data-tx-canceledit]')) { txEditingId = null; txFormDraft = null; renderShell(); return true; }
    if (btn.matches('[data-tx-edit]')) {
      const t = txFind(btn.dataset.txEdit);
      if (!t) return true;
      txEditingId = t.id; txFormType = t.type;
      txFormDraft = { type: t.type, amount: t.amount, note: t.note, cat: t.cat, date: t.date };
      renderShell();
      const el = dom.content.querySelector('#txForm'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return true;
    }
    if (btn.matches('[data-tx-del]')) {
      const t = txFind(btn.dataset.txDel);
      if (!t) return true;
      if (!window.confirm(`Hapus transaksi "${t.note || t.cat}" (${txRp(t.amount)})?`)) return true;
      state.transactions = txList().filter((x) => x.id !== t.id);
      if (txEditingId === t.id) { txEditingId = null; txFormDraft = null; }
      saveState(); showToast('Transaksi dihapus.'); renderShell();
      return true;
    }
    return false;
  }

  /* ============ MODUL DOKUMEN (document hub: berkas & tautan) ============ */
  const DOC_BASE_CATS = ['Project', 'Kuliah', 'Keuangan', 'Pekerjaan', 'Referensi'];
  const DOC_FILE_LIMIT = 2 * 1024 * 1024; // 2 MB per berkas (disimpan base64, ikut tersinkron)
  let docSearch = '';
  let docCat = 'Semua';
  let docType = 'all';
  let docFavOnly = false;
  let docSort = 'terbaru';
  let docMenuId = null;
  let docModal = null;        // 'add' | 'edit'
  let docEditingId = null;
  let docFormType = 'link';   // 'link' | 'file'
  let docPickedFile = null;   // { name, size, type, data }
  let docBusy = false;
  let docMoveOpen = false;

  function ensureDocStore() {
    let dirty = false;
    if (!Array.isArray(state.documents)) { state.documents = []; dirty = true; }
    if (!Array.isArray(state.docCats)) { state.docCats = []; dirty = true; }
    if (!state.docSeeded) {
      state.docSeeded = true;
      state.documents = docSeedList();
      dirty = true;
    }
    if (dirty) saveState();
  }

  function docSeedList() {
    const now = Date.now();
    const file = (name, text) => {
      const data = 'data:text/plain;base64,' + btoa(unescape(encodeURIComponent(text)));
      return { data, fileName: name, fileType: 'text/plain', size: text.length };
    };
    return [
      { id: uid('doc'), kind: 'link', name: 'Dokumentasi Next.js', desc: 'Referensi resmi belajar App Router.', category: 'Referensi', tags: ['nextjs', 'web'], url: 'https://nextjs.org/docs', favorite: true, createdAt: now - 86400000 * 2, updatedAt: now - 86400000 },
      { id: uid('doc'), kind: 'link', name: 'Dashboard Supabase', desc: 'Proyek tracker-daily (SQL & storage).', category: 'Project', tags: ['database'], url: 'https://supabase.com/dashboard', favorite: false, createdAt: now - 86400000 * 5, updatedAt: now - 86400000 * 5 },
      { id: uid('doc'), kind: 'link', name: 'Kalkulator Bunga Majemuk', desc: 'Tools perencanaan tabungan.', category: 'Keuangan', tags: ['tools', 'tabungan'], url: 'https://www.investor.gov/financial-tools-calculators/calculators-compound-interest', favorite: false, createdAt: now - 86400000 * 9, updatedAt: now - 86400000 * 9 },
      { id: uid('doc'), kind: 'file', name: 'Checklist Skripsi.txt', desc: 'Tahapan yang harus selesai sebelum sidang.', category: 'Kuliah', tags: ['checklist'], favorite: true, ...file('Checklist Skripsi.txt', 'CHECKLIST SKRIPSI\n\n[x] Topik disetujui dosen pembimbing\n[ ] Bab 1-3 selesai\n[ ] Sidang proposal\n[ ] Pengumpulan data\n[ ] Olah data & Bab 4\n[ ] Sidang hasil\n[ ] Revisi & hardbound\n'), createdAt: now - 86400000 * 3, updatedAt: now - 3600000 * 5 },
      { id: uid('doc'), kind: 'file', name: 'Template Notulen Rapat.txt', desc: 'Format cepat mencatat rapat.', category: 'Pekerjaan', tags: ['template', 'rapat'], favorite: false, ...file('Template Notulen Rapat.txt', 'NOTULEN RAPAT\nTanggal : \nPukul   : \nPimpinan: \nPeserta : \n\nAGENDA\n1. \n2. \n\nKEPUTUSAN\n- \n\nACTION ITEM\n- PIC: ... Deadline: ...\n'), createdAt: now - 86400000 * 1, updatedAt: now - 86400000 },
      { id: uid('doc'), kind: 'file', name: 'Ide Konten Batu Bata.txt', desc: 'Cadangan ide dari modul Catatan.', category: 'Project', tags: ['ide', 'marketing'], favorite: false, ...file('Ide Konten Batu Bata.txt', 'IDE KONTEN\n1. Video proses pembakaran batu bata\n2. Perbandingan bata merah vs ringan\n3. Testimoni pelanggan proyek villas\n4. Tips aduk spesi yang benar\n'), createdAt: now - 3600000 * 4, updatedAt: now - 3600000 * 4 },
    ];
  }

  function docList() { return Array.isArray(state.documents) ? state.documents : []; }
  function docFind(id) { return docList().find((d) => d.id === id) || null; }
  function docCatsAll() { return [...DOC_BASE_CATS, ...(state.docCats || [])]; }
  function docSaveDocs() { saveState(); }

  function docFiltered() {
    const q = docSearch.trim().toLowerCase();
    let list = docList().filter((d) => {
      if (docFavOnly && !d.favorite) return false;
      if (docCat === 'Favorit') { if (!d.favorite) return false; }
      else if (docCat !== 'Semua' && d.category !== docCat) return false;
      if (docType !== 'all' && d.kind !== docType) return false;
      if (q) {
        const hay = [d.name, d.desc, d.category, ...(d.tags || [])].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      if (docSort === 'lama' || docSort === 'terlama') return a.createdAt - b.createdAt;
      if (docSort === 'nama') return String(a.name).localeCompare(String(b.name), 'id');
      return b.updatedAt - a.updatedAt;
    });
    return list;
  }

  function docFmtBytes(b) {
    if (typeof b !== 'number' || !isFinite(b)) return '';
    if (b < 1024) return `${b} B`;
    if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1048576).toFixed(1)} MB`;
  }

  function docTimeLabel(ts) {
    const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
    if (s < 60) return 'baru saja';
    const m = Math.floor(s / 60); if (m < 60) return `${m} menit lalu`;
    const h = Math.floor(m / 60); if (h < 24) return `${h} jam lalu`;
    const d = Math.floor(h / 24); if (d < 30) return `${d} hari lalu`;
    return new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function docKindLabel(d) { return d.kind === 'link' ? 'Tautan' : 'Berkas'; }

  function docIcon(d) {
    if (d.kind === 'link') return '🔗';
    const ext = String(d.fileName || d.name).split('.').pop().toLowerCase();
    const t = d.fileType || '';
    if (t.startsWith('image/')) return '🖼️';
    if (t === 'application/pdf' || ext === 'pdf') return '📕';
    if (['doc', 'docx'].includes(ext)) return '📘';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return '📗';
    if (['ppt', 'pptx'].includes(ext)) return '📙';
    if (['zip', 'rar', '7z'].includes(ext)) return '🗜️';
    if (t.startsWith('video/')) return '🎬';
    if (t.startsWith('audio/')) return '🎵';
    return '📄';
  }

  function docOpen(d) {
    if (!d) return;
    const href = d.kind === 'link' ? d.url : d.data;
    if (!href) { showToast('Dokumen ini belum punya isi/tautan.'); return; }
    const a = document.createElement('a');
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener';
    if (d.kind === 'file' && d.data) a.download = d.fileName || d.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function docsEmptyHtml(hasAny) {
    return `<div class="doc-empty"><span>🗂️</span><b>${hasAny ? 'Tidak ada hasil' : 'Belum ada dokumen'}</b>
      <p>${hasAny ? 'Coba kata kunci lain atau ubah filter.' : 'Simpan berkas & tautan penting di satu tempat — mulai dari sini.'}</p>
      <div class="doc-empty-cta"><button type="button" class="btn primary" data-doc-new>+ Tambah Dokumen</button><button type="button" class="btn" data-doc-link>🔗 Tambah Link</button></div></div>`;
  }

  function docsStatsHtml() {
    const docs = docList();
    const week = Date.now() - 7 * 86400000;
    const items = [
      { n: docs.length, l: 'Total Dokumen', c: 'amber' },
      { n: docs.filter((d) => d.kind === 'link').length, l: 'Total Link', c: 'teal' },
      { n: docs.filter((d) => d.favorite).length, l: 'Favorit', c: 'orange' },
      { n: docs.filter((d) => d.createdAt >= week).length, l: 'Baru (7 hari)', c: 'green' },
    ];
    return `<div class="doc-stats">${items.map((s) => `<div class="doc-stat ${s.c}"><b>${s.n}</b><span>${s.l}</span></div>`).join('')}</div>`;
  }

  function docsRowsHtml(list) {
    return list.map((d) => `<tr class="doc-row" data-doc-open="${d.id}">
      <td data-l="Dokumen"><div class="doc-cell"><span class="doc-ic">${docIcon(d)}</span><div class="doc-cell-t"><b>${d.favorite ? '⭐ ' : ''}${escapeHtml(d.name)}</b>${d.desc ? `<small>${escapeHtml(d.desc)}</small>` : ''}</div></div></td>
      <td data-l="Tipe"><span class="doc-type ${d.kind}">${docKindLabel(d)}</span></td>
      <td data-l="Kategori"><span class="doc-cat">${escapeHtml(d.category || '—')}</span></td>
      <td data-l="Tag">${(d.tags || []).length ? `<span class="doc-tags">${d.tags.slice(0, 3).map((t) => `<span>#${escapeHtml(t)}</span>`).join('')}${d.tags.length > 3 ? `<span>+${d.tags.length - 3}</span>` : ''}</span>` : '<span class="doc-dim">—</span>'}</td>
      <td data-l="Ukuran">${d.kind === 'file' ? escapeHtml(docFmtBytes(d.size) || '—') : '<span class="doc-dim">—</span>'}</td>
      <td data-l="Diperbarui">${docTimeLabel(d.updatedAt)}</td>
      <td class="doc-td-act"><button type="button" class="icon-button" data-doc-menu="${d.id}" aria-label="Aksi dokumen">⋮</button></td>
    </tr>`).join('');
  }

  function renderDocListPage() {
    const list = docFiltered();
    const hasAny = docList().length > 0;
    const cats = ['Semua', ...docCatsAll(), 'Favorit'];
    const tabs = cats.map((c) => `<button type="button" class="goal-chip doc-tab${docCat === c ? ' on' : ''}" data-doc-tab="${escapeHtml(c)}">${c}</button>`).join('');
    const sheet = docMenuId ? docActionSheet(docFind(docMenuId)) : '';
    const modal = docModal ? renderDocModal() : '';
    return `<div class="docs-page">
      <div class="doc-toolbar"><button type="button" class="btn primary" data-doc-new>+ Tambah Dokumen</button></div>
      ${docsStatsHtml()}
      <div class="doc-actions">
        <button type="button" class="doc-qact" data-doc-upload><span>📤</span>Upload File</button>
        <button type="button" class="doc-qact" data-doc-link><span>🔗</span>Tambah Link</button>
        <button type="button" class="doc-qact" data-doc-addcat><span>📁</span>Buat Folder</button>
        <button type="button" class="doc-qact" data-doc-import><span>📥</span>Import</button>
      </div>
      <label class="task-search doc-search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input type="search" data-doc-search placeholder="Cari nama, deskripsi, kategori, tag…" value="${escapeHtml(docSearch)}" autocomplete="off" /></label>
      <div class="doc-tabs">${tabs}<button type="button" class="doc-tab doc-addcat" data-doc-addcat aria-label="Buat kategori baru">+ Kategori</button></div>
      <div class="doc-filterrow">
        <select data-doc-ftype aria-label="Filter tipe"><option value="all"${docType === 'all' ? ' selected' : ''}>Semua tipe</option><option value="file"${docType === 'file' ? ' selected' : ''}>Berkas</option><option value="link"${docType === 'link' ? ' selected' : ''}>Tautan</option></select>
        <select data-doc-sort aria-label="Urutkan">${[['terbaru', 'Terbaru diperbarui'], ['lama', 'Terlama dibuat'], ['nama', 'Nama A-Z']].map(([k, l]) => `<option value="${k}"${docSort === k ? ' selected' : ''}>${l}</option>`).join('')}</select>
        <button type="button" class="goal-chip doc-tab${docFavOnly ? ' on' : ''}" data-doc-favfil>⭐ Favorit</button>
        <span class="doc-count">${list.length} dokumen</span>
      </div>
      <div class="doc-tablewrap">${list.length ? `<table class="doc-table"><thead><tr><th>Dokumen</th><th>Tipe</th><th>Kategori</th><th>Tag</th><th>Ukuran</th><th>Diperbarui</th><th></th></tr></thead><tbody>${docsRowsHtml(list)}</tbody></table>` : docsEmptyHtml(hasAny)}</div>
      <button type="button" class="note-fab doc-fab" data-doc-new aria-label="Tambah dokumen">+</button>
      <input type="file" id="docFileInput" hidden />
      <input type="file" id="docImportInput" accept="application/json,.json" hidden />
      ${sheet}${modal}
    </div>`;
  }

  function docFieldRow(label, inner) { return `<label class="doc-field"><span>${label}</span>${inner}</label>`; }

  function renderDocModal() {
    const edit = docModal === 'edit' ? docFind(docEditingId) : null;
    const cats = docCatsAll().map((c) => `<option value="${escapeHtml(c)}"${(edit?.category || 'Project') === c ? ' selected' : ''}>${escapeHtml(c)}</option>`).join('');
    const isFile = (edit ? edit.kind : docFormType) === 'file';
    const picked = docPickedFile;
    return `<div class="doc-modal-wrap" data-doc-closeform>
      <form class="doc-modal" id="docForm" autocomplete="off">
        <div class="doc-modal-head"><b>${edit ? 'Edit Dokumen' : 'Tambah Dokumen'}</b><button type="button" class="icon-button" data-doc-closeform aria-label="Tutup">✕</button></div>
        <div class="doc-mtypes">
          <button type="button" class="doc-mtype${!isFile ? ' on' : ''}" data-doc-mtype="link">🔗 Tautan / URL</button>
          <button type="button" class="doc-mtype${isFile ? ' on' : ''}" data-doc-mtype="file">📄 Upload File</button>
        </div>
        ${isFile ? `<div class="doc-drop" data-doc-pickfile>${picked ? `<b>${escapeHtml(picked.name)}</b><small>${docFmtBytes(picked.size)} • klik untuk ganti berkas</small>` : '<span>📤</span><b>Pilih berkas</b><small>PNG, JPG, PDF, TXT… maks 2 MB (tersimpan & tersinkron)</small>'}<input type="file" name="docFile" hidden /></div>` : docFieldRow('URL', `<input name="docUrl" type="url" placeholder="https://…" value="${escapeHtml(edit?.url || '')}" required />`)}
        ${docFieldRow('Nama dokumen', `<input name="docName" maxlength="80" placeholder="mis. Jurnal Langit — draf" value="${escapeHtml(edit?.name || '')}" required />`)}
        ${docFieldRow('Deskripsi', `<textarea name="docDesc" rows="2" maxlength="200" placeholder="Opsional…">${escapeHtml(edit?.desc || '')}</textarea>`)}
        <div class="doc-mgrid">${docFieldRow('Kategori', `<select name="docCategory">${cats}</select>`)}${docFieldRow('Tags', `<input name="docTags" maxlength="80" placeholder="pisahkan dengan koma" value="${escapeHtml((edit?.tags || []).join(', '))}" />`)}</div>
        <label class="doc-favline"><input type="checkbox" name="docFav" ${edit?.favorite ? 'checked' : ''} /> Tandai sebagai favorit</label>
        <div class="doc-modal-foot">
          <button type="button" class="btn" data-doc-closeform>Batal</button>
          <button type="submit" class="btn primary"${docBusy ? ' disabled' : ''}>${docBusy ? 'Menyimpan…' : (edit ? 'Simpan Perubahan' : '+ Tambah Dokumen')}</button>
        </div>
      </form></div>`;
  }

  function docActionSheet(d) {
    if (!d) return '';
    const cats = docCatsAll().filter((c) => c !== d.category);
    return `<div class="note-sheet-wrap" data-doc-sheet-close>
      <div class="note-sheet">
        <div class="note-sheet-grip"></div>
        <div class="note-sheet-head"><b>${escapeHtml(d.name)}</b><button type="button" class="icon-button" data-doc-menu-close aria-label="Tutup">✕</button></div>
        <button type="button" class="note-sheet-btn" data-doc-open2="${d.id}">${d.kind === 'link' ? '↗️ Buka tautan' : (d.data ? '👁️ Buka / unduh berkas' : '↗️ Buka')}</button>
        <button type="button" class="note-sheet-btn" data-doc-edit="${d.id}">✏️ Edit</button>
        <button type="button" class="note-sheet-btn" data-doc-fav="${d.id}">${d.favorite ? '☆ Hapus favorit' : '⭐ Tandai favorit'}</button>
        ${docMoveOpen ? `<div class="doc-movegrid">${cats.map((c) => `<button type="button" class="goal-chip" data-doc-move="${d.id}:${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('')}</div>` : '<button type="button" class="note-sheet-btn" data-doc-moveopen="1">📁 Pindahkan kategori</button>'}
        <button type="button" class="note-sheet-btn danger" data-doc-del="${d.id}">🗑️ Hapus</button>
      </div></div>`;
  }

  function renderDocsView() {
    return renderDocListPage();
  }

  function docResetUi() { docSearch = ''; docCat = 'Semua'; docType = 'all'; docFavOnly = false; docSort = 'terbaru'; docMenuId = null; docModal = null; docEditingId = null; docPickedFile = null; docMoveOpen = false; }

  function handleDocSearch(value) {
    docSearch = value;
    const list = docFiltered();
    const wrap = dom.content.querySelector('.doc-tablewrap');
    if (wrap) wrap.innerHTML = list.length ? `<table class="doc-table"><thead><tr><th>Dokumen</th><th>Tipe</th><th>Kategori</th><th>Tag</th><th>Ukuran</th><th>Diperbarui</th><th></th></tr></thead><tbody>${docsRowsHtml(list)}</tbody></table>` : docsEmptyHtml(docList().length > 0);
    const cnt = dom.content.querySelector('.doc-count');
    if (cnt) cnt.textContent = `${list.length} dokumen`;
  }

  function handleDocFilePick(input) {
    const f = input.files && input.files[0];
    if (!f) return;
    if (f.size > DOC_FILE_LIMIT) { showToast(`Berkas terlalu besar (${docFmtBytes(f.size)}). Maks 2 MB.`); input.value = ''; return; }
    const reader = new FileReader();
    docBusy = true; renderShell();
    reader.onload = () => {
      docPickedFile = { name: f.name, size: f.size, type: f.type || 'application/octet-stream', data: String(reader.result) };
      docBusy = false;
      renderShell();
      const nameInp = dom.content.querySelector('#docForm [name=docName]');
      if (nameInp && !nameInp.value.trim()) { nameInp.value = f.name.replace(/\.[^.]+$/, '').slice(0, 80); }
    };
    reader.onerror = () => { docBusy = false; input.value = ''; showToast('Gagal membaca berkas.'); renderShell(); };
    reader.readAsDataURL(f);
  }

  function handleDocImport(input) {
    const f = input.files && input.files[0];
    input.value = '';
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const arr = Array.isArray(parsed) ? parsed : Array.isArray(parsed.documents) ? parsed.documents : null;
        if (!arr) throw new Error('format');
        let added = 0;
        arr.forEach((x) => {
          if (!x || typeof x !== 'object' || !x.name) return;
          state.documents.push({ id: uid('doc'), kind: x.kind === 'file' ? 'file' : 'link', name: String(x.name).slice(0, 80), desc: String(x.desc || ''), category: docCatsAll().includes(x.category) ? x.category : 'Referensi', tags: Array.isArray(x.tags) ? x.tags.map(String).slice(0, 6) : [], url: typeof x.url === 'string' ? x.url : '', data: typeof x.data === 'string' && x.data.startsWith('data:') ? x.data : '', fileName: x.fileName || (x.kind === 'file' ? String(x.name) : ''), fileType: x.fileType || '', size: Number(x.size) || 0, favorite: Boolean(x.favorite), createdAt: Number(x.createdAt) || Date.now(), updatedAt: Date.now() });
          added += 1;
        });
        docSaveDocs();
        renderShell();
        showToast(added ? `${added} dokumen diimpor.` : 'Tidak ada dokumen valid di file itu.');
      } catch { showToast('File import tidak valid (harus JSON hasil Export).'); }
    };
    reader.readAsText(f);
  }

  function submitDocForm(form) {
    const typeBtn = form.querySelector('.doc-mtype.on');
    const kind = typeBtn ? typeBtn.dataset.docMtype : (docPickedFile ? 'file' : 'link');
    const name = (form.docName.value || '').trim();
    if (!name) { showToast('Nama dokumen wajib diisi.'); return; }
    const tags = (form.docTags.value || '').split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean).slice(0, 6);
    const fav = form.docFav.checked;
    const desc = (form.docDesc.value || '').trim();
    const category = form.docCategory.value;
    if (kind === 'link') {
      const url = (form.docUrl.value || '').trim();
      if (!url) { showToast('Isi URL tautan dulu.'); return; }
      if (!/^https?:\/\//i.test(url)) { showToast('URL harus diawali http:// atau https://'); return; }
      if (docModal === 'edit' && docEditingId) {
        const d = docFind(docEditingId);
        if (d) Object.assign(d, { kind: 'link', name, desc, category, tags, favorite: fav, url, data: '', fileName: '', size: 0, updatedAt: Date.now() });
      } else {
        state.documents.push({ id: uid('doc'), kind: 'link', name, desc, category, tags, url, data: '', fileName: '', fileType: '', size: 0, favorite: fav, createdAt: Date.now(), updatedAt: Date.now() });
      }
      docSaveDocs();
      docCloseModal();
      showToast('Tautan tersimpan.');
      return;
    }
    const picked = docPickedFile;
    let payload;
    if (picked) payload = { data: picked.data, fileName: picked.name, fileType: picked.type, size: picked.size, url: '' };
    else if (docModal === 'edit' && docFind(docEditingId)?.kind === 'file') {
      const old = docFind(docEditingId);
      payload = { data: old.data, fileName: old.fileName || name, fileType: old.fileType, size: old.size, url: '' };
    } else { showToast('Pilih berkas dulu.'); return; }
    if (docModal === 'edit' && docEditingId) {
      const d = docFind(docEditingId);
      if (d) Object.assign(d, { kind: 'file', name, desc, category, tags, favorite: fav, updatedAt: Date.now(), ...payload });
    } else {
      state.documents.push({ id: uid('doc'), kind: 'file', name, desc, category, tags, favorite: fav, createdAt: Date.now(), updatedAt: Date.now(), ...payload });
    }
    docSaveDocs();
    docCloseModal();
    showToast('Berkas tersimpan & tersinkron.');
  }

  function docCloseModal() { docModal = null; docEditingId = null; docPickedFile = null; docBusy = false; renderShell(); }

  function handleDocAction(btn) {
    if (btn.matches('[data-doc-new]')) { docModal = 'add'; docFormType = 'link'; docPickedFile = null; renderShell(); return true; }
    if (btn.matches('[data-doc-link]')) { docModal = 'add'; docFormType = 'link'; docPickedFile = null; renderShell(); return true; }
    if (btn.matches('[data-doc-upload]')) { docModal = 'add'; docFormType = 'file'; docPickedFile = null; renderShell(); return true; }
    if (btn.matches('[data-doc-import]')) { dom.content.querySelector('#docImportInput')?.click(); return true; }
    if (btn.matches('[data-doc-pickfile]')) { btn.querySelector('input[type=file]')?.click(); return true; }
    if (btn.matches('[data-doc-addcat]')) {
      const name = (window.prompt('Nama kategori/folder baru:') || '').trim();
      if (!name) return true;
      if (docCatsAll().some((c) => c.toLowerCase() === name.toLowerCase())) { showToast('Kategori itu sudah ada.'); return true; }
      state.docCats.push(name.slice(0, 24));
      docCat = name;
      docSaveDocs();
      renderShell();
      showToast(`Kategori “${name}” dibuat.`);
      return true;
    }
    if (btn.matches('[data-doc-tab]')) { docCat = btn.dataset.docTab; docFavOnly = false; docMenuId = null; renderShell(); return true; }
    if (btn.matches('[data-doc-favfil]')) { docFavOnly = !docFavOnly; renderShell(); return true; }
    if (btn.matches('[data-doc-mtype]')) {
      docFormType = btn.dataset.docMtype;
      const wrap = dom.content.querySelector('.doc-modal');
      if (wrap) { // update modal in place to keep typed values
        const f = dom.content.querySelector('#docForm');
        const vals = { name: f.docName.value, desc: f.docDesc.value, category: f.docCategory.value, tags: f.docTags.value, url: f.docUrl ? f.docUrl.value : '', fav: f.docFav.checked };
        docPickedFile = null;
        dom.content.querySelector('.docs-page').outerHTML = renderDocListPage();
        const nf = dom.content.querySelector('#docForm');
        if (nf) { nf.docName.value = vals.name; nf.docDesc.value = vals.desc; nf.docTags.value = vals.tags; if (nf.docUrl) nf.docUrl.value = vals.url; nf.docFav.checked = vals.fav; }
      }
      return true;
    }
    if (btn.matches('[data-doc-menu]')) { docMenuId = btn.dataset.docMenu; docMoveOpen = false; renderShell(); return true; }
    if (btn.matches('[data-doc-menu-close]')) { docMenuId = null; docMoveOpen = false; renderShell(); return true; }
    if (btn.matches('[data-doc-closeform]')) { docCloseModal(); return true; }
    if (btn.matches('[data-doc-sheet-close]') && !btn.closest('.note-sheet')) { docMenuId = null; docMoveOpen = false; renderShell(); return true; }
    if (btn.matches('[data-doc-moveopen]')) { docMoveOpen = true; renderShell(); return true; }
    if (btn.dataset.docOpen2 != null) { const d = docFind(btn.dataset.docOpen2); docMenuId = null; docMoveOpen = false; renderShell(); if (d) docOpen(d); return true; }
    if (btn.dataset.docMove != null) {
      const [id, cat] = btn.dataset.docMove.split(':');
      const d = docFind(id);
      if (d) { d.category = cat; d.updatedAt = Date.now(); docSaveDocs(); }
      docMenuId = null; docMoveOpen = false; renderShell();
      showToast(`Dipindahkan ke “${cat}”.`);
      return true;
    }
    if (btn.dataset.docEdit != null) {
      const d = docFind(btn.dataset.docEdit);
      if (d) { docModal = 'edit'; docEditingId = d.id; docFormType = d.kind; docPickedFile = null; docMenuId = null; renderShell(); }
      return true;
    }
    if (btn.dataset.docFav != null) {
      const d = docFind(btn.dataset.docFav);
      if (d) { d.favorite = !d.favorite; d.updatedAt = Date.now(); docSaveDocs(); }
      docMenuId = null; renderShell();
      showToast(d?.favorite ? 'Ditandai favorit.' : 'Favorit dilepas.');
      return true;
    }
    if (btn.dataset.docDel != null) {
      const d = docFind(btn.dataset.docDel);
      if (!d) return true;
      if (!window.confirm(`Hapus dokumen “${d.name}”?${d.kind === 'file' ? ' Berkas yang tersimpan ikut terhapus.' : ''}`)) { docMenuId = null; renderShell(); return true; }
      state.documents = docList().filter((x) => x.id !== d.id);
      docSaveDocs();
      docMenuId = null;
      renderShell();
      showToast('Dokumen dihapus.');
      return true;
    }
    const row = btn.matches('[data-doc-open]') ? btn : btn.closest('tr[data-doc-open]');
    if (row && !btn.closest('.note-sheet') && !btn.closest('.doc-modal')) {
      const d = docFind(row.dataset.docOpen);
      if (d) { docModal = 'edit'; docEditingId = d.id; docFormType = d.kind; docPickedFile = d.kind === 'file' ? { name: d.fileName || d.name, size: d.size || 0, type: d.fileType || 'text/plain', data: d.data || '' } : null; renderShell(); }
      return true;
    }
    return false;
  }

  /* ============ MODUL PROGRESS (statistik kebiasaan + task + goals) ============ */
  let progressTab = 'minggu';

  function progTaskDone(t) { return t.done === true || t.status === 'done' || t.status === 'selesai'; }

  function progHabitStats() {
    const month = ensureMonth(activeYear, activeMonth);
    const habits = getAllHabits(month, true);
    let done = 0;
    let total = 0;
    let earned = 0;
    let possible = 0;
    const byCat = { daily: { e: 0, p: 0, label: 'Harian' }, weekly: { e: 0, p: 0, label: 'Mingguan' }, specificWeekly: { e: 0, p: 0, label: 'Mingguan khusus' }, monthly: { e: 0, p: 0, label: 'Bulanan' } };
    habits.forEach((h) => {
      const st = calculateHabitProgress(h, h.categoryKey, activeYear, activeMonth);
      done += st.checkedSlots;
      total += st.totalSlots;
      earned += st.earnedPoints;
      possible += st.possiblePoints;
      if (byCat[h.categoryKey]) {
        byCat[h.categoryKey].e += st.earnedPoints;
        byCat[h.categoryKey].p += st.possiblePoints;
      }
    });
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    // streak harian: hitung berturut-turut dari hari terakhir yang ada datanya
    const daily = habits.filter((h) => h.categoryKey === 'daily');
    const dim = daysInMonth(activeYear, activeMonth);
    let streak = 0;
    for (let day = Math.min(dim, new Date().getDate()); day >= 1; day -= 1) {
      if (daily.length && daily.every((h) => h.slots[day - 1])) streak += 1;
      else break;
    }
    return { pct, done, total, earned, possible, byCat, streak, count: habits.length };
  }

  function progGoalStats() {
    const goals = loadGoals();
    let msTotal = 0;
    let msDone = 0;
    const byCat = {};
    goals.forEach((g) => {
      (g.milestones || []).forEach((m) => {
        msTotal += 1;
        if (m.done) msDone += 1;
      });
      byCat[g.category] = (byCat[g.category] || 0) + 1;
    });
    return {
      count: goals.length,
      active: goals.filter((g) => g.status === 'aktif').length,
      done: goals.filter((g) => g.status === 'selesai').length,
      pct: msTotal === 0 ? 0 : Math.round((msDone / msTotal) * 100),
      msTotal,
      msDone,
      byCat,
    };
  }

  function progTaskStats() {
    const tasks = loadTasks();
    const done = tasks.filter(progTaskDone);
    let estMin = 0;
    let actMin = 0;
    done.forEach((t) => {
      const m = String(t.actual || '').match(/(\d+)\s*menit/);
      if (m) actMin += Number(m[1]);
      const e = String(t.estimate || '').match(/(\d+)\s*menit|(\d+)\s*jam/);
      if (e) estMin += e[1] ? Number(e[1]) : Number(e[2]) * 60;
    });
    const prio = { high: 0, medium: 0, low: 0 };
    done.forEach((t) => { const k = String(t.priority || 'medium').toLowerCase().slice(0, 6); prio[k in prio ? k : 'medium'] += 1; });
    return {
      total: tasks.length,
      done: done.length,
      pct: tasks.length === 0 ? 0 : Math.round((done.length / tasks.length) * 100),
      estMin,
      actMin,
      prio,
    };
  }

  function progDonut(segments, size) {
    const r = size / 2 - 9;
    const c = 2 * Math.PI * r;
    const sum = segments.reduce((a, s) => a + s.value, 0) || 1;
    let off = 0;
    const arcs = segments.filter((s) => s.value > 0).map((s) => {
      const frac = s.value / sum;
      const el = `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${s.color}" stroke-width="14" stroke-linecap="round" stroke-dasharray="${Math.max(frac * c - 3, 0.1)} ${c}" stroke-dashoffset="${-off * c}" transform="rotate(-90 ${size / 2} ${size / 2})"></circle>`;
      off += frac;
      return el;
    }).join('');
    return `<svg viewBox="0 0 ${size} ${size}" class="prog-donut" width="${size}" height="${size}">${el0(c, r)}${arcs}</svg>`;
    function el0(cc, rr) { return `<circle cx="${size / 2}" cy="${size / 2}" r="${rr}" fill="none" stroke="color-mix(in srgb, var(--muted) 14%, transparent)" stroke-width="14"></circle>`; }
  }

  function progRing(pct, size, color, centerLabel) {
    const r = size / 2 - 9;
    const c = 2 * Math.PI * r;
    const dash = Math.max((clamp(pct, 0, 100) / 100) * c - 2, 0.1);
    return `<div class="prog-ring-wrap"><svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="color-mix(in srgb, var(--muted) 14%, transparent)" stroke-width="14"></circle><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="14" stroke-linecap="round" stroke-dasharray="${dash} ${c}" transform="rotate(-90 ${size / 2} ${size / 2})"></circle></svg><div class="prog-ring-center"><b>${pct}%</b><span>${escapeHtml(centerLabel)}</span></div></div>`;
  }

  function progBars(data, color) {
    const max = Math.max(1, ...data.map((d) => d.value));
    return `<div class="prog-bars">${data.map((d) => `<div class="prog-bar-col"><span class="prog-bar-num">${d.value > 0 ? d.value : ''}</span><span class="prog-bar-stick"><i style="height:${Math.round((d.value / max) * 100)}%;background:${color}"></i></span><span class="prog-bar-lbl">${escapeHtml(d.label)}</span></div>`).join('')}</div>`;
  }

  function renderProgressView() {
    const H = progHabitStats();
    const T = progTaskStats();
    const G = progGoalStats();
    const overall = Math.round((H.pct + T.pct + G.pct) / 3);

    // grafik 7 hari: kebiasaan tercentang + task selesai per hari
    const days = [];
    const month = ensureMonth(activeYear, activeMonth);
    const dailyHabits = getAllHabits(month).filter((h) => h.categoryKey === 'daily');
    const tasksAll = loadTasks();
    const DAYNAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const dim = daysInMonth(activeYear, activeMonth);
    const todayD = activeYear === new Date().getFullYear() && activeMonth === new Date().getMonth() ? new Date().getDate() : dim;
    for (let i = 6; i >= 0; i -= 1) {
      const dt = new Date(activeYear, activeMonth, todayD - i);
      const valid = dt.getMonth() === activeMonth && dt.getDate() >= 1;
      const dayIdx = dt.getDate() - 1;
      const hCount = valid ? dailyHabits.reduce((a, h) => a + (h.slots[dayIdx] ? 1 : 0), 0) : 0;
      const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      const tCount = tasksAll.filter((t) => progTaskDone(t) && (t.completedAt ? String(t.completedAt).slice(0, 10) === iso : (t.date || '') === iso)).length;
      days.push({ label: DAYNAMES[dt.getDay()], value: hCount + tCount });
    }

    // tren bulanan goal+task selesai (6 bulan terakhir)
    const MONTHS_S = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const months = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(activeYear, activeMonth - i, 1);
      const m = ensureMonth(d.getFullYear(), d.getMonth());
      const hs = getAllHabits(m, true).reduce((a, h) => { const st = calculateHabitProgress(h, h.categoryKey, d.getFullYear(), d.getMonth()); return a + st.checkedSlots; }, 0);
      const mIso = String(d.getMonth() + 1).padStart(2, '0');
      const ts = tasksAll.filter((t) => progTaskDone(t) && String(t.completedAt || t.date || '').startsWith(`${d.getFullYear()}-${mIso}`)).length;
      months.push({ label: MONTHS_S[d.getMonth()], value: hs + ts });
    }

    const catSegs = Object.keys(GOAL_CATS).filter((c) => G.byCat[c]).map((c) => ({ color: GOAL_CATS[c], value: G.byCat[c], label: c }));
    const legend = catSegs.map((s) => `<div class="prog-legend-row"><span class="task-dot" style="background:${s.color}"></span><b style="flex:1">${escapeHtml(s.label)}</b><span style="color:var(--muted);font-weight:700">${Math.round((s.value / (catSegs.reduce((a, x) => a + x.value, 0) || 1)) * 100)}%</span><span style="width:26px;text-align:right;font-weight:800">${s.value}</span></div>`).join('');

    const habitCatRows = ['daily', 'weekly', 'monthly'].map((k) => {
      const c = H.byCat[k];
      const pct = c.p === 0 ? 0 : Math.round((c.e / c.p) * 100);
      const lbl = k === 'daily' ? 'Harian' : k === 'weekly' ? 'Mingguan' : 'Bulanan';
      return `<div class="prog-habit-row"><b>${lbl}</b><span class="goal-bar"><i style="width:${pct}%;display:block;height:100%;border-radius:999px;background:${['#3b82f6', '#ea8a2f', '#8b5cf6'][k === 'daily' ? 0 : k === 'weekly' ? 1 : 2]}"></i></span><em>${c.e}/${c.p} pts</em></div>`;
    }).join('');

    const prioTotal = (T.prio.high + T.prio.medium + T.prio.low) || 1;
    const prioRows = [['Tinggi', T.prio.high, '#ef4444'], ['Sedang', T.prio.medium, '#f59e0b'], ['Rendah', T.prio.low, '#3b82f6']].map(([lbl, v, col]) => `<div class="prog-legend-row"><span class="task-dot" style="background:${col}"></span><b style="flex:1">${lbl}</b><span style="width:26px;text-align:right;font-weight:800">${v}</span></div>`).join('');

    return `<div class="goals-page">
        <div class="prog-hero">
          ${progRing(overall, 130, '#3f9d63', 'Skor')}
          <div class="prog-hero-stats">
            <div class="prog-stat"><span class="prog-stat-num">${H.pct}%</span><span class="prog-stat-lbl">Kebiasaan</span></div>
            <div class="prog-stat"><span class="prog-stat-num">${T.pct}%</span><span class="prog-stat-lbl">Task selesai</span></div>
            <div class="prog-stat"><span class="prog-stat-num">${G.pct}%</span><span class="prog-stat-lbl">Goals</span></div>
          </div>
        </div>

        <div class="prog-kpis">
          <div class="prog-kpi"><span>🔥</span><b>${H.streak > 0 ? H.streak + ' hari' : '—'}</b><em>Streak harian</em></div>
          <div class="prog-kpi"><span>✅</span><b>${T.done}</b><em>Task done</em></div>
          <div class="prog-kpi"><span>🎯</span><b>${G.msDone}/${G.msTotal}</b><em>Milestone</em></div>
          <div class="prog-kpi"><span>⭐</span><b>${H.earned}</b><em>Poin kebiasaan</em></div>
        </div>

        <section class="panel" style="padding:14px 16px">
          <div class="prog-card-head"><h3>Aktivitas 7 Hari</h3><span class="prog-card-sub">kebiasaan ✓ + task selesai</span></div>
          ${progBars(days, '#3f9d63')}
        </section>

        <section class="panel" style="padding:14px 16px">
          <div class="prog-card-head"><h3>Tren 6 Bulan</h3><span class="prog-card-sub">total penyelesaian</span></div>
          ${progBars(months, '#7d685c')}
        </section>

        <section class="panel" style="padding:14px 16px">
          <div class="prog-card-head"><h3>Goal per Kategori</h3><span class="prog-card-sub">${G.count} goal</span></div>
          <div class="prog-donut-row">
            ${progDonut(catSegs.length ? catSegs : [{ color: '#d9d3c7', value: 1 }], 120)}
            <div class="prog-legend">${legend || '<div class="prog-legend-row">Belum ada goal</div>'}</div>
          </div>
          <div class="prog-two">
            <div class="prog-mini"><b>${G.active}</b><span>Aktif</span></div>
            <div class="prog-mini"><b>${G.done}</b><span>Selesai</span></div>
            <div class="prog-mini"><b>${Math.max(G.count - G.active - G.done, 0)}</b><span>Tertunda</span></div>
          </div>
        </section>

        <section class="panel" style="padding:14px 16px">
          <div class="prog-card-head"><h3>Kebiasaan ${MONTHS_S[activeMonth]}</h3><span class="prog-card-sub">${H.done}/${H.total} slot · ${H.count} habit</span></div>
          ${habitCatRows}
        </section>

        <section class="panel" style="padding:14px 16px">
          <div class="prog-card-head"><h3>Waktu & Prioritas Task</h3><span class="prog-card-sub">${T.done} task selesai</span></div>
          <div class="prog-two">
            <div class="prog-mini"><b>${T.estMin >= 60 ? (T.estMin / 60).toFixed(1) + ' jam' : T.estMin + ' mnt'}</b><span>Estimasi</span></div>
            <div class="prog-mini"><b>${T.actMin >= 60 ? (T.actMin / 60).toFixed(1) + ' jam' : T.actMin + ' mnt'}</b><span>Aktual</span></div>
          </div>
          <div class="prog-legend" style="margin-top:8px">${prioTotal ? prioRows : ''}</div>
        </section>
      </div>`;
  }

  function handleProgressAction(btn) {
    if (btn.matches('[data-progress-tab]')) { progressTab = btn.dataset.progressTab; renderShell(); return true; }
    return false;
  }

  function renderPlaceholderView(viewName) {
    const info = PLACEHOLDER_VIEWS[viewName];
    return `
      <section class="panel placeholder-panel">
        <div class="placeholder-stage">
          <div class="placeholder-emoji" aria-hidden="true">${info.emoji}</div>
          <h3 class="placeholder-title">${escapeHtml(info.title)}</h3>
          <p class="placeholder-hint">${escapeHtml(info.hint)}</p>
          <span class="placeholder-chip">Segera hadir</span>
        </div>
      </section>
    `;
  }

  function renderDashboard(year) {
    const yearStats = calculateYearStats(year);
    const bestMonth = yearStats.bestMonth;
    const focusMonth = calculateMonthStats(year, activeMonth);
    const focusMonthData = ensureMonth(year, activeMonth);
    const focusDailyRates = calculateDailyRates(focusMonthData, year, activeMonth);
    const categoryBreakdown = calculateCategoryBreakdown(focusMonthData, year, activeMonth);
    const todayPoints = dailyPointSummary(focusDailyRates, year, activeMonth);
    const pointRate = yearStats.possiblePoints === 0
      ? 0
      : (yearStats.earnedPoints / yearStats.possiblePoints) * 100;

    return `
      <div class="dashboard-layout">
        <section class="dashboard-sheet" aria-label="Dashboard bergaya spreadsheet">
          <aside class="sheet-sidebar">
            <div class="sheet-tile label-tile">
              <span>Tahun</span>
              <strong>${year}</strong>
            </div>
            <div class="sheet-tile month-tile">
              <span>Bulan Fokus</span>
              <strong>${focusMonth.monthName}</strong>
            </div>
            <div class="sheet-tile habit-tile">
              <span>Kebiasaan Saya</span>
              <strong>${focusMonth.totalHabits}</strong>
            </div>
          </aside>

          <div class="sheet-stage">
            <div class="sheet-stage-head">
              <div>
                <span class="kicker">Garis pelacakan tahunan</span>
                <h3>Peta Penyelesaian Kebiasaan ${year}</h3>
                <p>Rata-rata bulanan dihitung dari poin berbobot semua kebiasaan aktif.</p>
              </div>
              <button class="small-button" type="button" data-action="jump-month" data-month="${activeMonth}">
                Buka ${focusMonth.monthName}
              </button>
            </div>
            ${renderTrendChart(yearStats.months)}
            ${renderDailyPercentStrip(focusDailyRates, year, activeMonth)}
          </div>

          <aside class="cat-card">
            <div class="cat-badge" aria-hidden="true">
              <img src="cat-logo.svg" alt="" />
            </div>
            <span>Selamat</span>
            <strong>${compactPercent(focusMonth.average)}</strong>
            <p>Rata-rata global ${focusMonth.monthName}. ${focusMonth.average >= 70 ? 'Konsistensi miaw-keren.' : 'Tetap miaw-langkah maju.'}</p>
          </aside>
        </section>

        <section class="dashboard-band">
          ${renderMetric('Rata-rata Tahun', `${roundPercent(yearStats.yearAverage)}%`, 'Momentum miaw-keren berbasis poin', 'teal')}
          ${renderMetric('Bulan Terbaik', bestMonth ? bestMonth.monthName : '-', bestMonth ? `${roundPercent(bestMonth.average)}% selesai` : 'Belum ada data', 'blue')}
          ${renderMetric('Poin Tahun', pointScore(pointRate), `${yearStats.earnedPoints} dari ${yearStats.possiblePoints} poin`, 'amber')}
          ${renderMetric('Bulan Fokus', pointScore(focusMonth.average), `${focusMonth.earnedPoints} dari ${focusMonth.possiblePoints} poin`, 'rose')}
          ${renderMetric(todayPoints.label, pointScore(todayPoints.progress), `${todayPoints.dateText} - ${todayPoints.earnedPoints} dari ${todayPoints.possiblePoints} poin`, 'violet')}
        </section>

        <section class="category-board" aria-label="Rincian kategori bulan fokus">
          ${categoryBreakdown.map((category) => `
            <article class="category-card tone-${CATEGORY_CONFIG[category.categoryKey].color}">
              <div>
                <span>${CATEGORY_CONFIG[category.categoryKey].shortLabel}</span>
                <strong>${roundPercent(category.average)}%</strong>
              </div>
              <div class="category-track" aria-hidden="true">
                <span style="width:${clamp(category.average, 0, 100)}%"></span>
              </div>
              <p>${category.earnedPoints}/${category.possiblePoints} poin dari ${category.totalHabits} kebiasaan aktif</p>
            </article>
          `).join('')}
        </section>

        ${renderPointCalendar(focusDailyRates, year, activeMonth, todayPoints.dayIndex)}

        <section class="panel month-board">
          <div class="section-heading">
            <div>
              <h3>Tile Bulanan</h3>
              <p>Navigasi visual cepat untuk setiap lembar bulan.</p>
            </div>
          </div>
          <div class="month-tile-grid">
            ${yearStats.months.map((month) => `
              <button class="month-score-card ${scoreClass(month.average)}" type="button" data-action="jump-month" data-month="${month.monthIndex}">
                <span>${month.monthName.slice(0, 3)}</span>
                <strong>${compactPercent(month.average)}</strong>
                <em>Nilai ${pointScore(month.average)}</em>
              </button>
            `).join('')}
          </div>
        </section>

        <section class="panel">
          <div class="section-heading">
            <div>
              <h3>Ringkasan Bulanan Utama</h3>
              <p>Setiap baris mengambil data dari lembar bulan dan merata-ratakan progres semua kebiasaan aktif.</p>
            </div>
          </div>
          <div class="table-wrap">
            <table class="summary-table">
              <thead>
                <tr>
                  <th>Bulan</th>
                  <th>Kebiasaan</th>
                  <th>% Selesai</th>
                  <th>Poin</th>
                  <th>Slot</th>
                  <th>Buka</th>
                </tr>
              </thead>
              <tbody>
                ${yearStats.months.map((month) => `
                  <tr class="${month.monthIndex === activeMonth ? 'is-focus-month' : ''}">
                    <td data-label="Bulan"><strong>${month.monthName}</strong></td>
                    <td data-label="Kebiasaan">${month.totalHabits}</td>
                    <td data-label="Selesai">
                      <div class="inline-progress">
                        <span class="mini-bar" aria-hidden="true"><span style="width:${clamp(month.average, 0, 100)}%"></span></span>
                        <strong>${roundPercent(month.average)}%</strong>
                      </div>
                    </td>
                    <td data-label="Poin">${pointScore(month.average)}</td>
                    <td data-label="Slot">${month.checkedSlots} / ${month.totalSlots}</td>
                    <td data-label="Buka">
                      <button class="small-button" type="button" data-action="jump-month" data-month="${month.monthIndex}">Lihat</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    `;
  }

  function calculateCategoryBreakdown(monthData, year, monthIndex) {
    return CATEGORY_ORDER.map((categoryKey) => {
      const rows = monthData.categories[categoryKey]
        .filter((habit) => habit.active)
        .map((habit) => calculateHabitProgress(habit, categoryKey, year, monthIndex));
      const totalHabits = rows.length;
      const earnedPoints = rows.reduce((sum, row) => sum + row.earnedPoints, 0);
      const possiblePoints = rows.reduce((sum, row) => sum + row.possiblePoints, 0);
      const average = possiblePoints === 0
        ? 0
        : (earnedPoints / possiblePoints) * 100;
      const checkedSlots = rows.reduce((sum, row) => sum + row.checkedSlots, 0);
      const totalSlots = rows.reduce((sum, row) => sum + row.totalSlots, 0);

      return {
        categoryKey,
        totalHabits,
        average,
        earnedPoints,
        possiblePoints,
        checkedSlots,
        totalSlots,
      };
    });
  }

  function scoreClass(score) {
    if (score >= 85) return 'score-great';
    if (score >= 60) return 'score-good';
    if (score >= 35) return 'score-watch';
    return 'score-low';
  }

  function renderDailyPercentStrip(dailyRates, year, monthIndex) {
    if (!dailyRates.length) {
      return '<div class="daily-strip empty">Belum ada kebiasaan harian.</div>';
    }

    return `
      <div class="daily-strip" aria-label="Strip tingkat penyelesaian harian ${MONTHS[monthIndex]}">
        ${dailyRates.map((day, index) => `
          <div class="day-score ${scoreClass(day.progress)}" title="${index + 1} ${MONTHS[monthIndex]} ${year}: ${roundPercent(day.progress)}%">
            <strong>${compactPercent(day.progress)}</strong>
            <span>${index + 1}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderPointCalendar(dailyRates, year, monthIndex, focusDayIndex = focusedDayIndex(year, monthIndex)) {
    if (!dailyRates.length) {
      return `
        <section class="panel point-calendar-panel">
          <div class="section-heading">
            <div>
              <h3>Kalender Poin ${MONTHS[monthIndex]}</h3>
              <p>Belum ada kebiasaan harian aktif untuk bulan ini.</p>
            </div>
          </div>
        </section>
      `;
    }

    const firstDayOffset = new Date(year, monthIndex, 1).getDay();
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === monthIndex;
    const weekDays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

    return `
      <section class="panel point-calendar-panel" aria-label="Kalender poin harian ${MONTHS[monthIndex]} ${year}">
        <div class="section-heading">
          <div>
            <h3>Kalender Poin ${MONTHS[monthIndex]}</h3>
            <p>Setiap tanggal menunjukkan poin harian yang didapat dari kebiasaan harian aktif.</p>
          </div>
        </div>
        <div class="point-calendar">
          ${weekDays.map((day) => `<div class="point-weekday">${day}</div>`).join('')}
          ${Array.from({ length: firstDayOffset }, () => '<div class="point-day is-empty"></div>').join('')}
          ${dailyRates.map((day, index) => {
            const isToday = isCurrentMonth && today.getDate() - 1 === index;
            const isFocus = focusDayIndex === index;
            return `
              <div class="point-day ${scoreClass(day.progress)} ${isToday ? 'is-today' : ''} ${isFocus ? 'is-focus' : ''}" title="${index + 1} ${MONTHS[monthIndex]} ${year}: nilai ${pointScore(day.progress)} (${day.earnedPoints} dari ${day.possiblePoints} poin)">
                <span>${index + 1}</span>
                <strong>${pointScore(day.progress)}</strong>
                <small>Nilai</small>
              </div>
            `;
          }).join('')}
        </div>
      </section>
    `;
  }

  function renderMetric(label, value, note, tone) {
    return `
      <article class="metric-card tone-${tone}">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
        <p>${escapeHtml(note)}</p>
      </article>
    `;
  }

  function renderTrendChart(monthStats) {
    const width = 760;
    const height = 260;
    const left = 42;
    const right = 22;
    const top = 24;
    const bottom = 44;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const xStep = plotWidth / (monthStats.length - 1);
    const points = monthStats.map((month, index) => {
      const x = left + (index * xStep);
      const y = top + plotHeight - ((clamp(month.average, 0, 100) / 100) * plotHeight);
      return { x, y, month };
    });
    const polyline = points.map((point) => `${point.x},${point.y}`).join(' ');
    const area = `${left},${top + plotHeight} ${polyline} ${left + plotWidth},${top + plotHeight}`;

    return `
      <div class="chart-scroll">
        <svg class="trend-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Grafik tren penyelesaian tahunan">
          <g class="chart-grid">
            ${[0, 25, 50, 75, 100].map((tick) => {
              const y = top + plotHeight - ((tick / 100) * plotHeight);
              return `
                <line x1="${left}" y1="${y}" x2="${width - right}" y2="${y}"></line>
                <text x="8" y="${y + 4}">${tick}%</text>
              `;
            }).join('')}
          </g>
          <polygon class="chart-area" points="${area}"></polygon>
          <polyline class="chart-line" points="${polyline}"></polyline>
          ${points.map((point, index) => `
            <g class="chart-point">
              <circle cx="${point.x}" cy="${point.y}" r="5"></circle>
              <text x="${point.x}" y="${point.y - 12}" text-anchor="middle">${compactPercent(point.month.average)}</text>
              <text class="chart-month" x="${point.x}" y="${height - 14}" text-anchor="middle">${MONTHS[index].slice(0, 3)}</text>
            </g>
          `).join('')}
        </svg>
      </div>
    `;
  }

  function renderHabitsTab(year, monthIndex) {
    const monthData = ensureMonth(year, monthIndex);
    const dailyRates = calculateDailyRates(monthData, year, monthIndex);
    const focusDayIndex = focusedDayIndex(year, monthIndex);

    return `
      <div class="month-layout current-habits-view">
        <section class="panel current-month-panel">
          <div class="section-heading">
            <div>
              <span class="kicker">Bulan berjalan</span>
              <h3>${MONTHS[monthIndex]} ${year}</h3>
              <p>Tab ini hanya menampilkan kebiasaan untuk bulan yang sedang berjalan.</p>
            </div>
          </div>
        </section>

        <section class="panel control-panel">
          <form id="habitForm" class="habit-form">
            <label>
              <span>Kategori</span>
              <select name="category">
                ${CATEGORY_ORDER.map((categoryKey) => (
                  `<option value="${categoryKey}">${CATEGORY_CONFIG[categoryKey].label}</option>`
                )).join('')}
              </select>
            </label>
            <label class="habit-name-field">
              <span>Nama kebiasaan</span>
              <input name="name" type="text" maxlength="80" placeholder="Tambah kebiasaan baru" autocomplete="off" required />
            </label>
            <label class="habit-points-field">
              <span>Poin</span>
              <input name="points" type="number" min="1" max="100" step="1" placeholder="Auto" />
            </label>
            <button class="primary-button" type="submit">Tambah Kebiasaan</button>
            <button class="danger-button" type="button" data-action="reset-month">Reset Centang</button>
          </form>
        </section>

        ${renderHabitSection('daily', monthData, year, monthIndex, dailyRates, focusDayIndex)}
        ${renderHabitSection('weekly', monthData, year, monthIndex, null, focusDayIndex)}
        ${renderHabitSection('specificWeekly', monthData, year, monthIndex, null, focusDayIndex)}
        ${renderHabitSection('monthly', monthData, year, monthIndex, null, focusDayIndex)}
      </div>
    `;
  }

  /* ============ MODUL MiawAI (asisten seputar website, Habit & Goals) ============ */
  const MIAW_MODELS = [
    { id: 'glm-5.3-flash', label: 'GLM 5.3 Flash' },
    { id: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash' },
    { id: 'qwen3.8-flash', label: 'Qwen 3.8 Flash' },
  ];
  const MIAW_FILE_MAX = 60000; // chars per file sent to model
  let miawModel = 'glm-5.3-flash';
  let miawMessages = [];   // {role, content, files?:[names]} — sesi ini saja; refresh = obrolan baru
  let miawBusy = false;
  let miawFiles = [];       // {name, text} terlampir ke pesan berikutnya
  let miawDraft = '';
  let miawContextSent = false;

  function miawSiteContext() {
    try {
      const goals = loadGoals().slice(0, 12).map((g) => `${g.title} [${(GOAL_TERMS[g.term] || {}).label || g.term || '-'}] ${g.status || ''}`).join('; ');
      const projs = loadProjects().slice(0, 12).map((p) => `${p.name || p.title} (${p.status || ''})`).join('; ');
      const tasks = loadTasks().slice(0, 15).map((t) => `${t.title}${t.done ? ' ✓' : ''} @${t.project || '-'}`).join('; ');
      const habitLines = [];
      Object.values(state.years || {}).forEach((yr) => {
        Object.values(yr.categories || {}).forEach((cat) => {
          (cat.habits || []).slice(0, 40).forEach((h) => {
            habitLines.push(`${cat.name || 'kategori'}/${h.name}${h.active === false ? ' (nonaktif)' : ''}`);
          });
        });
      });
      const habits = [...new Set(habitLines)].slice(0, 25).join('; ');
      return [
        'KONTEKS SINGKAT DATA USER (pakai hanya untuk menjawab seputar website/Habit/Goals):',
        `Goals: ${goals || '(belum ada)'}`,
        `Projects: ${projs || '(belum ada)'}`,
        `Tasks: ${tasks || '(belum ada)'}`,
        `Habits: ${habits || '(belum ada)'}`,
      ].join('\n');
    } catch (e) {
      return 'Konteks data tidak tersedia.';
    }
  }

  function miawBubble(msg) {
    const who = msg.role === 'user' ? 'you' : 'ai';
    const files = (msg.files && msg.files.length) ? `<span class="miaw-msg-files">📎 ${msg.files.map(escapeHtml).join(', ')}</span>` : '';
    const inner = (!msg.content && msg.role === 'assistant')
      ? '<span class="miaw-typing"><i></i><i></i><i></i></span>'
      : (msg.role === 'user' ? escapeHtml(msg.content).replace(/\n/g, '<br/>') : miawSimpleMarkdown(msg.content));
    const avatar = msg.role === 'assistant' ? '<span class="miaw-avatar">🐱</span>' : '';
    return `<div class="miaw-msg miaw-${who}">${avatar}<div class="miaw-bubble">${files}<div class="miaw-text">${inner}</div></div></div>`;
  }

  function miawSimpleMarkdown(text) {
    const esc = escapeHtml(text || '');
    const lines = esc.split('\n');
    const html = [];
    let list = null;
    const closeList = () => { if (list) { html.push(`</${list}>`); list = null; } };
    const inline = (s) => s
      .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`\n]+)`/g, '<code>$1</code>');
    for (const raw of lines) {
      const ln = raw.trim();
      let m;
      if ((m = ln.match(/^[-•*] +(.*)$/))) {
        if (list !== 'ul') { closeList(); html.push('<ul>'); list = 'ul'; }
        html.push(`<li>${inline(m[1])}</li>`);
      } else if ((m = ln.match(/^(\d+)[.)] +(.*)$/))) {
        if (list !== 'ol') { closeList(); html.push('<ol>'); list = 'ol'; }
        html.push(`<li>${inline(m[2])}</li>`);
      } else if ((m = ln.match(/^#{1,4} +(.*)$/))) {
        closeList();
        html.push(`<strong class="miaw-h">${inline(m[1])}</strong><br/>`);
      } else if (!ln) {
        closeList();
      } else {
        closeList();
        html.push(`${inline(ln)}<br/>`);
      }
    }
    closeList();
    let out = html.join('');
    out = out.replace(/<br\/>(<\/(?:ul|ol)>)/g, '$1');
    out = out.replace(/(<\/(?:ul|ol)>)<br\/>/g, '$1');
    out = out.replace(/(<\/(?:ul|ol)>)\s*<br\/>\s*<strong class="miaw-h">/g, '$1<strong class="miaw-h">');
    out = out.replace(/<br\/>\s*<(ul|ol)>/g, '<$1>');
    return out.replace(/(<\/(?:ul|ol)>)<br\/>\s*(?![\s\S]*<\/(?:ul|ol)>)/g, '$1');
  }

  function renderMiawAIView() {
    const modelOpts = MIAW_MODELS.map((m) => `<option value="${m.id}" ${m.id === miawModel ? 'selected' : ''}>${m.label}</option>`).join('');
    const body = miawMessages.length
      ? miawMessages.map(miawBubble).join('')
      : `<div class="miaw-empty">
           <div class="miaw-empty-avatar">🐱</div>
           <b class="miaw-empty-title">MiawAI</b>
           <p>Asisten khusus <strong>website ini</strong>, <strong>Habit</strong>, dan <strong>Goals</strong>.<br/>Tanya cara pakai fitur, minta saran kebiasaan, atau breakdown target — bisa lampirkan file untuk dianalisis.</p>
           <div class="miaw-suggests">
             <button type="button" class="miaw-suggest" data-miaw-q="Bagaimana cara membuat Goals dan Project di website ini?"><span>🎯</span> Cara pakai Goals &amp; Project</button>
             <button type="button" class="miaw-suggest" data-miaw-q="Bantu aku bikin rencana kebiasaan pagi yang konsisten"><span>🌅</span> Saran Habit pagi</button>
             <button type="button" class="miaw-suggest" data-miaw-q="Pecah goalsku jadi target jangka pendek yang realistis"><span>🪜</span> Breakdown Goals</button>
           </div>
         </div>`;
    const files = miawFiles.length
      ? `<div class="miaw-files">${miawFiles.map((f, i) => `<span class="miaw-file">📄 ${escapeHtml(f.name)}<button type="button" data-miaw-rmfile="${i}" aria-label="Hapus lampiran">✕</button></span>`).join('')}</div>`
      : '';
    return `
      <div class="miaw-layout">
        <section class="panel miaw-panel">
          <div class="miaw-topbar">
            <div class="miaw-brand">
              <span class="miaw-brand-avatar">🐱</span>
              <span class="miaw-brand-text"><b>MiawAI</b><small>Website · Habit · Goals</small></span>
            </div>
            <div class="miaw-tools">
              <label class="miaw-model-pick" title="Pilih model AI">
                <select id="miawModelSel" aria-label="Pilih model AI">${modelOpts}</select>
              </label>
              <button class="miaw-newchat" type="button" data-action="miaw-new" title="Mulai obrolan baru">＋</button>
            </div>
          </div>
          <div class="miaw-chat" id="miawChat">${body}</div>
          ${files}
          <div class="miaw-composer">
            <input type="file" id="miawFile" hidden multiple accept=".txt,.md,.csv,.tsv,.json,.log,.html,.js,.xml,.yml,.yaml,text/plain,text/markdown,text/csv,application/json" />
            <button class="miaw-attach" type="button" data-action="miaw-attach" title="Lampirkan file untuk dianalisis" aria-label="Lampirkan file">📎</button>
            <input id="miawInput" type="text" placeholder="Tanya seputar website, Habit, atau Goals…" value="${escapeHtml(miawDraft)}" autocomplete="off" />
            <button class="miaw-send" type="button" data-action="miaw-send" ${miawBusy ? 'disabled' : ''} aria-label="Kirim pesan">${miawBusy ? '<span class="miaw-spin"></span>' : '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4Z"/></svg>'}</button>
          </div>
        </section>
      </div>
    `;
  }

  async function miawSend(text) {
    const content = String(text || '').trim();
    if (!content || miawBusy) return;
    const files = miawFiles.slice();
    miawFiles = [];
    miawDraft = '';
    let userContent = content;
    if (files.length) {
      userContent += '\n\n' + files.map((f) => `--- FILE: ${f.name} ---\n${f.text.slice(0, MIAW_FILE_MAX)}`).join('\n\n');
    }
    if (!miawContextSent) {
      userContent = miawSiteContext() + '\n\nPERTANYAAN USER:\n' + userContent;
      miawContextSent = true;
    }
    miawMessages.push({ role: 'user', content, files: files.map((f) => f.name) });
    miawMessages.push({ role: 'assistant', content: '' });
    miawBusy = true;
    renderShell();
    miawScrollBottom();
    try {
      const payload = miawMessages.slice(0, -1).filter((m) => m.content).map((m) => ({ role: m.role, content: m.content }));
      payload[payload.length - 1] = { role: 'user', content: userContent };
      const res = await fetch('/api/miawai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: miawModel, messages: payload }),
        cache: 'no-store',
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || typeof data.reply !== 'string') {
        miawMessages[miawMessages.length - 1].content = '⚠️ ' + ((data && data.error) || 'MiawAI sedang tidak tersedia. Coba lagi.');
      } else {
        miawMessages[miawMessages.length - 1].content = data.reply;
      }
    } catch (e) {
      miawMessages[miawMessages.length - 1].content = '⚠️ Gagal terhubung ke MiawAI. Periksa koneksi lalu coba lagi.';
    } finally {
      miawBusy = false;
      renderShell();
      miawScrollBottom();
    }
  }

  function miawScrollBottom() {
    const el = dom.content.querySelector('#miawChat');
    if (el) el.scrollTop = el.scrollHeight;
  }

  async function handleMiawFiles(inputEl) {
    const files = [...(inputEl.files || [])].slice(0, 5);
    inputEl.value = '';
    for (const f of files) {
      const ext = (f.name.split('.').pop() || '').toLowerCase();
      if (!['txt', 'md', 'csv', 'tsv', 'json', 'log', 'html', 'js', 'xml', 'yml', 'yaml'].includes(ext)) {
        showToast(`File ${f.name}: format tidak didukung (teks saja).`);
        continue;
      }
      try {
        const text = await f.text();
        miawFiles.push({ name: f.name, text: text.slice(0, 120000) });
      } catch (e) {
        showToast(`Gagal membaca ${f.name}.`);
      }
    }
    renderShell();
  }

  let accountPage = 'main';
  let acctNewPwVisible = false;
  let accountDeleteOpen = false;
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
              <h3>Ganti Password</h3>
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
              <h3>Profil Akun</h3>
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
              <h3>Keamanan</h3>
              <p>Password digunakan untuk masuk ke akun ini.</p>
            </div>
          </div>
          <button class="primary-button" type="button" data-action="account-password-page">Ubah Password</button>
        </section>

        <section class="panel account-panel danger-zone">
          <div class="section-heading">
            <div>
              <h3>Hapus Akun</h3>
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
    `;
  }

  function renderMonth(year, monthIndex) {
    const monthData = ensureMonth(year, monthIndex);
    const stats = calculateMonthStats(year, monthIndex);
    const leaderboards = calculateLeaderboards(monthData, year, monthIndex);
    const dailyRates = calculateDailyRates(monthData, year, monthIndex);
    const focusDayIndex = focusedDayIndex(year, monthIndex);
    const todayPoints = dailyPointSummary(dailyRates, year, monthIndex);
    const dailyAverage = dailyRates.length === 0
      ? 0
      : dailyRates.reduce((sum, day) => sum + day.progress, 0) / dailyRates.length;

    return `
      <div class="month-layout">
        <section class="metric-grid" aria-label="Metrik ringkasan bulanan">
          ${renderMetric('Rata-rata Global Bulan', `${roundPercent(stats.average)}%`, 'Rata-rata progres berbobot semua kebiasaan aktif', 'teal')}
          ${renderMetric('Kebiasaan Aktif', String(stats.totalHabits), `${stats.activeDailyHabits} kebiasaan harian masuk rumus harian`, 'blue')}
          ${renderMetric('Rata-rata Harian', `${roundPercent(dailyAverage)}%`, 'Rata-rata poin harian yang selesai', 'amber')}
          ${renderMetric('Poin Bulan', pointScore(stats.average), `${stats.earnedPoints} dari ${stats.possiblePoints} poin selesai`, 'rose')}
          ${renderMetric(todayPoints.label, pointScore(todayPoints.progress), `${todayPoints.dateText} - ${todayPoints.earnedPoints} dari ${todayPoints.possiblePoints} poin`, 'violet')}
        </section>

        ${renderPointCalendar(dailyRates, year, monthIndex, todayPoints.dayIndex)}

        <section class="panel control-panel">
          <form id="habitForm" class="habit-form">
            <label>
              <span>Kategori</span>
              <select name="category">
                ${CATEGORY_ORDER.map((categoryKey) => (
                  `<option value="${categoryKey}">${CATEGORY_CONFIG[categoryKey].label}</option>`
                )).join('')}
              </select>
            </label>
            <label class="habit-name-field">
              <span>Nama kebiasaan</span>
              <input name="name" type="text" maxlength="80" placeholder="Tambah kebiasaan baru" autocomplete="off" required />
            </label>
            <label class="habit-points-field">
              <span>Poin</span>
              <input name="points" type="number" min="1" max="100" step="1" placeholder="Auto" />
            </label>
            <button class="primary-button" type="submit">Tambah Kebiasaan</button>
            <button class="danger-button" type="button" data-action="reset-month">Reset Centang</button>
          </form>
        </section>

        ${renderHabitSection('daily', monthData, year, monthIndex, dailyRates, focusDayIndex)}
        ${renderHabitSection('weekly', monthData, year, monthIndex, null, focusDayIndex)}
        ${renderHabitSection('specificWeekly', monthData, year, monthIndex, null, focusDayIndex)}
        ${renderHabitSection('monthly', monthData, year, monthIndex, null, focusDayIndex)}

        <section class="analytics-grid">
          ${renderLeaderboard('Miaw-keren!', '5 Kebiasaan Harian Paling Konsisten', leaderboards.top, 'top')}
          ${renderLeaderboard('Miaw-no!', '5 Kebiasaan Harian yang Perlu Ditingkatkan', leaderboards.bottom, 'bottom')}
        </section>
      </div>
    `;
  }

  function renderHabitSection(categoryKey, monthData, year, monthIndex, dailyRates = null, focusDayIndex = 0) {
    const config = CATEGORY_CONFIG[categoryKey];
    const habits = monthData.categories[categoryKey];
    const slotCount = slotCountFor(categoryKey, year, monthIndex);
    const slotIndexes = Array.from({ length: slotCount }, (_, index) => index);
    const activeCount = habits.filter((habit) => habit.active).length;
    const sectionId = `${categoryKey}-${year}-${monthIndex}`;
    const isDaily = categoryKey === 'daily';
    const isCollapsed = !isDaily && !mobileOpenSections.has(categoryKey);
    const tableClass = isDaily
      ? `daily-table ${mobileDailyExpanded ? 'mobile-full' : 'mobile-focus'}`
      : '';
    const mobileToggleLabel = isDaily
      ? (mobileDailyExpanded ? 'Ringkas ke tanggal fokus' : 'Lihat semua tanggal')
      : (isCollapsed ? `Buka ${config.shortLabel}` : `Tutup ${config.shortLabel}`);
    const mobileToggleAction = isDaily ? 'toggle-daily-full' : 'toggle-mobile-section';
    const focusDateText = `${focusDayIndex + 1} ${MONTHS[monthIndex]}`;

    return `
      <section class="panel tracker-section tone-${config.color} ${isCollapsed ? 'mobile-collapsed' : ''}" aria-labelledby="${sectionId}" data-category="${categoryKey}">
        <div class="section-heading">
          <div>
            <h3 id="${sectionId}">${config.label}</h3>
            <p>${config.description}</p>
          </div>
          <div class="section-head-actions">
            ${isDaily ? `<span class="section-chip mobile-focus-chip">Fokus: ${focusDateText}</span>` : ''}
            <span class="section-chip">${activeCount} aktif</span>
            <button class="small-button mobile-section-toggle" type="button" data-action="${mobileToggleAction}" data-category="${categoryKey}" aria-expanded="${isDaily ? mobileDailyExpanded : !isCollapsed}">
              ${mobileToggleLabel}
            </button>
          </div>
        </div>

        <div class="grid-scroller" data-scroll-key="${categoryKey}">
          <table class="habit-table ${tableClass}">
            <thead>
              <tr>
                <th class="habit-col">Kebiasaan</th>
                <th class="points-col">Poin</th>
                ${slotIndexes.map((slotIndex) => `
                  <th class="slot-col ${slotIndex === focusDayIndex ? 'is-focus-slot' : ''}" data-slot-index="${slotIndex}" title="${escapeHtml(slotTitle(categoryKey, slotIndex, year, monthIndex))}">
                    ${escapeHtml(slotLabel(categoryKey, slotIndex, year, monthIndex))}
                  </th>
                `).join('')}
                <th class="progress-col">Progres</th>
                <th class="action-col">Aksi</th>
              </tr>
              ${isDaily ? renderDailyRateRow(dailyRates, 'top', focusDayIndex) : ''}
            </thead>
            <tbody>
              ${habits.length === 0 ? renderEmptyHabitRow(slotCount) : habits.map((habit) => (
                renderHabitRow(habit, categoryKey, year, monthIndex, slotIndexes, focusDayIndex)
              )).join('')}
            </tbody>
            ${isDaily ? `<tfoot>${renderDailyRateRow(dailyRates, 'bottom', focusDayIndex)}</tfoot>` : ''}
          </table>
        </div>
      </section>
    `;
  }

  function renderDailyRateRow(dailyRates, placement, focusDayIndex) {
    const label = placement === 'top' ? 'Tingkat harian' : 'Total tingkat harian';

    return `
      <tr class="rate-row">
        <th class="habit-col">${label}</th>
        <td class="points-col">Poin</td>
        ${dailyRates.map((day, dayIndex) => `
          <td class="rate-cell ${dayIndex === focusDayIndex ? 'is-focus-slot' : ''}" data-slot-index="${dayIndex}" title="${day.earnedPoints} dari ${day.possiblePoints} poin harian">
            ${compactPercent(day.progress)}
          </td>
        `).join('')}
        <td class="progress-col">Sukses kolom</td>
        <td class="action-col"></td>
      </tr>
    `;
  }

  function renderEmptyHabitRow(slotCount) {
    return `
      <tr>
        <td class="empty-row" colspan="${slotCount + 4}">Belum ada kebiasaan untuk kategori ini.</td>
      </tr>
    `;
  }

  function renderHabitRow(habit, categoryKey, year, monthIndex, slotIndexes, focusDayIndex = 0) {
    const config = CATEGORY_CONFIG[categoryKey];
    const progressData = calculateHabitProgress(habit, categoryKey, year, monthIndex);
    const rowClass = habit.active ? '' : 'is-paused';
    const statusLabel = habit.active ? 'Aktif' : 'Dijeda';

    return `
      <tr class="${rowClass}" data-habit-id="${habit.id}" data-category="${categoryKey}">
        <th class="habit-col" scope="row">
          <div class="habit-title">
            <strong>${escapeHtml(habit.name)}</strong>
            <span class="habit-meta">${config.shortLabel} - ${statusLabel}</span>
          </div>
        </th>
        <td class="points-col">
          <span class="points-pill">${progressData.points}</span>
        </td>
        ${slotIndexes.map((slotIndex) => `
          <td class="slot-cell ${slotIndex === focusDayIndex ? 'is-focus-slot' : ''}" data-slot-index="${slotIndex}">
            <input
              class="slot-check tone-${config.color}"
              type="checkbox"
              aria-label="${escapeHtml(habit.name)} ${escapeHtml(slotTitle(categoryKey, slotIndex, year, monthIndex))}"
              data-action="toggle-slot"
              data-category="${categoryKey}"
              data-habit-id="${habit.id}"
              data-slot="${slotIndex}"
              ${habit.slots[slotIndex] ? 'checked' : ''}
              ${habit.active ? '' : 'disabled'}
            />
          </td>
        `).join('')}
        <td class="progress-col">
          <div class="progress-stack">
            <span class="progress-bar" aria-hidden="true"><span style="width:${clamp(progressData.progress, 0, 100)}%"></span></span>
            <strong>${roundPercent(progressData.progress)}%</strong>
            <small>${progressData.earnedPoints}/${progressData.possiblePoints} poin</small>
          </div>
        </td>
        <td class="action-col">
          <div class="row-actions">
            <button class="icon-action" type="button" title="Ganti nama kebiasaan" aria-label="Ganti nama kebiasaan" data-action="rename-habit" data-category="${categoryKey}" data-habit-id="${habit.id}">
              <svg viewBox="0 0 24 24"><path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z"/><path d="M13.5 6.5 17.5 10.5"/></svg>
            </button>
            <button class="icon-action" type="button" title="Ubah poin kebiasaan" aria-label="Ubah poin kebiasaan" data-action="edit-points" data-category="${categoryKey}" data-habit-id="${habit.id}">
              <svg viewBox="0 0 24 24"><path d="M12 3 14.7 8.5 21 9.4 16.5 13.8 17.6 20 12 17.1 6.4 20 7.5 13.8 3 9.4 9.3 8.5 12 3Z"/></svg>
            </button>
            <button class="icon-action" type="button" title="${habit.active ? 'Jeda kebiasaan' : 'Aktifkan kebiasaan'}" aria-label="${habit.active ? 'Jeda kebiasaan' : 'Aktifkan kebiasaan'}" data-action="toggle-active" data-category="${categoryKey}" data-habit-id="${habit.id}">
              <svg viewBox="0 0 24 24">${habit.active ? '<path d="M10 4H6v16h4V4ZM18 4h-4v16h4V4Z"/>' : '<path d="m8 5 11 7-11 7V5Z"/>'}</svg>
            </button>
            <button class="icon-action danger" type="button" title="Hapus kebiasaan" aria-label="Hapus kebiasaan" data-action="delete-habit" data-category="${categoryKey}" data-habit-id="${habit.id}">
              <svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m6 6 1 15h10l1-15"/><path d="M10 11v6M14 11v6"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  function calculateLeaderboards(monthData, year, monthIndex) {
    const dailyRows = monthData.categories.daily
      .filter((habit) => habit.active)
      .map((habit) => ({
        ...habit,
        ...calculateHabitProgress(habit, 'daily', year, monthIndex),
      }));

    const byHigh = [...dailyRows].sort((a, b) => (
      b.progress - a.progress || a.name.localeCompare(b.name)
    ));
    const byLow = [...dailyRows].sort((a, b) => (
      a.progress - b.progress || a.name.localeCompare(b.name)
    ));

    return {
      top: byHigh.slice(0, 5),
      bottom: byLow.slice(0, 5),
    };
  }

  function renderLeaderboard(kicker, title, rows, type) {
    const empty = `
      <div class="leader-empty">
        <strong>${type === 'top' ? 'Miaw-menunggu.' : 'Belum ada daftar Miaw-no.'}</strong>
        <span>Tambahkan kebiasaan harian aktif untuk membuat papan ini.</span>
      </div>
    `;

    return `
      <section class="panel leaderboard ${type}">
        <div class="section-heading">
          <div>
            <span class="kicker">${escapeHtml(kicker)}</span>
            <h3>${escapeHtml(title)}</h3>
            <p>${type === 'top' ? 'Persentase penyelesaian harian tertinggi.' : 'Persentase penyelesaian harian terendah. Tetap miaw-langkah maju.'}</p>
          </div>
        </div>
        ${rows.length === 0 ? empty : `
          <ol class="leader-list">
            ${rows.map((row, index) => `
              <li>
                <span class="rank">${index + 1}</span>
                <div>
                  <strong>${escapeHtml(row.name)}</strong>
                  <span>${row.earnedPoints}/${row.possiblePoints} poin - ${row.checkedSlots}/${row.totalSlots} hari</span>
                </div>
                <em>${roundPercent(row.progress)}%</em>
              </li>
            `).join('')}
          </ol>
        `}
      </section>
    `;
  }

  function findHabit(categoryKey, habitId) {
    const monthData = ensureMonth(activeYear, activeMonth);
    return monthData.categories[categoryKey].find((habit) => habit.id === habitId);
  }

  function rerenderWithScroll(scrollKey, scrollLeft) {
    renderShell();
    if (!scrollKey) return;
    requestAnimationFrame(() => {
      const scroller = document.querySelector(`[data-scroll-key="${scrollKey}"]`);
      if (scroller) scroller.scrollLeft = scrollLeft;
    });
  }

  function addHabit(form) {
    const data = new FormData(form);
    const categoryKey = data.get('category');
    const name = String(data.get('name') || '').trim();
    const points = normalizeHabitPoints(data.get('points')) || suggestHabitPoints(name, categoryKey);

    if (!CATEGORY_CONFIG[categoryKey] || !name) return;

    const monthData = ensureMonth(activeYear, activeMonth);
    monthData.categories[categoryKey].push(createHabit(name, categoryKey, activeYear, activeMonth, points));
    form.reset();
    saveState();
    renderShell();
    showToast('Miaw-keren! Kebiasaan ditambahkan.');
  }

  function toggleSlot(input) {
    const categoryKey = input.dataset.category;
    const habitId = input.dataset.habitId;
    const slotIndex = Number(input.dataset.slot);
    const habit = findHabit(categoryKey, habitId);
    if (!habit || !Number.isInteger(slotIndex)) return;

    const scroller = input.closest('.grid-scroller');
    habit.slots[slotIndex] = input.checked;
    saveState();
    rerenderWithScroll(scroller?.dataset.scrollKey, scroller?.scrollLeft || 0);
    showToast(input.checked ? 'Miaw-keren! Slot dicentang.' : 'Miaw-tenang. Slot batal dicentang.');
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

  function renameHabit(categoryKey, habitId) {
    const habit = findHabit(categoryKey, habitId);
    if (!habit) return;

    const nextName = prompt('Ganti nama kebiasaan:', habit.name);
    if (nextName === null) return;

    const trimmed = nextName.trim();
    if (!trimmed) return;

    habit.name = trimmed.slice(0, 80);
    saveState();
    renderShell();
    showToast('Nama kebiasaan diganti.');
  }

  function editHabitPoints(categoryKey, habitId) {
    const habit = findHabit(categoryKey, habitId);
    if (!habit) return;

    const currentPoints = habitPoints(habit, categoryKey);
    const nextPoints = prompt('Ubah poin kebiasaan (1-100):', String(currentPoints));
    if (nextPoints === null) return;

    const normalizedPoints = normalizeHabitPoints(nextPoints);
    if (!normalizedPoints) {
      showToast('Poin harus angka 1-100.');
      return;
    }

    habit.points = normalizedPoints;
    saveState();
    renderShell();
    showToast('Poin kebiasaan diperbarui.');
  }

  function toggleActive(categoryKey, habitId) {
    const habit = findHabit(categoryKey, habitId);
    if (!habit) return;

    habit.active = !habit.active;
    saveState();
    renderShell();
    showToast(habit.active ? 'Miaw-keren! Kebiasaan aktif.' : 'Kebiasaan dijeda.');
  }

  function deleteHabit(categoryKey, habitId) {
    const monthData = ensureMonth(activeYear, activeMonth);
    const habit = monthData.categories[categoryKey].find((item) => item.id === habitId);
    if (!habit) return;

    if (!confirm(`Hapus "${habit.name}" dari ${MONTHS[activeMonth]} ${activeYear}?`)) return;

    monthData.categories[categoryKey] = monthData.categories[categoryKey].filter((item) => item.id !== habitId);
    saveState();
    renderShell();
    showToast('Kebiasaan dihapus.');
  }

  function resetMonthChecks() {
    const monthData = ensureMonth(activeYear, activeMonth);
    if (!confirm(`Reset semua centang untuk ${MONTHS[activeMonth]} ${activeYear}? Nama kebiasaan tetap disimpan.`)) return;

    CATEGORY_ORDER.forEach((categoryKey) => {
      monthData.categories[categoryKey].forEach((habit) => {
        habit.slots = habit.slots.map(() => false);
      });
    });

    saveState();
    renderShell();
    showToast('Miaw-rapi. Centang bulan ini direset.');
  }

  function openSidebar() {
    dom.sidebar.classList.add('open');
    dom.overlay.classList.add('show');
  }

  function closeSidebar() {
    dom.sidebar.classList.remove('open');
    dom.overlay.classList.remove('show');
  }

  function bindEvents() {
    dom.themeToggle.addEventListener('click', () => {
      const current = document.documentElement.dataset.theme || 'light';
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });

    dom.menuBtn.addEventListener('click', openSidebar);
    dom.overlay.addEventListener('click', closeSidebar);

    dom.yearSelect.addEventListener('change', () => {
      activeYear = Number(dom.yearSelect.value);
      ensureYear(activeYear);
      saveState();
      renderShell();
    });

    dom.monthList.addEventListener('click', (event) => {
      const button = event.target.closest('[data-month]');
      if (!button) return;

      activeMonth = Number(button.dataset.month);
      activeView = 'month';
      mobileDailyExpanded = false;
      mobileOpenSections = new Set(['daily']);
      saveState();
      renderShell();
      closeSidebar();
    });

    dom.authScreen.addEventListener('submit', (event) => {
      event.preventDefault();
      if (event.target.id === 'authLoginForm') loginWithPassword(event.target);
      if (event.target.id === 'authSignupForm') signupWithPassword(event.target);
      if (event.target.id === 'authOtpForm') verifyAuthOtp(event.target);
    });

    dom.authScreen.addEventListener('input', (event) => {
      const id = event.target.id;
      if (id === 'authPassword' && authMode === 'signup') refreshPwChecklistUi(event.target.value);
      if (id === 'authName') refreshUsernamePreview(event.target.value);
    });

    dom.authScreen.addEventListener('click', (event) => {
      const button = event.target.closest('[data-auth-action]');
      if (!button) return;

      if (button.dataset.authAction === 'toggle-pw') {
        const input = dom.authScreen.querySelector('#authPassword');
        if (!input) return;
        authPwVisible = !authPwVisible;
        input.type = authPwVisible ? 'text' : 'password';
        button.setAttribute('aria-pressed', String(authPwVisible));
        button.setAttribute('aria-label', authPwVisible ? 'Sembunyikan password' : 'Tampilkan password');
        button.querySelector('.eye-open').style.display = authPwVisible ? 'none' : '';
        button.querySelector('.eye-off').style.display = authPwVisible ? '' : 'none';
        input.focus();
        return;
      }

      if (button.dataset.authAction === 'switch-mode') {
        authMode = authMode === 'login' ? 'signup' : 'login';
        authOtpEmail = '';
        authPendingPassword = '';
        authPendingName = '';
        authPendingUsername = '';
        authPwVisible = false;
        authPwChecks = { len: false, upper: false, other: false };
        authOtpResendAt = 0;
        renderAuthScreen();
      }

      if (button.dataset.authAction === 'back-to-signup') {
        authOtpEmail = '';
        authPendingPassword = '';
        authPwVisible = false;
        authOtpResendAt = 0;
        renderAuthScreen();
      }

      if (button.dataset.authAction === 'resend-signup') resendSignupOtp();
      if (button.dataset.authAction === 'google') startGoogleLogin();
    });

    dom.authPanel.addEventListener('click', (event) => {
      const button = event.target.closest('[data-auth-action]');
      if (!button) return;

      if (button.dataset.authAction === 'logout') logoutAuth();
    });

    document.addEventListener('click', (event) => {
      const groupToggle = event.target.closest('[data-group-toggle]');
      if (groupToggle) {
        const key = groupToggle.dataset.groupToggle;
        if (openNavGroups.has(key)) {
          openNavGroups.delete(key);
        } else {
          openNavGroups.add(key);
        }
        saveState();
        syncNavGroups();
        return;
      }

      const jadwalBtn = event.target.closest('[data-jadwal-mode],[data-jadwal-prev],[data-jadwal-next],[data-jadwal-day],[data-jadwal-add],[data-jadwal-cancel]');
      if (jadwalBtn && handleJadwalAction(jadwalBtn)) return;

    const goalBtn = event.target.closest('[data-goal-add],[data-goal-back],[data-goal-filter],[data-goal-open],[data-goal-cat],[data-goal-term],[data-goal-add-again],[data-goal-ms-add],[data-goal-cal-prev],[data-goal-cal-next],[data-goal-cal-day],[data-goal-cal-page],[data-goal-proj]');
    if (goalBtn && handleGoalAction(goalBtn)) return;

    const progBtn = event.target.closest('[data-progress-tab]');
    if (progBtn && handleProgressAction(progBtn)) return;

    const projBtn = event.target.closest('[data-proj-add],[data-proj-form-back],[data-proj-filter],[data-proj-open],[data-proj-back],[data-proj-tab],[data-proj-tfilter],[data-proj-menu],[data-proj-icon],[data-proj-color],[data-proj-status],[data-proj-edit],[data-proj-archive],[data-proj-del],[data-proj-task-add],[data-proj-note-add],[data-proj-file-add],[data-proj-note-del],[data-proj-file-del],[data-goal-from-proj],[data-pt-add-task]');
    if (projBtn && handleProjectAction(projBtn)) return;

    const noteBtn = event.target.closest('[data-note-new],[data-note-tab],[data-note-tagfil],[data-note-tag],[data-note-open],[data-note-menu],[data-note-menu-close],[data-note-sheet-close],[data-note-dmenu],[data-note-back],[data-note-tpl],[data-note-edit],[data-note-edit2],[data-note-pin],[data-note-fav],[data-note-arch],[data-note-del],[data-note-epin],[data-note-efav],[data-note-cat],[data-note-cmd]');
    if (noteBtn && event.target.tagName !== 'INPUT' && handleNoteAction(noteBtn)) return;

    const docBtn = event.target.closest('button[data-doc-new],button[data-doc-link],button[data-doc-upload],button[data-doc-import],div[data-doc-pickfile],button[data-doc-pickfile],button[data-doc-addcat],button[data-doc-tab],button[data-doc-favfil],button[data-doc-mtype],button[data-doc-menu],button[data-doc-menu-close],button[data-doc-closeform],div[data-doc-closeform],div[data-doc-sheet-close],button[data-doc-moveopen],button[data-doc-open2],button[data-doc-move],button[data-doc-edit],button[data-doc-fav],button[data-doc-del],tr[data-doc-open]');
    if (docBtn && event.target.tagName !== 'INPUT' && event.target.tagName !== 'SELECT' && !(docBtn.classList.contains('doc-modal-wrap') && event.target.closest('.doc-modal')) && !(docBtn.classList.contains('note-sheet-wrap') && event.target.closest('.note-sheet')) && handleDocAction(docBtn)) return;

    const txBtn = event.target.closest('[data-tx-ftype],[data-tx-ftype-btn],[data-tx-mprev],[data-tx-mnext],[data-tx-mtoday],[data-tx-day],[data-tx-dayclear],[data-tx-focus],[data-tx-canceledit],[data-tx-edit],[data-tx-del]');
    if (txBtn && handleTxAction(txBtn)) return;
    const budBtn = event.target.closest('[data-bud-mprev],[data-bud-mnext],[data-bud-mtoday],[data-bud-filter],[data-bud-open],[data-bud-back],[data-bud-new],[data-bud-edit],[data-bud-del],[data-bud-cancelform],[data-bud-newtx],[data-bud-cancelform2],[data-bud-gotx]');
    if (budBtn && handleBudAction(budBtn)) return;
    const svBtn = event.target.closest('[data-sv-filter],[data-sv-open],[data-sv-back],[data-sv-new],[data-sv-newtx],[data-sv-deposit],[data-sv-edit],[data-sv-archive],[data-sv-del],[data-sv-cancelform],[data-sv-cancelform2],[data-sv-pick-ic],[data-sv-pick-color]');
    if (svBtn && handleSaveAction(svBtn)) return;
    const repBtn = event.target.closest('[data-rep-goto]');
    if (repBtn && handleRepAction(repBtn)) return;

      const taskBtn = event.target.closest('[data-task-open],[data-task-back],[data-task-toggle],[data-task-filter],[data-task-delete],[data-task-add],[data-task-cancel],[data-task-menu],[data-task-edit],[data-task-cancel-edit],[data-task-focus],[data-task-focus-pause],[data-task-add-close],[data-task-options],[data-task-add-again],[data-task-sub-add],[data-task-sub-del],[data-task-att-add],[data-task-att-del]');
      if (taskBtn && event.target.tagName !== 'INPUT' && event.target.tagName !== 'SELECT' && event.target.tagName !== 'TEXTAREA' && handleTaskAction(taskBtn)) return;

      const viewButton = event.target.closest('[data-view]');
      if (viewButton) {
        activeView = viewButton.dataset.view;
        const groupKey = NAV_GROUP_OF[activeView];
        if (groupKey) openNavGroups.add(groupKey);
        if (activeView === 'habits') {
          const current = currentTrackingDate();
          activeYear = current.year;
          activeMonth = current.monthIndex;
          mobileDailyExpanded = false;
          mobileOpenSections = new Set(['daily']);
        }
        saveState();
        renderShell();
        closeSidebar();
        return;
      }

      const actionButton = event.target.closest('[data-action]');
      if (!actionButton) {
        // Tap di area sel (bukan cuma checkbox kecil) = toggle slot
        const cell = event.target.closest('td.slot-cell[data-slot-index]');
        if (cell) {
          const box = cell.querySelector('input.slot-check:not(:disabled)');
          if (box) box.click();
        }
        return;
      }

      const { action, category, habitId, month } = actionButton.dataset;

      if (action === 'jump-month') {
        activeMonth = Number(month);
        activeView = 'month';
        mobileDailyExpanded = false;
        mobileOpenSections = new Set(['daily']);
        saveState();
        renderShell();
        return;
      }

      if (action === 'toggle-daily-full') {
        mobileDailyExpanded = !mobileDailyExpanded;
        renderShell();
        return;
      }

      if (action === 'toggle-mobile-section') {
        if (mobileOpenSections.has(category)) {
          mobileOpenSections.delete(category);
        } else {
          mobileOpenSections.add(category);
        }
        renderShell();
        return;
      }

      if (action === 'rename-habit') renameHabit(category, habitId);
      if (action === 'edit-points') editHabitPoints(category, habitId);
      if (action === 'toggle-active') toggleActive(category, habitId);
      if (action === 'delete-habit') deleteHabit(category, habitId);
      if (action === 'reset-month') resetMonthChecks();
      if (action === 'delete-account-data') { accountDeleteOpen = true; renderShell(); dom.content.querySelector('#acctDelConfirm')?.focus(); return; }
      if (action === 'acct-del-noop') return;
      if (action === 'account-delete-cancel') { accountDeleteOpen = false; renderShell(); return; }
      if (action === 'account-delete-confirm') confirmAccountDeletion();
      if (action === 'account-password-page') { accountPage = 'password'; acctNewPwVisible = false; acctPwDraft = { pw: '', confirm: '' }; renderShell(); return; }
      if (action === 'account-back') { accountPage = 'main'; acctPwDraft = { pw: '', confirm: '' }; renderShell(); return; }
      if (action === 'acct-eye-on' || action === 'acct-eye-off') {
        const form = dom.content.querySelector('#accountPasswordForm');
        if (form) acctPwDraft = { pw: form.password.value, confirm: form.confirmPassword.value };
        acctNewPwVisible = action === 'acct-eye-on';
        renderShell();
        const inp = dom.content.querySelector('#accountPasswordForm [name=password]');
        if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
        refreshAcctPwUi(acctPwDraft.pw);
        return;
      }
      /* --- MiawAI --- */
      const miawQ = event.target.closest('[data-miaw-q]');
      if (miawQ) { miawSend(miawQ.dataset.miawQ); return; }
      const miawRm = event.target.closest('[data-miaw-rmfile]');
      if (miawRm) { miawFiles.splice(Number(miawRm.dataset.miawRmfile), 1); renderShell(); return; }
      if (action === 'miaw-new') { miawMessages = []; miawFiles = []; miawDraft = ''; miawContextSent = false; renderShell(); return; }
      if (action === 'miaw-attach') { dom.content.querySelector('#miawFile')?.click(); return; }
      if (action === 'miaw-send') {
        const inp = dom.content.querySelector('#miawInput');
        miawSend(inp ? inp.value : miawDraft);
        return;
      }
    });

    dom.content.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && event.target && event.target.id === 'miawInput' && !miawBusy) {
        event.preventDefault();
        miawSend(event.target.value);
      }
    });

    dom.content.addEventListener('change', (event) => {
      const miawModelSel = event.target.closest('#miawModelSel');
      if (miawModelSel) { miawModel = miawModelSel.value; renderShell(); return; }
      const miawFileEl = event.target.closest('#miawFile');
      if (miawFileEl) { handleMiawFiles(miawFileEl); return; }
      const taskCheck = event.target.closest('[data-task-toggle],[data-task-sub]');
      if (taskCheck) handleTaskAction(taskCheck);
      const projChk = event.target.closest('[data-proj-ms],[data-proj-task],[data-proj-search],[data-pt-move]');

      if (projChk && projChk.matches('[data-pt-move]')) {
        const tid = projChk.dataset.ptMove; const dest = projChk.value;
        if (dest) { const tasks = loadTasks(); const t = tasks.find((x) => x.id === tid); if (t) { t.project = dest; saveTasks(); } renderShell(); }
      } else if (projChk) handleProjectChange(projChk);
      const noteSortEl = event.target.closest('[data-note-sort]');
      if (noteSortEl) { noteSort = noteSortEl.value; renderShell(); }
      const docTypeEl = event.target.closest('[data-doc-ftype]');
      if (docTypeEl) { docType = docTypeEl.value; renderShell(); }
      const docSortEl = event.target.closest('[data-doc-sort]');
      if (docSortEl) { docSort = docSortEl.value; renderShell(); }
      const docFileEl = event.target.closest('#docForm input[type="file"], #docImportInput');
      if (docFileEl) {
        if (docFileEl.id === 'docImportInput') handleDocImport(docFileEl);
        else handleDocFilePick(docFileEl);
      }
      const noteChk = event.target.closest('.note-body input[type="checkbox"]');
      if (noteChk && noteId) {
        if (noteChk.checked) noteChk.setAttribute('checked', ''); else noteChk.removeAttribute('checked');
        const host = dom.content.querySelector('.note-body');
        if (host) noteSetField(noteId, { body: sanitizeNoteHtml(host.innerHTML) });
      }
      const noteEdChk = event.target.closest('.note-editor input[type="checkbox"]');
      if (noteEdChk && noteId) {
        if (noteEdChk.checked) noteEdChk.setAttribute('checked', ''); else noteEdChk.removeAttribute('checked');
        const host = dom.content.querySelector('.note-editor');
        if (host) { noteEditorSave({ body: sanitizeNoteHtml(host.innerHTML) }); }
      }
      const goalMs = event.target.closest('[data-goal-ms]');
      if (goalMs) {
        const [gid, mid] = goalMs.dataset.goalMs.split(':');
        const items = loadGoals();
        const g = items.find((x) => x.id === gid);
        if (g) {
          const mi = (g.milestones || []).find((x) => x.id === mid);
          if (mi) {
            mi.done = goalMs.checked;
            if (g.status !== 'selesai' && (g.milestones || []).length && g.milestones.every((x) => x.done)) g.status = 'selesai';
            if (g.status === 'selesai' && !g.milestones.every((x) => x.done)) g.status = 'aktif';
            saveGoals(items);
            renderShell();
          }
        }
      }
    });

    dom.content.addEventListener('input', (event) => {
      const acctPw = event.target.closest('#accountPasswordForm [name=password]');
      if (acctPw) { refreshAcctPwUi(acctPw.value); }
      const delInp = event.target.closest('#acctDelConfirm');
      if (delInp) {
        const go = dom.content.querySelector('#acctDelGo');
        if (go) go.disabled = delInp.value.trim().toLowerCase() !== 'ya, saya ingin hapus akun';
      }
      const projSearch = event.target.closest('[data-proj-search]');
      if (projSearch) handleProjectChange(projSearch);
      const noteEl = event.target.closest('[data-note-search],[data-note-title],[data-note-tags],[data-note-body]');
      if (noteEl) handleNoteInput(noteEl);
      const docEl = event.target.closest('[data-doc-search]');
      if (docEl) handleDocSearch(docEl.value);
      const budEl = event.target.closest('#budForm [name]');
      if (budEl && budFormOpen) { const f = dom.content.querySelector('#budForm'); if (f) budDraft = budDraftFrom(f); }
      const svEl = event.target.closest('#svForm [name]');
      if (svEl && saveFormOpen) { const f = dom.content.querySelector('#svForm'); if (f) saveDraft = svDraftFrom(f); }
      const svTxEl = event.target.closest('#svTxForm [name]');
      if (svTxEl && saveTxOpen) { const f = dom.content.querySelector('#svTxForm'); if (f) saveTxDraft = { svId: f.stxSv.value, kind: f.stxKind.value, amount: f.stxAmount.value, date: f.stxDate.value, source: f.stxSource.value, note: f.stxNote.value }; }
    });

    dom.content.addEventListener('change', (event) => {
      const svSwitch = event.target.closest('#svTxForm [name=stxSv]');
      if (svSwitch && saveTxOpen) { const f = dom.content.querySelector('#svTxForm'); if (f) { saveTxDraft = { svId: f.stxSv.value, kind: f.stxKind.value, amount: f.stxAmount.value, date: f.stxDate.value, source: f.stxSource.value, note: f.stxNote.value }; renderShell(); dom.content.querySelector('#svTxForm')?.scrollIntoView({ block: 'center' }); } }
    });

    dom.content.addEventListener('submit', (event) => {
      event.preventDefault();
      if (event.target.id === 'projForm') { submitProjectForm(event.target); return; }
      if (event.target.id === 'docForm') { submitDocForm(event.target); return; }
      if (event.target.id === 'txForm') { submitTxForm(event.target); return; }
      if (event.target.id === 'budForm') { submitBudForm(event.target); return; }
      if (event.target.id === 'budTxForm') { submitBudTxForm(event.target); return; }
      if (event.target.id === 'svForm') { submitSvForm(event.target); return; }
      if (event.target.id === 'svTxForm') { submitSvTxForm(event.target); return; }
      if (event.target.id === 'noteCaptureForm') {
        const input = event.target.querySelector('input[name="q"]');
        const text = (input.value || '').trim();
        if (!text) return;
        input.value = '';
        const n = noteCapture(text);
        noteId = n.id; notePage = 'editor';
        renderShell();
        return;
      }
      if (event.target.id === 'projTaskForm' || event.target.id === 'projNoteForm' || event.target.id === 'projFileForm') { submitProjectSubForm(event.target); return; }
      if (event.target.id === 'taskComposer') {
        const form = event.target;
        const title = form.querySelector('#taskQuickInput').value.trim();
        if (!title) { taskAdding = false; renderShell(); return; }
        const date = form.querySelector('#taskQuickWhen').value || taskTodayIso();
        const project = form.querySelector('#taskQuickProj').value.trim() || firstProjName();
        if (!project) { showToast('Buat project dulu — task harus berdasarkan project.', true); return; }
        loadTasks().push({ id: `t${Date.now()}`, title, project, tag: '', time: '', priority: 'low', date, done: false });
        taskAdding = false;
        if (date !== taskTodayIso()) taskFilter = 'all';
        saveTasks();
        renderShell();
        return;
      }
      if (event.target.id === 'taskAddForm') {
        const form = event.target;
        if (submitTaskAdd(form, false)) {
          taskPageAdding = false;
          logActivityLastTask('Task dibuat');
          renderShell();
        }
        return;
      }
      if (event.target.id === 'goalAddForm') {
        event.preventDefault();
        submitGoalForm(event.target, false);
        return;
      }
      if (event.target.id === 'jadwalAddForm') {
        event.preventDefault();
        const form = event.target;
        const val = (n) => form.querySelector(`[name=${n}]`)?.value.trim() || '';
        const title = val('title');
        if (!title) return;
        const items = loadJadwalEvents();
        const date = val('date') || taskTodayIso();
        items.push({ id: `j${Date.now()}`, title, date, time: val('time') || '09:00', category: val('category') || 'Pribadi', kind: val('kind') === 'task' ? 'task' : 'event' });
        saveJadwalEvents(items);
        jadwalSelIso = date;
        jadwalAdding = false;
        renderShell();
        return;
      }
      if (event.target.id === 'taskEditForm') {
        const form = event.target;
        const t = loadTasks().find((x) => x.id === taskDetailId);
        if (t) {
          const title = form.querySelector('[name=title]').value.trim();
          if (title && title !== t.title) { t.title = title; logTaskActivity(t, 'Judul diubah'); }
          const proj = form.querySelector('[name=project]').value.trim();
          if (!proj) { showToast('Task harus berdasarkan project — pilih project.', true); return; }
          if (proj !== (t.project || '')) { t.project = proj; logTaskActivity(t, 'Project diubah'); }
          const date = form.querySelector('[name=date]').value;
          const time = form.querySelector('[name=time]').value;
          if (date !== (t.date || '') || time !== (t.time || '')) { t.date = date; t.time = time; logTaskActivity(t, 'Deadline diubah'); }
          const prio = form.querySelector('[name=priority]').value;
          if (prio !== t.priority) { t.priority = prio; logTaskActivity(t, 'Prioritas diubah'); }
          const notes = form.querySelector('[name=notes]').value.trim();
          if (notes !== (t.notes || '')) { t.notes = notes; logTaskActivity(t, 'Deskripsi diperbarui'); }
          saveTasks();
        }
        taskEditing = false;
        renderShell();
        return;
      }
      if (event.target.id === 'habitForm') addHabit(event.target);
      if (event.target.id === 'accountProfileForm') updateAccountProfile(event.target);
      if (event.target.id === 'accountPasswordForm') changeAccountPassword(event.target);
    });

    dom.content.addEventListener('change', (event) => {
      const syncEl = event.target.closest('[data-add-sync]');
      if (syncEl) {
        const read = syncEl.parentElement.querySelector('.task-add-read');
        if (read) read.textContent = syncEl.dataset.addSync === 'date' ? taskDateRead(syncEl.value) : taskTimeRead(syncEl.value);
      }
      const input = event.target.closest('[data-action="toggle-slot"]');
      if (!input) return;
      toggleSlot(input);
    });

    // Pulihkan sesi fokus yang berjalan setelah reload
    {
      const running = loadTasks().find((x) => x.focusAt);
      if (running) {
        focusTaskId = running.id;
        if (!focusInterval) focusInterval = setInterval(tickFocusDisplay, 1000);
      }
    }

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') queueRemoteSave({ immediate: true, keepalive: true });
    });

    window.addEventListener('pagehide', () => {
      queueRemoteSave({ immediate: true, keepalive: true });
    });
  }

  async function init() {
    initTheme();
    await consumeOAuthCallback();
    if (authSession) await getAccessToken();
    ensureYear(activeYear);
    saveState();
    bindEvents();
    renderShell();
    await hydrateRemoteState();
  }

  init();
})();

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
  let state = loadState();
  let activeYear = Number(state.selectedYear) || runtimeYear;
  let activeView = state.selectedView || 'dashboard';
  const NAV_GROUP_OF = {
    task: 'aktivitas', jadwal: 'aktivitas', kalender: 'aktivitas',
    habits: 'diri', goals: 'diri', progress: 'diri',
    project: 'organisasi', catatan: 'organisasi', dokumen: 'organisasi',
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
  let authSession = loadAuthSession();
  let authMode = 'login';
  let authOtpEmail = '';
  let authPendingName = '';
  let authPendingPassword = '';
  let authOtpResendAt = 0;
  let authCooldownTimer = null;
  let authIsBusy = false;

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
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
    authPendingPassword = '';
    authOtpResendAt = 0;
    clearInterval(authCooldownTimer);
    authIsBusy = false;
    remoteHydrated = false;
  }

  function otpRemainingSeconds() {
    return Math.max(0, Math.ceil((authOtpResendAt - Date.now()) / 1000));
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
        activeYear = Number(state.selectedYear) || runtimeYear;
        activeView = state.selectedView || 'dashboard';
        activeMonth = Number.isInteger(state.selectedMonth) ? state.selectedMonth : new Date().getMonth();
        openNavGroups = new Set(state.openNavGroups || (NAV_GROUP_OF[activeView] ? [NAV_GROUP_OF[activeView]] : []));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
            ` : ''}

            <label for="authEmail">Email</label>
            <input id="authEmail" name="email" type="email" autocomplete="email" placeholder="nama@email.com" value="${escapeHtml(authOtpEmail)}" required />

            <label for="authPassword">Password</label>
            <input id="authPassword" name="password" type="password" autocomplete="${isSignup ? 'new-password' : 'current-password'}" placeholder="Minimal 6 karakter" minlength="6" required />

            <button class="auth-primary" type="submit" ${authIsBusy ? 'disabled' : ''}>
              ${authIsBusy ? 'Memproses...' : (isSignup ? 'Daftar dan kirim OTP' : 'Masuk')}
            </button>
          </form>
          <button class="auth-switch" type="button" data-auth-action="switch-mode">
            ${isSignup ? 'Sudah punya akun? Masuk' : 'Belum punya akun? Daftar'}
          </button>
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
      const raw = JSON.parse(localStorage.getItem(JADWAL_STORE_KEY) || 'null');
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
    try { localStorage.setItem(JADWAL_STORE_KEY, JSON.stringify(seed)); } catch { /* ignore */ }
    return seed;
  }

  function saveJadwalEvents(list) {
    try { localStorage.setItem(JADWAL_STORE_KEY, JSON.stringify(list)); } catch { /* ignore */ }
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
      dom.pageTitle.textContent = 'Dasbor';
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
      dom.pageTitle.textContent = 'Task';
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

    if (activeView === 'goals') {
      dom.pageTitle.textContent = 'Goals';
      dom.pageSubtitle.textContent = 'Target jangka pendek & panjang';
      dom.content.innerHTML = renderGoalsView();
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
    kalender: { title: 'Kalender', subtitle: 'Pandangan bulanan seluruh aktivitas', emoji: '📆', hint: 'Lihat task, jadwal, dan kebiasaan dalam satu kalender.' },
    goals: { title: 'Goals', subtitle: 'Target jangka pendek & panjang', emoji: '🎯', hint: 'Pasang target besar dan pecah jadi kebiasaan kecil.' },
    progress: { title: 'Progress', subtitle: 'Grafik perkembangan dirimu', emoji: '📈', hint: 'Pantau konsistensi dan pertumbuhan dari waktu ke waktu.' },
    project: { title: 'Project', subtitle: 'Proyek & target besar', emoji: '🧩', hint: 'Kelompokkan task dan catatan ke dalam proyek.' },
    catatan: { title: 'Catatan', subtitle: 'Ide, journal, dan memo cepat', emoji: '📝', hint: 'Tangkap pikiran sebelum hilang.' },
    dokumen: { title: 'Dokumen', subtitle: 'Berkas & referensi penting', emoji: '🗂️', hint: 'Simpan tautan dan dokumen penting di satu tempat.' },
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
  const taskAddDefaults = () => ({ title: '', date: taskTodayIso(), time: '19:00', priority: 'high', project: 'Marketing Batu Bata', category: 'Marketing', notes: '', memo: '', deadline: '', reminder: '', tag: '', recurring: '', estimate: '', checklist: [], attachments: [] });
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
      { id: 't2', title: 'Follow up pelanggan', project: 'Sales', tag: '', time: '20:00', priority: 'high', date: today, done: false },
      { id: 't3', title: 'Laporan keuangan', project: 'Keuangan', tag: '', time: '21:00', priority: 'med', date: today, done: false },
      { id: 't4', title: 'Edit video promosi', project: 'Marketing', tag: '', time: '22:00', priority: 'low', date: today, done: false },
      { id: 't5', title: 'Riset keyword', project: 'Marketing', tag: '', time: '10:30', priority: 'med', date: today, done: true },
      { id: 't6', title: 'Cek stok bahan', project: 'Operasional', tag: '', time: '14:00', priority: 'low', date: today, done: true },
      { id: 't7', title: 'Susun konten minggu depan', project: 'Marketing', tag: '', time: '', priority: 'med', date: later, done: false },
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
        <label>Project<input name="project" type="text" maxlength="40" value="${escapeHtml(t.project || '')}" /></label>
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
        <input id="taskQuickProj" type="text" maxlength="24" placeholder="Project (opsional)" autocomplete="off" />
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
          ${row(board, 'Project', `<span class="task-dot dot-red"></span><input name="project" type="text" maxlength="40" value="${escapeHtml(d.project)}" list="taskAddProjects" />`)}
          ${row(grid, 'Kategori', `<span class="task-dot dot-ring"></span><input name="category" type="text" maxlength="24" value="${escapeHtml(d.category)}" list="taskAddCats" />`)}
          <datalist id="taskAddProjects"><option value="Marketing Batu Bata"></option><option value="Marketing"></option><option value="Sales"></option><option value="Operasional"></option><option value="Keuangan"></option></datalist>
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
    const keep = { time: data.time || '19:00', priority: data.priority, project: data.project || 'Marketing Batu Bata', category: data.category || 'Marketing', date: data.date };
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
  let goalsFilter = 'all';        // all | aktif | selesai
  let goalsPage = 'list';         // list | detail | add | calendar
  let goalsDetailId = null;
  let goalsMonthOffset = 0;
  let goalsAddCat = 'Karier';
  let goalsCalSel = null;

  function loadGoals() {
    try {
      const raw = JSON.parse(localStorage.getItem(GOALS_STORE_KEY) || 'null');
      if (Array.isArray(raw) && raw.length) return raw;
    } catch { /* seed ulang */ }
    const today = taskTodayIso();
    const y = today.slice(0, 4);
    const m = today.slice(5, 7);
    const day = (n) => `${y}-${m}-${String(n).padStart(2, '0')}`;
    const seed = [
      {
        id: 'g1', title: 'Bangun bisnis online', category: 'Karier', project: 'Marketing Batu Bata',
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
        id: 'g2', title: 'Meningkatkan skill digital', category: 'Pendidikan', project: 'Pengembangan Diri',
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
        id: 'g3', title: 'Menjaga kesehatan', category: 'Kesehatan', project: 'Rutinitas Harian',
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
        id: 'g4', title: 'Dana darurat 3 bulan', category: 'Keuangan', project: 'Keuangan Pribadi',
        deadline: `${y}-12-20`, description: 'Sisihkan 10% penghasilan tiap bulan sampai tercapai.',
        status: 'selesai', createdAt: today,
        milestones: [
          { id: 'm14', text: 'Buka rekening khusus', target: day(5), done: true },
          { id: 'm15', text: 'Autodebet bulanan', target: day(6), done: true },
          { id: 'm16', text: 'Capai target 3 bulan', target: day(10), done: true },
        ],
      },
    ];
    try { localStorage.setItem(GOALS_STORE_KEY, JSON.stringify(seed)); } catch { /* ignore */ }
    return seed;
  }

  function saveGoals(list) {
    try { localStorage.setItem(GOALS_STORE_KEY, JSON.stringify(list)); } catch { /* ignore */ }
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
    return `<button type="button" class="goal-card" data-goal-open="${g.id}">
        <span class="goal-ico" style="--gc:${goalCatColor(g.category)}">${goalCatIcon(g.category)}</span>
        <span class="goal-card-main">
          <span class="goal-card-title">${escapeHtml(g.title)}</span>
          <span class="goal-card-meta">Deadline ${escapeHtml(taskDateRead(g.deadline || ''))} · ${escapeHtml(g.category)}</span>
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
    const cards = filtered.map(goalCardHtml).join('') || '<p class="task-empty">Tidak ada goal pada filter ini.</p>';
    return `<div class="goals-page">
        ${summary}
        <div class="goal-chips">${chips}</div>
        ${cards}
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
        <div class="goal-detail-card">
          <div class="goal-detail-head">
            <span class="goal-ico big" style="--gc:${goalCatColor(g.category)}">${goalCatIcon(g.category)}</span>
            <span class="goal-detail-titlewrap">
              <span class="goal-detail-title">${escapeHtml(g.title)}</span>
              <span class="goal-chip-status ${g.status === 'selesai' ? 'fin' : 'act'}">${g.status === 'selesai' ? 'Selesai' : 'Aktif'}</span>
            </span>
          </div>
          <div class="goal-detail-meta">Deadline <strong>${escapeHtml(taskDateRead(g.deadline || ''))}</strong> · ${escapeHtml(g.category)}</div>
          <div class="goal-bar big"><span style="width:${p.pct}%"></span></div>
          <div class="goal-detail-sub">${p.done}/${p.total} sub goal · ${p.pct}%</div>
          <div class="goal-detail-sec">Deskripsi</div>
          <p class="goal-detail-desc">${escapeHtml(g.description || '—')}</p>
          <div class="goal-detail-sec">Project terkait</div>
          <span class="goal-proj-chip">${escapeHtml(g.project || '—')}</span>
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
    return `<div class="goals-page">
        <form class="goal-add-card" id="goalAddForm">
          <label class="goal-field"><span>Judul</span><input name="title" type="text" maxlength="90" placeholder="Raih tujuan besar…" required /></label>
          <label class="goal-field"><span>Deskripsi</span><textarea name="description" rows="3" maxlength="240" placeholder="Ceritakan goal ini…"></textarea></label>
          <label class="goal-field"><span>Deadline</span><input name="deadline" type="date" value="${escapeHtml(taskTodayIso())}" /></label>
          <label class="goal-field"><span>Project terkait</span><input name="project" type="text" maxlength="40" placeholder="Marketing Batu Bata" list="goalProjects" /></label>
          <datalist id="goalProjects"><option value="Marketing Batu Bata"></option><option value="Pengembangan Diri"></option><option value="Rutinitas Harian"></option><option value="Keuangan Pribadi"></option></datalist>
          <div class="goal-field"><span>Kategori</span><div class="goal-cat-row">${chips}</div></div>
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
      renderShell();
      setTimeout(() => document.querySelector('#goalAddForm [name=title]')?.focus(), 30);
      return true;
    }
    if (btn.matches('[data-goal-back]')) { goalsPage = 'list'; renderShell(); return true; }
    if (btn.matches('[data-goal-cal-page]')) { goalsPage = 'calendar'; goalsCalSel = null; goalsMonthOffset = 0; renderShell(); return true; }
    if (btn.matches('[data-goal-filter]')) { goalsFilter = btn.dataset.goalFilter; renderShell(); return true; }
    if (btn.matches('[data-goal-open]')) { goalsDetailId = btn.dataset.goalOpen; goalsPage = 'detail'; renderShell(); return true; }
    if (btn.matches('[data-goal-cat]')) { goalsAddCat = btn.dataset.goalCat; renderShell(); return true; }
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
    return false;
  }

  function submitGoalForm(form, again) {
    if (!form) return;
    const val = (n) => form.querySelector(`[name=${n}]`)?.value.trim() || '';
    const title = val('title');
    if (!title) return;
    const item = {
      id: `g${Date.now()}`, title, description: val('description'), deadline: val('deadline') || taskTodayIso(),
      project: val('project'), category: goalsAddCat, status: 'aktif', createdAt: taskTodayIso(), milestones: [],
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
        <section class="dashboard-sheet" aria-label="Dasbor bergaya spreadsheet">
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

  function renderAccountTab() {
    return `
      <div class="account-layout">
        <section class="panel account-panel">
          <div class="section-heading">
            <div>
              <h3>Profil Akun</h3>
              <p>Ubah nama yang tampil di aplikasi.</p>
            </div>
          </div>
          <form id="accountProfileForm" class="account-form">
            <label>
              <span>Username</span>
              <input name="username" type="text" maxlength="40" value="${escapeHtml(authDisplayName())}" autocomplete="username" required />
            </label>
            <button class="primary-button" type="submit">Simpan Username</button>
          </form>
        </section>

        <section class="panel account-panel">
          <div class="section-heading">
            <div>
              <h3>Ganti Password</h3>
              <p>Password baru minimal 6 karakter.</p>
            </div>
          </div>
          <form id="accountPasswordForm" class="account-form">
            <label>
              <span>Password Baru</span>
              <input name="password" type="password" minlength="6" autocomplete="new-password" required />
            </label>
            <label>
              <span>Ulangi Password</span>
              <input name="confirmPassword" type="password" minlength="6" autocomplete="new-password" required />
            </label>
            <button class="primary-button" type="submit">Ganti Password</button>
          </form>
        </section>

        <section class="panel account-panel danger-zone">
          <div class="section-heading">
            <div>
              <h3>Hapus Akun</h3>
              <p>Menghapus data tracker dari perangkat dan Supabase lalu keluar dari aplikasi. Penghapusan identitas Auth penuh memerlukan admin Supabase.</p>
            </div>
          </div>
          <button class="danger-button" type="button" data-action="delete-account-data">Hapus Akun</button>
        </section>
      </div>
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

  async function loginWithPassword(form) {
    const data = new FormData(form);
    const email = String(data.get('email') || '').trim().toLowerCase();
    const password = String(data.get('password') || '');
    if (!email || !password) return;

    authIsBusy = true;
    renderAuthScreen();

    try {
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
    if (!name) {
      showToast('Nama pengguna wajib diisi.');
      return;
    }

    if (!email || password.length < 6) {
      showToast('Password minimal 6 karakter.');
      return;
    }

    authIsBusy = true;
    authPendingName = name.slice(0, 40);
    authOtpEmail = email;
    authPendingPassword = password;
    renderAuthScreen();

    try {
      await authFetch('/auth/v1/otp', {
        method: 'POST',
        body: JSON.stringify({
          email,
          create_user: true,
          data: {
            username: authPendingName,
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
            username: authPendingName,
            full_name: authPendingName,
            display_name: authPendingName,
          },
        }),
      }, session.access_token);

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

    clearAuthSession();
    localStorage.removeItem(STORAGE_KEY);
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
    const username = String(data.get('username') || '').trim();
    if (!username) {
      showToast('Username tidak boleh kosong.');
      return;
    }

    authIsBusy = true;
    renderShell();

    try {
      const token = await getAccessToken();
      const response = await authFetch('/auth/v1/user', {
        method: 'PUT',
        body: JSON.stringify({
          data: {
            username: username.slice(0, 40),
            display_name: username.slice(0, 40),
            full_name: username.slice(0, 40),
          },
        }),
      }, token);

      mergeAuthUser(response?.user || response);
      showToast('Username akun diperbarui.');
    } catch (error) {
      console.warn(error);
      showToast('Gagal memperbarui username.');
    } finally {
      authIsBusy = false;
      renderShell();
    }
  }

  async function changeAccountPassword(form) {
    const data = new FormData(form);
    const password = String(data.get('password') || '');
    const confirmPassword = String(data.get('confirmPassword') || '');

    if (password.length < 6) {
      showToast('Password minimal 6 karakter.');
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
      showToast('Password akun diperbarui.');
    } catch (error) {
      console.warn(error);
      showToast('Gagal mengganti password.');
    } finally {
      authIsBusy = false;
      renderShell();
    }
  }

  async function deleteAccountData() {
    const confirmed = confirm('Hapus data tracker akun ini dari perangkat dan Supabase, lalu keluar? Tindakan ini tidak bisa dibatalkan dari aplikasi.');
    if (!confirmed) return;

    authIsBusy = true;
    renderShell();

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
    localStorage.removeItem(STORAGE_KEY);
    state = createFreshState();
    activeYear = runtimeYear;
    activeView = 'dashboard';
    activeMonth = new Date().getMonth();
    ensureYear(activeYear);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    authIsBusy = false;
    renderShell();
    showToast('Data tracker akun dihapus dari aplikasi.');
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

    dom.authScreen.addEventListener('click', (event) => {
      const button = event.target.closest('[data-auth-action]');
      if (!button) return;

      if (button.dataset.authAction === 'switch-mode') {
        authMode = authMode === 'login' ? 'signup' : 'login';
        authOtpEmail = '';
        authPendingPassword = '';
        authPendingName = '';
        authOtpResendAt = 0;
        renderAuthScreen();
      }

      if (button.dataset.authAction === 'back-to-signup') {
        authOtpEmail = '';
        authPendingPassword = '';
        authOtpResendAt = 0;
        renderAuthScreen();
      }

      if (button.dataset.authAction === 'resend-signup') resendSignupOtp();
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

    const goalBtn = event.target.closest('[data-goal-add],[data-goal-back],[data-goal-filter],[data-goal-open],[data-goal-cat],[data-goal-add-again],[data-goal-ms-add],[data-goal-cal-prev],[data-goal-cal-next],[data-goal-cal-day],[data-goal-cal-page]');
    if (goalBtn && handleGoalAction(goalBtn)) return;

    const progBtn = event.target.closest('[data-progress-tab]');
    if (progBtn && handleProgressAction(progBtn)) return;

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
      if (action === 'delete-account-data') deleteAccountData();
    });

    dom.content.addEventListener('change', (event) => {
      const taskCheck = event.target.closest('[data-task-toggle],[data-task-sub]');
      if (taskCheck) handleTaskAction(taskCheck);
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

    dom.content.addEventListener('submit', (event) => {
      event.preventDefault();
      if (event.target.id === 'taskComposer') {
        const form = event.target;
        const title = form.querySelector('#taskQuickInput').value.trim();
        if (!title) { taskAdding = false; renderShell(); return; }
        const date = form.querySelector('#taskQuickWhen').value || taskTodayIso();
        const project = form.querySelector('#taskQuickProj').value.trim();
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
    if (authSession) await getAccessToken();
    ensureYear(activeYear);
    saveState();
    bindEvents();
    renderShell();
    await hydrateRemoteState();
  }

  init();
})();

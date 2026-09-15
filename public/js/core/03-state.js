// Tracker Daily — 03-state
// Dipisah dari public/app.js (refactor modular; tidak ada identifier yang di-rename).
// Classic script — urutan load: lihat <script> di public/index.html.
'use strict';

// Sesi dimuat lebih dulu supaya storage bisa di-scope per akun
let authSession = loadAuthSession();

// Semua kunci data pengguna diberi suffix id user => tiap akun punya datanya sendiri
function scopedKey(key) {
  return authSession?.user?.id ? `${key}:${authSession.user.id}` : key;
}

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
let openNavGroups = new Set(state.openNavGroups || (NAV_GROUP_OF[activeView] ? [NAV_GROUP_OF[activeView]] : []));

function syncNavGroups() {
  document.querySelectorAll('.nav-group').forEach((group) => {
    const key = group.dataset.group;
    const isOpen = openNavGroups.has(key);
    group.classList.toggle('open', isOpen);
    // tandai grup yang sedang aktif → aksen warna seksi menyala (lihat CSS --sec-*)
    group.classList.toggle('active', NAV_GROUP_OF[activeView] === key);
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
let authMode = 'landing';
let authOtpEmail = '';

let authPendingName = '';
let authPendingUsername = '';
let authPendingPassword = '';
let authOtpResendAt = 0;
let authCooldownTimer = null;
let authIsBusy = false;
let authPwVisible = false;
let authPwChecks = { len: false, upper: false, other: false };

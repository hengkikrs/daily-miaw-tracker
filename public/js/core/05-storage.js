// Tracker Daily — 05-storage
// Dipisah dari public/app.js (refactor modular; tidak ada identifier yang di-rename).
// Classic script — urutan load: lihat <script> di public/index.html.
'use strict';


function createFreshState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    selectedYear: runtimeYear,
    selectedView: 'dashboard',
    selectedMonth: new Date().getMonth(),
    years: {},
  };
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

// ===== Sinkron penuh: gabungkan store terpisah (jadwal/goals/projects/notes/daily) ke snapshot =====
function readStoreJson(key, fallback) {
  try {
    const raw = localStorage.getItem(scopedKey(key));
    if (raw == null) return fallback;
    const parsed = JSON.parse(raw);
    return parsed === null ? fallback : parsed;
  } catch { return fallback; }
}

function buildStoresPayload() {
  const daily = loadDailyTasks();
  const dailyRows = Array.isArray(daily) ? daily.filter((x) => x && x.id) : [];
  return {
    jadwal: readStoreJson(JADWAL_STORE_KEY, []),
    goals: readStoreJson(GOALS_STORE_KEY, []),
    projects: readStoreJson(PROJ_STORE_KEY, []),
    notes: readStoreJson(NOTES_STORE_KEY, []),
    dailyTasks: dailyRows,
    dailyLog: (daily && daily.__dailyLog) || {},
    savedAt: Date.now(),
  };
}

function applyStoresPayload(stores) {
  if (!stores || typeof stores !== 'object') return false;
  const write = (key, val) => {
    try { localStorage.setItem(scopedKey(key), JSON.stringify(val)); } catch { /* ignore */ }
  };
  if (Array.isArray(stores.jadwal)) write(JADWAL_STORE_KEY, stores.jadwal);
  if (Array.isArray(stores.goals)) write(GOALS_STORE_KEY, stores.goals);
  if (Array.isArray(stores.projects)) write(PROJ_STORE_KEY, stores.projects);
  if (Array.isArray(stores.notes)) write(NOTES_STORE_KEY, stores.notes);
  if (Array.isArray(stores.dailyTasks)) {
    write(DAILY_TASK_STORE_KEY, stores.dailyTasks);
    write(`${DAILY_TASK_STORE_KEY}.log`, stores.dailyLog && typeof stores.dailyLog === 'object' ? stores.dailyLog : {});
  }
  return true;
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

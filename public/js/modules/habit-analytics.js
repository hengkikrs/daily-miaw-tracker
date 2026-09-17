// Tracker Daily — habit-analytics
// Dipisah dari public/app.js (refactor modular; tidak ada identifier yang di-rename).
// Classic script — urutan load: lihat <script> di public/index.html.
'use strict';

/* Periode yang sedang dilihat di halaman Kebiasaan (TASK-010).
   null = ikuti bulan berjalan; angka = bulan pilihan pengguna (riwayat).
   Dipisah dari activeYear/activeMonth agar tidak mengubah konteks bulan
   modul lain (Finance, Dashboard, Kalender). */
let habitNavYear = null;
let habitNavMonth = null;

function habitPeriod() {
  if (habitNavYear === null || habitNavMonth === null) {
    const cur = currentTrackingDate();
    return { year: cur.year, monthIndex: cur.monthIndex };
  }
  return { year: habitNavYear, monthIndex: habitNavMonth };
}

function habitSetPeriod(year, monthIndex) {
  habitNavYear = year;
  habitNavMonth = monthIndex;
}

// Strip navigasi tahun + 12 bulan untuk halaman Kebiasaan (pengganti widget sidebar).
function habitPeriodStripHtml() {
  const period = habitPeriod();
  const years = buildYearOptions();
  const months = MONTHS.map((month, monthIndex) => {
    const on = monthIndex === period.monthIndex ? ' on' : '';
    const avg = compactPercent(calculateMonthStats(period.year, monthIndex).average);
    return `<button type="button" class="habit-period-month${on}" data-habit-period="${monthIndex}" aria-pressed="${monthIndex === period.monthIndex}"><span>${month.slice(0, 3)}</span><em>${avg}</em></button>`;
  }).join('');
  return `
    <section class="panel habit-period-panel">
      <div class="habit-period-head">
        <div>
          <span class="kicker">Riwayat kebiasaan</span>
          <h2>${MONTHS[period.monthIndex]} ${period.year}</h2>
          <p>Pilih bulan untuk melihat riwayat centang. Bulan berjalan dipakai sebagai default.</p>
        </div>
        <label class="habit-period-year">
          <span>Tahun</span>
          <select id="habitPeriodYear" aria-label="Tahun kebiasaan">
            ${years.map((y) => `<option value="${y}" ${y === period.year ? 'selected' : ''}>${y}</option>`).join('')}
          </select>
        </label>
      </div>
      <div class="habit-period-months" role="group" aria-label="Pilih bulan">${months}</div>
    </section>`;
}


// Handler klik untuk pindah bulan di halaman Kebiasaan.
function handleHabitPeriodAction(btn) {
  if (!btn || !btn.dataset || btn.dataset.habitPeriod === undefined) return false;
  const idx = Number(btn.dataset.habitPeriod);
  if (!Number.isInteger(idx) || idx < 0 || idx > 11) return false;
  const period = habitPeriod();
  habitSetPeriod(period.year, idx);
  renderShell();
  return true;
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
            <h2>Kalender Poin ${MONTHS[monthIndex]}</h2>
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
          <h2>Kalender Poin ${MONTHS[monthIndex]}</h2>
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
  // ui94: di layar HP chart digambar dengan geometri sempit supaya muat tanpa scroll samping
  const narrow = isNarrowLayout();
  const width = narrow ? 330 : 760;
  const height = narrow ? 190 : 260;
  const left = narrow ? 30 : 42;
  const right = narrow ? 12 : 22;
  const top = narrow ? 20 : 24;
  const bottom = narrow ? 32 : 44;
  const ticks = narrow ? [0, 50, 100] : [0, 25, 50, 75, 100];
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
      <svg class="trend-chart${narrow ? ' trend-chart--narrow' : ''}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Grafik tren penyelesaian tahunan">
        <g class="chart-grid">
          ${ticks.map((tick) => {
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
            ${!narrow || index % 2 === 0 ? `<text x="${point.x}" y="${point.y - 12}" text-anchor="middle">${compactPercent(point.month.average)}</text>` : ''}
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
  const totalHabits = CATEGORY_ORDER.reduce((s, k) => s + ((monthData.categories || {})[k] || []).length, 0);
  const emptyState = totalHabits === 0
    ? `<section class="panel habit-empty"><div class="empty-state">
        <div class="empty-ico" aria-hidden="true">🌱</div>
        <h2>Belum ada kebiasaan di ${MONTHS[monthIndex]} ${year}</h2>
        <p>Tambahkan kebiasaan pertamamu lewat form di bawah — harian, mingguan, atau bulanan.</p>
      </div></section>`
    : '';

  return `
    <div class="month-layout current-habits-view">
      ${habitPeriodStripHtml()}

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
      ${emptyState}
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

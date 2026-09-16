// Tracker Daily — habit-legacy
// Dipisah dari public/app.js (refactor modular; tidak ada identifier yang di-rename).
// Classic script — urutan load: lihat <script> di public/index.html.
'use strict';


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
          <h2 id="${sectionId}">${config.label}</h2>
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
          <h2>${escapeHtml(title)}</h2>
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
  const hp = habitPeriod();
  const monthData = ensureMonth(hp.year, hp.monthIndex);
  return monthData.categories[categoryKey].find((habit) => habit.id === habitId);
}

function addHabit(form) {
  const data = new FormData(form);
  const categoryKey = data.get('category');
  const name = String(data.get('name') || '').trim();
  const points = normalizeHabitPoints(data.get('points')) || suggestHabitPoints(name, categoryKey);

  if (!CATEGORY_CONFIG[categoryKey] || !name) return;

  const hp = habitPeriod();
  const monthData = ensureMonth(hp.year, hp.monthIndex);
  monthData.categories[categoryKey].push(createHabit(name, categoryKey, hp.year, hp.monthIndex, points));
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
  const hp = habitPeriod();
  const monthData = ensureMonth(hp.year, hp.monthIndex);
  const habit = monthData.categories[categoryKey].find((item) => item.id === habitId);
  if (!habit) return;

  if (!confirm(`Hapus "${habit.name}" dari ${MONTHS[hp.monthIndex]} ${hp.year}?`)) return;

  monthData.categories[categoryKey] = monthData.categories[categoryKey].filter((item) => item.id !== habitId);
  saveState();
  renderShell();
  showToast('Kebiasaan dihapus.');
}

function resetMonthChecks() {
  const hp = habitPeriod();
  const monthData = ensureMonth(hp.year, hp.monthIndex);
  if (!confirm(`Reset semua centang untuk ${MONTHS[hp.monthIndex]} ${hp.year}? Nama kebiasaan tetap disimpan.`)) return;

  CATEGORY_ORDER.forEach((categoryKey) => {
    monthData.categories[categoryKey].forEach((habit) => {
      habit.slots = habit.slots.map(() => false);
    });
  });

  saveState();
  renderShell();
  showToast('Miaw-rapi. Centang bulan ini direset.');
}

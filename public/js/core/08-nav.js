// Tracker Daily — 08-nav
// Dipisah dari public/app.js (refactor modular; tidak ada identifier yang di-rename).
// Classic script — urutan load: lihat <script> di public/index.html.
'use strict';

// Terapkan bahasa ke label sidebar & tombol lang topbar (dipanggil renderShell).
function renderI18nStatic() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-lang-set]').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(APP_LANG === btn.dataset.langSet));
  });
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
  if (!dom.yearSelect) return;
  dom.yearSelect.innerHTML = buildYearOptions()
    .map((year) => `<option value="${year}" ${year === activeYear ? 'selected' : ''}>${year}</option>`)
    .join('');
}

function renderMonthList() {
  if (!dom.monthList) return;
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

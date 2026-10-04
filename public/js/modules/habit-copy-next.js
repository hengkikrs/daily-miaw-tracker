// Tracker Daily — habit-copy-next
// Fitur: copy habit bulan ini ke bulan berikutnya.
// - Pilih semua (default) atau pilih sebagian via checkbox per habit.
// - Centang tidak ikut dicopy (bulan baru mulai bersih); nama, kategori,
//   poin, dan status aktif/paused ikut.
// - Habit yang sudah ada di bulan tujuan (nama sama per kategori) tidak diduplikat.
// Classic script — 'use strict'; urutan load setelah habit-legacy.js (lihat index.html).
'use strict';

// State UI panel copy (bukan bagian state persisten).
let habitCopyOpen = false;
let habitCopySelection = null; // Map "categoryKey|habitId" -> true; null = semua terpilih

function habitCopyTargetPeriod() {
  const hp = habitPeriod();
  let year = hp.year;
  let monthIndex = hp.monthIndex + 1;
  if (monthIndex > 11) {
    monthIndex = 0;
    year += 1;
  }
  return { year, monthIndex };
}

function habitCopySourceHabits() {
  const hp = habitPeriod();
  const monthData = ensureMonth(hp.year, hp.monthIndex);
  return getAllHabits(monthData, true);
}

function habitCopyKey(categoryKey, habitId) {
  return `${categoryKey}|${habitId}`;
}

function habitCopySelectedCount() {
  const habits = habitCopySourceHabits();
  if (habitCopySelection === null) return habits.length;
  return habits.filter((habit) => habitCopySelection.get(habitCopyKey(habit.category, habit.id))).length;
}

function habitCopyToggleOpen() {
  habitCopyOpen = !habitCopyOpen;
  habitCopySelection = null; // default: pilih semua
  renderShell();
}

function habitCopyToggleItem(categoryKey, habitId) {
  if (habitCopySelection === null) {
    // beralih dari "semua" ke mode eksplisit: isi dulu semua, lalu matikan satu
    habitCopySelection = new Map();
    habitCopySourceHabits().forEach((habit) => {
      habitCopySelection.set(habitCopyKey(habit.category, habit.id), true);
    });
  }
  const key = habitCopyKey(categoryKey, habitId);
  habitCopySelection.set(key, !habitCopySelection.get(key));
  renderShell();
}

function habitCopySetAll() {
  habitCopySelection = null;
  renderShell();
}

function habitCopySetNone() {
  habitCopySelection = new Map();
  habitCopySourceHabits().forEach((habit) => {
    habitCopySelection.set(habitCopyKey(habit.category, habit.id), false);
  });
  renderShell();
}

async function habitCopyExecute() {
  const source = habitPeriod();
  const target = habitCopyTargetPeriod();
  const all = habitCopySourceHabits();
  const selected = (habitCopySelection === null)
    ? all
    : all.filter((habit) => habitCopySelection.get(habitCopyKey(habit.category, habit.id)));

  if (selected.length === 0) {
    showToast('Pilih minimal satu kebiasaan untuk dicopy.');
    return;
  }

  // Susun data target sebelum konfirmasi (untuk ringkasan + deteksi duplikat).
  const targetMonthData = ensureMonth(target.year, target.monthIndex);
  const existingNames = new Set();
  CATEGORY_ORDER.forEach((categoryKey) => {
    targetMonthData.categories[categoryKey].forEach((habit) => {
      existingNames.add(`${categoryKey}::${habit.name.toLowerCase()}`);
    });
  });

  const toCopy = selected.map((habit) => ({
    categoryKey: habit.category,
    name: habit.name,
    points: habit.points,
    active: habit.active,
    isDuplicate: existingNames.has(`${habit.category}::${habit.name.toLowerCase()}`),
  }));
  const duplicateCount = toCopy.filter((item) => item.isDuplicate).length;

  const summaryLines = toCopy.slice(0, 12).map((item) => (
    `- ${item.name} (${CATEGORY_CONFIG[item.categoryKey].shortLabel}${item.isDuplicate ? ' - sudah ada' : ''})`
  ));
  const moreCount = toCopy.length - summaryLines.length;
  if (moreCount > 0) summaryLines.push(`- dan ${moreCount} lainnya`);

  const confirmText = [
    `Copy ${toCopy.length} kebiasaan dari ${MONTHS[source.monthIndex]} ${source.year} ke ${MONTHS[target.monthIndex]} ${target.year}?`,
    '',
    summaryLines.join('\n'),
    '',
    duplicateCount > 0
      ? `${duplicateCount} kebiasaan nama-sama sudah ada di bulan tujuan dan akan dilewati. Centang tidak ikut dicopy.`
      : 'Centang tidak ikut dicopy — bulan tujuan mulai bersih.',
  ].join('\n');

  if (!confirm(confirmText)) return;

  let copiedCount = 0;
  let skippedCount = 0;
  toCopy.forEach((item) => {
    if (item.isDuplicate) {
      skippedCount += 1;
      return;
    }
    targetMonthData.categories[item.categoryKey].push(
      createHabit(item.name, item.categoryKey, target.year, target.monthIndex, item.points),
    );
    // createHabit selalu active:true — pulihkan status paused bila sumbernya dijeda.
    const created = targetMonthData.categories[item.categoryKey][
      targetMonthData.categories[item.categoryKey].length - 1
    ];
    created.active = item.active;
    copiedCount += 1;
  });

  saveState();

  if (copiedCount > 0) {
    showToast(`Miaw-keren! ${copiedCount} kebiasaan dicopy ke ${MONTHS[target.monthIndex]} ${target.year}.${skippedCount > 0 ? ` ${skippedCount} dilewati (sudah ada).` : ''}`);
  } else {
    showToast('Semua kebiasaan terpilih sudah ada di bulan tujuan — tidak ada yang dicopy.');
  }

  habitCopyOpen = false;
  habitCopySelection = null;
  renderShell();
}

function habitCopyPanelHtml() {
  if (!habitCopyOpen) {
    return `
      <button class="small-button" type="button" data-action="habit-copy-open" title="Copy kebiasaan ke bulan berikutnya">
        Copy ke Bulan Berikutnya
      </button>
    `;
  }

  const target = habitCopyTargetPeriod();
  const habits = habitCopySourceHabits();
  const selectedCount = habitCopySelectedCount();
  const allSelected = habitCopySelection === null;

  const itemsHtml = habits.length === 0
    ? '<p class="habit-copy-empty">Belum ada kebiasaan di bulan ini.</p>'
    : habits.map((habit) => {
      const key = habitCopyKey(habit.category, habit.id);
      const checked = allSelected || Boolean(habitCopySelection?.get(key));
      return `
        <label class="habit-copy-item">
          <input
            type="checkbox"
            data-action="habit-copy-item"
            data-category="${habit.category}"
            data-habit-id="${habit.id}"
            ${checked ? 'checked' : ''}
          />
          <span>${escapeHtml(habit.name)}</span>
          <small>${CATEGORY_CONFIG[habit.category].shortLabel}${habit.active ? '' : ' - dijeda'}</small>
        </label>
      `;
    }).join('');

  return `
    <div class="habit-copy-panel" data-copy-panel>
      <div class="habit-copy-head">
        <strong>Copy ke ${MONTHS[target.monthIndex]} ${target.year}</strong>
        <button class="icon-action" type="button" data-action="habit-copy-open" aria-label="Tutup panel copy">
          <svg viewBox="0 0 24 24"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
      <div class="habit-copy-allrow">
        <button class="small-button" type="button" data-action="habit-copy-all" ${allSelected ? 'disabled' : ''}>Pilih Semua</button>
        <button class="small-button" type="button" data-action="habit-copy-none" ${!allSelected && selectedCount === 0 ? 'disabled' : ''}>Kosongkan</button>
        <span class="habit-copy-count">${selectedCount}/${habits.length} dipilih</span>
      </div>
      <div class="habit-copy-list">${itemsHtml}</div>
      <p class="habit-copy-note">Centang tidak ikut dicopy. Habit nama-sama di bulan tujuan dilewati.</p>
      <button class="primary-button" type="button" data-action="habit-copy-run" ${habits.length === 0 || selectedCount === 0 ? 'disabled' : ''}>
        Copy ${selectedCount} Kebiasaan
      </button>
    </div>
  `;
}

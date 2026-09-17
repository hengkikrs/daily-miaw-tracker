// Tracker Daily — 04-utils.js
// Dipisah dari public/app.js (FASE A: ekstraksi murni, tanpa perubahan identifier).
// Simbol: uid, escapeHtml, clamp, normalizeHabitPoints, suggestHabitPoints, habitPoints, roundPercent, compactPercent, pointScore, daysInMonth, focusedDayIndex, currentTrackingDate, weeksInMonth, slotCountFor, slotLabel, slotTitle, noteRandomB64url, canonicalUsername, evaluatePassword, allPwChecksPass, val2
// Dimuat sebagai classic script SEBELUM app.js — lihat urutan <script> di public/index.html.
'use strict';

// Palet chart mengikuti token tema (--chart-1..9) supaya otomatis ikut light/dark.
// Data contoh (seed) hanya untuk mode lokal/tanpa Supabase — dipakai QA & demo.
// Akun asli (produksi, tersinkron ke Supabase) mulai dari kosong + empty state,
// supaya pengguna tidak bingung membedakan data contoh dengan datanya sendiri.
function demoSeedEnabled() {
  return typeof remoteEnabled === 'undefined' ? true : !remoteEnabled;
}

function chartPalette(size = 5) {
  const out = [];
  for (let i = 0; i < size; i += 1) out.push(`var(--chart-${(i % 9) + 1})`);
  return out;
}

function uid(prefix = 'h') {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}_${Date.now().toString(36)}`;
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
// ui94: breakpoint HP — dipakai chart agar digambar dengan geometri sempit
const NARROW_LAYOUT_QUERY = '(max-width: 700px)';
function isNarrowLayout() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(NARROW_LAYOUT_QUERY).matches;
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
function noteRandomB64url(len) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
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
function val2(form, name) {
  return form.querySelector(`[name=${name}]`)?.value.trim() || '';
}

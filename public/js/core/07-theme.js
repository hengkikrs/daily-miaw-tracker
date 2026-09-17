// Tracker Daily — 07-theme.js
// Simbol: THEME_OPTIONS, applyTheme, initTheme, themeIsAuto
// Tema: 4 tetap + 'auto' (mengikuti prefers-color-scheme perangkat).
'use strict';

const THEME_OPTIONS = ['light', 'dark', 'ocean', 'sunset', 'mono', 'auto'];
const THEME_MEDIA = window.matchMedia('(prefers-color-scheme: dark)');

function themeIsAuto() {
  return localStorage.getItem(THEME_KEY) === 'auto' || !localStorage.getItem(THEME_KEY);
}

// Tema tersimpan mentah (bisa 'auto') — untuk status terpilih di pemilih tema.
function savedTheme() {
  return localStorage.getItem(THEME_KEY) || 'auto';
}

// Label tema per bahasa UI (t() dari 06-lang.js).
function themeLabel(theme) {
  const map = { light: 'theme.light', dark: 'theme.dark', ocean: 'theme.ocean', sunset: 'theme.sunset', mono: 'theme.mono', auto: 'theme.auto' };
  return t(map[theme] || theme);
}

function applyTheme(theme) {
  const effective = theme === 'auto' ? (THEME_MEDIA.matches ? 'dark' : 'light') : theme;
  document.documentElement.dataset.theme = effective;
  localStorage.setItem(THEME_KEY, theme);
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved && THEME_OPTIONS.includes(saved)) {
    applyTheme(saved);
  } else {
    applyTheme('auto');
  }
  if (typeof THEME_MEDIA.addEventListener === 'function') {
    THEME_MEDIA.addEventListener('change', () => {
      if (themeIsAuto()) applyTheme('auto');
    });
  }
}

// Tracker Daily — 07-theme.js
// Dipisah dari public/app.js (FASE A: ekstraksi murni, tanpa perubahan identifier).
// Simbol: applyTheme, initTheme
// Dimuat sebagai classic script SEBELUM app.js — lihat urutan <script> di public/index.html.
'use strict';

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

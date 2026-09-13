// Tracker Daily — 02-runtime-dom
// Dipisah dari public/app.js (refactor modular; tidak ada identifier yang di-rename).
// Classic script — urutan load: lihat <script> di public/index.html.
'use strict';


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

// Tracker Daily — 01-config.js
// Dipisah dari public/app.js (FASE A: ekstraksi murni, tanpa perubahan identifier).
// Simbol: STORAGE_KEY, THEME_KEY, CLIENT_ID_KEY, AUTH_SESSION_KEY, SCHEMA_VERSION, REMOTE_SYNC_DEBOUNCE_MS, OTP_RESEND_SECONDS, MONTHS, CATEGORY_ORDER, CATEGORY_CONFIG, DEFAULT_HABITS, CATEGORY_DEFAULT_POINTS, DEFAULT_HABIT_POINTS, HABIT_NAME_TRANSLATIONS, DATA_STORE_KEYS, NAV_GROUP_OF, PW_RULE_OK, OAUTH_VERIFIER_KEY, PW_RULE_LABELS
// Dimuat sebagai classic script SEBELUM app.js — lihat urutan <script> di public/index.html.
'use strict';

const STORAGE_KEY = 'miaw-tracker.state.v1';
const THEME_KEY = 'miaw-tracker.theme';
const CLIENT_ID_KEY = 'miaw-tracker.client-id';
const AUTH_SESSION_KEY = 'miaw-tracker.auth-session.v1';
const SCHEMA_VERSION = 1;
const REMOTE_SYNC_DEBOUNCE_MS = 150;
const OTP_RESEND_SECONDS = 60;
const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const CATEGORY_ORDER = ['daily', 'weekly', 'specificWeekly', 'monthly'];
const CATEGORY_CONFIG = {
  daily: {
    label: 'Kebiasaan Harian',
    shortLabel: 'Harian',
    slotUnit: 'hari',
    color: 'teal',
    description: 'Dilacak untuk setiap hari kalender dalam bulan ini.',
  },
  weekly: {
    label: 'Kebiasaan Mingguan',
    shortLabel: 'Mingguan',
    slotUnit: 'minggu',
    color: 'blue',
    description: 'Dilacak berdasarkan jumlah minggu pada bulan ini.',
  },
  specificWeekly: {
    label: 'Kebiasaan Mingguan Khusus',
    shortLabel: 'Mingguan Khusus',
    slotUnit: 'minggu',
    color: 'amber',
    description: 'Rutinitas mingguan khusus dengan logika progres mingguan yang sama.',
  },
  monthly: {
    label: 'Kebiasaan Bulanan',
    shortLabel: 'Bulanan',
    slotUnit: 'bulan',
    color: 'rose',
    description: 'Target besar yang dicentang satu kali per bulan.',
  },
};
const DEFAULT_HABITS = {
  daily: [
    'Minum air minimal 1.5 L',
    'Workout 45 Menit',
    'Baca Al-Quran 2 lembar',
    'Evaluasi hari ini',
    'Tidur jam 22.00 maksimal 23.00',
  ],
  weekly: [],
  specificWeekly: [],
  monthly: [],
};
const CATEGORY_DEFAULT_POINTS = {
  daily: 50,
  weekly: 65,
  specificWeekly: 70,
  monthly: 85,
};
const DEFAULT_HABIT_POINTS = {
  'Minum air minimal 1.5 L': 35,
  'Workout 45 Menit': 85,
  'Baca Al-Quran 2 lembar': 55,
  'Evaluasi hari ini': 30,
  'Tidur jam 22.00 maksimal 23.00': 75,
  'Bangun jam 4': 80,
  'Shalat Tahajud': 85,
  'Baca Al-Waqiah & Al-Mulk': 60,
  'Shalat Wajib & Rawatib & Doa': 75,
  'Shalat Dhuha': 55,
  'Minum Creatine & Susu Protein (Pagi & Sore)': 45,
  'Makan minimal 3x sehari (300 gr nasi)': 60,
  'Mandi 2x sehari pagi & sore': 35,
  'Sikat gigi setiap malam': 25,
  'Domestik 30 menit': 50,
  'Game (Sudoku 2x Easy, Geografi 100, ML 1x)': 35,
  'Belajar editing video & AI max 2 jam': 70,
  'Belajar bahasa inggris max 2 jam': 70,
  'Sadaqah subuh': 30,
  'Baca Buku 50 Halaman': 75,
  'Bangun jam 4, cuci muka dan shalat tahajud': 90,
  'Shalat wajib, rawatib dan dhuha': 80,
  'Baca Al-Quran minimal 1 halaman, Al Waqiah (subuh) dan Al Mulk (malam)': 75,
  'Pekerjaan domestik 30 menit': 50,
  'Mandi pagi dan sore, sikat gigi malam, dan bersihin muka sebelum tidur': 45,
  'Makan 3x (8, 12, 17) dan minum air 1.5 L': 65,
  'Belajar English 30 menit aja': 45,
  'Catat Pengeluaran hari ini': 35,
};
const HABIT_NAME_TRANSLATIONS = {
  'Drink enough water': 'Minum air yang cukup',
  'Move for 20 minutes': 'Bergerak selama 20 menit',
  'Read 10 pages': 'Membaca 10 halaman',
  'Sleep before target time': 'Tidur sebelum target waktu',
  'Journal check-in': 'Menulis jurnal singkat',
  'Mindful breathing': 'Latihan napas sadar',
  'Plan tomorrow': 'Merencanakan hari esok',
  'Tidy one space': 'Merapikan satu area',
  'Weekly review': 'Evaluasi mingguan',
  'Meal prep': 'Persiapan makanan',
  'Budget check': 'Cek anggaran',
  'Workspace reset': 'Rapikan ruang kerja',
  'Sunday reset routine': 'Rutinitas reset hari Minggu',
  'Long walk session': 'Sesi jalan kaki panjang',
  'Deep clean zone': 'Bersih-bersih area khusus',
  'Call family or friend': 'Menghubungi keluarga atau teman',
  'Pay bills': 'Membayar tagihan',
  'Health checkpoint': 'Pemeriksaan kesehatan',
  'Learning milestone': 'Target belajar bulanan',
  'Digital backup': 'Cadangan data digital',
};
const DATA_STORE_KEYS = ['miaw-tracker.state.v1', 'miaw-tracker.jadwal.v1', 'miaw-tracker.tasks.v1', 'miaw-tracker.goals.v1', 'proj-tracker.projects.v1', 'miaw-tracker.notes.v1'];
const NAV_GROUP_OF = {
  task: 'activity', jadwal: 'activity',
  habits: 'goals', goals: 'goals', progress: 'goals', project: 'goals', 'project-task': 'goals',
  catatan: 'organization', dokumen: 'organization',
  transaksi: 'keuangan', budget: 'keuangan', tabungan: 'keuangan', 'laporan-keuangan': 'keuangan',
};
const PW_RULE_OK = 'Password memenuhi semua kriteria.';
const OAUTH_VERIFIER_KEY = 'miaw-tracker.oauth-verifier.v1';
const PW_RULE_LABELS = {
  len: 'Minimal 8 karakter',
  upper: 'Minimal 1 huruf besar (A-Z)',
  other: 'Minimal 1 angka / karakter non-huruf',
};
